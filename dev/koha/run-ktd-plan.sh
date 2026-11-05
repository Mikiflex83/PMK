#!/usr/bin/env bash
# Plan de test KTD pour PimpMyKoha.
# Minimum du billet : plugin monté, prove -v t/, page Administration > Plugins,
# fichiers .kohaqarc et .codespell-ignore, contrôles de chargement et de données.
# Au-delà : audit statique, absence de Firebase, et, si Playwright est installé,
# ouverture de chaque module sans enregistrement.
#
# Depuis Ubuntu :
#   bash /mnt/c/Users/la_lo/Desktop/PMK/dev/koha/run-ktd-plan.sh
# Le cycle d'édition du billet (réinstallation + redémarrage de Plack) :
#   bash .../run-ktd-plan.sh --reinstall
set -euo pipefail

ROOT="${PMK_ROOT:-/mnt/c/Users/la_lo/Desktop/PMK}"
STAGE="${HOME}/git/koha-plugins/pmk"
REINSTALL=0
if [ "${1:-}" = "--reinstall" ]; then REINSTALL=1; fi

fail=0
note() { printf '\n== %s\n' "$1"; }
mark() { printf '%s\t%s\n' "$1" "$2"; }

note "Instance KTD pmk"
docker inspect -f '{{.State.Status}}' pmk-koha-1 pmk-db-1 >/dev/null
test -f "${STAGE}/Koha/Plugin/PimpMyKoha.pm"
docker exec pmk-koha-1 test -f /kohadevbox/plugins/pmk/Koha/Plugin/PimpMyKoha.pm
mark OK "plugin monté dans /kohadevbox/plugins/pmk"

note "Synchronisation des tests et des fichiers QA"
rm -rf "${STAGE}/t"
mkdir -p "${STAGE}/t"
cp "${ROOT}/t/"*.t "${STAGE}/t/"
cp "${ROOT}/.kohaqarc" "${ROOT}/.codespell-ignore" "${STAGE}/"
# Les tests ne font pas partie du KPZ : build.py n'archive que Koha/.
mark OK "t/, .kohaqarc et .codespell-ignore copiés dans l'instance"

if [ "${REINSTALL}" = 1 ]; then
  note "Réinstallation demandée, puis redémarrage de Plack"
  docker exec pmk-koha-1 koha-shell kohadev -c 'cd /kohadevbox/koha && perl misc/devel/install_plugins.pl --include Koha::Plugin::PimpMyKoha'
  docker exec pmk-koha-1 koha-plack --restart kohadev
  mark OK "plugin réinstallé"
else
  mark OK "réinstallation non demandée : les tables et runtime_enabled restent tels quels"
fi

note "Comptage avant les tests"
docs_before=$(docker exec pmk-koha-1 koha-mysql kohadev -N -e "SELECT COUNT(*) FROM koha_plugin_pimpmykoha_documents;" | tr -d '[:space:]')
runtime_before=$(docker exec pmk-koha-1 koha-mysql kohadev -N -e "SELECT plugin_value FROM plugin_data WHERE plugin_class='Koha::Plugin::PimpMyKoha' AND plugin_key='runtime_enabled';" | tr -d '[:space:]')
printf 'documents=%s runtime_enabled=%s\n' "${docs_before}" "${runtime_before}"

note "prove -v t/"
if docker exec pmk-koha-1 koha-shell kohadev -c 'cd /kohadevbox/plugins/pmk && export PERL5LIB="${PERL5LIB}:/kohadevbox/plugins/pmk" && prove -v t/'; then
  mark OK "prove"
else
  mark FAIL "prove"
  fail=1
fi

note "Administration > Plugins"
tmp=$(mktemp -d)
curl -sS -c "${tmp}/cj" -b "${tmp}/cj" -o "${tmp}/login.html" http://127.0.0.1:18081/cgi-bin/koha/mainpage.pl
python3 - "${tmp}" <<'PY'
import pathlib, re, sys
tmp = pathlib.Path(sys.argv[1])
html = (tmp / "login.html").read_text(errors="replace")
match = re.search(r'name="csrf_token"[^>]*value="([^"]+)"', html) or re.search(r'value="([^"]+)"[^>]*name="csrf_token"', html)
token = match.group(1) if match else ""
fields = ["login_userid=koha", "login_password=koha", "login_op=cud-login", "koha_login_context=intranet", "branch=CPL"]
if token:
    fields.append("csrf_token=" + token)
(tmp / "post.txt").write_text("&".join(fields))
PY
curl -sS -o "${tmp}/after.html" -c "${tmp}/cj" -b "${tmp}/cj" -d @"${tmp}/post.txt" http://127.0.0.1:18081/cgi-bin/koha/mainpage.pl
curl -sS -o "${tmp}/plugins.html" -c "${tmp}/cj" -b "${tmp}/cj" http://127.0.0.1:18081/cgi-bin/koha/plugins/plugins-home.pl
if python3 - "${tmp}/plugins.html" <<'PY'
import pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text(errors="replace")
sys.exit(0 if "PimpMyKoha" in text and "password" not in text.lower() else 1)
PY
then
  mark OK "la page des plugins affiche PimpMyKoha"
