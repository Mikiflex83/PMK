const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/personal-lists-ownership.json');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const modes={};
  for(const mode of ['named','koha']){
    const page=await browser.newPage({locale:'fr-FR'});
    await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head></head><body></body></html>'}));
    await page.goto('http://pmk.test/cgi-bin/koha/mainpage.pl');
    await page.evaluate(mode=>{window.PMKPersonalListsOptions={identityMode:mode};},mode);
    await page.addScriptTag({path:path.join(ROOT,'066-067-lists-manager.js')});
    await page.waitForSelector('[data-cloud-ownership]');
    modes[mode]={text:await page.locator('[data-cloud-ownership]').innerText(),state:await page.evaluate(()=>PMKPersonalLists.getState())};
    await page.close();
  }
  assert.match(modes.named.text,/Mode partagé.*profil nommé historique/);
  assert.equal(modes.named.state.ownership,'shared');
  assert.match(modes.koha.text,/Mode privé.*compte Koha connecté/);
  assert.equal(modes.koha.state.ownership,'private');

  const page=await browser.newPage({locale:'fr-FR'});
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head></head><body></body></html>'}));
  await page.goto('http://pmk.test/cgi-bin/koha/mainpage.pl');
  await page.evaluate(()=>{window.__definition=null;window.PMKConfig={registerModule:d=>__definition=d,getConfig:async()=>({enabled:false,identityMode:'named'}),subscribe:()=>()=>{},getLanguage:()=> 'fr'};});
  await page.addScriptTag({path:path.join(ROOT,'066-067-lists-manager-pmk-loader.js')});
  const definition=await page.evaluate(()=>({description:__definition.description.fr,field:__definition.schema[0].fields[0]}));
  assert.match(definition.field.help.fr,/attribution.*explicitement.*outil de migration/i);
  assert.deepEqual(definition.field.options.map(option=>option.value),['named','koha']);
  const migration=fs.readFileSync(path.join(ROOT,'plugin/Koha/Plugin/PimpMyKoha/migration.js'),'utf8');
  assert.match(migration,/Attribuer une copie d’un ancien profil de listes à un compte Koha/);
  assert.match(migration,/Le profil nommé original reste disponible/);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,modes,configuration:definition.field.help.fr,historicalAssignment:true},null,2)+'\n');
  console.log('PASS personal lists shared/private ownership and explicit historical assignment');
  await browser.close();
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
