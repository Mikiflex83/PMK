const {chromium}=require('playwright'),path=require('path'),fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),rows=[];
 try{
  await context.route('https://pmk-non-plugin.test/**',route=>route.fulfill({contentType:'text/html',body:'<main><span class="loggedinusername is_superlibrarian" data-userid="42"></span></main>'}));
  await page.goto('https://pmk-non-plugin.test/');
  await page.evaluate(()=>{
   const projects=new Map(),copy=value=>value==null?value:structuredClone(value);
   function project(id){if(!projects.has(id))projects.set(id,new Map());return projects.get(id);}
   function store(id){const data=project(id);return {
    collection(name){const prefix=name+'/';return {doc(key){const path=prefix+key;return {path,async get(){return {id:key,exists:data.has(path),data:()=>copy(data.get(path))};},async set(value,options={}){data.set(path,options.merge?Object.assign({},data.get(path)||{},copy(value)):copy(value));},async update(value){data.set(path,Object.assign({},data.get(path)||{},copy(value)));},async delete(){data.delete(path);}};},async get(){const docs=[...data].filter(([key])=>key.startsWith(prefix)&&!key.slice(prefix.length).includes('/')).map(([key,value])=>({id:key.slice(prefix.length),exists:true,data:()=>copy(value)}));return {docs,size:docs.length,empty:!docs.length};},where(){return this;},orderBy(){return this;},limit(){return this;},onSnapshot(callback){this.get().then(callback);return ()=>{};}};},
    doc(path){const [name,...rest]=path.split('/');return this.collection(name).doc(rest.join('/'));},
    batch(){const jobs=[];return {set(ref,value,options){jobs.push(()=>ref.set(value,options));},update(ref,value){jobs.push(()=>ref.update(value));},delete(ref){jobs.push(()=>ref.delete());},async commit(){for(const job of jobs)await job();}};},
    async runTransaction(callback){return callback({get:ref=>ref.get(),set:(ref,value,options)=>ref.set(value,options),update:(ref,value)=>ref.update(value),delete:ref=>ref.delete()});}
   };}
   window.PMK_FIREBASE_CONFIG={apiKey:'test-public-key',projectId:'legacy-config-test'};window.PMK_LEGACY_NAMESPACE_CONFIGS={attendance:{apiKey:'test-public-key',projectId:'legacy-attendance-test'}};
   const apps=[];window.firebase={SDK_VERSION:'10.7.1',apps,initializeApp(config,name){const firestore=store(config.projectId),app={name,options:config,firestore:()=>firestore};apps.push(app);return app;},firestore:Object.assign(()=>{}, {FieldValue:{serverTimestamp:()=>new Date().toISOString()},Timestamp:{fromMillis:ms=>({seconds:Math.floor(ms/1000),nanoseconds:0,toMillis:()=>ms,toDate:()=>new Date(ms)})}})};
   const configStore=project('legacy-config-test');configStore.set('pimpmykoha_preplugin_modules/table-labels',{moduleId:'table-labels',unknownMetadata:42,config:{enabled:true,customTitle:'Production',rules:[{id:'mine',label:'Personnalisé'}]}});
   window.__projects=projects;window.PMKPages={isSuperlibrarian:()=>true};
  });
  await page.addScriptTag({path:path.resolve('legacy/000-pmk-legacy-firestore-adapter.js')});
  await page.addScriptTag({path:path.resolve('legacy/001-pmk-legacy-native-data.js')});
  await page.addScriptTag({path:path.resolve('000-pmk-import-common.js')});
  await page.addScriptTag({path:path.resolve('000-pmk-config-firestore.js')});
  const initial=await page.evaluate(async()=>({kind:PMKConfigNativeStorage.kind,config:await PMKConfig.getConfig('table-labels',{force:true,ignoreGlobal:true})}));
  assert.equal(initial.kind,'firebase-legacy');assert.equal(initial.config.customTitle,'Production');assert.equal(initial.config.rules[0].id,'mine');rows.push({name:'Updated core reads existing non-plugin Firebase configuration',passed:true});
  const saved=await page.evaluate(async()=>{const current=await PMKConfig.getConfig('table-labels',{force:true,ignoreGlobal:true});current.customTitle='Production mise à jour';await PMKConfig.saveConfig('table-labels',current);return __projects.get('legacy-config-test').get('pimpmykoha_preplugin_modules/table-labels');});
  assert.equal(saved.unknownMetadata,42);assert.equal(saved.config.customTitle,'Production mise à jour');rows.push({name:'Saving preserves unknown document metadata and customized rows',passed:true});
  await page.evaluate(()=>PMKNativeData.openManager());
  const exportDownload=page.waitForEvent('download');await page.locator('[data-config-export]').click();const exported=await exportDownload;assert.match(exported.suggestedFilename(),/PMK-configurations-non-plugin/);rows.push({name:'PMK manager exports a plugin-compatible configuration backup',passed:true});
  const importFile={format:'pmk-legacy-config-v1',documents:[{path:'table-labels',data:{config:{enabled:true,customTitle:'Restaurée',futureOption:{kept:true}}}}]};
  await page.locator('[data-file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(importFile))});await page.locator('[data-analyze]').click();await page.waitForFunction(()=>document.querySelector('[data-status]').textContent.includes('Aucune écriture effectuée'));
  const safetyDownload=page.waitForEvent('download');await page.locator('[data-import]').click();await safetyDownload;await page.waitForFunction(()=>document.querySelector('[data-status]').textContent.includes('restaurées et relues'));
  const restored=await page.evaluate(()=>__projects.get('legacy-config-test').get('pimpmykoha_preplugin_modules/table-labels'));
  assert.equal(restored.config.customTitle,'Restaurée');assert.equal(restored.config.futureOption.kept,true);assert.equal(restored.unknownMetadata,42);rows.push({name:'Non-plugin restore analyzes first, downloads safety backup and preserves unknown fields',passed:true});
  const native=await page.evaluate(async()=>{const db=PMKNativeData.createDatabase('attendance'),ref=PMKNativeData.doc(db,'counts','today');await PMKNativeData.setDoc(ref,{count:2});await PMKNativeData.runTransaction(db,async tx=>{const snap=await tx.get(ref);tx.set(ref,{count:snap.data().count+1});});return (await PMKNativeData.getDoc(ref)).data();});
  assert.equal(native.count,3);rows.push({name:'Updated business modules retain their historical Firebase paths and transactions',passed:true});
  fs.writeFileSync('tests/validation/non-plugin-transition.json',JSON.stringify({kind:'PMK 0.4.0 file-transfer transition with simulated historical Firebase projects',rows},null,2)+'\n');
  console.log(rows.map(row=>'PASS '+row.name).join('\n'));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
