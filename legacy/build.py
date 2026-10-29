#!/usr/bin/env python3
"""Build the file-transfer PMK distribution. It is separate from the KPZ."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse, hashlib, json, shutil

ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--stage',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args();stage=args.stage.resolve()
assert stage!=ROOT and ROOT not in stage.parents
if stage.exists():shutil.rmtree(stage)
stage.mkdir(parents=True)

excluded={'000-drac-quality-memory-firebase.js','008-issuehistory-timelineold.js','138-pages-settings.js','066-067-lists-manager.js','071-history-system.js','075-advanced-search-sidebar.js'}
scripts=[p.name for p in sorted(ROOT.glob('*.js')) if p.name not in excluded]
ordered=['legacy/000-pmk-legacy-firestore-adapter.js','legacy/001-pmk-legacy-native-data.js']+scripts
for path in list(ROOT.glob('*.js')):
 if path.name not in {'000-drac-quality-memory-firebase.js','008-issuehistory-timelineold.js'}:shutil.copy2(path,stage/path.name)
for directory in ('137-widgets','138-pages','guides','sql'):
 shutil.copytree(ROOT/directory,stage/directory)
(stage/'dev/migration').mkdir(parents=True)
shutil.copy2(ROOT/'dev/migration/export-production.js',stage/'dev/migration/export-production.js')
shutil.copy2(ROOT/'pimp-my-koha.png',stage/'pimp-my-koha.png')
shutil.copy2(ROOT/'INSTALLATION-NON-PLUGIN-TRANSITION.md',stage/'INSTALLATION-NON-PLUGIN-TRANSITION.md')
for notice in ('LICENSE','THIRD_PARTY_NOTICES.md'):
 shutil.copy2(ROOT/notice,stage/notice)
for name in ('000-pmk-legacy-firestore-adapter.js','001-pmk-legacy-native-data.js','IntranetUserJS-Dracenie.js','pmk-legacy-private-config.example.js'):
 shutil.copy2(ROOT/'legacy'/name,stage/name)
# The common core remains identical to the plugin source; only the labels and
# local-backup key are specialized inside this non-plugin distribution.
core=stage/'000-pmk-config-firestore.js'
text=core.read_text()
text=text.replace('const STORAGE_LABEL = window.PMKConfigNativeStorage ? "Koha" : "Firestore";', 'const STORAGE_LABEL = window.PMKConfigNativeStorage?.kind === "firebase-legacy" ? "Firebase transitoire" : (window.PMKConfigNativeStorage ? "Koha" : "Stockage indisponible");')
text=text.replace("const storageInstallation = 'koha';", "const storageInstallation = window.PMKConfigNativeStorage?.kind === 'firebase-legacy' ? 'firebase-legacy' : 'koha';")
core.write_text(text)

version='0.4.0-transition.3'
file_names=[Path(x).name if x.startswith('legacy/') else x for x in ordered]
# Every source is an IIFE. Consecutive chunks preserve their deterministic order
# while avoiding both 112 requests and a single 7 MB parser input. This also
# avoids eval, so a strict browser content-security policy remains compatible.
chunks=[];current=[];current_bytes=0
direct_sources=set()
for name in file_names:
 # utf-8-sig strips a possible source BOM. A BOM is harmless at the beginning
 # of an individual file but invalid once that source follows another script.
 source=(stage/name).read_text(encoding='utf-8-sig');source_bytes=len(source.encode())
 if name in direct_sources:
  if current:chunks.append(current);current=[];current_bytes=0
  chunks.append([(name,source,True)])
  continue
 if current and current_bytes+source_bytes>900_000:
  chunks.append(current);current=[];current_bytes=0
 current.append((name,source,False));current_bytes+=source_bytes
if current:chunks.append(current)
bundle_names=[]
for index,chunk in enumerate(chunks,1):
 bundle_name=f'pmk-non-plugin-autoload-{index}.js';bundle_names.append(bundle_name)
 bundle=['/* Generated PMK non-plugin autoload chunk; sources stay individually available. */']
 for name,source,direct in chunk:
  if direct:
   bundle += [source,';window.PMKNonPlugin.loaded.push('+json.dumps(name)+');']
  else:
   bundle += ['try {',source,
              ';window.PMKNonPlugin.loaded.push('+json.dumps(name)+');',
              f'}} catch (error) {{ window.PMKNonPlugin.errors.push({json.dumps(name+": ")}+error.message); console.error({json.dumps("[PMK] "+name)},error); }};']
 (stage/bundle_name).write_text('\n'.join(bundle)+'\n')

loader="""/* PimpMyKoha non-plugin %s — démarrage groupé. */
(async function(){
 'use strict';
 if(window.PMKNonPlugin?.loading)return window.PMKNonPlugin.loading;
 const current=document.currentScript||[...document.scripts].find(s=>/pmk-non-plugin-loader\\.js/.test(s.src));
 const base=new URL('./',current?.src||'/public/koha-scripts/pmk-non-plugin-loader.js');
 const files=%s;
 const bundles=%s;
 const state=window.PMKNonPlugin={version:%s,baseUrl:base.href,files,loaded:[],errors:[],startupRequests:bundles.length};
 window.PMK_LEGACY_EXPORT_URL=new URL('dev/migration/export-production.js',base).href;
 state.loading=(async()=>{for(const bundle of bundles){await new Promise(resolve=>{const s=document.createElement('script');s.src=new URL(bundle,base).href+'?v='+encodeURIComponent(state.version);s.async=false;s.onload=()=>resolve();s.onerror=()=>{const error=new Error('Chargement impossible : '+bundle);state.errors.push(error.message);console.error('[PMK]',error);resolve();};document.head.append(s);});}window.dispatchEvent(new CustomEvent('pmk:non-plugin-ready',{detail:state}));return state;})();
 return state.loading;
})();
"""%(version,json.dumps(file_names,ensure_ascii=False),json.dumps(bundle_names),json.dumps(version))
(stage/'pmk-non-plugin-loader.js').write_text(loader)
notice=f"""PimpMyKoha {version} — distribution transitoire sans plugin

