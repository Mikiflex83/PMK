const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));const calls=[];
 await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:'<html lang="fr"><body><input id="firstname" value="Alice"><input name="borrowernumber" value="42"><div><input id="address"><input id="zipcode"><input id="city"></div></body></html>'});if(url.pathname==='/address-api'){calls.push(Object.fromEntries(url.searchParams));await new Promise(resolve=>setTimeout(resolve,160));return route.fulfill({json:{results:[{fulltext:'10 rue des Fleurs, 83000 Toulon',street:'rue des Fleurs',housenumber:'10',zipcode:'83000',city:'Toulon',kind:'StreetAddress'},{fulltext:'10 rue des Fleurs, 83300 Draguignan',street:'rue des Fleurs',housenumber:'10',zipcode:'83300',city:'Draguignan',kind:'StreetAddress'}]}});}return route.fulfill({json:[]});});
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/members/memberentry.pl');
  await page.evaluate(()=>{const cfg={enabled:true,page:{enabled:true},addresses:{primary:{enabled:true,addressSelector:'#address',zipcodeSelector:'#zipcode',citySelector:'#city'},secondary:{enabled:false}},search:{minChars:3,debounceMs:150,maxResults:6,requestTimeoutMs:2000,endpoint:'/address-api',providerLabel:'Relais local'},geoBias:{enabled:false}};window.PMKConfig={getConfig:async()=>cfg,subscribe(){},mountContextButton(){}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'070-address-autocomplete-memberentry.js'),'utf8')});
  await page.waitForSelector('#address[data-pmk070-mounted="1"]');
  await page.locator('#address').fill('10 rue des Fleurs');
  await page.waitForFunction(()=>document.querySelector('.pmk070-message')?.textContent.includes('Relais local'));
  await page.waitForFunction(()=>document.querySelectorAll('.pmk070-option').length===2);
  const listText=await page.locator('.pmk070-suggestions').textContent();
  assert.match(listText,/83000 Toulon.*83300 Draguignan.*plusieurs communes.*vérifiez le code postal/s);
  assert.equal(calls.length,1);
  assert.equal(calls[0].text,'10 rue des Fleurs');
  assert.deepEqual(Object.keys(calls[0]).sort(),['maximumResponses','text','type']);
  await page.locator('.pmk070-option').nth(1).click();
  assert.equal(await page.locator('#zipcode').inputValue(),'83300');
  assert.equal(await page.locator('#city').inputValue(),'Draguignan');
  assert.equal(await page.locator('#firstname').inputValue(),'Alice');
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Address autocomplete discloses provider latency and ambiguous cities, sends only the typed address parameters and preserves unrelated patron data',passed:true,evidence:{parameters:Object.keys(calls[0]).sort()}});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack,calls});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/address-provider.json'),JSON.stringify({kind:'Browser runtime with delayed compatible address provider and two same-street city results',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
