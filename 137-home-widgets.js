/* ============================================================
   PimpMyKoha 137 — Widgets & blocs d’accueil
   v1.2.1-preplugin — 15/10/2026

   Rôle :
   - module PMK unique pour les widgets de la page d'accueil ;
   - activation/désactivation individuelle ;
   - ordre par glisser-déposer dans PMK (deux zones séparées) ;
   - chargement des widgets depuis des fichiers JS distincts ;
   - aucun réglage métier des widgets n'est déplacé dans PMK.

   Fichiers enfants attendus :
   /137-widgets/137-widget-frequency-nedap.js
   /137-widgets/137-widget-doodle-koha.js
   /137-widgets/137-widget-circulation-abonnements.js
   /137-widgets/137-widget-planning-services.js
   /137-widgets/137-widget-liens-utiles.js
   ============================================================ */
(function (window, document) {
    'use strict';

    if (window.PMKHomeWidgets && window.PMKHomeWidgets.version) return;

    const MODULE_ID = 'home-widgets';
    const IS_LEGACY_INSTALLATION = /(^|\.)dracenie\.com$/i.test(window.location.hostname);
    const VERSION = '1.2.1-preplugin';
    const currentScript = document.currentScript;
    const selfUrl = currentScript && currentScript.src
        ? new URL(currentScript.src, window.location.href)
        : new URL('/public/koha-scripts/137-home-widgets.js', window.location.origin);
    const release = selfUrl.searchParams.get('v') || '20261015-pmk137-reports-v121';

    const WIDGET_FILES = [
        './137-widgets/137-widget-frequency-nedap.js',
        './137-widgets/137-widget-doodle-koha.js',
        './137-widgets/137-widget-circulation-abonnements.js',
        './137-widgets/137-widget-planning-services.js',
        './137-widgets/137-widget-liens-utiles.js'
    ];

    const DEFAULT_CONFIG = {
        enabled: true,
        // Rapports SQL Koha existants ; jamais créer ces rapports automatiquement.
        circulationReportId: IS_LEGACY_INSTALLATION ? 4918 : 0,
        subscriptionReportId: IS_LEGACY_INSTALLATION ? 4878 : 0,
        announcementsWidgets: [
            { id: 'frequency-nedap', labelFr: 'Fréquentation NEDAP', labelEn: 'NEDAP attendance', enabled: IS_LEGACY_INSTALLATION },
            { id: 'doodle-koha', labelFr: 'Rendez-vous', labelEn: 'Appointments', enabled: IS_LEGACY_INSTALLATION },
            { id: 'circulation-abonnements', labelFr: 'Circulation & abonnements', labelEn: 'Circulation & subscriptions', enabled: IS_LEGACY_INSTALLATION },
            { id: 'liens-utiles', labelFr: 'Liens utiles', labelEn: 'Useful links', enabled: true }
        ],
        mainBlockWidgets: [
            { id: 'planning-services', deferUntilVisible:true, labelFr: 'Planning des services', labelEn: 'Services schedule', enabled: IS_LEGACY_INSTALLATION }
        ]
    };

    const registry = new Map();
    const mounted = new Set();
    const waiting = new Map();
    const widgetStates = new Map();
    const disposers = new Map();
    const mounting = new Map();
    const mountEpochs = new Map();
    const loadedScripts = new Map();
    let config = clone(DEFAULT_CONFIG);
    let configReady = false;
    let modulesRequested = false;
    let importTask = null;
    const failedImports = new Set();
    let initialConfigSignature = '';

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function isHomePage() {
        return document.body?.id === 'main_intranet-main'
            || /(?:^|\/)mainpage\.pl$/i.test(window.location.pathname)
            || window.location.pathname === '/cgi-bin/koha/'
            || window.location.pathname === '/cgi-bin/koha';
    }

    function isSuperlibrarian() {
        try {
            if (window.PMKConfig && typeof window.PMKConfig.isKohaSuperlibrarian === 'function') {
                return !!window.PMKConfig.isKohaSuperlibrarian();
            }
        } catch (_) {}

        try {
            const user = document.querySelector('.loggedinusername[data-is-superlibrarian], .loggedinusername.is_superlibrarian');
            if (!user) return false;
            if (user.classList.contains('is_superlibrarian')) return true;
            const raw = String(user.getAttribute('data-is-superlibrarian') || '').trim().toLowerCase();
            return ['is_superlibrarian', 'superlibrarian', '1', 'true', 'yes'].includes(raw);
        } catch (_) {
            return false;
        }
    }

    function normalizeList(saved, defaults) {
        const output = [];
        const seen = new Set();

        (Array.isArray(saved) ? saved : []).forEach(item => {
            const def = defaults.find(candidate => candidate.id === item?.id);
            if (!item || typeof item.id !== 'string' || !item.id || seen.has(item.id)) return;
            seen.add(item.id);
            output.push(def ? Object.assign({}, def, item, { id: def.id }) : clone(item));
        });

        defaults.forEach(def => {
            if (!output.some(item => item.id === def.id)) output.push(clone(def));
        });
        return output;
    }

    function normalizeConfig(raw) {
        raw = raw && typeof raw === 'object' ? raw : {};
        const announcementsWidgets = normalizeList(raw.announcementsWidgets, DEFAULT_CONFIG.announcementsWidgets);
        const firstZoneIds = new Set(announcementsWidgets.map(item => item.id));
        const mainBlockWidgets = normalizeList(raw.mainBlockWidgets, DEFAULT_CONFIG.mainBlockWidgets)
            .filter(item => !firstZoneIds.has(item.id));
        return Object.assign({}, raw, {
            enabled: raw.enabled !== false,
            circulationReportId: raw.circulationReportId === undefined ? DEFAULT_CONFIG.circulationReportId : raw.circulationReportId,
            subscriptionReportId: raw.subscriptionReportId === undefined ? DEFAULT_CONFIG.subscriptionReportId : raw.subscriptionReportId,
            announcementsWidgets,
            mainBlockWidgets
        });
    }

    function widgetSettings(id) {
        const all = [...config.announcementsWidgets, ...config.mainBlockWidgets];
        return all.find(item => item.id === id) || null;
    }

    function widgetTarget(id) {
        if (config.announcementsWidgets.some(item => item.id === id)) return 'announcements-column';
        if (config.mainBlockWidgets.some(item => item.id === id)) return 'intranet-main-userblock';
        return null;
    }

    function orderedIds(target) {
        const list = target === 'announcements-column' ? config.announcementsWidgets : config.mainBlockWidgets;
        return list.filter(item => item.enabled !== false).map(item => item.id);
    }

    function ensureAnnouncementsZone() {
        let zone = document.getElementById('pmk137-announcements-widgets');
        if (zone) return zone;

        const news = document.getElementById('area-news');
        const column = news?.closest('.col-md-3, .col-sm-3, [class*="col-"]')
            || document.querySelector('#container-main > .row > .col-md-3.order-sm-2')
            || document.querySelector('#container-main .col-md-3');
        if (!column) return null;

        zone = document.createElement('div');
        zone.id = 'pmk137-announcements-widgets';
        zone.className = 'pmk137-widget-zone pmk137-announcements-zone';

        if (news?.parentNode === column) news.insertAdjacentElement('afterend', zone);
        else column.prepend(zone);
        return zone;
    }

    function ensureMainBlockZone() {
        let zone = document.getElementById('pmk137-main-userblock-widgets');
        if (zone) return zone;

        const native = document.getElementById('IntranetmainUserblock');
        if (native) {
            zone = document.createElement('div');
            zone.id = 'pmk137-main-userblock-widgets';
            zone.className = 'pmk137-widget-zone pmk137-mainblock-zone';
            native.appendChild(zone);
            return zone;
        }

        const mainColumn = document.querySelector('#container-main .col-md-9.order-md-2')
            || document.querySelector('#container-main .col-md-9');
        if (!mainColumn) return null;

        const row = document.createElement('div');
        row.className = 'row pmk137-mainblock-row';
        const col = document.createElement('div');
        col.className = 'col-sm-12';
        const section = document.createElement('div');
        section.className = 'page-section pmk137-mainblock-section';
        zone = document.createElement('div');
        zone.id = 'pmk137-main-userblock-widgets';
        zone.className = 'pmk137-widget-zone pmk137-mainblock-zone';

        section.appendChild(zone);
        col.appendChild(section);
        row.appendChild(col);

        const versionRow = document.getElementById('koha_version')?.closest('.row');
        if (versionRow?.parentNode === mainColumn) mainColumn.insertBefore(row, versionRow);
        else mainColumn.appendChild(row);
        return zone;
    }

    function zoneFor(target) {
        if (target === 'announcements-column') return ensureAnnouncementsZone();
        if (target === 'intranet-main-userblock') return ensureMainBlockZone();
        return null;
    }

    function ensureSlot(id, target) {
        const zone = zoneFor(target);
        if (!zone) return null;

        let slot = [...zone.querySelectorAll('[data-pmk137-widget]')]
            .find(element => element.dataset.pmk137Widget === id);
        if (!slot) {
            slot = document.createElement('div');
            slot.className = 'pmk137-widget-slot';
            slot.dataset.pmk137Widget = id;
            zone.appendChild(slot);
        }
        return slot;
    }

    function sortZone(target) {
        const zone = zoneFor(target);
        if (!zone) return;
        orderedIds(target).forEach(id => {
            const slot = [...zone.querySelectorAll('[data-pmk137-widget]')]
                .find(element => element.dataset.pmk137Widget === id);
            if (slot) zone.appendChild(slot);
        });
    }

    function widgetError(id, slot) {
        widgetStates.set(id,'error');slot.replaceChildren();
        const message=document.createElement('div');message.className='alert alert-warning';message.setAttribute('role','status');message.textContent='Widget indisponible. Les autres widgets restent utilisables. ';
        const retry=document.createElement('button');retry.type='button';retry.className='btn btn-default btn-sm';retry.textContent='Réessayer';
        retry.addEventListener('click',async()=>{retry.disabled=true;if(!registry.has(id))await importWidgets();if(!registry.has(id)){retry.disabled=false;return;}unmountWidget(id);mountWidget(id,true);});
        message.appendChild(retry);slot.appendChild(message);
    }

    async function mountWidget(id, force) {
        if (!isHomePage() || config.enabled === false) return;
        const settings = widgetSettings(id);
        if (!settings || settings.enabled === false || mounted.has(id)) return;
        if (mounting.has(id)) {
            const pending=mounting.get(id);
            return pending.pmkEpoch!==mountEpochs.get(id) ? pending.then(()=>mountWidget(id,force)) : pending;
        }
        if(!force && widgetStates.get(id)==='error')return;

        const def = registry.get(id);
        if (!def || typeof def.mount !== 'function') return;
        const target = widgetTarget(id) || def.target;
        const slot = ensureSlot(id, target);
        if (!slot) return;

        if(!force && settings.deferUntilVisible && window.IntersectionObserver){
            if(waiting.has(id))return;
            widgetStates.set(id,'waiting');
            const placeholder=document.createElement('p');placeholder.textContent='Chargement à l’approche de l’affichage…';slot.replaceChildren(placeholder);
            const observer=new IntersectionObserver(entries=>{
                if(!entries.some(entry=>entry.isIntersecting) || waiting.get(id)?.slot!==slot)return;
                observer.disconnect();waiting.delete(id);mountWidget(id,true);
            },{rootMargin:'200px'});
            waiting.set(id,{observer,slot});observer.observe(slot);return;
        }
        const pending=waiting.get(id);if(pending){pending.observer.disconnect();waiting.delete(id);}
        slot.replaceChildren();widgetStates.set(id,'loading');
        const epoch = (mountEpochs.get(id) || 0) + 1;
        mountEpochs.set(id, epoch);
        const task = Promise.resolve().then(async () => {
            try {
                const disposer = await def.mount(slot, {
                    moduleId: MODULE_ID,
                    widgetId: id,
                    target,
                    labelFr: settings.labelFr || def.name || id,
                    labelEn: settings.labelEn || settings.labelFr || def.name || id,
                    isSuperlibrarian,
                    loadScript
                });
                // Un démontage intervenu pendant await def.mount ne doit pas remonter le widget.
                if (mountEpochs.get(id) !== epoch || config.enabled === false || widgetSettings(id)?.enabled === false || !slot.isConnected) {
                    if (typeof disposer === 'function') { try { disposer(); } catch (error) { console.warn('PMK137 — nettoyage tardif:', error); } }
                    slot.remove();
                    return;
                }
                if (typeof disposer === 'function') disposers.set(id, disposer);
                mounted.add(id);widgetStates.set(id,'ready');
                const refresh=document.createElement('button');refresh.type='button';refresh.className='btn btn-link btn-sm pmk137-refresh';refresh.textContent='Actualiser';refresh.setAttribute('aria-label','Actualiser '+(settings.labelFr||def.name||id));
                refresh.addEventListener('click',async()=>{
                    if(refresh.disabled)return;
                    let note=slot.querySelector('.pmk137-refresh-note');if(note)note.remove();
                    const inform=text=>{note=document.createElement('span');note.className='pmk137-refresh-note';note.setAttribute('role','status');note.textContent=text;refresh.after(note);};
                    if(disposer?.canRefresh && !disposer.canRefresh()){inform('Terminez ou fermez le formulaire ouvert avant d’actualiser. Vos saisies sont conservées.');return;}
                    if(typeof disposer?.refresh==='function'){
                        refresh.disabled=true;
                        try{await disposer.refresh();}catch(_){inform('Actualisation impossible. Les informations affichées et vos saisies sont conservées.');}
                        finally{refresh.disabled=false;}
                    }else{unmountWidget(id);mountWidget(id,true);}
                });slot.appendChild(refresh);
                sortZone(target);
            } catch (error) {
                console.error(`PMK137 — erreur montage ${id}:`, error);
                if(mountEpochs.get(id)===epoch && slot.isConnected)widgetError(id,slot);
            } finally {
                mounting.delete(id);
            }
        });
        task.pmkEpoch=epoch;
        mounting.set(id, task);
        return task;
    }

    function unmountWidget(id) {
        const pending=waiting.get(id);if(pending){pending.observer.disconnect();waiting.delete(id);}
        widgetStates.set(id,'closed');
        mountEpochs.set(id, (mountEpochs.get(id) || 0) + 1);
        const dispose = disposers.get(id);
        disposers.delete(id);
        if (typeof dispose === 'function') {
            try { dispose(); } catch (error) { console.warn(`PMK137 — démontage ${id}:`, error); }
        }
        mounted.delete(id);
        document.querySelectorAll('[data-pmk137-widget]').forEach(slot => {
            if (slot.dataset.pmk137Widget === id) slot.remove();
        });
    }

    // Les pages restaurées depuis le back-forward cache doivent pouvoir
    // remonter leurs widgets après un pagehide. Ne pas utiliser once ici.
    window.addEventListener('pagehide', () => {
        [...new Set([...mounted, ...mounting.keys(), ...waiting.keys()])].forEach(unmountWidget);
    });
    window.addEventListener('pageshow', event => {
        if (event.persisted && configReady) reconcile();
    });

    function reconcile() {
        if (!isHomePage() || !configReady) return;
        if (config.enabled === false) {
            [...new Set([...mounted, ...mounting.keys(), ...waiting.keys()])].forEach(unmountWidget);
            return;
        }
        [...new Set([...mounted, ...mounting.keys(), ...waiting.keys()])].forEach(id => {
            const settings = widgetSettings(id);
            if (!settings || settings.enabled === false) unmountWidget(id);
        });
        [...config.announcementsWidgets, ...config.mainBlockWidgets].forEach(item => {
            if (item.enabled !== false) mountWidget(item.id);
        });
        sortZone('announcements-column');
        sortZone('intranet-main-userblock');
    }

    function register(widget) {
        if (!widget || !widget.id) return false;
        registry.set(widget.id, widget);
        if (configReady) mountWidget(widget.id);
        return true;
    }

    // Chargeur partagé pour les dépendances JS classiques (Chart.js, etc.).
    // Ne bloque pas indéfiniment lorsqu'un script est déjà inséré et n'a
    // pas été créé par PMK 137 : son événement load peut être déjà passé.
    function loadScript(url) {
        const absolute = new URL(url, window.location.href).href;
        if (loadedScripts.has(absolute)) return loadedScripts.get(absolute);

        const promise = new Promise((resolve, reject) => {
            const existing = [...document.scripts].find(s => s.src === absolute);
            if (existing) {
                // Un élément déjà présent n'est pas nécessairement exécuté.
                // Pour les scripts PMK gérés ici, attendre leur vrai état.
                if (existing.dataset.pmk137Loading === '1') {
                    existing.addEventListener('load', () => resolve(existing), { once: true });
                    existing.addEventListener('error', () => reject(new Error(`Chargement impossible : ${absolute}`)), { once: true });
                } else {
                    // Script externe non géré : impossible de connaître son état
                    // après coup ; préserver le comportement historique.
                    resolve(existing);
                }
                return;
            }
            const script = document.createElement('script');
            script.async = true;
            script.dataset.pmk137Loading = '1';
            script.src = absolute;
            script.addEventListener('load', () => {
                delete script.dataset.pmk137Loading;
                script.dataset.pmk137Loaded = '1';
                resolve(script);
            }, { once: true });
            script.addEventListener('error', () => {
                delete script.dataset.pmk137Loading;
                script.remove();
                reject(new Error(`Chargement impossible : ${absolute}`));
            }, { once: true });
            document.head.appendChild(script);
        });
        loadedScripts.set(absolute, promise);
        promise.catch(() => {
            if (loadedScripts.get(absolute) === promise) loadedScripts.delete(absolute);
        });
        return promise;
    }

    function importWidgets() {
        if (!isHomePage()) return Promise.resolve();
        if (importTask) return importTask;
        if (modulesRequested && failedImports.size === 0) return Promise.resolve();
        const pending = modulesRequested ? [...failedImports] : WIDGET_FILES;
        modulesRequested = true;
        importTask = (async () => {
            for (const relative of pending) {
                try {
                    const url = new URL(relative, selfUrl);
                    url.searchParams.set('v', release);
                    if(failedImports.has(relative))url.searchParams.set('pmk_retry',String(Date.now()));
                    await import(url.href);
                    failedImports.delete(relative);
                } catch (error) {
                    failedImports.add(relative);
                    const ids={'frequency-nedap':'frequency-nedap','doodle-koha':'doodle-koha','circulation-abonnements':'circulation-abonnements','planning-services':'planning-services','liens-utiles':'liens-utiles'};
                    const name=relative.split('/').pop().replace(/^137-widget-/,'').replace(/\.js$/,'');const id=ids[name],settings=id&&widgetSettings(id);
                    if(config.enabled!==false && settings?.enabled!==false && settings){const slot=ensureSlot(id,widgetTarget(id));if(slot)widgetError(id,slot);}

                    console.error('PMK137 — chargement widget impossible :', relative, error);
                }
            }
            reconcile();
        })().finally(() => { importTask = null; });
        return importTask;
    }

    function moduleDefinition() {
        return {
            id: MODULE_ID,
            schemaVersion: 1,
            name: { fr: 'Widgets & blocs d’accueil', en: 'Home widgets & blocks' },
            description: {
                fr: 'Centralise les widgets par défaut placés dans les annonces et IntranetmainUserblock. PMK pilote uniquement leur activation ; chaque widget conserve son propre fonctionnement et sa propre configuration accessible uniquement pour les superlibrarian directement sur le widget.',
                en: 'Centralizes the default widgets placed in announcements and IntranetmainUserblock. PMK only controls activation; each widget keeps its own behavior and configuration, available only to superlibrarians directly from the widget.'
            },
            category: { fr: 'Accueil / interface', en: 'Home / interface' },
            supportedPages: ['*'],
            prerequisites: [],
            dependencies: [],
            defaults: clone(DEFAULT_CONFIG),
            validate: function (cfg) {
                if (!cfg || typeof cfg.enabled !== 'boolean') return { ok: false, message: 'Configuration invalide.' };
                if (!Array.isArray(cfg.announcementsWidgets) || !Array.isArray(cfg.mainBlockWidgets)) return { ok: false, message: 'Liste de widgets invalide.' };
                return { ok: true };
            },
            schema: [
                {
                    type: 'section',
                    id: 'announcements',
                    label: { fr: 'Colonne des annonces', en: 'Announcements column' },
                    description: { fr: 'Activez ou désactivez les widgets. Leurs réglages sont accessibles sur chaque widget.', en: 'Enable or disable widgets. Settings are available on each widget.' },
                    fields: [
                        {
                            key: 'announcementsWidgets',
                            type: 'repeater',
                            reorder: false,
                            removable: false,
                            canAdd: function () { return false; },
                            itemTitle: function (item) { return item?.labelFr || item?.id || 'Widget'; },
                            fields: [
                                { key: 'enabled', type: 'boolean', label: { fr: 'Afficher ce widget', en: 'Show this widget' } },
                                { key: 'deferUntilVisible', type: 'boolean', label: { fr: 'Charger à l’approche de l’affichage', en: 'Load when approaching the viewport' } },
                            ]
                        }
                    ]
                },
                {
                    type: 'section',
                    id: 'mainblock',
                    label: { fr: 'Zone IntranetmainUserblock', en: 'IntranetmainUserblock area' },
                    description: { fr: 'Widgets affichés sous les modules principaux de l’accueil.', en: 'Widgets displayed below the main home modules.' },
                    fields: [
                        {
                            key: 'mainBlockWidgets',
                            type: 'repeater',
                            reorder: false,
                            removable: false,
                            canAdd: function () { return false; },
                            itemTitle: function (item) { return item?.labelFr || item?.id || 'Widget'; },
                            fields: [
                                { key: 'enabled', type: 'boolean', label: { fr: 'Afficher ce widget', en: 'Show this widget' } },
                                { key: 'deferUntilVisible', type: 'boolean', label: { fr: 'Charger à l’approche de l’affichage', en: 'Load when approaching the viewport' } },
                            ]
                        }
                    ]
                }
            ]
        };
    }

    function applyConfig(next, initial) {
        const normalized = normalizeConfig(next);
        const signature = JSON.stringify(normalized);

        if (!initial && configReady && initialConfigSignature && signature !== initialConfigSignature && isHomePage()) {
            window.location.reload();
            return;
        }

        config = normalized;
        initialConfigSignature = signature;
        configReady = true;
        if (isHomePage()) {
            importWidgets();
            reconcile();
        }
    }

    function registerPmk() {
        if (!window.PMKConfig || typeof window.PMKConfig.registerModule !== 'function') return false;
        try {
            window.PMKConfig.registerModule(moduleDefinition());
            Promise.resolve(window.PMKConfig.getConfig(MODULE_ID))
                .then(cfg => applyConfig(cfg, true))
                .catch(error => {
                    console.warn('PMK137 — configuration inaccessible, valeurs par défaut utilisées provisoirement :', error);
                    applyConfig(clone(DEFAULT_CONFIG), true);
                });

            if (typeof window.PMKConfig.subscribe === 'function') {
                window.PMKConfig.subscribe(MODULE_ID, cfg => applyConfig(cfg, false));
            }
            return true;
        } catch (error) {
            console.error('PMK137 — enregistrement PMK impossible :', error);
            return false;
        }
    }

    // PMK 137 — couche de stockage substituable. Un adaptateur est propre à chaque
    // widget et son espace de données ; aucun identifiant Firebase n'est mutualisé.
    // Les widgets utilisent le stockage natif du plugin Koha. La forme des
    // documents historiques reste conservée pour la migration.
    const storageProviders = new Map();
    const storage = Object.freeze({
        register(namespace, provider) {
            if (typeof namespace !== 'string' || !namespace || !provider ||
                !['read','write','subscribe','transact'].some(operation => typeof provider[operation] === 'function')) {
                throw new TypeError('PMK137 storage: au moins une opération doit être fournie');
            }
            if (storageProviders.has(namespace)) return storageProviders.get(namespace);
            const api = Object.freeze({
                ...(typeof provider.read === 'function' ? { read: (...args) => Promise.resolve().then(() => provider.read(...args)) } : {}),
                ...(typeof provider.write === 'function' ? { write: (...args) => Promise.resolve().then(() => provider.write(...args)) } : {}),
                ...(typeof provider.subscribe === 'function' ? { subscribe: (...args) => provider.subscribe(...args) } : {}),
                ...(typeof provider.transact === 'function' ? { transact: (...args) => provider.transact(...args) } : {})
            });
            storageProviders.set(namespace, api);
            return api;
        },
        get(namespace) { return storageProviders.get(namespace) || null; }
    });

    window.PMKHomeWidgets = {
        version: VERSION,
        moduleId: MODULE_ID,
        register,
        storage,
        isSuperlibrarian,
        loadScript,
        reconcile,
        getConfig: () => clone(config),
        getStatus: id => widgetStates.get(id) || 'idle'
    };

    function start() {
        if (!registerPmk()) {
            window.addEventListener('pmk:config-ready', registerPmk, { once: true });
            window.setTimeout(() => {
                if (!configReady) applyConfig(clone(DEFAULT_CONFIG), true);
                registerPmk();
            }, 5000);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})(window, document);
