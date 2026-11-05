/**
 * Parcours professionnel du plan KTD.
 * Ouvre chaque écran et chaque module. N'enregistre rien et ne change aucun réglage.
 * Sur cette base sans document PMK, chaque module reste éteint.
 * Aucune requête ne part vers un hôte interdit par la politique du dépôt.
 */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.PMK_KOHA_TEST_URL || 'http://127.0.0.1:18081';
if (new URL(BASE).hostname !== '127.0.0.1') throw new Error('Instance locale exigée');
const chrome = process.env.PMK_CHROMIUM_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const legacy = new Set(['waiting-holds-age', 'patron-age-display', 'loan-duration-detail']);
const routes = [
  ['home', 'mainpage.pl'],
  ['circulation', 'circ/circulation-home.pl'],
  ['patrons', 'members/members-home.pl'],
  ['reports', 'reports/reports-home.pl'],
  ['tools', 'tools/tools-home.pl'],
  ['administration', 'admin/admin-home.pl'],
  ['detail', 'catalogue/detail.pl?biblionumber=1'],
  ['items-detail', 'catalogue/moredetail.pl?biblionumber=1&itemnumber=1'],
  ['search', 'catalogue/search.pl?q=a'],
  ['patron-detail', 'members/moremember.pl?borrowernumber=1'],
  ['checkout', 'circ/circulation.pl?borrowernumber=1'],
  ['returns', 'circ/returns.pl'],
  ['renew', 'circ/renew.pl'],
  ['branchtransfers', 'circ/branchtransfers.pl'],
  ['waiting-holds', 'circ/waitingreserves.pl'],
  ['holds', 'reserve/request.pl?biblionumber=1'],
  ['patron-entry', 'members/memberentry.pl?op=add_form&categorycode=S'],
  ['cataloguing', 'cataloguing/addbiblio.pl?biblionumber=1'],
  ['item-entry', 'cataloguing/additem.pl?biblionumber=1'],
  ['batchmod', 'tools/batchMod.pl'],
  ['saved-reports', 'reports/guided_reports.pl?op=list'],
  ['sql-editor', 'reports/guided_reports.pl?op=add_form_sql'],
  ['reading-record', 'members/readingrec.pl?borrowernumber=1'],
  ['loan-history', 'catalogue/issuehistory.pl?biblionumber=1'],
  ['journal', 'tools/viewlog.pl?do_it=1&modules=CATALOGUING&object=1'],
  ['suggestions', 'suggestion/suggestion.pl?op=add_form'],
  ['authorities-home', 'authorities/authorities-home.pl'],
  ['hub', 'mainpage.pl?pmk_page=hub'],
];
const skipped = [
  {id: 'subscription', reason: 'Aucun abonnement dans la base de démonstration'},
  {id: 'serial-claims', reason: 'Aucun fournisseur dans la base de démonstration'},
  {id: 'shelf', reason: 'Aucune liste dans la base de démonstration'},
  {id: 'external-providers', reason: 'France Publications, Electre, EmailJS et NEDAP restent des services facultatifs non contactés'},
];
const filter = new Set((process.env.PMK_TEST_FILTER || '').split(',').map(item => item.trim()).filter(Boolean));
const selected = value => !filter.size || [...filter].some(item => value.includes(item));

