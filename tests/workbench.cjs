const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),rows=[];
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<html lang="fr"><body><span class="loggedinusername is_superlibrarian">Admin</span><button id="opener">Ouvrir</button><div id="fixture">Texte</div></body></html>'}):r.fulfill({json:[]}));
 await page.goto('http://pmk.test/cgi-bin/koha/mainpage.pl');
 await page.evaluate(()=>{window.__writes=[];window.__config={'workbench-test':{config:{enabled:true,nested:{a:9,b:2,custom:'préservé'},rows:[{id:'mine',value:'personnel'}],secretToken:'SECRET-NOT-DISPLAYED'}}};window.PMKConfigNativeStorage={kind:'koha',serverTimestamp:()=>0,db:{collection:()=>({doc:id=>({get:async()=>({exists:!!__config[id],data:()=>__config[id]}),set:async value=>{__config[id]=value;__writes.push({id,value});},onSnapshot:()=>()=>{}})})}};});
 for(const file of ['000-pmk-config-firestore.js','000-pmk-workbench.js'])await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,file),'utf8')});
 async function check(name,fn){try{await fn();rows.push({name,passed:true});console.log('PASS '+name);}catch(e){rows.push({name,passed:false,error:e.stack});throw e;}finally{fs.writeFileSync(path.join(ROOT,'tests/validation/workbench.json'),JSON.stringify({kind:'Browser fixtures, common configuration review and workflow contracts',rows},null,2)+'\n');}}
 await check('Diagnostics stay read-only and distinguish other pages, disabled rules, overlaps and invalid selectors',async()=>{
  const r=await page.evaluate(()=>PMKWorkbench.diagnose({rules:[{selector:'#fixture'},{selector:'#fixture'},{selector:'['},{pagePath:'/cgi-bin/koha/catalogue/detail.pl',selector:'#absent'},{enabled:false,selector:'#disabled'}],source:'isbn'}));
  assert(r.rows.some(x=>x.state==='ok'&&x.selector==='#fixture'));assert(r.rows.some(x=>x.kind==='overlap'));assert.equal(r.rows.filter(x=>x.state==='invalid').length,1);assert.equal(r.rows.filter(x=>x.state==='untested').length,2);assert(!r.rows.some(x=>x.path.includes('source')));assert.deepEqual(await page.evaluate(()=>__writes),[]);
 });
 await check('URL review rejects unsafe schemes and credentials and masks confidential query values',async()=>{
  const r=await page.evaluate(()=>{const rejected=[];for(const v of ['javascript:alert(1)','data:text/html,a','https://u:p@example.test/'])try{PMKWorkbench.safeUrl(v);}catch(_){rejected.push(v);}let external=false;try{PMKWorkbench.safeUrl('https://external.test/',{sameOrigin:true});}catch(_){external=true;}return {rejected,external,summary:PMKWorkbench.urlSummary('https://external.test/?token=SECRET&title=été')};});
  assert.equal(r.rejected.length,3);assert(r.external);assert(!JSON.stringify(r.summary).includes('SECRET'));assert(r.summary.parameters.some(x=>x.name==='title'&&x.value==='été'));
 });
 await check('Shared confirmation is labelled, traps keyboard focus and restores the opener',async()=>{
  await page.locator('#opener').focus();await page.evaluate(()=>{window.__answer=null;PMKWorkbench.confirm({title:'Contrôle',summary:'<img src=x onerror=alert(1)>'}).then(v=>window.__answer=v);});
  const dialog=page.getByRole('alertdialog',{name:'Contrôle'});await dialog.waitFor();assert.equal(await dialog.locator('img').count(),0);await dialog.getByRole('button',{name:'Annuler',exact:true}).focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Confirmer');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Annuler');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__answer===false);assert.equal(await page.evaluate(()=>document.activeElement.id),'opener');
 });
 await check('Targeted reset and undo change only the draft and retain unknown fields and customized arrays',async()=>{
  await page.evaluate(()=>{PMKConfig.registerModule({id:'workbench-test',name:{fr:'Recette'},defaults:{enabled:true,nested:{a:1,b:2},rows:[{id:'default',value:'origine'}],secretToken:'default'},schema:[{key:'nested.a',type:'number',label:{fr:'Valeur A'}},{key:'nested.b',type:'number',label:{fr:'Valeur B'}}]});return PMKConfig.openAdmin('workbench-test');});
  const panel=page.locator('.pmk-workbench-panel');await panel.locator('summary').click();assert(!(await panel.innerText()).includes('SECRET-NOT-DISPLAYED'));
  await panel.getByRole('row').filter({hasText:'Valeur A'}).getByRole('button',{name:'Reprendre cette valeur'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Confirmer',exact:true}).click();
  await panel.getByRole('button',{name:'Annuler la dernière remise à défaut'}).click();assert(await panel.getByRole('row').filter({hasText:'Valeur A'}).count());assert.deepEqual(await page.evaluate(()=>__writes),[]);
  await panel.getByRole('row').filter({hasText:'Valeur A'}).getByRole('button',{name:'Reprendre cette valeur'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Confirmer',exact:true}).click();
  await page.locator('#pmk-config-overlay').getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();await page.waitForFunction(()=>__writes.length>0);
  const value=await page.evaluate(()=>__config['workbench-test'].config);assert.equal(value.nested.a,1);assert.equal(value.nested.b,2);assert.equal(value.nested.custom,'préservé');assert.deepEqual(value.rows,[{id:'mine',value:'personnel'}]);assert.equal(value.secretToken,'SECRET-NOT-DISPLAYED');
 });
 await check('Sequential batch resumes failures without replaying successes and rejects duplicate identities before writes',async()=>{
  const r=await page.evaluate(async()=>{const calls=[];const first=await PMKWorkbench.batch(['a','b','c'],async id=>{calls.push(id);if(id==='b')throw new Error('Refus');return id;},{key:x=>x});const second=await PMKWorkbench.batch(['a','b','c'],async id=>{calls.push(id);return id;},{key:x=>x,previous:first,failedOnly:true});let refused=false;try{await PMKWorkbench.batch(['a','a'],async()=>calls.push('BAD'),{key:x=>x});}catch(_){refused=true;}return {calls,first,second,refused};});
  assert.deepEqual(r.calls,['a','b','c','b']);assert.equal(r.first.failed,1);assert.equal(r.second.failed,0);assert(r.refused);
 });
 await check('Batch cancellation stops before the next operation',async()=>{
  const r=await page.evaluate(async()=>{const controller=new AbortController(),calls=[];const result=await PMKWorkbench.batch([1,2,3],async id=>{calls.push(id);controller.abort();return id;},{signal:controller.signal});return {calls,result};});assert.deepEqual(r.calls,[1]);assert.equal(r.result.cancelled,true);assert.deepEqual(errors,[]);
 });
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
