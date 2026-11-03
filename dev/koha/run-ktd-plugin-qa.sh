#!/usr/bin/env bash
set -euo pipefail

: "${KTD_HOME:?Définir KTD_HOME vers koha-testing-docker}"
name=${KTD_NAME:-pmkdev}
stage=${PMK_KTD_PLUGIN_STAGE:?Définir PMK_KTD_PLUGIN_STAGE vers le dossier préparé}
plugin_dir="/kohadevbox/plugins/$(basename "$stage")"

case "$(basename "$stage")" in
    *[!A-Za-z0-9._-]*) echo "Nom de dossier de plugin non pris en charge" >&2; exit 2 ;;
esac

"$KTD_HOME/bin/ktd" --name "$name" --shell --run \
    "cd /kohadevbox/koha && perl misc/devel/install_plugins.pl --include Koha::Plugin::PimpMyKoha && koha-plack --restart kohadev"

"$KTD_HOME/bin/ktd" --name "$name" --shell --run \
    "cd '$plugin_dir' && export PERL5LIB=\"\$PERL5LIB:$plugin_dir\" && prove -v t/"

"$KTD_HOME/bin/ktd" --name "$name" --shell --run \
    "cd '$plugin_dir' && export PERL5LIB=\"\$PERL5LIB:$plugin_dir:/kohadevbox/qa-test-tools\" && KOHA_SOURCE_DIR=/kohadevbox/koha /kohadevbox/qa-test-tools/koha-qa.pl -c 2 --nproc 1"

echo "Installation, tests Perl et QA KTD terminés pour $name."
