// End-to-end restoration through the native PMK API, restricted to one synthetic item.
const {launch,ROOT,BASE}=require('./lib/koha.cjs');const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const h=await launch({offlineVendors:true}),p=h.page,item=h.fixtures.items.deleted,rows=[];try{
 assert(item.barcode.startsWith('PMKTEST-'));
 await h.configure('internal-pages-tools',{pageOptions:{'restore-deleted-items':{runtime:{allowedUsernames:[],patronCardnumber:h.fixtures.patrons.adult.card,libraryId:'PMK_A',reportIdBarcode:h.fixtures.reports['138-restauration-codes-barres.sql'],reportIdDates:h.fixtures.reports['138-restauration-dates.sql']}}}});
 let existing=await h.context.request.get(BASE+'/api/v1/items/'+item.id);
 if(existing.status()===200){assert.equal((await existing.json()).external_id,item.barcode);const deletion=await h.context.request.delete(BASE+'/api/v1/items/'+item.id);assert.equal(deletion.status(),204,'Native DELETE /items/'+item.id);}else assert.equal(existing.status(),404,'Only an existing or previously deleted synthetic item is allowed');
 assert.equal((await h.context.request.get(BASE+'/api/v1/items/'+item.id)).status(),404);
 const e0=h.pageErrors.length,http0=h.httpErrors.length;
 await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=restore-deleted-items');
 await p.locator('#uds-auth-status').filter({hasText:'accès autorisé'}).waitFor();
 assert((await p.locator('#uds-hint').innerText()).includes(h.fixtures.patrons.adult.card));
 await p.locator('#uds-barcode-input').fill(item.barcode);await p.locator('#uds-search').click();
 const row=p.locator('#uds-table-body tr').filter({hasText:item.barcode});await row.waitFor();
 await row.locator('[data-action="restore"]').click();
 await p.getByRole('alertdialog').getByRole('button',{name:'Confirmer',exact:true}).click();
 await row.locator('[data-action="issue"]').waitFor({state:'visible'});
 await p.waitForFunction(barcode=>[...document.querySelectorAll('#uds-table-body tr')].find(r=>r.textContent.includes(barcode))?.querySelector('[data-action="issue"]')?.disabled===false,item.barcode,{timeout:60000});
 const after=await h.context.request.get(BASE+'/api/v1/items/'+item.id);assert.equal(after.status(),200);const data=await after.json();assert.equal(data.external_id,item.barcode);assert.equal(Number(data.biblio_id),item.biblio);
 assert.deepEqual(h.pageErrors.slice(e0),[]);assert.deepEqual(h.httpErrors.slice(http0),[]);
 rows.push({passed:true,item:item.id,barcode:item.barcode,plugin:'PimpMyKoha native restoration'});console.log('PASS native deletion, SQL lookup, native PMK restoration and API identity verification');
 }catch(error){rows.push({passed:false,error:error.stack,pageErrors:h.pageErrors,httpErrors:h.httpErrors,text:(await p.locator('#pmk138-page-host').innerText().catch(()=>''))?.slice(-9000)});console.error(error);process.exitCode=1;}
 finally{fs.writeFileSync(ROOT+'/tests/validation/koha-restoration.json',JSON.stringify({kind:'Real Koha + native PMK restoration, synthetic item only',rows},null,2)+'\n');await h.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
