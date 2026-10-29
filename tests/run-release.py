#!/usr/bin/env python3
"""Run each real Koha recipe sequentially and bind it to the installed KPZ hash."""
from pathlib import Path
import subprocess,os,json,datetime,hashlib
root=Path(__file__).resolve().parent.parent;work=root.parent/'work/transparent-migration';work.mkdir(parents=True,exist_ok=True);env=dict(os.environ)
env.setdefault('NODE_PATH',str(root.parent/'work/native-test-tools/node_modules'))
package=Path(os.environ.get('PMK_RELEASE_KPZ',root.parent/'work/PimpMyKoha-plugin-0.4.0.kpz'))
package_hash=hashlib.sha256(package.read_bytes()).hexdigest()
for key in ('DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'):env.pop(key,None)
cases=[['node','tests/'+name+'.cjs'] for name in ['koha-native-data','koha-native-engines','koha-shared-tools','koha-plugin','koha-configuration','koha-business','koha-circulation','koha-checkout-status','koha-lost-checkin','koha-restoration','koha-maintenance','koha-publications','koha-internal-pages','koha-routes','koha-migration','koha-universality']]
cases.append(['python3','tests/koha-sql.py'])
rows=[]
for command in cases:
 name=Path(command[-1]).stem;print('RUN '+name,flush=True)
 with (work/(name+'-final.log')).open('w') as log:
  result=subprocess.run(command,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=1500)
 assert hashlib.sha256(package.read_bytes()).hexdigest()==package_hash, 'The KPZ changed during the recipe'
 rows.append({'suite':name,'passed':result.returncode==0,'exitCode':result.returncode});print(('PASS 'if result.returncode==0 else 'FAIL ')+name,flush=True)
 proof={'pluginVersion':'0.4.0','packageSha256':package_hash,'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'suites':rows}
 (root/'tests/validation/release-execution.json').write_text(json.dumps(proof,indent=2)+'\n')
if any(not r['passed'] for r in rows):raise SystemExit(1)
