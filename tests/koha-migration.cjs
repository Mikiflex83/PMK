// Real Koha / MariaDB transition checks. Dedicated synthetic fixtures only.
const {launch,ROOT,BASE}=require('./lib/koha.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const admin=await launch({offlineVendors:true}),staff=await launch({user:'pmk-test-staff',password:'pmk-test-only',offlineVendors:true});
 const p=admin.page,rows=[],prefix='migration_'+Date.now();
 const check=async(name,fn)=>{try{const evidence=await fn();rows.push({name,passed:true,evidence});console.log('PASS '+name);}catch(e){rows.push({name,passed:false,error:e.stack});console.log('FAIL '+name+' '+e.message);}fs.writeFileSync(ROOT+'/tests/validation/koha-migration.json',JSON.stringify({pluginVersion:'0.4.0',kind:'Dedicated real Koha 25.11 / MariaDB transition',rows},null,2)+'\n');};
 let wasEnabled=true;
 try{
  await check('Native migration services and two accounts load',async()=>{assert.equal(await p.evaluate(()=>typeof PMKMigration.analyze),'function');assert.equal(await p.evaluate(()=>PMKConfig.listModules().length),86);return {modules:86};});
  await check('Private list profiles enforce server-side account ownership',async()=>{
   const uid=await staff.page.evaluate(async()=>(await PMKNativeData.getSession()).uid),other='999999999';
   for(const owner of [uid,other])await p.evaluate(async({owner,prefix})=>{const s=PMKNativeData;await s.setDoc(s.doc(s.createDatabase('lists'),'profiles','koha_'+owner),{displayName:prefix});},{owner,prefix});
   const result=await staff.page.evaluate(async other=>{const s=PMKNativeData,db=s.createDatabase('lists'),r=s.doc(db,'profiles','koha_'+other);const outcomes=[];for(const fn of [()=>s.getDoc(r),()=>s.setDoc(r,{stolen:true}),()=>s.getDocs(s.collection(db,'profiles','koha_'+other,'lists'))]){try{await fn();outcomes.push(200);}catch(e){outcomes.push(e.status);}}const directory=await s.getDocs(s.collection(db,'profiles'));return {outcomes,ids:directory.docs.map(x=>x.id)};},other);
   assert.deepEqual(result.outcomes,[403,403,403]);assert(!result.ids.includes('koha_'+other));assert(result.ids.includes('koha_'+uid));return result;
  });
  await check('Account mode uses Koha session, never a selected historic name',async()=>{
   await admin.configure('personal-lists-manager',{identityMode:'koha'});await staff.goto('/cgi-bin/koha/mainpage.pl');
   const result=await staff.page.evaluate(async()=>{await PMKPersonalLists.ensureLoaded();const ctx=await PMKPersonalLists.getStorageContext();return {profile:ctx.profileId||ctx.profile?.id,session:(await PMKNativeData.getSession()).uid,config:PMKPersonalListsOptions.identityMode};});
   assert.equal(result.config,'koha');assert.equal(result.profile,'koha_'+result.session);return result;
  });
  await check('Migration snapshot and control refuse non administrators',async()=>{
   const outcomes=[];for(const suffix of ['runtime','migration/configuration']){const r=await staff.context.request.get(BASE+'/api/v1/contrib/pmk/'+suffix);outcomes.push(r.status());}assert.deepEqual(outcomes,[403,403]);return outcomes;
  });
  // Build a signed synthetic old production export, containing custom arrays and unknown fields.
  await p.evaluate(async prefix=>{
   const coverage=['configuration',...PMKNativeData.namespaces.filter(x=>x!=='authorities')].map(scope=>({scope,state:'complete'}));
   const payload={format:'pmk-transition-v1',complete:true,coverage,issues:[],source:{origin:location.origin},configuration:[{path:prefix,data:{config:{enabled:true,custom:{mine:'Équipe'},ordered:['personnalisé','défaut']},unknownMetadata:42}}],browser:{localStorage:{},indexedDB:[],overrides:{}},stores:PMKNativeData.namespaces.filter(x=>x!=='authorities').map(namespace=>({namespace,documents:namespace==='taxonomy'?[{path:prefix+'/kept',data:{title:'Sur mesure',future:{x:42},date:{__pmkType:'timestamp',seconds:1,nanoseconds:123}}}]:[]}))};
   window.__migrationArchive={format:payload.format,payload,sha256:await PMKMigration.digest(payload)};
  },prefix);
  await check('Tampered and partial archives are blocked before writes',async()=>{
   const result=await p.evaluate(async()=>{const out=[];for(const partial of [false,true]){const x=structuredClone(__migrationArchive);x.payload.configuration[0].data.config.enabled=false;if(partial){x.payload.complete=false;x.sha256=await PMKMigration.digest(x.payload);}try{await PMKMigration.analyze(x);out.push(false);}catch(e){out.push(true);}}return out;});assert.deepEqual(result,[true,true]);return result;
  });
  await check('Global analysis is read-only and preserves array order',async()=>{
   const before=await admin.doc(prefix),result=await p.evaluate(async()=>{window.__migrationPlan=await PMKMigration.analyze(__migrationArchive);const m=PMKMigration.mergePreservingUnknown({rows:['new-default'],custom:42},{rows:['mine','default']});return {counts:__migrationPlan.counts,merged:m};});assert.equal(before.exists,false);assert.equal((await admin.doc(prefix)).exists,false);assert.deepEqual(result.merged,{rows:['mine','default'],custom:42});return result;
  });
  await check('Active runtime and missing backup block the global import',async()=>{
   const result=await p.evaluate(async()=>{const out=[];for(const backupSaved of [false,true]){try{await PMKMigration.apply(__migrationPlan,{backupSaved});out.push('unexpected');}catch(e){out.push(e.message);}}return out;});assert(result[0].includes('sauvegarde'));assert(result[1].includes('attente'));return result;
  });
  await check('Pause, atomic configuration import and complete readback retain custom settings',async()=>{
   wasEnabled=await p.evaluate(async()=>{const s=await PMKMigration.runtime();await PMKMigration.runtime(false);return s.enabled;});
   const result=await p.evaluate(async()=>{const r=await PMKMigration.apply(__migrationPlan,{backupSaved:true});return {r,enabled:(await PMKMigration.runtime()).enabled};});assert(result.r.verified);assert.equal(result.enabled,false);const got=await admin.doc(prefix);assert.equal(got.data.unknownMetadata,42);assert.deepEqual(got.data.config.ordered,['personnalisé','défaut']);return result;
  });
  await check('A completed global import can be resumed without losing data',async()=>{
   const result=await p.evaluate(async()=>{const plan=await PMKMigration.analyze(__migrationArchive);const r=await PMKMigration.apply(plan,{backupSaved:true});return {counts:plan.counts,verified:r.verified};});assert.equal(result.counts.identical,1);assert(result.verified);return result;
  });
  await check('Different existing business data block replacement',async()=>{
   const result=await p.evaluate(async()=>{const x=structuredClone(__migrationArchive);x.payload.stores.find(x=>x.namespace==='taxonomy').documents[0].data.title='Écraser';x.sha256=await PMKMigration.digest(x.payload);const plan=await PMKMigration.analyze(x);try{await PMKMigration.apply(plan,{backupSaved:true});return false;}catch(e){return {conflicts:plan.conflicts,message:e.message};}});assert.equal(result.conflicts.length,1);return result;
  });
  await check('A concurrent configuration write rejects the entire configuration batch',async()=>{
   const result=await p.evaluate(async prefix=>{const base='/api/v1/contrib/pmk/',headers={'X-PMK-Request':'1','Content-Type':'application/json'};let r=await fetch(base+'documents/'+prefix);const old=await r.json();await fetch(base+'documents/'+prefix,{method:'PUT',headers,body:JSON.stringify({revision:old.revision,data:{race:true}})});const response=await fetch(base+'migration/configuration',{method:'PUT',headers,body:JSON.stringify({documents:[{path:prefix+'_atomic',data:{mustNotExist:true},revision:0},{path:prefix,data:{overwritten:true},revision:old.revision}]})});const never=await(await fetch(base+'documents/'+prefix+'_atomic')).json();return {status:response.status,exists:never.exists};},prefix);assert.equal(result.status,409);assert.equal(result.exists,false);return result;
  });
  await check('Fresh browser archive restores binary, dates, indexed keys and project text',async()=>{
   const result=await p.evaluate(async prefix=>{const db={name:'pmk-test-'+prefix,version:1,stores:[{name:'projects',keyPath:null,autoIncrement:false,indexes:[],entries:[{key:'mine',value:{text:'XSLT et inventaire',date:{__pmkArchiveType:'Date',value:'2026-10-20T00:00:00.000Z'},blob:{__pmkArchiveType:'Blob',type:'text/plain',value:[65,66,67]}}}]}]};await PMKMigration.restoreDatabase(db);const value=await new Promise((ok,fail)=>{const r=indexedDB.open(db.name);r.onsuccess=()=>{const handle=r.result,g=handle.transaction('projects').objectStore('projects').get('mine');g.onsuccess=()=>{handle.close();ok(g.result);};};r.onerror=()=>fail(r.error);});await new Promise(ok=>{const r=indexedDB.deleteDatabase(db.name);r.onsuccess=ok;});return {text:value.text,date:value.date.toISOString(),blob:await value.blob.text()};},prefix);assert.deepEqual(result,{text:'XSLT et inventaire',date:'2026-10-20T00:00:00.000Z',blob:'ABC'});return result;
  });
  await check('Setup remains accessible with runtime paused and never starts the PMK modules',async()=>{
   const page=await admin.context.newPage();try{await page.goto(BASE+'/cgi-bin/koha/plugins/run.pl?class=Koha%3A%3APlugin%3A%3APimpMyKoha&method=configure',{waitUntil:'domcontentloaded'});await page.waitForSelector('#pmk-migration');const state=await page.evaluate(()=>({ready:PMKPlugin.ready,modules:typeof PMKConfig,ui:!!document.querySelector('#pmk-migration')}));assert(state.ready);assert.equal(state.modules,'undefined');return state;}finally{await page.close();}
  });
 }finally{
  await p.evaluate(async enabled=>PMKMigration.runtime(enabled),wasEnabled);
  await staff.close();await admin.close();
 }
 if(rows.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
