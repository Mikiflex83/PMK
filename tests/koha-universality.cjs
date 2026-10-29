// Bounded universality controls, actual dedicated Koha. External services blocked.
const {launch,ROOT,BASE}=require('./lib/koha.cjs'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const h=await launch({offlineVendors:true}),p=h.page,rows=[];
 const check=async(name,fn)=>{try{const evidence=await fn();rows.push({name,passed:true,evidence});console.log('PASS '+name);}catch(e){rows.push({name,passed:false,error:e.stack});console.log('FAIL '+name+' '+e.message);}fs.writeFileSync(ROOT+'/tests/validation/koha-universality.json',JSON.stringify({pluginVersion:'0.4.0',kind:'Real dedicated Koha 25.11 bounded universality',rows},null,2)+'\n');};
 try{
 await check('Native advanced search is useful without local series or099 indexes',async()=>{
  await h.configure('advanced-search-sidebar',{indexes:{seriesEnabled:false,treeEnabled:false}});await h.goto('/cgi-bin/koha/mainpage.pl');await p.evaluate(()=>PMKAdvancedSearch.open());await p.locator('#kohaAdvancedSearchSidebar').getByRole('button',{name:'+ Ajouter un critère',exact:true}).click();
  const values=await p.locator('#kohaAdvancedSearchSidebar select').evaluateAll(nodes=>nodes.flatMap(x=>[...x.options].map(o=>o.value)));assert(values.includes('kw'));assert(values.includes('ti'));assert(!values.some(x=>x.startsWith('f099')||x==='index-title-serie'));return {hasNative:true,hasCustom:false};
 });
 await check('Special indexes can be mapped through configuration alone',async()=>{
  await h.configure('advanced-search-sidebar',{indexes:{seriesEnabled:true,treeEnabled:true,seriesIndex:'my-series',domainIndex:'my-domain',subdomainIndex:'my-subdomain',themeIndex:'my-theme',subjectIndex:'my-subject'}});await h.goto('/cgi-bin/koha/mainpage.pl');await p.evaluate(()=>PMKAdvancedSearch.open());await p.locator('#kohaAdvancedSearchSidebar').getByRole('button',{name:'+ Ajouter un critère',exact:true}).click();
  const values=await p.locator('#kohaAdvancedSearchSidebar select').evaluateAll(nodes=>nodes.flatMap(x=>[...x.options].map(o=>o.value)));for(const v of ['my-series','my-domain','my-subdomain','my-theme','my-subject'])assert(values.includes(v),v);return values.filter(x=>x.startsWith('my-'));
 });
 await check('Changed MARC fields use109; the historic122 does not run a second taxonomy query',async()=>{
  await h.configure('cataloguing-tree-assistant',{runtimeMode:'generic',levels:[{id:'custom',enabled:true,labelFr:'Mon niveau',labelEn:'My level',tag:'695',subfield:'a',sourceType:'manual',manualValues:'FIC|Fiction\nDOC|Documentaire'}],extraFields:[],lists:{enabled:false},hierarchy:{relationshipMode:'none'},features:{nativeFiltering:true}});
  const taxonomy=[];const listener=r=>{if(r.url().endsWith('/contrib/pmk/data/taxonomy'))taxonomy.push(r.postDataJSON());};p.on('request',listener);
  try{await h.goto('/cgi-bin/koha/cataloguing/addbiblio.pl');await p.waitForFunction(()=>window.PMKCataloguingTreeAssistant);const state=await p.evaluate(()=>({mode:PMKCataloguingTreeAssistant.config.runtimeMode,level:PMKCataloguingTreeAssistant.model.levels[0].tag,fields:document.querySelectorAll('#koha099_picker_panel').length}));assert.equal(state.level,'695');assert.equal(state.fields,1);assert(!taxonomy.some(x=>x.action==='list'&&x.parent==='treeData'));return state;}finally{p.off('request',listener);}
 });
 await check('Authorities expose installation settings and copyable SQL without changing engines',async()=>{
  await h.configure('authority-installation-options',{allReportId:900001,duplicatesReportId:900002,orphansReportId:900003,personTypes:'PERSON\nFAMILY'});await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=authorities');await p.waitForSelector('#dam-app');await p.waitForFunction(()=>document.querySelector('#dam-content'));
  assert.equal(await p.locator('#dam-app').count(),1);const cfg=await p.evaluate(()=>PMKConfig.getConfig('authority-installation-options'));assert.equal(cfg.allReportId,900001);
  await h.context.grantPermissions(['clipboard-read','clipboard-write']);const response=await p.evaluate(async()=>{const result=await PMKInstallationSQL.copy('Authorities-referentiel.sql');return {result,sql:await navigator.clipboard.readText(),registry:!!PMKConfig.services.get('sql-reports').getDefinition('authorities-referentiel.sql')};});assert(response.sql.includes('<<Après AuthID>>'));assert(response.registry);return {configured:true,sqlCopied:true};
 });
 await check('Global PMK off stops historical interface scripts after reload',async()=>{
  const original=await p.evaluate(()=>PMKConfig.getGlobalSettings());try{
   await p.evaluate(v=>PMKConfig.saveGlobalSettings({...v,enabled:false}),original);await h.goto('/cgi-bin/koha/catalogue/search.pl?q=PMKTEST');const state=await p.evaluate(async()=>({legacy:(await PMKConfig.getConfig('legacy-interface-options')).enabled,panel:!!document.querySelector('#drac-search-prices'),assistant:!!window.PMKCataloguingTreeAssistant}));assert.equal(state.legacy,false);assert.equal(state.panel,false);return state;
  }finally{await p.evaluate(v=>PMKConfig.saveGlobalSettings(v),original);await h.goto('/cgi-bin/koha/mainpage.pl');}
 });
 }finally{await h.close();}if(rows.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
