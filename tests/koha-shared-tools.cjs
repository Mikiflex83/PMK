// Native Koha SQL storage exercises shared storage and UI; no production services are contacted.
const {launch,ROOT}=require('./lib/koha.cjs');const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const h=await launch({offlineVendors:true}),p=h.page,rows=[],suffix=Date.now().toString();
 p.on('dialog',dialog=>dialog.type()==='prompt'?dialog.accept('PMKTEST correction justifiée'):dialog.accept());
 async function sdkCall(task,args){return p.evaluate(async({task,args})=>{const s=window.PMKNativeData,db=s.createDatabase(args.namespace||'journal');if(task==='set'){await s.setDoc(s.doc(db,args.collection,args.id),args.data);return true}if(task==='get'){const d=await s.getDoc(s.doc(db,args.collection,args.id));return d.exists()?d.data():null}if(task==='list'){const d=await s.getDocs(s.collection(db,args.collection));return d.docs.map(x=>({id:x.id,...x.data()}))}}, {task,args});}
 async function check(name,fn){const e=h.pageErrors.length;try{const evidence=await fn();assert.deepEqual(h.pageErrors.slice(e),[]);rows.push({name,passed:true,evidence});console.log('PASS '+name);}catch(error){rows.push({name,passed:false,error:error.stack,pageErrors:h.pageErrors.slice(e),text:(await p.locator('#pmk138-page-host').innerText().catch(()=>''))?.slice(0,2000)});console.log('FAIL '+name+' '+error.message.slice(0,240));}fs.writeFileSync(ROOT+'/tests/validation/koha-shared-tools.json',JSON.stringify({kind:'Real Koha plugin with native SQL storage; Firebase blocked',rows},null,2)+'\n');}
 try{
 await check('Journal CRUD respects custom collections and retains action history',async()=>{
  const entries='pmk_recipe_entries_'+suffix,logs='pmk_recipe_logs_'+suffix;
  await h.configure('internal-pages-tools',{pageOptions:{'action-journal':{runtime:{entriesCollection:entries,logsCollection:logs,defaultAuthor:'PMKTEST agent'}}}});
  await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=action-journal');
  await p.waitForFunction(()=>window.pmkJournalData?.colEntries);
  assert.equal(await p.locator('#author').inputValue(),'PMKTEST agent');
  await p.locator('#date').fill('2026-10-18');await p.locator('#desc').fill('PMKTEST création €');
  await p.locator('#entryForm').getByRole('button',{name:"Ajouter l'entrée",exact:true}).click();
  let row=p.locator('#journalTable tbody tr').filter({hasText:'PMKTEST création €'});await row.waitFor();
  const id=await row.locator('.edit').getAttribute('data-id');assert.equal((await sdkCall('get',{collection:entries,id})).desc,'PMKTEST création €');
  await row.locator('.edit').click();await p.getByRole('button',{name:'Enregistrer la modification',exact:true}).waitFor();await p.locator('#desc').fill('PMKTEST modification €');
  await p.locator('#entryForm').getByRole('button',{name:'Enregistrer la modification',exact:true}).click();
  row=p.locator('#journalTable tbody tr').filter({hasText:'PMKTEST modification €'});await row.waitFor();
  assert.equal((await sdkCall('get',{collection:entries,id})).desc,'PMKTEST modification €');
  await row.locator('.delete').click();await row.waitFor({state:'detached'});
  assert.equal((await sdkCall('get',{collection:entries,id})).deleted,true);
  await p.getByRole('button',{name:'Afficher les supprimées',exact:true}).click();
  row=p.locator('#journalTable tbody tr').filter({hasText:'PMKTEST modification €'});await row.waitFor();await row.locator('.restore').click();await row.waitFor({state:'detached'});
  assert.equal((await sdkCall('get',{collection:entries,id})).deleted,false);
  let history=[];for(let i=0;i<50;i++){history=await sdkCall('list',{collection:logs});if(history.length>=4)break;await p.waitForTimeout(100);}assert(history.length>=4,'Creation, update, deletion and restoration are logged');assert(history.filter(x=>x.action!=='Création').every(x=>x.reason==='PMKTEST correction justifiée'));
  assert.equal(await sdkCall('get',{collection:'entries',id}),null,'Custom journal does not modify default entries');return {entryId:id,history:history.length,entriesCollection:entries};
 });
 await check('Attendance page and floating counter share the same persisted counts',async()=>{
  const locations='pmk_recipe_locations_'+suffix,counts='pmk_recipe_counts_'+suffix,id='pmk-place';
  await h.configure('attendance-mediabus-mini',{locationsCollection:locations,countsCollection:counts,defaultLocationId:id,autoOpen:false,branchNames:'',step:1});
  await sdkCall('set',{namespace:'attendance',collection:locations,id,data:{name:'PMKTEST accueil',active:true}});
  await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=attendance-counter');
  await p.locator('#freq-selectLocation option[value="'+id+'"]').waitFor({state:'attached'});
  await p.locator('#freq-selectLocation').selectOption(id);
  await p.locator('#freq-incAdults').click();await p.waitForFunction(()=>document.getElementById('freq-countAdults')?.textContent==='1');
  const date=await p.locator('#freq-inputDate').inputValue();
  let data=await sdkCall('list',{namespace:'attendance',collection:counts});assert.equal(data.length,1);assert.equal(data[0].adults,1);assert.equal(data[0].adultTimestamps.length,1);
  await p.evaluate(()=>PMKAttendance.open());await p.locator('#freq-selectLocationMini option[value="'+id+'"]').waitFor({state:'attached'});
  await p.locator('#freq-selectLocationMini').selectOption(id);await p.locator('#freq-inputDateMini').fill(date);await p.locator('#freq-inputDateMini').dispatchEvent('change');
  await p.waitForFunction(()=>document.getElementById('freq-countAdultsMini')?.textContent==='1');
  await p.locator('#freq-incAdultsMini').click();await p.waitForFunction(()=>document.getElementById('freq-countAdultsMini')?.textContent==='2');
  data=await sdkCall('list',{namespace:'attendance',collection:counts});assert.equal(data.length,1);assert.equal(data[0].adults,2);assert.equal(data[0].adultTimestamps.length,2);
  await p.evaluate(()=>PMKAttendance.hide('test'));
  await p.locator('#freq-btnUpdate').click();await p.waitForFunction(()=>document.getElementById('freq-countAdults')?.textContent==='2');
  return {date,document:data[0].id,adults:data[0].adults};
 });
 }finally{await h.close();}if(rows.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
