const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('codesBarres',JSON.stringify([{code:'1234567890',at:Date.now(),source:'Recherche test'},{code:'9999999999',at:Date.now()-48*3600000,source:'Ancienne recherche'}]));localStorage.setItem('searchbox_value','5555555555');});
 const html='<html lang="fr"><body><table id="holdings_table"><tbody><tr><td>1234567890</td><td>X1234567890Y</td><td>9999999999</td><td>5555555555</td></tr></tbody></table></body></html>';
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:html}));
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/catalogue/detail.pl?biblionumber=1');
  await page.evaluate(()=>{const cfg={enabled:true,exactMatch:true,lastSearch:{enabled:true,blink:false},remembered:{enabled:true,blink:false,retentionHours:24}};window.PMKConfig={definition:null,registerModule(def){this.definition=def;},getConfig:async()=>cfg,subscribe(){}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'068-blinking-barcode.js'),'utf8')});
  await page.waitForSelector('.pmk068-remembered');
  assert.equal(await page.locator('.pmk068-remembered').count(),1,'a barcode embedded in a longer identifier is not highlighted');
  assert.match(await page.locator('.pmk068-remembered').getAttribute('title'),/Recherche test/);
  assert.equal(await page.locator('.pmk068-last-search').count(),1);
  assert.equal(await page.locator('td').nth(2).textContent(),'9999999999');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('codesBarres')).length),1,'expired local entry is removed');
  await page.evaluate(()=>PMKConfig.definition.schema.find(section=>section.id==='remembered').fields.find(field=>field.type==='action').action());
  assert.equal(await page.locator('[data-pmk068-generated]').count(),0);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('codesBarres'))),[]);
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Barcode memory shows its local provenance, expires old entries, rejects embedded false matches and can be cleared',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/barcode-memory.json'),JSON.stringify({kind:'Browser runtime with local barcode memory, expiry and false-match cases',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
