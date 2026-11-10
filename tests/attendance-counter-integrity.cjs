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

  const conflicts = await page.evaluate(async () => {
    const docs = new Map();
    let serial = Promise.resolve();
    let conflictsLeft = 2;
    const deps = {
      db: {}, configuration: PMKAttendance.getConfig(),
      collection() { return { name: 'counts' }; },
      doc(_db, _collection, id) { return { id }; },
      serverTimestamp() { return 'server-time'; },
      getDocs() {
        return { forEach(cb) { docs.forEach((data, id) => cb({ id, data: () => structuredClone(data) })); } };
      },
      runTransaction(_db, callback) {
        const result = serial.then(async () => {
          if (conflictsLeft > 0) { conflictsLeft -= 1; const error = new Error('data_changed'); error.status = 409; throw error; }
          const reads = new Map();
          const writes = [];
          const tx = {
            async get(ref) {
              const row = docs.get(ref.id);
              reads.set(ref.id, row ? structuredClone(row) : null);
              return { exists: () => docs.has(ref.id), data: () => structuredClone(docs.get(ref.id) || {}) };
            },
            set(ref, payload) { writes.push(['set', ref.id, structuredClone(payload)]); },
            delete(ref) { writes.push(['delete', ref.id]); }
          };
          const value = await callback(tx);
          writes.forEach(([op, id, payload]) => { if (op === 'delete') docs.delete(id); else docs.set(id, payload); });
          return value;
        });
        serial = result.then(() => undefined, () => undefined);
        return result;
      }
    };
    const now = new Date();
    const date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const earlier = new Date(now.getTime() - 60 * 1000).toISOString();
    const base = { locationId: 'hall', date, userId: 'agent' };
    await PMKAttendance.mutate(deps, Object.assign({ type: 'correction', reason: 'Ouverture oubliée', additions: { adults: 1, kids: 0, timestamp: earlier } }, base));
    await PMKAttendance.mutate(deps, Object.assign({ type: 'adults', delta: 1 }, base));
    await PMKAttendance.mutate(deps, Object.assign({ type: 'adults', delta: -1 }, base));
    const afterUndo = docs.get('hall__' + date);
    let wrongDay = '';
    try {
      await PMKAttendance.mutate(deps, Object.assign({ type: 'correction', reason: 'Mauvaise journée', additions: { adults: 1, kids: 0, timestamp: '1999-01-01T10:00:00.000Z' } }, base));
    } catch (error) { wrongDay = error.message; }
    docs.set('hall__' + date, { locationId: 'other', date, adults: 5, kids: 0, adultTimestamps: [], kidTimestamps: [] });
    await PMKAttendance.mutate(deps, Object.assign({ type: 'adults', delta: 1 }, base));
    const moved = await PMKAttendance.moveCounts(deps, { fromLocationId: 'hall', toLocationId: 'desk', fromDate: date, toDate: date, userId: 'agent' });
    await PMKAttendance.mutate(deps, Object.assign({ type: 'adults', delta: 1 }, base));
    const ids = [...docs.keys()];
    return {
      keptCorrection: afterUndo.adults === 1 && afterUndo.adultTimestamps.length === 1 && afterUndo.adultTimestamps[0] === earlier,
      wrongDay,
      foreignUntouched: docs.get('hall__' + date).locationId === 'other' && docs.get('hall__' + date).adults === 5,
      suiteAdults: (docs.get('hall__' + date + '__suite') || {}).adults || 0,
      moved,
      desk: docs.get('desk__' + date) || null,
      hallAfterMove: docs.get('hall__' + date) || null
    };
  });
  assert.equal(conflicts.keptCorrection, true, 'undo removes the latest passage and keeps the earlier correction');
  assert.match(conflicts.wrongDay, /Heure de correction invalide/);
  assert.equal(conflicts.foreignUntouched, true);
  assert.equal(conflicts.moved, 1);
  assert.equal(conflicts.desk && conflicts.desk.adults, 1);
  assert.equal(conflicts.desk && conflicts.desk.locationId, 'desk');
  assert.equal(conflicts.hallAfterMove.adults, 5);
  assert.equal(conflicts.suiteAdults, 1);

  let calls = 0;
  await page.evaluate(async () => {
    const select = document.querySelector('#freq-selectLocationMini');
    select.value = 'hall';
    select.dispatchEvent(new Event('change'));
    document.querySelector('#freq-btnCorrectionMini').click();
    document.querySelector('#freq-correction-adult').click();
    document.querySelector('#freq-correction-reason').value = 'Saisie différée';
    document.querySelector('#freq-correction-reason').dispatchEvent(new Event('input'));
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    window.__pmkReleaseCorrection = release;
    const original = PMKAttendance.mutate;
    PMKAttendance.mutate = function () {
      window.__pmkCorrectionCalls = (window.__pmkCorrectionCalls || 0) + 1;
      return gate.then(() => original.apply(this, arguments));
    };
    const button = document.querySelector('#freq-correction-validate');
    button.click();
    button.click();
  });
  calls = await page.evaluate(() => window.__pmkCorrectionCalls || 0);
  await page.evaluate(() => window.__pmkReleaseCorrection());
  assert.equal(calls, 1, 'a double click on validate records one correction');
  const evidence = { passed: true, newDay: await page.locator('#freq-inputDateMini').inputValue(), concurrentCount: transaction.stored.adults, correction: transaction.stored.lastCorrection, refusedWithoutReason: transaction.refused };
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2) + '\n');
  await page.route('**/api/v1/libraries**', route => route.fulfill({contentType:'application/json', body:JSON.stringify([{library_id:'CPL',name:'Centre'},{library_id:'MED',name:'Médiathèque'}]), headers:{'x-total-count':'2'}}));
  const places = await page.evaluate(async () => {
    const deps = {db:{}, collection(_db, name){return {name}}, getDocs(){return {forEach(cb){cb({id:'hall', data:()=>({name:'Hall'})})}}}};
    const manual = await PMKAttendance.collectLocations(Object.assign({configuration:{locationSource:'manual', hiddenLocationIds:'', locationsCollection:'locations', defaultCountedWeeks:8}}, deps));
    const mix = await PMKAttendance.collectLocations(Object.assign({configuration:{locationSource:'mix', hiddenLocationIds:'koha:CPL', locationsCollection:'locations', defaultCountedWeeks:8}}, deps));
    const koha = await PMKAttendance.collectLocations(Object.assign({configuration:{locationSource:'koha', hiddenLocationIds:'', locationsCollection:'locations', defaultCountedWeeks:8}}, deps));
    return {manual:manual.locations.map(row=>row.id), mix:mix.locations.map(row=>row.id), koha:koha.locations.map(row=>row.id)};
  });
  assert.deepEqual(places.manual, ['hall']);
  assert.deepEqual(places.mix, ['hall', 'koha:MED']);
  assert.deepEqual(places.koha, ['koha:CPL', 'koha:MED']);
  console.log('PASS attendance counter transactions, justified corrections and day rollover');
  await browser.close();
})().catch(error => {
  fs.writeFileSync(OUT, JSON.stringify({ passed: false, error: error.stack }, null, 2) + '\n');
  console.error(error);
  process.exitCode = 1;
});
