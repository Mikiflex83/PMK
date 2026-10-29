const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tests/validation/item-template-preview.json');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PMK_CHROMIUM_PATH || '/usr/bin/chromium', headless:true, args:['--no-sandbox'] });
  const page = await browser.newPage({locale:'fr-FR'});
  await page.route('http://pmk.test/**', route => route.fulfill({contentType:'text/html', body:'<!doctype html><html lang="fr"><head></head><body><main><h1>Modification des exemplaires</h1><form><div class="subfield_line"><input type="hidden" name="kohafield" value="items.homebranch"><select name="items.homebranch"><option value="MDB" selected>Médiathèque</option><option value="RMDB">Réservoir</option></select></div><div class="subfield_line"><input type="hidden" name="kohafield" value="items.location"><select name="items.location"><option value="A" selected>Adultes</option></select></div></form></main></body></html>'}));
  await page.goto('http://pmk.test/cgi-bin/koha/tools/batchMod.pl');
  await page.evaluate(() => {
    const cfg = {enabled:true,pages:[{id:'tools.batchmod',path:'/cgi-bin/koha/tools/batchMod.pl',enabled:true},{id:'cataloguing.additem',path:'/cgi-bin/koha/cataloguing/additem.pl',enabled:true}],toolbar:{previewBeforeApply:true,showWarnings:true},models:[{id:'preview',enabled:true,labelFr:'Préparer',showOnBatchMod:true,showOnAddItem:true,confirmBeforeApply:false,assignments:[{enabled:true,target:'items.homebranch',action:'set',value:'RMDB'},{enabled:true,target:'items.location',action:'set',value:'Z'}]}]};
    window.__confirmation = null;
    window.PMKConfig = {registerModule(){},getConfig(){return Promise.resolve(cfg)},subscribe(){},getLanguage(){return 'fr'},confirmAction(options){window.__confirmation=structuredClone(options);return Promise.resolve(false)}};
  });
  await page.addScriptTag({path:path.join(ROOT,'102-batchmod-mediabus-buttons.js')});
  await page.getByRole('button',{name:'Préparer',exact:true}).click();
  await page.waitForFunction(()=>window.__confirmation);
  const result = await page.evaluate(() => ({message:window.__confirmation.message, home:document.querySelector('[name="items.homebranch"]').value, location:document.querySelector('[name="items.location"]').value, preview:PMKItemTemplateButtons.previewModel(PMKItemTemplateButtons.getConfig().models[0])}));
  assert.match(result.message,/MDB.*RMDB/s);
  assert.match(result.message,/Localisation.*indisponible/s);
  assert.equal(result.home,'MDB','cancelled preview must not change the form');
  assert.equal(result.location,'A');
  assert.equal(result.preview[0].ok,true);
  assert.equal(result.preview[1].ok,false);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,message:result.message,preview:result.preview,formPreserved:{home:result.home,location:result.location}},null,2)+'\n');
  console.log('PASS item template before/after preview and invalid values');
  await browser.close();
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
