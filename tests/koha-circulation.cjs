// Native forms and native API assertions on PMKTEST fixtures only.
const {launch,ROOT,BASE}=require('./lib/koha.cjs');const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const h=await launch({offlineVendors:true}),p=h.page,f=h.fixtures,rows=[];
 async function checkouts(){const r=await h.context.request.get(BASE+'/api/v1/patrons/'+f.patrons.adult.id+'/checkouts?_per_page=500');assert.equal(r.status(),200);return r.json();}
 async function submitBarcode(barcode){await p.locator('input[name=\"barcode\"]:visible').fill(barcode);await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded',timeout:90000}),p.locator('input[name=\"barcode\"]:visible').press('Enter')]);await h.ready();await h.settle();}
 async function check(name,fn){const e=h.pageErrors.length,http=h.httpErrors.length;try{const evidence=await fn();assert.deepEqual(h.pageErrors.slice(e),[]);assert.deepEqual(h.httpErrors.slice(http),[]);rows.push({name,passed:true,evidence});console.log('PASS '+name);}catch(error){rows.push({name,passed:false,error:error.stack,pageErrors:h.pageErrors.slice(e),httpErrors:h.httpErrors.slice(http),text:(await p.locator('main').innerText()).slice(0,9000)});console.log('FAIL '+name+' '+error.message.slice(0,200));}fs.writeFileSync(ROOT+'/tests/validation/koha-circulation.json',JSON.stringify({kind:'Real Koha native circulation forms with PMK plugin enabled',rows},null,2)+'\n');}
 try{
 await check('Native checkout remains operational with all plugin modules enabled',async()=>{
  assert(!(await checkouts()).some(x=>Number(x.item_id)===f.items.available.id),'Fixture starts without a loan');
  await h.goto('/cgi-bin/koha/circ/circulation.pl?borrowernumber='+f.patrons.adult.id);await submitBarcode(f.items.available.barcode);
  const loans=await checkouts(),loan=loans.find(x=>Number(x.item_id)===f.items.available.id);assert(loan,'Native checkout persisted');return {checkout:loan.checkout_id,item:loan.item_id,patron:loan.patron_id};
 });
 await check('Native renewal updates the actual checkout',async()=>{
  const before=(await checkouts()).find(x=>Number(x.item_id)===f.items.available.id);assert(before);
  await h.goto('/cgi-bin/koha/circ/renew.pl');await submitBarcode(f.items.available.barcode);
  const after=(await checkouts()).find(x=>Number(x.item_id)===f.items.available.id);assert(after);assert.equal(Number(after.renewals_count),Number(before.renewals_count)+1);return {renewals:after.renewals_count};
 });
 await check('Native checkin removes the actual checkout',async()=>{
  await h.goto('/cgi-bin/koha/circ/returns.pl');await submitBarcode(f.items.available.barcode);
  assert(!(await checkouts()).some(x=>Number(x.item_id)===f.items.available.id));return {item:f.items.available.id,activeCheckout:false};
 });
 await check('Transfer shortcut prefills the native form without automatically transferring',async()=>{
  await h.goto('/cgi-bin/koha/catalogue/detail.pl?biblionumber='+f.biblios.available);
  const start=h.requests.length;await p.locator('#holdings_table').getByRole('button',{name:/Transf[eé]r|Transfer/i}).first().click();
  await p.waitForURL('**/circ/branchtransfers.pl*',{timeout:90000});await h.ready();await h.settle();
  assert.equal(await p.locator('#barcode').inputValue(),f.items.available.barcode);
  assert(!h.requests.slice(start).some(x=>x.method!=='GET'&&/branchtransfers\.pl|\/transfers(?:\/|$)/.test(x.path)));return {barcode:await p.locator('#barcode').inputValue(),automaticSubmission:false};
 });
 }finally{await h.close();}if(rows.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
