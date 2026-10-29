const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];

(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR',timezoneId:'Europe/Paris'});
 page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));
 try{
  const body='<h1>Historique</h1><table id="table_readingrec"><thead><tr><th>Date de prêt</th><th>Date de retour prévue</th><th>Date de retour effective</th></tr></thead><tbody>'+
   '<tr id="due-day"><td data-order="2026-01-01">01/01/2026</td><td data-order="2026-01-10">10/01/2026</td><td data-order="2026-01-10">10/01/2026</td></tr>'+
   '<tr id="late-return"><td data-order="2026-01-01">01/01/2026</td><td data-order="2026-01-10">10/01/2026</td><td data-order="2026-01-11">11/01/2026</td></tr>'+
   '<tr id="due-today"><td data-order="2026-10-20">20/10/2026</td><td data-order="2026-10-27">27/10/2026</td><td data-order="checked out">Prêté</td></tr>'+
   '<tr id="overdue"><td data-order="2026-10-20">20/10/2026</td><td data-order="2026-10-26">26/10/2026</td><td data-order="checked out">Prêté</td></tr>'+
   '<tr id="chronology"><td data-order="2026-03-10">10/03/2026</td><td data-order="2026-03-20">20/03/2026</td><td data-order="2026-03-09">09/03/2026</td></tr>'+
   '</tbody></table>';
  await page.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html; charset=utf-8',body:'<html lang="fr"><body>'+body+'</body></html>'}):route.fulfill({json:[]}));
  await page.goto('http://pmk.test/cgi-bin/koha/members/readingrec.pl');
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00+01:00'));
  await page.evaluate(()=>{window.config={showLegend:true};window.subscriber=null;window.PMKConfig={registerModule:def=>window.definition=def,getConfig:async()=>config,subscribe:(id,callback)=>(window.subscriber=callback,()=>{}),getLanguage:()=> 'fr',mountContextButton(){}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'007-highlight-readingrec.js'),'utf8')});
  await page.waitForSelector('.pmk-history-legend');
  assert.equal(await page.locator('.pmk-history-legend li[data-pmk-history-rule]').count(),5);
  assert.equal(await page.locator('#due-day').getAttribute('data-pmk-history-rules'),'loan-duration-returned');
  assert.equal(await page.locator('#late-return').getAttribute('data-pmk-history-rules'),'loan-duration-returned,returned-late');
  assert.equal(await page.locator('#due-today').getAttribute('data-pmk-history-rules'),'loan-duration-current');
  assert.equal(await page.locator('#overdue').getAttribute('data-pmk-history-rules'),'overdue-current');
  assert.equal(await page.locator('#chronology').getAttribute('data-pmk-history-rules'),'return-before-checkout');
  assert.match(await page.locator('#late-return [data-pmk-history-rule="returned-late"]').innerText(),/1 jour/);
  assert.equal(await page.locator('#due-today [data-pmk-history-rule="overdue-current"]').count(),0);
  assert(await page.locator('#chronology td').last().evaluate(node=>node.classList.contains('pmk-history-bg-danger')));
  const titles=await page.locator('.pmk-history-indicator').evaluateAll(nodes=>nodes.map(node=>node.title));
  assert(titles.every(title=>title.startsWith('Règle appliquée : ')));
  await page.evaluate(()=>subscriber({showLegend:false}));
  await page.waitForFunction(()=>!document.querySelector('.pmk-history-legend'));
  assert.equal(await page.locator('.pmk-history-indicator').count(),6);
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Loan history legend names active rules and exact due-date boundaries distinguish duration, late return, overdue and chronology',passed:true});
  console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/history-boundaries.json'),JSON.stringify({kind:'Actual browser module, fixed Europe/Paris date and native Koha table markup',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