1. Sauvegardez le dossier PMK actuel et IntranetUserJS.
2. Copiez le contenu de ce dossier dans /public/koha-scripts/ en remplaçant les fichiers PMK.
3. Copiez pmk-legacy-private-config.example.js en pmk-legacy-private-config.js,
   renseignez localement les configurations de vos anciens projets et ne publiez
   jamais ce fichier privé.
4. Dans IntranetUserJS, conservez vos personnalisations hors PMK et remplacez
   l'ancien tableau `files` par le bloc JavaScript fourni dans
   IntranetUserJS-Dracenie.js. IntranetUserJS n'accepte pas une balise HTML.
5. Ne chargez plus séparément les anciens fichiers PMK : le chargeur fixe leur ordre
   et les démarre en quelques requêtes locales groupées.
6. Ouvrez PMK puis « Données des modules — import / export » pour sauvegarder.

Cette distribution utilise temporairement les projets Firebase historiques. Elle
ne doit pas être chargée en même temps que le plugin. Le futur plugin reste sans
Firebase et accepte la sauvegarde complète produite ici.
"""
(stage/'LIRE-AVANT-INSTALLATION.txt').write_text(notice)
manifest={'version':version,'kind':'pmk-non-plugin-transition','scripts':ordered,'files':{}}
for path in sorted(stage.rglob('*')):
 if path.is_file():manifest['files'][path.relative_to(stage).as_posix()]=hashlib.sha256(path.read_bytes()).hexdigest()
(stage/'MANIFESTE.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
args.output.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(args.output,'w',ZIP_DEFLATED,compresslevel=9) as archive:
 for path in sorted(stage.rglob('*')):
  if path.is_file():archive.write(path,'PimpMyKoha-non-plugin/'+path.relative_to(stage).as_posix())
with ZipFile(args.output) as archive:assert archive.testzip() is None
print(json.dumps({'archive':str(args.output),'version':version,'scripts':len(ordered),'files':len(manifest['files']),'bytes':args.output.stat().st_size,'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest()}))
