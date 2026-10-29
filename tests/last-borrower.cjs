const {chromium}=require('playwright');
const fs=require('fs');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 try{
  let requested;
  await page.route('https://pmk.test/cgi-bin/koha/svc/report?*',route=>{
   requested=new URL(route.request().url());
   return route.fulfill({contentType:'application/json',body:JSON.stringify([{itemnumber:42,borrowernumber:7,cardnumber:'C0007',firstname:'Jeanne',surname:'Martin',created_on:'2026-10-20 10:30:00'}])});
  });
  await page.route('https://pmk.test/cgi-bin/koha/catalogue/detail.pl*',route=>route.fulfill({contentType:'text/html',body:'<table id="holdings_table"><tbody><tr><td><a href="/cgi-bin/koha/catalogue/moredetail.pl?itemnumber=42">Exemplaire</a></td><td class="actions"></td></tr></tbody></table>'}));
  await page.goto('https://pmk.test/cgi-bin/koha/catalogue/detail.pl?biblionumber=1');
  await page.evaluate(()=>{
   const definitions={};
   window.__definitions=definitions;
   window.PMKConfig={
    registerModule(definition){definitions[definition.id]=definition;},
    getConfig:async id=>({...definitions[id].defaults,reportId:'5270'}),
    subscribe(){return()=>{};},
    elementPicker:{register(){},pickForConfig:async()=>({selector:'#chosen'})}
   };
  });
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addScriptTag({content:fs.readFileSync('pmk-dernier-emprunteur.js','utf8')});
  await page.getByRole('button',{name:/Dernier emprunteur anonymisé/}).click();
  await page.waitForFunction(()=>document.querySelector('.pmk-lb-card')?.textContent.includes('Jeanne Martin'));
  const result=await page.evaluate(()=>({definition:__definitions['last-borrower'],text:document.querySelector('.pmk-lb-card').textContent}));
  assert.equal(result.definition.defaults.reportId,'');
  assert.match(result.definition.defaults.sqlTemplate,/i\.last_returned_by/);
  assert.match(result.text,/C0007/);
  assert.equal(requested.searchParams.get('id'),'5270');
  assert.equal(requested.searchParams.get('sql_params'),'42');
  assert.equal(requested.searchParams.get('param_names'),'itemnumber');
  assert.deepEqual(errors,[]);
  console.log('PASS Last borrower module: registration, private SQL template and Koha report request');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
