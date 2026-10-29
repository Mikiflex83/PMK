// Business assertions against the dedicated local Koha. Only PMKTEST fixtures may be edited.
const {launch,ROOT,BASE}=require('./lib/koha.cjs');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const h=await launch({offlineVendors:true});const {page:p,fixtures:f}=h,rows=[];
 const itemPath=id=>BASE+'/api/v1/items/'+id;
 async function readItem(id){const r=await h.context.request.get(itemPath(id));assert.equal(r.status(),200);return r.json();}
 async function check(name,fn){if(process.env.PMK_TEST_FILTER&&!name.includes(process.env.PMK_TEST_FILTER))return;let e=h.pageErrors.length,http=h.httpErrors.length;try{const evidence=await fn();assert.deepEqual(h.pageErrors.slice(e),[],'No browser error');assert.deepEqual(h.httpErrors.slice(http),[],'No HTTP error');rows.push({name,passed:true,evidence,pageErrors:h.pageErrors.slice(e),httpErrors:h.httpErrors.slice(http)});console.log('PASS '+name);}catch(error){rows.push({name,passed:false,error:error.stack,pageErrors:h.pageErrors.slice(e),httpErrors:h.httpErrors.slice(http)});console.error('FAIL '+name+': '+error.message);await p.screenshot({path:ROOT+'/tests/validation/koha-business-failure-'+rows.length+'.png'}).catch(()=>{});}fs.writeFileSync(ROOT+'/tests/validation/koha-business.json',JSON.stringify({kind:'Real Koha business actions on synthetic PMKTEST data',rows},null,2)+'\n');}
 try{
 await check('All module configurations available on home',async()=>{await h.goto('/cgi-bin/koha/mainpage.pl');const ids=await p.evaluate(()=>PMKConfig.listModules().map(x=>x.id));for(const id of ['patron-required-contact','multi-transfer','item-quick-edit']){if(!ids.includes(id)) console.log('MODULES',ids.join(','));assert(ids.includes(id),id+' is centrally configured');}assert.equal(new Set(ids).size,ids.length);return {count:ids.length};});
 await check('Quick item editing persists one field and preserves the other data',async()=>{
  const item=f.items.available,before=await readItem(item.id),newCallnumber='PMK RECETTE É '+Date.now();assert.equal(before.external_id,item.barcode);
  await h.goto('/cgi-bin/koha/catalogue/detail.pl?biblionumber='+item.biblio);
  await p.getByRole('button',{name:'Modifier Cote pour exemplaire '+item.id,exact:true}).click();
  await p.locator('#pmk145-content .pmk145-input').fill(newCallnumber);
  await p.locator('#pmk145-foot').getByRole('button',{name:'Enregistrer',exact:true}).click();
  await p.locator('#pmk145-toast.pmk145-ok').filter({hasText:'Exemplaire '+item.id+' : Cote'}).waitFor();
  const after=await readItem(item.id);assert.equal(after.callnumber,newCallnumber);
  const skipped=new Set(['callnumber','call_number_sort','timestamp','last_seen_date']);
  for(const key of Object.keys(before))if(!skipped.has(key))assert.deepEqual(after[key],before[key],'Unchanged '+key);
  // Restore through the same real UI, not a mocked endpoint.
  await p.getByRole('button',{name:'Modifier Cote pour exemplaire '+item.id,exact:true}).click();
  await p.locator('#pmk145-content .pmk145-input').fill(before.callnumber||'');
  await p.locator('#pmk145-foot').getByRole('button',{name:'Enregistrer',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('#pmk145-overlay')?.classList.contains('pmk145-hidden'));
  assert.equal((await readItem(item.id)).callnumber,before.callnumber);return {item:item.id,fieldsPreserved:Object.keys(before).filter(x=>!skipped.has(x)).length};
 });
 await check('Quick item editing honors the configured NOT_LOAN category',async()=>{
  await h.configure('item-quick-edit',{field_notforloan:true,va_notforloan:'NOT_LOAN'});
  await h.goto('/cgi-bin/koha/catalogue/detail.pl?biblionumber='+f.biblios.available);
  const start=h.requests.length;await p.getByRole('button',{name:'Modifier les statuts pour exemplaire '+f.items.available.id,exact:true}).click();
  await p.locator('#pmk145-content select').first().waitFor({state:'attached'});
  assert(h.requests.slice(start).some(r=>r.path.includes('/authorised_value_categories/NOT_LOAN/authorised_values')),'Uses configured category');
  assert(!h.requests.slice(start).some(r=>r.path.includes('/authorised_value_categories/statut/')),'No fallback to Dracénie category');
  await p.locator('#pmk145-foot').getByRole('button',{name:'Annuler',exact:true}).click();return {category:'NOT_LOAN'};
 });
 await check('Status editing writes and clears a native status without losing item data',async()=>{
  const item=f.items.available,before=await readItem(item.id);
  assert.equal(Number(before.not_for_loan_status),0);
  try{
   await h.configure('item-quick-edit',{field_notforloan:true,va_notforloan:'NOT_LOAN',allowed_notforloan:'',excluded_notforloan:''});
   await h.goto('/cgi-bin/koha/catalogue/detail.pl?biblionumber='+item.biblio);
   for(const value of ['1','0']){
    await p.getByRole('button',{name:'Modifier les statuts pour exemplaire '+item.id,exact:true}).click();
    await p.locator('#pmk145-content select').waitFor({state:'attached'});
    const label=await p.locator('#pmk145-content select option[value=\"'+value+'\"]').textContent();
    await p.locator('#pmk145-content .pmk145-combo-trigger').click();
    await p.locator('#pmk145-content').getByRole('option',{name:label,exact:true}).click();
    assert.equal(await p.locator('#pmk145-content select').inputValue(),value);
    await p.locator('#pmk145-foot').getByRole('button',{name:'Enregistrer',exact:true}).click();
    await p.waitForFunction(()=>document.querySelector('#pmk145-overlay')?.classList.contains('pmk145-hidden'));
    const after=await readItem(item.id);assert.equal(Number(after.not_for_loan_status),Number(value));assert.equal(Number(after.effective_not_for_loan_status),Number(value));
    for(const key of Object.keys(before))if(!['not_for_loan_status','effective_not_for_loan_status','timestamp'].includes(key))assert.deepEqual(after[key],before[key],'Preserved '+key);
   }
   return {item:item.id,statuses:[1,0]};
  }finally{
   const current=await readItem(item.id);
   if(current.not_for_loan_status!==before.not_for_loan_status){const restored=await h.context.request.put(BASE+'/api/v1/biblios/'+item.biblio+'/items/'+item.id,{data:{not_for_loan_status:before.not_for_loan_status}});assert.equal(restored.status(),200);}
  }
 });
 await check('Sensitive item edits are refused while the item is on loan',async()=>{
  await h.configure('item-quick-edit',{field_notforloan:true,va_notforloan:'NOT_LOAN'});
  const before=await readItem(f.items.loan.id),start=h.requests.length;
  await h.goto('/cgi-bin/koha/catalogue/detail.pl?biblionumber='+f.biblios.loan);
  await p.getByRole('button',{name:'Modifier les statuts pour exemplaire '+f.items.loan.id,exact:true}).click();
  await p.locator('#pmk145-content').filter({hasText:/prêt|loan/i}).waitFor();
  assert.equal(await p.locator('#pmk145-content select').count(),0,'No editable status during checkout');
  assert(!h.requests.slice(start).some(r=>r.method==='PUT'&&r.path.includes('/items/')));
  assert.deepEqual(await readItem(f.items.loan.id),before);return {item:f.items.loan.id,writeRequests:0};
 });
 await check('Copy action writes the clipboard and confirms the copied value in a toast',async()=>{
  await h.context.grantPermissions(['clipboard-read','clipboard-write']);
  await h.goto('/cgi-bin/koha/members/moremember.pl?borrowernumber='+f.patrons.adult.id);
  const actions=await p.locator('.pmk-copy-action').evaluateAll(nodes=>nodes.map(n=>({title:n.title,aria:n.getAttribute('aria-label'),source:n.outerHTML.slice(0,300)})));
  assert(actions.length,'Copy buttons exist');
  await p.locator('#patron-cardnumber').locator('..').locator('.pmk-copy-action').first().click();
  const toast=p.locator('.pmk-copy-toast').last();await toast.waitFor();assert((await toast.innerText()).includes(f.patrons.adult.card));
  assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),f.patrons.adult.card);return {value:f.patrons.adult.card};
 });
 }finally{await h.close();}if(rows.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
