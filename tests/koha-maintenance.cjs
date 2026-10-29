// Read and analyse actual Koha rows. Never execute maintenance bulk mutations.
const {launch,ROOT}=require('./lib/koha.cjs');const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const h=await launch({offlineVendors:true}),p=h.page,rows=[];
 try{
 await h.configure('internal-pages-tools',{pageOptions:{transfers:{settings:{reportId:h.fixtures.reports['138-transferts.sql']}},serials:{settings:{reportId:h.fixtures.reports['138-periodiques.sql'],loadOnOpen:false}},biblios:{settings:{signatureReportId:h.fixtures.reports['138-signatures-notices.sql'],enableBnf:false}}}});
 await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=hub');
 const cases=[['reservations','dqr-refresh','dqr-status'],['loans','dql-refresh','dql-status'],['transfers','dqtr-refresh','dqtr-status'],['serials','load','dqs-status'],['patrons','load','dqp-status'],['items','dqi-load','dqi-status'],['biblios','load','dqb-status']];
 for(const [id,button,status,label]of cases){if(process.env.PMK_TEST_FILTER&&!id.includes(process.env.PMK_TEST_FILTER))continue;
  const e0=h.pageErrors.length,http0=h.httpErrors.length,start=h.requests.length,clock=Date.now();
  try{
   await p.evaluate(id=>{history.replaceState(null,'','?pmk_page='+id);return PMKPages.refresh()},id);
   const host=p.locator('.pmk138-app-container');
   await(button?host.locator('#'+button):host.getByRole('button',{name:label,exact:true})).click();
   await p.waitForFunction(status=>{const e=document.getElementById(status);return e&&e.textContent.trim()&&!e.classList.contains('loading')},status,{timeout:240000});
   await h.settle();
   const state=await host.evaluate((node,status)=>({status:document.getElementById(status)?.textContent,kind:document.getElementById(status)?.className,text:node.innerText.slice(0,16000),tables:[...node.querySelectorAll('table')].map(t=>({id:t.id,rows:t.rows.length})),buttons:[...node.querySelectorAll('button')].map(n=>({id:n.id,text:n.textContent.trim()}))}),status);
   assert(!/\berror\b|\bdanger\b/.test(state.kind),state.status);
   const requests=h.requests.slice(start).filter(r=>!r.path.includes('/static/'));
   assert(requests.some(r=>r.path.startsWith('/api/v1/')||r.path.endsWith('/svc/report')),'Reads real Koha data');
   assert(!requests.some(r=>r.method!=='GET'&&r.path.startsWith('/api/v1/')&&!r.path.includes('/documents/')&&(r.dataAction===undefined||r.writeCount>0)),'Analysis is read only');
   assert.deepEqual(h.pageErrors.slice(e0),[]);
   assert.deepEqual(h.httpErrors.slice(http0),[]);
   rows.push({id,passed:true,ms:Date.now()-clock,state,requests});console.log('PASS '+id+' '+state.status+' '+(Date.now()-clock)+'ms');
  }catch(e){rows.push({id,passed:false,error:e.stack,html:(await p.locator('#pmk138-page-host').innerText()).slice(0,1500),requests:h.requests.slice(start),pageErrors:h.pageErrors.slice(e0),httpErrors:h.httpErrors.slice(http0)});console.log('FAIL '+id+' '+e.message.slice(0,250));}
  fs.writeFileSync(ROOT+'/tests/validation/koha-maintenance.json',JSON.stringify({kind:'Real Koha read and analysis workflows on native fixtures and KTD sample records',rows},null,2)+'\n');
  await p.evaluate(()=>{history.replaceState(null,'','?pmk_page=hub');return PMKPages.refresh()});
 }
 }finally{await h.close();}if(rows.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
