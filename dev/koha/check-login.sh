#!/usr/bin/env bash
set -euo pipefail
docker exec pmk-koha-1 koha-mysql kohadev -e "SELECT variable, value FROM systempreferences WHERE variable IN ('UseKohaPlugins','marcflavour','version');"
echo '--- pmk tables ---'
docker exec pmk-koha-1 koha-mysql kohadev -e "SHOW TABLES LIKE 'koha_plugin_pimpmykoha%';"
echo '--- plack ---'
docker exec pmk-koha-1 koha-plack --status kohadev || true

tmp=$(mktemp -d)
curl -sS -c "$tmp/cj" -b "$tmp/cj" -o "$tmp/login.html" http://127.0.0.1:18081/cgi-bin/koha/mainpage.pl
python3 - "$tmp" <<'PY'
import pathlib, re, subprocess, sys
tmp = pathlib.Path(sys.argv[1])
html = (tmp / "login.html").read_text(errors="replace")
token = ""
match = re.search(r'name="csrf_token"[^>]*value="([^"]+)"', html) or re.search(r'value="([^"]+)"[^>]*name="csrf_token"', html)
if match:
    token = match.group(1)
print("csrf", "yes" if token else "no", "login_form", "Koha" in html)
data = [
    "login_userid=koha",
    "login_password=koha",
    "login_op=cud-login",
    "koha_login_context=intranet",
    "branch=CPL",
]
if token:
    data.append("csrf_token=" + token)
open(tmp / "post.txt", "w").write("&".join(data))
PY
code=$(curl -sS -o "$tmp/after.html" -w '%{http_code} %{redirect_url}' -c "$tmp/cj" -b "$tmp/cj" -d @"$tmp/post.txt" http://127.0.0.1:18081/cgi-bin/koha/mainpage.pl)
echo "LOGIN $code"
curl -sS -o "$tmp/plugins.html" -w 'PLUGINS %{http_code}\n' -c "$tmp/cj" -b "$tmp/cj" http://127.0.0.1:18081/cgi-bin/koha/plugins/plugins-home.pl
python3 - "$tmp/plugins.html" <<'PY'
import pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text(errors="replace")
print("page_has_pmk", "PimpMyKoha" in text)
print("page_has_login", "login" in text.lower() and "password" in text.lower())
print("title", (text[text.find("<title>"):text.find("</title>")+8] if "<title>" in text else "")[:180])
PY
rm -rf "$tmp"
