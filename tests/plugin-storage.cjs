// Native adapter contracts; Koha/MariaDB integration is a separate suite.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const docs=new Map([['native-test',{data:{config:{enabled:true,personal:{keep:42}},customMetadata:'keep'},revision:1}]]);
 const external=[],writes=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname!=='pmk.test'){external.push(url.href);return route.abort();}
  if(request.isNavigationRequest())return route.fulfill({contentType:'text/html',body:'<html lang="fr"><body><main>Koha</main><span class="loggedinusername is_superlibrarian">Admin</span></body></html>'});
  if(url.pathname==='/api/v1/contrib/pmk/configuration')return route.fulfill({contentType:'application/json',body:JSON.stringify({documents:Object.fromEntries([...docs].map(([key,value])=>[key,{exists:true,...value}]))})});
  const key=decodeURIComponent(url.pathname.split('/documents/')[1]||'');
  if(!key)return route.fulfill({status:404,body:'{}'});
  const before=docs.get(key)||{data:null,revision:0};
  if(request.method()==='GET')return route.fulfill({contentType:'application/json',body:JSON.stringify({exists:!!before.data,...before})});
  const input=request.postDataJSON();
  if(input.revision!==before.revision)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'configuration_changed'})});
  assert.equal(request.headers()['x-pmk-request'],'1');
  docs.set(key,{data:input.data,revision:before.revision+1});writes.push(key);
  return route.fulfill({contentType:'application/json',body:JSON.stringify({revision:before.revision+1})});
 });
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/mainpage.pl');
  await page.addScriptTag({path:root+'/plugin/Koha/Plugin/PimpMyKoha/storage.js'});
  await page.addScriptTag({path:root+'/000-pmk-config-firestore.js'});
  await page.evaluate(()=>PMKConfig.registerModule({id:'native-test',name:'Native storage test',schemaVersion:1,defaults:{enabled:true,option:7},schema:[]}));
  assert.equal(await page.evaluate(async()=>(await PMKConfig.getConfig('native-test')).personal.keep),42);
  await page.evaluate(async()=>{const cfg=await PMKConfig.getConfig('native-test');cfg.option=9;await PMKConfig.saveConfig('native-test',cfg);});
  assert.equal(docs.get('native-test').data.config.option,9);
  assert.equal(docs.get('native-test').data.config.personal.keep,42);
  assert.equal(docs.get('native-test').data.customMetadata,'keep');
  console.log('PASS native core: reads, saves, verifies persistence and retains unknown fields without Firebase');
  await page.evaluate(async()=>{
   const api=PMKConfigNativeStorage,ref=api.db.collection('pimpmykoha_preplugin_modules').doc('table-labels');
   await api.db.runTransaction(async tx=>{const snap=await tx.get(ref);tx.set(ref,{pmkWorkflowStatuses:{'native-test':'control'}},{merge:true});});
  });
  assert.equal(docs.get('table-labels').data.pmkWorkflowStatuses['native-test'],'control');
  console.log('PASS native transaction: workflow status uses the same Koha document');
  await page.evaluate(()=>PMKConfigNativeStorage.db.collection('pimpmykoha_preplugin_modules').doc('native-test').get());
  const concurrent=docs.get('native-test');docs.set('native-test',{data:{...concurrent.data,otherAgent:'keep'},revision:concurrent.revision+1});
  const failed=await page.evaluate(async()=>{try{await PMKConfigNativeStorage.db.collection('pimpmykoha_preplugin_modules').doc('native-test').set({config:{option:0}},{merge:true});return 'wrong';}catch(e){return e.code;}});
  assert.equal(failed,'configuration_changed');assert.equal(docs.get('native-test').data.otherAgent,'keep');assert.equal(docs.get('native-test').data.config.option,9);
  console.log('PASS native concurrency: stale writes fail and preserve the other agent’s version');
  await page.evaluate(()=>PMKConfigNativeStorage.preload());
  const initial=structuredClone(docs.get('native-test'));
  docs.set('native-test',{data:{...initial.data,afterSnapshot:'retained'},revision:initial.revision+1});
  const reads=await page.evaluate(async()=>{const ref=PMKConfigNativeStorage.db.collection('pimpmykoha_preplugin_modules').doc('native-test');return [(await ref.get()).data(),(await ref.get()).data()];});
  assert.equal(reads[0].afterSnapshot,undefined);
  assert.equal(reads[1].afterSnapshot,'retained');
  assert.equal(reads[1].otherAgent,'keep');
  console.log('PASS native preload: initial snapshot used once; following reads see concurrent changes');
  const pinned=await page.evaluate(async()=>{const snap=await PMKConfigNativeStorage.db.collection('pimpmykoha_preplugin_modules').doc('native-test').get({fresh:true});return snap.revision;});
  const concurrentAgain=docs.get('native-test');docs.set('native-test',{data:{...concurrentAgain.data,afterPinnedRead:'keep'},revision:concurrentAgain.revision+1});
  const interleaved=await page.evaluate(async revision=>{const ref=PMKConfigNativeStorage.db.collection('pimpmykoha_preplugin_modules').doc('native-test');await ref.get({fresh:true});try{await ref.set({config:{option:0}},{merge:true,expectedRevision:revision});return 'wrong';}catch(error){return error.code;}},pinned);
  assert.equal(interleaved,'configuration_changed');assert.equal(docs.get('native-test').data.afterPinnedRead,'keep');assert.equal(docs.get('native-test').data.config.option,9);
  console.log('PASS native pinned revision: an interleaved read cannot authorize a stale overwrite');
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(root+'/tests/validation/plugin-storage.json',JSON.stringify({passed:5,externalRequests:0,kind:'simulated Koha API'},null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
