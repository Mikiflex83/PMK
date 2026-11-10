/* Assistance réseau — alertes entre sites, stockage Koha, mises à jour immédiates.
   Aucun service externe. Les sites et les groupes se règlent dans PMK, comme le partage interne.
   Tant que le module est arrêté, ou que le site Koha ouvert n’est pas un site actif, rien n’est affiché.
*/
(function (W, D) {
    'use strict';
    if (W.PMKAssistance150) return;
    const ID = 'assistance-reseau';
    const tr = (fr, en) => ({ fr: fr, en: en });
    const OPEN = 'Lancée';
    const TAKEN = 'Prise en Charge';
    const CLOSED = 'Clôturée';
    const defaults = {
        enabled: false,
        sites: [],
        groups: [],
        routing: { mode: 'group' },
        sitesMode: 'koha',
        locations: [],
        category: '',
        manualIntervenants: [],
        userCacheHours: 12,
        siteCacheHours: 24,
        historyHours: 12,
        limit: 50,
        backgroundGrace: 120,
        visibilityPolicy: 'keep',
        sound: true,
        blocking: true,
        board: true,
        buttonSelector: '',
        rememberPhone: false,
        soundURL: '',
        debug: false
    };
    let cfg = clone(defaults);
    let currentSite = null;
    let generation = 0;
    let stopListen = null;
    let keepTimer = null;
    let hiddenTimer = null;
    let items = new Map();
    let seen = new Set();
    let connected = false;
    let warned = false;
    let lastError = '';
    const ignored = new Set(readJson('pmk150_ignored', []));
    let sessionKey = localStorage.getItem('pmk150_own_key') || '';

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
    function norm(value) { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
    function readJson(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key) || ''); return v == null ? fallback : v; } catch (e) { return fallback; } }
    function html(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
    function clamp(value, min, max, fallback) { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
    function names(list) {
        return (Array.isArray(list) ? list : []).map(item => clean(typeof item === 'string' ? item : item && item.name)).filter(Boolean);
    }
    function normalize(next) {
        const src = next && typeof next === 'object' ? next : {};
        const out = Object.assign({}, defaults, src);
        out.enabled = src.enabled !== false && src.enabled !== 0 ? !!src.enabled : false;
        if (src.enabled === undefined) out.enabled = false;
        out.routing = Object.assign({}, defaults.routing, src.routing || {});
        if (out.routing.mode !== 'all' && out.routing.mode !== 'group') out.routing.mode = 'group';
        out.sites = Array.isArray(src.sites) ? src.sites.map(site => Object.assign({ enabled: true, canSend: true, canReceive: true }, site || {})) : [];
        out.groups = Array.isArray(src.groups) ? src.groups.map(group => Object.assign({ enabled: true }, group || {})) : [];
        out.locations = Array.isArray(src.locations) ? src.locations.filter(row => row && clean(row.id) && clean(row.nom)).map(row => ({ id: clean(row.id), nom: clean(row.nom), tel: clean(row.tel) })) : [];
        out.manualIntervenants = names(src.manualIntervenants);
        out.sitesMode = ['koha', 'combined', 'custom'].includes(src.sitesMode) ? src.sitesMode : 'koha';
        out.category = clean(src.category);
        out.historyHours = clamp(src.historyHours, 1, 48, 12);
        out.limit = clamp(src.limit, 10, 100, 50);
        out.backgroundGrace = clamp(src.backgroundGrace, 30, 3600, 120);
        out.userCacheHours = clamp(src.userCacheHours, 1, 168, 12);
        out.siteCacheHours = clamp(src.siteCacheHours, 1, 168, 24);
        out.visibilityPolicy = src.visibilityPolicy === 'sleep' ? 'sleep' : 'keep';
        out.buttonSelector = clean(src.buttonSelector);
        out.soundURL = clean(src.soundURL);
        out.sound = src.sound !== false;
        out.blocking = src.blocking !== false;
        out.board = src.board !== false;
        out.rememberPhone = !!src.rememberPhone;
        out.debug = !!src.debug;
        return out;
    }
    function listedSiteIds(group) { return String(group && group.siteIds || '').split(/[\s,;]+/).map(clean).filter(Boolean); }
    function groupsContainingSite(site) {
        if (!site) return [];
        const id = norm(site.id);
        return (cfg.groups || []).filter(group => group && group.enabled !== false && clean(group.id) && listedSiteIds(group).some(siteId => norm(siteId) === id));
    }
    function branchInfo() {
        let name = '';
        let code = '';
        const nameEl = D.querySelector('.logged-in-branch-name, #logged-in-info-full .logged-in-branch-name');
        if (nameEl) name = clean(nameEl.textContent);
        const codeEl = D.querySelector('.logged-in-branch-code, [data-branchcode], [data-branch-code]');
        if (codeEl) code = clean(codeEl.getAttribute('data-branchcode') || codeEl.getAttribute('data-branch-code') || codeEl.textContent);
        return { name: name, code: code };
    }
    function resolveSite(info) {
        if (!info) return null;
        const nName = norm(info.name);
        const nCode = norm(info.code);
        return (cfg.sites || []).find(site => {
            if (!site || site.enabled === false) return false;
            const siteNames = [site.matchName, site.labelFr, site.labelEn].filter(Boolean).map(norm);
            const codes = [site.matchCode, site.id].filter(Boolean).map(norm);
            return (!!nName && siteNames.indexOf(nName) !== -1) || (!!nCode && codes.indexOf(nCode) !== -1);
        }) || null;
    }
    function waitForBranch(timeoutMs) {
        return new Promise(resolve => {
            const start = Date.now();
            const run = () => {
                const info = branchInfo();
                if (info.name || info.code || Date.now() - start >= timeoutMs) resolve(info);
                else setTimeout(run, 250);
            };
            run();
        });
    }
    function style() {
        if (D.getElementById('pmka150-css')) return;
        const el = D.createElement('style');
        el.id = 'pmka150-css';
        el.textContent = `
#koha-alertAppContainer{display:flex;justify-content:flex-end;align-items:center;gap:10px;text-align:right}
#koha-btnAlerteUrgence{background:#00426e;color:white;padding:5px 12px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:1em;display:inline-block;width:auto;white-space:nowrap;margin-top:4px}
#koha-btnAlerteUrgence:hover{transform:translateY(-2px)}
#pmka150-root{display:flex;align-items:center;gap:3px}
#pmka150-menu-item{margin-right:15px;display:flex;align-items:center}
.pmka150-toast{position:fixed;right:14px;top:16px;z-index:2147483645;background:white;color:#172b4d;border-left:5px solid;padding:13px;border-radius:8px;box-shadow:0 5px 22px #0003;max-width:min(450px,90vw)}
.pmka150-cover{position:fixed;inset:0;background:#101828b8;z-index:2147483640;display:flex;align-items:center;justify-content:center;padding:12px}
.pmka150-dialog{background:#fff;color:#1e293b;border-radius:12px;padding:20px;width:min(620px,100%);max-height:92vh;overflow:auto;box-shadow:0 16px 44px #0005;font:14px/1.5 Arial,sans-serif}
.pmka150-dialog h2{font-size:20px;margin:0 0 12px}.pmka150-dialog label{display:block;margin:9px 0 3px;font-weight:600}
.pmka150-dialog input:not([type=checkbox]),.pmka150-dialog select,.pmka150-dialog textarea{width:100%;padding:8px;border:1px solid #94a3b8;border-radius:6px;box-sizing:border-box}
.pmka150-actions{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end;margin-top:16px}
.pmka150-action{cursor:pointer;padding:8px 11px;border:1px solid #64748b;border-radius:6px;background:#f1f5f9;color:#172b4d}
.pmka150-primary{background:#00426e!important;color:#fff!important}.pmka150-danger{background:#b42318!important;color:#fff!important}
.pmka150-board{position:fixed;bottom:20px;right:20px;width:min(350px,calc(100vw - 24px));max-height:500px;overflow-y:auto;background:#fff;border:2px solid #3498db;border-radius:10px;box-shadow:0 6px 20px #0002;z-index:1000;padding:15px;color:#2c3e50;font:13px 'Segoe UI',Tahoma,Arial,sans-serif}
.pmka150-entry{padding:9px 0;border-top:1px solid #e2e8f0}.pmka150-entry button{margin:3px}.pmka150-subtle{font-size:12px;color:#64748b}
.pmka150-row{display:flex;gap:12px;align-items:center;justify-content:space-between}
.pmka150-alert{border:4px solid #e74c3c;animation:pmka150-pulse 1s 3 alternate}
.pmka150-alert h2{color:#e74c3c;text-align:center;background:#fdedec;border:2px solid #e74c3c;border-radius:8px;padding:10px}
@keyframes pmka150-pulse{from{box-shadow:0 0 10px #c0392b}to{box-shadow:0 0 25px #e74c3c}}
.pmka150-test-row{display:flex;gap:6px;margin-top:12px;border-top:1px dashed #ddd;padding-top:8px}.pmka150-test-row button{font-size:11px;opacity:.75;padding:4px 7px}
.pmka150-alert-header{font-weight:bold;text-align:center;background:#fdedec;border:2px solid #e74c3c;padding:9px;border-radius:8px;color:#c0392b}
.pmka150-location,.pmka150-phone,.pmka150-reason{padding:12px;margin:12px 0;border-radius:8px;text-align:center}
.pmka150-location{background:#eafaf1;border:2px solid #2ecc71}.pmka150-phone{background:#e8f4fd;border:2px solid #3498db}.pmka150-reason{background:#fff9e6;border-left:4px solid #f39c12}
.pmka150-location span,.pmka150-phone span{display:block;font-size:19px;font-weight:bold}.pmka150-phone span{color:#e74c3c}.pmka150-phone em{display:block;font-size:12px}
.pmka150-options{max-height:200px;overflow:auto;border:1px solid #ccc;background:#fff}
.pmka150-option{display:block!important;width:100%;text-align:left;border:0!important;border-bottom:1px solid #ddd!important;background:white!important;padding:9px!important;color:#172b4d!important}
.pmka150-option:hover{background:#e8f4fd!important}
.pmka150-diagnostics{background:#f1f5f9;border-radius:8px;padding:10px;font-size:12px;white-space:pre-wrap}
@media(max-width:991.98px){#koha-btnAlerteUrgence{max-width:100%;white-space:normal!important}#koha-alertAppContainer{min-width:0;max-width:100%}}
`;
        D.head.append(el);
    }
    function notify(message, error) {
        const el = D.createElement('div');
        el.className = 'pmka150-toast';
        el.textContent = message;
        el.style.borderLeftColor = error ? '#b42318' : '#16734e';
        D.body.append(el);
        setTimeout(() => el.remove(), 5500);
        if (error) lastError = message;
    }
    function modal(title, build, urgent) {
        const cover = D.createElement('div');
        cover.className = 'pmka150-cover';
        const box = D.createElement('div');
        box.className = 'pmka150-dialog' + (urgent ? ' pmka150-alert' : '');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        const h = D.createElement('h2');
        h.textContent = title;
        box.append(h);
        cover.append(box);
        D.body.append(cover);
        const close = () => cover.remove();
        build(box, close);
        if (!urgent) cover.addEventListener('click', event => { if (event.target === cover) close(); });
        return { cover: cover, close: close };
    }
    function addButton(parent, label, action, cls) {
        const button = D.createElement('button');
        button.type = 'button';
        button.className = 'pmka150-action ' + (cls || '');
        button.textContent = label;
        button.addEventListener('click', action);
        parent.append(button);
        return button;
    }
    function field(parent, label, type, value) {
        const l = D.createElement('label');
        l.textContent = label;
        const input = D.createElement(type === 'textarea' ? 'textarea' : 'input');
        if (type !== 'textarea') input.type = type;
        input.value = value == null ? '' : value;
        parent.append(l, input);
        return input;
    }
    function searchable(parent, label, entries, placeholder) {
        const wrap = D.createElement('div');
        const input = field(wrap, label, 'text', '');
        input.placeholder = placeholder || 'Tapez pour rechercher…';
        input.autocomplete = 'off';
        let selected = '';
        const list = D.createElement('div');
        list.className = 'pmka150-options';
        list.hidden = true;
        wrap.append(list);
        parent.append(wrap);
        const redraw = () => {
            list.replaceChildren();
            selected = '';
            const term = norm(input.value);
            if (!term) { list.hidden = true; return; }
            const filtered = entries.filter(entry => norm(entry.label).includes(term)).slice(0, 50);
            filtered.forEach(opt => {
                const button = addButton(list, opt.label, () => {
                    selected = opt.value;
                    input.value = opt.label;
                    list.hidden = true;
                    input.dispatchEvent(new Event('pmka150:selected'));
                });
                button.className = 'pmka150-option';
            });
            list.hidden = !filtered.length;
        };
        input.addEventListener('input', redraw);
        input.addEventListener('focus', () => { if (input.value.trim()) redraw(); });
        return {
            get value() { return selected; },
            select(value) {
                const opt = entries.find(entry => entry.value === value);
                if (!opt) return;
                selected = value;
                input.value = opt.label;
                list.hidden = true;
            },
            input: input
        };
    }
    function cacheGet(key, ttl) {
        try {
            const row = JSON.parse(sessionStorage.getItem('pmka150_' + key) || 'null');
            if (row && Date.now() - row.t < ttl) return row.data;
        } catch (e) {}
        return null;
    }
    function cacheSet(key, data) {
        try { sessionStorage.setItem('pmka150_' + key, JSON.stringify({ t: Date.now(), data: data })); } catch (e) {}
    }
    async function apiPage(path, params, page) {
        const url = new URL('/api/v1/' + path, W.location.origin);
        url.searchParams.set('_page', page);
        url.searchParams.set('_per_page', '100');
        Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
        const response = await fetch(url.toString(), { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Koha API ' + response.status + ' (' + path + ')');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Réponse Koha invalide');
        return data;
    }
    async function apiAll(path, params, maxPages) {
        const result = [];
        const cap = maxPages || 30;
        for (let i = 1; i <= cap; i++) {
            const page = await apiPage(path, params, i);
            result.push.apply(result, page);
            if (page.length < 100) break;
            if (i === cap) throw new Error('Liste incomplète : limite de pagination atteinte');
        }
        return result;
    }
    async function getPatrons(force) {
        if (!cfg.category) return [];
        const key = 'patrons_' + cfg.category;
        if (!force) { const cached = cacheGet(key, cfg.userCacheHours * 3600000); if (cached) return cached; }
        const patrons = await apiAll('patrons', { q: JSON.stringify({ category_id: cfg.category }) });
        const users = patrons.filter(p => p.category_id === cfg.category).map(p => ({
            id: String(p.patron_id),
            name: [p.firstname, p.surname].filter(Boolean).join(' ').trim(),
            library: p.library_id || ''
        })).filter(p => p.name).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        cacheSet(key, users);
        return users;
    }
    async function getSites(force) {
        if (!force) { const cached = cacheGet('sites', cfg.siteCacheHours * 3600000); if (cached) return cached; }
        const sites = (await apiAll('libraries', {}, 10)).map(row => ({ id: row.library_id, nom: row.name || row.library_id, tel: row.phone || '' }));
        cacheSet('sites', sites);
        return sites;
    }
    async function locations() {
        let koha = [];
        if (cfg.sitesMode !== 'custom') { try { koha = await getSites(); } catch (e) { lastError = e.message; } }
        const manual = cfg.sitesMode === 'koha' ? [] : cfg.locations;
        const map = new Map([].concat(koha, manual).map(row => [row.id, row]));
        return Array.from(map.values()).sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
    }
    function millis(value) {
        if (typeof value === 'number') return value;
        if (value && typeof value.toMillis === 'function') return value.toMillis();
        if (value && typeof value.seconds === 'number') return value.seconds * 1000;
        return 0;
    }
    function relevant(alert) { return millis(alert && alert.heure) >= Date.now() - cfg.historyHours * 3600000; }
    function audienceFor(site) {
        if (cfg.routing.mode === 'all') return { type: 'all', ids: [] };
        const groups = groupsContainingSite(site).map(group => group.id);
        if (!groups.length) return { type: 'site', ids: [site.id] };
        return { type: 'groups', ids: groups };
    }
    function canSee(alert, site) {
        const audience = alert && alert.audience || { type: 'all', ids: [] };
        if (audience.type === 'site') return (audience.ids || []).some(id => norm(id) === norm(site.id));
        if (audience.type === 'groups') {
            const mine = groupsContainingSite(site).map(group => norm(group.id));
            return (audience.ids || []).some(id => mine.indexOf(norm(id)) !== -1);
        }
        return true;
    }
    function visible(key, alert) {
        if (key === sessionKey) return true;
        if (!currentSite || currentSite.canReceive === false) return false;
        return canSee(alert, currentSite);
    }
    function audienceLabel() {
        if (!currentSite) return '';
        if (cfg.routing.mode === 'all') return 'tous les sites configurés qui reçoivent les alertes';
        const groups = groupsContainingSite(currentSite);
        if (!groups.length) return 'uniquement ce site';
        return 'les sites des groupes ' + groups.map(group => group.labelFr || group.id).join(', ');
    }
    function storage() {
        const api = W.PMKNativeData;
        if (!api) return null;
        const db = api.createDatabase('assistance');
        return { api: api, db: db, alerts: api.collection(db, 'alerts') };
    }
    function valid(alert) { return !!(alert && typeof alert === 'object' && alert.etat && alert.nom_emetteur); }
    function ignoreAlert(key) {
        ignored.add(key);
        localStorage.setItem('pmk150_ignored', JSON.stringify(Array.from(ignored).slice(-200)));
    }
    function closeAlert(key) {
        D.querySelectorAll('.pmka150-cover[data-alert]').forEach(node => { if (node.dataset.alert === key) node.remove(); });
    }
    function sound() {
        if (!cfg.sound) return;
        if (cfg.soundURL) {
            try { new Audio(cfg.soundURL).play().catch(() => beep()); } catch (e) { beep(); }
            return;
        }
        beep();
    }
    function beep() {
        try {
            const audio = new (W.AudioContext || W.webkitAudioContext)();
            const tone = audio.createOscillator();
            const gain = audio.createGain();
            tone.frequency.value = 880;
            tone.connect(gain);
            gain.connect(audio.destination);
            gain.gain.setValueAtTime(0.08, audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.35);
            tone.start();
            tone.stop(audio.currentTime + 0.35);
            setTimeout(() => audio.close(), 700);
        } catch (e) {}
    }
    async function intervenants(host) {
        host.textContent = 'Chargement des intervenants…';
        let users = [];
        let error = '';
        try { users = await getPatrons(); } catch (e) { error = e.message; }
        const manual = names(cfg.manualIntervenants).map(name => ({ id: name, name: name, library: '' }));
        const unique = new Map([].concat(users, manual).map(user => [user.name.toLowerCase(), user]));
        users = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        host.replaceChildren();
        if (error) {
            const info = D.createElement('div');
            info.className = 'pmka150-subtle';
            info.textContent = 'API Koha indisponible : ' + error + (manual.length ? ' — liste complémentaire disponible' : '');
            host.append(info);
        }
        if (!users.length) {
            host.append(D.createTextNode(cfg.category ? 'Aucun intervenant pour la catégorie ' + cfg.category + '.' : 'Indiquez une catégorie Koha ou des intervenants complémentaires.'));
            return { get value() { return ''; } };
        }
        return searchable(host, 'Je prends en charge (qui êtes-vous ?) :', users.map(user => ({ value: user.name, label: user.name + (user.library ? ' · ' + user.library : '') })));
    }
    function incoming(key, alert, isTest) {
        if (!cfg.blocking && !isTest) {
            notify('Assistance demandée : ' + alert.nom_emetteur);
            sound();
            return;
        }
        if (seen.has(key) && !isTest) return;
        if (!isTest) seen.add(key);
        sound();
        const view = modal('Alerte : assistance requise', (box, close) => {
            const loc = D.createElement('div');
            loc.className = 'pmka150-location';
            loc.innerHTML = '<strong>Lieu d’intervention :</strong><span>' + html(alert.nom_emetteur) + '</span>';
            const phone = D.createElement('div');
            phone.className = 'pmka150-phone';
            phone.innerHTML = '<strong>Contact direct :</strong><span>' + html(alert.tel_contact || 'Non renseigné') + '</span><em>Appelez immédiatement pour connaître la situation</em>';
            const reason = D.createElement('div');
            reason.className = 'pmka150-reason';
            reason.innerHTML = '<strong>Motif de l’alerte :</strong> ' + html(alert.motif || 'Pas de détails fournis');
            const holder = D.createElement('div');
            box.append(loc, phone, reason, holder);
            let selector = { get value() { return ''; } };
            if (isTest) selector = searchable(holder, 'Je prends en charge (test local) :', [{ value: 'Test local', label: 'Test local' }]);
            else intervenants(holder).then(found => { selector = found || selector; });
            const actions = D.createElement('div');
            actions.className = 'pmka150-actions';
            box.append(actions);
            addButton(actions, 'Ignorer (pas ma zone)', () => { if (!isTest) ignoreAlert(key); close(); });
            addButton(actions, 'Confirmer la prise en charge', async () => {
                if (isTest) { close(); notify('Test local terminé — aucune donnée transmise'); return; }
                const who = selector.value;
                if (!who) { notify('Veuillez sélectionner un intervenant.', true); return; }
                try { await writeUpdate(key, { etat: TAKEN, intervenant: who }); close(); notify('Prise en charge enregistrée'); }
                catch (e) { notify(e.message, true); }
            }, 'pmka150-primary');
        }, true);
        view.cover.dataset.alert = key;
    }
    function timeVal(alert) { const ms = millis(alert.heure); return ms ? new Date(ms).toLocaleString('fr-FR') : 'Date inconnue'; }
    function renderBoard() {
        const board = D.getElementById('pmka150-board');
        if (!board) return;
        board.replaceChildren();
        const active = Array.from(items.entries()).filter(([, alert]) => valid(alert) && relevant(alert) && (alert.etat === OPEN || alert.etat === TAKEN)).sort((a, b) => millis(b[1].heure) - millis(a[1].heure));
        board.hidden = !cfg.board || !active.length;
        if (board.hidden) return;
        const head = D.createElement('div');
        head.className = 'pmka150-row';
        const title = D.createElement('b');
        title.textContent = 'Demandes d’assistance (' + active.length + ')';
        head.append(title);
        addButton(head, '×', () => { board.hidden = true; });
        board.append(head);
        active.forEach(([key, alert]) => {
            const row = D.createElement('div');
            row.className = 'pmka150-entry';
            const name = D.createElement('div');
            name.textContent = alert.nom_emetteur + ' — ' + alert.etat;
            const small = D.createElement('div');
            small.className = 'pmka150-subtle';
            small.textContent = (alert.intervenant || alert.motif || '') + ' · ' + timeVal(alert);
            row.append(name, small);
            if (alert.etat === OPEN) addButton(row, 'Prendre en charge', async () => {
                try { const who = await choosePerson(); if (who) await writeUpdate(key, { etat: TAKEN, intervenant: who }); }
                catch (e) { notify(e.message, true); }
            });
            if (key === sessionKey) addButton(row, 'Clôturer', () => {
                if (!confirm('Clôturer cette demande ?')) return;
                writeUpdate(key, { etat: CLOSED, heure_cloture: Date.now() }).then(() => {
                    sessionKey = '';
                    localStorage.removeItem('pmk150_own_key');
                }).catch(e => notify(e.message, true));
            });
            board.append(row);
        });
    }
    function applyDocs(docs) {
        const next = new Map();
        docs.forEach(doc => {
            const data = doc.data();
            if (!valid(data) || !relevant(data) || !visible(doc.id, data)) return;
            data.heure = millis(data.heure);
            next.set(doc.id, data);
        });
        const rows = Array.from(next.entries()).sort((a, b) => b[1].heure - a[1].heure).slice(0, cfg.limit);
        const limited = new Map(rows);
        limited.forEach((data, key) => {
            const prev = items.get(key);
            if (!prev && data.etat === OPEN && key !== sessionKey && !ignored.has(key) && !seen.has(key) && currentSite && currentSite.canReceive !== false) incoming(key, data);
            if (prev && prev.etat === OPEN && data.etat !== OPEN) closeAlert(key);
        });
        items.forEach((data, key) => { if (!limited.has(key)) closeAlert(key); });
        items = limited;
        connected = true;
        renderBoard();
    }
    async function pull() {
        const store = storage();
        if (!store) return;
        const since = Date.now() - cfg.historyHours * 3600000;
        const snap = await store.api.getDocs(store.api.query(store.alerts, store.api.where('heure', '>=', since), store.api.orderBy('heure', 'desc'), store.api.limit(cfg.limit)));
        applyDocs(snap.docs);
    }
    function connect() {
        const store = storage();
        if (!store || stopListen) return;
        const since = Date.now() - cfg.historyHours * 3600000;
        stopListen = store.api.onSnapshot(store.api.query(store.alerts, store.api.where('heure', '>=', since), store.api.orderBy('heure', 'desc'), store.api.limit(cfg.limit)), snap => applyDocs(snap.docs), error => { connected = false; lastError = error.message; });
        connected = true;
        if (cfg.visibilityPolicy === 'keep') keepTimer = setInterval(() => { if (D.hidden) pull().catch(e => { lastError = e.message; }); }, 4000);
    }
    function disconnect() {
        if (stopListen) { try { stopListen(); } catch (e) {} stopListen = null; }
        clearInterval(keepTimer);
        keepTimer = null;
        connected = false;
    }
    async function writeUpdate(key, data) {
        const store = storage();
        if (!store || !connected) throw new Error('Stockage Koha indisponible : action non transmise');
        await store.api.updateDoc(store.api.doc(store.alerts, key), data);
    }
    function choosePerson() {
        return new Promise(resolve => {
            getPatrons().then(users => {
                const manual = names(cfg.manualIntervenants).map(name => ({ id: name, name: name, library: '' }));
                const unique = new Map([].concat(users, manual).map(user => [user.name.toLowerCase(), user]));
                users = Array.from(unique.values());
                if (!users.length) { notify(cfg.category ? 'Aucun compte trouvé en catégorie ' + cfg.category : 'Aucun intervenant configuré', true); resolve(null); return; }
                modal('Choisir un intervenant', (box, close) => {
                    const picker = searchable(box, 'Intervenant', users.map(user => ({ value: user.name, label: user.name + (user.library ? ' · ' + user.library : '') })));
                    const actions = D.createElement('div');
                    actions.className = 'pmka150-actions';
                    box.append(actions);
                    addButton(actions, 'Annuler', () => { close(); resolve(null); });
                    addButton(actions, 'Confirmer', () => { close(); resolve(picker.value || null); }, 'pmka150-primary');
                });
            }).catch(e => { notify('API Koha : ' + e.message, true); resolve(null); });
        });
    }
    async function sendForm() {
        const places = await locations();
        modal('Lancer une demande d’assistance', (box, close) => {
            const header = D.createElement('div');
            header.className = 'pmka150-alert-header';
            header.textContent = 'Lancer une demande d’assistance';
            const intro = D.createElement('p');
            intro.innerHTML = '<strong>Identifiez votre poste</strong> et décrivez l’urgence (optionnel).';
            const note = D.createElement('div');
            note.className = 'pmka150-reason';
            note.textContent = 'Cette alerte sera visible par ' + audienceLabel() + '. Utilisez-la uniquement pour une assistance immédiate.';
            box.append(header, intro, note);
            const locationSelect = searchable(box, 'Poste / site :', places.map(place => ({ value: place.id, label: place.nom })));
            const previous = localStorage.getItem('pmk150_last_location');
            if (previous) locationSelect.select(previous);
            const remembered = cfg.rememberPhone ? (localStorage.getItem('pmk150_phone') || '') : '';
            const phone = field(box, 'Téléphone de contact', 'tel', remembered);
            phone.placeholder = 'Numéro du poste sélectionné';
            let manualPhone = !!phone.value;
            phone.addEventListener('input', () => { manualPhone = !!phone.value.trim(); });
            const applyPlace = () => {
                if (manualPhone) return;
                const place = places.find(row => row.id === locationSelect.value);
                phone.value = place && place.tel || '';
            };
            locationSelect.input.addEventListener('input', () => { if (!manualPhone) phone.value = ''; });
            locationSelect.input.addEventListener('pmka150:selected', applyPlace);
            if (previous) applyPlace();
            const motif = field(box, 'Motif de l’urgence (optionnel) :', 'text', '');
            motif.placeholder = 'Ex. : problème d’impression, usager en difficulté';
            const actions = D.createElement('div');
            actions.className = 'pmka150-actions';
            box.append(actions);
            addButton(actions, 'Annuler', close);
            const send = addButton(actions, 'Envoyer la demande', async () => {
                const place = places.find(row => row.id === locationSelect.value);
                if (!place) { notify('Sélectionnez votre poste dans la liste.', true); return; }
                const store = storage();
                if (!store || !connected) { notify('Alerte non transmise : stockage Koha indisponible', true); return; }
                send.disabled = true;
                const previousKey = sessionKey;
                try {
                    const ref = store.api.doc(store.alerts);
                    sessionKey = ref.id;
                    localStorage.setItem('pmk150_own_key', ref.id);
                    await store.api.setDoc(ref, {
                        site_id: place.id,
                        nom_emetteur: place.nom,
                        tel_contact: phone.value.trim() || place.tel || '',
                        motif: motif.value.trim() || 'Pas de détails fournis',
                        heure: Date.now(),
                        etat: OPEN,
                        intervenant: '',
                        senderSiteId: currentSite.id,
                        audience: audienceFor(currentSite)
                    });
                    localStorage.setItem('pmk150_last_location', place.id);
                    if (cfg.rememberPhone) localStorage.setItem('pmk150_phone', phone.value.trim());
                    else localStorage.removeItem('pmk150_phone');
                    close();
                    notify('Demande d’assistance envoyée.');
                } catch (e) {
                    sessionKey = previousKey;
                    if (previousKey) localStorage.setItem('pmk150_own_key', previousKey);
                    else localStorage.removeItem('pmk150_own_key');
                    notify('Alerte non transmise : ' + e.message, true);
                }
                finally { send.disabled = false; }
            }, 'pmka150-danger');
            const tests = D.createElement('div');
            tests.className = 'pmka150-test-row';
            box.append(tests);
            addButton(tests, 'Tester le stockage', () => { notify(connected ? 'Stockage Koha actif' : 'Stockage Koha indisponible', !connected); });
            addButton(tests, 'Tester l’alerte', () => {
                close();
                incoming('TEST_LOCAL_' + Date.now(), { nom_emetteur: 'TEST — Ce poste', tel_contact: phone.value || 'TEST', motif: 'Test local. Aucune alerte réelle n’a été envoyée.', etat: OPEN, heure: Date.now() }, true);
            });
        });
    }
    function removeUI() {
        D.getElementById('pmka150-css') && D.getElementById('pmka150-css').remove();
        D.getElementById('pmka150-root') && D.getElementById('pmka150-root').remove();
        D.getElementById('pmka150-menu-item') && D.getElementById('pmka150-menu-item').remove();
        D.getElementById('pmka150-board') && D.getElementById('pmka150-board').remove();
        D.querySelectorAll('.pmka150-cover').forEach(node => node.remove());
    }
    function createUI() {
        style();
        const old = D.getElementById('pmka150-root');
        if (old) old.remove();
        const root = D.createElement('span');
        root.id = 'pmka150-root';
        if (currentSite.canSend !== false) {
            const container = D.createElement('span');
            container.id = 'koha-alertAppContainer';
            const launch = D.createElement('button');
            launch.type = 'button';
            launch.id = 'koha-btnAlerteUrgence';
            launch.textContent = 'Assistance';
            launch.addEventListener('click', () => { sendForm().catch(e => notify(e.message, true)); });
            container.append(launch);
            root.append(container);
        }
        let host = null;
        try { host = cfg.buttonSelector ? D.querySelector(cfg.buttonSelector) : null; } catch (e) { host = null; }
        const userMenu = D.getElementById('user-menu');
        if (host) host.prepend(root);
        else if (userMenu) {
            let item = D.getElementById('pmka150-menu-item');
            if (!item) {
                item = D.createElement('li');
                item.id = 'pmka150-menu-item';
                item.className = 'nav-item';
                userMenu.insertBefore(item, userMenu.firstChild);
            }
            item.append(root);
        } else {
            (D.querySelector('#header_search') || D.querySelector('#main') || D.body).prepend(root);
            let attempts = 0;
            const move = () => {
                if (!root.isConnected || cfg.buttonSelector) return;
                const menu = D.getElementById('user-menu');
                if (menu) {
                    let item = D.getElementById('pmka150-menu-item');
                    if (!item) {
                        item = D.createElement('li');
                        item.id = 'pmka150-menu-item';
                        item.className = 'nav-item';
                        menu.insertBefore(item, menu.firstChild);
                    }
                    item.append(root);
                    return;
                }
                if (++attempts < 30) setTimeout(move, 1000);
            };
            setTimeout(move, 500);
        }
        const board = D.createElement('div');
        board.id = 'pmka150-board';
        board.className = 'pmka150-board';
        board.hidden = true;
        D.body.append(board);
        renderBoard();
    }
    function diagnostics() {
        modal('Diagnostic — Assistance réseau', (box, close) => {
            const pre = D.createElement('div');
            pre.className = 'pmka150-diagnostics';
            pre.textContent = JSON.stringify({
                connected: connected,
                site: currentSite && currentSite.id || '',
                routing: cfg.routing.mode,
                groups: groupsContainingSite(currentSite).map(group => group.id),
                active: items.size,
                lastError: lastError,
                storage: W.PMKNativeData ? 'koha' : 'absent'
            }, null, 2);
            const actions = D.createElement('div');
            actions.className = 'pmka150-actions';
            box.append(pre, actions);
            addButton(actions, 'Fermer', close);
        });
    }
    async function restart() {
        const token = ++generation;
        disconnect();
        clearTimeout(hiddenTimer);
        items = new Map();
        removeUI();
        if (!cfg.enabled) return;
        const info = await waitForBranch(8000);
        if (token !== generation) return;
        currentSite = resolveSite(info);
        if (!currentSite || !W.PMKNativeData) {
            if (currentSite && !W.PMKNativeData && !warned) {
                warned = true;
                console.warn('[PMK 150] Stockage Koha indisponible');
            }
            return;
        }
        createUI();
        connect();
    }
    function applyPMKConfig(next) {
        if (!next || typeof next !== 'object') return;
        cfg = normalize(next);
        restart();
    }
    function findLibrarySite(list, code) {
        const wanted = norm(code);
        return (list || []).find(site => site && (norm(site.matchCode) === wanted || norm(site.id) === wanted)) || null;
    }
    function librarySite(lib) {
        return { id: lib.id, enabled: true, labelFr: lib.nom, labelEn: lib.nom, matchName: lib.nom, matchCode: lib.id, canSend: true, canReceive: true };
    }
    function renderKohaSites(ctx) {
        const root = ctx && ctx.rootObject || {};
        const lang = ctx && ctx.language === 'en' ? 'en' : 'fr';
        const say = (fr, en) => lang === 'en' ? en : fr;
        const box = D.createElement('div');
        const status = D.createElement('p');
        status.textContent = say('Chargement des bibliothèques Koha…', 'Loading Koha libraries…');
        const body = D.createElement('div');
        box.append(status, body);
        const dirty = () => { if (ctx && typeof ctx.markDirty === 'function') ctx.markDirty(); };
        if (!Array.isArray(root.sites)) root.sites = [];
        if (!Array.isArray(root.groups)) root.groups = [];
        function paint(libraries) {
            body.replaceChildren();
            const sitesTitle = D.createElement('strong');
            sitesTitle.textContent = say('Bibliothèques où le module est actif', 'Libraries where the module is active');
            const list = D.createElement('div');
            list.style.cssText = 'max-height:280px;overflow:auto;border:1px solid #d5dde5;border-radius:8px;padding:8px;margin:8px 0';
            const groupsHost = D.createElement('div');
            function enabledLibraries() {
                return libraries.filter(lib => { const site = findLibrarySite(root.sites, lib.id); return site && site.enabled !== false; });
            }
            function paintGroups() {
                groupsHost.replaceChildren();
                const title = D.createElement('strong');
                title.textContent = say('Groupes de partage', 'Sharing groups');
                const note = D.createElement('p');
                note.textContent = say('Cochez, parmi les bibliothèques actives, celles qui partagent les demandes.', 'Among the active libraries, check those that share requests.');
                groupsHost.append(title, note);
                root.groups.forEach((group, index) => {
                    const card = D.createElement('div');
                    card.style.cssText = 'border:1px solid #d5dde5;border-radius:8px;padding:8px;margin:8px 0';
                    const head = D.createElement('div');
                    head.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
                    const on = D.createElement('input');
                    on.type = 'checkbox';
                    on.checked = group.enabled !== false;
                    on.title = say('Groupe actif', 'Group enabled');
                    on.addEventListener('change', () => { group.enabled = on.checked; dirty(); });
                    const name = D.createElement('input');
                    name.type = 'text';
                    name.className = 'form-control input-sm';
                    name.style.maxWidth = '280px';
                    name.value = group.labelFr || '';
                    name.setAttribute('aria-label', say('Nom du groupe', 'Group name'));
                    name.addEventListener('input', () => { group.labelFr = name.value; group.labelEn = name.value; dirty(); });
                    const remove = D.createElement('button');
                    remove.type = 'button';
                    remove.className = 'btn btn-default btn-xs';
                    remove.textContent = say('Retirer', 'Remove');
                    remove.addEventListener('click', () => { root.groups.splice(index, 1); dirty(); paintGroups(); });
                    head.append(on, name, remove);
                    const members = D.createElement('div');
                    const chosen = new Set(listedSiteIds(group).map(norm));
                    const active = enabledLibraries();
                    if (!active.length) {
                        const empty = D.createElement('p');
                        empty.textContent = say('Cochez d’abord au moins une bibliothèque.', 'Check at least one library first.');
                        members.append(empty);
                    }
                    active.forEach(lib => {
                        const row = D.createElement('label');
                        row.style.cssText = 'display:flex;gap:8px;align-items:center;margin:4px 0';
                        const boxIn = D.createElement('input');
                        boxIn.type = 'checkbox';
                        boxIn.checked = chosen.has(norm(lib.id));
                        boxIn.addEventListener('change', () => {
                            const next = new Set(listedSiteIds(group));
                            if (boxIn.checked) next.add(lib.id); else next.delete(lib.id);
                            group.siteIds = Array.from(next).join('\n');
                            dirty();
                        });
                        const text = D.createElement('span');
                        text.textContent = lib.nom + ' (' + lib.id + ')';
                        row.append(boxIn, text);
                        members.append(row);
                    });
                    card.append(head, members);
                    groupsHost.append(card);
                });
                const add = D.createElement('button');
                add.type = 'button';
                add.className = 'btn btn-default btn-sm';
                add.textContent = say('Ajouter un groupe', 'Add a group');
                add.addEventListener('click', () => { root.groups.push(newGroup()); dirty(); paintGroups(); });
                groupsHost.append(add);
            }
            libraries.forEach(lib => {
                const row = D.createElement('label');
                row.style.cssText = 'display:flex;gap:8px;align-items:center;padding:4px 0;flex-wrap:wrap';
                const on = D.createElement('input');
                on.type = 'checkbox';
                const site = findLibrarySite(root.sites, lib.id);
                on.checked = !!(site && site.enabled !== false);
                const name = D.createElement('span');
                name.style.minWidth = '220px';
                name.textContent = lib.nom + ' (' + lib.id + ')';
                const send = D.createElement('input');
                send.type = 'checkbox';
                send.checked = !site || site.canSend !== false;
                send.disabled = !on.checked;
                const recv = D.createElement('input');
                recv.type = 'checkbox';
                recv.checked = !site || site.canReceive !== false;
                recv.disabled = !on.checked;
                function sync() {
                    let current = findLibrarySite(root.sites, lib.id);
                    if (!on.checked) {
                        if (current) current.enabled = false;
                        root.groups.forEach(group => { group.siteIds = listedSiteIds(group).filter(id => norm(id) !== norm(lib.id)).join('\n'); });
                    } else {
                        if (!current) { current = librarySite(lib); root.sites.push(current); }
                        current.enabled = true;
                        current.id = lib.id;
                        current.labelFr = lib.nom;
                        current.labelEn = lib.nom;
                        current.matchName = lib.nom;
                        current.matchCode = lib.id;
                        current.canSend = send.checked;
                        current.canReceive = recv.checked;
                    }
                    send.disabled = recv.disabled = !on.checked;
                    dirty();
                    paintGroups();
                }
                on.addEventListener('change', sync);
                send.addEventListener('change', sync);
                recv.addEventListener('change', sync);
                const sendText = D.createElement('span');
                sendText.textContent = say('Envoie', 'Sends');
                const recvText = D.createElement('span');
                recvText.textContent = say('Reçoit', 'Receives');
                row.append(on, name, send, sendText, recv, recvText);
                list.append(row);
            });
            body.append(sitesTitle, list, groupsHost);
            paintGroups();
        }
        getSites(true).then(libraries => {
            status.textContent = libraries.length ? '' : say('Aucune bibliothèque renvoyée par Koha.', 'Koha returned no libraries.');
            paint(libraries);
        }).catch(error => {
            status.textContent = say('Bibliothèques Koha indisponibles : ', 'Koha libraries unavailable: ') + (error && error.message || error);
        });
        return box;
    }
    function newGroup() {
        const id = 'groupe-' + Date.now().toString(36);
        return { id: id, enabled: true, labelFr: 'Nouveau groupe', labelEn: 'New group', siteIds: '' };
    }
    function validateConfig(config) {
        const sites = Array.isArray(config && config.sites) ? config.sites : [];
        const ids = new Set();
        for (const site of sites) {
            if (!site || site.enabled === false) continue;
            if (!clean(site.id) || ids.has(site.id)) return { ok: false, message: 'Chaque site actif doit avoir un identifiant unique.' };
            ids.add(site.id);
            if (!clean(site.matchName) && !clean(site.matchCode)) return { ok: false, message: 'Chaque site actif doit indiquer le nom ou le code Koha à reconnaître.' };
        }
        if (config && config.enabled !== false && !ids.size) return { ok: false, message: 'Ajoutez au moins un site actif pour afficher l’assistance.' };
        const groupIds = new Set();
        for (const group of (config && config.groups) || []) {
            if (!group || group.enabled === false) continue;
            if (!clean(group.id) || groupIds.has(group.id)) return { ok: false, message: 'Chaque groupe actif doit avoir un identifiant unique.' };
            groupIds.add(group.id);
            const members = listedSiteIds(group);
            if (!members.length) return { ok: false, message: 'Chaque groupe actif doit citer au moins un site.' };
            for (const siteId of members) if (!ids.has(siteId)) return { ok: false, message: 'Groupe « ' + (group.labelFr || group.id) + ' » : site inconnu ' + siteId };
        }
        if (clean(config && config.buttonSelector)) {
            try { D.createDocumentFragment().querySelector(config.buttonSelector); } catch (e) { return { ok: false, message: 'Sélecteur CSS invalide : ' + config.buttonSelector }; }
        }
        return { ok: true };
    }
    function definition() {
        return {
            id: 'assistance-reseau',
            schemaVersion: 1,
            name: tr('Assistance réseau', 'Network assistance'),
            description: tr('Demandes d’assistance entre les sites choisis. Les alertes restent dans Koha et se mettent à jour sans service externe. Un site non configuré ne voit rien.', 'Assistance requests between selected sites. Alerts stay in Koha and update without an external service. An unconfigured site sees nothing.'),
            category: tr('Circulation / assistance', 'Circulation / assistance'),
            supportedPages: [],
            prerequisites: [],
            dependencies: [],
            defaults: clone(defaults),
            normalize: normalize,
            validate: validateConfig,
            schema: [
                { type: 'section', id: 'activation', label: tr('Activation et sites', 'Activation and sites'), fields: [
                    { key: 'enabled', type: 'boolean', label: tr('Activer le module', 'Enable module') },
                    { type: 'custom', label: tr('Bibliothèques Koha', 'Koha libraries'), help: tr('La liste vient de Koha. Cochez les bibliothèques actives, puis les membres de chaque groupe. Un site non coché ne voit rien.', 'The list comes from Koha. Check the active libraries, then the members of each group. An unchecked site sees nothing.'), render: renderKohaSites },
                    { key: 'routing.mode', type: 'select', label: tr('Qui voit une demande', 'Who sees a request'), options: [
                        { value: 'group', label: tr('Les groupes du site émetteur', 'The sender site’s groups') },
                        { value: 'all', label: tr('Tous les sites configurés', 'All configured sites') }
                    ] },
                    { key: 'buttonSelector', type: 'text', label: tr('Sélecteur CSS du bouton (facultatif)', 'Button CSS selector (optional)') }
                ] },
                { type: 'section', id: 'places', label: tr('Postes et téléphones', 'Desks and phones'), fields: [
                    { key: 'sitesMode', type: 'select', label: tr('Liste proposée à l’envoi', 'List offered when sending'), options: [
                        { value: 'koha', label: tr('Bibliothèques Koha', 'Koha libraries') },
                        { value: 'combined', label: tr('Bibliothèques Koha et postes personnalisés', 'Koha libraries and custom desks') },
                        { value: 'custom', label: tr('Postes personnalisés uniquement', 'Custom desks only') }
                    ] },
                    { key: 'locations', type: 'repeater', label: tr('Postes personnalisés', 'Custom desks'), addLabel: tr('Ajouter un poste', 'Add a desk'), newItem: () => ({ id: '', nom: '', tel: '' }), itemTitle: item => clean(item && (item.nom || item.id)) || 'Poste', fields: [
                        { key: 'id', type: 'text', label: tr('Code', 'Code') },
                        { key: 'nom', type: 'text', label: tr('Nom du poste', 'Desk name') },
                        { key: 'tel', type: 'text', label: tr('Téléphone', 'Phone') }
                    ] },
                    { key: 'siteCacheHours', type: 'number', label: tr('Cache des bibliothèques Koha (heures)', 'Koha libraries cache (hours)') },
                    { key: 'rememberPhone', type: 'boolean', label: tr('Mémoriser le dernier numéro saisi sur ce navigateur', 'Remember the last phone on this browser') }
                ] },
                { type: 'section', id: 'people', label: tr('Intervenants', 'Responders'), fields: [
                    { key: 'category', type: 'text', label: tr('Catégorie Koha des intervenants', 'Koha patron category of responders'), help: tr('Laisser vide pour n’utiliser que la liste complémentaire.', 'Leave empty to use only the additional list.') },
                    { key: 'manualIntervenants', type: 'repeater', label: tr('Intervenants complémentaires', 'Additional responders'), addLabel: tr('Ajouter un nom', 'Add a name'), newItem: () => ({ name: '' }), itemTitle: item => clean(item && item.name) || 'Intervenant', fields: [
                        { key: 'name', type: 'text', label: tr('Nom', 'Name') }
                    ] },
                    { key: 'userCacheHours', type: 'number', label: tr('Cache des intervenants (heures)', 'Responder cache (hours)') }
                ] },
                { type: 'section', id: 'alerts', label: tr('Alertes', 'Alerts'), fields: [
                    { key: 'sound', type: 'boolean', label: tr('Son d’alerte', 'Alert sound') },
                    { key: 'soundURL', type: 'text', label: tr('Adresse d’un son (facultatif)', 'Sound address (optional)'), help: tr('Vide : un signal court est joué par le navigateur.', 'Empty: the browser plays a short tone.') },
                    { key: 'blocking', type: 'boolean', label: tr('Alerte prioritaire', 'Priority alert') },
                    { key: 'board', type: 'boolean', label: tr('Tableau de suivi', 'Status board') },
                    { key: 'visibilityPolicy', type: 'select', label: tr('Lorsque l’onglet est masqué', 'When the tab is hidden'), options: [
                        { value: 'keep', label: tr('Continuer à surveiller', 'Keep watching') },
                        { value: 'sleep', label: tr('Suspendre après un délai', 'Pause after a delay') }
                    ] },
                    { key: 'backgroundGrace', type: 'number', label: tr('Délai avant suspension (secondes)', 'Pause delay (seconds)') },
                    { key: 'historyHours', type: 'number', label: tr('Fenêtre des alertes (heures)', 'Alert window (hours)') },
                    { key: 'limit', type: 'number', label: tr('Maximum d’alertes suivies', 'Maximum tracked alerts') }
                ] },
                { type: 'section', id: 'tools', label: tr('Vérifications', 'Checks'), fields: [
                    { type: 'action', label: tr('Diagnostic', 'Diagnostic'), buttonLabel: tr('Afficher le diagnostic', 'Show diagnostic'), action: () => { diagnostics(); return { message: 'Diagnostic affiché.' }; } },
                    { type: 'action', label: tr('Intervenants', 'Responders'), buttonLabel: tr('Compter les intervenants', 'Count responders'), action: async () => { const list = await getPatrons(true); return { message: (list.length + names(cfg.manualIntervenants).length) + ' intervenant(s).' }; } },
                    { type: 'action', label: tr('Postes', 'Desks'), buttonLabel: tr('Compter les postes', 'Count desks'), action: async () => { const list = await locations(); return { message: list.length + ' poste(s).' }; } }
                ] }
            ]
        };
    }
    let registered = false;
    let subscribed = false;
    function registerWithPMK() {
        const pmk = W.PMKConfig;
        if (!pmk || typeof pmk.registerModule !== 'function') return false;
        if (!registered) { pmk.registerModule(definition()); registered = true; }
        if (!subscribed) {
            subscribed = true;
            if (typeof pmk.subscribe === 'function') pmk.subscribe(ID, applyPMKConfig);
            if (typeof pmk.getConfig === 'function') pmk.getConfig(ID).then(applyPMKConfig).catch(e => console.warn('[PMK 150]', e));
        }
        return true;
    }
    D.addEventListener('visibilitychange', () => {
        clearTimeout(hiddenTimer);
        if (D.hidden && cfg.visibilityPolicy === 'sleep' && cfg.enabled) hiddenTimer = setTimeout(() => disconnect(), cfg.backgroundGrace * 1000);
        else if (!D.hidden && cfg.enabled && currentSite && !stopListen) connect();
    });
    W.addEventListener('pagehide', () => disconnect());
    W.PMKAssistance150 = {
        moduleId: ID,
        version: '1.3.0',
        defaults: clone(defaults),
        moduleDefinition: definition,
        diagnostics: diagnostics,
        refreshUsers: () => getPatrons(true),
        refreshSites: () => getSites(true),
        getSettings: () => clone(cfg),
        apply: applyPMKConfig,
        disable() { applyPMKConfig(Object.assign({}, cfg, { enabled: false })); }
    };
    W.addEventListener('pmk:config-ready', registerWithPMK);
    if (!registerWithPMK()) {
        let tries = 0;
        const timer = setInterval(() => { if (registerWithPMK() || ++tries >= 120) clearInterval(timer); }, 500);
    }
})(window, document);
