#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
    echo "Usage: $0 /chemin/vers/PimpMyKoha [/chemin/vers/PimpMyKoha.kpz]" >&2
    exit 2
fi

stage=$1
output=${2:-"${stage}.kpz"}
root=$(cd "$(dirname "$0")/../.." && pwd)

if [ -e "$stage" ] && [ -n "$(find "$stage" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
    echo "Le dossier de préparation doit être absent ou vide : $stage" >&2
    exit 2
fi

python3 "$root/plugin/build.py" --stage "$stage" --output "$output"

# koha-qa.pl analyse des commits. Les ressources générées forment le socle,
# puis le cœur du plugin et ses tests constituent le commit contrôlé.
git -C "$stage" init -q
git -C "$stage" config user.name "PMK KTD validation"
git -C "$stage" config user.email "pmk@koha-community.org"
git -C "$stage" add .
git -C "$stage" reset -q -- \
    Koha/Plugin/PimpMyKoha.pm \
    Koha/Plugin/PimpMyKoha/Controller.pm \
    Koha/Plugin/PimpMyKoha/NativeData.pm \
    Koha/Plugin/PimpMyKoha/Nedap.pm \
    Koha/Plugin/PimpMyKoha/Restoration.pm \
    Koha/Plugin/PimpMyKoha/api.json \
    Koha/Plugin/PimpMyKoha/bootstrap.js \
    Koha/Plugin/PimpMyKoha/storage.js \
    Koha/Plugin/PimpMyKoha/native-data.js \
    Koha/Plugin/PimpMyKoha/migration.js \
    t
git -C "$stage" commit -qm "Automated commit generated assets baseline"
git -C "$stage" add .
git -C "$stage" commit -qm "v0.4.0 KTD validation snapshot"

echo "Préparation KTD : $stage"
echo "Paquet KPZ : $output"
