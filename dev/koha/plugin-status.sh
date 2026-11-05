#!/usr/bin/env bash
set -euo pipefail
docker exec pmk-koha-1 koha-mysql kohadev -e "SELECT plugin_class, plugin_key, LEFT(plugin_value,180) FROM plugin_data WHERE plugin_class LIKE '%PimpMyKoha%';"
echo '--- methods ---'
docker exec pmk-koha-1 koha-mysql kohadev -e "SELECT DISTINCT plugin_class, plugin_method FROM plugin_methods WHERE plugin_class LIKE '%PimpMyKoha%';"
echo '--- prefs ---'
docker exec pmk-koha-1 koha-mysql kohadev -e "SELECT variable, value FROM systempreferences WHERE variable IN ('UseKohaPlugins','intranetuserjs');"
echo '--- enable ---'
docker exec pmk-koha-1 grep -n enable_plugins /etc/koha/sites/kohadev/koha-conf.xml | head
