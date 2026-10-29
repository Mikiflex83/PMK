const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/cataloging-6xx-provenance.json');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({locale:'fr-FR'});
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head></head><body><h1>Catalogage</h1></body></html>'}));
  await page.goto('http://pmk.test/cgi-bin/koha/cataloguing/addbiblio.pl');
  await page.evaluate(()=>{
    const config={enabled:true,pages:[{id:'cataloguing.addbiblio',pathSuffix:'/addbiblio.pl',enabled:true}],api:{perPage:500,maxPages:20},select2:{enabled:false,loadIfMissing:false},appearance:{mode:'inline-assistant',showStatus:true},rules:[{id:'mixed',enabled:true,nameFr:'Test',marcTag:'610',subfield:'a',fallbackLabel:'',placeholderFr:'Choisir',placeholderEn:'Choose',sourceMode:'mixed',categories:[{enabled:true,name:'THEMES',manualName:''}],manualValues:'serie|Série manuelle\nNouveau|Nouveau manuel',displayMode:'description',sortMode:'source',deduplicateCaseInsensitive:true}]};
    window.__definition=null;
    window.PMKAuthorisedValuesService={listCategories:async()=>['THEMES'],listValues:async()=>[{value:'Serie',description:'Série Koha'},{value:'Koha',description:'Koha seul'}],clear(){}};
    window.PMKConfig={registerModule:d=>__definition=d,getConfig:async()=>structuredClone(config),subscribe:()=>()=>{},getLanguage:()=> 'fr',mountContextButton(){}};
  });
  await page.addScriptTag({path:path.join(ROOT,'081-084-6xx-suggestions.js')});
  await page.waitForFunction(()=>window.PMK6XXSuggestions?.analyzeRule);
  const result=await page.evaluate(()=>PMK6XXSuggestions.analyzeRule('mixed'));
  const duplicate=result.options.find(option=>option.variants?.length===2);
  assert(duplicate);
  assert.deepEqual(duplicate.sources,['koha:THEMES','manual']);
  assert.deepEqual(duplicate.variants.map(item=>item.label),['Série Koha','Série manuelle']);
  assert.equal(duplicate.label,'Série manuelle');
  assert.match(result.summary,/1 doublon.*variantes conservées/);
  assert.equal(result.options.length,3);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,...result},null,2)+'\n');
  console.log('PASS 6XX suggestion provenance, variants and duplicate diagnostics');
  await browser.close();
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
