// Reject a native hold form locally. No hold is submitted or created.
const {launch,ROOT}=require('./lib/koha.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const h=await launch({offlineVendors:true}),p=h.page,rows=[];
 try{
  await h.configure('hold-submit-guard',{enabled:true,buttonSelector:'#hold_grp_btn',submissionMode:'navigation'});
  await h.goto('/cgi-bin/koha/reserve/request.pl?biblionumber='+h.fixtures.biblios.available+'&borrowernumber='+h.fixtures.patrons.adult.id);
  const form=p.locator('#hold-request-form'),button=p.locator('#hold_grp_btn');await button.waitFor();
  await p.route('**/reserve/request.pl*',r=>r.request().method()==='GET'?r.continue():r.abort());
  await p.route('**/api/v1/holds**',r=>r.request().method()==='GET'?r.continue():r.abort());
  const alerts=[];p.on('dialog',async d=>{alerts.push(d.message());await d.accept();});
  await form.evaluate(f=>{f.noValidate=true;const next=f.querySelector('#requestany');if(next)next.checked=true;for(const select of f.querySelectorAll('select[id^="pickup"]'))select.selectedIndex=-1;});
  const before=h.requests.length,caption=await button.innerText();await button.click();
  await p.waitForFunction(()=>!document.querySelector('#hold_grp_btn').disabled);
  assert(alerts.length>0,'Native Koha validation explains why it refused the request');
  assert.equal(await button.innerText(),caption);
  const writes=h.requests.slice(before).filter(r=>r.method!=='GET'&&(/reserve\/request\.pl|\/holds(?:\/|$)/.test(r.path)));
  assert.deepEqual(writes,[],'No reservation write after failed validation');assert.deepEqual(h.pageErrors,[]);
  rows.push({name:'Native Koha validation rejects a missing pickup location and PMK restores the button',passed:true,evidence:{alerts:alerts.length,reservationWrites:writes.length}});
  console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{fs.writeFileSync(ROOT+'/tests/validation/koha-hold-validation.json',JSON.stringify({kind:'Real local Koha form validation without submission',rows},null,2)+'\n');await h.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
