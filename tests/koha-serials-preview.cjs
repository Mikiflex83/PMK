// Read-only validation of the Serials configuration preview on real local Koha.
const {launch,ROOT}=require('./lib/koha.cjs');
const fs=require('node:fs');
const assert=require('node:assert/strict');

(async()=>{
 const h=await launch({offlineVendors:true}),page=h.page,rows=[];
 try{
  await h.goto('/cgi-bin/koha/serials/serials-edit.pl?subscriptionid='+h.fixtures.subscription+'&serstatus=1,3,7');
  const beforeRequests=h.requests.length;
  const before=await page.evaluate(()=>[...document.querySelectorAll('input,select,textarea')].map(node=>({name:node.name,id:node.id,value:node.value,checked:node.checked})));
  assert.equal(await page.evaluate(()=>PMKConfig.openAdmin('serials-tracking')),true);
  const overlay=page.locator('#pmk-config-overlay');
  await overlay.getByText(/Aperçu en lecture seule|Aperçu de configuration/).waitFor();
  const preview=overlay.locator('.pmk-serials-preview');
  const text=await preview.innerText();
  assert.match(text,/préconfiguration\(s\) active\(s\)/);
  assert.match(text,/champ\(s\) protégé\(s\)/);
  assert.match(text,/aucun champ n’est rempli|bilan des cibles reste partiel/);
  const tableRows=await preview.locator('tbody tr').count();
  assert(tableRows>0,'Configured receiving actions are listed');
  const effects=await preview.locator('tbody tr td:last-child').allTextContents();
  assert(effects.every(Boolean));
  const after=await page.evaluate(()=>[...document.querySelectorAll('input,select,textarea')].filter(node=>!node.closest('#pmk-config-overlay')).map(node=>({name:node.name,id:node.id,value:node.value,checked:node.checked})));
  assert.deepEqual(after,before);
  assert(!h.requests.slice(beforeRequests).some(request=>request.writeCount>0||['POST','PUT','PATCH','DELETE'].includes(request.method)&&!request.path.includes('/documents/')));
  rows.push({name:'Serials preview lists active automations, protected fields and partial target coverage without modifying Koha',passed:true,evidence:{tableRows,effects:[...new Set(effects)]}});
  console.log('PASS '+rows[0].name);
 }catch(error){rows.push({name:'Serials preview',passed:false,error:error.stack,pageErrors:h.pageErrors});throw error;}
 finally{
  fs.writeFileSync(ROOT+'/tests/validation/koha-serials-preview.json',JSON.stringify({kind:'Real local Koha 25.11 serials receiving page and PMK configuration preview; read only',rows},null,2)+'\n');
  await h.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
