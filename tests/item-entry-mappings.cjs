const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/item-entry-mappings.json');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({locale:'fr-FR'});
  await page.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="fr"><head></head><body><select name="homebranch"><option value="">—</option><option value="SITE1">Site 1</option></select><select name="location"><option value="">—</option><option value="RAYON">Rayon</option></select></body></html>'}));
  await page.goto('http://pmk.test/cgi-bin/koha/cataloguing/additem.pl');
  await page.evaluate(()=>{
    window.__definition=null;window.__config={enabled:true,pages:[{id:'cataloguing.additem',path:'/cgi-bin/koha/cataloguing/additem.pl',enabled:true}],panel:{collapsedByDefault:false,refreshOptionsMs:60000},presets:{enabled:false},fields:[
      {id:'b',enabled:true,kohafield:'items.homebranch',marcTag:'995',marcSubfield:'b',labelFr:'Site',type:'select',sourceMode:'form',dependencyMode:'none',source:{}},
      {id:'e',enabled:true,kohafield:'items.location',marcTag:'995',marcSubfield:'e',labelFr:'Localisation',type:'select',sourceMode:'form',dependencyMode:'equals',dependsOnFieldId:'b',dependsOnValues:'SITE1',source:{}},
      {id:'bad',enabled:true,kohafield:'items.missing',marcTag:'99',marcSubfield:'x',labelFr:'Champ absent',type:'select',sourceMode:'authorised_values',dependencyMode:'equals',dependsOnFieldId:'unknown',dependsOnValues:'',source:{authorisedValueCategory:'',fallbackToForm:true}}
    ]};
    window.PMKConfig={registerModule:d=>__definition=d,getConfig:async()=>structuredClone(__config),subscribe:()=>()=>{},getLanguage:()=> 'fr',mountContextButton(){},isKohaSuperlibrarian:()=>true};
  });
  await page.addScriptTag({path:path.join(ROOT,'110-exemplaire-helper.js')});
  await page.waitForSelector('#koha_items_assistant_panel [data-row="e"] .combo-input');
  const before=await page.locator('#koha_items_assistant_panel [data-row="e"] .combo-input').isDisabled();
  assert.equal(before,true);
  await page.locator('#koha_items_assistant_panel [data-row="b"] .combo-input').selectOption('SITE1');
  assert.equal(await page.locator('#koha_items_assistant_panel [data-row="e"] .combo-input').isDisabled(),false);
  const result=await page.evaluate(()=>{
    const rows=PMK110ItemEntryAssistant.diagnoseFields(__config);
    const custom=__definition.schema.find(section=>section.id==='fields').fields.find(field=>field.type==='custom');
    return {mappings:rows,configurationView:custom.render({rootObject:__config}).innerText,dependencyReject:PMK110ItemEntryAssistant.dependencySatisfied(__config.fields[1],{b:'OTHER'}),dependencyAccept:PMK110ItemEntryAssistant.dependencySatisfied(__config.fields[1],{b:'SITE1'})};
  });
  assert.equal(result.mappings.find(row=>row.id==='b').found,true);
  assert.equal(result.mappings.find(row=>row.id==='e').marc,'995$e');
  assert.deepEqual(result.mappings.find(row=>row.id==='bad').issues.sort(),['authorised-value-category-missing','dependency-invalid','dependency-values-missing','marc-invalid','target-missing'].sort());
  assert.match(result.configurationView,/MARC 995\$e.*dépend de b/);
  assert.equal(result.dependencyReject,false);assert.equal(result.dependencyAccept,true);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,...result},null,2)+'\n');
  console.log('PASS item entry field dependencies, MARC mappings and authorised-value diagnostics');
  await browser.close();
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
