// Integration against the LOCAL Koha/MariaDB instance. No business writes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const base=process.env.PMK_KOHA_TEST_URL||'http://127.0.0.1:18081';
assert(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Local test instance required');
const passes=[],externals=[],errors=[];
let browser;
async function check(name,fn){await fn();passes.push(name);console.log('PASS '+name);}
async function session(username,password){
 const context=await browser.newContext({locale:'fr-FR'});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.origin!==new URL(base).origin){externals.push(u.href);return route.abort();}
  return route.continue();
 });
 const page=await context.newPage();
 page.on('response',response=>{if(response.url().includes('/contrib/pmk/')&&response.status()>=400)console.log('PMK HTTP '+response.status()+' '+new URL(response.url()).pathname);});
 page.on('pageerror',e=>errors.push({username,message:e.message}));
 await page.goto(base+'/cgi-bin/koha/mainpage.pl');
 await page.locator('#userid').fill(username);await page.locator('#password').fill(password);
 await Promise.all([page.waitForNavigation({waitUntil:"domcontentloaded"}),page.locator('#submit-button').click()]);
 assert.equal(await page.locator('#userid').count(),0,'Koha login succeeded');
 try { await page.waitForFunction(()=>window.PMKPlugin?.ready || window.PMKPlugin?.errors.length,null,{timeout:60000}); }
 catch(error){console.log(await page.evaluate(()=>({url:location.pathname,title:document.title,plugin:window.PMKPlugin,pmkScripts:[...document.scripts].map(x=>x.src).filter(x=>x.includes('pmk'))})));throw error;}
 const state=await page.evaluate(()=>({ready:PMKPlugin.ready,errors:PMKPlugin.errors,loaded:PMKPlugin.loaded.length}));
 assert.equal(state.ready,true,JSON.stringify(state));assert.deepEqual(state.errors,[]);
 return {context,page};
}
async function get(context,key){const r=await context.request.get(base+'/api/v1/contrib/pmk/documents/'+key);return {status:r.status(),body:await r.json()};}
async function put(context,key,data,revision,header=true){
 const r=await context.request.put(base+'/api/v1/contrib/pmk/documents/'+key,{headers:header?{'X-PMK-Request':'1'}:{},data:{data,revision}});
 return {status:r.status(),body:await r.json()};
}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const admin=await session('koha','koha');
 await check('Real Koha: plugin loads all declared scripts from bundled resources',async()=>{
  assert.equal(await admin.page.evaluate(()=>PMKConfigNativeStorage.kind),'koha');
  const metadata=await admin.context.request.get(base+'/api/v1/contrib/pmk/static/manifest.json');assert.equal(metadata.status(),200);
  const manifest=await metadata.json();const original=fs.readFileSync(root+'/138-pages/138-page-authorities.js');
  assert.equal(await admin.page.evaluate(()=>PMKPlugin.loaded.length),manifest.scripts.length);
  const actual=await admin.context.request.get(base+'/api/v1/contrib/pmk/static/assets/138-pages/138-page-authorities.js');
  assert.deepEqual(await actual.body(),original);assert(manifest.scripts.length>0);
 });
 const key='pmk-native-integration';
 await check('Real Koha: native save retains custom values after reload',async()=>{
  await admin.page.evaluate(async()=>{PMKConfig.registerModule({id:'pmk-native-integration',name:'Synthetic integration',defaults:{enabled:true,value:1},schema:[]});const cfg=await PMKConfig.getConfig('pmk-native-integration');cfg.value=42;cfg.personal={note:'Conservé : é, à, €'};await PMKConfig.saveConfig('pmk-native-integration',cfg);});
  const result=await get(admin.context,key);assert.equal(result.status,200);assert.equal(result.body.data.config.value,42);assert.equal(result.body.data.config.personal.note,'Conservé : é, à, €');
  await admin.page.reload();await admin.page.waitForFunction(()=>PMKPlugin?.ready,null,{timeout:60000});
  const result2=await get(admin.context,key);assert.deepEqual(result2.body.data.config,result.body.data.config);
 });
 await check('Real Koha: stale revision and missing request header cannot overwrite configuration',async()=>{
  const old=await get(admin.context,key);const data={...old.body.data,otherAgent:'retained'};
  const a=await put(admin.context,key,data,old.body.revision);assert.equal(a.status,200,JSON.stringify(a));
  const b=await put(admin.context,key,{config:{value:0}},old.body.revision);assert.equal(b.status,409,JSON.stringify(b));
  const c=await put(admin.context,key,{config:{value:0}},a.body.revision,false);assert.equal(c.status,403);
  assert.equal((await get(admin.context,key)).body.data.otherAgent,'retained');
  const pinned=await admin.page.evaluate(async key=>{const ref=PMKConfigNativeStorage.db.collection('pimpmykoha_preplugin_modules').doc(key);return (await ref.get({fresh:true})).revision;},key);
  const latest=await get(admin.context,key);const interleaved=await put(admin.context,key,{...latest.body.data,preservedInterleaved:'keep'},latest.body.revision);assert.equal(interleaved.status,200);
  const rejected=await admin.page.evaluate(async({key,revision})=>{const ref=PMKConfigNativeStorage.db.collection('pimpmykoha_preplugin_modules').doc(key);await ref.get({fresh:true});try{await ref.set({config:{value:0}},{merge:true,expectedRevision:revision});return 'wrong';}catch(error){return error.code;}},{key,revision:pinned});
  assert.equal(rejected,'configuration_changed');const preserved=await get(admin.context,key);assert.equal(preserved.body.data.config.value,42);assert.equal(preserved.body.data.preservedInterleaved,'keep');
 });
 const staff=await session('pmk-test-staff','pmk-test-only');
 await check('Real Koha: staff reads configuration but cannot alter shared settings',async()=>{
  const before=await get(staff.context,key);assert.equal(before.status,200);
  const denied=await put(staff.context,key,{config:{value:0}},before.body.revision);assert.equal(denied.status,403,JSON.stringify(denied));
  assert.deepEqual((await get(admin.context,key)).body.data,before.body.data);
 });
 const second=await session('pmk-test-staff-2','pmk-test-only');
 await check('Real Koha: favorites belong to the authenticated session',async()=>{
  const selected='147-favorites-another-user';const mine=await get(staff.context,selected);
  const saved=await put(staff.context,selected,{favorites:['only-first-user']},mine.body.revision);assert.equal(saved.status,200,JSON.stringify(saved));
  assert.deepEqual((await get(staff.context,selected)).body.data.favorites,['only-first-user']);
  assert.notDeepEqual((await get(second.context,selected)).body.data?.favorites,['only-first-user']);
  const snapshot=await staff.context.request.get(base+'/api/v1/contrib/pmk/configuration');assert.equal(snapshot.status(),200);const shared=(await snapshot.json()).documents;assert(!Object.keys(shared).some(k=>k.startsWith('147-favorites-')),'Bulk reads exclude all personal favorites');
 });
 await check('Real Koha: internal hub and settings open through the native plugin',async()=>{
  await admin.page.goto(base+'/cgi-bin/koha/mainpage.pl?pmk_page=hub');await admin.page.waitForSelector('.pmk138-card',{timeout:60000});
  assert.equal(await admin.page.locator('.pmk138-card').count(),19);
  await admin.page.evaluate(()=>PMKConfig.openAdmin('internal-pages-tools'));
  await admin.page.waitForSelector('[data-pmk-page-editor]');
  if(await admin.page.locator('#freqAppMini').count())assert.equal(await admin.page.locator('#freqAppMini').evaluate(el=>getComputedStyle(el).visibility),'hidden');
  await admin.page.screenshot({path:root+'/tests/validation/koha-plugin-settings.png',fullPage:false});
 });
 const anonymous=await browser.newContext();const unauth=await anonymous.request.get(base+'/api/v1/contrib/pmk/documents/'+key);
 assert([401,403].includes(unauth.status()),'Anonymous request refused');await anonymous.close();
 const report={passed:passes,kohaURL:base,kind:'real Koha 25.11 + MariaDB',externalRequestsBlocked:externals.length,pageErrors:errors};
 fs.writeFileSync(root+'/tests/validation/koha-plugin.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
