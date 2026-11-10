const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('vm');

const config = {
  enabled: true, miniEnabled: true, pageEnabled: true, autoOpen: false,
  countsCollection: 'counts', locationsCollection: 'locations', step: 1, branchNames: ''
};
global.window = global;
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.location = { search: '?pmk_page=test', pathname: '/cgi-bin/koha/mainpage.pl' };
global.CustomEvent = class CustomEvent {
  constructor(type, init) { this.type = type; this.detail = init && init.detail; }
};
global.NodeFilter = { SHOW_TEXT: 4 };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.document = {
  readyState: 'complete', hidden: false,
  addEventListener() {}, removeEventListener() {},
  dispatchEvent() { return true; },
  getElementById() { return null; },
  querySelector() { return null; },
  createElement() { return { style: {}, appendChild() {} }; },
  head: { appendChild() {} },
  body: { appendChild() {} }
};
global.PMKConfig = {
  registerModule() {},
  subscribe(_id, callback) { callback(config); return () => {}; },
  getConfig() { return Promise.resolve(config); },
  isKohaSuperlibrarian() { return false; }
};

vm.runInThisContext(fs.readFileSync('c:/Users/la_lo/Desktop/PMK/139-attendance-mediabus.js', 'utf8'), { filename: '139-attendance-mediabus.js' });

(async () => {
  const docs = new Map();
  let serial = Promise.resolve();
  let conflictsLeft = 2;
  const deps = {
    db: {}, configuration: PMKAttendance.getConfig(),
    collection() { return { name: 'counts' }; },
    doc(_db, _collection, id) { return { id }; },
    serverTimestamp() { return 'server-time'; },
    getDocs() {
      return { forEach(callback) { docs.forEach((data, id) => callback({ id, data: () => structuredClone(data) })); } };
    },
    runTransaction(_db, callback) {
      const result = serial.then(async () => {
        if (conflictsLeft > 0) {
          conflictsLeft -= 1;
          const error = new Error('data_changed');
          error.status = 409;
          throw error;
        }
        const writes = [];
        const tx = {
          async get(ref) {
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
  assert.equal(afterUndo.adults, 1);
  assert.deepEqual(afterUndo.adultTimestamps, [earlier]);
  await assert.rejects(
    PMKAttendance.mutate(deps, Object.assign({ type: 'correction', reason: 'Mauvaise journée', additions: { adults: 1, kids: 0, timestamp: '1999-01-01T10:00:00.000Z' } }, base)),
    /Heure de correction invalide/
  );
  docs.set('hall__' + date, { locationId: 'other', date, adults: 5, kids: 0, adultTimestamps: [], kidTimestamps: [] });
  await PMKAttendance.mutate(deps, Object.assign({ type: 'adults', delta: 1 }, base));
  assert.equal(docs.get('hall__' + date).adults, 5);
  assert.equal(docs.get('hall__' + date + '__suite').adults, 1);
  const moved = await PMKAttendance.moveCounts(deps, { fromLocationId: 'hall', toLocationId: 'desk', fromDate: date, toDate: date, userId: 'agent' });
  assert.equal(moved, 1);
  assert.equal(docs.get('desk__' + date).adults, 1);
  assert.equal(docs.get('desk__' + date).locationId, 'desk');
  assert.equal(docs.has('hall__' + date + '__suite'), false);
  assert.equal(docs.get('hall__' + date).locationId, 'other');
  await PMKAttendance.mutate(deps, Object.assign({ type: 'adults', delta: 1 }, base));
  assert.equal(docs.get('hall__' + date + '__suite').adults, 1);
  assert.equal(docs.get('hall__' + date).adults, 5);
  console.log('PASS attendance concurrency and corrections');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
