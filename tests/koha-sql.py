#!/usr/bin/env python3
"""Compile the bundled reports against the isolated Koha/MariaDB schema."""
from pathlib import Path
import json, os, re, subprocess
root = Path(__file__).resolve().parents[1]
environment = dict(os.environ)
for name in ('DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'):
    environment.pop(name,None)
passed = []
for path in sorted((root/'sql').glob('*.sql')):
    source = path.read_text()
    source = '\n'.join(line for line in source.splitlines() if not line.lstrip().startswith('--'))
    def value(match):
        parameter = match[1]
        if 'identifiant' in parameter: return '0'
        if '|date' in parameter: return "'2026-01-01'" if parameter.startswith('Du') else "'2026-12-31'"
        if '|branches' in parameter: return "'%'"
        return "'PMK-SYNTHETIC-CODE'"
    source = re.sub(r'<<([^>]+)>>',value,source).strip().rstrip(';')
    result = subprocess.run(['docker','--host=unix:///var/run/docker.sock','exec','-i',
        'pmk-koha-test-koha-1','koha-mysql','kohadev'],input='EXPLAIN '+source+';\n',
        capture_output=True,text=True,env=environment)
    if result.returncode:
        raise SystemExit(path.name+': '+result.stderr)
    passed.append(path.name)
    print('PASS MariaDB schema: '+path.name)
(root/'tests/validation/koha-sql.json').write_text(json.dumps({
    'passed':passed,'engine':'Real Koha 25.11 schema / MariaDB 10.11, EXPLAIN only',
    'scope':'Schema and syntax validation; no business rows read or modified'
},ensure_ascii=False,indent=2)+'\n')
