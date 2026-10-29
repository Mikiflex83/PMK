const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('kohaBatchTransferJob_v3',JSON.stringify({queue:['RESTE1','RESTE2'],total:5,tobranchcd:'B',skipOnLoan:true,skipInTransfer:true,skipNotForLoan:true,stopped:true,log:[{barcode:'OK1',status:'ok',createdByCurrentJob:true},{barcode:'IGN1',status:'ignore',code:'on_loan'},{barcode:'ERR1',status:'erreur',code:'http'}]})));
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:'<html lang="fr"><body><span id="logged-in-branch-code" data-branchcode="A">A</span><form id="branchtransfers"><input name="csrf_token" value="t"></form></body></html>'});if(url.pathname==='/api/v1/libraries')return route.fulfill({json:[{library_id:'B',name:'Site B'}]});return route.fulfill({json:[]});});
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/circ/branchtransfers.pl');
  await page.evaluate(()=>{window.PMKConfig={registerModule(){},getConfig:async()=>({enabled:true}),subscribe(){}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'119-multi-transfert.js'),'utf8')});
  await page.waitForSelector('#batch-transfer-panel');
  assert.equal(await page.locator('#btp-barcodes').inputValue(),'RESTE1\nRESTE2');
  assert.match(await page.locator('#btp-progress').textContent(),/Lot interrompu.*3 \/ 5.*2 code/);
  assert.match(await page.locator('#btp-summary').textContent(),/OK 1.*Ignorés 1.*Erreurs 1/s);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('kohaBatchTransferJob_v3')),null,'stopped job is no longer considered running');
  assert.equal(await page.locator('#btp-start').isDisabled(),false);
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Interrupted batch restores only remaining barcodes, exposes a complete balance and becomes explicitly restartable',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/multi-transfer-interruption.json'),JSON.stringify({kind:'Browser reload with a stopped session job containing successes, skips, failures and remaining barcodes',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
