const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html',body:'<html lang="fr"><body><h1>Catalogue</h1></body></html>'}):route.fulfill({json:[]}));
 try{
  await page.addInitScript(()=>{window.PMKAdvancedSearchOptions={additionalIndexes:[{enabled:true,label:'Date de publication locale',group:'Notre Koha',index:'publocal',exactIndex:'publocal,phr'},{enabled:true,label:'Invalide',index:'bad index'}]};});
  await page.goto('http://pmk.test/cgi-bin/koha/catalogue/search.pl');
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'075-advanced-search-sidebar.js'),'utf8')});
  await page.evaluate(()=>window.openAdvancedSearchSidebar());
  await page.getByRole('button',{name:/Ajouter un critère/}).click();
  const terms=page.locator('.kas-term');
  await terms.nth(0).locator('.kas-field').selectOption('publocal');
  await terms.nth(0).locator('.kas-value').fill('2026');
  await terms.nth(0).locator('input[type="checkbox"]').check();
  await page.getByRole('button',{name:/Ajouter un critère/}).click();
  await terms.nth(1).locator('.kas-field').selectOption('au');
  await terms.nth(1).locator('.kas-value').fill('Martin');
  await page.locator('.kas-operator').selectOption('OR');
  const text=await page.locator('.kas-summary').textContent();
  assert.match(text,/Date de publication locale.*2026.*OU.*Auteur.*Martin/s);
  assert.match(text,/idx=publocal%2Cphr&q=2026&op=OR&idx=au&q=Martin/);
  assert.equal(await page.locator('.kas-field option[value="bad index"]').count(),0,'invalid index is not offered');
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Advanced search accepts installation-specific indexes and previews the exact Koha query with readable AND/OR operators',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/advanced-search-query.json'),JSON.stringify({kind:'Actual advanced-search browser runtime with a custom Koha index and two criteria',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
