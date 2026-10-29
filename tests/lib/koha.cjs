const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
const SERVICES=process.env.PMK_LOCAL_SERVICES||path.resolve(ROOT,'../work/local-services');
const BASE=process.env.PMK_KOHA_TEST_URL||'http://127.0.0.1:18081';
assert.equal(new URL(BASE).hostname,'127.0.0.1','Dedicated local test instance required');
function merge(base,patch){if(!patch||typeof patch!=='object'||Array.isArray(patch))return structuredClone(patch);const out=structuredClone(base||{});for(const [key,value]of Object.entries(patch))out[key]=value&&typeof value==='object'&&!Array.isArray(value)?merge(out[key],value):structuredClone(value);return out;}
async function launch(options={}){
 const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({locale:'fr-FR',timezoneId:'Etc/UTC',acceptDownloads:true});
 const blocked=[],httpErrors=[],pageErrors=[],requests=[],pending=new Set();
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  const vendor = options.offlineVendors && (
   url.href==='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js' ? 'html2pdf.bundle.min.js' :
   url.href==='https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js' ? 'email.min.js' :
   /qrcodejs.*qrcode(?:\.min)?\.js$/.test(url.href) ? 'qrcode.min.js' : null);
  if(vendor)return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(SERVICES,'public',vendor),'utf8')});
  if(url.origin===BASE)return route.continue();
  blocked.push(url.href);return route.abort();
 });
 await context.routeWebSocket('**',socket=>{const url=new URL(socket.url());blocked.push(url.origin+url.pathname);socket.close({code:1008,reason:'External sockets forbidden'});});
 const page=await context.newPage();
 page.setDefaultTimeout(20000);
 page.on('pageerror',error=>pageErrors.push({route:new URL(page.url()).pathname,message:error.message,stack:error.stack}));
 page.on('request',request=>{if(new URL(request.url()).origin===BASE){let native={};if(new URL(request.url()).pathname.includes('/contrib/pmk/data/')){try{const input=request.postDataJSON();native={dataAction:input?.action,writeCount:input?.writes?.length||0};}catch(_){}}requests.push({path:new URL(request.url()).pathname,method:request.method(),...native});if(['fetch','xhr'].includes(request.resourceType())&&!request.url().includes('/static/'))pending.add(request);}});
 page.on('requestfinished',request=>pending.delete(request));page.on('requestfailed',request=>pending.delete(request));
 page.on('response',response=>{if(response.url().startsWith(BASE)&&response.status()>=400)httpErrors.push({url:response.url(),status:response.status()});});
 await page.goto(BASE+'/cgi-bin/koha/mainpage.pl?pmk_page=hub',{waitUntil:'domcontentloaded',timeout:90000});
 await page.locator('#userid').fill(options.user||'koha');await page.locator('#password').fill(options.password||'koha');
 if(await page.locator('#set-library-branch option[value="PMK_A"]').count())await page.locator('#set-library-branch').selectOption('PMK_A');
 await Promise.all([page.waitForNavigation({waitUntil:"domcontentloaded",timeout:90000}),page.locator('#submit-button').click()]);
 async function ready(){await page.waitForFunction(()=>window.PMKPlugin?.ready || window.PMKPlugin?.errors.length,null,{timeout:90000});assert.deepEqual(await page.evaluate(()=>PMKPlugin.errors),[]);assert.equal(await page.evaluate(()=>PMKPlugin.ready),true);}
 await ready();
 async function settle(){const until=Date.now()+30000;while(pending.size&&Date.now()<until)await page.waitForTimeout(100);if(pending.size)console.log('PENDING_READS',[...pending].map(r=>new URL(r.url()).pathname));return pending.size;}
 async function goto(route){pending.clear();const response=await page.goto(new URL(route,BASE).href,{waitUntil:'domcontentloaded',timeout:90000});assert(response.status()<400,'Koha page '+route+' '+response.status());await ready();await settle();return response;}
 async function doc(id){const response=await context.request.get(BASE+'/api/v1/contrib/pmk/documents/'+encodeURIComponent(id));assert.equal(response.status(),200,'Read document '+id);return response.json();}
 async function saveDoc(id,data){const before=await doc(id);const response=await context.request.put(BASE+'/api/v1/contrib/pmk/documents/'+encodeURIComponent(id),{headers:{'X-PMK-Request':'1'},data:{data,revision:before.revision}});assert.equal(response.status(),200,'Write document '+id+' '+await response.text());return response.json();}
 const originals=new Map();
 async function configure(id,patch){if(!originals.has(id))originals.set(id,await doc(id));const before=await doc(id);return saveDoc(id,merge(before.data||{config:{}},{config:merge(before.data?.config||{},patch)}));}
 async function close(){assert.deepEqual(blocked.filter(x=>/firebase|firestore|gstatic|identitytoolkit|securetoken/i.test(x)),[],'No Firebase request allowed');for(const [id,original]of [...originals].reverse())await saveDoc(id,original.data||{config:{}});await browser.close();}
 return {browser,context,page,ready,settle,goto,doc,saveDoc,configure,close,blocked,httpErrors,pageErrors,requests,fixtures:JSON.parse(fs.readFileSync(process.env.PMK_FIXTURES||'/workspace/work/koha-recipe/fixtures.json','utf8'))};
}
module.exports={launch,BASE,ROOT,merge};
