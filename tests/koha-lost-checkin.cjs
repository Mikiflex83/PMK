// The native Koha checkin happens before PMK handles the final not-for-loan status.
const {launch,ROOT,BASE}=require('./lib/koha.cjs');const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const h=await launch({offlineVendors:true}),p=h.page,item=h.fixtures.items.lost,rows=[];let before;
 async function read(){const r=await h.context.request.get(BASE+'/api/v1/items/'+item.id);assert.equal(r.status(),200);return r.json();}
 async function set(values){const r=await h.context.request.put(BASE+'/api/v1/biblios/'+item.biblio+'/items/'+item.id,{data:values});assert.equal(r.status(),200);}
 try{
  before=await read();assert.equal(before.external_id,item.barcode);
  await h.configure('lost-found-checkin-status',{enabled:true,unknownLostAction:'handle',unknownNotLoanAction:'ask',notLoanRules:[{value:'1',description:'Test status',enabled:true,action:'ask'}]});
  for(const choice of ['keep','available']){
   await set({lost_status:1,not_for_loan_status:1});
   await h.goto('/cgi-bin/koha/circ/returns.pl');const e0=h.pageErrors.length,requests=h.requests.length;
   await p.locator('input[name="barcode"]:visible').fill(item.barcode);
   await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded',timeout:90000}),p.locator('input[name="barcode"]:visible').press('Enter')]);await h.ready();
   const card=p.locator('.pmk051-card');await card.waitFor({timeout:30000});
   const native=await read();assert.equal(Number(native.lost_status),0,'Native Koha cleared LOST first');assert.equal(Number(native.not_for_loan_status),1,'PMK waits for the agent');
   assert(!h.requests.slice(requests).some(r=>r.method==='PUT'&&r.path.includes('/items/')),'No automatic status write in ask mode');
   if(choice==='keep')await card.getByRole('button',{name:/Conserver ce statut|Keep this status/}).click();
   else {await card.getByRole('button',{name:/Remettre en circulation|Make available for loan/}).click();await p.waitForFunction(()=>document.querySelector('.pmk051-card')?.classList.contains('alert-success'),null,{timeout:30000});}
   const after=await read();assert.equal(Number(after.not_for_loan_status),choice==='keep'?1:0);assert.equal(Number(after.lost_status),0);assert.equal(after.external_id,item.barcode);assert.deepEqual(h.pageErrors.slice(e0),[]);rows.push({choice,passed:true,nativeLost:0,notForLoan:after.not_for_loan_status});console.log('PASS lost checkin '+choice);
  }
 }catch(error){rows.push({passed:false,error:error.stack,pageErrors:h.pageErrors,httpErrors:h.httpErrors,text:(await p.locator('main').innerText()).slice(-7000)});console.error(error.message);process.exitCode=1;}
 finally{if(before)await set({lost_status:before.lost_status,not_for_loan_status:before.not_for_loan_status});fs.writeFileSync(ROOT+'/tests/validation/koha-lost-checkin.json',JSON.stringify({kind:'Real native Koha lost-item checkin followed by explicit PMK agent choices',rows},null,2)+'\n');await h.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
