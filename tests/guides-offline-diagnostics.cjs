const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 const vendorJs=fs.readFileSync(path.join(ROOT,'guides/vendor/intro.js-6.0.0/intro.min.js'),'utf8');
 const vendorCss=fs.readFileSync(path.join(ROOT,'guides/vendor/intro.js-6.0.0/introjs.min.css'),'utf8');
 const requests=[];
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());requests.push(url.href);if(req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:'<html lang="fr"><body><h1 id="target">Accueil</h1></body></html>'});if(url.pathname.endsWith('/vendor/intro.js-6.0.0/intro.min.js'))return route.fulfill({contentType:'application/javascript',body:vendorJs});if(url.pathname.endsWith('/vendor/intro.js-6.0.0/introjs.min.css'))return route.fulfill({contentType:'text/css',body:vendorCss});return route.abort();});
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/mainpage.pl');
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'guides/000-guides-core.js'),'utf8')});
  await page.evaluate(async()=>{KOHA_GUIDES.register({id:'offline',match:()=>true,steps:[{element:'#target',title:'Test',intro:'Guide local'}]});await KOHA_GUIDES.start('offline');});
  await page.waitForSelector('.introjs-tooltip');
  assert(requests.every(url=>new URL(url).origin==='http://pmk.test'),'no external host is contacted');
  await page.evaluate(()=>{window.PMKConfig={definition:null,elementPicker:{register(){},stableSelector(){return '#target';}},registerModule(def){this.definition=def;},getConfig:async()=>({enabled:false,customTours:[]}),subscribe(){}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'135-guides-training-pmk-loader.js'),'utf8')});
  await page.waitForFunction(()=>PMKConfig.definition);
  const diagnostic=await page.evaluate(()=>{sessionStorage.setItem('koha.guides.practice.v2',JSON.stringify({guideId:'parcours',stepIndex:2,startedAt:Date.now(),updatedAt:Date.now(),ttl:7200000,mode:'practice'}));const field=PMKConfig.definition.schema[0].fields.find(f=>f.type==='custom');const root={enabled:false,customTours:[{enabled:true,version:3,pagePath:location.pathname,steps:[{enabled:true,title:'Présente',selector:'#target'},{enabled:true,title:'Disparue',selector:'#ancienne-cible'}]}]};return field.render({rootObject:root}).textContent;});
  assert.match(diagnostic,/moteur 2\.0\.6/);
  assert.match(diagnostic,/Reprise disponible.*étape 3/);
  assert.match(diagnostic,/1 cible.*introuvable/);
  assert.match(diagnostic,/Disparue.*guide v3/);
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Guides load vendored Intro.js without external requests and diagnose engine version, resume state and missing versioned steps',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack,requests});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/guides-offline-diagnostics.json'),JSON.stringify({kind:'Actual guide core with vendored Intro.js plus PMK configuration diagnostics',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
