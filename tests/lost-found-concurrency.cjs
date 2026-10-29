const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];

(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});
 let itemState=2, puts=0, lists=0;
 page.errors=[]; page.on('pageerror',error=>page.errors.push(error.message));
 const alert='<div class="alert"><span class="ret_checkedin">Document perdu retrouvé</span><input name="barcode" value="ABC"><a href="/cgi-bin/koha/catalogue/detail.pl?biblionumber=10">ABC : Titre</a></div>';
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.isNavigationRequest()) return route.fulfill({contentType:'text/html; charset=utf-8',body:'<html lang="fr"><head><meta name="csrf-token" content="t"></head><body><main><div class="static_checkin_messages">'+alert+alert+'</div></main></body></html>'});
  if(url.pathname==='/api/v1/items'){lists++;return route.fulfill({json:[{item_id:7,biblio_id:10,external_id:'ABC'}]});}
  if(url.pathname==='/api/v1/items/7')return route.fulfill({json:{item_id:7,biblio_id:10,external_id:'ABC',not_for_loan_status:itemState}});
  if(url.pathname==='/api/v1/authorised_value_categories/NOT_LOAN/authorised_values')return route.fulfill({json:[{value:'2',description:'Exclu du prêt'}]});
  if(request.method()==='PUT'){
   puts++;
   await new Promise(resolve=>setTimeout(resolve,250));
   itemState=0;
   return route.fulfill({json:{item_id:7,biblio_id:10,external_id:'ABC',not_for_loan_status:0}});
  }
  return route.fulfill({json:[]});
 });
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/circ/returns.pl');
  await page.evaluate(()=>{const cfg={enabled:true,lostStatuses:[],notLoanRules:[{value:'2',description:'Exclu du prêt',enabled:true,action:'available'}]};window.PMKConfig={registerModule(){},getConfig:async()=>cfg,subscribe(){},getLanguage:()=> 'fr',mountContextButton(){}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'051-alert-doc-retour-perdu.js'),'utf8')});
  await page.waitForFunction(()=>document.querySelectorAll('[data-pmk051-card]').length===2);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-pmk051-card]')).some(card=>/déjà en cours/.test(card.textContent)));
  assert.equal(puts,1,'a single item update is allowed at a time');
  assert.equal(await page.locator('.pmk051-trace').count(),2);
  assert.equal((await page.locator('.pmk051-trace li').first().textContent()).trim(),'Koha signale qu’un statut perdu vient d’être traité.');
  itemState=2;
  await page.evaluate(html=>document.querySelector('.static_checkin_messages').insertAdjacentHTML('beforeend',html),alert);
  await page.waitForFunction(()=>document.querySelectorAll('[data-pmk051-card]').length===3);
  await page.waitForFunction(()=>document.querySelectorAll('.pmk051-trace').length===3);
  assert(lists>=3,'an identical later check-in is processed as a new DOM event');
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Lost-item check-in exposes its decision trace, serializes concurrent writes and processes an identical later return',passed:true,evidence:{puts,lists}});
  console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/lost-found-concurrency.json'),JSON.stringify({kind:'Browser runtime with delayed Koha item update and repeated native check-in message',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
