const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tests/validation/item-quick-edit-concurrency.json');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PMK_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ locale: 'fr-FR' });
  let reads = 0;
  let writes = 0;
  await page.route('http://pmk.test/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/cgi-bin/koha/catalogue/detail.pl') {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body><table id="holdings_table"><thead><tr><th data-colname="itemnumber">N°</th><th data-colname="itemcallnumber">Cote</th></tr></thead><tbody><tr><td><input name="itemnumber" value="101"></td><td>ANCIENNE</td></tr></tbody></table></body></html>' });
    }
    if (url.pathname === '/api/v1/items/101') {
      if (request.method() === 'PUT') writes += 1;
      reads += 1;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ item_id: 101, biblio_id: 42, callnumber: reads === 1 ? 'ANCIENNE' : 'MODIFIÉE PAR UN AUTRE AGENT' }) });
    }
    if (request.method() === 'PUT') writes += 1;
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  await page.goto('http://pmk.test/cgi-bin/koha/catalogue/detail.pl?biblionumber=42');
  await page.evaluate(() => {
    const config = { enabled: true, field_callnumber: true };
    window.PMKConfig = {
      registerModule() {},
      subscribe(_id, callback) { callback(config); },
      getConfig() { return Promise.resolve(config); }
    };
  });
  await page.addScriptTag({ path: path.join(ROOT, '145-pmk-edition-rapide-exemplaires.js') });
  await page.getByRole('button', { name: 'Modifier Cote pour exemplaire 101' }).click();
  await page.locator('#pmk145-content .pmk145-input').fill('NOUVELLE');
  const preview = await page.locator('.pmk145-change-preview-active').innerText();
  assert.match(preview, /ANCIENNE.*NOUVELLE/s);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  const error = await page.locator('.pmk145-error-text').innerText();
  assert.match(error, /valeur a changé depuis l’ouverture/i);
  assert.equal(writes, 0, 'A concurrent change must prevent every write');
  const evidence = { passed: true, preview, conflict: error, writeRequests: writes, reads };
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2) + '\n');
  console.log('PASS item quick edit previews before/after and refuses a concurrent change');
  await browser.close();
})().catch(error => {
  fs.writeFileSync(OUT, JSON.stringify({ passed: false, error: error.stack }, null, 2) + '\n');
  console.error(error);
  process.exitCode = 1;
});
