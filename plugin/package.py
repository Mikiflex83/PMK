#!/usr/bin/env python3
"""Package PMK sources, the tested KPZ and current validation evidence."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import argparse, datetime, hashlib, json, subprocess
root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--plugin',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
validation=root/'tests/validation';proof=json.loads((validation/'koha-final-run.json').read_text())
assert proof['pluginVersion']=='0.4.0' and all(x['passed'] for x in proof['suites'])
execution=json.loads((validation/'release-execution.json').read_text())
assert execution['pluginVersion']=='0.4.0' and len(execution['suites'])==17 and all(r['passed'] for r in execution['suites'])
assert hashlib.sha256(args.plugin.read_bytes()).hexdigest()==execution['packageSha256']
assert proof['packageSha256']==execution['packageSha256'] and len(proof['suites'])==20
for suite in proof['suites']:
 assert hashlib.sha256((root/suite['proof']).read_bytes()).hexdigest()==suite['proofSha256'],suite['suite']
assert json.loads((validation/'firebase-free.json').read_text())['passed']
installation=json.loads((validation/'koha-installation.json').read_text());assert installation['passed'] and installation['packageSha256']==execution['packageSha256']
assert json.loads((validation/'authorities-preservation.json').read_text())['passed']
for name,count in [('regression-results',79),('pages-universal',16),('koha-plugin',6),('koha-sql',13),('sql-pages',6)]:assert len(json.loads((validation/(name+'.json')).read_text())['passed'])==count,name
assert json.loads((validation/'plugin-storage.json').read_text())['passed']==5
export_proof=json.loads((validation/'export-transition.json').read_text())
assert len(export_proof['rows'])==5 and all(x['passed'] for x in export_proof['rows'])
for name,count in [('koha-configuration',86),('koha-business',6),('koha-maintenance',7),('koha-shared-tools',2),('koha-circulation',4),('koha-restoration',1),('koha-publications',2),('koha-lost-checkin',2),('koha-checkout-status',1),('koha-internal-pages',19),('koha-reports',13),('koha-migration',13),('koha-universality',5),('koha-native-data',15),('koha-native-engines',5)]:
 rows=json.loads((validation/(name+'.json')).read_text())['rows'];assert len(rows)==count and all(r['passed'] for r in rows),name
routes=json.loads((validation/'koha-routes.json').read_text())['rows'];assert len(routes)==30 and all(not x.get('error') and not x.get('pageErrors') and not x.get('httpErrors') for x in routes)
upgrade=json.loads((validation/'koha-upgrade-preservation.json').read_text())
assert upgrade['passed'] and upgrade['packageSha256']==execution['packageSha256'] and len(upgrade['tables'])==4 and upgrade['serverCredential']['count']==1
assert hashlib.sha256((root/'138-pages/138-page-authorities.js').read_bytes()).hexdigest()==json.loads((validation/'authorities-preservation.json').read_text())['currentSourceSha256']
with ZipFile(args.plugin) as kpz:
 assert kpz.testzip() is None
 manifest=json.loads(kpz.read('Koha/Plugin/PimpMyKoha/manifest.json'));assert manifest['version']=='0.4.0'
 for relative,digest in manifest['files'].items():
  source=(root/relative).read_bytes();assert hashlib.sha256(source).hexdigest()==digest,relative
  assert kpz.read('Koha/Plugin/PimpMyKoha/assets/'+relative)==source,relative
 assert hashlib.sha256(kpz.read('Koha/Plugin/PimpMyKoha/'+manifest['autoloadBundle'])).hexdigest()==manifest['bundleSha256']
 for relative in ['PimpMyKoha.pm','PimpMyKoha/bootstrap.js','PimpMyKoha/storage.js','PimpMyKoha/api.json','PimpMyKoha/Controller.pm','PimpMyKoha/native-data.js','PimpMyKoha/NativeData.pm','PimpMyKoha/migration.js']:
  assert kpz.read('Koha/Plugin/'+relative)==(root/'plugin/Koha/Plugin'/relative).read_bytes(),relative
files=sorted(p for p in root.rglob('*') if p.is_file() and p.name!='.env' and '-failure-' not in p.name and not any(x in {'.git','node_modules','__pycache__'} for x in p.relative_to(root).parts))
archive_manifest={'project':'PimpMyKoha','coreVersion':'0.8.0','pluginVersion':'0.4.0','createdUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'validation':proof,'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'files':[]}
notice=f'''PimpMyKoha — socle 0.8.0, plugin Koha 0.4.0

Le paquet installable est plugin/PimpMyKoha-plugin-0.4.0.kpz.
INSTALLATION-PLUGIN.md donne les étapes pour le téléverser dans votre Koha.
RECETTE-PLUGIN-KOHA.md décrit les vérifications réelles et leurs limites.
PLUGIN-KOHA-PMK.md explique l’installation locale et la reproduction des tests.
Le dossier dev/koha/ prépare une vraie instance Koha 25.11 dédiée.
Docker et la base de test ne sont pas embarqués dans ce ZIP.

Les configurations et données personnelles de votre installation ne sont pas
contenues dans cette archive. Aucune donnée de production n’a été modifiée.
Exporter et conserver vos réglages avant toute bascule. Aucun SDK ou service
Firebase n’est utilisé par le plugin. L’exportateur historique est un outil manuel séparé. MIGRATION-STOCKAGES-NATIFS.md explique la reprise des
anciens exports de données et configurations dans le stockage natif Koha.
Les autres intégrations externes facultatives conservent leurs prérequis.

Les {len(manifest['scripts'])} scripts, 86 formulaires et 19 pages ont été chargés et vérifiés localement.
Les principaux parcours réels de circulation, édition, statuts, restauration,
journal, compteur, XSLT, bibliographie et analyses passent ; ce n’est pas une
certification exhaustive de toutes les actions ou combinaisons possibles.
Les moteurs des autorités sont conservés ; leur ancien accès Firebase est retiré.

Le chargeur historique et le plugin ne doivent pas exécuter deux copies de PMK.
Les adresses 127.0.0.1 concernent la machine de développement ou votre propre
installation locale ; elles ne sont pas un lien public vers notre instance.
'''
args.output.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(args.output,'w',ZIP_DEFLATED,compresslevel=9) as archive:
 def write(relative,data,record=True):
  info=ZipInfo('PimpMyKoha/'+relative,datetime.datetime.now().timetuple()[:6]);info.compress_type=ZIP_DEFLATED;info.external_attr=0o100644<<16;archive.writestr(info,data)
  if record:archive_manifest['files'].append({'path':relative,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 for p in files:write(p.relative_to(root).as_posix(),p.read_bytes())
 write('plugin/PimpMyKoha-plugin-0.4.0.kpz',args.plugin.read_bytes())
 write('LIRE-AVANT-TEST.txt',notice.encode())
 write('MANIFESTE-ARCHIVE.json',(json.dumps(archive_manifest,ensure_ascii=False,indent=2)+'\n').encode(),False)
with ZipFile(args.output) as archive:
 assert archive.testzip() is None
 for entry in archive_manifest['files']:assert hashlib.sha256(archive.read('PimpMyKoha/'+entry['path'])).hexdigest()==entry['sha256']
 assert not any(n.endswith('/.env')or '/node_modules/' in n or '/.git/' in n for n in archive.namelist())
print(json.dumps({'archive':str(args.output),'bytes':args.output.stat().st_size,'files':len(archive_manifest['files']),'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest()}))
