const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),rows=[];
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await browser.newPage({locale:'fr-FR'}),requests=[],errors=[];let revision=0,storedKey='',storedRcr='',failSave=false,failCounts=false;
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>{const req=r.request(),u=new URL(req.url());requests.push({url:u.href,method:req.method(),body:req.postData()});
  if(u.pathname==='/api/v1/contrib/pmk/nedap/settings'){
   if(req.method()==='PUT'){const data=req.postDataJSON();if(failSave||data.revision!==revision)return r.fulfill({status:409,json:{error:'configuration_changed'}});storedKey=data.clearKey?'':data.apiKey||storedKey;storedRcr=data.rcr;revision++;}
   return r.fulfill({json:{revision,rcr:storedRcr,hasKey:!!storedKey}});
  }
  if(u.pathname==='/api/v1/contrib/pmk/nedap/counts'){if(failCounts)return r.fulfill({status:502,json:{error:'provider_unavailable'}});return r.fulfill({json:[{CCINFO:[{DATA:[{VALUES:[{[u.searchParams.get('from')]:{IN:42,OUT:12}}]}]}]}]});}
  if(u.origin!=='http://pmk.test')return r.abort();
  return r.fulfill({contentType:'text/html; charset=utf-8',body:'<html lang="fr"><body><div id="mount"></div></body></html>'});
 });
 await p.goto('http://pmk.test/cgi-bin/koha/mainpage.pl');
 await p.evaluate(()=>{window.writes=[];window.saved={config:{connectionMode:'worker',workerUrl:'https://worker.example.invalid',rcr:'830506201',customPersonal:{keep:17},title:'Mon compteur'}};
  const adapter={read:async()=>({exists:()=>true,data:()=>structuredClone(saved)}),write:async value=>{writes.push(structuredClone(value));saved=structuredClone(value);}};
  window.PMKNativeData={createDatabase(){return{}},doc(){},getDoc(){return adapter.read()},setDoc(a,b){return adapter.write(b)},getSession:async()=>({isAdmin:true})};
  window.PMKHomeWidgets={isSuperlibrarian:()=>true,storage:{register:()=>adapter},register:def=>window.widget=def};window.PMKConfig={confirmAction:async()=>true};sessionStorage.setItem('nfAdminUnlocked','1');
 });
 await p.addScriptTag({content:fs.readFileSync(path.join(ROOT,'137-widgets/137-widget-frequency-nedap.js'),'utf8')});await p.evaluate(()=>widget.mount(document.getElementById('mount')));
 await p.locator('#nf-admin-trigger').click();await p.waitForFunction(()=>document.querySelector('#nf-relay-status').textContent.includes('Aucune'));
 assert.equal(await p.locator('#nf-cfg-mode').inputValue(),'worker');assert.equal(await p.locator('#nf-cfg-worker').inputValue(),'https://worker.example.invalid');
 await p.locator('#nf-cfg-mode').selectOption('koha');await p.locator('#nf-cfg-api-key').fill('PMKTEST-SECRET-NOT-REAL');
 await p.locator('#nf-admin-test').click();await p.waitForFunction(()=>document.querySelector('#nf-admin-message').textContent.includes('Enregistrez d’abord'));assert.equal(requests.filter(r=>r.method==='PUT').length,0);
 await p.locator('#nf-admin-save').click();await p.waitForFunction(()=>writes.length===1);assert.equal(storedKey,'PMKTEST-SECRET-NOT-REAL');assert.equal(await p.locator('#nf-cfg-api-key').inputValue(),'');
 const saved=await p.evaluate(()=>writes[0].config);assert.equal(saved.nedapApiKey,'');assert.equal(saved.connectionMode,'koha');assert.deepEqual(saved.customPersonal,{keep:17});assert.equal(saved.workerUrl,'https://worker.example.invalid');assert.equal(saved.title,'Mon compteur');
 await p.waitForFunction(()=>document.querySelector('#nf-entrees').textContent==='42');assert(requests.filter(r=>r.method==='GET').every(r=>!r.url.includes('SECRET')&&!r.url.includes('api.libnet')));rows.push({name:'Explicit relay opt-in stores key only in dedicated server request and preserves personal and legacy settings',passed:true});
 await p.locator('#nf-admin-save').click();await p.waitForFunction(()=>writes.length===2);assert.equal(storedKey,'PMKTEST-SECRET-NOT-REAL');assert(!JSON.parse(requests.filter(r=>r.method==='PUT').at(-1).body).apiKey);
 await p.locator('#nf-chart-toggle').click();await p.locator('#nf-chart-range').selectOption('365');await p.waitForFunction(()=>document.querySelectorAll('#nf-chart-content tbody tr').length===365);assert(requests.some(r=>r.url.includes('/counts?')&&r.url.includes('period=DAY')));rows.push({name:'Blank key preserves server credential and annual chart uses same-origin relay without a browser secret',passed:true});
 failSave=true;await p.locator('#nf-cfg-title').fill('Brouillon concurrent');await p.locator('#nf-admin-save').click();await p.waitForFunction(()=>document.querySelector('#nf-admin-message').textContent.includes('modifiée ailleurs'));assert.equal(await p.evaluate(()=>writes.length),2);assert.equal(await p.locator('#nf-cfg-title').inputValue(),'Brouillon concurrent');failSave=false;
 failCounts=true;await p.locator('#nf-refresh-button').click();await p.waitForFunction(()=>document.querySelector('#nf-error-message').textContent.includes('indisponible'));assert.equal(await p.locator('#nf-entrees').innerText(),'42');assert.equal(await p.locator('#nf-refresh-button').isDisabled(),false);rows.push({name:'Revision conflict keeps draft; provider failure retains displayed counts and restores refresh action',passed:true});
 await p.locator('#nf-relay-clear').click();await p.waitForFunction(()=>document.querySelector('#nf-admin-message').textContent.includes('Clé serveur effacée'));assert.equal(storedKey,'');assert.deepEqual(errors,[]);rows.push({name:'Explicit confirmed removal clears only server credential',passed:true});
 console.log(rows.map(r=>'PASS '+r.name).join('\n'));await p.close();
}catch(error){rows.push({passed:false,error:error.stack});throw error;}finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/nedap-widget.json'),JSON.stringify({kind:'Local browser fixtures; no provider account',rows},null,2)+'\n');}})().catch(e=>{console.error(e);process.exitCode=1;});
