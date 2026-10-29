#!/usr/bin/env python3
"""Build a self-contained Koha KPZ without modifying any source module."""
from pathlib import Path
import argparse, hashlib, json, shutil, zipfile

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--stage', required=True, type=Path)
args = parser.parse_args()
stage = args.stage.resolve()
assert stage != ROOT and ROOT not in stage.parents, 'Use a staging directory outside the source project'
stage.mkdir(parents=True, exist_ok=True)
target = stage / 'Koha/Plugin/PimpMyKoha'
# Only this generated package subtree is replaced, never user configuration.
if target.exists():
    shutil.rmtree(target)
shutil.copytree(ROOT / 'plugin/Koha', stage / 'Koha', dirs_exist_ok=True)
for notice in ('LICENSE','THIRD_PARTY_NOTICES.md'):
    shutil.copy2(ROOT / notice, target / notice)
assets = target / 'assets'
assets.mkdir()
# Le client d'apprentissage Firebase est une archive historique : il ne doit
# jamais être livré, même comme ressource non chargée, dans le plugin natif.
files = sorted(path for path in ROOT.glob('*.js') if path.name != '000-drac-quality-memory-firebase.js')
for directory in ('138-pages', '137-widgets', 'guides', 'sql'):
    files += sorted(path for path in (ROOT / directory).rglob('*') if path.is_file())
files += [ROOT / 'pimp-my-koha.png']
for path in files:
    destination = assets / path.relative_to(ROOT)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, destination)
excluded = {
    '000-drac-quality-memory-firebase.js': 'Ancien client apprentissage supprimé, conservé comme archive.',
    '008-issuehistory-timelineold.js': 'Ancienne version du module 008, remplacée par la version courante.',
    '138-pages-settings.js': 'Dépendance chargée à la demande par le gestionnaire de pages.',
    '066-067-lists-manager.js': 'Runtime chargé par son module de configuration PMK.',
    '071-history-system.js': 'Runtime chargé par son module de configuration PMK.',
    '075-advanced-search-sidebar.js': 'Runtime chargé par son module de configuration PMK.',
}
scripts = [p.name for p in sorted(ROOT.glob('*.js')) if p.name not in excluded]
assert scripts[0] == '000-pmk-config-firestore.js'
declarations=json.loads((ROOT/'tests/validation/declarations.json').read_text())
registry_ids=sorted({row['id'] for row in declarations['records']})
manifest = {'moduleIds':registry_ids,'license':'GPL-3.0-or-later','version':'0.4.0','coreVersion':'0.8.0','scripts':scripts,'autoloadBundle':'assets/pmk-autoload.js','excludedFromAutoload':excluded,
            'files':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
# Each source already encloses its declarations in an IIFE. Keep script context
# and the assets base URL, while avoiding 104 separate authenticated API reads.
bundle = ['/* Generated PMK autoload; sources stay individually available. */']
for name in scripts:
    bundle += ['try {', (ROOT / name).read_text(),
               ';window.PMKPlugin.loaded.push('+json.dumps(name)+');',
               '} catch (error) { window.PMKPlugin.errors.push('+json.dumps(name+': ')+"+error.message); };"]
(assets / 'pmk-autoload.js').write_text('\n'.join(bundle)+'\n')
manifest['bundleSha256'] = hashlib.sha256((assets / 'pmk-autoload.js').read_bytes()).hexdigest()
manifest['build'] = hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest()[:16]
(target / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
for path in (stage / 'Koha').rglob('*'):
    path.chmod(0o755 if path.is_dir() else 0o644)
(stage / 'Koha').chmod(0o755)
args.output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(args.output,'w',zipfile.ZIP_DEFLATED) as archive:
    for path in sorted((stage / 'Koha').rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(stage))
with zipfile.ZipFile(args.output) as archive:
    assert archive.testzip() is None
print(json.dumps({'package':str(args.output),'bytes':args.output.stat().st_size,
                  'scripts':len(scripts),'assets':len(files),'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest()}))
