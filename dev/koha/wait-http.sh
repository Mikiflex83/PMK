#!/usr/bin/env bash
set -euo pipefail
for i in 1 2 3 4 5 6 7 8 9 10; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:18081/cgi-bin/koha/mainpage.pl || true)
  echo "try $i $code"
  if [ "$code" = "200" ]; then
    exit 0
  fi
  sleep 3
done
docker ps --filter name=pmk- --format '{{.Names}} {{.Status}}'
docker logs --tail 20 pmk-koha-1 || true
exit 1
