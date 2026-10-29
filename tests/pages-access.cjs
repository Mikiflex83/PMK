const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('fs');
const root=require('node:path').resolve(__dirname,'..')+'/';
let browser;
const passes=[];
async function fixture(path,body='',configs={},core=false){
 const page=await browser.newPage({locale:'fr-FR',timezoneId:'Europe/Paris'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.errors=errors;
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='pmk.test')return route.abort();
  const relative=url.pathname.split('/public/koha-scripts/')[1];
  if(relative&&fs.existsSync(root+relative))return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(root+relative)});
  if(route.request().isNavigationRequest())return route.fulfill({contentType:'text/html; charset=utf-8',body:'<html lang="fr"><head><meta charset="utf-8"></head><body><span class="loggedinusername is_superlibrarian">Admin</span>'+body+'</body></html>'});
  return route.fulfill({contentType:'application/json',body:'[]'});
 });
 await page.goto('http://pmk.test'+path);
 await page.evaluate(configs=>{
  window.__configs=configs;window.__definitions={};window.__writes=[];window.__subscribers={};
  const listeners={};
  const db={collection:()=>({doc:id=>({
   get:async()=>{if((window.__readFailures||[]).includes(id))throw new Error('Fixture read refused: '+id);return {exists:!!configs[id],data:()=>({config:configs[id]})};},
   set:async(value)=>{configs[id]=JSON.parse(JSON.stringify(value.config));window.__writes.push({id,value});(listeners[id]||[]).forEach(fn=>fn({exists:true,data:()=>value}));},
   onSnapshot:fn=>{(listeners[id]??=[]).push(fn);return()=>{};}
  })})};
  const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>0};
  const app={name:'pmk-preplugin',firestore:()=>db};
  window.PMKConfigNativeStorage={kind:'koha',db,serverTimestamp:()=>0};
  window.PMKConfig={
   registerModule:d=>{window.__definitions[d.id]=d;return true;},
   getConfig:async id=>structuredClone(configs[id]||window.__definitions[id]?.defaults||{}),
   subscribe:(id,fn)=>{(window.__subscribers[id]??=[]).push(fn);return()=>{};},
   saveConfig:async(id,cfg)=>{window.__writes.push({id,config:cfg});configs[id]=structuredClone(cfg);for(const fn of window.__subscribers[id]||[])fn(structuredClone(cfg));},
   isKohaSuperlibrarian:()=>!!document.querySelector('.is_superlibrarian'),
   isGloballyEnabled:()=>true,areContextButtonsEnabled:()=>true,
   getLanguage:()=>document.documentElement.lang.startsWith('en')?'en':'fr',
   mountContextButton:()=>{},openAdmin:()=>{},
   elementPicker:{register:()=>{},pickForConfig:()=>Promise.resolve({value:'#chosen',selector:'#chosen'})},
   services:{register:()=>{},get:()=>null},visualEditor:{register:()=>{}},
  };
 },configs);
 if(core){await page.evaluate(()=>delete window.PMKConfig);let source=fs.readFileSync(root+'000-pmk-config-firestore.js','utf8').replace('window.PMKConfig = {','window.__defs = modules; window.PMKConfig = {');await page.addScriptTag({content:source});}
 return page;
}
async function load(page,file){await page.addScriptTag({content:fs.readFileSync(root+file,'utf8')+'\n//# sourceURL='+file});}
async function check(name,fn){if(process.env.PMK_TEST_FILTER&&!name.includes(process.env.PMK_TEST_FILTER))return;try{await fn();passes.push(name);console.log('PASS '+name);}catch(e){console.error('FAIL '+name);throw e;}}
const nativeMock=`
const createDatabase=namespace=>{(window.__databaseNamespaces??=[]).push(namespace);return {namespace}};
const getSession=async()=>({uid:'fixture',userid:'fixture',isAdmin:true});
export const collection=(db,...path)=>({db,path:path.join('/')}),doc=(db,...path)=>({db,path:path.join('/')});
export const query=(ref,...filters)=>ref,where=(...x)=>x,orderBy=(...x)=>x,limit=x=>x;
export const getDoc=async()=>({exists:()=>false,data:()=>({}),id:'fixture'}),getDocs=async()=>({docs:[],empty:true,size:0,forEach:()=>{},exists:()=>false,data:()=>({})});
export const onSnapshot=(ref,callback)=>{window.__activeSnapshots=(window.__activeSnapshots||0)+1;let active=true;queueMicrotask(()=>{if(active)callback({docs:[],empty:true,size:0,forEach:()=>{},exists:()=>false,data:()=>({})})});return()=>{if(active){active=false;window.__activeSnapshots--;}}};
export const onAuthStateChanged=(auth,callback)=>{queueMicrotask(()=>callback({uid:'fixture'}));return()=>{}},signInAnonymously=async()=>({user:{uid:'fixture'}}),signOut=async()=>{};
export const serverTimestamp=()=>0,Timestamp={now:()=>({toDate:()=>new Date()}),fromDate:d=>d,fromMillis:m=>m};
export const addDoc=async()=>({id:'fixture'}),setDoc=async()=>{},updateDoc=async()=>{},deleteDoc=async()=>{},writeBatch=()=>({set(){},update(){},delete(){},commit:async()=>{}}),runTransaction=async(db,fn)=>fn({get:getDoc,set(){},update(){}});
`;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const report=[];
 try {
 const source=fs.readFileSync(root+'138-pages-manager.js','utf8');
 const manifest=JSON.parse(source.match(/const manifest = (\[[\s\S]*?\n\]);/)[1]);
 for(const item of manifest){
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page='+item.id,'<main><div id="native">Accueil Koha</div></main>');
  const requests=[];p.on('request',r=>requests.push({url:r.url(),method:r.method()}));
  await p.addScriptTag({content:'(function(){'+nativeMock.replaceAll('export const ','const ')+"window.PMKNativeData={createDatabase,getSession,collection,doc,query,where,orderBy,limit,getDoc,getDocs,onSnapshot,serverTimestamp,Timestamp,addDoc,setDoc,updateDoc,deleteDoc,writeBatch,runTransaction};})();"});
  await p.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'application/javascript',body:'window.emailjs={init(){}}'}));
  await p.route('https://cdnjs.cloudflare.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.html2pdf=()=>({})'}));
  if(item.id==='bibliography-builder')await p.evaluate(()=>window.PMKPersonalLists={getLists:async()=>[],getStorageContext:async()=>null});
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages-manager.js'});
  await p.waitForFunction(id=>['mounted','error','denied'].includes(window.PMKPages?.getStatus(id).state),item.id,{timeout:7000});
  await p.waitForTimeout(80);
  const state=await p.evaluate(()=>({title:document.title,hosts:document.querySelectorAll('#pmk138-page-host').length,
    text:document.querySelector('#pmk138-page-host')?.innerText.slice(0,1800),errors:[...document.querySelectorAll('#pmk138-page-host .alert-danger')].map(x=>x.textContent),
    denied:!!document.querySelector('.pmk138-denied'),pageStatus:window.PMKPages.getStatus(new URLSearchParams(location.search).get('pmk_page')),listeners:window.__activeSnapshots || 0,shadowText:document.querySelector('#doodle-koha-app')?.shadowRoot?.innerHTML.slice(-300),overlayOpen:!!document.querySelector('.pmk135-overlay'),internalDenial:!!document.querySelector('#uds-denied:not([hidden])')}));
  report.push({id:item.id,...state,pageErrors:p.errors,externalRequests:requests.filter(r=>!r.url.startsWith('http://pmk.test')).map(r=>r.url),kohaRequests:requests.filter(r=>r.url.includes('/api/v1/') || r.url.includes('/cgi-bin/koha/reports/'))});
  assert.equal(state.pageStatus.state,'mounted',item.id);assert.equal(state.hosts,1,item.id);if(item.id==='appointments')assert(state.shadowText?.length,item.id+' shadow interface');if(item.id==='xslt-assistant')assert(state.overlayOpen);assert(!requests.some(r=>r.method!=='GET' && r.url.includes('http://pmk.test/api/v1/')),item.id+' no Koha writes');assert.deepEqual(p.errors,[],item.id);
  console.log(item.id+': '+JSON.stringify({title:state.title,hosts:state.hosts,errors:p.errors,loaderErrors:state.errors,text:state.text?.slice(0,120)}));
  {
   if(item.id==='authorities')await p.evaluate(()=>{const original=__DracAuthorityView.dispose;__DracAuthorityView.dispose=()=>{window.__authorityDisposed=true;original()}});
   await p.evaluate(()=>{history.replaceState(null,'','?pmk_page=hub');return PMKPages.refresh()});if(item.id==='authorities')assert.equal(await p.evaluate(()=>__authorityDisposed),true,'authority disposal');assert.equal(await p.evaluate(()=>window.__activeSnapshots || 0),0,item.id+' cleanup');assert.equal(await p.evaluate(id=>PMKPages.getStatus(id).state,item.id),'closed');
   await p.evaluate(id=>{history.replaceState(null,'','?pmk_page='+id);return PMKPages.refresh()},item.id);assert.equal(await p.evaluate(id=>PMKPages.getStatus(id).state,item.id),'mounted');await p.waitForTimeout(100);assert.deepEqual(p.errors,[],item.id+' reopening');if(['reservations','loans','transfers','items','biblios','serials','patrons'].includes(item.id))assert(await p.locator('.pmk138-app-container button').count()>5,item.id+' interface rebuilt');
  }
  await p.close();
 }
 const staff=await fixture('/cgi-bin/koha/mainpage.pl','<main>Accueil</main>');await staff.evaluate(()=>document.querySelector('.loggedinusername').classList.remove('is_superlibrarian'));await staff.evaluate(()=>window.PMKPersonalLists={getLists:async()=>[],getStorageContext:async()=>null});await staff.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages-manager.js'});
 for(const item of manifest){const expected=['bulk-framework-change','bibliography-builder','overdue-management'].includes(item.id);assert.equal(await staff.evaluate(id=>PMKPages.canOpen(id),item.id),expected,item.id+' staff access');if(expected){await staff.evaluate(id=>{history.replaceState(null,'','?pmk_page='+id);return PMKPages.refresh()},item.id);assert.equal(await staff.evaluate(id=>PMKPages.getStatus(id).state,item.id),'mounted');assert.equal(await staff.locator('#pmk138-page-host a[href*="pmk_page=hub"]').count(),0,item.id+' no inaccessible hub link');}else{await staff.evaluate(id=>{history.replaceState(null,'','?pmk_page='+id);return PMKPages.refresh()},item.id);assert.equal(await staff.locator('.pmk138-denied').count(),1,item.id+' denied');assert.equal(await staff.locator('.pmk138-app-container').count(),0);}}
 assert.equal(await staff.evaluate(()=>PMKPages.canOpen('unknown')),false);assert.equal(await staff.evaluate(()=>PMKPages.canOpen('hub')),false);await staff.close();
 fs.writeFileSync(root+'tests/validation/pages-access.json',JSON.stringify(report,null,2));
 console.log('19 page openings, reopenings and access policies passed; no business actions were triggered.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
