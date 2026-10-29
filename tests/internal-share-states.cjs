const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/internal-share-states.json');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});
 await page.route('http://pmk.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head></head><body><span class="logged-in-branch-name" data-branchcode="DRA">DRAGUIGNAN</span><span class="loggedinusername" data-loggedinusername="agent2">agent2</span><div id="toolbar"></div><h1>Notice test</h1></body></html>'}));
 await page.goto('http://pmk.test/cgi-bin/koha/catalogue/detail.pl?biblionumber=42');
 await page.evaluate(()=>{
  const now=Date.now();window.__updates=[];
  const incoming={url:location.href,title:'À consulter',kind:'page',recipient:'Accueil jeunesse',status:'en_attente',sender:'DRAGUIGNAN',senderSiteId:'draguignan',createdBy:'koha:agent1',createdByLabel:'agent1',timestamp:now,expiresAt:now+300000,deliveryStatus:'sent'};
  const shares={name:'shares'};
  window.PMKConfig={registerModule(){},getConfig(){return Promise.resolve({})},subscribe(){},getLanguage(){return 'fr'},isKohaSuperlibrarian(){return false}};
  window.PMKNativeData={
   createDatabase(){return{}},collection(){return shares},query(ref){return ref},where(){return{}},getSession(){return Promise.resolve({uid:'agent2'})},
   onSnapshot(_query,success){setTimeout(()=>success({docs:[{id:'share-1',data:()=>structuredClone(incoming)}]}),0);return()=>{}},
   doc(...args){return {id:String(args.at(-1))}},updateDoc(ref,patch){window.__updates.push({id:ref.id,patch:structuredClone(patch)});return Promise.resolve()},deleteDoc(){return Promise.resolve()},addDoc(){return Promise.resolve({id:'new'})},
   getDoc(){return Promise.resolve({data:()=>({count:0})})},runTransaction(){return Promise.resolve(1)}
  };
 });
 await page.addScriptTag({path:path.join(ROOT,'111-internal-share.js')});
 await page.getByText('Disponible — pas encore consulté').waitFor();
 assert.match(await page.locator('.pmk111-recipient').innerText(),/Accueil jeunesse/);
 assert.match(await page.locator('.pmk111-timer').innerText(),/Expire dans/);
 const popup=page.waitForEvent('popup');await page.getByRole('link',{name:/Ouvrir/}).click();const opened=await popup;await opened.close();
 await page.waitForFunction(()=>window.__updates.length===1);
 const result=await page.evaluate(()=>({delivery:document.querySelector('[data-role="delivery"]').textContent,updates:window.__updates,definition:PMK111InternalShare.moduleDefinition().description.fr}));
 assert.match(result.delivery,/Consulté le/);assert.equal(result.updates[0].patch.deliveryStatus,'viewed');assert(result.updates[0].patch.viewedAt);assert.match(result.definition,/exclusivement l’API native/);
 fs.writeFileSync(OUT,JSON.stringify({passed:true,recipient:'Accueil jeunesse',timerVisible:true,delivery:result.delivery,storedReceipt:result.updates[0].patch,nativeStorageDescription:true},null,2)+'\n');
 console.log('PASS internal share recipient, duration and sent/available/viewed states');await browser.close();
})().catch(e=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:e.stack},null,2)+'\n');console.error(e);process.exit(1)});
