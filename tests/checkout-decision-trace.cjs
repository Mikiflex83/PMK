const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 const html='<html><head><meta name="csrf-token" content="t"></head><body><div id="circ_needsconfirmation"><form class="confirmation-required-form"><input name="barcode" value="ABC"><input name="borrowernumber" value="42"><input name="session_confirmations" value="NOT_FOR_LOAN_FORCING"><ul><li class="needsconfirm not_for_loan_forcing">Statut non prêtable</li></ul><button class="approve" type="submit">Oui</button></form></div><form id="mainform"><input name="borrowernumber" value="42"></form></body></html>';
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});if(url.pathname==='/api/v1/items')return route.fulfill({json:[{item_id:7,biblio_id:10,external_id:'ABC',not_for_loan_status:1,lost_status:0,withdrawn:0,damaged_status:0,checked_out_date:null}]});if(url.pathname.includes('/authorised_value_categories/'))return route.fulfill({json:[{value:'1',description:'Réservé au personnel'}]});if(url.pathname==='/api/v1/items/7')return route.fulfill({json:{item_id:7,biblio_id:10,external_id:'ABC',not_for_loan_status:1,lost_status:0,withdrawn:0,damaged_status:0,checked_out_date:null}});return route.fulfill({json:[]});});
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/circ/circulation.pl?borrowernumber=42');
  await page.evaluate(()=>{const cfg={enabled:true,categoryNotForLoan:'NOT_LOAN',categoryLost:'LOST',allowNotForLoan:['1'],allowLost:[],valuesNotForLoan:[],valuesLost:[]};window.PMKConfig={registerModule(){},getConfig:async()=>cfg,subscribe(){}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'146-checkout-status-correction-pmk.js'),'utf8')});
  await page.waitForSelector('#pmk145-decision-trace');
  assert.equal(await page.locator('#pmk145-decision-trace li').count(),4);
  assert.match(await page.locator('#pmk145-decision-trace').textContent(),/NOT|Statut|Réservé au personnel|Koha effectuera le prêt/);
  await page.evaluate(()=>document.body.appendChild(document.createElement('i')));
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#pmk145-action').count(),1,'rapid DOM changes do not duplicate the proposal');
  await page.evaluate(()=>{document.querySelector('li.needsconfirm').textContent='Réservation trouvée';document.body.appendChild(document.createElement('i'));});
  await page.waitForFunction(()=>!document.querySelector('#pmk145-action'));
  assert.equal(await page.locator('#pmk145-decision-trace').count(),0,'an ineligible Koha warning withdraws the proposal and trace');
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Checkout correction explains the exact rule, remains single during rapid updates and withdraws on another Koha warning',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/checkout-decision-trace.json'),JSON.stringify({kind:'Browser runtime with Koha confirmation markup and API responses',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
