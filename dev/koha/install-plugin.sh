#!/usr/bin/env bash
# Execute INSIDE the isolated KTD container, after /ktd_ready exists.
set -euo pipefail
test -f /ktd_ready
test -f /pmk-plugin/Koha/Plugin/PimpMyKoha.pm
test "${KOHA_INSTANCE}" = kohadev
destination=/var/lib/koha/kohadev/plugins
mkdir -p "${destination}/Koha/Plugin"
cp /pmk-plugin/Koha/Plugin/PimpMyKoha.pm "${destination}/Koha/Plugin/"
cp -a /pmk-plugin/Koha/Plugin/PimpMyKoha "${destination}/Koha/Plugin/"
chown -R kohadev-koha:kohadev-koha "${destination}/Koha/Plugin/PimpMyKoha" "${destination}/Koha/Plugin/PimpMyKoha.pm"
koha-shell kohadev -c 'cd /kohadevbox/koha && perl misc/devel/install_plugins.pl --include Koha::Plugin::PimpMyKoha'
koha-plack --restart kohadev
echo 'PMK installed in the isolated kohadev test instance.'
