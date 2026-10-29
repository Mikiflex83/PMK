// Genuine Koha/MariaDB native data recipe. Every external request is blocked.
const {launch,ROOT,BASE}=require('./lib/koha.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const h=await launch(),p=h.page,rows=[],prefix='recipe_'+Date.now();
 async function check(name,fn){const e=h.pageErrors.length;try{const evidence=await fn();assert.deepEqual(h.pageErrors.slice(e),[]);rows.push({name,passed:true,evidence});console.log('PASS '+name);}catch(error){rows.push({name,passed:false,error:error.stack,pageErrors:h.pageErrors.slice(e)});console.log('FAIL '+name+' '+error.message.slice(0,300));}fs.writeFileSync(ROOT+'/tests/validation/koha-native-data.json',JSON.stringify({kind:'Real Koha 25.11 / MariaDB; all Firebase traffic forbidden',pluginVersion:'0.4.0',rows},null,2)+'\n');}
 try {
 await check('Native documents: all nine module namespaces persist Unicode, timestamps and unknown fields',async()=>{
  return p.evaluate(async prefix=>{const s=PMKNativeData,results=[];for(const ns of s.namespaces){const db=s.createDatabase(ns),r=s.doc(db,prefix,'unicode');await s.setDoc(r,{name:'Équipe € 漢字',unknown:{personal:[1,2]},created:s.serverTimestamp(),date:s.Timestamp.fromDate(new Date('2026-10-18T09:12:00Z'))});const snap=await s.getDoc(r),v=snap.data();if(v.name!=='Équipe € 漢字'||v.created.toMillis()<=0||v.date.toDate().toISOString()!=='2026-10-18T09:12:00.000Z')throw new Error(ns);results.push({ns,revision:snap.revision});}return results;},prefix);
 });
 await check('Native updates and merges retain unrelated fields; missing updates fail',async()=>{
  return p.evaluate(async prefix=>{const s=PMKNativeData,db=s.createDatabase('journal'),r=s.doc(db,prefix,'merge');await s.setDoc(r,{a:{x:1,y:2},custom:42});await s.setDoc(r,{a:{x:3}},{merge:true});await s.updateDoc(r,{'a.y':4,note:'kept'});const v=(await s.getDoc(r)).data();if(v.a.x!==3||v.a.y!==4||v.custom!==42||v.note!=='kept')throw new Error(JSON.stringify(v));let status;try{await s.updateDoc(s.doc(db,prefix,'missing'),{x:1});}catch(e){status=e.status;}if(status!==404)throw new Error('Missing update was accepted');return v;},prefix);
 });
 await check('Atomic batches roll back every write on a missing document',async()=>{
  return p.evaluate(async prefix=>{const s=PMKNativeData,db=s.createDatabase('journal'),r=s.doc(db,prefix,'rollback');const batch=s.writeBatch(db);batch.set(r,{shouldNotExist:true});batch.update(s.doc(db,prefix,'missing'),{x:1});let failed=false;try{await batch.commit();}catch(e){failed=e.status===404;}if(!failed||(await s.getDoc(r)).exists())throw new Error('Partial commit');return {rolledBack:true};},prefix);
 });
 await check('Concurrent increments are retried without losing any count',async()=>{
  return p.evaluate(async prefix=>{const s=PMKNativeData,db=s.createDatabase('attendance'),r=s.doc(db,prefix,'concurrency');await s.setDoc(r,{count:0,custom:42});await Promise.all(Array.from({length:4},()=>s.runTransaction(db,async tx=>{const snap=await tx.get(r);tx.update(r,{count:snap.data().count+1});})));const v=(await s.getDoc(r)).data();if(v.count!==4||v.custom!==42)throw new Error(JSON.stringify(v));return v;},prefix);
 });
 await check('Two reservations compete for one place with a single successful atomic booking',async()=>{
  return p.evaluate(async prefix=>{const s=PMKNativeData,db=s.createDatabase('appointments'),slot=s.doc(db,prefix,'slot');await s.setDoc(slot,{remaining:1});const results=await Promise.allSettled(['one','two'].map(id=>s.runTransaction(db,async tx=>{const snap=await tx.get(slot);if(!snap.data().remaining)throw new Error('full');tx.update(slot,{remaining:0});tx.set(s.doc(db,prefix,'booking-'+id),{slot:'slot'});})));if(results.filter(r=>r.status==='fulfilled').length!==1)throw new Error('Double booking');return {accepted:1,refused:1};},prefix);
 });
 await check('Native queries: collection boundaries, date comparisons, arrays, sort and limit',async()=>{
  return p.evaluate(async prefix=>{const s=PMKNativeData,db=s.createDatabase('journal');for(let n=0;n<5;n++)await s.setDoc(s.doc(db,prefix,'q'+n),{n,date:s.Timestamp.fromMillis(1000*n),tags:['team']});await s.setDoc(s.doc(db,prefix,'q0','nested','hidden'),{n:99});const snap=await s.getDocs(s.query(s.collection(db,prefix),s.where('date','>=',s.Timestamp.fromMillis(2000)),s.where('tags','array-contains','team'),s.orderBy('n','desc'),s.limit(2)));const values=snap.docs.map(d=>d.data().n);if(JSON.stringify(values)!=='[4,3]')throw new Error(JSON.stringify(values));return values;},prefix);
 });
 await check('Collections larger than one API page are fully read without truncation',async()=>{
  return p.evaluate(async prefix=>{const s=PMKNativeData,db=s.createDatabase('journal'),parent=prefix+'_pages';for(let start=0;start<1005;start+=200){const b=s.writeBatch(db);for(let n=start;n<Math.min(start+200,1005);n++)b.set(s.doc(db,parent,String(n).padStart(4,'0')),{n});await b.commit();}const snap=await s.getDocs(s.collection(db,parent));if(snap.size!==1005)throw new Error('Truncated collection '+snap.size);return {documents:snap.size};},prefix);
 });
 await check('Native subscriptions see writes and stop after disposal',async()=>{
  return p.evaluate(async prefix=>{const s=PMKNativeData,db=s.createDatabase('journal'),r=s.doc(db,prefix,'subscription');let count=0,seen;const stop=s.onSnapshot(r,snap=>{count++;seen=snap.data()?.n;});try{await s.setDoc(r,{n:1});for(let i=0;i<100&&seen!==1;i++)await new Promise(r=>setTimeout(r,20));if(seen!==1)throw new Error('Listener did not refresh');stop();const before=count;await s.setDoc(r,{n:2});await new Promise(r=>setTimeout(r,80));if(count!==before)throw new Error('Listener not disposed');return {disposed:true};}finally{stop();}},prefix);
 });
 await check('Import preview is read-only; existing fields and concurrent creations are preserved',async()=>{
  return p.evaluate(async prefix=>{const s=PMKNativeData,db=s.createDatabase('taxonomy'),existing=prefix+'/existing',fresh=prefix+'/imported';await s.setDoc(s.doc(db,existing),{custom:{mine:42}});const input={documents:[{path:existing,data:{replace:true}},{path:fresh,data:{oldId:'kept',unknown:{arr:['Équipe']}}}]};const preview=await s.previewImport('taxonomy',input);if((await s.getDoc(s.doc(db,fresh))).exists())throw new Error('Preview wrote data');const result=await s.applyImport(preview);if((await s.getDoc(s.doc(db,existing))).data().custom.mine!==42)throw new Error('Existing overwritten');const racePath=prefix+'/race',race=await s.previewImport('taxonomy',{documents:[{path:racePath,data:{old:true}}]});await s.setDoc(s.doc(db,racePath),{otherAgent:42});let rejected=false;try{await s.applyImport(race);}catch(e){rejected=e.status===409;}if(!rejected||(await s.getDoc(s.doc(db,racePath))).data().otherAgent!==42)throw new Error('Import race overwrite');return result;},prefix);
 });
 await check('Old JSON formats retain subcollections, IDs and timestamp values',async()=>{
  return p.evaluate(()=>{const s=PMKNativeData;const v=s.parseImport({documents:[{name:'projects/old/databases/(default)/documents/profiles/p/lists/l',fields:{title:{stringValue:'Équipe'},date:{timestampValue:'2026-10-18T09:12:00Z'},unknown:{mapValue:{fields:{n:{integerValue:'42'}}}}}}]},'lists');if(v.documents[0].path!=='profiles/p/lists/l'||v.documents[0].data.unknown.n!==42)throw new Error('REST export');const nested=s.parseImport({__collections__:{profiles:{p:{displayName:'Équipe',__collections__:{lists:{l:{name:'My list'}}}}}}},'lists');if(nested.documents.length!==2||nested.documents[1].path!=='profiles/p/lists/l')throw new Error('Nested export');const rtdb=s.parseImport({shares:{old:{text:'kept'}},stats:{usage_count:7}},'internal-share');if(rtdb.documents[1].data.count!==7)throw new Error('RTDB export');return {rest:true,nested:true,rtdb:true};});
 });
 await check('PMK data manager previews an uploaded file and imports after explicit click',async()=>{
  await p.evaluate(()=>PMKNativeData.openManager());
  await p.locator('#pmk-native-namespace').selectOption('journal');
  await p.locator('#pmk-native-file').setInputFiles({name:'recipe.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({namespace:'journal',documents:[{path:prefix+'/ui-import',data:{title:'PMKTEST import natif'}}]}))});
  await p.locator('#pmk-native-preview').click();await p.locator('#pmk-native-status').filter({hasText:'1 documents à créer'}).waitFor();
  assert.equal(await p.evaluate(async prefix=>(await PMKNativeData.getDoc(PMKNativeData.doc(PMKNativeData.createDatabase('journal'),prefix,'ui-import'))).exists(),prefix),false);
  await p.locator('#pmk-native-import').click();await p.locator('#pmk-native-status').filter({hasText:'1 documents importés'}).waitFor();await p.locator('#pmk-native-close').click();return {previewReadOnly:true,explicitImport:true};
 });
 await check('Configuration import keeps custom fields and rows while applying the imported choices',async()=>{
  const key=prefix+'-configuration';await h.saveDoc(key,{config:{enabled:true,mine:{keep:42},rules:[{id:'own',custom:'retained'},{id:'common',mine:42}]},unknownMetadata:'kept'});
  const result=await p.evaluate(async key=>{const s=PMKNativeData,preview=await s.previewConfiguration({moduleId:key,config:{enabled:false,rules:[{id:'common',choice:'imported'},{id:'incoming',new:true}]}});await s.importConfiguration(preview);return (await PMKConfigNativeStorage.db.collection('pimpmykoha_preplugin_modules').doc(key).get({fresh:true})).data();},key);
  assert.equal(result.config.enabled,false);assert.equal(result.config.mine.keep,42);assert.equal(result.unknownMetadata,'kept');assert.equal(result.config.rules.length,3);assert.equal(result.config.rules.find(r=>r.id==='common').mine,42);assert.equal(result.config.rules.find(r=>r.id==='common').choice,'imported');assert(result.pmkLastImport.previousRevision>0);return {customFields:true,mergedRows:3,previousRevision:result.pmkLastImport.previousRevision};
 });
 await check('Native API refuses missing request header, malformed paths and anonymous access',async()=>{
  let r=await h.context.request.post(BASE+'/api/v1/contrib/pmk/data/journal',{data:{action:'get',path:prefix+'/unicode'}});assert.equal(r.status(),403);
  r=await h.context.request.post(BASE+'/api/v1/contrib/pmk/data/journal',{headers:{'X-PMK-Request':'1'},data:{action:'get',path:'../invalid'}});assert.equal(r.status(),400);
  const anonymous=await h.browser.newContext();try{r=await anonymous.request.post(BASE+'/api/v1/contrib/pmk/data/journal',{headers:{'X-PMK-Request':'1'},data:{action:'get',path:prefix+'/unicode'}});assert.equal(r.status(),401);}finally{await anonymous.close();}return {header:403,path:400,anonymous:401};
 });
 await check('Staff identity comes from Koha; staff cannot export or modify managed referentials',async()=>{
  const staff=await launch({user:'pmk-test-staff',password:'pmk-test-only'});try{
   const session=await staff.page.evaluate(()=>PMKNativeData.getSession());assert.equal(session.userid,'pmk-test-staff');assert.equal(session.isAdmin,false);
   for(const [ns,input] of [['journal',{action:'export'}],['planning',{action:'commit',writes:[{op:'set',path:'planning/config',data:{overwrite:true}}]}],['taxonomy',{action:'commit',writes:[{op:'set',path:'treeData/test',data:{overwrite:true}}]}],['attendance',{action:'commit',writes:[{op:'set',path:'locations/test',data:{name:'blocked'}}]}],['appointments',{action:'commit',writes:[{op:'set',path:'slots/test',data:{active:true}}]}]]){
    const r=await staff.context.request.post(BASE+'/api/v1/contrib/pmk/data/'+ns,{headers:{'X-PMK-Request':'1'},data:input});assert.equal(r.status(),403,ns+' '+await r.text());
   }
   return {userid:session.userid,forbidden:5};
  }finally{await staff.close();}
 });
 await check('Authorities open with their audit settings and without the former learning service',async()=>{
  await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=authorities');await p.locator('#dam-app .dam-hero').waitFor();assert.equal(await p.locator('#dam-memory-state').count(),0);assert.equal(await p.evaluate(()=>typeof window.DracQualityMemory),'undefined');return {mounted:true,learningRemoved:true};
 });
 assert.deepEqual(h.blocked.filter(x=>/firebase|firestore|gstatic|identitytoolkit|securetoken/i.test(x)),[]);
 }finally{await h.close();}if(rows.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
