const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR',timezoneId:'Europe/Paris'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 const form=id=>'<div class="modal"><div class="modal-content"><div class="modal-body"><h3>Réservation</h3><form class="confirm"><input name="hold_id" value="'+id+'"></form></div></div></div>';
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:'<html lang="fr"><body>'+form('1')+form('2')+'</body></html>'});if(url.pathname==='/api/v1/holds'){const id=url.searchParams.get('hold_id');return route.fulfill({json:id==='1'?[{hold_id:1,expiration_date:'2026-11-15'}]:[{hold_id:2,waiting_date:'2026-11-02'}]});}return route.fulfill({json:[]});});
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/circ/returns.pl');
  await page.evaluate(()=>{window.PMKConfig={registerModule(){},getConfig:async()=>({enabled:true,checkKohaCalendar:false,fallbackDays:11,excludeSundays:true,fallbackFrenchHolidays:true,markFallbackAsEstimate:true}),subscribe(){},getLanguage:()=> 'fr',mountContextButton(){}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'120-date-retrait-reservations.js'),'utf8')});
  await page.waitForFunction(()=>document.querySelectorAll('.pmk120-hold-expiration-info').length===2);
  const cards=page.locator('.pmk120-hold-expiration-info');
  assert.match(await cards.nth(0).textContent(),/15\/11\/2026.*jour de fermeture.*16\/11\/2026.*date officielle reste celle enregistrée dans Koha/s);
  assert.match(await cards.nth(1).textContent(),/estimation.*Calendrier Koha non confirmé.*Date indicative calculée selon les jours d’ouverture/s);
  assert.equal(await cards.nth(0).getAttribute('data-source'),'koha-expiration');
  assert.equal(await cards.nth(1).getAttribute('data-source'),'waiting-date-fallback');
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Hold pickup date distinguishes Koha expiration, closure warning and open-day estimate',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/hold-expiration-sources.json'),JSON.stringify({kind:'Browser runtime with one native expiration date and one waiting-date fallback',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
