// Native data engines exercised through their existing UI on real Koha.
const {launch,ROOT}=require('./lib/koha.cjs');const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const h=await launch({offlineVendors:true}),p=h.page,rows=[],suffix=Date.now().toString();let profile;const diagnostics=[];p.on('console',m=>{if(['error','warning'].includes(m.type()))diagnostics.push(m.text().slice(0,300));});
 async function poll(fn,arg){for(let i=0;i<80;i++){const v=await p.evaluate(fn,arg);if(v)return v;await p.waitForTimeout(100);}throw new Error('Persisted native data did not appear');}
 async function check(name,fn){const e=h.pageErrors.length;try{const evidence=await fn();assert.deepEqual(h.pageErrors.slice(e),[]);rows.push({name,passed:true,evidence});console.log('PASS '+name);}catch(error){rows.push({name,passed:false,error:error.stack,pageErrors:h.pageErrors.slice(e),text:(await p.locator('body').innerText()).slice(-2400),diagnostics,shadow:await p.locator('#doodle-koha-app').evaluate(e=>e.shadowRoot?.textContent.slice(-2400)).catch(()=>null)});console.log('FAIL '+name+' '+error.message.slice(0,250));}fs.writeFileSync(ROOT+'/tests/validation/koha-native-engines.json',JSON.stringify({kind:'Real Koha UI, native SQL, no Firebase SDK or emulator',rows},null,2)+'\n');}
 try{
 await h.configure('147-home-submenus',{enabled:false});
 await check('Personal lists start on Koha, create default lists and render a persisted entry',async()=>{
  await h.goto('/cgi-bin/koha/mainpage.pl');await p.evaluate(name=>localStorage.setItem('kxPersonalListsProfileName',name),'PMKTEST native '+suffix);
  await p.evaluate(()=>PMKPersonalLists.open());await p.waitForFunction(()=>PMKPersonalLists.ready===true);
  const ctx=await p.evaluate(async()=>{const c=await PMKPersonalLists.getStorageContext();return {profileId:c.profileId,namespace:c.db.namespace};});profile=ctx.profileId;assert.equal(ctx.namespace,'lists');
  const result=await p.evaluate(async({profile,bib})=>{const s=PMKNativeData,db=s.createDatabase('lists'),lists=await s.getDocs(s.collection(db,'profiles',profile,'lists'));if(lists.size!==2)throw new Error('Missing default lists');const notice=lists.docs.find(x=>x.data().type==='notice');await s.setDoc(s.doc(db,'profiles',profile,'lists',notice.id,'entries','native-test'),{type:'notice',biblionumber:String(bib),title:'PMKTEST notice locale',author:'Équipe',addedAt:s.serverTimestamp()});return {listId:notice.id,defaults:lists.size};},{profile,bib:h.fixtures.biblios.available});
  await p.locator('#kx-temp-lists-panel').getByText('PMKTEST notice locale',{exact:true}).waitFor();return {...ctx,...result};
 });
 await check('Bibliography personal template is loaded and saved through the shared native profile',async()=>{
  await p.evaluate(()=>PMKPersonalLists.open());
  await p.evaluate(async({profile,suffix})=>{const s=PMKNativeData,db=s.createDatabase('lists');await s.setDoc(s.doc(db,'profiles',profile,'bibliographyTemplates','native-'+suffix),{name:'PMKTEST modèle natif',mode:'bibliography',blocks:[],showBiblionumber:true,createdAt:s.serverTimestamp(),updatedAt:s.serverTimestamp()});},{profile,suffix});
  await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=bibliography-builder');await p.locator('#pmk142-root').waitFor();
  await p.locator('select[data-control="template"] option').filter({hasText:'PMKTEST modèle natif'}).waitFor({state:'attached',timeout:30000});
  await p.locator('select[data-control="template"]').selectOption('native-'+suffix);
  p.once('dialog',d=>d.accept());await p.locator('[data-action="save-template"]').click();
  const result=await p.evaluate(async({profile,suffix})=>{const s=PMKNativeData;return (await s.getDoc(s.doc(s.createDatabase('lists'),'profiles',profile,'bibliographyTemplates','native-'+suffix))).data();},{profile,suffix});assert.equal(result.name,'PMKTEST modèle natif');return {profile,name:result.name};
 });
 const collections=Object.fromEntries(['settings','themes','slots','bookings','polls','pollResponses','participants','recurrenceRules'].map(k=>[k,'native_'+suffix+'_'+k]));
 await check('Appointments use configured native collections and submit a real booking request',async()=>{
  await h.configure('internal-pages-tools',{pageOptions:{appointments:{runtime:{collections,defaultView:'slots'}}}});
  await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=appointments');
  await p.evaluate(async({collections,suffix})=>{const s=PMKNativeData,db=s.createDatabase('appointments'),date=new Date();date.setDate(date.getDate()+2);date.setHours(10,0,0,0);await s.setDoc(s.doc(db,collections.themes,'theme'),{name:'PMKTEST accompagnement',active:true,order:1});await s.setDoc(s.doc(db,collections.slots,'slot'),{startAt:s.Timestamp.fromDate(date),endAt:s.Timestamp.fromMillis(+date+3600000),active:true,capacity:2,booked:0,themeId:'theme',themeIds:['theme'],location:'PMKTEST accueil'});},{collections,suffix});
  await p.locator('[data-book="slot"]').first().click();const form=p.locator('#dk-booking-form');await form.locator('[name=firstName]').fill('PMKTEST');await form.locator('[name=lastName]').fill('Agent');await form.locator('[name=email]').fill('pmktest@example.invalid');const branch=form.locator('[name=branch]');if(await branch.evaluate(e=>e.tagName==='SELECT')){const value=await branch.locator('option').evaluateAll(options=>options.find(x=>x.value)?.value);await branch.selectOption(value);}else await branch.fill('PMK_A');
  const theme=form.locator('input[name=themeIds][type=checkbox]');if(await theme.count())await theme.first().check();
  await form.locator('button[type=submit]').click();const booking=await poll(async collection=>{const docs=(await PMKNativeData.getDocs(PMKNativeData.collection(PMKNativeData.createDatabase('appointments'),collection))).docs;return docs[0]?.data()||null;},collections.bookings);
  const data=booking;assert.equal(data.status,'pending');assert.equal(data.firstName,'PMKTEST');
  await p.locator('#dk-open-admin').click();await p.locator('[data-approve]').first().click();const decision=p.locator('#dk-admin-decision-form');await decision.locator('textarea').fill('PMKTEST validation Koha');await decision.locator('button[type=submit]').click();
  await poll(async collection=>{const s=PMKNativeData;return (await s.getDocs(s.collection(s.createDatabase('appointments'),collection))).docs.some(d=>d.data().status==='approved');},collections.bookings);
  const slot=await p.evaluate(async collection=>{const s=PMKNativeData;return (await s.getDoc(s.doc(s.createDatabase('appointments'),collection,'slot'))).data();},collections.slots);assert.equal(slot.confirmedCount,1);
  return {status:'approved',confirmedCount:slot.confirmedCount,collection:collections.bookings};
 });
 await check('Home widgets read native planning, frequency and the same appointment collections',async()=>{
  await h.configure('home-widgets',{announcementsWidgets:[{id:'frequency-nedap',enabled:true},{id:'doodle-koha',enabled:true},{id:'liens-utiles',enabled:false},{id:'circulation-abonnements',enabled:false}],mainBlockWidgets:[{id:'planning-services',enabled:true}]});
  const before=h.requests.length;await h.goto('/cgi-bin/koha/mainpage.pl');
  await p.locator('#dk-home-slots-widget').waitFor();await p.getByText('PMKTEST accompagnement',{exact:false}).first().waitFor({timeout:30000});
  await p.waitForFunction(()=>document.querySelector('.ps-root'));
  const paths=h.requests.slice(before).map(r=>r.path);for(const ns of ['appointments','frequency','planning'])assert(paths.includes('/api/v1/contrib/pmk/data/'+ns),'Native '+ns+' read');return {nativeReads:['appointments','frequency','planning']};
 });
 await check('Internal sharing submits and displays a request from the native backend',async()=>{
  await h.configure('internal-share',{sites:[{id:'PMK_A',enabled:true,labelFr:'PMKTEST',labelEn:'PMKTEST',matchCode:'PMK_A',matchName:'PMK Test PMK_A',canSend:true,canReceive:true,channel:'PMK_A'}],routing:{mode:'broadcastSite'},pages:[{id:'main',path:'/cgi-bin/koha/mainpage.pl',enabled:true,context:'page'}]});
  await h.goto('/cgi-bin/koha/mainpage.pl');await p.evaluate(()=>PMK111InternalShare.openShare('PMKTEST partage natif','PMKTEST note conservée'));
  const modal=p.locator('#pmk111-share-modal');await modal.waitFor({state:'visible'});await modal.locator('[data-act=confirm]').click();
  await poll(async()=>{const s=PMKNativeData;return (await s.getDocs(s.collection(s.createDatabase('internal-share'),'shares'))).docs.some(d=>d.data().title==='PMKTEST partage natif');});
  const data=await p.evaluate(async()=>{const s=PMKNativeData;return (await s.getDocs(s.collection(s.createDatabase('internal-share'),'shares'))).docs.find(d=>d.data().title==='PMKTEST partage natif').data();});assert(JSON.stringify(data).includes('PMKTEST note conservée'));return {title:data.title,noteRetained:true};
 });
 assert.deepEqual(h.blocked.filter(x=>/firebase|firestore|gstatic|identitytoolkit|securetoken/i.test(x)),[]);
 }finally{await h.close();}if(rows.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
