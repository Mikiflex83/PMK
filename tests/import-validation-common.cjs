const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/import-validation-common.json');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();await page.route('http://example.test/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Koha test</title>'}));await page.goto('http://example.test/koha/');await page.addScriptTag({path:path.join(ROOT,'000-pmk-import-common.js')});
  const results=await page.evaluate(async()=>{
    const api=window.PMKImportCommon,attempt=async fn=>{try{return {ok:true,value:await fn()};}catch(error){return {ok:false,message:error.message};}};
    const valid=await api.jsonFile(new File([JSON.stringify({format:'x',custom:{future:true}})],'config.json',{type:'application/json'}));
    return {
      valid,
      malformed:await attempt(()=>api.jsonFile(new File(['{"x":'],'bad.json'))),
      binary:await attempt(()=>api.textFile(new File([new Uint8Array([123,0,125])],'binary.json'))),
      oversized:await attempt(()=>api.textFile(new File(['123456'],'large.json'),{maxBytes:5})),
      pollution:await attempt(()=>api.jsonText('{"__proto__":{"admin":true}}')),
      localUrl:await attempt(()=>api.sameOriginURL('/cgi-bin/koha/mainpage.pl?x=1',{paths:['/cgi-bin/koha/mainpage.pl']})),
      remoteUrl:await attempt(()=>api.sameOriginURL('https://invalid.example/path')),
      activeHtml:await attempt(()=>api.htmlText('<p onclick="run()">Texte</p>')),
      loginHtml:await attempt(()=>api.htmlText('<form id="loginform"></form>',{rejectLogin:true})),
      validHtml:await attempt(()=>api.htmlText('<main><p>Texte sûr</p></main>'))
    };
  });
  await browser.close();
  const settings=fs.readFileSync(path.join(ROOT,'138-pages-settings.js'),'utf8');
  const migration=fs.readFileSync(path.join(ROOT,'plugin/Koha/Plugin/PimpMyKoha/migration.js'),'utf8');
  const nativeData=fs.readFileSync(path.join(ROOT,'plugin/Koha/Plugin/PimpMyKoha/native-data.js'),'utf8');
  const checks={
    unknownFieldsPreserved:results.valid.custom.future===true,
    malformedJsonRejected:!results.malformed.ok&&results.malformed.message.includes('JSON malformé'),
    binaryRejected:!results.binary.ok&&results.binary.message.includes('binaire'),
    sizeBounded:!results.oversized.ok&&results.oversized.message.includes('taille autorisée'),
    prototypePollutionRejected:!results.pollution.ok&&results.pollution.message.includes('Propriété interdite'),
    sameOriginUrlAccepted:results.localUrl.ok,
    remoteUrlRejected:!results.remoteUrl.ok&&results.remoteUrl.message.includes('cette installation Koha'),
    activeHtmlRejected:!results.activeHtml.ok&&results.activeHtml.message.includes('contenu actif'),
    loginHtmlRejected:!results.loginHtml.ok&&results.loginHtml.message.includes('connexion Koha'),
    safeHtmlAccepted:results.validHtml.ok,
    pageSettingsUsesValidator:settings.includes('PMKImportCommon.jsonFile'),
    migrationUsesValidator:migration.includes('PMKImportCommon.jsonFile')&&migration.includes('PMKImportCommon.jsonText'),
    nativeDataUsesValidator:nativeData.includes('PMKImportCommon.jsonFile')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Validation commune des imports texte/JSON, URL Koha et HTML passif ; champs inconnus valides conservés.'},null,2)+'\n');
  console.log('PASS malformed import, URL and HTML validation');
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
