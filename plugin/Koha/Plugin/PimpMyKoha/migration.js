/* Reprise globale hors ligne. Aucune connexion à l'ancien fournisseur. */
(function(){
 'use strict';
 const API='/api/v1/contrib/pmk/';
 const json=x=>JSON.stringify(x),clone=x=>JSON.parse(json(x));
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 async function importJsonFile(file,maxBytes=32*1024*1024){if(window.PMKImportCommon)return PMKImportCommon.jsonFile(file,{maxBytes});if(!file||file.size>maxBytes)throw new Error('Fichier absent ou trop volumineux');try{return JSON.parse(await file.text());}catch(error){throw new Error('JSON malformé : '+error.message);}}
 function importJsonText(text){if(window.PMKImportCommon)return PMKImportCommon.jsonText(text);try{const value=JSON.parse(text);if(!object(value))throw new Error('un objet JSON est attendu');return value;}catch(error){throw new Error('JSON malformé : '+error.message);}}
 function stable(v){if(Array.isArray(v))return v.map(stable);if(object(v))return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
 const same=(a,b)=>json(stable(a))===json(stable(b));
 async function digest(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json(v))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 async function request(path,options={}){const r=await fetch(API+path,{credentials:'same-origin',...options,headers:{Accept:'application/json','Content-Type':'application/json','X-PMK-Request':'1',...options.headers}});const b=await r.json();if(!r.ok)throw new Error(b.error||'Koha HTTP '+r.status);return b;}
 const runtime=enabled=>request('runtime',enabled===undefined?{}:{method:'PUT',body:json({enabled})});
 function mergePreservingUnknown(before,source){
  if(object(before)&&object(source)){const out=clone(before);for(const [k,v]of Object.entries(source))Object.defineProperty(out,k,{value:mergePreservingUnknown(before[k],v),enumerable:true,writable:true,configurable:true});return out;}
  return clone(source); // Arrays and their order are effective settings, never a union with new defaults.
 }
 async function snapshot(){const configuration=await request('migration/configuration'),stores=[];for(const ns of PMKNativeData.namespaces)stores.push(await PMKNativeData.exportNamespace(ns));return {format:'pmk-plugin-backup-v1',at:new Date().toISOString(),origin:location.origin,configuration:configuration.documents,stores};}
 function download(name,v){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([json(v)],{type:'application/json'}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
 function validateRows(rows,configuration=false){
  if(!Array.isArray(rows))throw new Error('Liste de documents absente');const seen=new Set();
  for(const r of rows){if(!r||!object(r.data)||typeof r.path!=='string'||seen.has(r.path))throw new Error('Document invalide ou en double');seen.add(r.path);if(configuration?!/^[a-zA-Z0-9_-]{1,190}$/.test(r.path):!r.path||r.path.length>512||r.path.split('/').length%2!==0||r.path.split('/').some(x=>!x||x==='.'||x==='..'||x.length>190))throw new Error('Chemin invalide : '+r.path);}
 }
 async function analyze(archive,options={}){
  if(!(await PMKNativeData.getSession()).isAdmin)throw new Error('Administrateur Koha requis');
  if(archive.format!=='pmk-transition-v1'||archive.payload?.format!=='pmk-transition-v1'||await digest(archive.payload)!==archive.sha256)throw new Error('Format ou empreinte de la sauvegarde invalide');
  const source=clone(archive.payload);
  if(!source.complete||source.issues?.length||!Array.isArray(source.coverage)||source.coverage.some(x=>x.state!=='complete'&&!(x.state==='excluded'&&x.reason)))throw new Error('La sauvegarde est incomplète. Résolvez les erreurs de l’export avant la bascule.');
  const expected=['configuration',...PMKNativeData.namespaces.filter(x=>x!=='authorities')];
  if(expected.some(x=>!source.coverage.some(c=>c.scope===x)))throw new Error('Couverture de sauvegarde manquante');
  validateRows(source.configuration,true);
  const known=window.PMKPlugin?.manifest?.moduleIds;
  if(known&&Array.isArray(source.source.modules)){const unsupported=source.source.modules.filter(m=>!known.includes(m.id)&&source.configuration.find(x=>x.path===m.id)?.data?.config?.enabled!==false);if(unsupported.length)throw new Error('Modules actifs absents du plugin : '+unsupported.map(x=>x.id).join(', '));}
  const backup=await snapshot(),old=new Map(backup.configuration.map(x=>[x.path,x])),configuration=[],unassigned=[];
  const mapping={...(source.favoriteOwners||{}),...(options.favoriteOwners||{})};
  for(const row of source.configuration){
   let path=row.path,data=row.data;
   if(path.startsWith('147-favorites-')){
    const target=mapping[path];if(!/^\d+$/.test(String(target||''))){unassigned.push(path);continue;}
    if(!Object.hasOwn(options.favoriteOwners||{},row.path)&&source.favoriteIdentities?.[row.path]){const r=await fetch('/api/v1/patrons/'+target,{credentials:'same-origin'});if(!r.ok||(await r.json()).userid!==source.favoriteIdentities[row.path].userid)throw new Error('Identité Koha des favoris à confirmer : '+row.path);}
    path='147-favorites-'+target;data={...data,ownerKohaId:String(target)};
   }
   const previous=old.get(path);configuration.push({path,data:mergePreservingUnknown(previous?.data||{},data),revision:previous?.revision||0});
  }
  if(unassigned.length)throw new Error('Favoris à attribuer explicitement à un numéro interne de compte Koha : '+unassigned.join(', '));
  if(new Set(configuration.map(x=>x.path)).size!==configuration.length)throw new Error('Deux exports de favoris ciblent le même compte. Fusionnez-les explicitement avant import.');
  // Preserve historical unconditional behavior during the transition only.
  if(!configuration.some(x=>x.path==='legacy-interface-options')){
   const settings={enabled:true,holdsMessage:{enabled:true}};
   if(source.browser?.overrides?.NAVETTE_SCHEDULE)settings.shuttle={schedule:json(source.browser.overrides.NAVETTE_SCHEDULE)};
   const before=old.get('legacy-interface-options');configuration.push({path:'legacy-interface-options',data:mergePreservingUnknown(before?.data||{},{config:settings}),revision:before?.revision||0});
  }
  const stores=[],conflicts=[],counts={create:0,identical:0,configuration:configuration.length};const seen=new Set();
  for(const store of source.stores||[]){
   if(!PMKNativeData.namespaces.includes(store.namespace)||seen.has(store.namespace))throw new Error('Stockage inconnu ou en double');seen.add(store.namespace);validateRows(store.documents);
   const current=new Map((backup.stores.find(x=>x.namespace===store.namespace)?.documents||[]).map(x=>[x.path,x]));
   const db=PMKNativeData.createDatabase(store.namespace),rows=[];
   for(const row of store.documents){const before=current.get(row.path);if(before){if(!same(before.data,row.data))conflicts.push(store.namespace+'/'+row.path);else counts.identical++;}else{const snap=await PMKNativeData.getDoc(PMKNativeData.doc(db,row.path));rows.push({...row,revision:snap.revision,exists:snap.exists()});counts.create++;}}
   stores.push({namespace:store.namespace,rows,create:rows.length,existing:store.documents.length-rows.length});
  }
  for(const c of source.coverage)if(c.state==='complete'&&c.scope!=='configuration'&&!seen.has(c.scope))throw new Error('Données manquantes pour '+c.scope);
  const browserConflicts=[];
  if(options.restoreBrowser){
   if(source.source.origin!==location.origin&&!options.allowOriginChange)throw new Error('Le navigateur cible a une autre origine. Confirmez explicitement le changement de domaine.');
   for(const [key,value]of Object.entries(source.browser?.localStorage||{})){if(/firebase|access.?token|refresh.?token|password|csrf/i.test(key))throw new Error('Clé locale réservée : '+key);const old=localStorage.getItem(key);if(old!==null&&old!==value)browserConflicts.push('localStorage/'+key);}
   const dbs=await indexedDB.databases();for(const db of source.browser?.indexedDB||[])if(dbs.some(x=>x.name===db.name)&&!same(await readDatabase(db.name),db))browserConflicts.push('IndexedDB/'+db.name);
  }
  return {archive:clone(archive),backup,source,configuration,stores,counts,conflicts,browserConflicts,options:clone(options)};
 }
 function decode(v){
  if(Array.isArray(v))return v.map(decode);if(!object(v))return v;
  const type=v.__pmkArchiveType;
  if(type==='Date')return new Date(v.value);if(type==='BigInt')return BigInt(v.value);if(type==='Undefined')return undefined;if(type==='Number')return Number(v.value);
  if(type==='Blob')return v.name?new File([new Uint8Array(v.value)],v.name,{type:v.type}):new Blob([new Uint8Array(v.value)],{type:v.type});
  if(type==='ArrayBuffer')return new Uint8Array(v.value).buffer;
  if(type==='TypedArray'){const constructors={Uint8Array,Uint8ClampedArray,Int8Array,Uint16Array,Int16Array,Uint32Array,Int32Array,Float32Array,Float64Array,DataView};const C=constructors[v.type];if(!C)throw new Error('Type binaire non reconnu');return new C(new Uint8Array(v.value).buffer);}
  if(type==='RegExp')return new RegExp(v.source,v.flags);
  if(type==='Map')return new Map(decode(v.value));if(type==='Set')return new Set(decode(v.value));
  return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x)]));
 }
 async function encode(v){
  if(v instanceof Date)return {__pmkArchiveType:'Date',value:v.toISOString()};
  if(v instanceof Blob)return {__pmkArchiveType:'Blob',type:v.type,name:v.name||null,value:Array.from(new Uint8Array(await v.arrayBuffer()))};
  if(v instanceof ArrayBuffer)return {__pmkArchiveType:'ArrayBuffer',value:Array.from(new Uint8Array(v))};
  if(ArrayBuffer.isView(v))return {__pmkArchiveType:'TypedArray',type:v.constructor.name,value:Array.from(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))};
  if(v instanceof RegExp)return {__pmkArchiveType:'RegExp',source:v.source,flags:v.flags};
  if(v instanceof Map)return {__pmkArchiveType:'Map',value:await encode([...v])};
  if(v instanceof Set)return {__pmkArchiveType:'Set',value:await encode([...v])};
  if(v===undefined)return {__pmkArchiveType:'Undefined'};
  if(typeof v==='bigint')return {__pmkArchiveType:'BigInt',value:String(v)};
  if(typeof v==='number'&&!Number.isFinite(v))return {__pmkArchiveType:'Number',value:String(v)};
  if(Array.isArray(v))return Promise.all(v.map(encode));
  if(v&&typeof v==='object'){const out={};for(const [k,x]of Object.entries(v))Object.defineProperty(out,k,{value:await encode(x),enumerable:true});return out;}
  return v;
 }
 async function databases(){if(!indexedDB.databases)throw new Error('Ce navigateur ne permet pas de lister les bases locales. Utilisez un Chromium récent.');return indexedDB.databases();}
 async function readDatabase(name){
  return new Promise((resolve,reject)=>{const req=indexedDB.open(name);req.onerror=()=>reject(req.error);req.onupgradeneeded=()=>req.transaction.abort();req.onsuccess=async()=>{
   const db=req.result,result={name,version:db.version,stores:[]};
   try{for(const name of db.objectStoreNames){const raw=await new Promise((ok,fail)=>{const tx=db.transaction(name,'readonly'),st=tx.objectStore(name),keys=st.getAllKeys(),values=st.getAll();const meta={name,keyPath:st.keyPath,autoIncrement:st.autoIncrement,indexes:[...st.indexNames].map(n=>{const x=st.index(n);return {name:n,keyPath:x.keyPath,unique:x.unique,multiEntry:x.multiEntry};})};tx.oncomplete=()=>ok({...meta,entries:keys.result.map((key,i)=>({key,value:values.result[i]}))});tx.onerror=()=>fail(tx.error);});result.stores.push(await encode(raw));}resolve(result);}catch(e){reject(e);}finally{db.close();}
  };});
 }
 async function restoreDatabase(spec){
  const existing=await indexedDB.databases();if(existing.some(x=>x.name===spec.name)){if(same(await readDatabase(spec.name),spec))return;throw new Error('Base locale différente : '+spec.name);}
  return new Promise((resolve,reject)=>{const req=indexedDB.open(spec.name,spec.version);req.onupgradeneeded=()=>{const db=req.result;for(const raw of spec.stores){const st=decode(raw),s=db.createObjectStore(st.name,{keyPath:st.keyPath,autoIncrement:st.autoIncrement});for(const index of st.indexes)s.createIndex(index.name,index.keyPath,{unique:index.unique,multiEntry:index.multiEntry});}};req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Fermez les autres onglets Koha'));req.onsuccess=()=>{const db=req.result;const tx=db.transaction([...db.objectStoreNames],'readwrite');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();const error=tx.error;const removal=indexedDB.deleteDatabase(spec.name);removal.onsuccess=()=>reject(error);removal.onerror=()=>reject(error);};for(const raw of spec.stores){const st=decode(raw),store=tx.objectStore(st.name);for(const row of st.entries)store.keyPath===null?store.put(row.value,row.key):store.put(row.value);}};});
 }
 async function apply(plan,{backupSaved=false,onProgress=()=>{}}={}){
  if(!backupSaved)throw new Error('Enregistrez la sauvegarde du plugin avant import');
  if(plan.conflicts.length||plan.browserConflicts.length)throw new Error('Conflits à résoudre avant import');
  if((await runtime()).enabled)throw new Error('Mettez le plugin en attente avant import');
  // Revalidate against the database now, rather than trusting an old in-memory preview.
  const fresh=await analyze(plan.archive,plan.options);
  if(fresh.conflicts.length||fresh.browserConflicts.length)throw new Error('Les données ont changé ; relancez l’analyse');
  if(!same(fresh.configuration,plan.configuration))throw new Error('Les configurations ont changé ; relancez l’analyse');
  for(const store of fresh.stores){onProgress('Import : '+store.namespace);await PMKNativeData.applyImport(store);}
  if(plan.options.restoreBrowser){
   for(const db of plan.source.browser?.indexedDB||[])await restoreDatabase(db);
   for(const [key,value]of Object.entries(plan.source.browser?.localStorage||{}))localStorage.setItem(key,value);
  }
  onProgress('Application atomique des configurations…');
  await request('migration/configuration',{method:'PUT',body:json({documents:fresh.configuration})});
  onProgress('Relecture et comparaison…');
  const verify=await snapshot();
  for(const row of fresh.configuration){const actual=verify.configuration.find(x=>x.path===row.path);if(!actual||!same(actual.data,row.data))throw new Error('Configuration non confirmée : '+row.path);}
  for(const store of plan.source.stores||[])for(const row of store.documents){const actual=verify.stores.find(x=>x.namespace===store.namespace)?.documents.find(x=>x.path===row.path);if(!actual||!same(actual.data,row.data))throw new Error('Donnée non confirmée : '+store.namespace+'/'+row.path);}
  return {verified:true,sha256:plan.archive.sha256,counts:plan.counts,activated:false};
 }
 async function assignProfile(sourceProfile,targetKohaUid){
  if(!(await PMKNativeData.getSession()).isAdmin)throw new Error('Administrateur Koha requis');
  if(!/^\d+$/.test(String(targetKohaUid))||!sourceProfile||sourceProfile.startsWith('koha_')||sourceProfile.includes('/'))throw new Error('Attribution invalide');
  const patron=await fetch('/api/v1/patrons/'+encodeURIComponent(targetKohaUid),{credentials:'same-origin'});if(!patron.ok)throw new Error('Compte Koha cible introuvable ou inaccessible');
  const value=await PMKNativeData.exportNamespace('lists'),prefix='profiles/'+sourceProfile,target='profiles/koha_'+targetKohaUid;
  const documents=value.documents.filter(x=>x.path===prefix||x.path.startsWith(prefix+'/')).map(x=>({path:target+x.path.slice(prefix.length),data:clone(x.data)}));
  if(!documents.length)throw new Error('Profil source introuvable');
  const preview=await PMKNativeData.previewImport('lists',{documents});if(preview.existing)throw new Error('Le compte cible contient déjà des listes. Aucune liste n’a été écrasée.');return {preview,documents};
 }
 async function open(){
  if(!(await PMKNativeData.getSession()).isAdmin)throw new Error('Administrateur Koha requis');
  document.getElementById('pmk-migration')?.remove();const root=document.createElement('section');root.id='pmk-migration';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.style.cssText='position:fixed;inset:5vh 7vw;z-index:2147483646;background:#fff;color:#28343d;padding:24px;overflow:auto;border:3px solid #6f8f32;border-radius:8px;box-shadow:0 8px 50px #0008;font:16px/1.5 system-ui';
  root.innerHTML='<h2>Transition vers le plugin</h2><p>Importez le fichier créé sur votre ancienne installation avec <code>dev/migration/export-production.js</code>. Les réglages et données inconnus sont conservés. Les données métier différentes déjà présentes bloquent la reprise. Les anciens services restent accessibles à l’ancienne installation pendant la préparation.</p><p><button data-pause>Mettre le plugin en attente</button> <span data-runtime role="status"></span></p><label>Fichier de sauvegarde <input type="file" accept=".json" data-file></label><p><label><input type="checkbox" data-browser> Restaurer aussi les données de ce navigateur (sur un nouveau profil de navigateur vide)</label><br><label><input type="checkbox" data-domain> Autoriser explicitement leur reprise sur ce nouveau domaine Koha</label></p><label>Attribution des favoris : JSON {"147-favorites-identifiant-historique":"numéro interne Koha"}<textarea data-owners rows="3" style="display:block;width:95%">{}</textarea></label><p><button data-analyze>1. Analyser sans modifier</button> <button data-backup disabled>2. Télécharger la sauvegarde du plugin</button> <button data-apply disabled>3. Importer et contrôler</button></p><pre data-status role="status" style="white-space:pre-wrap"></pre><p><label><input type="checkbox" data-confirm> L’ancien chargeur est retiré de IntranetUserJS, la reprise a été vérifiée et je suis prêt à basculer.</label></p><button data-enable disabled>Activer le plugin pour les prochains chargements</button> <button data-close>Fermer</button>';
  document.body.append(root);const el=k=>root.querySelector('[data-'+k+']');let plan=null,backupSaved=false,verified=false,busy=false;
  const status=s=>el('status').textContent=s;
  const reset=()=>{plan=null;backupSaved=false;verified=false;el('backup').disabled=el('apply').disabled=el('enable').disabled=true;};
  for(const k of ['file','browser','domain','owners'])el(k).onchange=reset;
  async function state(){const s=await runtime();el('runtime').textContent=s.enabled?'Plugin actif':'Plugin en attente ; anciens scripts inchangés';}
  async function task(fn){if(busy)return;busy=true;try{await fn();}catch(e){status('Arrêt : '+e.message);}finally{busy=false;}}
  el('pause').onclick=()=>task(async()=>{await runtime(false);await state();});
  el('analyze').onclick=()=>task(async()=>{reset();const f=el('file').files[0];if(!f)throw new Error('Choisissez la sauvegarde');status('Analyse en cours…');plan=await analyze(await importJsonFile(f),{restoreBrowser:el('browser').checked,allowOriginChange:el('domain').checked,favoriteOwners:importJsonText(el('owners').value||'{}')});status(json(plan.counts)+'\nConflits : '+[...plan.conflicts,...plan.browserConflicts].join(', '));el('backup').disabled=!!(plan.conflicts.length||plan.browserConflicts.length);});
  el('backup').onclick=()=>{if(!plan||busy)return;download('PMK-plugin-avant-reprise-'+Date.now()+'.json',plan.backup);backupSaved=true;el('apply').disabled=false;};
  el('apply').onclick=()=>task(async()=>{const report=await apply(plan,{backupSaved,onProgress:status});verified=report.verified;download('PMK-controle-reprise-'+Date.now()+'.json',report);status('Import relu et confirmé. Le plugin reste en attente. Retirez ensuite l’ancien chargeur, vérifiez les pages sur votre poste de test, puis activez le plugin.');el('enable').disabled=!el('confirm').checked;el('apply').disabled=true;});
  el('confirm').onchange=()=>el('enable').disabled=!(verified&&el('confirm').checked);
  el('enable').onclick=()=>task(async()=>{if(!verified||!el('confirm').checked)return;await runtime(true);await state();status('Plugin activé. Rechargez Koha.');});
  const ownership=document.createElement('details');ownership.innerHTML='<summary>Attribuer une copie d’un ancien profil de listes à un compte Koha</summary><p>Le profil nommé original reste disponible en mode historique. Une cible déjà remplie bloque la copie.</p><label>Identifiant exact du profil nommé <input data-source-profile></label> <label>Numéro interne du compte Koha <input data-target-profile inputmode="numeric"></label><button data-assign-preview>Analyser l’attribution</button> <button data-assign-apply disabled>Copier les listes et modèles vers ce compte</button>';
  root.append(ownership);let assignment=null;
  const initial=document.createElement('details');initial.innerHTML='<summary>Installation neuve, sans ancienne configuration PMK</summary><p>Cette option active les valeurs de base. Elle ne reprend aucune donnée d’une ancienne installation.</p><label><input type="checkbox" data-new-confirm> Je démarre une installation neuve et aucun ancien chargeur PMK n’est présent.</label> <button data-new-enable disabled>Activer une installation neuve</button>';root.append(initial);
  el('new-confirm').onchange=()=>el('new-enable').disabled=!el('new-confirm').checked;
  el('new-enable').onclick=()=>task(async()=>{if(!el('new-confirm').checked)return;await runtime(true);await state();status('Installation neuve activée. Ouvrez la configuration PMK pour adapter les valeurs de base.');});
  el('assign-preview').onclick=()=>task(async()=>{assignment=null;el('assign-apply').disabled=true;const result=await assignProfile(el('source-profile').value.trim(),el('target-profile').value.trim());assignment=result;status(result.documents.length+' documents à copier. Le profil source est conservé.');el('assign-apply').disabled=false;});
  for(const name of ['source-profile','target-profile'])el(name).oninput=()=>{assignment=null;el('assign-apply').disabled=true;};
  el('assign-apply').onclick=()=>task(async()=>{if(!assignment)return;if((await runtime()).enabled)throw new Error('Mettez le plugin en attente avant attribution');download('PMK-listes-avant-attribution-'+Date.now()+'.json',await PMKNativeData.exportNamespace('lists'));await PMKNativeData.applyImport(assignment.preview);for(const row of assignment.documents){const s=await PMKNativeData.getDoc(PMKNativeData.doc(PMKNativeData.createDatabase('lists'),row.path));if(!same(s.data(),row.data))throw new Error('Copie non confirmée');}status('Listes et modèles copiés et relus. Le profil historique est conservé.');assignment=null;el('assign-apply').disabled=true;});
  el('close').onclick=()=>{if(!busy)root.remove();};await state();
 }
 window.PMKMigration=Object.freeze({analyze,apply,snapshot,assignProfile,decode,restoreDatabase,digest,mergePreservingUnknown,runtime,open});
})();
