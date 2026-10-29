const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(ROOT,'028-transfer-buttons-holdings.js'),'utf8'),key='pmk028.pendingTransfer',rows=[];
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext();const errors=[];
try {
 await context.route('**/*',r=>{const detail=new URL(r.request().url()).pathname.endsWith('detail.pl');return r.fulfill({contentType:'text/html',body:'<html lang="fr"><body>'+(detail?'<table id="holdings_table"><thead><tr><th data-colname="status">Status</th><th data-colname="barcode">Barcode</th><th data-colname="actions">Actions</th></tr></thead><tbody><tr><td>Available</td><td class="barcode">PMKTEST-A</td><td></td></tr></tbody></table>':'<form><input id="barcode"><button type="submit">Valider</button></form>')+'</body></html>'});});
 const a=await context.newPage(),b=await context.newPage();for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
 for(const [p,code]of [[a,'PMKTEST-A'],[b,'PMKTEST-B']]){await p.goto('http://pmk.test/cgi-bin/koha/catalogue/detail.pl');await p.locator('td.barcode').evaluate((el,code)=>el.textContent=code,code);await p.addScriptTag({content:source});}
 // The historical shared key remains untouched but must never supply another tab.
 await a.evaluate(key=>localStorage.setItem(key,JSON.stringify({barcode:'LEGACY-OTHER-TAB',createdAt:Date.now()})),key);
 await a.locator('[data-pmk028-transfer]').click();await a.waitForURL('**/branchtransfers.pl');
 await b.locator('[data-pmk028-transfer]').click();await b.waitForURL('**/branchtransfers.pl');
 for(const [p,code]of [[a,'PMKTEST-A'],[b,'PMKTEST-B']]){await p.addScriptTag({content:source});await p.waitForFunction(code=>document.querySelector('#barcode').value===code,code);assert.equal(await p.evaluate(key=>sessionStorage.getItem(key),key),null);}
 rows.push({name:'Two tabs retain independent barcodes even when their navigation overlaps',passed:true});
 await a.reload();await a.addScriptTag({content:source});assert.equal(await a.locator('#barcode').inputValue(),'');rows.push({name:'Payload is consumed once and legacy shared storage is ignored',passed:true});
 for(const age of [-10000,360000]){await a.reload();await a.evaluate(({key,age})=>sessionStorage.setItem(key,JSON.stringify({barcode:'EXPIRED',createdAt:Date.now()-age})),{key,age});await a.addScriptTag({content:source});assert.equal(await a.locator('#barcode').inputValue(),'');assert.equal(await a.evaluate(key=>sessionStorage.getItem(key),key),null);}
 rows.push({name:'Expired and future-dated handoffs are rejected',passed:true});
 await a.reload();await a.locator('#barcode').fill('MANUAL');await a.evaluate(key=>sessionStorage.setItem(key,JSON.stringify({barcode:'AUTO',createdAt:Date.now()})),key);await a.addScriptTag({content:source});assert.equal(await a.locator('#barcode').inputValue(),'MANUAL');assert.deepEqual(errors,[]);rows.push({name:'Manual input is preserved without form submission',passed:true});
 console.log(rows.map(r=>'PASS '+r.name).join('\n'));
}finally{fs.writeFileSync(path.join(ROOT,'tests/validation/transfer-isolation.json'),JSON.stringify({kind:'Browser fixtures, independent tabs sharing one origin',rows},null,2)+'\n');await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
