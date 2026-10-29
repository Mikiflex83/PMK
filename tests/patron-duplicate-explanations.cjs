const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 const html='<html lang="fr"><body><form id="entryform"><ul><li><input id="surname" name="surname" value="Martin"></li><li><input id="firstname" name="firstname" value="Alice"></li><li><input id="dateofbirth" name="dateofbirth" value="01/02/1990"></li></ul><button type="submit">Enregistrer</button></form></body></html>';
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});if(url.pathname==='/api/v1/patrons')return route.fulfill({headers:{'X-Total-Count':'2'},json:[{patron_id:1,surname:'Martin',firstname:'Alice',date_of_birth:'1990-02-01',cardnumber:'A1',library_id:'A'},{patron_id:2,surname:'Martni',firstname:'Alice',date_of_birth:'1990-02-01',cardnumber:'A2',library_id:'B'}]});return route.fulfill({json:[]});});
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/members/memberentry.pl?op=add_form');
  await page.evaluate(()=>{window.PMKConfig={registerModule(){},getConfig:async()=>({enabled:true,page:{enabled:true},existingPatron:{enabled:false},behavior:{requireBirthDate:true,requireCheckBeforeSave:true},comparison:{fields:[{enabled:true,apiField:'surname',selector:'#surname',mode:'fuzzy',role:'candidate',maxDistance:1},{enabled:true,apiField:'firstname',selector:'#firstname',mode:'fuzzy',role:'candidate',maxDistance:1},{enabled:true,apiField:'date_of_birth',selector:'#dateofbirth',mode:'date',role:'qualifier',maxDistance:0}]} }),subscribe(){},elementPicker:{register(){}}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'144-controle-doublons-adherents.js'),'utf8')});
  await page.waitForSelector('#pmk144-check');await page.locator('#pmk144-check').click();
  await page.waitForFunction(()=>document.querySelectorAll('.pmk144-result-row').length===2);
  const text=await page.locator('#pmk144-results').textContent();
  assert.match(text,/Suspicion très forte.*Nom : identique.*Prénom : identique.*Naissance : identique/s);
  assert.match(text,/Suspicion forte.*Nom : 1 écart.*sur 1 toléré.*Naissance : identique/s);
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Patron duplicate candidates expose each field comparison and distinguish strong from very strong suspicion without merging records',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/patron-duplicate-explanations.json'),JSON.stringify({kind:'Browser runtime with exact and transposed-name Koha patron candidates',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
