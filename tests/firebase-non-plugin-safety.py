#!/usr/bin/env python3
"""Verify that the non-plugin package has no institution Firebase default."""
from pathlib import Path
from zipfile import ZipFile
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "legacy" / "pmk-firebase-config.example.js"
text = TEMPLATE.read_text()

assert 'projectId: "VOTRE_PROJET_CONFIGURATIONS"' in text
assert 'apiKey: "VOTRE_CLE_WEB"' in text
assert 'databaseURL: "VOTRE_URL_REALTIME_DATABASE"' in text
assert 'window.PMK_FIREBASE_NAMESPACE_CONFIGS' in text

# A shipped projectId must remain a placeholder. Tests use simulated values,
# but runtime legacy sources must never select an institution project by default.
for path in (ROOT / "legacy").glob("*.js"):
    source = path.read_text()
    for match in re.finditer(r"projectId\s*:\s*(['\"])(.*?)\1", source):
        value = match.group(2)
        assert not value or value.startswith("VOTRE_"), f"Firebase project default in {path.name}"

adapter = (ROOT / "legacy" / "000-pmk-firebase-adapter.js").read_text()
assert "window.PMK_FIREBASE_CONFIG||{}" in adapter
assert "Configuration Firebase locale absente" in adapter

if len(sys.argv) > 1:
    archive = Path(sys.argv[1])
    with ZipFile(archive) as zipped:
        names = set(zipped.namelist())
        prefix = "PimpMyKoha-non-plugin/"
        required = {
            prefix + "000-pmk-firebase-adapter.js",
            prefix + "001-pmk-firebase-data.js",
            prefix + "pmk-firebase-config.example.js",
            prefix + "IntranetUserJS-PMK.js",
            prefix + "FIREBASE-NON-PLUGIN.md",
        }
        assert required <= names, sorted(required - names)
        assert prefix + "IntranetUserJS-Dracenie.js" not in names
        assert prefix + "pmk-legacy-private-config.example.js" not in names
        packaged = zipped.read(prefix + "pmk-firebase-config.example.js").decode()
        assert packaged == text

print("PASS non-plugin Firebase: no institution project selected by default")
