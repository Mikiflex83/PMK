const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 const html='<html lang="fr"><body><div id="patron_messages"><ul><li class="expired">Adhésion expirée</li></ul></div><div class="patroninfo"><span class="patronaddress1">1 rue A</span><span class="patroncity">83000 Toulon</span><span class="patronphone"><a href="tel:0102">01 02</a></span><span class="email"><a href="mailto:a@example.test">a@example.test</a></span></div><a id="renew" href="/cgi-bin/koha/members/setstatus.pl?borrowernumber=1&reregistration=y">Renouveler</a></body></html>';
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:html}));
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/members/moremember.pl?borrowernumber=1');
  await page.evaluate(()=>{const cfg={enabled:true,expired:true,expiringSoon:true,targets:{},pages:[{id:'members.moremember',path:'/cgi-bin/koha/members/moremember.pl',enabled:true}],checks:[{id:'address',enabled:true,severity:'blocking',labelFr:'Adresse'},{id:'phone',enabled:true,severity:'warning',labelFr:'Téléphone'},{id:'email',enabled:true,severity:'information',labelFr:'E-mail'}]};window.PMKConfig={registerModule(){},getConfig:async()=>cfg,subscribe(){},getLanguage:()=> 'fr',mountContextButton(){},elementPicker:{}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'002-verification-coordonnees.js'),'utf8')});
  await page.waitForSelector('#pmk-patron-renewal-verification');
  assert.equal(await page.locator('[data-severity="blocking"] input').count(),1);
  assert.equal(await page.locator('[data-severity="warning"] input').count(),1);
  assert.equal(await page.locator('[data-severity="information"] input:disabled:checked').count(),1);
  assert.equal(await page.locator('#renew').getAttribute('aria-disabled'),'true');
  assert.match(await page.locator('.pmk-renewal-status').textContent(),/1 contrôle.*bloquant.*1 avertissement/s);
  await page.locator('[data-severity="warning"] input').check();
  assert.equal(await page.locator('#renew').getAttribute('aria-disabled'),'true','warning acknowledgement alone cannot bypass blocking check');
  await page.locator('[data-severity="blocking"] input').check();
  assert.equal(await page.locator('#renew').getAttribute('aria-disabled'),null,'warning and information do not block native Koha renewal');
  assert.match(await page.locator('.pmk-renewal-status').textContent(),/Vérification terminée.*0 contrôle.*0 avertissement/s);
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Patron renewal summary distinguishes information, warning and blocking checks and unlocks only after blocking confirmations',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/patron-renewal-levels.json'),JSON.stringify({kind:'Browser runtime on patron details with native renewal link and three verification levels',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
