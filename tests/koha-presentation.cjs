// Real local Koha reads. No catalogue, patron or circulation records are changed.
const {launch,ROOT}=require('./lib/koha.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const h=await launch({offlineVendors:true}),p=h.page,rows=[];
 async function check(name,fn){
  const e=h.pageErrors.length;
  try{const evidence=await fn();assert.deepEqual(h.pageErrors.slice(e),[]);rows.push({name,passed:true,evidence});console.log('PASS '+name);}
  catch(error){rows.push({name,passed:false,error:error.stack});throw error;}
 }
 try{
  await check('Catalogue result cards load from the actual Koha item API',async()=>{
   await h.configure('search-results-master',{enabled:true,performance:{apiPerPage:2,maxPages:20,concurrentRequests:1}});
   await h.goto('/cgi-bin/koha/catalogue/search.pl?q=PMKTEST');
   await p.locator('.kxri-item').first().waitFor({timeout:60000});
   await p.waitForFunction(()=>Array.from(document.querySelectorAll('#bookbag_form tr[id^=row]')).every(row=>row.dataset.kxriDone==='1'),null,{timeout:60000});
   assert.equal(await p.locator('.kxri-retry').count(),0);
   const cards=await p.locator('.kxri-item').count();assert(cards>0);
   const calls=h.requests.filter(r=>/\/api\/v1\/biblios\/\d+\/items$/.test(r.path));assert(calls.length>0);
   return {cards,itemApiRequests:calls.length};
  });
  await check('Efficiency indicators explain item API coverage on actual catalogue results',async()=>{
   await h.configure('efficiency-indicators',{enabled:true,api:{perPage:10,maxPages:20,useStrings:false},sources:{domainMode:'none',fallbackToBiblioCreationDate:false}});
   await h.goto('/cgi-bin/koha/catalogue/search.pl?q=PMKTEST');
   const coverage=p.locator('.pmk099-coverage');await coverage.first().waitFor({timeout:60000});
   const sources=await coverage.allTextContents();assert(sources.length>0 && sources.every(text=>/(?:exemplaire|item)\(s\)/.test(text)&&text.includes('API')));
   const descriptions=await p.locator('.pmk-099-global-indicator').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
   assert(descriptions.length>0 && descriptions.every(text=>text && !text.includes('NaN')));
   return {sources,accessibleDescriptions:descriptions.length};
  });
  await check('Loan timeline explains its native table scope on actual circulation history',async()=>{
   await h.configure('loan-history-timeline',{enabled:true,enrichWithApi:true,showTransfers:false,showAcquisition:false,showLastSeen:false});
   await h.goto('/cgi-bin/koha/catalogue/issuehistory.pl?biblionumber='+h.fixtures.biblios.overdue);
   const source=p.locator('.pmk-lht-provenance');await source.waitFor({timeout:60000});await source.locator('summary').click();
   const text=await source.innerText();assert.match(text,/pagination/);assert.match(text,/API/);assert(await p.locator('#table_issues tbody tr').count()>0);
   return {biblio:h.fixtures.biblios.overdue,source:text};
  });
 }finally{
  fs.writeFileSync(ROOT+'/tests/validation/koha-presentation.json',JSON.stringify({kind:'Real local Koha catalogue and timeline reads',rows},null,2)+'\n');
  await h.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