else
  mark FAIL "page des plugins"
  fail=1
fi
rm -rf "${tmp}"

note "Données du plugin et journal Plack"
docker exec pmk-koha-1 koha-mysql kohadev -e "SELECT plugin_key, plugin_value FROM plugin_data WHERE plugin_class='Koha::Plugin::PimpMyKoha' AND plugin_key IN ('__ENABLED__','__INSTALLED__','__INSTALLED_VERSION__','runtime_enabled');"
docs_after=$(docker exec pmk-koha-1 koha-mysql kohadev -N -e "SELECT COUNT(*) FROM koha_plugin_pimpmykoha_documents;" | tr -d '[:space:]')
runtime_after=$(docker exec pmk-koha-1 koha-mysql kohadev -N -e "SELECT plugin_value FROM plugin_data WHERE plugin_class='Koha::Plugin::PimpMyKoha' AND plugin_key='runtime_enabled';" | tr -d '[:space:]')
if [ "${docs_before}" = "${docs_after}" ] && [ "${runtime_before}" = "${runtime_after}" ]; then
  mark OK "aucun document ni runtime modifié par le plan"
else
  mark FAIL "le plan a modifié les données PMK"
  printf 'avant: documents=%s runtime=%s\naprès: documents=%s runtime=%s\n' "${docs_before}" "${runtime_before}" "${docs_after}" "${runtime_after}"
  fail=1
fi
if docker exec pmk-koha-1 sh -c 'grep -E "InstallDied|failed during installation|failed during upgrade" /var/log/koha/kohadev/plack-intranet-error.log' ; then
  mark FAIL "erreur d'installation dans le journal Plack"
  fail=1
else
  mark OK "pas d'échec d'installation dans le journal Plack"
fi

note "perlcritic, si l'outil est dans l'instance"
if docker exec pmk-koha-1 sh -c 'command -v perlcritic >/dev/null'; then
  docker exec pmk-koha-1 perlcritic --gentle /kohadevbox/plugins/pmk/Koha/Plugin/PimpMyKoha.pm || mark INFO "perlcritic signale le style existant, sans modifier le code"
else
  mark INFO "perlcritic absent de l'image KTD"
fi

note "koha-qa.pl"
if docker exec pmk-koha-1 test -d /kohadevbox/plugins/pmk/.git; then
  docker exec pmk-koha-1 koha-shell kohadev -c 'cd /kohadevbox/plugins/pmk && KOHA_SOURCE_DIR=/kohadevbox/koha /kohadevbox/qa-test-tools/koha-qa.pl -c 2' || mark INFO "koha-qa.pl a des remarques"
else
  mark INFO "le stage KTD n'est pas un dépôt git : koha-qa.pl -c 2 se lance depuis le clone du plugin, pas depuis le paquet construit"
fi

note "Audit statique et absence de Firebase"
NODE=""
if command -v node >/dev/null 2>&1; then NODE=node
elif command -v node.exe >/dev/null 2>&1; then NODE=node.exe
elif [ -x "/mnt/c/nvm4w/nodejs/node.exe" ]; then NODE="/mnt/c/nvm4w/nodejs/node.exe"
elif [ -x "/mnt/c/Program Files/nodejs/node.exe" ]; then NODE="/mnt/c/Program Files/nodejs/node.exe"
fi
if [ -n "${NODE}" ]; then
  if (cd "${ROOT}" && "${NODE}" tests/audit.cjs); then mark OK "audit"; else mark FAIL "audit"; fail=1; fi
else
  mark INFO "node absent de cet environnement"
fi
if command -v python3 >/dev/null 2>&1; then
  if python3 "${ROOT}/tests/firebase-free.py"; then mark OK "firebase-free"; else mark FAIL "firebase-free"; fail=1; fi
fi

note "Modules, un par un, sans enregistrement"
if [ -n "${NODE}" ] && (cd "${ROOT}/tests" && "${NODE}" -e "require('playwright')" >/dev/null 2>&1); then
  if (cd "${ROOT}/tests" && env -u PMK_TEST_FILTER "${NODE}" ktd-staff.cjs); then
    mark OK "parcours professionnel"
  else
    mark FAIL "parcours professionnel"
    fail=1
  fi
else
  mark INFO "Playwright non installé : npm install dans tests/, puis node tests/ktd-staff.cjs"
fi

note "Résultat"
if [ "${fail}" = 0 ]; then
  mark OK "plan KTD terminé"
  exit 0
fi
mark FAIL "plan KTD"
exit 1
