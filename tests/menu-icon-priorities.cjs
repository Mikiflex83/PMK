const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<html lang="fr"><body><nav><a id="catalogue" href="/catalogue">Catalogue</a></nav></body></html>'}));
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/mainpage.pl');
  await page.evaluate(()=>{window.cfg={enabled:true,observeDom:false,legacy:{enabled:false},customRules:[{id:'high',enabled:true,name:'Prioritaire',pages:'*',targetMode:'selector',selector:'#catalogue',iconType:'fa',iconClass:'fas fa-star',replaceExisting:true,priority:500},{id:'low',enabled:true,name:'Secondaire',pages:'*',targetMode:'selector',selector:'#catalogue',iconType:'fa',iconClass:'fas fa-book',replaceExisting:true,priority:10}]};window.callback=null;window.PMKConfig={definition:null,registerModule(def){this.definition=def;},getConfig:async()=>cfg,subscribe:(id,cb)=>(window.callback=cb,()=>{}),getLanguage:()=> 'fr'};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'117-icons-menus.js'),'utf8')});
  await page.waitForSelector('#catalogue i.fa-star',{state:'attached'});
  assert.equal(await page.locator('#catalogue i').count(),1);
  const overview=await page.evaluate(()=>{const field=PMKConfig.definition.schema.flatMap(s=>s.fields||[]).find(f=>f.type==='custom'&&f.render);const node=field.render({rootObject:cfg});return node.textContent;});
  assert.match(overview,/1 conflit/);
  assert.match(overview,/Prioritaire.*500/);
  await page.evaluate(()=>callback({...cfg,enabled:false}));
  await page.waitForFunction(()=>!document.querySelector('#catalogue i'));
  assert.equal(await page.locator('#catalogue').textContent(),'Catalogue');
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Menu icon catalogue resolves duplicate targets by explicit priority, reports the winning rule and restores native markup',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/menu-icon-priorities.json'),JSON.stringify({kind:'Browser runtime with two icon rules targeting the same Koha menu link',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