(async () => {
  const browser = await chromium.launch({executablePath: chrome, headless: true, args: ['--no-sandbox']});
  const context = await browser.newContext({locale: 'fr-FR'});
  const writes = [];
  const blocked = [];
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== BASE) {
      blocked.push(url.href);
      return route.abort();
    }
    if (['PUT', 'POST', 'DELETE', 'PATCH'].includes(request.method()) && url.pathname.includes('/contrib/pmk/') && !url.pathname.includes('/static/')) {
      writes.push(request.method() + ' ' + url.pathname);
    }
    return route.continue();
  });
  const page = await context.newPage();
  const dialogs = [];
  const pageErrors = [];
  const httpErrors = [];
  page.on('pageerror', error => pageErrors.push({message: error.message, stack: (error.stack || '').split('\n').slice(0, 6)}));
  page.on('response', response => { if (response.status() >= 400) httpErrors.push(response.status() + ' ' + response.url()); });
  page.on('dialog', dialog => { dialogs.push(dialog.message()); return dialog.dismiss(); });
  page.setDefaultTimeout(30000);

  async function ready() {
    await page.waitForFunction(() => window.PMKPlugin && (window.PMKPlugin.ready || (window.PMKPlugin.errors && window.PMKPlugin.errors.length)), null, {timeout: 90000});
  }

  await page.goto(BASE + '/cgi-bin/koha/mainpage.pl', {waitUntil: 'domcontentloaded', timeout: 90000});
  const staffUser = process.env.PMK_KOHA_USER;
  const staffSecret = process.env.PMK_KOHA_PASSWORD;
  if (!staffUser || !staffSecret) throw new Error('Définissez PMK_KOHA_USER et PMK_KOHA_PASSWORD pour le compte professionnel de la Koha locale.');
  await page.locator('input[name="login_userid"]').fill(staffUser);
  await page.locator('input[name="login_password"]').fill(staffSecret);
  const branch = page.locator('select[name="branch"]');
  if (await branch.count()) await branch.selectOption('CPL');
  await page.locator('#loginform, form').first().evaluate(form => form.requestSubmit());
  await ready();

  const rows = [];
  for (const [id, route] of routes) {
    if (!selected(`${id} ${route}`)) continue;
    const from = pageErrors.length;
    const fromHttp = httpErrors.length;
    await page.goto(BASE + '/cgi-bin/koha/' + route, {waitUntil: 'domcontentloaded', timeout: 90000});
    await ready();
    const state = await page.evaluate(() => ({
      title: document.title,
      ready: !!window.PMKPlugin.ready,
      loaded: window.PMKPlugin.loaded.length,
      errors: window.PMKPlugin.errors.slice(),
    }));
    const row = {...state, id, route, pageErrors: pageErrors.slice(from), httpErrors: httpErrors.slice(fromHttp)};
    rows.push(row);
    console.log(`${id}: ${state.loaded} scripts, ${state.errors.length} erreurs`);
  }

  await page.goto(BASE + '/cgi-bin/koha/mainpage.pl', {waitUntil: 'domcontentloaded', timeout: 90000});
  await ready();
  const ids = await page.evaluate(() => window.PMKConfig.listModules().map(module => module.id));
  const modules = [];
  for (const id of ids) {
    if (!selected(id)) continue;
    const row = await page.evaluate(async moduleId => {
      const opened = await window.PMKConfig.openAdmin(moduleId);
      const title = document.querySelector('#pmk-config-title');
      const danger = document.querySelector('#pmk-config-overlay .alert-danger');
      let enabled = null;
      let readError = null;
      try {
        const config = await window.PMKConfig.getConfig(moduleId);
        enabled = config && Object.prototype.hasOwnProperty.call(config, 'enabled') ? config.enabled : null;
      } catch (error) {
        readError = error.message;
      }
      document.querySelector('.pmk-config-close')?.click();
      return {
        id: moduleId,
        opened: !!opened,
        heading: title ? title.textContent.trim().slice(0, 140) : '',
        danger: danger ? danger.textContent.trim().slice(0, 200) : '',
        enabled,
        workflow: document.querySelectorAll('.pmk-workflow-select').length,
        readError,
        errors: window.PMKPlugin.errors.slice(),
      };
    }, id);
    modules.push(row);
    console.log(`module ${id}: ouvert=${row.opened} enabled=${row.enabled}`);
  }

  const correction = modules.find(module => module.id === 'checkout-status-correction');
  const failures = [];
  const pluginPageError = entry => /\/contrib\/pmk\/|pmk-autoload|PimpMyKoha/.test([entry.message, ...(entry.stack || [])].join('\n'));
  for (const row of rows) {
    if (!row.ready || row.loaded !== 111 || row.errors.length) failures.push('écran ' + row.id);
    if (row.pageErrors.some(pluginPageError)) failures.push('erreur plugin ' + row.id);
  }
  for (const row of modules) {
    if (!row.opened || row.danger || row.readError || row.errors.length || !row.heading) failures.push('module ' + row.id);
  }
  if (correction && correction.enabled !== false) failures.push('checkout-status-correction doit rester désactivé');
  if (!filter.size && !correction) failures.push('checkout-status-correction absent du parcours');
  const enabledOn = modules.filter(module => module.enabled !== false);
  if (!filter.size && enabledOn.length) failures.push('modules actifs sur une installation neuve: ' + enabledOn.map(module => module.id).join(', '));
  if (modules.some(module => module.workflow)) failures.push('liste de migration encore affichée');
  if (blocked.some(url => /dracenie\.(com|fr)/i.test(url))) failures.push('requête vers un hôte Dracénie');
  const configWrites = writes.filter(item => /\/documents(?:\/|$)|\/runtime(?:\/|$)/.test(item));
  const activity = writes.filter(item => !configWrites.includes(item));
  if (activity.some(url => /\/contrib\/pmk\/data\//.test(url))) failures.push('écriture métier alors que les modules sont éteints');
  if (configWrites.length) failures.push('réglages écrits: ' + [...new Set(configWrites)].join(', '));
  const firebase = blocked.filter(url => /firebase|firestore|gstatic\.com\/firebasejs|identitytoolkit|securetoken/i.test(url));
  if (firebase.length) failures.push('appel Firebase');
  if (dialogs.length) failures.push('dialogue inattendu');

  const report = {
    passed: failures.length === 0,
    failures,
    writes: [...new Set(configWrites)],
    moduleActivity: [...new Set(activity)],
    kohaInlineErrors: rows.flatMap(row => row.pageErrors.filter(entry => !pluginPageError(entry)).map(entry => ({screen: row.id, message: entry.message}))),
    dialogs,
    firebase,
    blocked: [...new Set(blocked)].slice(0, 40),
    skipped,
    legacyAliases: [...legacy],
    screens: rows.length,
    modules: modules.length,
    rows,
    moduleRows: modules,
  };
  const reportName = filter.size ? 'ktd-staff-filter.json' : 'ktd-staff.json';
  fs.writeFileSync(path.join(__dirname, 'validation', reportName), JSON.stringify(report, null, 2) + '\n');
  console.log(report.passed ? 'PASS parcours professionnel' : 'FAIL ' + failures.join(' | '));
  await browser.close();
  process.exit(report.passed ? 0 : 1);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
