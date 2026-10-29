const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:600,height:800},locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 const table='<table id="holdings_table"><thead><tr><th id="title">Titre</th><th id="itemcallnumber">Cote</th><th id="barcode">Code-barres</th><th id="internal" hidden>Interne</th><th id="actions">Actions</th></tr></thead><tbody><tr><td>Livre</td><td>R ABC</td><td>123</td><td hidden>secret</td><td><a class="btn" href="/edit">Modifier</a></td></tr></tbody></table>';
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<html lang="fr"><body>'+table+'</body></html>'}));
 try{
  await page.addInitScript(()=>{window.PMK_RESPONSIVE_TABLES_CONFIG={enabled:true,detailEnabled:true,holdingsEnabled:true,holdingsMode:'stack',otherholdingsEnabled:false,primaryColumns:'itemcallnumber,barcode',actionColumns:'actions'};});
  await page.goto('http://pmk.test/cgi-bin/koha/catalogue/detail.pl?biblionumber=1');
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'005-style-holdings-table.js'),'utf8')});
  await page.waitForSelector('#holdings_table[data-pmk-responsive-ready="1"]');
  assert.equal(await page.locator('td').nth(1).getAttribute('data-pmk-responsive-priority'),'primary');
  assert.equal(await page.locator('td').nth(2).getAttribute('data-pmk-responsive-priority'),'primary');
  assert.equal(await page.locator('td').nth(4).getAttribute('data-pmk-responsive-priority'),'actions');
  assert.equal(await page.locator('td').nth(3).evaluate(node=>node.classList.contains('pmk-responsive-column-hidden')),true);
  assert.equal(await page.locator('td').nth(4).evaluate(node=>getComputedStyle(node).position),'sticky');
  assert.equal(await page.getByRole('link',{name:'Modifier'}).count(),1);
  await page.setViewportSize({width:1000,height:800});
  await page.waitForFunction(()=>!document.querySelector('#holdings_table').hasAttribute('data-pmk-responsive-ready'));
  assert.equal(await page.locator('[data-pmk-responsive-priority]').count(),0);
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Mobile item cards prioritise configured common columns, keep actions reachable and restore the native table on desktop',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/responsive-table-priorities.json'),JSON.stringify({kind:'Browser mobile and desktop viewports with Koha holdings table markup',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
