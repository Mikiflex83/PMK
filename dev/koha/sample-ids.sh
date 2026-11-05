#!/usr/bin/env bash
set -euo pipefail
docker exec pmk-koha-1 koha-mysql kohadev -N -e "SELECT biblionumber FROM biblio ORDER BY biblionumber LIMIT 1;"
echo '--- item ---'
docker exec pmk-koha-1 koha-mysql kohadev -N -e "SELECT biblionumber, itemnumber FROM items ORDER BY itemnumber LIMIT 1;"
echo '--- patron ---'
docker exec pmk-koha-1 koha-mysql kohadev -N -e "SELECT borrowernumber, categorycode FROM borrowers WHERE categorycode IS NOT NULL ORDER BY borrowernumber LIMIT 1;"
echo '--- sub ---'
docker exec pmk-koha-1 koha-mysql kohadev -N -e "SELECT subscriptionid FROM subscription ORDER BY subscriptionid LIMIT 1;"
echo '--- shelf ---'
docker exec pmk-koha-1 koha-mysql kohadev -N -e "SELECT shelfnumber FROM virtualshelves ORDER BY shelfnumber LIMIT 1;"
echo '--- supplier ---'
docker exec pmk-koha-1 koha-mysql kohadev -N -e "SELECT id FROM aqbooksellers ORDER BY id LIMIT 1;"
