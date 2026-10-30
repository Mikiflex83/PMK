/* PMK : sauvegarde en lecture seule à exécuter sur l'ancien Koha, avant de retirer son chargeur.
 * Aucun SDK ajouté, aucune donnée distante modifiée. Le fichier téléchargé reste sur votre poste.
 * Interface : coller ce fichier dans la console du navigateur de production connecté à Koha.
 */
(async function () {
 'use strict';
 if(window.PMKLegacyExport){window.PMKLegacyExport.open();return;}
 const overrides=window.PMK_LEGACY_EXPORT_OPTIONS||{};
 const namespaceConfigs=window.PMK_FIREBASE_NAMESPACE_CONFIGS||window.PMK_LEGACY_NAMESPACE_CONFIGS||{};
 const scopes=['configuration','attendance','appointments','journal','lists','taxonomy','planning','frequency'];
 const projects=Object.fromEntries(scopes.map(scope=>[scope,String(overrides.projects?.[scope]||(scope==='configuration'?window.PMK_FIREBASE_CONFIG?.projectId:namespaceConfigs[scope]?.projectId)||'')]).filter(([,project])=>project));
 const roots={configuration:[String(window.PMK_FIREBASE_COLLECTION||'pimpmykoha_preplugin_modules')],attendance:['counts','locations'],appointments:['bookings','participants','pollResponses','polls','recurrenceRules','settings','slots','themes'],journal:['entries','logs'],lists:['profiles'],taxonomy:['treeData','koha099_named_presets','pmk_cataloguing_tree_presets','koha_items_assistant_presets'],planning:['planning'],frequency:['frequencyCounter']};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const storePattern=/^(?:pmk|koha|drac|kx|sidebar|kwd|xslt|nf|items$|freq|doodle|dam-|inventory)/i;
 const secretPattern=/firebase|authuser|access.?token|refresh.?token|session.?token|password|csrf/i;
 async function digest(value){if(!crypto.subtle)throw new Error('Ouvrez Koha en HTTPS pour calculer l’empreinte de la sauvegarde.');return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function download(value){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.href=u;a.download='PMK-transition-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
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
 async function credentials(){
  const tokens=new Map(),apps=new Map();
  for(const app of window.firebase?.apps||[]){const project=app.options?.projectId;if(!project)continue;apps.set(project,app);try{const user=app.auth?.().currentUser;if(user)tokens.set(project,await user.getIdToken());}catch(_){}}
  for(const db of await databases())if(db.name==='firebaseLocalStorageDb'){
   const data=await readDatabase(db.name);for(const store of data.stores)for(const entry of store.entries){const v=entry.value?.value||entry.value,t=v?.stsTokenManager?.accessToken;if(!t)continue;try{const body=JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(Object.values(projects).includes(body.aud)||Object.values(overrides.projects||{}).includes(body.aud))tokens.set(body.aud,t);}catch(_){}const key=v.apiKey;for(const app of apps.values())if(app.options.apiKey===key)tokens.set(app.options.projectId,t);const project=v.authDomain?.split('.')[0];if(project)tokens.set(project,t);}
  }
  return {tokens,apps};
 }
 function restValue(v){
  if('nullValue'in v)return null;
  if('timestampValue'in v){const ms=Date.parse(v.timestampValue),fraction=(v.timestampValue.match(/\.(\d+)/)||[])[1]||'';return {__pmkType:'timestamp',seconds:Math.floor(ms/1000),nanoseconds:Number(fraction.padEnd(9,'0').slice(0,9))};}
  for(const k of ['stringValue','booleanValue','doubleValue','referenceValue','bytesValue'])if(k in v)return v[k];
  if('integerValue'in v){const n=Number(v.integerValue);return Number.isSafeInteger(n)?n:v.integerValue;}
  if('arrayValue'in v)return (v.arrayValue.values||[]).map(restValue);
  if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,restValue(x)]));
  if('geoPointValue'in v)return v.geoPointValue;
  throw new Error('Type de document non reconnu');
 }
 async function exportCollection(project,path,auth){
  const out=[],app=auth.apps.get(project);
  if(app?.firestore){const snap=await app.firestore().collection(path).get();for(const d of snap.docs)out.push({path:d.ref.path,data:copy(d.data())});return out;}
  let token='';do{const url=new URL('https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(project)+'/databases/(default)/documents/'+path.split('/').map(encodeURIComponent).join('/'));url.searchParams.set('pageSize','1000');if(token)url.searchParams.set('pageToken',token);const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);let r;try{r=await fetch(url,{signal:ctl.signal,headers:auth.tokens.has(project)?{Authorization:'Bearer '+auth.tokens.get(project)}:{}});}finally{clearTimeout(timer);}if(!r.ok)throw new Error('Lecture refusée ('+r.status+') : '+project+'/'+path);const b=await r.json();for(const d of b.documents||[])out.push({path:d.name.split('/documents/')[1],data:Object.fromEntries(Object.entries(d.fields||{}).map(([k,v])=>[k,restValue(v)]))});token=b.nextPageToken||'';}while(token);return out;
 }
 async function run({scopes=Object.keys(projects).concat(namespaceConfigs['internal-share']?.projectId||overrides.rtdbUrl?'internal-share':[]),onProgress=()=>{}}={}){
  if(!window.PMKConfig?.listModules)throw new Error('Le PMK non plugin doit être chargé sur cette page.');
  const payload={format:'pmk-transition-v1',exportedAt:new Date().toISOString(),source:{origin:location.origin,url:location.pathname,plugin:window.PMKPlugin?.version||null,modules:PMKConfig.listModules(),scripts:[...document.scripts].filter(x=>/pmk|koha-scripts/i.test(x.src)).map(x=>({src:x.src,inline:x.src?undefined:x.textContent}))},configuration:[],stores:[],browser:{localStorage:{},indexedDB:[],overrides:{}},coverage:[],issues:[]};
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if((storePattern.test(k)||(overrides.localStorageKeys||[]).includes(k))&&!secretPattern.test(k))payload.browser.localStorage[k]=localStorage.getItem(k);}
  for(const name of ['NAVETTE_SCHEDULE','PMK_PAGES_OPTIONS','PMK6XXConfig'])if(window[name])payload.browser.overrides[name]=copy(window[name]);
  const liveConfig={};for(const module of PMKConfig.listModules())try{liveConfig[module.id]=await PMKConfig.getConfig(module.id,{ignoreGlobal:true,force:true});}catch(error){payload.issues.push({scope:'configuration',moduleId:module.id,message:error.message});}
  const pages=liveConfig['internal-pages-tools']?.pageOptions||{},attendance=liveConfig['attendance-mediabus-mini']||{};
  for(const name of ['locationsCollection','countsCollection'])if(attendance[name])roots.attendance.push(attendance[name]);
  if(liveConfig['item-entry-assistant']?.presets?.collection)roots.taxonomy.push(liveConfig['item-entry-assistant'].presets.collection);
  if(pages.weeding?.runtime?.taxonomyCollection)roots.taxonomy.push(pages.weeding.runtime.taxonomyCollection);
  for(const value of Object.values(pages.appointments?.runtime?.collections||{}))if(typeof value==='string'&&value)roots.appointments.push(value);
  for(const name of ['entriesCollection','logsCollection'])if(pages['action-journal']?.runtime?.[name])roots.journal.push(pages['action-journal'].runtime[name]);
  const auth=await credentials();
  for(const scope of scopes){onProgress('Lecture : '+scope);try{
   if(scope==='internal-share'){
    const cfg=await PMKConfig.getConfig('internal-share',{ignoreGlobal:true});const legacy=cfg?.storage?.firebaseLegacy||{},shareProject=String(overrides.projects?.['internal-share']||namespaceConfigs['internal-share']?.projectId||legacy.config?.projectId||'');const app=[...auth.apps.values()].find(x=>x.options.projectId===shareProject);let tree;
    if(app?.database)tree=(await app.database().ref().once('value')).val();
    else {const base=legacy.config?.databaseURL||namespaceConfigs['internal-share']?.databaseURL||overrides.rtdbUrl;if(!base)throw new Error('URL de l’ancien partage non configurée.');const url=new URL('/.json',base);const token=auth.tokens.get(shareProject);if(token)url.searchParams.set('auth',token);const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('Lecture du partage refusée ('+r.status+')');tree=await r.json();}
    const rows=[];for(const [id,data]of Object.entries(tree?.shares||{}))rows.push({path:'shares/'+id,data});if(tree?.stats?.usage_count!=null)rows.push({path:'stats/usage_count',data:{count:tree.stats.usage_count}});payload.stores.push({namespace:scope,documents:rows,legacyRaw:tree});
   }else{
    const project=overrides.projects?.[scope]||projects[scope],collections=overrides.collections?.[scope]||[...new Set(roots[scope])];let rows=[];
    if(!collections?.length)throw new Error('Aucune collection à exporter pour '+scope);
    for(const root of collections)rows.push(...await exportCollection(project,root,auth));
    if(scope==='lists')for(const profile of [...rows]){rows.push(...await exportCollection(project,profile.path+'/bibliographyTemplates',auth));const lists=await exportCollection(project,profile.path+'/lists',auth);rows.push(...lists);for(const list of lists)rows.push(...await exportCollection(project,list.path+'/entries',auth));}
    if(scope==='configuration')payload.configuration=rows.map(x=>({...x,path:x.path.split('/').at(-1)}));else payload.stores.push({namespace:scope,project,documents:rows});
   }
   payload.coverage.push({scope,state:'complete'});
  }catch(e){payload.coverage.push({scope,state:'failed'});payload.issues.push({scope,message:e.message});}}
  for(const scope of Object.keys(projects).concat('internal-share'))if(!scopes.includes(scope))payload.coverage.push({scope,state:'excluded',reason:overrides.exclusionReasons?.[scope]||''});
  onProgress('Capture des configurations effectives et des bases locales…');
  for(const module of PMKConfig.listModules()){
   try{const config=liveConfig[module.id];if(!config)throw new Error('Configuration effective indisponible');let row=payload.configuration.find(x=>x.path===module.id);if(!row){row={path:module.id,data:{}};payload.configuration.push(row);}row.legacyRaw=copy(row.data);row.data={...row.data,config:copy(config)};row.defaults=PMKConfig.getDefinition?.(module.id)?.defaults||null;}catch(e){payload.issues.push({scope:'configuration',moduleId:module.id,message:e.message});}
  }
  const extraDatabases=[...(overrides.databaseNames||[]),pages.weeding?.runtime?.workspaceDbName].filter(Boolean);
  for(const db of await databases())if((storePattern.test(db.name)||extraDatabases.includes(db.name))&&!secretPattern.test(db.name)){try{payload.browser.indexedDB.push(await readDatabase(db.name));}catch(e){payload.issues.push({scope:'browser',database:db.name,message:e.message});}}
  payload.source.projects={...projects,...overrides.projects};
  payload.favoriteOwners={};payload.favoriteIdentities={};payload.warnings=[];
  for(const row of payload.configuration.filter(x=>x.path.startsWith('147-favorites-'))){
   const identity=String(row.data.ownerKohaId||'').trim();if(!identity){payload.warnings.push('Favoris à attribuer : '+row.path);continue;}
   try{const url=new URL('/api/v1/patrons',location.origin);url.searchParams.set('userid',identity);const response=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json'}});if(!response.ok)throw Error('Correspondance Koha non accessible');const data=await response.json();const users=Array.isArray(data)?data.filter(x=>x.userid===identity):[];if(/^\d+$/.test(identity)){const r=await fetch('/api/v1/patrons/'+identity,{credentials:'same-origin'});if(r.ok)users.push(await r.json());}const byId=new Map(users.map(x=>[String(x.patron_id),x]));if(byId.size!==1)throw Error('Correspondance ambiguë ou absente');const user=[...byId.values()][0];payload.favoriteOwners[row.path]=String(user.patron_id);payload.favoriteIdentities[row.path]={userid:user.userid,patronId:String(user.patron_id)};}catch(error){payload.warnings.push('Favoris à attribuer explicitement : '+row.path+' ('+error.message+')');}
  }
  payload.complete=!payload.issues.length&&payload.coverage.every(x=>x.state==='complete'||(x.state==='excluded'&&x.reason));
  const archive={format:'pmk-transition-v1',sha256:await digest(payload),payload};download(archive);return archive;
 }
 function open(){
  document.getElementById('pmk-export-production')?.remove();const root=document.createElement('section');root.id='pmk-export-production';root.style.cssText='position:fixed;inset:8vh 10vw;z-index:2147483647;background:white;color:#28343d;overflow:auto;padding:24px;border:3px solid #6f8f32;border-radius:8px;box-shadow:0 8px 50px #0008';
  root.innerHTML='<h2>Sauvegarder PMK avant le passage au plugin</h2><p>Cette action lit les réglages et données accessibles, puis télécharge un fichier sur votre poste. Gardez ce fichier en lieu sûr : il contient vos données métier. Exécutez aussi la sauvegarde depuis les autres navigateurs qui contiennent des brouillons ou favoris propres à leurs agents.</p><p>Aucune écriture n’est effectuée dans Koha ni dans les anciens services.</p><button type="button" class="btn btn-primary" data-export>Enregistrer la sauvegarde complète</button> <button type="button" class="btn btn-default" data-close>Fermer</button><pre role="status" style="white-space:pre-wrap"></pre>';
  document.body.append(root);root.querySelector('[data-close]').onclick=()=>root.remove();root.querySelector('[data-export]').onclick=async e=>{e.target.disabled=true;const status=root.querySelector('pre');try{const r=await run({onProgress:s=>status.textContent=s});status.textContent=r.payload.complete?'Sauvegarde terminée. Le plugin vérifiera son intégrité et chaque document avant import.':'Sauvegarde partielle téléchargée. Ne basculez pas encore :\n'+r.payload.issues.map(x=>x.scope+' : '+x.message).join('\n');}catch(e){status.textContent=e.message;}finally{e.target.disabled=false;}};
 }
 window.PMKLegacyExport={run,open,readDatabase,digest};open();
})();
