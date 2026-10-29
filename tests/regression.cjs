const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('fs');
const root=require('node:path').resolve(__dirname,'..')+'/';
let browser;
const passes=[];
async function fixture(path,body='',configs={},core=false){
 const page=await browser.newPage({locale:'fr-FR',timezoneId:'Europe/Paris'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.errors=errors;
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='pmk.test')return route.abort();
  const relative=url.pathname.split('/public/koha-scripts/')[1];
  if(relative&&fs.existsSync(root+relative))return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(root+relative)});
  if(route.request().isNavigationRequest())return route.fulfill({contentType:'text/html; charset=utf-8',body:'<html lang="fr"><head><meta charset="utf-8"></head><body><span class="loggedinusername is_superlibrarian">Admin</span>'+body+'</body></html>'});
  return route.fulfill({contentType:'application/json',body:'[]'});
 });
 await page.goto('http://pmk.test'+path);
 await page.evaluate(configs=>{
  window.__configs=configs;window.__definitions={};window.__writes=[];window.__subscribers={};
  const listeners={};
  const db={collection:()=>({doc:id=>({
   get:async()=>{if((window.__readFailures||[]).includes(id))throw new Error('Fixture read refused: '+id);return {exists:!!configs[id],data:()=>({config:configs[id]})};},
   set:async(value)=>{configs[id]=JSON.parse(JSON.stringify(value.config));window.__writes.push({id,value});(listeners[id]||[]).forEach(fn=>fn({exists:true,data:()=>value}));},
   onSnapshot:fn=>{(listeners[id]??=[]).push(fn);return()=>{};}
  })})};
  const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>0};
  const app={name:'pmk-preplugin',firestore:()=>db};
  window.PMKConfigNativeStorage={kind:'koha',db,serverTimestamp:()=>0};
  window.PMKConfig={
   registerModule:d=>{window.__definitions[d.id]=d;return true;},
   getConfig:async id=>structuredClone(configs[id]||window.__definitions[id]?.defaults||{}),
   subscribe:(id,fn)=>{(window.__subscribers[id]??=[]).push(fn);return()=>{};},
   saveConfig:async(id,cfg)=>{window.__writes.push({id,config:cfg});configs[id]=structuredClone(cfg);for(const fn of window.__subscribers[id]||[])fn(structuredClone(cfg));},
   isKohaSuperlibrarian:()=>!!document.querySelector('.is_superlibrarian'),
   isGloballyEnabled:()=>true,areContextButtonsEnabled:()=>true,
   getLanguage:()=>document.documentElement.lang.startsWith('en')?'en':'fr',
   mountContextButton:()=>{},openAdmin:()=>{},
   elementPicker:{register:()=>{},pickForConfig:()=>Promise.resolve({value:'#chosen',selector:'#chosen'})},
   services:{register:()=>{},get:()=>null},visualEditor:{register:()=>{}},
  };
 },configs);
 if(core){await page.evaluate(()=>delete window.PMKConfig);let source=fs.readFileSync(root+'000-pmk-config-firestore.js','utf8').replace('window.PMKConfig = {','window.__defs = modules; window.PMKConfig = {');await page.addScriptTag({content:source});for(const helper of ['000-pmk-dates.js','000-pmk-workbench.js'])await page.addScriptTag({content:fs.readFileSync(root+helper,'utf8')});}
 return page;
}
async function load(page,file){await page.addScriptTag({content:fs.readFileSync(root+file,'utf8')+'\n//# sourceURL='+file});}
async function check(name,fn){if(process.env.PMK_TEST_FILTER&&!name.includes(process.env.PMK_TEST_FILTER))return;try{await fn();passes.push(name);console.log('PASS '+name);}catch(e){console.error('FAIL '+name);throw e;}}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 await check('Common admin: single activation, useful advanced settings, existing values preserved',async()=>{
  const seed={'patron-age-display':{enabled:true,format:'years_months_days',language:'en',parentheses:false,additionalPaths:'/cgi-bin/koha/members/boraccount.pl'},'relative-dates':{enabled:true,display:{className:'custom-age',pastPrefixFr:'depuis '},rules:[{id:'saved',enabled:true,targetMode:'element',pagePath:'/cgi-bin/koha/mainpage.pl',selector:'#old',separator:' / '}]}};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','<p id="old">01/01/2020</p>',seed,true);
  for(const f of ['070-date-utils.js','079-new-release-logos.js','081-084-6xx-suggestions.js','110-exemplaire-helper.js','137-home-widgets.js','137-widgets/137-widget-liens-utiles.js'])await load(p,f);
  const schemas=await p.evaluate(()=>Object.fromEntries([...window.__defs].map(([id,d])=>[id,{name:d.name,schema:d.schema,hidden:d.navigationHidden}])));
  assert.equal(schemas['home-widget-useful-links'].hidden,true);
  assert.equal(schemas['patron-age-display'].hidden,true);
  assert(!schemas['home-widgets'].schema.some(f=>f.id==='reports'));
  const address=schemas['070'].schema.find(f=>f.id==='advanced-fields');assert(address.fields.every(f=>f.type==='elementPicker'&&!f.advanced));
  assert.equal(schemas['item-entry-assistant'].schema.find(f=>f.id==='activation').fields.find(f=>f.key==='pages').fields.find(f=>f.key==='path').readOnly,undefined);
  await p.evaluate(()=>window.PMKConfig.openAdmin('070'));
  assert.equal(await p.locator('.pmk-config-main .pmk-toggle-button').count(),4); // root, primary, secondary, geography
  assert.equal(await p.locator('.pmk-settings-intro').count(),0);
  await p.evaluate(()=>window.PMKConfig.openAdmin('cataloging-6xx-suggestions'));
  assert.equal(await p.locator('.pmk-advanced-toggle').count(),0);
  const configs=await p.evaluate(async()=>({age:await PMKConfig.getConfig('patron-age-display'),dates:await PMKConfig.getConfig('relative-dates'),writes:__writes}));
  assert.equal(configs.age.format,'years_months_days');assert.equal(configs.age.parentheses,false);assert.equal(configs.dates.display.className,'custom-age');assert.equal(configs.dates.rules.length,12);assert.equal(configs.dates.rules.filter(rule=>rule.originModule==='waiting-holds-age').length,9);assert.equal(configs.dates.rules[0].separator,' / ');assert.deepEqual(configs.writes,[]);
  await p.evaluate(async()=>{const cfg=await PMKConfig.getConfig('relative-dates');cfg.rules[0].ageFormat='years_months';await PMKConfig.saveConfig('relative-dates',cfg)});
  const roundtrip=await p.evaluate(async()=>({dates:await PMKConfig.getConfig('relative-dates'),age:await PMKConfig.getConfig('patron-age-display'),writes:__writes.map(w=>w.id)}));
  assert.equal(roundtrip.dates.display.className,'custom-age');assert.equal(roundtrip.dates.display.pastPrefixFr,'depuis ');assert.equal(roundtrip.dates.rules[0].selector,'#old');assert.equal(roundtrip.dates.rules[0].separator,' / ');assert.equal(roundtrip.age.format,'years_months_days');assert.deepEqual(roundtrip.writes,['relative-dates']);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Unified age/date settings: one document, historical switches, complete form, aliases and live updates',async()=>{
  const originalAge={enabled:true,format:'years_months_days',language:'en',parentheses:false,additionalPaths:'/cgi-bin/koha/members/boraccount.pl',customRoot:{mine:42},pages:{circulation:{enabled:false}}};
  const originalDates={enabled:false,customDates:{mine:'kept'},display:{pastPrefixFr:'depuis '},rules:[{id:'my-rule',enabled:true,pagePath:'/cgi-bin/koha/members/moremember.pl',selector:'#past',targetMode:'element',customRule:'keep'}]};
  const p=await fixture('/cgi-bin/koha/members/moremember.pl','<div id="patron-information"><ul><li>Naissance : 29/02/2000 <span class="age_years">26</span></li></ul></div><p id="past">01/01/2020</p>',{'patron-age-display':originalAge,'relative-dates':originalDates},true);
  const imported=await p.evaluate(async()=>({cfg:await PMKConfig.getConfig('relative-dates',{ignoreGlobal:true}),writes:__writes}));
  assert.equal(imported.cfg.enabled,true);assert.equal(imported.cfg.relativeDatesEnabled,false);assert.equal(imported.cfg.nativeAge.format,'years_months_days');assert.equal(imported.cfg.nativeAge.customRoot.mine,42);assert.equal(imported.cfg.customDates.mine,'kept');assert.equal(imported.cfg.rules[0].customRule,'keep');assert.deepEqual(imported.writes,[]);
  // The complete editor is available before either renderer is loaded.
  await p.evaluate(()=>PMKConfig.openAdmin('patron-age-display'));
  assert(await p.getByText('Âges et dates relatives',{exact:true}).count());
  assert.equal(await p.getByRole('button',{name:'Configurer l’âge existant',exact:true}).count(),0);
  assert.equal(await p.locator('[data-pmk-section-id="native-age-format"]').count(),1);
  assert.equal(await p.locator('[data-pmk-section-id="rules"]').count(),1);
  await p.evaluate(()=>PMKConfig.closeAdmin());
  await load(p,'070-date-utils.js');await load(p,'098-age-calculation-member-detail.js');
  await p.waitForFunction(()=>document.querySelector('.age_years').textContent.includes('years'));
  assert.equal(await p.locator('[data-pmk-relative-date-generated]').count(),0);
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('relative-dates',{ignoreGlobal:true});c.relativeDatesEnabled=true;c.nativeAge.format='years_months';c.nativeAge.language='fr';await PMKConfig.saveConfig('relative-dates',c)});
  await p.waitForFunction(()=>document.querySelector('.age_years').textContent.includes('mois')&&!!document.querySelector('[data-pmk-relative-date-generated]'));
  const saved=await p.evaluate(async()=>{PMKConfig.clearCache();return {cfg:await PMKConfig.getConfig('relative-dates',{ignoreGlobal:true}),old:__configs['patron-age-display'],writes:__writes.map(w=>w.id)}});
  assert.equal(saved.cfg.nativeAge.format,'years_months');assert.deepEqual(saved.old,originalAge);assert.deepEqual(saved.writes,['relative-dates']);assert.deepEqual(saved.cfg.migrations.ageDatesSources.patronAge,originalAge);assert.deepEqual(saved.cfg.migrations.ageDatesSources.relativeDates,originalDates);
  // An old script can still save its age settings, but writes the canonical document.
  await p.evaluate(async()=>{await PMKConfig.saveConfig('patron-age-display',{format:'years'});const c=await PMKConfig.getConfig('relative-dates',{ignoreGlobal:true});c.enabled=false;await PMKConfig.saveConfig('relative-dates',c)});
  await p.waitForFunction(()=>document.querySelector('.age_years').textContent==='26'&&!document.querySelector('[data-pmk-relative-date-generated]'));
  const final=await p.evaluate(async()=>({old:__configs['patron-age-display'],age:await PMKConfig.getConfig('patron-age-display'),writes:__writes.map(w=>w.id)}));assert.deepEqual(final.old,originalAge);assert.equal(final.age.enabled,false);assert(final.writes.every(id=>id==='relative-dates'));
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Configuration protection: failed reads block writes and removed rows retain their own metadata',async()=>{
  const age={enabled:false,format:'years_months',custom:'original'};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{'patron-age-display':age,'table-labels':{custom:{mustSurvive:7}},'row-protection':{rows:[{id:'a',custom:'A'},{id:'b',custom:'B'}]}},true);
  const result=await p.evaluate(async()=>{
    __readFailures=['patron-age-display'];let rejectedMigration=false;try{await PMKConfig.saveConfig('relative-dates',{})}catch(e){rejectedMigration=true;}
    __readFailures=['table-labels'];let rejectedGlobal=false;try{await PMKConfig.saveGlobalSettings({enabled:false})}catch(e){rejectedGlobal=true;}
    const writesBefore=__writes.length;__readFailures=[];
    PMKConfig.registerModule({id:'row-protection',defaults:{rows:[]},normalize:cfg=>({rows:[cfg.rows.find(r=>r.id==='a'),{id:'c',value:'new'}]}),schema:[]});
    const rows=await PMKConfig.getConfig('row-protection');
    const migrated=await PMKConfig.getConfig('relative-dates',{force:true,ignoreGlobal:true});
    return {rejectedMigration,rejectedGlobal,writesBefore,rows,migrated,oldAge:__configs['patron-age-display'],oldGlobal:__configs['table-labels']};
  });
  assert.equal(result.rejectedMigration,true);assert.equal(result.rejectedGlobal,true);assert.equal(result.writesBefore,0);assert.equal(result.rows.rows[0].custom,'A');assert.equal(result.rows.rows[1].custom,undefined);assert(result.rows.__pmkPreservedValues.some(e=>e.value?.id==='b'&&e.value.custom==='B'));assert.equal(result.migrated.nativeAge.enabled,false);assert.deepEqual(result.oldAge,age);assert.equal(result.oldGlobal.custom.mustSurvive,7);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Age and duration rules: modes, formats, invalid dates and idempotent DOM',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','<p id="birth">29/02/2000</p><p id="past">01/01/2020</p><p id="bad">29/02/2023</p><table id="holdings_table"><thead><tr><th data-colname="dateaccessioned">Acquisition</th></tr></thead><tbody><tr><td>01/01/2020</td></tr></tbody></table>');await load(p,'070-date-utils.js');
  const result=await p.evaluate(()=>{
   const api=window.VC_DATE_UTILS;
   const make=(id,selector,mode,format)=>({id,enabled:true,pagePath:location.pathname,targetMode:'element',selector,calculationMode:mode,ageFormat:format,placement:'append'});
   const age=make('age','#birth','age','years_months_days');
   const table=document.querySelector('#holdings_table');api.processTableRule(table,api.defaults.rules[0]);const first=table.textContent;api.processTableRule(table,api.defaults.rules[0]);if(first!==table.textContent)throw new Error('Repeated table rendering changed the result');
   api.processElementRule(age);api.processElementRule(make('dur','#past','duration'));api.processElementRule(make('bad','#bad','age'));
   return {age:document.querySelector('#birth').textContent,past:document.querySelector('#past').textContent,bad:document.querySelector('#bad').textContent,invalid:api.parseDateFR('29/02/2023'),normalized:api.normalizeConfig({rules:[age]}).rules[0]};
  });
  assert.match(result.age,/\d+ ans \d+ mois \d+ jours?/);assert.match(result.past,/il y a /);assert.equal(result.bad,'29/02/2023');assert.equal(result.invalid,null);assert.equal(result.normalized.calculationMode,'age');assert.equal(result.normalized.ageFormat,'years_months_days');
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Facets: only active groups open; manual choices survive refresh',async()=>{
  const body='<div id="search-facets"><ul><li id="authors"><h5>Auteurs</h5><ul><li><span class="facet-label">Doe</span><a href="?q=book&nolimit=au:Doe">[x]</a></li></ul></li><li id="topics"><h5>Sujets</h5><ul><li><span class="facet-label"><a href="?q=book&limit=su:Art">Art</a></span></li><li class="moretoggle"><a href="?q=book">Plus</a></li></ul></li></ul></div>';
  const p=await fixture('/cgi-bin/koha/catalogue/search.pl?q=book&limit=au:Doe',body);await load(p,'055-facets-drawer.js');
  await p.evaluate(()=>PMK055SearchFacets.applyConfig({...PMK055SearchFacets.defaults,recalculateActiveFacets:false}));
  assert.equal(await p.locator('#authors.pmk055-open').count(),1);assert.equal(await p.locator('#topics.pmk055-open').count(),0);
  await p.locator('#authors > .pmk055-facet-toggle').click();
  await p.evaluate(()=>PMK055SearchFacets.applyConfig({...PMK055SearchFacets.defaults,recalculateActiveFacets:false}));
  assert.equal(await p.locator('#authors.pmk055-open').count(),0);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Astrology: custom page, separate birth source and placement, repeatable toggle',async()=>{
  const config={enabled:true,page:{enabled:false},displayMode:'toggle',targets:[{enabled:true,pagePath:'/cgi-bin/koha/members/boraccount.pl',birthSelector:'#born',targetSelector:'#sign-here'}]};
  const p=await fixture('/cgi-bin/koha/members/boraccount.pl','<input id="born" value="21/03/2000"><span id="sign-here">Lecteur</span>',{'patron-astrological-sign':config});await load(p,'049-astrological-sign.js');
  await p.waitForSelector('[data-koha-astro-sign]',{state:'attached'});
  assert.equal(await p.locator('[data-koha-astro-sign]').textContent(),'Bélier');assert.equal(await p.locator('[data-koha-astro-sign]').isVisible(),false);
  await p.locator('#sign-here').click();assert.equal(await p.locator('[data-koha-astro-sign]').isVisible(),true);
  await p.locator('#born').fill('01/01/2000');
  await p.waitForFunction(()=>document.querySelector('[data-koha-astro-sign]').textContent==='Capricorne');
  await p.evaluate(()=>__subscribers['patron-astrological-sign'][0](__configs['patron-astrological-sign']));
  assert.equal(await p.locator('[data-koha-astro-sign]').count(),1);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Useful-links widget: superlibrarian editor, cancel, save, persistence, safe URLs',async()=>{
  const config={enabled:true,titleFr:'Mes liens',titleEn:'My links',links:[{id:'saved',enabled:true,column:'left',label:'Catalogue',url:'/cgi-bin/koha/catalogue/search.pl',note:'Note conservée',newTab:false}]};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','<div id="slot"></div>',{'home-widget-useful-links':config});
  await p.evaluate(()=>window.PMKHomeWidgets={register:widget=>widget.mount(document.querySelector('#slot'))});await load(p,'137-widgets/137-widget-liens-utiles.js');
  const open=p.getByRole('button',{name:'Configurer les liens utiles'});await open.click();
  await p.getByLabel('Titre FR').fill('Annulé');await p.getByRole('button',{name:'Annuler / Cancel',exact:true}).click();assert.equal(await p.locator('#slot h2').textContent(),'Mes liens');
  await open.click();await p.getByLabel('Titre FR').fill('Titre enregistré');await p.getByRole('button',{name:'Enregistrer / Save',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('#slot h2').textContent==='Titre enregistré');
  const saved=await p.evaluate(()=>__configs['home-widget-useful-links']);assert.equal(saved.links[0].note,'Note conservée');assert.equal(saved.links[0].newTab,false);
  await open.click();await p.getByLabel('URL',{exact:true}).fill('javascript:alert(1)');await p.getByRole('button',{name:'Enregistrer / Save',exact:true}).click();assert.match(await p.getByRole('alert').textContent(),/URL http/);await p.getByRole('button',{name:'Annuler / Cancel',exact:true}).click();
  await p.evaluate(()=>{document.querySelector('.is_superlibrarian').classList.remove('is_superlibrarian');PMK137UsefulLinks.render()});assert.equal(await p.getByRole('button',{name:'Configurer les liens utiles'}).count(),0);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Duplicate check: selected email-only comparison, API query, classification and invalidation',async()=>{
  const config={enabled:true,existingPatron:{enabled:false},behavior:{requireBirthDate:true,requireCheckBeforeSave:true},comparison:{fields:[{enabled:true,apiField:'email',selector:'#email',mode:'exact',role:'candidate',maxDistance:0}]}};
  const p=await fixture('/cgi-bin/koha/members/memberentry.pl','<form id="entryform"><input id="email" value="reader@example.org"><button type="submit">Enregistrer</button></form>',{'144':config});
  const queries=[];await p.route('**/api/v1/patrons?*',route=>{queries.push(new URL(route.request().url()).searchParams.get('q'));return route.fulfill({contentType:'application/json',headers:{'X-Total-Count':'2'},body:JSON.stringify([{patron_id:1,email:'reader@example.org',surname:'Doe',firstname:'Jane'},{patron_id:2,email:'someone@example.org',surname:'Other',firstname:'John'}])});});
  await load(p,'144-controle-doublons-adherents.js');await p.waitForFunction(()=>window.PMK144PatronDuplicateCheck&&document.querySelector('[id*=pmk144]'));
  await p.evaluate(()=>PMK144PatronDuplicateCheck.runCheck());
  assert.equal(queries.length,1);assert.match(queries[0],/"email":"reader@example.org"/);assert(!queries[0].includes('surname'));
  const result=await p.evaluate(()=>({identity:PMK144PatronDuplicateCheck.identity(),state:PMK144PatronDuplicateCheck.state,definition:__definitions['144'].validate({comparison:{fields:[]}})}));
  assert.equal(result.identity.values.email,'reader@example.org');assert.equal(result.state.lastResults.length,1);assert.equal(result.definition.ok,false);
  await p.getByRole('textbox').first().fill('different@example.org');
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Guides: editable page steps, escaped text, protected MARC import guides',async()=>{
  const tour={enabled:true,pagePath:'/cgi-bin/koha/mainpage.pl',steps:[{enabled:true,selector:'#welcome',title:'Accueil personnel',text:'Texte <personnel>',position:'bottom'}]};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','<p id="welcome">Bienvenue</p>',{'guides-training':{enabled:true,customTours:[tour]}});await load(p,'135-guides-training-pmk-loader.js');
  await p.waitForFunction(()=>window.KOHA_GUIDES?.__pmkLegacyProviders?.aggregateSteps);
  const result=await p.evaluate(()=>({steps:KOHA_GUIDES.__pmkLegacyProviders.aggregateSteps().map(s=>({title:s.title,intro:s.intro,id:s.element.id})),valid:__definitions['guides-training'].validate({customTours:[{enabled:true,pagePath:'/cgi-bin/koha/tools/stage-marc-import.pl',steps:[]}]})}));
  assert.deepEqual(result.steps,[{title:'Accueil personnel',intro:'Texte &lt;personnel&gt;',id:'welcome'}]);assert.equal(result.valid.ok,false);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('New-release indicators: configurable source/target and latest valid acquisition date',async()=>{
  const p=await fixture('/cgi-bin/koha/catalogue/search.pl','<div class="result"><span class="acq">17/10/2026</span><span class="acq">01/01/2099</span><span class="acq">incorrect</span><div class="destination"></div></div>',{'new-release-indicators':{enabled:true,pages:{search:{enabled:true,rowSelector:'.result',dateSelector:'.acq',preferredTargetSelector:'.destination'}}}});
  await load(p,'079-new-release-logos.js');await p.waitForSelector('[data-pmk079-generated]');
  assert.equal(await p.locator('[data-pmk079-generated]').count(),1);
  assert.equal(await p.locator('.destination [data-pmk079-generated]').count(),1);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Bibliographic markers: configured source, destination and matching rules',async()=>{
  const p=await fixture('/cgi-bin/koha/catalogue/detail.pl','<div id="source">Genre personnalisé: aventure</div><h2 id="destination">Titre</h2>');await load(p,'027-genre-icons-detail.js');
  const result=await p.evaluate(()=>PMK027BibliographicMarkers.apply({enabled:true,pagePath:location.pathname,sourceSelector:'#source',destinationSelector:'#destination',destinationPosition:'append',rules:[{id:'test',enabled:true,label:'Aventure',searchText:'aventure',iconUrl:'/adventure.png'}]}));
  assert.equal(await p.locator('#destination [data-pmk027-owner]').count(),1);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Hierarchy assistant: configured manual fields on a changed page URL without engine selection',async()=>{
  const cfg={enabled:true,runtimeMode:'legacy_dracenie',page:{path:'/cgi-bin/koha/cataloguing/cataloguing-new.pl',enabled:true},lists:{enabled:false},hierarchy:{relationshipMode:'none'},features:{nativeFiltering:false},levels:[{id:'level',enabled:true,labelFr:'Domaine personnel',labelEn:'Custom domain',tag:'099',subfield:'a',sourceType:'manual',manualValues:'FIC|Fiction\nDOC|Documentaire'}],extraFields:[]};
  const p=await fixture('/cgi-bin/koha/cataloguing/cataloguing-new.pl','<input id="tag_099_subfield_a_1" value="">',{'cataloguing-tree-assistant':cfg});await load(p,'109-helper-domaine.js');
  await p.waitForFunction(()=>window.PMKCataloguingTreeAssistant);
  assert.equal(await p.locator('#koha099_picker_panel').count(),1);
  const actual=await p.evaluate(()=>PMKCataloguingTreeAssistant.config);assert.equal(actual.levels[0].labelFr,'Domaine personnel');assert.equal(actual.features.nativeFiltering,false);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Item assistant: modified page URLs take effect after config load',async()=>{
  const config={enabled:true,pages:[{id:'cataloguing.additem',path:'/cgi-bin/koha/cataloguing/items-new.pl',enabled:true}],firebase:{enabled:false},fields:[]};
  const p=await fixture('/cgi-bin/koha/cataloguing/items-new.pl','<form id="f"></form>',{'item-entry-assistant':config});await load(p,'110-exemplaire-helper.js');
  await p.waitForFunction(()=>PMK110ItemEntryAssistant.getConfig().pages[0].path.endsWith('items-new.pl'));
  assert.equal(await p.locator('#koha_items_assistant_panel').count(),1);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Configuration registry: deterministic merged defaults, one control per path, unknown custom fields preserved',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{'audit-fixture':{enabled:true,legacyMode:'my original setting',customRoot:{retained:'yes'},rules:[{id:'saved',enabled:true,selector:'#kept',customNested:{code:'custom'}}]}},true);
  const result=await p.evaluate(async()=>{
    const definitions=[
      {id:'audit-fixture',schemaVersion:1,definitionSource:'legacy-fixture.js',defaults:{enabled:true,mode:'old',rules:[{id:'legacy-default',value:'preserved'}]},schema:[{type:'section',id:'one',fields:[{key:'enabled',type:'boolean'},{key:'shared',type:'text'}]}]},
      {id:'audit-fixture',schemaVersion:2,definitionSource:'new-fixture.js',defaults:{enabled:true,mode:'new',rules:[{id:'new-default',value:'also preserved'}]},schema:[{type:'section',id:'two',fields:[{key:'shared',type:'text'}]}],normalize:cfg=>({enabled:cfg.enabled,legacyMode:'supported',rules:cfg.rules.map(rule=>({id:rule.id,selector:rule.selector}))})}
    ];
    definitions.forEach(d=>PMKConfig.registerModule(d));
    const first=PMKConfig.getDefinition('audit-fixture').defaults;
    const cfg=await PMKConfig.getConfig('audit-fixture');await PMKConfig.saveConfig('audit-fixture',cfg);
    const saved=await PMKConfig.getConfig('audit-fixture');
    definitions.reverse().forEach(d=>PMKConfig.registerModule(d));
    return {first,last:PMKConfig.getDefinition('audit-fixture').defaults,saved,audit:PMKConfig.getConfigAudit('audit-fixture')[0],backup:JSON.parse(localStorage.getItem('pmk:config-backups:koha:audit-fixture'))};
  });
  assert.deepEqual(result.first,result.last);assert.equal(result.first.mode,'new');assert.equal(result.first.rules.length,2);
  assert(result.saved.__pmkPreservedValues.some(entry=>entry.path==='legacyMode'&&entry.value==='my original setting'));assert.equal(result.saved.customRoot.retained,'yes');assert.equal(result.saved.rules[0].customNested.code,'custom');assert.equal(result.saved.rules[0].enabled,true);
  assert(result.audit.duplicateControlsMerged.includes('shared'));assert.equal(result.audit.sources.length,2);assert.equal(result.backup[0].config.customRoot.retained,'yes');
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Menu engine: 147 editor is identical with or without 134; round-trip retains every custom property',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{},true);
  const result=await p.evaluate(()=>{
    const section={label:'Mes outils',path:'/cgi-bin/koha/tools/tools-home.pl',customRoot:{value:'preserve'},entries:[
      {type:'category',label:'Catégorie personnelle',id:'category',customGroup:'preserved'},
      {type:'link',id:'custom-link',url:'/cgi-bin/koha/tools/custom.pl?x=42',label:'Mon lien',category:'Personnalisé',origin:'custom',hidden:true,extra:{value:7},pmkMenu:{id:'stable',kind:'link',parentId:'category',enabled:false,labelFr:'Mon lien',labelEn:'My link',icon:'fa-book',target:'new',audience:'superlibrarian'}},
      {type:'separator',id:'separator',unknownSeparator:'preserved'}
    ]};
    const converted=PMKMenuEngine.fromHome(section,0);const output=PMKMenuEngine.toHome(converted.menu,section,converted.sources);
    const cfg={sections:[section]};const editor=PMKMenuEditorCore.renderHome({rootObject:cfg});
    document.body.appendChild(editor);
    return {output,sourceUnchanged:cfg.sections[0],editorClass:editor.className,engine:PMKConfig.services.get('pmk.menus').renderEditor===PMKMenuEngine.renderEditor,has134:!!window.__PMK_INTRAnET_NAV_MENU__};
  });
  assert.equal(result.has134,false);assert.equal(result.engine,true);assert.match(result.editorClass,/pmk-inav-builder/);
  assert.equal(result.output.customRoot.value,'preserve');assert.equal(result.output.entries[0].customGroup,'preserved');
  const link=result.output.entries.find(e=>e.type==='link');assert.equal(link.extra.value,7);assert.equal(link.id,'custom-link');assert.equal(link.pmkMenu.id,'stable');assert.equal(link.pmkMenu.target,'new');assert.equal(link.pmkMenu.labelEn,'My link');assert.equal(link.hidden,true);assert.equal(result.output.entries[2].unknownSeparator,'preserved');
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Menu runtime: shared search, nested menus, audience, icons, new tab and keyboard',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{},true);
  await p.evaluate(()=>{const host=PMKMenuEngine.renderPanel({title:'Menu commun',items:[
    {id:'group',kind:'submenu',labelFr:'Mon groupe',enabled:true,parentId:'',audience:'all'},
    {id:'link',kind:'link',labelFr:'Lien personnalisé',url:'/cgi-bin/koha/custom.pl',icon:'fa-book',target:'new',enabled:true,parentId:'group'},
    {id:'secret',kind:'link',labelFr:'Réservé',url:'/secret',audience:'superlibrarian',parentId:''},
    {id:'off',kind:'link',labelFr:'Désactivé',url:'/off',enabled:false,parentId:''}
  ]});document.body.appendChild(host);});
  assert.equal(await p.getByRole('menuitem',{name:'Désactivé',exact:true}).count(),0);
  await p.getByRole('button',{name:'Mon groupe'}).click();
  assert.equal(await p.getByRole('menuitem',{name:'Lien personnalisé'}).getAttribute('target'),'_blank');assert.equal(await p.locator('.pmk-menu-panel .fa-book').count(),1);
  const search=p.getByRole('searchbox',{name:'Rechercher un accès…'});await search.fill('personnalisé');assert.equal(await p.getByRole('menuitem',{name:'Lien personnalisé'}).isVisible(),true);assert.equal(await p.getByRole('menuitem',{name:'Réservé'}).count(),0);
  await search.focus();await p.keyboard.press('ArrowDown');assert.equal(await p.evaluate(()=>document.activeElement.tagName),'BUTTON');
  await p.evaluate(()=>{document.querySelector('.is_superlibrarian').classList.remove('is_superlibrarian');const host=PMKMenuEngine.renderPanel({items:[{id:'secret',kind:'link',labelFr:'Secret',url:'/secret',audience:'superlibrarian'}]});document.body.appendChild(host)});
  assert.equal(await p.getByRole('menuitem',{name:'Secret',exact:true}).count(),0);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('IntranetNav: uses common runtime/editor and does not auto-save migrations',async()=>{
  const cfg={enabled:true,migrationVersion:1,menus:[{id:'custom',enabled:true,labelFr:'Mon menu',labelEn:'My menu',audience:'all',customMenu:'preserve',items:[{id:'custom-link',kind:'link',parentId:'',enabled:true,labelFr:'Accès personnel',url:'/cgi-bin/koha/tools/custom.pl',customItem:'preserve'}]}]};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','<ul id="toplevelmenu"><li id="moremenus"></li></ul>',{'intranet-nav-menu':cfg},true);await load(p,'134-intranetnav-menu.js');
  await p.waitForSelector('.pmk-intranet-nav-menu .pmk-menu-panel');
  assert.equal(await p.locator('.pmk-intranet-nav-menu a[href="/cgi-bin/koha/tools/custom.pl"]').count(),1);
  await p.evaluate(()=>PMKConfig.openAdmin('intranet-nav-menu'));assert.equal(await p.locator('.pmk-config-main .pmk-inav-builder').count(),1);
  assert.equal(await p.locator('[data-pmk-field-path="menus"]').count(),0);
  const result=await p.evaluate(()=>({writes:__writes,stored:__configs['intranet-nav-menu']}));assert.deepEqual(result.writes,[]);assert.deepEqual(result.stored,cfg);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('User HTML defaults: exact titles, 147 links, exclusions, nesting and complete reports/administration',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{},true);
  const cases=[['circulation','circ/circulation-home.pl',16],['cataloguing','cataloguing/cataloging-home.pl',28],['tools','tools/tools-home.pl',24],['administration','admin/admin-home.pl',46],['members','members/members-home.pl',9],['lists','virtualshelves/shelves.pl',1],['courses','course_reserves/course-reserves.pl',1],['reports','reports/reports-home.pl',22]];
  const results={};
  for(const [name,path,count]of cases){const html=fs.readFileSync(root+'tests/fixtures/home-menus/'+name+'.html','utf8');results[name]=await p.evaluate(({html,path})=>PMKMenuEngine.extractNativePage(new DOMParser().parseFromString(html,'text/html'),location.origin+'/cgi-bin/koha/'+path),{html,path});assert.equal(results[name].filter(e=>e.type==='link').length,count);}
  assert(results.circulation.some(e=>e.label==='Prêter'));assert(results.circulation.some(e=>e.label==='Réservations mises de coté'));assert(!results.circulation.some(e=>e.url?.includes('offline')));
  assert(results.members.some(e=>e.label==='Personnel Bibliotheque'));assert(results.members.some(e=>e.url?.includes('categorycode=STAT')));
  assert(results.cataloguing.some(e=>e.type==='category'&&e.label==='Nouvelle notice'&&e.pmkMenu.kind==='submenu'));assert(results.cataloguing.some(e=>e.label==='Fonds patrimonial'&&e.pmkMenu.parentId.includes('Nouvelle notice')));
  assert(results.administration.some(e=>e.url==='/cgi-bin/koha/admin/record_sources'));assert(!results.administration.some(e=>e.url==='/cgi-bin/koha/admin/preferences.pl'));
  assert(results.reports.some(e=>e.label==='Rapports sauvegardés'));assert(results.reports.some(e=>e.url==='https://schema.koha-community.org/25_11'));
  const profile=await p.evaluate(()=>PMKMenuEngine.defaultHomeProfile());assert.equal(profile.flatMap(s=>s.entries).filter(e=>e.type==='link').length,147);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Home module 147: shared runtime, live permissions, custom metadata, exact labels and favorites',async()=>{
  const path='/cgi-bin/koha/tools/tools-home.pl';
  const cfg={enabled:true,discovery:{ignoredSections:'/cgi-bin/koha/authorities/authorities-home.pl'},sections:[{label:'Outils',path,customSection:'keep',entries:[{type:'link',id:'/cgi-bin/koha/tools/holidays.pl',url:'/cgi-bin/koha/tools/holidays.pl',label:'Mon calendrier',origin:'koha',category:'Personnalisé',customField:'keep',pmkMenu:{id:'calendar',kind:'link',parentId:'',enabled:true,labelFr:'Mon calendrier',labelEn:'My calendar',target:'new',icon:'fa-calendar'}}]}]};
  const body='<span data-koha-userid="agent"></span><ul class="biglinks-list"><li><a class="icon_general" href="'+path+'">Outils</a></li><li><a class="icon_general" href="/cgi-bin/koha/authorities/authorities-home.pl">Autorités</a></li></ul>';
  const p=await fixture('/cgi-bin/koha/mainpage.pl',body,{'147-home-submenus':cfg},true);
  await p.route('**/tools/tools-home.pl',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync(root+'tests/fixtures/home-menus/tools.html','utf8')}));
  await p.evaluate(()=>{window.__favoriteWrites=[];PMKConfig.services.register('pmk147.favorites',{load:async()=>[],save:async(user,ids)=>__favoriteWrites.push({user,ids})},{replace:true})});
  await load(p,'147-accueil-sous-menus-pmk.js');await p.getByRole('button',{name:'Ouvrir le sous-menu Outils'}).waitFor({state:'visible'});await p.getByRole('button',{name:'Ouvrir le sous-menu Outils'}).click();
  assert.equal(await p.locator('.pmk147panel .pmk-menu-panel').count(),1);assert.equal(await p.getByRole('button',{name:'Ouvrir le sous-menu Autorités'}).count(),0);
  assert.equal(await p.getByRole('menuitem',{name:'Mon calendrier',exact:true}).getAttribute('target'),'_blank');await p.getByRole('button',{name:'Ajouter aux favoris : Mon calendrier',exact:true}).click();
  const result=await p.evaluate(()=>({stored:__configs['147-home-submenus'],favorites:__favoriteWrites,writes:__writes}));assert.deepEqual(result.stored,cfg);assert.deepEqual(result.writes,[]);assert.deepEqual(result.favorites,[{user:'agent',ids:['/cgi-bin/koha/tools/holidays.pl']}]);assert.equal(await p.locator('.pmk147panel .dropdown-header').first().textContent(),'★ Favoris');
  await p.evaluate(async()=>{const next=await PMKConfig.getConfig('147-home-submenus');next.sections[0].enabled=false;await PMKConfig.saveConfig('147-home-submenus',next)});await p.getByRole('button',{name:'Ouvrir le sous-menu Outils'}).waitFor({state:'hidden'});assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Timeline aliases: one runtime and merged SQL-report defaults',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{},true);
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/008-issuehistory-timelineold.js'});
  await p.waitForFunction(()=>PMKConfig.getDefinition('loan-history-timeline'));
  await load(p,'008-issuehistory-timeline.js');
  const result=await p.evaluate(()=>({defs:PMKConfig.listModules().filter(d=>d.id==='loan-history-timeline'),config:PMKConfig.getDefinition('loan-history-timeline').defaults,writes:__writes}));assert.equal(result.defs.length,1);assert.match(result.config.transferReportSql,/Après ID/);assert.equal(result.config.transferReportId,0);assert.deepEqual(result.writes,[]);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Widget activation: legacy off-switch merged into the single home-manager setting without data loss',async()=>{
  const seed={'home-widgets':{enabled:true,announcementsWidgets:[{id:'liens-utiles',enabled:true,labelFr:'Liens personnels'}],mainBlockWidgets:[]},'home-widget-useful-links':{enabled:false,titleFr:'Mes liens conservés',links:[{id:'kept',enabled:true,column:'left',label:'Mon lien',url:'/cgi-bin/koha/custom.pl'}]}};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',seed,true);await p.evaluate(()=>{PMKConfig.subscribe=()=>()=>{}});await load(p,'137-home-widgets.js');
  const initial=await p.evaluate(async()=>PMKConfig.getConfig('home-widgets'));assert.equal(initial.announcementsWidgets.find(item=>item.id==='liens-utiles').enabled,false);assert.equal(initial.usefulLinksActivationUnified,true);
  await p.evaluate(async()=>{const cfg=await PMKConfig.getConfig('home-widgets');cfg.announcementsWidgets.find(item=>item.id==='liens-utiles').enabled=true;await PMKConfig.saveConfig('home-widgets',cfg);PMKConfig.clearCache('home-widgets')});
  const result=await p.evaluate(async()=>({home:await PMKConfig.getConfig('home-widgets'),links:__configs['home-widget-useful-links']}));assert.equal(result.home.announcementsWidgets.find(item=>item.id==='liens-utiles').enabled,true);assert.deepEqual(result.links,seed['home-widget-useful-links']);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Legacy/native patron age coexistence: one writer, customized PMK format and legacy settings retained',async()=>{
  const cfg={enabled:true,format:'years_months',language:'fr',parentheses:false};
  const p=await fixture('/cgi-bin/koha/members/moremember.pl','<div id="patron-information"><ul><li>Date de naissance : 29/02/2000 <span class="age_years">26</span></li></ul></div>',{'patron-age-display':cfg},true);
  await p.evaluate(()=>{window.KohaTools={Config:{getCanonical:()=>({enabled:true,mode:'live',general:{scope:'all'},customSetting:'legacy retained'})},getService:()=>null,registerModule:runtime=>window.__legacyAgeRuntime=runtime}});
  await load(p,'098-patron-age-display.js');await load(p,'098-age-calculation-member-detail.js');
  await p.waitForFunction(()=>PMK098PatronAgeDisplay.getConfig().format==='years_months');
  assert.match(await p.locator('.age_years').textContent(),/ans.*mois/);
  const result=await p.evaluate(()=>({activeLegacy:!!window['__KT_PARITY_patron-age-display'],legacy:PMK098LegacyConfiguration,writes:__writes}));assert.equal(result.activeLegacy,false);assert.equal(result.legacy.customSetting,'legacy retained');assert.deepEqual(result.writes,[]);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Requested settings: clean forms, preserved options and visual targeting across modules',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{},true);
  let jqueryPath=process.env.PMK_JQUERY_PATH;try{jqueryPath=jqueryPath||require.resolve('jquery')}catch(_){jqueryPath=jqueryPath||'/usr/share/javascript/jquery/jquery.min.js'}
  await p.addScriptTag({content:fs.readFileSync(jqueryPath,'utf8')});
  for(const f of ['035-resize-z3950.js','031-alert-vide-champ-modif-lot.js','079-new-release-logos.js','081-084-6xx-suggestions.js','110-exemplaire-helper.js','088-musicbrainz-coverart.js','113-autocomplete-elestic.js','130-mouvements-documents.js','136-xslt-assistant.js'])await load(p,f);
  const audit=await p.evaluate(()=>{
    const definitions=__defs;
    const walk=fields=>(fields||[]).flatMap(f=>[f,...walk(f.fields)]);
    const names=['070','patron-input-automation','z3950-workspace','batchmod-empty-field-warning','item-entry-assistant','cataloguing-tree-assistant','bibliographic-markers','new-release-indicators','musicbrainz-coverart','search-autocomplete-performance','external-links','xslt-assistant'];
    return Object.fromEntries(names.filter(id=>definitions.has(id)).map(id=>{const def=definitions.get(id);const fields=walk(def.schema);return [id,{name:def.name,text:fields.map(f=>JSON.stringify([f.label,f.description,f.help])).join(' '),fields:fields.filter(f=>f.key).map(f=>({key:f.key,type:f.type})),defaults:def.defaults}]}));
  });
  assert.equal(audit['search-autocomplete-performance'].name.fr,'Autocomplétion Recherche catalogue');assert(!/Performance et cache|Classement avancé|Pondérations par défaut/.test(audit['search-autocomplete-performance'].text));assert(audit['search-autocomplete-performance'].fields.some(f=>f.key==='performance.searchCacheTtlMs'));assert(audit['search-autocomplete-performance'].fields.some(f=>f.key==='scoring.titleExact'));
  assert(!/Compatibilité|PMKInputNormalization est réutilisable/.test(audit['z3950-workspace'].text));assert(!/PMK ne vide aucun champ/.test(audit['batchmod-empty-field-warning'].text));assert(!/Le 110 reste autonome|Stockage Firebase provisoire|Compatibilité transitoire/.test(audit['item-entry-assistant'].text));assert(!audit['cataloguing-tree-assistant'].fields.some(f=>f.key==='runtimeMode'));assert(!/MusicBrainz indique/.test(audit['musicbrainz-coverart'].text));assert.equal(audit['xslt-assistant'].name.fr,'Éditeur XSLT');
  for(const id of ['070','bibliographic-markers','new-release-indicators'])assert(audit[id].fields.some(f=>f.type==='elementPicker'),id+' has no visual target');
  // Open every core-defined form: catches broken schemas, rendering failures and accidental writes.
  const ids=await p.evaluate(()=>[...__defs].filter(([id,d])=>!d.navigationHidden).map(([id])=>id));
  assert(ids.length>=39);
  p.on('dialog',dialog=>dialog.accept());
  for(const id of ids){await p.evaluate(id=>PMKConfig.openAdmin(id),id);assert.equal(await p.locator('.pmk-settings-intro').count(),0,id);}
  assert.deepEqual(await p.evaluate(()=>__writes),[]);assert(!p.errors.length,p.errors.join('\n'));console.log('  Forms opened: '+ids.length);await p.close();
 });
 await check('Shared menu ergonomics: all presentations, mobile bounds and inline search results',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{},true);
  for(const presentation of ['side','dropdown','mega']){
    await p.evaluate(presentation=>{document.querySelectorAll('.test-menu').forEach(n=>n.remove());const panel=PMKMenuEngine.renderPanel({items:[{id:'nested',parentId:'',kind:'submenu',presentation,labelFr:'Rubrique',enabled:true},{id:'result',parentId:'nested',kind:'link',labelFr:'Cible recherchée',url:'/cgi-bin/koha/tools/test.pl',enabled:true}]});panel.classList.add('test-menu');panel.style.maxWidth='300px';document.body.appendChild(panel)},presentation);
    await p.setViewportSize({width:1280,height:720});await p.getByRole('button',{name:'Rubrique',exact:true}).click();assert(await p.getByRole('menuitem',{name:'Cible recherchée'}).isVisible());
    await p.getByRole('searchbox').fill('recherchée');assert.equal(await p.locator('.pmk-menu-searching').count(),1);if(presentation==='side')assert.equal(await p.locator('.test-menu .dropdown-menu').evaluate(n=>getComputedStyle(n).position),'static');
    await p.getByRole('searchbox').fill('');await p.setViewportSize({width:320,height:640});await p.getByRole('button',{name:'Rubrique',exact:true}).click();
    const bounds=await p.getByRole('menuitem',{name:'Cible recherchée'}).boundingBox();assert(bounds&&bounds.x>=0&&bounds.x+bounds.width<=320,presentation+' exceeds viewport');
    await p.getByRole('button',{name:'Rubrique',exact:true}).focus();await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'Cible recherchée');await p.keyboard.press('ArrowLeft');assert.equal(await p.getByRole('button',{name:'Rubrique',exact:true}).getAttribute('aria-expanded'),'false');
  }
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Core compatibility and old migrations: one core, explicit MusicBrainz and external-link choices retained',async()=>{
  const seed={'musicbrainz-coverart':{enabled:true,searchEnabled:false,custom:{mine:1}},'external-links':{enabled:true,pages:[{pageId:'catalogue.detail',presentation:'inline-grid',enabled:true}],custom:{mine:2}}};
  const p=await fixture('/cgi-bin/koha/catalogue/detail.pl','',seed);
  await p.evaluate(()=>{delete window.PMKConfig;window.__coreReadyCount=0;window.addEventListener('pmk:config-ready',()=>__coreReadyCount++)});
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/000-drac-quality-memory-firebase.js'});
  assert.equal(await p.evaluate(()=>window.DracQualityMemory),undefined);
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/000-pmk-config-firestore.js'});
  await p.waitForFunction(()=>window.PMKConfig?.services?.get('pmk.date-settings'));
  await p.evaluate(()=>window.__canonicalCore=PMKConfig);
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/000-pmk-config-firestore.js'});await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/000-drac-quality-memory-firebase.js'});
  await load(p,'088-musicbrainz-coverart.js');await load(p,'010-boutons-recherche-externe.js');
  await p.waitForFunction(()=>__PMK_EXTERNAL_LINKS_010__.getConfig().pages.some(page=>page.pageId==='catalogue.detail'));
  const result=await p.evaluate(()=>({same:PMKConfig===__canonicalCore,ready:__coreReadyCount,music:PMK088MusicBrainzCoverArt.status().config,links:__PMK_EXTERNAL_LINKS_010__.getConfig(),writes:__writes,stored:__configs}));
  assert.equal(result.same,true);assert.equal(result.ready,1);assert.equal(result.music.searchEnabled,false);assert.equal(result.links.pages.find(page=>page.pageId==='catalogue.detail').presentation,'inline-grid');assert.deepEqual(result.writes,[]);assert.deepEqual(result.stored,seed);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Address autocomplete: six custom targets and historical disabled state',async()=>{
  const config={enabled:true,geoBias:{enabled:false},addresses:{primary:{enabled:true,addressSelector:'#road1',zipcodeSelector:'#zip1',citySelector:'#town1'},secondary:{enabled:true,addressSelector:'#road2',zipcodeSelector:'#zip2',citySelector:'#town2'}}};
  const p=await fixture('/cgi-bin/koha/members/memberentry.pl','<input id="road1"><input id="zip1"><input id="town1"><input id="road2"><input id="zip2"><input id="town2">',{'070':config},true);
  await p.route('https://data.geopf.fr/**',route=>route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({results:[{fulltext:'12 bis rue des Fleurs 83300 Draguignan',street:'rue des Fleurs',city:'Draguignan',zipcode:'83300',number:'12 bis',x:6.46,y:43.53}]})}));
  await load(p,'070-address-autocomplete-memberentry.js');
  for(const suffix of ['1','2']){await p.locator('#road'+suffix).fill('12 bis rue');const listId=await p.locator('#road'+suffix).getAttribute('aria-controls');await p.locator('#'+listId+' .pmk070-option').first().click();assert.equal(await p.locator('#road'+suffix).inputValue(),'12 bis rue des Fleurs');assert.equal(await p.locator('#zip'+suffix).inputValue(),'83300');assert.equal(await p.locator('#town'+suffix).inputValue(),'Draguignan');await p.waitForTimeout(350);assert.equal(await p.locator('#road'+suffix).getAttribute('aria-expanded'),'false');}
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('070');c.enabled=false;await PMKConfig.saveConfig('070',c)});assert.equal(await p.locator('.pmk070-suggestions').count(),0);
  await p.evaluate(()=>{__configs['070']={enabled:true,page:{enabled:false}};PMKConfig.clearCache('070')});const cfg=await p.evaluate(()=>PMKConfig.getConfig('070'));assert.equal(cfg.enabled,false);assert.equal(cfg.page.enabled,true);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Patron phone automation: source/target choices, overwrite preference and independent function switch',async()=>{
  const cfg={enabled:true,titleSexEnabled:false,messagePrefsEnabled:false,passwordEnabled:false,attributeDefaultsEnabled:false,useridEnabled:false,phoneSmsEnabled:true,phoneSourceSelector:'#myphone',smsTargetSelector:'#mysms',phoneSmsOverwrite:'if-empty'};
  const p=await fixture('/cgi-bin/koha/members/memberentry.pl','<input id="myphone" value="0612345678"><input id="mysms" value="+33700000000">',{'patron-page-utils':cfg},true);await load(p,'057-member-pages-utils.js');
  await p.waitForFunction(()=>window.PMK057PatronPageUtils&&document.querySelector('[data-pmk057-hint]'));
  assert.equal(await p.locator('#mysms').inputValue(),'+33700000000');
  await p.locator('#mysms').fill('');await p.locator('#myphone').fill('0712345678');assert.equal(await p.locator('#mysms').inputValue(),'+33712345678');
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('patron-page-utils');c.phoneSmsEnabled=false;await PMKConfig.saveConfig('patron-page-utils',c)});await p.locator('#mysms').fill('');await p.locator('#myphone').fill('0698765432');assert.equal(await p.locator('#mysms').inputValue(),'');
  await p.evaluate(()=>PMKConfig.openAdmin('patron-page-utils'));assert.equal(await p.locator('[data-pmk-section-id="phone-sms"]').getByRole('switch',{name:'Activer cet automatisme',exact:true}).count(),1);assert.equal(await p.getByRole('switch',{name:'Activer ou désactiver ce module',exact:true}).count(),1);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Catalogue refresh: requested forms, explanations, defaults and preservation',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{'moredetail-layout':{custom:{mine:1},layout:{desktopColumns:2}},'holdings-table-presentation':{custom:{mine:2}}},true);
  for(const file of ['011-moredetail-layout.js','033-mod-table-exemplaires.js','009-4eme-de-couv.js','063-mis-en-page-catalogue.js','068-blinking-barcode.js','129-mise-en-forme-exemplaire.js','146-checkout-status-correction-pmk.js'])await load(p,file);
  const definitions=await p.evaluate(()=>{const walk=fields=>(fields||[]).flatMap(field=>[field,...walk(field.fields)]);return Object.fromEntries([...__defs].map(([id,def])=>[id,{name:def.name,schema:walk(def.schema).map(f=>({key:f.key,id:f.id,type:f.type,label:f.label,description:f.description,help:f.help})),defaults:def.defaults}]))});
  assert(!definitions['detail-bibliographic-groups'].schema.some(f=>f.id==='pages'));
  assert(definitions['detail-bibliographic-groups'].schema.some(f=>f.description?.fr?.includes('ligne bibliographique complète')));
  assert(!definitions['moredetail-layout'].schema.some(f=>f.id==='activation'));
  assert(!definitions['holdings-table-presentation'].schema.some(f=>f.id==='activation'));
  assert(definitions['moredetail-layout'].schema.some(f=>f.key==='structure.items'&&f.type==='elementPicker'));
  assert(definitions['holdings-table-presentation'].schema.some(f=>f.key==='detail.tableSelector'&&f.type==='elementPicker'));
  assert(!definitions['transfer-button-holdings'].schema.some(f=>['general','workflow'].includes(f.id)));
  assert.equal(definitions['checkout-status-correction'].name.fr,'Correction du statut au prêt');
  assert.equal(definitions['search-results-master'].schema.find(f=>f.key==='notice.layoutEnabled').label.fr,'Utiliser la présentation enrichie des notices');
  assert(!definitions['search-results-master'].schema.some(f=>f.label?.fr==='API et performances'||/rendu historique V8.1/.test(f.description?.fr||'')));
  assert(definitions['search-results-master'].schema.some(f=>f.key==='performance.apiPerPage'));
  assert(definitions['detail-fourth-cover'].schema.some(f=>f.key==='targetSelector'&&f.type==='elementPicker'));
  assert.equal(definitions['search-results-master'].defaults.reports.statisticsReportId,4537);assert.equal(definitions['search-results-master'].defaults.reports.statisticsReportFormat,'legacy-dracenie');
  assert(definitions['moredetail-layout'].defaults.fieldRules.some(rule=>rule.selector==='.copynumber'&&rule.labelFr==='Sous-localisation'));
  assert.equal(definitions['holdings-table-presentation'].defaults.detail.statusRules.find(rule=>rule.statusKey==='available').rowBackground,'#ebfaeb');
  for(const id of ['detail-bibliographic-groups','moredetail-layout','holdings-table-presentation','callnumber-progressive-search','barcode-highlights','search-results-master','detail-fourth-cover','transfer-button-holdings','checkout-status-correction']){await p.evaluate(id=>PMKConfig.openAdmin(id),id);assert.equal(await p.locator('.pmk-settings-intro').count(),0);}
  await p.evaluate(async()=>{for(const id of ['moredetail-layout','holdings-table-presentation'])await PMKConfig.saveConfig(id,await PMKConfig.getConfig(id))});
  assert.equal(await p.evaluate(()=>__configs['moredetail-layout'].custom.mine),1);assert.equal(await p.evaluate(()=>__configs['holdings-table-presentation'].custom.mine),2);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Catalogue refresh: native item cards retain Dracenie rules, fields, events and original order',async()=>{
  const item=id=>'<div id="container'+id+'"><h3 id="item'+id+'">CB'+id+'</h3><div class="page-section" id="collapse_item'+id+'"><div class="listgroup" id="info'+id+'"><h4>Informations</h4><div class="rows"><ol class="bibliodetails"><li class="copynumber"><span class="label">Copie :</span> A'+id+'</li><li class="custom-field"><span class="label">Personnel :</span><input value="initial" id="input'+id+'"></li></ol></div></div><div class="listgroup" id="history'+id+'"><h4>Historique</h4><div class="rows"><ol class="bibliodetails"><li class="issues"><span class="label">Prêts :</span> 1</li></ol></div></div></div></div>';
  const body='<div id="catalogue_detail_biblio"><div class="page-section" id="bib"><h2>Notice</h2><ol class="bibliodetails"><li class="rentalcharge">Prix</li></ol></div>'+item(1)+'<p id="between">Intercalé</p>'+item(2)+'<p id="after">Après</p></div>';
  const p=await fixture('/cgi-bin/koha/catalogue/moredetail.pl',body,{},true);
  await p.evaluate(()=>{window.__originalOrder=[...document.querySelector('#catalogue_detail_biblio').children].map(n=>n.id);window.__originalInput=document.querySelector('#input1');window.__inputEvents=0;__originalInput.addEventListener('change',()=>__inputEvents++)});
  await load(p,'011-moredetail-layout.js');await p.waitForSelector('.pmk-md-item-card');assert.equal(await p.locator('.pmk-md-item-card').count(),2);assert.equal(await p.locator('#info1 .copynumber .label').textContent(),'Sous-localisation:');assert.equal(await p.locator('.rentalcharge.pmk-md-hidden').count(),1);
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('moredetail-layout');c.fieldRules.push({enabled:true,scope:'item',selector:'.custom-field',destinationGroup:'history',order:1,visible:true});await PMKConfig.saveConfig('moredetail-layout',c)});
  assert.equal(await p.locator('#history1 .custom-field').count(),1);assert.equal(await p.locator('#history2 .custom-field').count(),1);await p.locator('#input1').fill('personnalisé');await p.locator('#input1').dispatchEvent('change');assert.equal(await p.evaluate(()=>__inputEvents),1);
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('moredetail-layout');c.enabled=false;await PMKConfig.saveConfig('moredetail-layout',c)});
  const restored=await p.evaluate(()=>({order:[...document.querySelector('#catalogue_detail_biblio').children].map(n=>n.id),original:__originalOrder,same:document.querySelector('#input1')===__originalInput,value:__originalInput.value}));assert.deepEqual(restored.order,restored.original);assert.equal(restored.same,true);assert.equal(restored.value,'personnalisé');assert.equal(await p.locator('#info1 .copynumber .label').textContent(),'Copie :');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Catalogue refresh: custom item page and structure, extra sections and shared picker',async()=>{
  const copy=id=>'<article class="copy" id="copy'+id+'"><h2 class="copy-title">'+id+'</h2><div class="content"><section class="part main"><h4 class="heading">Principal</h4><div class="values"><ul class="fields"><li class="tag"><span class="field-label">Tag :</span> valeur '+id+'</li></ul></div></section><section class="part extra"><h4 class="heading">Autre</h4><div class="values"><ul class="fields"></ul></div></section></div></article>';
  const cfg={enabled:true,pages:[{pageId:'catalogue.moredetail',enabled:true,path:'custom/copies.pl'}],structure:{root:'#copies',biblioSection:'.bib',items:':scope > article.copy',itemHeading:'.copy-title',itemContent:'.content',groups:':scope > section.part',groupHeading:'.heading',groupRows:'.values',fieldList:'.fields',field:'li',label:'.field-label'},sections:[{key:'main',selector:'.main',visible:true},{key:'extra',selector:'.extra',labelFr:'Informations locales',visible:true,collapsible:true}],fieldRules:[{enabled:true,scope:'item',selector:'.tag',labelFr:'Identifiant local',destinationGroup:'extra',visible:true}]};
  const p=await fixture('/cgi-bin/koha/custom/copies.pl','<div id="copies">'+copy(1)+copy(2)+'</div>',{'moredetail-layout':cfg},true);await load(p,'011-moredetail-layout.js');await p.waitForSelector('.pmk-md-item-card');assert.equal(await p.locator('.extra .tag').count(),2);assert.equal(await p.locator('#copy1 .field-label').textContent(),'Identifiant local:');assert.match(await p.locator('#copy1 .extra .heading').textContent(),/Informations locales/);
  await p.evaluate(()=>{window.__picked=null;PMK011MoreDetail.pickElement({rootObject:__configs['moredetail-layout'],fieldPath:['fieldRules',0,'selector']}).then(result=>window.__picked=result)});await p.locator('#copy1 .tag .field-label').click();await p.waitForFunction(()=>window.__picked);const picked=await p.evaluate(()=>__picked);assert.equal(picked.scope,'item');assert.equal(picked.selector,'.tag');
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Catalogue refresh: native holdings colors, sorting controls and links restore without cloning',async()=>{
  const body='<span data-branchcode="LIB"></span><table id="holdings_table"><thead><tr><th data-colname="copynumber"><span class="dt-column-title">Copie</span><button id="sort">Tri</button></th></tr></thead><tbody><tr><td class="status"><span>Disponible</span></td><td class="location">Lib</td><td><span class="shelvingloc"><a id="shelflink" href="#shelf">Permanent (Courant)</a></span></td></tr></tbody></table>';
  const p=await fixture('/cgi-bin/koha/catalogue/detail.pl',body,{},true);
  await p.evaluate(()=>{window.__sort=document.querySelector('#sort');window.__link=document.querySelector('#shelflink');window.__sortClicks=0;__sort.addEventListener('click',()=>__sortClicks++);window.jQuery=el=>el===document?{on:()=>{}}:{DataTable:()=>({row:()=>({data:()=>({_status:['available'],holding_library_id:'LIB',_strings:{location:{str:'Courant'}}})})})};jQuery.fn={dataTable:{isDataTable:()=>true}}});
  await load(p,'033-mod-table-exemplaires.js');await p.waitForSelector('.pmk033-current-library-icon',{state:'attached'});assert.equal(await p.locator('.dt-column-title').textContent(),'Sous-localisation');assert.equal(await p.locator('.shelvingloc').textContent(),'Courant');assert.equal(await p.locator('tbody tr').evaluate(n=>n.style.getPropertyValue('--pmk033-row-background')),'#ebfaeb');await p.locator('#sort').click();assert.equal(await p.evaluate(()=>__sortClicks),1);
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('holdings-table-presentation');c.enabled=false;await PMKConfig.saveConfig('holdings-table-presentation',c)});assert.equal(await p.locator('.dt-column-title').textContent(),'Copie');assert(await p.evaluate(()=>document.querySelector('#sort')===__sort&&document.querySelector('#shelflink')===__link));assert.equal(await p.locator('.pmk033-current-library-icon').count(),0);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Catalogue refresh: custom holdings and course targets, local statuses and redraws',async()=>{
  const cfg={enabled:true,pages:[{pageId:'catalogue.detail',enabled:true,path:'custom/record.pl'},{pageId:'course_reserves.course-details',enabled:true,path:'custom/courses.pl'}],library:{nameSelector:'#library-name'},detail:{tableSelector:'#copies',statusCellSelector:'.state',locationCellSelector:'.site',locationSelector:'.local-shelf',columnLabels:[{id:'local',enabled:true,headerSelector:'#local-head',labelFr:'Rayon local'}],statusRules:[{id:'local-ready',enabled:true,statusKey:'available',selector:'.ready',matchText:'^Ready$',rowBackground:'#112233',textColor:'#445566',bold:true}]},course:{tableSelector:'#course',statusCellSelector:'.state',availableSelector:'.free',availableLabelFr:'Disponible ici',statusRules:[{id:'available',enabled:true,statusKey:'available',selector:'.free',textColor:'#008000',bold:true}]}};
  const row='<tr><td class="state"><span class="ready">Ready</span></td><td class="site">Bibliothèque locale</td><td><span class="local-shelf">Permanent (Courant)</span></td></tr>';
  const p=await fixture('/cgi-bin/koha/custom/record.pl','<span id="library-name">Bibliothèque locale</span><table id="copies"><thead><tr><th id="local-head">Native</th></tr></thead><tbody>'+row+'</tbody></table>',{'holdings-table-presentation':cfg},true);await load(p,'033-mod-table-exemplaires.js');await p.waitForSelector('.pmk033-current-library-icon',{state:'attached'});assert.equal(await p.locator('#local-head').textContent(),'Rayon local');assert.equal(await p.locator('.local-shelf').textContent(),'Courant');assert.equal(await p.locator('tbody tr').evaluate(n=>n.style.getPropertyValue('--pmk033-row-background')),'#112233');
  await p.locator('tbody').evaluate((body,html)=>body.insertAdjacentHTML('beforeend',html),row);await p.waitForFunction(()=>document.querySelectorAll('.pmk033-current-library-icon').length===2);assert(!p.errors.length,p.errors.join('\n'));await p.close();
  const c=await fixture('/cgi-bin/koha/custom/courses.pl','<table id="course"><tbody><tr><td class="state"><span class="free">Ready</span></td></tr></tbody></table>',{'holdings-table-presentation':cfg},true);await load(c,'033-mod-table-exemplaires.js');await c.waitForFunction(()=>document.querySelector('.free').textContent==='Disponible ici');await c.evaluate(async()=>{const config=await PMKConfig.getConfig('holdings-table-presentation');config.enabled=false;await PMKConfig.saveConfig('holdings-table-presentation',config)});assert.equal(await c.locator('.free').textContent(),'Ready');assert(!c.errors.length,c.errors.join('\n'));await c.close();
 });
 await check('Catalogue refresh: summary visual target, placement choices, missing target and restoration',async()=>{
  const body='<div id="original"><span class="results_summary electre"><span class="label">Résumé :</span>Un résumé conservé.</span><p id="original-next">Suite</p></div><div id="target">Destination</div><div id="catalogue_detail_biblio"><div class="page-section">Zone native</div></div>';
  const p=await fixture('/cgi-bin/koha/catalogue/detail.pl',body,{'detail-fourth-cover':{enabled:true,targetSelector:'#target',targetPlacement:'after'}},true);await p.evaluate(()=>{document.body.id='catalog_detail';window.__source=document.querySelector('.electre')});await load(p,'009-4eme-de-couv.js');await p.waitForSelector('#pmk-detail-fourth-cover');assert.equal(await p.locator('#target').evaluate(node=>node.nextElementSibling.id),'pmk-detail-fourth-cover');
  for(const placement of ['before','append','prepend']){await p.evaluate(async placement=>{const c=await PMKConfig.getConfig('detail-fourth-cover');c.targetPlacement=placement;await PMKConfig.saveConfig('detail-fourth-cover',c)},placement);await p.waitForFunction(placement=>{const t=document.querySelector('#target'),w=document.querySelector('#pmk-detail-fourth-cover');return placement==='before'?t.previousElementSibling===w:placement==='append'?t.lastElementChild===w:t.firstElementChild===w},placement);}
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('detail-fourth-cover');c.targetSelector='#absent';await PMKConfig.saveConfig('detail-fourth-cover',c)});await p.waitForFunction(()=>!document.querySelector('#pmk-detail-fourth-cover'));assert(await p.evaluate(()=>document.querySelector('#original .electre')===__source));assert.equal(await p.locator('#original').evaluate(n=>n.firstElementChild.nextElementSibling.id),'original-next');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Catalogue refresh: statistics SQL contract, custom report ID and historical parameters',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{},true);await load(p,'129-mise-en-forme-exemplaire.js');
  const legacy=await p.evaluate(()=>PMK129SearchResults.getStatisticsUrl(123));const legacyUrl=new URL(legacy,'http://pmk.test');assert.equal(legacyUrl.searchParams.get('id'),'4537');assert.equal(legacyUrl.searchParams.getAll('param_name').length,13);assert(legacyUrl.searchParams.getAll('param_name').includes('Numéro exemplaire'));
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('search-results-master');c.reports.statisticsReportId=999;c.reports.statisticsReportFormat='standard';await PMKConfig.saveConfig('search-results-master',c)});
  const standard=new URL(await p.evaluate(()=>PMK129SearchResults.getStatisticsUrl(123)),'http://pmk.test');assert.equal(standard.searchParams.get('id'),'999');assert.deepEqual(standard.searchParams.getAll('param_name'),['Numéro exemplaire']);assert.deepEqual(standard.searchParams.getAll('sql_params'),['123']);
  const sql=await p.evaluate(()=>PMK129SearchResults.getConfig().reports.statisticsReportSql);assert.equal(sql.trim(),fs.readFileSync(root+'sql/129-statistiques-prets-exemplaire.sql','utf8').trim());assert.equal((sql.match(/<<Numéro exemplaire>>/g)||[]).length,1);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Catalogue refresh: statistics SQL counts preserved history without multiplying checkouts',async()=>{
  const {execFileSync}=require('node:child_process');
  const program=String.raw`import sqlite3,sys,json
sql=open(sys.argv[1]).read().replace('<<Numéro exemplaire>>','1')
db=sqlite3.connect(':memory:')
db.executescript("CREATE TABLE items(itemnumber INTEGER, barcode TEXT, biblionumber INTEGER, issues INTEGER); CREATE TABLE biblio(biblionumber INTEGER,title TEXT); CREATE TABLE issues(itemnumber INTEGER,renewals_count INTEGER,issuedate TEXT); CREATE TABLE old_issues(itemnumber INTEGER,renewals_count INTEGER,issuedate TEXT,returndate TEXT); INSERT INTO items VALUES(1,'CB1',1,8),(2,'CB2',2,0); INSERT INTO biblio VALUES(1,'Titre'); INSERT INTO issues VALUES(1,2,'2026-10-01'),(2,9,'2026-01-01'); INSERT INTO old_issues VALUES(1,1,'2025-01-01','2025-02-01'),(1,0,'2025-03-01','2025-04-01'),(2,99,'2020-01-01','2020-02-01');")
result=db.execute(sql).fetchone()
empty=db.execute(sql.replace('i.itemnumber = 1','i.itemnumber = 3')).fetchall()
print(json.dumps({'row':result,'empty':empty}))`;
  const result=JSON.parse(execFileSync('python3',['-c',program,root+'sql/129-statistiques-prets-exemplaire.sql'],{encoding:'utf8'}));assert.equal(result.row[3],8);assert.equal(result.row[4],1);assert.equal(result.row[5],2);assert.equal(result.row[6],3);assert.equal(result.row[7],3);assert.deepEqual(result.empty,[]);
 });

 await check('Transfer shortcut survives delayed holdings, tbody replacement and deactivation',async()=>{
  const p=await fixture('/cgi-bin/koha/catalogue/detail.pl','<table id="holdings_table"><thead><tr><th data-colname="status">Status</th><th data-colname="barcode">Barcode</th><th data-colname="actions">Actions</th></tr></thead><tbody></tbody></table>');
  await load(p,'028-transfer-buttons-holdings.js');
  // The historical six-second first-row wait used to abandon this table.
  await p.waitForTimeout(6200);
  const row='<tr><td>Available</td><td>PMKTEST-DELAYED</td><td></td></tr>';
  await p.evaluate(row=>document.querySelector('tbody').innerHTML=row,row);
  await p.locator('[data-pmk028-transfer]').waitFor();
  await p.evaluate(row=>document.querySelector('tbody').outerHTML='<tbody>'+row+'</tbody>',row);
  await p.locator('[data-pmk028-transfer]').waitFor();
  assert.equal(await p.locator('[data-pmk028-transfer]').count(),1);
  await p.evaluate(()=>PMKConfig.saveConfig('transfer-button-holdings',{enabled:false}));
  await p.waitForTimeout(250);
  assert.equal(await p.locator('[data-pmk028-transfer]').count(),0);
  assert.deepEqual(p.errors,[]);await p.close();
 });
 await check('Circulation refresh: useful forms, named renewal reasons, target pickers and copyable transfer SQL',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{},true);
  for(const file of ['007-highlight-readingrec.js','008-issuehistory-timeline.js','114-renew-modif.js','125-double_clic_resrvation.js','006-copy-patron-identifiers.js','139-attendance-mediabus.js']) {
   if(file==='139-attendance-mediabus.js')await p.evaluate(()=>{__configs['attendance-mediabus-mini']={autoOpen:false}});
   await load(p,file);
  }
  const defs=await p.evaluate(()=>{const walk=fs=>(fs||[]).flatMap(f=>[f,...walk(f.fields)]);return Object.fromEntries([...__defs].map(([id,d])=>[id,{name:d.name,fields:walk(d.schema).map(f=>({id:f.id,key:f.key,type:f.type,label:f.label,advanced:f.advanced,showInSimple:f.showInSimple})),reason:walk(d.schema).find(f=>f.key==='reasonLabels')?.itemTitle({code:'too_many',fr:'Nombre maximal atteint'},0,'fr')}]))});
  assert.equal(defs['renewal-enhancements'].reason,'Nombre maximal atteint');
  assert.match(defs['history-row-highlights'].name.fr,/Repères/);assert.match(defs['loan-history-timeline'].name.fr,/prêts et des retours/);
  assert(defs['hold-submit-guard'].fields.some(f=>f.key==='buttonSelector'&&f.type==='elementPicker'&&!f.advanced));
  assert(!defs['lost-found-checkin-status'].fields.some(f=>['how-it-works','safety','pages'].includes(f.id)));
  assert(defs['lost-found-checkin-status'].fields.some(f=>f.id==='synchronization'));
  assert(defs['loan-history-timeline'].fields.some(f=>f.key==='transferReportSql'&&f.type==='readonly'&&f.showInSimple));
  assert(!defs['copy-actions'].fields.some(f=>f.label?.fr==='Chargement dynamique'||f.key==='feedbackPlacement'));
  assert.equal(defs['attendance-mediabus-mini'].name.fr,'Compteur de fréquentation');
  const sql=await p.evaluate(()=>PMKConfig.getDefinition('loan-history-timeline').defaults.transferReportSql);assert.equal(sql.replace(/\r/g,'').trim(),fs.readFileSync(root+'sql/008-historique-transferts.sql','utf8').trim());
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('loan-history-timeline');c.showTransfers=true;await PMKConfig.saveConfig('loan-history-timeline',c);await PMKConfig.openAdmin('loan-history-timeline')});
  assert(await p.locator('.pmk-code-value').isVisible());assert(await p.locator('.pmk-readonly-actions button').isVisible());
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Circulation refresh: dates merge legacy choices and raw sources without writing old documents',async()=>{
  const waiting={enabled:true,displayMode:'since',warning:{enabled:true,thresholdDays:12},tabs:{waiting:true,expired:false,cancelled:true},columns:{waitingSince:true,holdDate:true,expirationDate:false},custom:{mine:8}};
  const loan={enabled:false,showFuture:false,showToday:true,showOverdue:true,displayLanguage:'en',custom:{mine:9}};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{'waiting-holds-age':waiting,'loan-duration-detail':loan,'relative-dates':{rules:[{id:'my-date',targetMode:'element',selector:'#missing',pagePath:'*',enabled:false,custom:6}]}},true);
  const blocked=await p.evaluate(async()=>{__readFailures=['waiting-holds-age'];try{await PMKConfig.saveConfig('relative-dates',{});return false}catch(_){return __writes.length===0}finally{__readFailures=[]}});assert.equal(blocked,true);
  const result=await p.evaluate(async()=>{const c=await PMKConfig.getConfig('relative-dates');await PMKConfig.saveConfig('relative-dates',c);return {c,old:__configs,writes:__writes.map(w=>w.id)}});
  assert.equal(result.c.rules[0].custom,6);assert.equal(result.c.rules.filter(r=>r.originModule==='loan-duration-detail'&&r.enabled).length,0);
  assert.equal(result.c.rules.find(r=>r.id==='waiting-waiting-waitingSince').warningDays,12);
  assert.equal(result.c.rules.find(r=>r.id==='waiting-expired-waitingSince').enabled,false);
  assert.deepEqual(result.c.migrations.dateRuleSources['waiting-holds-age'],waiting);assert.deepEqual(result.old['waiting-holds-age'],waiting);assert.deepEqual(result.old['loan-duration-detail'],loan);assert.deepEqual(result.writes,['relative-dates']);
  await p.evaluate(async()=>{await PMKConfig.saveConfig('loan-duration-detail',{enabled:true});PMKConfig.clearCache('loan-duration-detail')});
  assert.equal(await p.evaluate(async()=>(await PMKConfig.getConfig('loan-duration-detail')).custom.mine),9);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Circulation refresh: waiting hold days, alerts, future dates, editable targeting and one renderer',async()=>{
  const p=await fixture('/cgi-bin/koha/circ/waitingreserves.pl','<table id="holdst"><thead><tr><th>Choix</th><th>En attente depuis</th></tr></thead><tbody><tr><td></td><td data-order="2026-09-01">1 septembre</td></tr><tr><td></td><td data-order="2026-10-18">demain</td></tr></tbody></table>',{},true);
  await p.clock.setFixedTime(new Date('2026-10-17T10:00:00+02:00'));
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/014-calcule-dates-reservations.js'});
  await p.waitForSelector('#holdst [data-pmk-relative-date-generated]');
  assert.equal(await p.locator('#holdst [data-pmk-relative-date-generated]').count(),1);
  assert.equal(await p.locator('#holdst [data-pmk-relative-date-generated]').textContent(),'46 jours');
  assert.equal(await p.locator('#holdst [data-pmk-relative-date-generated]').evaluate(n=>n.style.color),'rgb(185, 28, 28)');
  await load(p,'070-date-utils.js');assert.equal(await p.locator('#holdst [data-pmk-relative-date-generated]').count(),1);
  await p.evaluate(async()=>{const cfg=await PMKConfig.getConfig('relative-dates');cfg.rules.find(r=>r.id==='waiting-waiting-waitingSince').durationFormat='days-since';await PMKConfig.saveConfig('relative-dates',cfg)});
  assert.equal(await p.locator('#holdst [data-pmk-relative-date-generated]').textContent(),'depuis 46 jours');
  await p.evaluate(async()=>{const cfg=await PMKConfig.getConfig('relative-dates');cfg.rules.filter(r=>r.originModule==='waiting-holds-age').forEach(r=>r.enabled=false);await PMKConfig.saveConfig('relative-dates',cfg)});
  assert.equal(await p.locator('#holdst [data-pmk-relative-date-generated]').count(),0);assert.equal(await p.locator('#holdst td[data-order]').first().textContent(),'1 septembre');
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Circulation refresh: due dates use structured Koha data and retain independent visibility and language',async()=>{
  const p=await fixture('/cgi-bin/koha/catalogue/detail.pl','<table id="holdings_table"><thead><tr><th data-colname="status">Statut</th></tr></thead><tbody><tr><td>Emprunté</td></tr><tr><td>Emprunté</td></tr><tr><td>Disponible</td></tr></tbody></table>',{'relative-dates':{enabled:false,nativeAge:{enabled:true},relativeDatesEnabled:true,migrations:{ageDatesUnified:1}},'loan-duration-detail':{enabled:true,displayLanguage:'en',showToday:false}},true);
  await p.clock.setFixedTime(new Date('2026-10-17T10:00:00+02:00'));
  await p.addScriptTag({path:process.env.PMK_JQUERY_PATH||'/usr/share/javascript/jquery/jquery.min.js'});
  await p.evaluate(()=>{jQuery.fn.dataTable={isDataTable:()=>true};jQuery.fn.DataTable=function(){return {row:node=>({data:()=>({checkout:{due_date:node.rowIndex===1?'2026-10-20':node.rowIndex===2?'2026-10-17':null}})})}}});
  await load(p,'070-date-utils.js');await p.waitForSelector('.pmk-loan-duration-indicator');
  assert.equal(await p.locator('.pmk-loan-duration-indicator').count(),1);assert.equal(await p.locator('.pmk-loan-duration-indicator').textContent(),'3 days remaining');
  const migrated=await p.evaluate(()=>PMKConfig.getConfig('relative-dates'));assert.equal(migrated.nativeAge.enabled,false);assert.equal(migrated.relativeDatesEnabled,false);assert.equal(migrated.migrations.dateRuleSources.relativeDates.enabled,false);
  await p.evaluate(()=>{VC_DATE_UTILS.applyConfiguredRules();VC_DATE_UTILS.applyConfiguredRules()});assert.equal(await p.locator('.pmk-loan-duration-indicator').count(),1);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Circulation refresh: authorised-value sync retains missing local rules, choices and metadata',async()=>{
  const original={lostStatuses:[{value:'1',enabled:false,description:'Ancien',custom:7},{value:'99',enabled:false,description:'Local',custom:8}],notLoanRules:[{value:'5',enabled:false,action:'keep',custom:9},{value:'88',enabled:true,action:'ask',custom:10}]};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{'lost-found-checkin-status':original},true);
  await p.route('**/api/v1/authorised_value_categories/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(route.request().url().includes('/LOST/')?[{value:'1',description:'Renommé'},{value:'2',description:'Nouveau'}]:[{value:'0',description:'Disponible'},{value:'5',description:'Exclu'},{value:'6',description:'Nouveau'}])}));
  const result=await p.evaluate(async()=>{const root=await PMKConfig.getConfig('lost-found-checkin-status');const action=__defs.get('lost-found-checkin-status').schema.find(f=>f.id==='synchronization').fields[0];const result=await action.action({rootObject:root,language:'fr'});return {root,result,writes:__writes}});
  assert.equal(result.result.changed,true);assert.equal(result.root.lostStatuses.find(r=>r.value==='99').custom,8);assert.equal(result.root.lostStatuses.find(r=>r.value==='1').enabled,false);assert.equal(result.root.notLoanRules.find(r=>r.value==='5').action,'keep');assert.equal(result.root.notLoanRules.find(r=>r.value==='88').custom,10);assert.equal(result.root.notLoanRules.find(r=>r.value==='6').action,'ask');assert.deepEqual(result.writes,[]);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Circulation refresh: copy feedback is a bottom-right toast with exact copied value and no inline badge',async()=>{
  const value='<b>Carte 123</b>';
  const p=await fixture('/cgi-bin/koha/members/moremember.pl','<span id="copysource">&lt;b&gt;Carte 123&lt;/b&gt;</span>',{'copy-actions':{enabled:true,rules:[{id:'test',label:'Carte',selector:'#copysource',pagePath:'/cgi-bin/koha/members/moremember.pl',feedbackDurationMs:5000}],tableRules:[]}},true);
  await p.evaluate(()=>{Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.__copied=value}},configurable:true})});await load(p,'006-copy-patron-identifiers.js');
  await p.locator('.pmk-copy-action').first().click();await p.waitForSelector('.pmk-copy-toast');
  assert.equal(await p.evaluate(()=>__copied),value);assert.match(await p.locator('.pmk-copy-toast').textContent(),/<b>Carte 123<\/b>/);
  assert.equal(await p.locator('.pmk-copy-toast b').count(),0);assert.equal(await p.locator('.pmk-copy-toast').evaluate(n=>n.parentNode===document.body),true);
  const position=await p.locator('.pmk-copy-toast').evaluate(n=>({position:getComputedStyle(n).position,bottom:getComputedStyle(n).bottom,right:getComputedStyle(n).right}));assert.equal(position.position,'fixed');assert.equal(position.bottom,'16px');assert.equal(position.right,'16px');assert.equal(await p.locator('#copysource .pmk-copy-feedback').count(),0);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Circulation refresh: history indicators adapt page, table and headings without native IDs',async()=>{
  const config={pages:[{id:'members.readingrec',path:'/cgi-bin/koha/members/custom-history.pl',tableSelector:'#history',columnSelectors:{checkout:'.loan',due:'.due',returned:'.returned'}}]};
  const p=await fixture('/cgi-bin/koha/members/custom-history.pl','<table id="history"><thead><tr><th class="loan">A</th><th class="due">B</th><th class="returned">C</th></tr></thead><tbody><tr><td data-order="2026-01-01">01/01/2026</td><td data-order="2026-01-20">20/01/2026</td><td data-order="2026-01-15">15/01/2026</td></tr></tbody></table>',{'history-row-highlights':config},true);await load(p,'007-highlight-readingrec.js');
  await p.waitForSelector('.pmk-history-indicator');assert.match(await p.locator('#history').textContent(),/Durée du prêt/);
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('history-row-highlights');c.enabled=false;await PMKConfig.saveConfig('history-row-highlights',c)});assert.equal(await p.locator('.pmk-history-indicator').count(),0);assert.equal(await p.locator('#history tbody td').count(),3);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Circulation refresh: attendance shared engine preserves old documents, metadata, timestamps and notes',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','<span class="logged-in-branch-name">CENTRE</span>',{'attendance-mediabus-mini':{autoOpen:false,step:2,adultsLabel:'Visiteurs',kidsLabel:'Groupes',custom:{keep:1}}},true);await load(p,'139-attendance-mediabus.js');await p.evaluate(()=>PMKAttendance.ready);
  const result=await p.evaluate(async()=>{
    const documents={historic:{adults:3,kids:1,adultTimestamps:['a','b','c'],kidTimestamps:['d'],noteAdults:'Note',extra:'kept'}};const writes=[];
    const deps={db:{},doc:(db,collection,id)=>({collection,id}),serverTimestamp:()=>123,runTransaction:async(db,fn)=>fn({get:async ref=>({exists:()=>!!documents[ref.id],data:()=>documents[ref.id]}),set:(ref,data,options)=>{writes.push({ref,data,options});documents[ref.id]=Object.assign({},documents[ref.id],data)}})};
    await PMKAttendance.mutate(deps,{type:'adults',delta:1,locationId:'L1',date:'2026-10-17',existingId:'historic',userId:'u'});
    await PMKAttendance.mutate(deps,{type:'kids',delta:-1,locationId:'L1',date:'2026-10-17',existingId:'historic',notes:{adults:'',kids:'Nouvelle'}});
    await PMKAttendance.mutate(deps,{type:'adults',delta:1,locationId:'L2',date:'2026-10-17'});
    const cfg=await PMKConfig.getConfig('attendance-mediabus-mini');cfg.branchNames='ANNEXE';await PMKConfig.saveConfig('attendance-mediabus-mini',cfg);
    let blocked=false;try{await PMKAttendance.mutate(deps,{type:'adults',delta:1,locationId:'L1',date:'2026-10-17',existingId:'historic'})}catch(_){blocked=true}
    return {documents,writes,blocked,cfg:PMKAttendance.getConfig(),alias:PMKAttendance===PMKAttendanceMediabus};
  });
  assert.equal(result.documents.historic.adults,5);assert.equal(result.documents.historic.kids,0);assert.equal(result.documents.historic.extra,'kept');assert.equal(result.documents.historic.noteAdults,'');assert.equal(result.documents.historic.noteKids,'Nouvelle');assert.equal(result.documents.historic.adultTimestamps.length,5);assert.equal(result.documents.historic.kidTimestamps.length,0);assert.equal(result.documents['L2__2026-10-17'].adults,2);assert.equal(result.writes.length,3);assert(result.writes.every(w=>w.options.merge&&w.ref.collection==='counts'));assert.equal(result.blocked,true);assert.equal(result.alias,true);assert.equal(result.cfg.custom.keep,1);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });

 await check('Circulation integration: page and floating counter share configuration, backend and increments',async()=>{
  const cfg={autoOpen:false,step:2,defaultLocationId:'L1',adultsLabel:'Visiteurs',kidsLabel:'Groupes',countsCollection:'custom-counts',locationsCollection:'custom-locations'};
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=attendance-counter','<div id="counter-page"></div>',{'attendance-mediabus-mini':cfg},true);
  await p.evaluate(()=>{
    window.__attendanceApps=[];window.__countWrites=[];window.__countDocs={};
    window.__locations={L1:{name:'Bibliothèque centrale',defaultWeeks:8}};
    window.__firebaseDoc=(path,id)=>({path,id});
    window.__firebaseSnapshot=ref=>({id:ref.id,exists:()=>!!__countDocs[ref.id],data:()=>__countDocs[ref.id]});
    window.__firebaseGetDocs=async ref=>{
      const records=ref.path==='custom-locations'?__locations:__countDocs;
      const docs=Object.entries(records).filter(([id,data])=>(ref.filters||[]).every(f=>f.op==='=='?data[f.name]===f.value:f.op==='>='?data[f.name]>=f.value:f.op==='<='?data[f.name]<=f.value:true)).map(([id,data])=>({id,data:()=>data}));
      return {docs,empty:docs.length===0,size:docs.length,forEach:fn=>docs.forEach(fn)};
    };
    window.__firebaseTransaction=async(db,fn)=>fn({get:async ref=>__firebaseSnapshot(ref),set:(ref,data,options)=>{__countDocs[ref.id]={...__countDocs[ref.id],...data};__countWrites.push({ref,data,options})}});
    window.PMKPages={register:d=>{window.__attendancePage=d}};
  });
  const modules={
   'firebase-app.js':`export const getApps=()=>window.__attendanceApps;export const initializeApp=(cfg,name)=>{const app={cfg,name};window.__attendanceApps.push(app);return app};`,
   'firebase-auth.js':`export const getAuth=()=>({});export const signInAnonymously=async()=>({user:{uid:'fixture',isAnonymous:true}});export const onAuthStateChanged=(auth,fn)=>{queueMicrotask(()=>fn({uid:'fixture',isAnonymous:true}));return ()=>{}};export const signOut=async()=>{};`,
   'firebase-firestore.js':`export const getFirestore=()=>({});export const collection=(db,path)=>({path});export const doc=(db,path,id)=>window.__firebaseDoc(path,id);export const getDocs=ref=>window.__firebaseGetDocs(ref);export const getDoc=async ref=>window.__firebaseSnapshot(ref);export const query=(ref,...filters)=>({...ref,filters});export const where=(name,op,value)=>({name,op,value});export const orderBy=()=>({});export const serverTimestamp=()=>0;export const runTransaction=(db,fn)=>window.__firebaseTransaction(db,fn);export const addDoc=async()=>{};export const deleteDoc=async()=>{};export const updateDoc=async()=>{};`
  };
  await p.addScriptTag({content:'(function(){'+modules['firebase-firestore.js'].replaceAll('export const ','const ')+"window.PMKNativeData={collection,doc,getDocs,getDoc,query,where,orderBy,serverTimestamp,runTransaction,addDoc,deleteDoc,updateDoc,createDatabase:(namespace)=>({namespace}),getSession:async()=>({uid:'fixture',userid:'fixture',isAdmin:true})};})();"});
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages/138-page-attendance-counter.js'});
  await p.evaluate(async()=>{
    await __attendancePage.mount(document.querySelector('#counter-page'),{mountLegacyHtml:async(container,source)=>{
      const template=document.createElement('template');template.innerHTML=source;const scripts=[...template.content.querySelectorAll('script')];scripts.forEach(script=>script.remove());container.append(template.content);
      for(const old of scripts)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.type='module';script.textContent=old.textContent+'\nwindow.dispatchEvent(new Event("pmk-fixture-module-ready"));';const timer=setTimeout(()=>reject(new Error('Module fixture load timeout')),10000);window.addEventListener('pmk-fixture-module-ready',()=>{clearTimeout(timer);resolve()},{once:true});script.onerror=()=>reject(new Error('Module fixture failed'));document.head.append(script)});
    }});
  });
  await p.waitForFunction(()=>document.querySelector('#freq-selectLocation')?.value==='L1');
  await p.locator('#freq-incAdults').click();await p.waitForFunction(()=>document.querySelector('#freq-countAdults').textContent==='2');
  await p.evaluate(()=>PMKAttendance.open());
  await p.waitForFunction(()=>document.querySelector('#freq-selectLocationMini')?.value==='L1'&&document.querySelector('#freq-countAdultsMini')?.textContent==='2');
  await p.locator('#freq-incAdultsMini').click();await p.waitForFunction(()=>document.querySelector('#freq-countAdultsMini').textContent==='4');
  await p.locator('#freq-incKids').click();await p.waitForFunction(()=>document.querySelector('#freq-countKids').textContent==='2');
  await p.locator('#freq-noteAdults').fill('Note conservée');await p.locator('#freq-noteAdults').dispatchEvent('change');
  await p.waitForFunction(()=>Object.values(__countDocs)[0]?.noteAdults==='Note conservée');
  await p.locator('#freq-noteAdults').fill('');await p.locator('#freq-noteAdults').dispatchEvent('change');await p.waitForFunction(()=>Object.values(__countDocs)[0]?.noteAdults==='');
  await p.evaluate(async()=>{const cfg=PMKAttendance.getConfig();const current=Object.keys(__countDocs)[0];await PMKAttendance.mutate({db:{},doc:(db,path,id)=>({path,id}),runTransaction:__firebaseTransaction,serverTimestamp:()=>0,configuration:cfg},{type:'correction',locationId:'L1',date:document.querySelector('#freq-inputDate').value,existingId:current,reason:'Correction de recette contrôlée',additions:{adults:1,kids:2,timestamp:'2026-10-17T09:00:00Z'}})});
  const result=await p.evaluate(()=>({apps:__attendanceApps.map(a=>a.name),docs:__countDocs,writes:__countWrites,definitions:[...__defs.keys()].filter(id=>id.includes('attendance')),labels:document.querySelector('#counter-page').textContent,mini:document.querySelector('#freqAppMini').textContent}));
  assert.equal(result.apps.length,0);assert.deepEqual(result.definitions,['attendance-mediabus-mini']);assert.equal(result.writes.length,6);assert(result.writes.every(w=>w.ref.path==='custom-counts'));const data=Object.values(result.docs)[0];assert.equal(data.adults,5);assert.equal(data.kids,4);assert.equal(data.adultTimestamps.length,5);assert.equal(data.noteAdults,'');assert.equal(data.adultTimestamps.at(-1),'2026-10-17T09:00:00Z');assert.match(result.labels,/Visiteurs/);assert.match(result.mini,/Groupes/);assert(!result.mini.includes('Médiabus'));
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Circulation integration: selected submit button blocks only repeated reservation submissions',async()=>{
  const p=await fixture('/cgi-bin/koha/reserve/request.pl','<form id="target"><button class="custom-submit">Réserver</button></form><form id="other"><button>Autre</button></form>',{'hold-submit-guard':{buttonSelector:'.custom-submit'}},true);await load(p,'125-double_clic_resrvation.js');
  await p.waitForFunction(()=>__defs.has('hold-submit-guard'));
  const result=await p.evaluate(()=>{const submit=id=>{const event=new Event('submit',{bubbles:true,cancelable:true});document.querySelector(id).dispatchEvent(event);return event.defaultPrevented};return {first:submit('#target'),second:submit('#target'),other:submit('#other'),disabled:document.querySelector('.custom-submit').disabled}});
  assert.deepEqual(result,{first:false,second:true,other:false,disabled:true});assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Circulation integration: lost-item control respects native availability and verifies automatic updates',async()=>{
  for(const nativeAvailable of [true,false]){
   const p=await fixture('/cgi-bin/koha/circ/returns.pl','<main><div class="static_checkin_messages"><div class="alert"><span class="native-found">Found</span><input name="barcode" value="CB1"><a href="/cgi-bin/koha/catalogue/detail.pl?biblionumber=10">CB1: Titre</a></div></div></main>',{'lost-found-checkin-status':{targets:{eventSelector:'.native-found'},notLoanRules:[{value:'5',enabled:true,action:'available'}]}},true);
   let status=nativeAvailable?0:5;const requests=[];
   await p.route('**/api/v1/**',route=>{const request=route.request();requests.push({url:request.url(),method:request.method()});if(request.method()==='PUT'){status=0;return route.fulfill({contentType:'application/json',body:'{}'})}const body=request.url().includes('authorised_value')?[{value:'5',description:'Écarté'}]:request.url().includes('/items?')?[{item_id:1,biblio_id:10,external_id:'CB1'}]:{item_id:1,biblio_id:10,external_id:'CB1',not_for_loan_status:status};return route.fulfill({contentType:'application/json',body:JSON.stringify(body)})});
   await load(p,'051-alert-doc-retour-perdu.js');
   if(nativeAvailable){await p.waitForFunction(()=>document.querySelector('.native-found'));await p.waitForTimeout(300);assert.equal(requests.filter(r=>r.method==='PUT').length,0);assert.equal(await p.locator('[data-pmk051-card]').count(),0)}
   else {await p.waitForFunction(()=>document.querySelector('[data-pmk051-card]')?.textContent.includes('circulation'));await p.waitForTimeout(300);assert.equal(requests.filter(r=>r.method==='PUT').length,1);assert(requests.filter(r=>r.url.endsWith('/api/v1/items/1')).length>=3)}
   assert(!p.errors.length,p.errors.join('\n'));await p.close();
  }
 });

 await check('Request audit: removed activation panels and page counters, one retained master switch',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{},true);
  for(const file of ['011-moredetail-layout.js','033-mod-table-exemplaires.js','065-gen-callnum-links.js','068-blinking-barcode.js','129-mise-en-forme-exemplaire.js'])await load(p,file);
  for(const id of ['detail-bibliographic-groups','moredetail-layout','holdings-table-presentation','callnumber-progressive-search','barcode-highlights','search-results-master','relative-dates','lost-found-checkin-status']){
   await p.evaluate(id=>PMKConfig.openAdmin(id),id);
   assert.equal(await p.locator('.pmk-config-main .pmk-activation-card').count(),0,id);
   assert.equal(await p.locator('.pmk-config-main .pmk-summary-pill').count(),0,id);
   assert.equal(await p.getByRole('switch',{name:'Activer ou désactiver ce module',exact:true}).count(),1,id);
  }
  assert.deepEqual(await p.evaluate(()=>__writes),[]);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Request audit: visual history picker selects headers from nested labels and cells',async()=>{
  const p=await fixture('/cgi-bin/koha/members/readingrec.pl','<table id="reading"><thead><tr><th data-colname="loan"><span id="heading-text">Prêt</span></th><th>Échéance</th></tr></thead><tbody><tr><td><a id="loan-cell">Date</a></td><td></td></tr></tbody></table>',{},true);await load(p,'007-highlight-readingrec.js');
  await p.evaluate(async()=>{
   const walk=fields=>fields.flatMap(f=>[f,...(f.fields?walk(f.fields):[])]);
   const field=walk(__defs.get('history-row-highlights').schema).find(f=>f.key==='pages.0.columnSelectors.checkout');
   const cfg=await PMKConfig.getConfig('history-row-highlights');
   window.__historyPickField=field;window.__historyDraft=cfg;
   window.__chosen=null;field.pick({rootObject:cfg,fieldPath:['pages',0,'columnSelectors','checkout']}).then(result=>window.__chosen=result);
  });
  await p.waitForSelector('#pmk-common-element-picker-banner');await p.locator('#heading-text').click();await p.waitForFunction(()=>__chosen);
  assert.equal(await p.evaluate(()=>document.querySelector(__chosen.selector)?.tagName),'TH');
  await p.evaluate(()=>{window.__chosen=null;__historyPickField.pick({rootObject:__historyDraft,fieldPath:['pages',0,'columnSelectors','checkout']}).then(result=>window.__chosen=result)});
  await p.waitForSelector('#pmk-common-element-picker-banner');await p.locator('#loan-cell').click();await p.waitForFunction(()=>__chosen);
  assert.equal(await p.evaluate(()=>document.querySelector(__chosen.selector)?.dataset.colname),'loan');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Request audit: cross-page picker resumes from the core and preserves the unsaved draft',async()=>{
  const p=await fixture('/cgi-bin/koha/catalogue/detail.pl','<p id="new-source">Sujet</p>');
  await p.evaluate(()=>{
    delete window.PMKConfig;
    sessionStorage.setItem('pmk-common-element-picker-v1',JSON.stringify({moduleId:'bibliographic-markers',targetUrl:location.pathname,fieldPath:['sourceSelector'],draft:{enabled:false,pagePath:location.pathname,sourceSelector:'#old',destinationSelector:'#new-source',rules:[],custom:{mustSurvive:42}},persistAfterPick:false,startedAt:Date.now()}));
  });
  const source=fs.readFileSync(root+'000-pmk-config-firestore.js','utf8');await p.addScriptTag({content:source});
  await p.waitForSelector('#pmk-common-element-picker-banner');await p.locator('#new-source').click();
  await p.waitForSelector('#pmk-config-overlay.pmk-open');await p.waitForFunction(()=>document.querySelector('.pmk-config-main')?.textContent.includes('#new-source') || [...document.querySelectorAll('.pmk-config-main input')].some(input=>input.value==='#new-source'));
  assert.deepEqual(await p.evaluate(()=>__writes),[]);
  await p.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();await p.waitForFunction(()=>__writes.some(w=>w.id==='bibliographic-markers'));
  const saved=await p.evaluate(()=>__configs['bibliographic-markers']);assert.equal(saved.sourceSelector,'#new-source');assert.equal(saved.custom.mustSurvive,42);assert.equal(saved.enabled,false);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Request audit: guard picker selects the actual submit button when its icon is clicked',async()=>{
  const p=await fixture('/cgi-bin/koha/reserve/request.pl','<form><button class="reserve-confirm"><i id="reserve-icon">+</i> Réserver</button></form>',{},true);await load(p,'125-double_clic_resrvation.js');
  await p.evaluate(async()=>{const walk=fields=>fields.flatMap(f=>[f,...(f.fields?walk(f.fields):[])]);const field=walk(__defs.get('hold-submit-guard').schema).find(f=>f.key==='buttonSelector');window.__chosen=null;field.pick({rootObject:await PMKConfig.getConfig('hold-submit-guard'),fieldPath:['buttonSelector']}).then(result=>window.__chosen=result)});
  await p.waitForSelector('#pmk-common-element-picker-banner');await p.locator('#reserve-icon').click();await p.waitForFunction(()=>__chosen);
  assert.equal(await p.evaluate(()=>document.querySelector(__chosen.selector)?.tagName),'BUTTON');assert.deepEqual(await p.evaluate(()=>__writes),[]);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Request audit: movements uses its configured report ID, supports zero and updates live',async()=>{
  const p=await fixture('/cgi-bin/koha/catalogue/detail.pl?biblionumber=10','',{'document-movements':{reportId:8123,custom:{keep:9}}},true);const ids=[];await p.route('**/cgi-bin/koha/svc/report?**',route=>{ids.push(new URL(route.request().url()).searchParams.get('id'));return route.fulfill({contentType:'application/json',body:'[]'})});await p.addScriptTag({content:fs.readFileSync(root+'130-mouvements-documents.js','utf8').replace('async function loadTransfers(biblioId) {','window.__auditLoadTransfers=loadTransfers;\nasync function loadTransfers(biblioId) {')});await load(p,'008-issuehistory-timeline.js');await p.evaluate(()=>PMK130ConfigReady);
  assert.equal(await p.evaluate(()=>PMK130GetReportId()),8123);await p.evaluate(()=>__auditLoadTransfers(10));assert.deepEqual(ids,['8123']);
  const result=await p.evaluate(async()=>{
   const walk=fields=>fields.flatMap(f=>[f,...(f.fields?walk(f.fields):[])]);
   const rootObject=await PMKConfig.getConfig('loan-history-timeline');
   const field=walk(__defs.get('loan-history-timeline').schema).find(f=>f.id==='reuse-movements-report');
   const result=await field.action({rootObject,language:'fr'});return {rootObject,result,writes:__writes};
  });
  assert.equal(result.rootObject.transferReportId,8123);assert.equal(result.result.changed,true);assert.deepEqual(result.writes,[]);
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('document-movements');c.reportId=0;await PMKConfig.saveConfig('document-movements',c)});assert.equal(await p.evaluate(()=>PMK130GetReportId()),0);await p.evaluate(()=>__auditLoadTransfers(10));assert.deepEqual(ids,['8123']);
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('document-movements');c.reportId=9012;await PMKConfig.saveConfig('document-movements',c)});assert.equal(await p.evaluate(()=>PMK130GetReportId()),9012);await p.evaluate(()=>__auditLoadTransfers(10));assert.deepEqual(ids,['8123','9012']);assert.equal(await p.evaluate(()=>__configs['document-movements'].custom.keep),9);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Request audit: renewal reasons keep a meaningful name after clearing the editable label',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{},true);await load(p,'114-renew-modif.js');await p.evaluate(()=>PMKConfig.openAdmin('renewal-enhancements'));
  await p.locator('.pmk-advanced-toggle').click();
  const input=p.locator('[data-pmk-field-path="reasonLabels.0.fr"]');assert.equal(await input.count(),1);
  await input.evaluate(node=>{node.value='';node.dispatchEvent(new Event('input',{bubbles:true}))});
  const title=await input.evaluate(node=>node.closest('.pmk-repeater-item').querySelector('.pmk-repeater-item-title').textContent);assert(title);assert(!/Élément\s+\d+/.test(title));
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });

 await check('Request audit: Z3950 has one activation source and keeps the old disabled state',async()=>{
  const old={enabled:true,pages:[{id:'cataloguing.z3950-search',path:'/cgi-bin/koha/cataloguing/z3950_search.pl',enabled:false,custom:'original'}],layout:{heightRatio:0.7},custom:{mine:8}};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{'z3950-workspace':old},true);await load(p,'035-resize-z3950.js');
  const cfg=await p.evaluate(()=>PMKConfig.getConfig('z3950-workspace'));assert.equal(cfg.enabled,false);assert.equal(cfg.pages[0].enabled,true);assert.equal(cfg.pages[0].custom,'original');assert.equal(cfg.custom.mine,8);
  const fields=await p.evaluate(()=>{const walk=fields=>fields.flatMap(f=>[f,...(f.fields?walk(f.fields):[])]);return walk(__defs.get('z3950-workspace').schema).map(f=>({key:f.key,id:f.id}))});assert(!fields.some(f=>f.key==='pages'||f.id==='activation'));
  await p.evaluate(async()=>{const cfg=await PMKConfig.getConfig('z3950-workspace');cfg.enabled=true;await PMKConfig.saveConfig('z3950-workspace',cfg)});assert.equal(await p.evaluate(async()=>(await PMKConfig.getConfig('z3950-workspace')).enabled),true);
  assert.equal(await p.evaluate(()=>__configs['z3950-workspace'].pages[0].custom),'original');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Request audit: every requested form is available without removed boilerplate',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','',{'attendance-mediabus-mini':{autoOpen:false}},true);
  await p.addScriptTag({path:process.env.PMK_JQUERY_PATH||'/usr/share/javascript/jquery/jquery.min.js'});
  for(const file of ['006-copy-patron-identifiers.js','007-highlight-readingrec.js','008-issuehistory-timeline.js','009-4eme-de-couv.js','010-boutons-recherche-externe.js','011-moredetail-layout.js','017-gestion-litiges-select.js','027-genre-icons-detail.js','028-transfer-buttons-holdings.js','031-alert-vide-champ-modif-lot.js','033-mod-table-exemplaires.js','035-resize-z3950.js','049-astrological-sign.js','055-facets-drawer.js','057-member-pages-utils.js','063-mis-en-page-catalogue.js','065-gen-callnum-links.js','068-blinking-barcode.js','070-address-autocomplete-memberentry.js','070-date-utils.js','079-new-release-logos.js','081-084-6xx-suggestions.js','088-musicbrainz-coverart.js','099-efficiency-indicators.js','102-batchmod-mediabus-buttons.js','109-helper-domaine.js','110-exemplaire-helper.js','113-autocomplete-elestic.js','114-renew-modif.js','120-date-retrait-reservations.js','125-double_clic_resrvation.js','129-mise-en-forme-exemplaire.js','130-mouvements-documents.js','134-intranetnav-menu.js','135-guides-training-pmk-loader.js','136-xslt-assistant.js','137-home-widgets.js','137-widgets/137-widget-liens-utiles.js','139-attendance-mediabus.js','144-controle-doublons-adherents.js','146-checkout-status-correction-pmk.js','147-accueil-sous-menus-pmk.js'])await load(p,file);
  const ids=['home-widgets','relative-dates','070','patron-page-utils','144','patron-astrological-sign','guides-training','cataloging-6xx-suggestions','z3950-workspace','batchmod-empty-field-warning','item-entry-assistant','cataloguing-tree-assistant','xslt-assistant','search-autocomplete-performance','catalogue-search-behavior','item-template-buttons','search-facets','bibliographic-markers','new-release-indicators','musicbrainz-coverart','external-links','document-movements','detail-bibliographic-groups','moredetail-layout','holdings-table-presentation','callnumber-progressive-search','barcode-highlights','search-results-master','detail-fourth-cover','transfer-button-holdings','checkout-status-correction','lost-found-checkin-status','hold-pickup-expiration','history-row-highlights','loan-history-timeline','hold-submit-guard','renewal-enhancements','attendance-mediabus-mini','efficiency-indicators','copy-actions','patron-message-templates','intranet-nav-menu','147-home-submenus'];
  const available=await p.evaluate(()=>[...__defs.keys()]);
  const report=[];
  for(const id of ids){
   assert(available.includes(id),'Missing requested form: '+id);
   await p.evaluate(id=>PMKConfig.openAdmin(id),id);const text=await p.locator('.pmk-config-main').textContent();
   assert(!text.includes('Réglages du module'),id);assert(!text.includes('Modifie seulement les options utiles'),id);
   if(id==='new-release-indicators')assert(!text.includes('Fonctionnement')&&!text.includes('Compatibilité / réglages avancés'));
   if(id==='intranet-nav-menu'||id==='attendance-mediabus-mini')assert(!/Médiabus|Mediabus/.test(text),id);
   report.push({module:id,formOpened:true,removedBoilerplateAbsent:true});
  }
  assert.deepEqual(await p.evaluate(()=>__writes),[]);assert(!p.errors.length,p.errors.join('\n'));
  fs.writeFileSync(root+'tests/validation/request-forms.json',JSON.stringify(report,null,2)+'\n');console.log('  Requested forms audited: '+report.length);await p.close();
 });
 await check('Navigation refresh: meaningful history names, useful descriptions and lossless journal activation',async()=>{
  const original={enabled:true,pages:{viewlog:{enabled:false,custom:'page'}},custom:{mine:42}};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','<main><h1>Accueil</h1></main>',{'log-viewer':original},true);
  for(const f of ['071-history-system-pmk-loader.js','101-koha-log.js','025-deplacer-grille-technique.js','048-forbid-accents-batchmod.js','124-csp-enfant.js','002-verification-coordonnees.js','117-icons-menus.js','page-qr-code.js'])await load(p,f);
  await p.evaluate(()=>PMKConfig.openAdmin('recent-history'));
  let text=await p.locator('.pmk-config-main').textContent();assert(text.includes('Historique récent'));assert(!text.includes('par défaut récent'));assert(text.includes('50 visites'));
  await p.evaluate(()=>PMKConfig.openAdmin('147-home-submenus'));assert((await p.locator('.pmk-config-main').textContent()).includes('Menus de l’accueil'));
  const result=await p.evaluate(async()=>{const cfg=await PMKConfig.getConfig('log-viewer');const fields=[];const walk=fs=>(fs||[]).forEach(f=>{if(f.key)fields.push(f.key);walk(f.fields)});walk(__defs.get('log-viewer').schema);return{cfg,fields,writes:__writes}});
  assert.equal(result.cfg.enabled,false);assert.equal(result.cfg.pages.viewlog.enabled,true);assert.equal(result.cfg.pages.viewlog.custom,'page');assert.deepEqual(result.cfg.custom,{mine:42});assert(!result.fields.includes('pages.viewlog.enabled'));assert(result.fields.includes('enabled'));assert.deepEqual(result.writes,[]);
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('log-viewer');c.enabled=true;await PMKConfig.saveConfig('log-viewer',c);PMKConfig.clearCache()});
  assert.equal(await p.evaluate(async()=>(await PMKConfig.getConfig('log-viewer')).enabled),true);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Navigation refresh: QR visual selection changes its real location only after saving',async()=>{
  const p=await fixture('/cgi-bin/koha/catalogue/detail.pl','<main><h1 id="heading">Titre</h1><div class="technique">Informations</div><div id="chosen-location">Zone voulue</div></main>',{},true);
  await load(p,'page-qr-code.js');await p.waitForSelector('[data-pmk086-host]');
  await p.evaluate(()=>PMKConfig.openAdmin('page-qr-code'));
  const choose=p.getByRole('button',{name:'Choisir sur la page',exact:true,includeHidden:true});assert.equal(await choose.count(),4);await p.locator('[data-pmk-section-id="pages"] .pmk-repeater-toggle').first().click();
  await choose.first().click();await p.waitForSelector('#pmk-common-element-picker-banner');await p.locator('#chosen-location').click();
  await p.waitForFunction(()=>document.querySelector('.pmk-element-picker-input')?.value==='#chosen-location');
  assert.deepEqual(await p.evaluate(()=>__writes),[]);
  await p.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();await p.waitForFunction(()=>__writes.length===1);
  await p.evaluate(()=>PMKConfig.closeAdmin());
  assert.equal(await p.locator('#chosen-location > [data-pmk086-host]').count(),1);
  const saved=await p.evaluate(async()=>{const c=await PMKConfig.getConfig('page-qr-code');c.pages[0].target.selector='#missing';await PMKConfig.saveConfig('page-qr-code',c);return c});
  await p.waitForFunction(()=>!document.querySelector('[data-pmk086-host]'));
  assert.equal(saved.pages[0].target.selector,'#missing');assert.equal(saved.pages.length,4);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Navigation refresh: QR cross-page picker keeps its complete unsaved draft and unrelated targets',async()=>{
  const draft={enabled:true,custom:{mine:42},button:{showText:true,labelFr:'Mon QR'},pages:[{id:'custom',enabled:true,path:'/cgi-bin/koha/tools/custom.pl',placement:'before',target:{id:'old',selector:'#old',custom:'target'}}]};
  const p=await fixture('/cgi-bin/koha/tools/custom.pl','<main><h1 id="destination">Emplacement</h1></main>',{},true);
  await p.evaluate(d=>sessionStorage.setItem('pmk-common-element-picker-v1',JSON.stringify({moduleId:'page-qr-code',targetUrl:location.pathname,fieldPath:['pages',0,'target','selector'],draft:d,persistAfterPick:false,startedAt:Date.now()})),draft);
  await load(p,'page-qr-code.js');await p.waitForSelector('#pmk-common-element-picker-banner');await p.locator('#destination').click();
  await p.waitForFunction(()=>document.querySelector('.pmk-element-picker-input')?.value==='#destination');
  assert.deepEqual(await p.evaluate(()=>__writes),[]);
  await p.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();await p.waitForFunction(()=>__writes.length===1);
  const saved=await p.evaluate(async()=>PMKConfig.getConfig('page-qr-code'));assert.deepEqual(saved.custom,{mine:42});assert.equal(saved.button.labelFr,'Mon QR');assert.equal(saved.pages[0].target.custom,'target');assert.equal(saved.pages[0].placement,'before');assert.equal(saved.pages[0].target.selector,'#destination');
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Navigation refresh: list counters support arbitrary pages, source picking, separate placement and native content',async()=>{
  const original={enabled:true,custom:{mine:42},pages:[{id:'custom-list',enabled:true,path:'/cgi-bin/koha/tools/custom.pl',labelFr:'Ma liste',query:'',fields:[{id:'custom-field',enabled:true,labelFr:'Mes valeurs',selector:'#list',displaySelector:'#counter-location',displayPosition:'append',multiple:false,metadata:'keep'}]}]};
  const p=await fixture('/cgi-bin/koha/tools/custom.pl','<main><textarea id="list">A\n A \nB\n\n</textarea><div id="counter-location"></div><div id="unrelated">Sans compteur</div><textarea id="second">X</textarea></main>',{'multiline-list-counter':original},true);
  await load(p,'050-line-counter.js');await p.waitForSelector('#counter-location .pmk050-counter');
  assert.match(await p.locator('#counter-location').textContent(),/3/);assert.match(await p.locator('#counter-location').textContent(),/1/);assert.equal(await p.locator('#list').inputValue(),'A\n A \nB\n\n');
  await p.locator('#list').fill('C\nD');assert.match(await p.locator('#counter-location').textContent(),/2/);
  await p.evaluate(()=>PMKConfig.openAdmin('multiline-list-counter'));assert(!(await p.locator('.pmk-config-main').textContent()).includes('Comportement'));
  assert.equal(await p.getByRole('button',{name:'Ajouter une page',exact:true}).count(),1);
  await p.evaluate(async()=>{const d=__defs.get('multiline-list-counter');const c=await PMKConfig.getConfig(d.id);const f=d.schema.find(s=>s.id==='pages').fields[0].fields.find(f=>f.key==='fields').fields.find(f=>f.key==='selector');window.__picked=null;f.pick({rootObject:c,fieldPath:['pages',0,'fields',0,'selector']}).then(r=>__picked=r)});
  await p.waitForSelector('#pmk-common-element-picker-banner');await p.locator('#unrelated').click();assert.equal(await p.evaluate(()=>__picked),null);
  await p.locator('#second').click();await p.waitForFunction(()=>__picked);assert.equal(await p.evaluate(()=>__picked.selector),'#second');
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('multiline-list-counter');c.enabled=false;await PMKConfig.saveConfig('multiline-list-counter',c)});
  await p.waitForFunction(()=>!document.querySelector('.pmk050-counter'));assert.equal(await p.locator('#list').inputValue(),'C\nD');
  const saved=await p.evaluate(async()=>PMKConfig.getConfig('multiline-list-counter'));assert.equal(saved.pages.length,1);assert.equal(saved.pages[0].fields[0].metadata,'keep');assert.deepEqual(saved.custom,{mine:42});assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Navigation refresh: patron verification adapts native templates, extra fields, clicks and form submits',async()=>{
  const config={enabled:true,expired:true,expiringSoon:true,pages:[{id:'custom',path:'/cgi-bin/koha/members/custom.pl',enabled:true}],targets:{expired:'#expired',expiringSoon:'#soon',patronRoot:'#patron',renewAction:'#renew',destination:'#checks'},checks:[{id:'custom-field',enabled:true,labelFr:'Service',selector:'#service'}]};
  const p=await fixture('/cgi-bin/koha/members/custom.pl','<main><div id="patron"><span id="service">Lecture publique</span></div><div id="expired">Expiration</div><div id="checks"></div><form id="renew-form"><button id="renew" type="submit" tabindex="3" aria-disabled="false"><i id="renew-icon"></i> Renouveler</button></form></main>',{'patron-renewal-verification':config});
  await p.evaluate(()=>{window.__submits=0;document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();__submits++})});
  await load(p,'002-verification-coordonnees.js');await p.waitForSelector('.pmk-renewal-checkbox');
  assert.match(await p.locator('#checks').textContent(),/Lecture publique/);assert.equal(await p.locator('#renew').getAttribute('aria-disabled'),'true');
  await p.locator('#renew-icon').dispatchEvent('click');await p.evaluate(()=>document.querySelector('form').requestSubmit(document.querySelector('#renew')));assert.equal(await p.evaluate(()=>__submits),0);
  await p.locator('.pmk-renewal-checkbox').check();await p.locator('#renew').click();assert.equal(await p.evaluate(()=>__submits),1);assert.equal(await p.locator('#renew').getAttribute('tabindex'),'3');assert.equal(await p.locator('#renew').getAttribute('aria-disabled'),'false');
  await p.evaluate(()=>{const c=structuredClone(__configs['patron-renewal-verification']);c.enabled=false;__subscribers['patron-renewal-verification'][0](c)});
  assert.equal(await p.locator('.pmk-renewal-checkbox').count(),0);assert.equal(await p.locator('#renew').getAttribute('tabindex'),'3');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Navigation refresh: default patron verification uses Koha signals independently of translated warning text',async()=>{
  const p=await fixture('/cgi-bin/koha/members/moremember.pl','<div class="patroninfo"><ul><li class="patronaddress">12 rue Koha</li><li class="patronphone">0102030405</li><li><a href="mailto:a@example.org">a@example.org</a></li></ul></div><ul id="patron_messages"><li class="expired">Membership expired <a id="renew" href="/cgi-bin/koha/members/setstatus.pl?reregistration=y&borrowernumber=1">Renew</a></li></ul>');
  await load(p,'002-verification-coordonnees.js');await p.waitForSelector('.pmk-renewal-checkbox');assert.equal(await p.locator('.pmk-renewal-checkbox').count(),3);assert.equal(await p.locator('#renew').getAttribute('aria-disabled'),'true');
  for(const box of await p.locator('.pmk-renewal-checkbox').all())await box.check();assert.equal(await p.locator('#renew').getAttribute('aria-disabled'),null);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Navigation refresh: menu icon overrides keep one icon, use common picker and restore native rendering',async()=>{
  const original={enabled:true,custom:{mine:42},legacy:{enabled:true,custom:'base',rules:[{id:'base',enabled:true,text:'Détails',iconClass:'fas fa-book',metadata:'rule'}]},customRules:[{id:'custom',enabled:true,name:'Mon menu',pages:'*',targetMode:'selector',selector:'#menu',iconType:'fa',iconClass:'fas fa-star',replaceExisting:true,custom:'override'}]};
  const p=await fixture('/cgi-bin/koha/mainpage.pl','<main><nav class="sidebar_menu"><ul><li><a id="menu" href="#">Détails</a></li></ul></nav></main>',{'menu-icons':original},true);
  await load(p,'117-icons-menus.js');await p.waitForFunction(()=>!!document.querySelector('#menu i.fa-star'));assert.equal(await p.locator('#menu i').count(),1);
  await p.evaluate(()=>PMKConfig.openAdmin('menu-icons'));assert.equal(await p.locator('[data-pmk-section-id="historical"] .pmk-repeater-item').count(),0);assert.equal(await p.getByRole('button',{name:'Choisir sur la page',exact:true,includeHidden:true}).count(),1);await p.locator('[data-pmk-section-id="custom"] .pmk-repeater-toggle').first().click();
  await p.getByRole('button',{name:'Choisir sur la page',exact:true}).click();await p.waitForSelector('#pmk-common-element-picker-banner');await p.locator('#menu i').dispatchEvent('click');await p.waitForFunction(()=>document.querySelector('.pmk-element-picker-input')?.value==='#menu');
  assert.deepEqual(await p.evaluate(()=>__writes),[]);
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('menu-icons');c.enabled=false;await PMKConfig.saveConfig('menu-icons',c)});await p.waitForFunction(()=>!document.querySelector('#menu i'));
  const saved=await p.evaluate(async()=>PMKConfig.getConfig('menu-icons'));assert.deepEqual(saved.custom,{mine:42});assert.equal(saved.legacy.custom,'base');assert.equal(saved.legacy.rules[0].metadata,'rule');assert.equal(saved.customRules[0].custom,'override');assert.equal(await p.locator('#menu').textContent(),'Détails');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Navigation refresh: internal hub searches all tools and restores native content when disabled',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=hub','<main><div id="native" style="display:flex!important">Accueil</div><nav id="toplevelmenu">Navigation</nav></main>',{},true);
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages-manager.js'});await p.waitForSelector('.pmk138-card');assert.equal(await p.locator('.pmk138-card').count(),19);assert.equal(await p.locator('#native').evaluate(e=>getComputedStyle(e).display),'none');assert.notEqual(await p.locator('#toplevelmenu').evaluate(e=>getComputedStyle(e).display),'none');
  await p.getByRole('searchbox',{name:'Rechercher un outil'}).fill('frequentation');assert.equal(await p.locator('.pmk138-card:visible').count(),1);await p.getByRole('searchbox',{name:'Rechercher un outil'}).fill('aucun outil xyz');assert.equal(await p.locator('.pmk138-card:visible').count(),0);assert(await p.getByText('Aucun outil ne correspond à cette recherche.').isVisible());
  await p.evaluate(()=>PMKConfig.saveConfig('internal-pages-tools',{enabled:false,custom:'keep'}));await p.waitForFunction(()=>!document.querySelector('#pmk138-page-host'));assert.equal(await p.locator('#native').evaluate(e=>e.style.getPropertyValue('display')),'flex');assert.equal(await p.locator('#native').evaluate(e=>e.style.getPropertyPriority('display')),'important');
  await p.evaluate(()=>PMKConfig.saveConfig('internal-pages-tools',{enabled:true}));await p.waitForSelector('.pmk138-card');assert.equal(await p.locator('#pmk138-page-host').count(),1);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Navigation refresh: managed native page retries failed loads and shares routing with external tools',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=inventory','<main><div id="native">Accueil</div></main>');let attempts=0;
  await p.route('**/138-pages/138-page-inventory.js*',r=>{attempts++;if(attempts===1)return r.abort();return r.fulfill({contentType:'application/javascript',body:"PMKPages.register({id:'inventory',mount:container=>{container.textContent='Inventaire chargé';window.__mounts=(window.__mounts||0)+1;return()=>{window.__disposed=(window.__disposed||0)+1}}})"})});
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages-manager.js'});await p.waitForSelector('.alert-danger');await p.evaluate(()=>PMKPages.refresh());await p.waitForFunction(()=>document.querySelector('.pmk138-app-container')?.textContent==='Inventaire chargé');assert.equal(attempts,2);
  await p.evaluate(()=>{history.replaceState(null,'','?pmk_page=bulk-framework-change');return PMKPages.refresh()});await p.waitForSelector('#pmk-bfc-app');assert.equal(await p.locator('#pmk138-page-host #pmk-bfc-app').count(),1);assert.equal(await p.evaluate(()=>__disposed),1);assert.equal(await p.locator('#pmk138-page-host').count(),1);
  await p.evaluate(()=>{history.replaceState(null,'','?pmk_page=overdue-management');return PMKPages.refresh()});await p.waitForSelector('#pmk143');assert.equal(await p.locator('#pmk138-page-host #pmk143').count(),1);assert.equal(await p.locator('#pmk-bfc-app').count(),0);
  await p.evaluate(()=>{history.replaceState(null,'','?pmk_page=missing');return PMKPages.refresh()});assert.match(await p.locator('#pmk138-page-host').textContent(),/Page inconnue/);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Navigation refresh: internal tools preserve superlibrarian and existing staff access policies',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=inventory','<main>Accueil</main>');let children=0;
  await p.evaluate(()=>document.querySelector('.loggedinusername').remove());p.on('request',r=>{if(r.url().includes('/138-pages/'))children++});
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages-manager.js'});await p.waitForSelector('.pmk138-denied');assert.equal(children,0);
  await p.evaluate(()=>{history.replaceState(null,'','?pmk_page=bulk-framework-change');return PMKPages.refresh()});await p.waitForSelector('#pmk-bfc-app');assert.equal(await p.locator('.pmk138-denied').count(),0);
  await p.evaluate(()=>{history.replaceState(null,'','?pmk_page=xslt-assistant');return PMKPages.refresh()});assert.equal(await p.locator('.pmk138-denied').count(),1);assert.equal(await p.locator('script[src*="136-xslt-assistant"]').count(),0);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Navigation refresh: bibliography uses the common host and retains its publication draft across remounts',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=bibliography-builder','<main><div id="native">Accueil</div></main>');
  await p.evaluate(()=>{window.PMKPersonalLists={getLists:async()=>[],getStorageContext:async()=>null}});
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages-manager.js'});await p.waitForSelector('#pmk142-root');
  assert.equal(await p.locator('#pmk138-page-host #pmk142-root').count(),1);assert.equal(await p.locator('#pmk142-root').evaluate(el=>getComputedStyle(el).position),'relative');
  const original=await p.locator('#pmk142-root').textContent();assert(original.includes('Bibliographies & publications'));await p.locator('[data-control="doc-title"]').fill('Mon brouillon conservé');
  await p.evaluate(()=>PMKPages.refresh());await p.waitForSelector('#pmk142-root');assert.equal(await p.locator('[data-control="doc-title"]').inputValue(),'Mon brouillon conservé');assert.equal(await p.locator('#pmk142-root').count(),1);assert.equal(await p.locator('#pmk138-page-host').count(),1);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Page foundation: inline modules complete immediately and runtime failures can be retried',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=inventory','<main>Accueil</main>');
  const content='<div id="fixture-inline">Chargement</div><script type="module">await Promise.resolve();document.getElementById("fixture-inline").textContent="Module prêt";</script>';
  await p.route('**/138-pages/138-page-inventory.js*',r=>r.fulfill({contentType:'application/javascript',body:'PMKPages.register({id:"inventory",mount:(container,context)=>context.mountLegacyHtml(container,'+JSON.stringify(content)+')})'}));
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages-manager.js'});
  await p.waitForFunction(()=>PMKPages.getStatus('inventory').state==='mounted',null,{timeout:2000});assert.equal(await p.locator('#fixture-inline').textContent(),'Module prêt');
  await p.evaluate(()=>{window.__bad=true;PMKPages.register({id:'inventory',mount:(container,context)=>context.mountLegacyHtml(container,window.__bad?'<script>throw new Error("Fixture initialization failed");</script>':'<p id="retry-ok">Prêt après reprise</p>')});return PMKPages.refresh()});
  assert.equal(await p.evaluate(()=>PMKPages.getStatus('inventory').state),'error');assert.match(await p.locator('.alert-danger').textContent(),/Fixture initialization failed/);
  await p.evaluate(()=>window.__bad=false);await p.getByRole('button',{name:'Réessayer',exact:true}).click();await p.waitForSelector('#retry-ok');assert.equal(await p.evaluate(()=>PMKPages.getStatus('inventory').state),'mounted');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Page foundation: closing a pending page cancels its route and disposes late resources',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=inventory','<main><div id="native">Accueil</div></main>');
  await p.route('**/138-pages/138-page-inventory.js*',r=>r.fulfill({contentType:'application/javascript',body:'PMKPages.register({id:"inventory",mount:async(container,context)=>{window.__pendingSignal=context.signal;await new Promise(resolve=>window.__releaseMount=resolve);container.textContent="Ancien résultat";return()=>{window.__lateDisposed=(window.__lateDisposed||0)+1}}})'}));
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages-manager.js'});await p.waitForFunction(()=>!!window.__releaseMount);
  await p.evaluate(()=>{history.replaceState(null,'','?pmk_page=hub');return PMKPages.refresh()});assert.equal(await p.evaluate(()=>__pendingSignal.aborted),true);assert.equal(await p.evaluate(()=>PMKPages.getStatus('inventory').state),'closed');
  await p.evaluate(()=>__releaseMount());await p.waitForFunction(()=>__lateDisposed===1);assert.equal(await p.locator('.pmk138-card').count(),19);assert.equal(await p.locator('#pmk138-page-host').count(),1);assert.equal(await p.locator('#pmk138-page-host').getByText('Ancien résultat').count(),0);assert.equal(await p.title(),'Pages & outils internes — Koha');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Page foundation: optional dependency failures leave the interface usable',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=inventory','<main>Accueil</main>');
  const content='<script data-pmk-optional="true" src="https://fixture.invalid/export.js"></script><p id="usable">Interface utilisable</p><script>document.getElementById("usable").dataset.ready="1";</script>';
  await p.route('https://fixture.invalid/**',r=>r.abort());
  await p.route('**/138-pages/138-page-inventory.js*',r=>r.fulfill({contentType:'application/javascript',body:'PMKPages.register({id:"inventory",mount:(container,context)=>context.mountLegacyHtml(container,'+JSON.stringify(content)+')})'}));
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages-manager.js'});await p.waitForFunction(()=>PMKPages.getStatus('inventory').state==='mounted');await p.waitForFunction(()=>PMKPages.getStatus('inventory').optionalDependenciesUnavailable?.length===1);
  assert.equal(await p.locator('#usable').getAttribute('data-ready'),'1');assert.equal(await p.locator('.alert-danger').count(),0);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Page foundation: PMK exposes page settings and access policies without the removed laboratory',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl','<main>Accueil</main>',{'internal-pages-tools':{enabled:true,personal:{keep:'mine'}}},true);
  await p.addScriptTag({url:'http://pmk.test/public/koha-scripts/138-pages-manager.js'});await p.waitForFunction(()=>window.__defs.has('internal-pages-tools'));
  await p.evaluate(()=>PMKConfig.openAdmin('internal-pages-tools'));const section=p.locator('[data-pmk-section-id="pages"]');assert.equal(await section.locator('tbody tr').count(),19);assert.equal(await section.getByText('Personnel Koha',{exact:true}).count(),3);assert.equal(await section.locator('tbody').getByText('Superlibrarian Koha',{exact:true}).count(),16);
  assert.equal(await p.locator('[data-pmk-section-id="learning-status"]').count(),0);assert.equal(await p.locator('[data-pmk-section-id="page-settings"] select[aria-label="Page à configurer"] option').count(),19);assert.equal(await p.evaluate(()=>PMKPages.canOpen('rulelab')),false);
  assert.deepEqual(await p.evaluate(()=>__writes),[]);assert.deepEqual(await p.evaluate(async()=>(await PMKConfig.getConfig('internal-pages-tools')).personal),{keep:'mine'});assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Editor refresh: bibliography shows source immediately, metadata before covers, spinner and cached mode changes',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=bibliography-builder&source=session','<main>Koha</main>');
  await p.evaluate(()=>{sessionStorage.setItem('pmk142-session-source',JSON.stringify({kind:'koha-native',type:'notice',name:'Ma bibliographie',entries:[{biblionumber:'1',title:'Titre déjà disponible'}]}));window.__coverReady=new Promise(r=>window.__releaseCover=r);window.PMKCoverResolver={resolveCandidates:()=>__coverReady,clearCache:()=>{}};});
  let release;const gate=new Promise(r=>release=r);const requests=[];
  await p.route('**/api/v1/**',async route=>{const request=route.request();const url=new URL(request.url());requests.push(url.pathname+'|'+request.headers().accept);await gate;if(url.pathname.endsWith('/items'))return route.fulfill({json:[]});if(request.headers().accept==='application/marcxml+xml')return route.fulfill({contentType:'application/marcxml+xml',body:'<record xmlns="http://www.loc.gov/MARC21/slim"><datafield tag="330"><subfield code="a">Résumé chargé</subfield></datafield></record>'});return route.fulfill({json:{biblio_id:1,title:'Titre enrichi',author:'Auteur'}})});
  await load(p,'142-bibliography-builder.js');await p.waitForFunction(()=>document.querySelector('[data-zone=preview]')?.textContent.includes('Titre déjà disponible'),null,{timeout:1500});
  assert.equal(await p.locator('.pmk142-status.is-loading').count(),1);assert.equal(await p.locator('[data-zone=preview]').getAttribute('aria-busy'),'true');assert.equal(await p.locator('#pmk142-root').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(232, 239, 233)');
  release();await p.waitForFunction(()=>document.querySelector('[data-zone=preview]')?.textContent.includes('Titre enrichi'));assert.equal(await p.locator('.pmk142-status.is-loading').count(),1);
  await p.locator('[data-control=mode]').selectOption('notice');await p.locator('[data-control=mode]').selectOption('notice-items');
  await p.evaluate(()=>__releaseCover([]));await p.waitForFunction(()=>document.querySelector('[data-zone=preview]')?.getAttribute('aria-busy')==='false');
  assert.equal(requests.filter(r=>r==='/api/v1/biblios/1|application/json').length,1);assert.equal(requests.filter(r=>r==='/api/v1/biblios/1|application/marcxml+xml').length,1);assert.equal(requests.filter(r=>r.startsWith('/api/v1/biblios/1/items|')).length,1);assert(!requests.some(r=>r.includes('/public/')));
  assert.equal(await p.locator('[data-control=doc-title]').inputValue(),'Ma bibliographie');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Editor refresh: late bibliography source responses cannot replace the latest selected list',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=bibliography-builder','<main>Koha</main>');
  await p.evaluate(()=>{window.__firstEntries=new Promise(r=>window.__releaseFirst=r);window.PMKPersonalLists={getLists:async()=>[{id:'one',name:'Première',type:'notice'},{id:'two',name:'Deuxième',type:'notice'}],getList:async id=>({id,name:id,type:'notice'}),getEntries:async id=>id==='one'?__firstEntries:[{biblionumber:'2',title:'Deuxième titre'}],getStorageContext:async()=>null};window.PMKCoverResolver={resolveCandidates:async()=>[]};});
  await p.route('**/api/v1/**',r=>r.fulfill({status:403,body:'Droits insuffisants'}));
  await load(p,'142-bibliography-builder.js');await p.waitForSelector('[data-control=source-list] option[value=two]',{state:'attached'});await p.locator('[data-control=source-list]').selectOption('two');
  await p.waitForFunction(()=>document.querySelector('[data-zone=preview]')?.textContent.includes('Deuxième titre'));
  await p.evaluate(()=>__releaseFirst([{biblionumber:'1',title:'Ancien titre tardif'}]));await p.waitForTimeout(150);
  assert((await p.locator('[data-zone=preview]').textContent()).includes('Deuxième titre'));assert(!(await p.locator('[data-zone=preview]').textContent()).includes('Ancien titre tardif'));assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Editor refresh: XSLT import, clear steps, editing, undo and complete export retain advanced source',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=xslt-assistant','<main>Koha</main>');
  const xml='<?xml version="1.0"?><xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:marc="http://www.loc.gov/MARC21/slim"><!-- à conserver --><xsl:include href="Utils.xsl"/><xsl:param name="ma-variable" select="1"/><xsl:template match="/"><div id="root"><p id="greeting">Bonjour</p><xsl:if test="$ma-variable=1"><p id="kept">Bloc conditionnel</p></xsl:if></div></xsl:template></xsl:stylesheet>';
  await load(p,'136-xslt-assistant.js');await p.evaluate(()=>PMK136XsltAssistant.openOverlay());assert.equal(await p.locator('.pmk136-navigation button').count(),3);
  await p.getByRole('button',{name:'Choisir un fichier ou coller mon XSLT',exact:true}).click();await p.getByLabel('Ou coller mon XSLT',{exact:true}).fill(xml);await p.getByRole('button',{name:'Ouvrir dans l’éditeur',exact:true}).click();
  await p.locator('.pmk135-card').filter({has:p.locator('strong',{hasText:/^Bonjour$/})}).click();
  const labels=await p.locator('.pmk135-pane-inspector label').allTextContents();assert(labels.some(l=>/Texte/.test(l)),labels.join('|'));
  const textField=p.locator('.pmk135-pane-inspector textarea').first();await textField.fill('Bonjour modifié');
  await p.getByRole('button',{name:'Annuler',exact:true}).click();await p.getByRole('button',{name:'Rétablir',exact:true}).click();
  await p.getByRole('button',{name:'3. Vérifier et exporter',exact:true}).click();const output=await p.locator('#pmk136-output').inputValue();assert(output.includes('Bonjour modifié'));assert(output.includes('Utils.xsl'));assert(output.includes('ma-variable'));assert(output.includes('Bloc conditionnel'));assert(output.includes('à conserver'));assert(!output.includes('data-pmk-xslt-node='));
  const exported=p.waitForEvent('download');await p.getByRole('button',{name:'Télécharger le fichier XSLT',exact:true}).click();const download=await exported;assert(download.suggestedFilename().endsWith('.xsl'));assert.equal(fs.readFileSync(await download.path(),'utf8'),output);
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Editor refresh: invalid XSLT import keeps the existing project and full backups restore as a separate project',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=xslt-assistant','<main>Koha</main>');
  const xml='<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><p>Projet préservé</p></xsl:template></xsl:stylesheet>';
  await p.evaluate(xml=>{localStorage.setItem('pmk-xslt-assistant-v1:projects',JSON.stringify([{id:'original',name:'Mon projet',updatedAt:'2026-10-17'}]));localStorage.setItem('pmk-xslt-assistant-v1:original',JSON.stringify({id:'original',name:'Mon projet',workingXml:xml,sourceXml:xml,activeStep:'build',autoPreview:false,custom:{mine:42},dependencies:[]}));},xml);
  await load(p,'136-xslt-assistant.js');await p.evaluate(()=>PMK136XsltAssistant.openOverlay());
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('pmk-xslt-assistant-v1:original')).autoPreview),false);
  await p.getByRole('button',{name:'1. Ouvrir un XSLT',exact:true}).click();await p.getByRole('button',{name:'Remplacer par un autre XSLT',exact:true}).click();await p.getByLabel('Ou coller mon XSLT',{exact:true}).fill('<not-xslt/>');await p.getByRole('button',{name:'Ouvrir dans l’éditeur',exact:true}).click();assert((await p.getByRole('dialog').textContent()).includes('racine doit être'));await p.getByRole('dialog').getByRole('button',{name:'Annuler',exact:true}).click();
  await p.getByRole('button',{name:'3. Vérifier et exporter',exact:true}).click();assert((await p.locator('#pmk136-output').inputValue()).includes('Projet préservé'));
  const downloadEvent=p.waitForEvent('download');await p.getByRole('button',{name:'Sauvegarder le projet',exact:true}).click();const file=await downloadEvent;const backup=fs.readFileSync(await file.path());const decoded=JSON.parse(backup);assert.equal(decoded.project.custom.mine,42);
  await p.getByRole('button',{name:'Mes projets',exact:true}).click();await p.getByLabel('Importer une sauvegarde de projet',{exact:true}).setInputFiles({name:'sauvegarde.json',mimeType:'application/json',buffer:backup});await p.waitForFunction(()=>JSON.parse(localStorage.getItem('pmk-xslt-assistant-v1:projects')).length===2);
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('pmk-xslt-assistant-v1:original')).custom.mine),42);await p.evaluate(()=>PMKConfig.saveConfig('xslt-assistant',{enabled:false}));assert.equal(await p.locator('.pmk135-overlay').count(),0);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Editor refresh: XSLT preview, MARC retargeting, comparison and validation use one cached test record',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=xslt-assistant','<main>Koha</main>');let requests=0;
  const xml='<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:marc="http://www.loc.gov/MARC21/slim"><xsl:template match="/"><section><p id="title"><xsl:value-of select="marc:record/marc:datafield[@tag=\'200\']/marc:subfield[@code=\'a\']"/></p><p id="second">Second bloc</p><script>window.__previewExecuted=true;</script></section></xsl:template></xsl:stylesheet>';
  await p.route('**/api/v1/biblios/1',r=>{requests++;return r.fulfill({contentType:'application/marcxml+xml',body:'<record xmlns="http://www.loc.gov/MARC21/slim"><datafield tag="200"><subfield code="a">Le titre</subfield></datafield><datafield tag="330"><subfield code="a">Le résumé</subfield></datafield></record>'})});
  await load(p,'136-xslt-assistant.js');await p.evaluate(()=>PMK136XsltAssistant.openOverlay());await p.getByRole('button',{name:'Choisir un fichier ou coller mon XSLT',exact:true}).click();await p.getByLabel('Ou coller mon XSLT',{exact:true}).fill(xml);await p.getByRole('button',{name:'Ouvrir dans l’éditeur',exact:true}).click();
  await p.getByLabel('Notice de test',{exact:true}).fill('1');await p.waitForFunction(()=>document.querySelector('#pmk136-live-preview #title')?.textContent==='Le titre',null,{timeout:5000}).catch(async e=>{throw new Error(await p.locator('#pmk136-live-preview').textContent())});assert.equal(await p.evaluate(()=>window.__previewExecuted),undefined);
  await p.locator('#pmk136-live-preview #title').click();await p.getByLabel('Zone',{exact:true}).fill('330');await p.waitForFunction(()=>document.querySelector('#pmk136-live-preview #title')?.textContent==='Le résumé');assert.equal(requests,1);
  await p.getByLabel('Avant / après',{exact:false}).check();await p.waitForFunction(()=>document.querySelectorAll('.pmk135-preview-column').length===2);assert.match(await p.locator('.pmk135-preview-column').first().textContent(),/Le titre/);assert.match(await p.locator('.pmk135-preview-column').last().textContent(),/Le résumé/);
  await p.getByRole('button',{name:'Descendre le bloc',exact:true}).click();await p.getByRole('button',{name:'Monter le bloc',exact:true}).click();
  await p.getByRole('button',{name:'Ajouter un élément',exact:true}).click();await p.getByRole('button',{name:/^Une donnée de la notice/}).click();await p.getByRole('dialog').getByLabel('Libellé',{exact:true}).fill('Ajout : ');await p.getByRole('dialog').getByRole('button',{name:'Ajouter',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#pmk136-live-preview')?.textContent.includes('Ajout : Le titre'));
  await p.getByRole('button',{name:'3. Vérifier et exporter',exact:true}).click();const output=await p.locator('#pmk136-output').inputValue();assert(output.includes("[@tag='330']"));assert(output.includes('window.__previewExecuted=true;'));await p.getByRole('button',{name:'Lancer les vérifications',exact:true}).click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('pmk-xslt-assistant-v1:projects')).some(meta=>JSON.parse(localStorage.getItem('pmk-xslt-assistant-v1:'+meta.id)).lastValidation));
  assert.equal(requests,1);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Editor refresh: bibliography bounds stalled reads, retains available data and retries without resetting layout',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=bibliography-builder&source=session','<main>Koha</main>');await p.clock.install();let jsonRequests=0;
  await p.evaluate(()=>{sessionStorage.setItem('pmk142-session-source',JSON.stringify({kind:'koha-native',type:'notice',name:'Source',entries:[{biblionumber:'1',title:'Données disponibles'}]}));window.PMKCoverResolver={resolveCandidates:async()=>[],clearCache:()=>{}};});
  await p.route('**/api/v1/**',route=>{if(route.request().headers().accept==='application/marcxml+xml')return route.fulfill({contentType:'application/marcxml+xml',body:'<record xmlns="http://www.loc.gov/MARC21/slim"><datafield tag="330"><subfield code="a">Résumé disponible</subfield></datafield></record>'});if(route.request().url().includes('/items'))return route.fulfill({json:[]});jsonRequests++;if(jsonRequests===1)return new Promise(()=>{});return route.fulfill({json:{biblio_id:1,title:'Notice actualisée'}})});
  await load(p,'142-bibliography-builder.js');await p.waitForFunction(()=>document.querySelector('.pmk142-status.is-loading'));await p.locator('[data-control=doc-title]').fill('Mon titre personnel');await p.clock.fastForward(15001);
  await p.waitForFunction(()=>document.querySelector('[data-zone=preview]')?.getAttribute('aria-busy')==='false');assert((await p.locator('[data-zone=preview]').textContent()).includes('Données disponibles'));assert.equal(await p.locator('[data-control=doc-title]').inputValue(),'Mon titre personnel');
  await p.getByRole('button',{name:'Actualiser les données',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[data-zone=preview]')?.textContent.includes('Notice actualisée'));assert.equal(jsonRequests,2);assert.equal(await p.locator('[data-control=doc-title]').inputValue(),'Mon titre personnel');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Editor refresh: targeted bibliography retry preserves choices and only refreshes the selected record',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=bibliography-builder&source=session','<main>Koha</main>');
  let phase=0;const requests=[];
  await p.evaluate(()=>{sessionStorage.setItem('pmk142-session-source',JSON.stringify({kind:'koha-native',type:'notice',name:'Source personnelle',entries:[{biblionumber:'1',title:'Première'},{biblionumber:'2',title:'Deuxième'}]}));window.PMKCoverResolver={resolveCandidates:async()=>[]};});
  await p.route('**/api/v1/**',r=>{const u=new URL(r.request().url()),id=u.pathname.match(/biblios\/(\d+)/)?.[1],marc=r.request().headers().accept==='application/marcxml+xml';requests.push({id,path:u.pathname,marc});if(u.pathname.endsWith('/items'))return r.fulfill({json:[]});if(id==='2'&&((phase===0&&marc)||phase===2))return r.fulfill({status:503,body:'Temporairement indisponible'});return marc?r.fulfill({contentType:'application/marcxml+xml',body:'<record xmlns="http://www.loc.gov/MARC21/slim"><datafield tag="330"><subfield code="a">Résumé conservé '+id+'</subfield></datafield></record>'}):r.fulfill({json:{biblio_id:Number(id),title:'Titre '+id+' version '+phase}});});
  await load(p,'142-bibliography-builder.js');await p.waitForFunction(()=>document.querySelector('[data-zone=preview]')?.getAttribute('aria-busy')==='false');
  await p.locator('[data-control=doc-title]').fill('Titre choisi');await p.locator('[data-action=open-content-manager]').click();
  const card=p.locator('.pmk142-content-biblio').filter({has:p.locator('[data-biblionumber="2"]')});assert.match(await card.innerText(),/MARC : indisponible/);
  const first=p.locator('.pmk142-content-biblio').filter({has:p.locator('[data-biblionumber="1"]')});await first.locator('[data-content-biblio]').uncheck();
  const untouched=requests.filter(r=>r.id==='1').length;
  await p.evaluate(()=>{window.__coverReady=new Promise(r=>window.__releaseCover=r);PMKCoverResolver.resolveCandidates=()=>__coverReady;});phase=1;
  await card.locator('[data-action=retry-notice]').click();await p.waitForFunction(()=>document.querySelector('[data-zone=preview]')?.textContent.includes('Titre 2 version 1'));
  assert(await card.locator('[data-action=retry-notice]').isDisabled());await p.evaluate(()=>__releaseCover([]));await p.waitForFunction(()=>!document.querySelector('[data-biblionumber="2"]').disabled);
  assert.match(await card.innerText(),/MARC : chargé/);assert.equal(await first.locator('[data-content-biblio]').isChecked(),false);assert.equal(requests.filter(r=>r.id==='1').length,untouched);assert.equal(await p.locator('[data-control=doc-title]').inputValue(),'Titre choisi');
  phase=2;await card.locator('[data-action=retry-notice]').click();await p.waitForFunction(()=>document.querySelector('[data-zone=preview]')?.getAttribute('aria-busy')==='false');assert.match(await card.innerText(),/MARC : indisponible/);assert.match(await p.locator('[data-zone=preview]').innerText(),/Titre 2 version 1/);
  await p.locator('[data-action=close-content-manager]').last().click();await p.emulateMedia({media:'print'});assert.equal(await p.locator('.pmk142-card').first().evaluate(e=>getComputedStyle(e).breakInside),'avoid');
  assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Editor refresh: XSLT validation checks a bounded sample and explains server compatibility',async()=>{
  const p=await fixture('/cgi-bin/koha/mainpage.pl?pmk_page=xslt-assistant','<main>Koha</main>');const requests=[];
  const xml='<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><p>Validation</p></xsl:template></xsl:stylesheet>';
  await p.evaluate(xml=>{localStorage.setItem('pmk-xslt-assistant-v1:projects',JSON.stringify([{id:'sample',name:'Échantillon'}]));localStorage.setItem('pmk-xslt-assistant-v1:sample',JSON.stringify({id:'sample',name:'Échantillon',sourceXml:xml,workingXml:xml,autoPreview:false,activeStep:'publish',previewBiblionumber:'1',previewRecords:[1,2,3,4,5,6].map(id=>({id:String(id),kind:'biblio'})),dependencies:[]}));},xml);
  await p.route('**/api/v1/biblios/*',r=>{const id=new URL(r.request().url()).pathname.split('/').pop();requests.push(id);return id==='3'?r.fulfill({status:503,body:'Indisponible'}):r.fulfill({contentType:'application/marcxml+xml',body:'<record xmlns="http://www.loc.gov/MARC21/slim"/>'});});
  await load(p,'136-xslt-assistant.js');await p.evaluate(()=>PMK136XsltAssistant.openOverlay());await p.getByRole('button',{name:'Lancer les vérifications',exact:true}).click();
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('pmk-xslt-assistant-v1:sample')).lastValidation);const result=await p.evaluate(()=>JSON.parse(localStorage.getItem('pmk-xslt-assistant-v1:sample')).lastValidation);
  assert(result.checks.some(c=>c.level==='warn'&&JSON.stringify(c).includes('libxslt')));assert(result.checks.some(c=>JSON.stringify(c).includes('Échantillon de cinq')));assert(result.checks.some(c=>JSON.stringify(c).includes('non concluante — 3')));assert.deepEqual([...new Set(requests)],['1','2','3','4','5']);assert.equal(result.status,'warn');assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 await check('Summary source: explicit absence and failure stay distinct; custom source is readable on mobile and restored on disable',async()=>{
  const config={enabled:true,targetSelector:'#anchor',sourceSelector:'#summary',emptySourceSelector:'#empty',unavailableSourceSelector:'#failed',custom:{keep:42}};
  const p=await fixture('/cgi-bin/koha/catalogue/detail.pl?biblionumber=1','<main><div id="anchor"></div><span id="empty">Aucun résumé</span><span id="failed" hidden>Source indisponible</span><div id="original"></div></main>',{'detail-fourth-cover':config},true);
  await p.evaluate(()=>document.body.id='catalog_detail');await load(p,'009-4eme-de-couv.js');await p.waitForFunction(()=>window.__PMK_009_DETAIL_FOURTH_COVER__.status==='source-empty');assert.equal(await p.locator('#pmk-detail-fourth-cover').count(),0);
  await p.evaluate(()=>{document.querySelector('#empty').hidden=true;document.querySelector('#failed').hidden=false;});assert.equal(await p.evaluate(()=>__PMK_009_DETAIL_FOURTH_COVER__.diagnoseSource()),'unavailable');
  await p.evaluate(()=>document.querySelector('#failed').hidden=true);assert.equal(await p.evaluate(()=>__PMK_009_DETAIL_FOURTH_COVER__.diagnoseSource()),'unknown');
  await p.evaluate(async()=>{const source=document.createElement('span');source.id='summary';source.textContent='Long résumé et caractères accentués '.repeat(300);document.querySelector('#original').append(source);await PMKConfig.saveConfig('detail-fourth-cover',await PMKConfig.getConfig('detail-fourth-cover'));});await p.locator('#pmk-detail-fourth-cover').waitFor();await p.setViewportSize({width:390,height:700});
  const toggle=p.locator('.pmk-fourth-cover-toggle');await toggle.focus();await toggle.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await p.locator('#pmk-detail-fourth-cover-body').getAttribute('role'),'region');assert((await p.locator('#summary').textContent()).length>8000);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await p.evaluate(async()=>{const c=await PMKConfig.getConfig('detail-fourth-cover');c.enabled=false;await PMKConfig.saveConfig('detail-fourth-cover',c)});await p.waitForFunction(()=>document.querySelector('#summary')?.parentElement.id==='original');assert.equal(await p.locator('#pmk-detail-fourth-cover').count(),0);assert.equal(await p.evaluate(async()=>(await PMKConfig.getConfig('detail-fourth-cover')).custom.keep),42);
  await p.evaluate(()=>PMKConfig.openAdmin('detail-fourth-cover'));assert.equal(await p.locator('[data-pmk-section-id="summary-source"]').count(),1);assert(!p.errors.length,p.errors.join('\n'));await p.close();
 });
 console.log('\n'+passes.length+' regression groups passed. All data and API responses were local fixtures.');
 fs.writeFileSync(process.env.PMK_TEST_REPORT||root+'tests/validation/regression-results.json',JSON.stringify({passed:passes},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
