const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/authority-installation-diagnostics.json');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({locale:'fr-FR'});
  await page.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="fr"><head></head><body><main><h1>Configuration PMK</h1></main></body></html>'}));
  await page.goto('http://pmk.test/cgi-bin/koha/plugins/run.pl?class=Koha%3A%3APlugin%3A%3APimpMyKoha&method=tool');
  await page.evaluate(()=>{
    window.__definition=null;window.__checkedConfig=null;
    window.PMKConfig={registerModule:d=>(__definition=d),services:{get:()=>({registerDefinition(){}})}};
    window.PMKWorkbench={checkReports:async config=>{window.__checkedConfig=structuredClone(config);return {rows:[{id:5246,state:'ok',name:'Référentiel complet',executed:false},{id:5245,state:'ok',name:'Doublons',executed:false},{id:5260,state:'missing',executed:false}]};}};
  });
  await page.addScriptTag({path:path.join(ROOT,'000-pmk-settings-authorities.js')});
  const result=await page.evaluate(async()=>{
    const defaults=PMKAuthorityInstallation.diagnose(__definition.defaults);
    const invalid=PMKAuthorityInstallation.diagnose({...__definition.defaults,duplicatesReportId:5246,personTypes:'NP\nnp\nCODE INVALIDE'});
    const checked=await PMKAuthorityInstallation.checkInstallation(__definition.defaults);
    const custom=__definition.schema[0].fields.find(field=>field.type==='custom');
    const view=custom.render({rootObject:__definition.defaults});document.body.append(view);view.querySelector('button').click();
    await new Promise(resolve=>setTimeout(resolve,0));
    return {defaults,invalid,checked,view:view.innerText,description:__definition.description.fr,validation:__definition.validate(__definition.defaults),checkedConfig:__checkedConfig};
  });
  assert.equal(result.defaults.valid,true);
  assert.equal(result.invalid.valid,false);
  assert.equal(result.invalid.reports.filter(report=>/partagé/.test(report.state)).length,2);
  assert.deepEqual(result.invalid.duplicatePersonTypes,['np']);
  assert.deepEqual(result.invalid.invalidPersonTypes,['CODE INVALIDE']);
  assert.equal(result.checked.checked,true);
  assert.equal(result.checked.reports.find(report=>report.key==='orphansReportId').remote.state,'missing');
  assert.equal(result.checked.reports.every(report=>report.remote.executed===false),true);
  assert.match(result.view,/n’exécute pas leur SQL/);
  assert.match(result.view,/Orphelins : introuvable/);
  assert.match(result.description,/moteur métier de la page Autorités reste inchangé/);
  assert.equal(result.validation.ok,true);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,...result,scope:'Configuration d’installation uniquement ; aucun chargement ni appel au moteur métier de la page Autorités.'},null,2)+'\n');
  console.log('PASS authority report/type installation diagnostics without SQL execution');
  await browser.close();
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
