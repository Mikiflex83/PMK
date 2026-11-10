#!/usr/bin/env bash
# Run koha-qa.pl the way the KTD plugin article describes it:
# last two commits, plugin commit pattern, codespell, POD and templates.
# The check covers the staff entry point. Generated JavaScript assets are not
# Koha core patches and are validated by the PMK test suite instead.
set -euo pipefail

STAGE="${1:-${HOME}/git/koha-plugins/pmk}"
if [ ! -f "${STAGE}/Koha/Plugin/PimpMyKoha.pm" ]; then
  echo "Plugin stage missing: ${STAGE}" >&2
  exit 1
fi
if [ ! -f "${STAGE}/.kohaqarc" ] || [ ! -f "${STAGE}/.codespell-ignore" ]; then
  echo "Copy .kohaqarc and .codespell-ignore into the stage before QA." >&2
  exit 1
fi

docker exec pmk-koha-1 bash -lc 'set -euo pipefail
rm -rf /tmp/pmk-qa
mkdir -p /tmp/pmk-qa/Koha/Plugin/PimpMyKoha
cp /kohadevbox/plugins/pmk/.kohaqarc /kohadevbox/plugins/pmk/.codespell-ignore /tmp/pmk-qa/
cp /kohadevbox/plugins/pmk/Koha/Plugin/PimpMyKoha.pm /tmp/pmk-qa/Koha/Plugin/
cp /kohadevbox/plugins/pmk/Koha/Plugin/PimpMyKoha/configure.tt /tmp/pmk-qa/Koha/Plugin/PimpMyKoha/
cp /kohadevbox/plugins/pmk/Koha/Plugin/PimpMyKoha/tool.tt /tmp/pmk-qa/Koha/Plugin/PimpMyKoha/
cd /tmp/pmk-qa
git init -q
printf "%s\n" "PimpMyKoha plugin QA entry point." > README.md
git add README.md
git -c user.email=pmk@pimpmykoha.org -c user.name=PMK commit -q -m "v0.5.0 Start the plugin QA entry point"
git add .kohaqarc .codespell-ignore
git -c user.email=pmk@pimpmykoha.org -c user.name=PMK commit -q -m "[#1] Configure plugin QA tools"
git add Koha
git -c user.email=pmk@pimpmykoha.org -c user.name=PMK commit -q -m "v0.5.0 Serve plugin pages with the staff wrapper"
ln -s /kohadevbox/koha/koha-tmpl /tmp/pmk-qa/koha-tmpl
export PERL5LIB="/kohadevbox/koha${PERL5LIB:+:$PERL5LIB}"
export KOHA_SOURCE_DIR=/kohadevbox/koha
set +e
/kohadevbox/qa-test-tools/koha-qa.pl -c 2 --verbose=2 > /tmp/pmk-qa-report.txt 2>&1
status=$?
set -e
cat /tmp/pmk-qa-report.txt
if grep -q "\[FAIL\]" /tmp/pmk-qa-report.txt; then
  exit 1
fi
exit "$status"
'
