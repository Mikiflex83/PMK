const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tests/validation/useful-links-control.json');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PMK_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ locale: 'fr-FR' });
  const pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message));
  await page.setContent('<!doctype html><html lang="fr"><head></head><body><span class="is_superlibrarian"></span><div id="slot"></div></body></html>');
  const longLabel = 'Guide extrêmement détaillé destiné aux équipes de toutes les bibliothèques du réseau et à leurs partenaires';
  await page.evaluate(label => {
    window.__opened = [];
    window.open = url => { window.__opened.push(url); return null; };
    window.__cfg = { enabled:true, titleFr:'Liens', links:[
      {id:'a',enabled:true,column:'left',label,url:'https://koha.test/cgi-bin/koha/catalogue/search.pl',newTab:false},
      {id:'b',enabled:true,column:'right',label:'Même destination',url:'https://koha.test/cgi-bin/koha/catalogue/search.pl#top',newTab:false}
    ] };
    const subscribers = [];
    window.PMKConfig = {
      registerModule() {}, isKohaSuperlibrarian() { return true; },
      getConfig() { return Promise.resolve(structuredClone(window.__cfg)); },
      subscribe(_id, cb) { subscribers.push(cb); },
      async saveConfig(_id, cfg) { window.__cfg = structuredClone(cfg); subscribers.forEach(cb => cb(window.__cfg)); }
    };
    window.PMKHomeWidgets = { register(widget) { widget.mount(document.querySelector('#slot')); } };
  }, longLabel);
  await page.addScriptTag({ path: path.join(ROOT, '137-widgets/137-widget-liens-utiles.js') });
  await page.getByRole('button', { name:'Configurer les liens utiles' }).click();
  const diagnostics = await page.getByRole('status').innerText();
  assert.match(diagnostics, /Même destination/);
  assert.match(diagnostics, /Libellé long/);
  await page.getByRole('button', { name:'Tester le lien' }).first().click();
  assert.deepEqual(pageErrors, []);
  const checkedText = await page.locator('.pmk137-link-check-state').allInnerTexts();
  assert.match(checkedText[0], /Vérifié manuellement/, JSON.stringify({checkedText, opened:await page.evaluate(()=>window.__opened)}));
  await page.getByRole('button', { name:'Enregistrer / Save', exact:true }).click();
  const result = await page.evaluate(() => ({ cfg:window.__cfg, opened:window.__opened, rendered:document.querySelector('#slot a')?.textContent }));
  assert.equal(result.opened.length, 1);
  assert(result.cfg.links[0].lastCheckedAt);
  assert.equal(result.cfg.links[0].lastCheckStatus, 'manual-open');
  assert.equal(result.rendered, longLabel);
  fs.writeFileSync(OUT, JSON.stringify({passed:true, diagnostics, opened:result.opened, lastCheckedAt:result.cfg.links[0].lastCheckedAt, longLabelPreserved:result.rendered.length}, null, 2) + '\n');
  console.log('PASS useful links diagnostics, manual control and long labels');
  await browser.close();
})().catch(error => {
  fs.writeFileSync(OUT, JSON.stringify({passed:false,error:error.stack}, null, 2) + '\n');
  console.error(error); process.exit(1);
});
