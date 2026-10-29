// Real mounted pages, real Koha API and native SQL storage; Firebase blocked; no mocked business responses.
const {launch,ROOT}=require('./lib/koha.cjs');const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{const h=await launch({offlineVendors:true});const p=h.page,rows=[];
 try{
 await h.configure('internal-pages-tools',{pageOptions:{transfers:{settings:{reportId:h.fixtures.reports['138-transferts.sql']}},serials:{settings:{reportId:h.fixtures.reports['138-periodiques.sql'],loadOnOpen:false}},biblios:{settings:{signatureReportId:h.fixtures.reports['138-signatures-notices.sql'],enableBnf:false}},'restore-deleted-items':{runtime:{allowedUsernames:[],reportIdBarcode:h.fixtures.reports['138-restauration-codes-barres.sql'],reportIdDates:h.fixtures.reports['138-restauration-dates.sql']}},'overdue-management':{runtime:{reportId:h.fixtures.reports['138-suivi-retards-generique.sql']}}}});
 await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=hub');
 const manifest=await p.evaluate(()=>PMKPages.manifest);assert.equal(manifest.length,19);
 for(const item of manifest){
  if(process.env.PMK_TEST_FILTER&&!item.id.includes(process.env.PMK_TEST_FILTER))continue;
  const e0=h.pageErrors.length,http0=h.httpErrors.length,w0=h.requests.length,start=Date.now();
  try{
   await p.evaluate(id=>{history.replaceState(null,'','?pmk_page='+id);return PMKPages.refresh()},item.id);
   await p.waitForFunction(id=>['mounted','error','denied'].includes(PMKPages.getStatus(id).state),item.id,{timeout:60000});
   await h.settle();
   const state=await p.evaluate(id=>({status:PMKPages.getStatus(id),title:document.title,text:document.querySelector('#pmk138-page-host')?.innerText.slice(0,8000),buttons:[...document.querySelectorAll('#pmk138-page-host button')].map(x=>({text:x.textContent,id:x.id,title:x.title})),inputs:[...document.querySelectorAll('#pmk138-page-host input,#pmk138-page-host select')].map(x=>({id:x.id,type:x.type,name:x.name})),shadow:document.querySelector('#doodle-koha-app')?.shadowRoot?.innerHTML.slice(-1000)}),item.id);
   assert.equal(state.status.state,'mounted');assert.equal(await p.locator('#pmk138-page-host').count(),1);
   const hasFacts=await p.evaluate(id=>id!=='authorities'&&!!PMKPagesSettings.catalog[id],item.id);assert.equal(await p.locator('.pmk138-page-information').count(),hasFacts?1:0);if(hasFacts){await p.locator('.pmk138-page-information summary').click();assert((await p.locator('.pmk138-page-information').innerText()).includes('Prérequis'));assert((await p.locator('.pmk138-page-information a').getAttribute('href')).includes('pmk_page='+item.id));}
   if(item.id==='xslt-assistant'){
    const facts=p.locator('.pmk138-page-information');
    assert.equal(await p.locator('.pmk135-overlay .pmk138-page-information').count(),1);
    await p.getByRole('button',{name:'Options techniques',exact:true}).click();
    await facts.locator('summary').click();await facts.locator('summary').click();
    await p.getByRole('button',{name:'Fermer',exact:true}).click();
    assert.equal(await p.locator('.pmk135-overlay').count(),0);
    await facts.locator('summary').click();
    await p.getByRole('button',{name:'Ouvrir l’éditeur XSLT',exact:true}).click();
    assert.equal(await p.locator('.pmk135-overlay .pmk138-page-information').count(),1);
    await facts.locator('summary').click();
    await facts.getByRole('button',{name:'Vérifier les réglages et les rapports'}).click();
    await p.waitForFunction(()=>document.querySelector('.pmk138-page-information').textContent.includes('Dernière vérification dans cette session'));
   }
   assert.deepEqual(h.pageErrors.slice(e0),[],'JavaScript errors');
   const writes=h.requests.slice(w0).filter(r=>r.method!=='GET'&&r.path.startsWith('/api/v1/')&&!r.path.includes('/documents/')&&(r.dataAction===undefined||r.writeCount>0));
   assert.deepEqual(writes,[],'Opening does not modify Koha business data');
   rows.push({id:item.id,passed:true,ms:Date.now()-start,state,pageErrors:h.pageErrors.slice(e0),httpErrors:h.httpErrors.slice(http0)});
   console.log('PASS '+item.id+' '+(Date.now()-start)+'ms HTTP errors '+(h.httpErrors.length-http0));
  }catch(e){rows.push({id:item.id,passed:false,error:e.stack,pageErrors:h.pageErrors.slice(e0),httpErrors:h.httpErrors.slice(http0)});console.log('FAIL '+item.id+' '+e.message.slice(0,160));}
  fs.writeFileSync(ROOT+'/tests/validation/koha-internal-pages.json',JSON.stringify({kind:'Real Koha internal page opening and read APIs. Business actions tested separately.',rows,blocked:h.blocked},null,2)+'\n');
  await p.evaluate(()=>{history.replaceState(null,'','?pmk_page=hub');return PMKPages.refresh()});
 }
 }finally{await h.close();}if(rows.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
