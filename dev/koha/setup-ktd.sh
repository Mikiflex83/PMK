#!/usr/bin/env bash
# Prepare the official KTD instance used to develop the PMK plugin.
# Safe to run again. Does not delete the older kohadev stack or its database.
set -euo pipefail

PROJECTS_DIR="${HOME}/git"
KTD_HOME="${PROJECTS_DIR}/koha-testing-docker"
KOHA_MAIN="${PROJECTS_DIR}/koha"
KOHA_SRC="${PROJECTS_DIR}/koha-25.11"
PLUGINS_DIR="${PROJECTS_DIR}/koha-plugins"
PMK_ROOT="/mnt/c/Users/la_lo/Desktop/PMK"
STAGE="${PLUGINS_DIR}/pmk"

echo "== docker =="
docker compose version
python3 --version

if [ ! -d "${KTD_HOME}/.git" ]; then
  git clone --depth 1 https://gitlab.com/koha-community/koha-testing-docker.git "${KTD_HOME}"
fi
if [ ! -d "${KOHA_MAIN}/.git" ]; then
  git clone --depth 1 --branch main https://git.koha-community.org/Koha-community/Koha.git "${KOHA_MAIN}"
fi

echo "== Koha 25.11 =="
if [ ! -f "${KOHA_SRC}/about.pl" ]; then
  branch="$(git -C "${KOHA_MAIN}" ls-remote --heads origin '25.11' '25.11.x' | awk '{print $2}' | head -1)"
  branch="${branch#refs/heads/}"
  if [ -z "${branch}" ]; then
    echo "No 25.11 branch on the Koha remote." >&2
    exit 1
  fi
  echo "Fetching ${branch}"
  git -C "${KOHA_MAIN}" fetch --depth 1 origin "${branch}:refs/remotes/origin/${branch}"
  git -C "${KOHA_MAIN}" worktree add -b "pmk-${branch}" "${KOHA_SRC}" "origin/${branch}"
fi
echo "Koha source: $(git -C "${KOHA_SRC}" log -1 --oneline)"

python3 - "${HOME}/.bashrc" "${PROJECTS_DIR}" "${KOHA_SRC}" "${KTD_HOME}" "${PLUGINS_DIR}" <<'PY'
import pathlib, sys
bashrc, projects, koha, ktd, plugins = map(pathlib.Path, sys.argv[1:])
text = bashrc.read_text() if bashrc.exists() else ""
begin, end = "# BEGIN PMK KTD", "# END PMK KTD"
block = "\n".join([
    begin,
    f'export PROJECTS_DIR="{projects}"',
    f'export SYNC_REPO="{koha}"',
    f'export KTD_HOME="{ktd}"',
    f'export PLUGINS_DIR="{plugins}"',
    f'export PATH="$PATH:{ktd}/bin"',
    'export LOCAL_USER_ID=$(id -u)',
    end,
])
if begin in text and end in text:
    pre, rest = text.split(begin, 1)
    _, post = rest.split(end, 1)
    text = pre.rstrip() + "\n\n" + block + "\n" + post.lstrip("\n")
else:
    text = text.rstrip() + "\n\n" + block + "\n"
bashrc.write_text(text)
print("bashrc points SYNC_REPO at", koha)
PY

if [ ! -f "${KTD_HOME}/.env" ]; then
  cp "${KTD_HOME}/env/defaults.env" "${KTD_HOME}/.env"
fi
python3 - "${KTD_HOME}/.env" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
wanted = {
    "KOHA_IMAGE": "25.11",
    "KOHA_MARC_FLAVOUR": "unimarc",
    "SKIP_L10N": "yes",
    "KOHA_ELASTICSEARCH": "no",
    "PLACK_WORKERS": "2",
    "LOCAL_USER_ID": "1000",
    "DB_IMAGE": "mariadb:10.11",
    "KOHA_INTRANET_URL": "http://127.0.0.1:18081",
    "KOHA_OPAC_URL": "http://127.0.0.1:18080",
}
lines, seen = [], set()
for line in path.read_text().splitlines():
    key = line.split("=", 1)[0] if "=" in line and not line.startswith("#") else None
    if key in wanted:
        lines.append(f"{key}={wanted[key]}")
        seen.add(key)
    else:
        lines.append(line)
for key, value in wanted.items():
    if key not in seen:
        lines.append(f"{key}={value}")
path.write_text("\n".join(lines) + "\n")
print("ktd .env updated")
PY
sed -i 's/\r$//' "${KTD_HOME}/.env"

echo "Compose override: ${PMK_ROOT}/dev/koha/docker-compose.custom.yml"

echo "== plugin stage =="
mkdir -p "${PLUGINS_DIR}"
python3 "${PMK_ROOT}/plugin/build.py" \
  --stage "${STAGE}" \
  --output "${PLUGINS_DIR}/PimpMyKoha-plugin-0.4.0.kpz"
test -f "${STAGE}/Koha/Plugin/PimpMyKoha.pm"

# The previous kohadev database container restarts with Docker and uses RAM.
# Its volume is left intact.
if docker ps -a --format '{{.Names}}' | grep -qx 'kohadev-db-1'; then
  docker update --restart=no kohadev-db-1 >/dev/null
  docker stop kohadev-db-1 >/dev/null || true
  echo "Stopped the old kohadev database container. Its data volume was kept."
fi

echo "PREPARE_OK"
echo "SYNC_REPO=${KOHA_SRC}"
echo "PLUGINS_DIR=${PLUGINS_DIR}"
