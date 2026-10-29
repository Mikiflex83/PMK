const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/detail-reservations-simulation.json');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({locale:'fr-FR'});
  await page.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="fr"><head></head><body><div id="native"><span id="hold" class="results_summary"><span class="label">Réservations :</span> 4</span><span id="list" class="results_summary"><span class="label">Listes contenant ce titre :</span> Deux</span></div><div class="catalogue-info"></div></body></html>'}));
  await page.goto('http://pmk.test/cgi-bin/koha/catalogue/detail.pl');
  await page.evaluate(()=>{
    window.__definition=null;window.__subscriber=null;
    window.__config={enabled:true,page:{enabled:true,path:'/cgi-bin/koha/catalogue/detail.pl'},appearance:{showTextMarker:true},advanced:{watchDynamicContent:false,waitMs:0},blocks:[
      {id:'first',enabled:true,adminLabelFr:'Réservations principales',matchMode:'contains',matchFr:'Réservations',backgroundColor:'#32cd32',backgroundOpacity:.5,markerTextFr:'Réservations'},
      {id:'second',enabled:true,adminLabelFr:'Règle concurrente',matchMode:'contains',matchFr:'Réservations',backgroundColor:'#ffa500',backgroundOpacity:.5,markerTextFr:'À vérifier'},
      {id:'lists',enabled:true,adminLabelFr:'Listes',matchMode:'contains',matchFr:'Listes contenant ce titre',backgroundColor:'#fa4848',backgroundOpacity:.5,markerTextFr:'Liste de notices'}
    ]};
    window.PMKConfig={registerModule:d=>__definition=d,getConfig:async()=>structuredClone(__config),subscribe:(_id,cb)=>(__subscriber=cb,()=>{}),getLanguage:()=> 'fr',mountContextButton(){}};
  });
  await page.addScriptTag({path:path.join(ROOT,'103-detail-reservations-summary-style.js')});
  await page.waitForSelector('.pmk103-rule-marker');
  const result=await page.evaluate(()=>{
    const diagnosis=PMK103ConditionalFormatting.diagnose(__config);
    const section=__definition.schema.find(field=>field.id==='blocks');
    const custom=section.fields.find(field=>field.type==='custom');
    const simulation=custom.render({rootObject:__config,language:'fr'});
    return {diagnosis,simulation:simulation.innerText,markers:[...document.querySelectorAll('.pmk103-rule-marker')].map(node=>node.textContent),candidateTexts:[...document.querySelectorAll('.results_summary')].map(node=>node.textContent),nativeChildren:[...document.querySelector('#native').children].map(node=>node.id)};
  });
  assert.equal(result.diagnosis.conflicts.length,1);
  assert.deepEqual(result.diagnosis.conflicts[0].ruleIds,['first','second']);
  assert.match(result.simulation,/Règles concurrentes/);
  assert.match(result.simulation,/Condition : contains — Réservations/);
  assert.deepEqual(result.markers,['Réservations','Liste de notices']);
  await page.evaluate(()=>__subscriber({...__config,enabled:false}));
  await page.waitForFunction(()=>!document.querySelector('.pmk103-rule-marker'));
  assert.deepEqual(await page.locator('#native > span').evaluateAll(nodes=>nodes.map(node=>node.id)),['hold','list']);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,...result,restored:true},null,2)+'\n');
  console.log('PASS hold/list condition simulation, conflicts and non-color markers');
  await browser.close();
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
