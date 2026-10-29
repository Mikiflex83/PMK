#!/usr/bin/env bash
# KTD first initialization, then non-destructive restarts of this test instance.
set -euo pipefail
umask 022
export PATH="${PATH}:/kohadevbox/node_modules/.bin:/kohadevbox/koha/node_modules/.bin"
if [ ! -f /etc/koha/sites/kohadev/koha-conf.xml ]; then
    exec bash /kohadevbox/run.sh
fi
# A stopped initializer may have left these root-owned files unreadable by the
# instance user when the host Docker daemon inherited a private umask.
chmod a+r /kohadevbox/package.json /kohadevbox/yarn.lock
if [ ! -f /pmk-build-complete ]; then
    cd /kohadevbox
    yarn install --modules-folder /kohadevbox/node_modules
    koha-shell kohadev -c 'cd /kohadevbox/koha && PATH=/kohadevbox/node_modules/.bin:$PATH yarn build'
    touch /pmk-build-complete
fi
. /usr/share/koha/bin/koha-functions.sh
# These enable commands return 1 when already enabled. Check first so an
# ordinary restart cannot stop the container under set -e.
if ! is_plack_enabled kohadev; then koha-plack --enable kohadev; fi
if ! is_z3950_enabled kohadev; then koha-z3950-responder --enable kohadev; fi
service koha-common start
service apache2 start
# No mail delivery service is started by this PMK test wrapper.
touch /ktd_ready
echo 'PMK Koha test instance ready; existing database retained.'
trap 'exit 0' TERM INT
sleep infinity &
wait $!
