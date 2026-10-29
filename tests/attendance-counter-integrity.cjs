const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tests/validation/attendance-counter-integrity.json');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PMK_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ locale: 'fr-FR' });
  await page.addInitScript(() => {
    window.__pmkNow = Date.parse('2026-01-01T12:00:00Z');
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [window.__pmkNow])); }
      static now() { return window.__pmkNow; }
      static parse(value) { return NativeDate.parse(value); }
      static UTC(...args) { return NativeDate.UTC(...args); }
    };
  });
  await page.route('http://pmk.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
  await page.goto('http://pmk.test/cgi-bin/koha/mainpage.pl?pmk_page=test');
  await page.evaluate(() => {
    const config = { enabled: true, miniEnabled: true, pageEnabled: true, autoOpen: false, countsCollection: 'counts', locationsCollection: 'locations' };
    window.PMKConfig = { registerModule() {}, subscribe(_id, cb) { cb(config); }, getConfig() { return Promise.resolve(config); }, isKohaSuperlibrarian() { return false; } };
    const empty = { forEach() {} };
    window.PMKNativeData = {
      collection(_db, name) { return { name }; },
      addDoc() {}, updateDoc() {},
      getDocs(ref) { return Promise.resolve(ref.name === 'locations' ? { forEach(cb) { cb({ id: 'hall', data: () => ({ name: 'Hall' }) }); } } : empty); },
      doc(_db, collection, id) { return { collection, id }; },
      serverTimestamp() { return new Date().toISOString(); },
      query(ref) { return ref; }, where() { return {}; },
      runTransaction() { throw new Error('test transaction supplied explicitly'); },
      createDatabase(name) { return { name }; },
      getSession() { return Promise.resolve({ uid: 'koha-agent' }); }
    };
  });
  await page.addScriptTag({ path: path.join(ROOT, '139-attendance-mediabus.js') });
  await page.evaluate(() => PMKAttendance.open());
  await page.locator('#freq-inputDateMini').waitFor();
  assert.equal(await page.locator('#freq-inputDateMini').inputValue(), '2026-01-01');
  await page.evaluate(() => { window.__pmkNow = Date.parse('2026-01-02T00:01:00Z'); window.dispatchEvent(new Event('focus')); });
  await page.waitForFunction(() => document.querySelector('#freq-inputDateMini')?.value === '2026-01-02');

  const transaction = await page.evaluate(async () => {
    let stored = {};
    let serial = Promise.resolve();
    const deps = {
      db: {}, configuration: PMKAttendance.getConfig(),
      doc(_db, collection, id) { return { collection, id }; },
      serverTimestamp() { return 'server-time'; },
      runTransaction(_db, callback) {
        const result = serial.then(() => callback({
          get: async () => ({ exists: () => Object.keys(stored).length > 0, data: () => structuredClone(stored) }),
          set: (_ref, payload) => { stored = structuredClone(payload); }
        }));
        serial = result.then(() => undefined, () => undefined);
        return result;
      }
    };
    const base = { type: 'adults', delta: 1, locationId: 'hall', date: '2026-01-02', userId: 'agent' };
    await Promise.all([PMKAttendance.mutate(deps, base), PMKAttendance.mutate(deps, base)]);
    let refused = '';
    try { await PMKAttendance.mutate(deps, { type: 'correction', locationId: 'hall', date: '2026-01-02', userId: 'agent', additions: { adults: 1, kids: 0, timestamp: '2026-01-02T10:00:00Z' } }); } catch (error) { refused = error.message; }
    await PMKAttendance.mutate(deps, { type: 'correction', locationId: 'hall', date: '2026-01-02', userId: 'agent', reason: 'Saisie différée après fermeture', additions: { adults: 1, kids: 0, timestamp: '2026-01-02T10:00:00Z' } });
    return { stored, refused };
  });
  assert.equal(transaction.stored.adults, 3, 'two concurrent clicks and one correction must all be retained');
  assert.match(transaction.refused, /justification/i);
  assert.equal(transaction.stored.lastCorrection.reason, 'Saisie différée après fermeture');
  assert.equal(transaction.stored.correctionLog.length, 1);
  const evidence = { passed: true, newDay: await page.locator('#freq-inputDateMini').inputValue(), concurrentCount: transaction.stored.adults, correction: transaction.stored.lastCorrection, refusedWithoutReason: transaction.refused };
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2) + '\n');
  console.log('PASS attendance counter transactions, justified corrections and day rollover');
  await browser.close();
})().catch(error => {
  fs.writeFileSync(OUT, JSON.stringify({ passed: false, error: error.stack }, null, 2) + '\n');
  console.error(error);
  process.exitCode = 1;
});
