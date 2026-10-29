#!/usr/bin/env python3
"""Release gate: shipped scripts may not load or call any Firebase service."""
from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent.parent
files=list(root.glob('*.js'))
for folder in ['138-pages','137-widgets','guides','plugin/Koha/Plugin/PimpMyKoha']:
 files+=list((root/folder).rglob('*.js'))
patterns=[r'(?:https?:)?//[^\s"\'<>\\]*(?:firebaseio\.com|firebasedatabase\.app|firebaseapp\.com|firebasestorage\.app)',r'gstatic\.com/firebasejs',r'firestore\.googleapis\.com',r'(?:identitytoolkit|securetoken|firebasestorage)\.googleapis\.com',r'from\s+["\']firebase(?:/|["\'])',r'import\s*\(\s*["\']firebase(?:/|["\'])',r'\b(?:initializeApp|getFirestore|getAuth|signInAnonymously)\s*\(']
violations=[]
for p in files:
 source=p.read_text()
 for pattern in patterns:
  for m in re.finditer(pattern,source):violations.append({'file':p.relative_to(root).as_posix(),'match':m[0]})
for p in [root/'tests/package.json',root/'dev/koha/local-services.package.json']:
 for key in json.loads(p.read_text()).get('dependencies',{}):
  if key.startswith('firebase'):violations.append({'file':p.relative_to(root).as_posix(),'dependency':key})
assert not violations,json.dumps(violations,ensure_ascii=False)
assert 'DracQualityMemory' not in (root/'138-pages/138-page-authorities.js').read_text()
for name in ['items','loans','patrons','serials']:
 source=(root/f'138-pages/138-page-{name}.js').read_text()
 assert 'Partage facultatif' not in source,name
 assert 'Firebase reçoit' not in source,name
assert not any((root/'dev/koha'/name).exists() for name in ['firebase.json','firestore-test.rules','start-auth-emulator.cjs'])
report={'passed':True,'pluginVersion':'0.4.0','scriptsScanned':len(files),'serviceCalls':0,'externalSdkImports':0,'authoritiesLearningRemoved':True,'retiredSharingControlsRemoved':True,'firebaseEmulatorRequired':False}
(root/'tests/validation/firebase-free.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
