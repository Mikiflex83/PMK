#!/usr/bin/env bash
# Control the local PMK Koha Testing Docker instance.
# Usage, from Ubuntu WSL:
#   dev/koha/ktd-pmk.sh up -d
#   dev/koha/ktd-pmk.sh --wait-ready 900
#   dev/koha/ktd-pmk.sh --shell
#   dev/koha/ktd-pmk.sh down
set -euo pipefail

export PROJECTS_DIR="${HOME}/git"
export SYNC_REPO="${PROJECTS_DIR}/koha-25.11"
export KTD_HOME="${PROJECTS_DIR}/koha-testing-docker"
export PLUGINS_DIR="${PROJECTS_DIR}/koha-plugins"
export PATH="${PATH}:${KTD_HOME}/bin"
export LOCAL_USER_ID="$(id -u)"
export KOHA_IMAGE=25.11
export KOHA_MARC_FLAVOUR=unimarc

if [ ! -x "${KTD_HOME}/bin/ktd" ]; then
  echo "KTD is not installed. Run dev/koha/setup-ktd.sh first." >&2
  exit 1
fi
if [ ! -f "${SYNC_REPO}/about.pl" ]; then
  echo "Koha 25.11 source is missing at ${SYNC_REPO}." >&2
  exit 1
fi

CUSTOM="${PMK_ROOT:-/mnt/c/Users/la_lo/Desktop/PMK}/dev/koha/docker-compose.custom.yml"
if [ ! -f "${CUSTOM}" ]; then
  echo "Missing ${CUSTOM}" >&2
  exit 1
fi

cd "${KTD_HOME}"
exec ktd --name pmk --plugins -f "${CUSTOM}" "$@"
