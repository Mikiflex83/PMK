/* ============================================================
   PimpMyKoha 137 — Widget « Liens utiles »
   v1.1.1 — 15/10/2026

   - contenu entièrement configurable dans PimpMyKoha ;
   - bouton de configuration directement sur le widget, réservé aux
     superlibrarian via le contrôle commun PMK ;
   - activation et ordre du widget toujours pilotés par 137-home-widgets ;
   - deux colonnes configurables, sans HTML à éditer.
   ============================================================ */
(function (window, document) {
    'use strict';

    const WIDGET_ID = 'liens-utiles';
    const MODULE_ID = 'home-widget-useful-links';
    const VERSION = '1.1.2';

    // Les valeurs locales historiques sont conservées pour l'installation d'origine,
    // sans être diffusées comme configuration par défaut aux autres Koha.
    const IS_LEGACY_SITE = /(^|\.)dracenie\.com$/i.test(window.location.hostname);
    const LEGACY_LINKS = [
            { id:'livres-hebdo', enabled:true, column:'left', label:'Livre Hebdo', url:'https://www.livreshebdo.fr/', note:'', newTab:true },
            { id:'atlas', enabled:true, column:'left', label:'Atlas des bibliothèques', url:'https://shs.hal.science/halshs-04444109', note:'', newTab:true },
            { id:'site', enabled:true, column:'right', label:'Site Internet', url:'https://mediatheques.dracenie.com/', note:'', newTab:true },
            { id:'agenda', enabled:true, column:'right', label:'Agenda', url:'https://mediatheques.dracenie.com/accueil/agenda', note:'', newTab:true },
            { id:'infos', enabled:true, column:'right', label:'Infos pratiques des médiathèques', url:'https://mediatheques.dracenie.com/accueil/infos_et_services-les_mediathques', note:'', newTab:true },
            { id:'billetterie', enabled:true, column:'right', label:'Billetterie', url:'https://billetterieculture.dracenie.com/', note:'', newTab:true }
    ];
    const DEFAULT_CONFIG = {
        enabled: true,
        titleFr: 'Liens pratiques',
        titleEn: 'Useful links',
        links: IS_LEGACY_SITE ? LEGACY_LINKS : []
    };

    let config = clone(DEFAULT_CONFIG);
    let subscribed = false;
    let registered = false;
    let mountedSlot = null;
    let managerContext = null;

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function clean(value) { return String(value == null ? '' : value).trim(); }
    function uid() { return 'link-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7); }
    function lang() { return /^en\b/i.test(document.documentElement.lang || '') ? 'en' : 'fr'; }

    function normalize(raw) {
        raw = raw && typeof raw === 'object' ? raw : {};
        const defaultsById = new Map(DEFAULT_CONFIG.links.map(item => [item.id, item]));
        const links = Array.isArray(raw.links) ? raw.links : DEFAULT_CONFIG.links;
        return {
            enabled: raw.enabled !== false,
            titleFr: clean(raw.titleFr) || DEFAULT_CONFIG.titleFr,
            titleEn: clean(raw.titleEn) || clean(raw.titleFr) || DEFAULT_CONFIG.titleEn,
            links: links.map((item, index) => {
                const base = defaultsById.get(item?.id) || {};
                return {
                    id: clean(item?.id) || clean(base.id) || ('link-' + (index + 1)),
                    enabled: item?.enabled !== false,
                    column: item?.column === 'right' ? 'right' : 'left',
                    label: clean(item?.label) || clean(base.label) || ('Lien ' + (index + 1)),
                    url: clean(item?.url) || clean(base.url),
                    note: clean(item?.note),
                    newTab: item?.newTab !== false,
                    lastCheckedAt: clean(item?.lastCheckedAt),
                    lastCheckStatus: clean(item?.lastCheckStatus)
                };
            })
        };
    }

    function newLink() {
        return { id:uid(), enabled:true, column:'left', label:'Nouveau lien', url:'', note:'', newTab:true };
    }

    function canonicalUrl(value) {
        try {
            const raw = clean(value);
            const url = /^https?:\/\//i.test(raw) ? new URL(raw) : new URL(raw, window.location.origin);
            url.hash = '';
            return url.href.replace(/\/$/, '').toLocaleLowerCase('fr');
        } catch (_) { return ''; }
    }

    function diagnoseLinks(links) {
        const byUrl = new Map();
        const diagnostics = [];
        links.forEach((link, index) => {
            if (link.enabled === false) return;
            const url = canonicalUrl(link.url);
            if (!url || !/^https?:\/\//i.test(url)) diagnostics.push({level:'error', index, message:'Adresse invalide pour « ' + link.label + ' ».'});
            if (url) byUrl.set(url, [...(byUrl.get(url) || []), index]);
            if (link.label.length > 80) diagnostics.push({level:'info', index, message:'Libellé long (' + link.label.length + ' caractères) : il restera affiché sur plusieurs lignes.'});
        });
        for (const indexes of byUrl.values()) if (indexes.length > 1) diagnostics.push({level:'warning', indexes, message:'Même destination utilisée par : ' + indexes.map(i => '« ' + links[i].label + ' »').join(', ') + '.'});
        return diagnostics;
    }

    function moduleDefinition() {
        return {
            id: MODULE_ID,
            schemaVersion: 1,
            navigationHidden: true,
            name: { fr:'Liens utiles — widget', en:'Useful links — widget' },
            description: {
                fr:'Configure directement le contenu du widget Liens utiles affiché sur l’accueil Koha.',
                en:'Directly configures the Useful links widget displayed on the Koha home page.'
            },
            category: { fr:'Accueil / widgets', en:'Home / widgets' },
            supportedPages: ['/cgi-bin/koha/mainpage.pl'],
            prerequisites: [],
            dependencies: ['home-widgets'],
            defaults: clone(DEFAULT_CONFIG),
            normalize,
            validate: function (cfg) {
                const c = normalize(cfg);
                if (!Array.isArray(c.links)) return { ok:false, message:'Liste de liens invalide.' };
                for (const link of c.links) {
                    if (link.enabled !== false && (!clean(link.label) || !clean(link.url))) {
                        return { ok:false, message:'Chaque lien actif doit avoir un libellé et une adresse.' };
                    }
                }
                return { ok:true };
            },
            schema: [
                {
                    type:'section', id:'activation', label:{fr:'Activation',en:'Activation'}, fields:[
                        { key:'enabled', type:'boolean', label:{fr:'Afficher le contenu du widget',en:'Show widget content'} }
                    ]
                },
                {
                    type:'section', id:'content', label:{fr:'Contenu du widget',en:'Widget content'},
                    description:{fr:'Modifiez le titre et les liens. Le rendu du widget est mis à jour après enregistrement.',en:'Edit the title and links. The widget is updated after saving.'},
                    fields:[
                        { key:'titleFr', type:'text', label:{fr:'Titre — français',en:'Title — French'} },
                        { key:'titleEn', type:'text', label:{fr:'Titre — anglais',en:'Title — English'} },
                        {
                            key:'links', type:'repeater', reorder:true, label:{fr:'Liens',en:'Links'},
                            addLabel:{fr:'Ajouter un lien',en:'Add link'}, newItem:newLink, liveTitleKey:'label',
                            itemTitle:function(item,index){ return clean(item?.label) || ('Lien ' + (index + 1)); },
                            fields:[
                                { key:'enabled', type:'boolean', label:{fr:'Lien actif',en:'Link enabled'} },
                                { key:'label', type:'text', label:{fr:'Libellé',en:'Label'} },
                                { key:'url', type:'text', label:{fr:'Adresse / URL',en:'Address / URL'}, help:{fr:'URL absolue ou chemin Koha commençant par /.',en:'Absolute URL or Koha path starting with /.'} },
                                { key:'note', type:'text', label:{fr:'Texte complémentaire',en:'Additional text'}, help:{fr:'Texte facultatif affiché après le lien.',en:'Optional text displayed after the link.'} },
                                { key:'column', type:'select', label:{fr:'Colonne',en:'Column'}, options:[
                                    {value:'left',label:{fr:'Gauche',en:'Left'}},{value:'right',label:{fr:'Droite',en:'Right'}}
                                ]},
                                { key:'newTab', type:'boolean', label:{fr:'Ouvrir dans un nouvel onglet',en:'Open in a new tab'} }
                            ]
                        }
                    ]
                }
            ],
            focusContext:function(main){
                const section = main?.querySelector('[data-pmk-section-id="content"]');
                if (section) setTimeout(() => section.scrollIntoView({block:'start',behavior:'smooth'}),0);
            }
        };
    }

    function ensureStyle() {
        if (document.getElementById('pmk137-liens-utiles-style')) return;
        const style = document.createElement('style');
        style.id = 'pmk137-liens-utiles-style';
        style.textContent = `
            .pmk137-liens-utiles{width:100%;margin:0 0 1rem;position:relative}
            .pmk137-liens-utiles-card{border:1px solid #ced4d9;background:#fff}
            .pmk137-liens-utiles-head{display:flex;align-items:center;justify-content:center;gap:.5rem;padding:.65rem .8rem;border-bottom:1px solid #ced4d9;position:relative}
            .pmk137-liens-utiles-head h2{margin:0;text-align:center;font-size:1.25rem;text-decoration:underline}
            .pmk137-liens-utiles-config{position:absolute;right:.35rem;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center}
            .pmk137-liens-utiles-cols{display:grid;grid-template-columns:1fr 1fr}
            .pmk137-liens-utiles-col{padding:.55rem .75rem;min-width:0}
            .pmk137-liens-utiles-col+ .pmk137-liens-utiles-col{border-left:1px solid #ced4d9}
            .pmk137-liens-utiles ul{margin:0;padding-left:1.25rem}
            .pmk137-liens-utiles li+li{margin-top:.3rem}
            .pmk137-liens-utiles a{overflow-wrap:anywhere;word-break:break-word}
            .pmk137-liens-utiles-note{margin-left:.25rem;color:#495057}
            @media(max-width:900px){.pmk137-liens-utiles-cols{grid-template-columns:1fr}.pmk137-liens-utiles-col+ .pmk137-liens-utiles-col{border-left:0;border-top:1px solid #ced4d9}}
        `;
        document.head.appendChild(style);
    }

    function buildLinkItem(link) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = link.url;
        a.textContent = link.label;
        if (link.newTab) { a.target = '_blank'; a.rel = 'noopener'; }
        li.appendChild(a);
        if (link.note) {
            const note = document.createElement('span');
            note.className = 'pmk137-liens-utiles-note';
            note.textContent = '— ' + link.note;
            li.appendChild(note);
        }
        return li;
    }

    function render() {
        if (!mountedSlot) return;
        ensureStyle();
        mountedSlot.innerHTML = '';

        const wrap = document.createElement('div');
        wrap.className = 'pmk137-liens-utiles';
        const card = document.createElement('div');
        card.className = 'pmk137-liens-utiles-card';
        const head = document.createElement('div');
        head.className = 'pmk137-liens-utiles-head';
        const h2 = document.createElement('h2');
        h2.textContent = lang() === 'en' ? (config.titleEn || config.titleFr) : config.titleFr;
        head.appendChild(h2);

        const cfgHost = document.createElement('span');
        cfgHost.className = 'pmk137-liens-utiles-config';
        head.appendChild(cfgHost);
        card.appendChild(head);

        const cols = document.createElement('div');
        cols.className = 'pmk137-liens-utiles-cols';
        ['left','right'].forEach(column => {
            const col = document.createElement('div');
            col.className = 'pmk137-liens-utiles-col';
            const ul = document.createElement('ul');
            config.links.filter(link => link.enabled !== false && link.column === column).forEach(link => ul.appendChild(buildLinkItem(link)));
            col.appendChild(ul);
            cols.appendChild(col);
        });
        card.appendChild(cols);
        wrap.appendChild(card);
        mountedSlot.appendChild(wrap);

        if (window.PMKConfig?.isKohaSuperlibrarian?.()) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-sm btn-outline-secondary';
            button.textContent = '⚙';
            button.setAttribute('aria-label', lang() === 'en' ? 'Configure useful links' : 'Configurer les liens utiles');
            button.addEventListener('click', openSettings);
            cfgHost.appendChild(button);
        }
    }

    function openSettings() {
        if (!window.PMKConfig?.isKohaSuperlibrarian?.() || document.getElementById('pmk137-links-settings')) return;
        const draft = clone(config);
        const dialog = document.createElement('dialog');
        dialog.id = 'pmk137-links-settings';
        dialog.style.cssText = 'width:min(900px,94vw);max-height:90vh;overflow:auto;border:1px solid #ced4d9;border-radius:.65rem;padding:1rem';
        const form = document.createElement('form');
        const title = document.createElement('h3'); title.textContent = lang() === 'en' ? 'Useful links' : 'Liens utiles'; form.appendChild(title);
        function input(parent, caption, value, change, type = 'text') {
            const label = document.createElement('label'); label.style.cssText = 'display:block;margin:.5rem 0';
            const text = document.createElement('span'); text.textContent = caption + ' '; label.appendChild(text);
            const control = document.createElement('input'); control.type = type;
            if (type === 'checkbox') control.checked = value; else control.value = value;
            control.addEventListener('input', () => change(type === 'checkbox' ? control.checked : control.value));
            label.appendChild(control); parent.appendChild(label); return control;
        }
        input(form, 'Titre FR', draft.titleFr, v => draft.titleFr = v);
        input(form, 'Title EN', draft.titleEn, v => draft.titleEn = v);
        const items = document.createElement('div'); form.appendChild(items);
        const diagnostics = document.createElement('div'); diagnostics.setAttribute('role', 'status'); diagnostics.setAttribute('aria-live', 'polite');
        function renderDiagnostics() {
            const results = diagnoseLinks(draft.links);
            diagnostics.replaceChildren();
            const heading = document.createElement('strong');
            heading.textContent = results.length ? 'Contrôle des liens' : 'Contrôle des liens : aucune anomalie de configuration';
            diagnostics.appendChild(heading);
            if (results.length) {
                const list = document.createElement('ul');
                results.forEach(item => { const li = document.createElement('li'); li.textContent = item.message; li.dataset.level = item.level; list.appendChild(li); });
                diagnostics.appendChild(list);
            }
        }
        function rows() {
            items.replaceChildren();
            draft.links.forEach((link, index) => {
                const row = document.createElement('fieldset'); row.style.cssText = 'border:1px solid #ced4d9;padding:.6rem;margin:.6rem 0';
                const legend = document.createElement('legend'); legend.textContent = String(index + 1); row.appendChild(legend);
                input(row, 'Actif / Enabled', link.enabled, v => link.enabled = v, 'checkbox');
                input(row, 'Libellé / Label', link.label, v => { link.label = v; renderDiagnostics(); });
                input(row, 'URL', link.url, v => { link.url = v; renderDiagnostics(); });
                input(row, 'Note', link.note, v => link.note = v);
                input(row, 'Nouvel onglet / New tab', link.newTab, v => link.newTab = v, 'checkbox');
                const state = document.createElement('p'); state.className = 'pmk137-link-check-state';
                state.textContent = link.lastCheckedAt ? 'Vérifié manuellement le ' + new Date(link.lastCheckedAt).toLocaleString('fr-FR') : 'Pas encore vérifié manuellement';
                row.appendChild(state);
                const test = document.createElement('button'); test.type = 'button'; test.textContent = 'Tester le lien';
                test.addEventListener('click', () => {
                    const url = canonicalUrl(link.url);
                    if (!url || !/^https?:\/\//i.test(url)) { error.textContent = 'Adresse invalide : corrigez-la avant le test.'; return; }
                    const destination = /^https?:\/\//i.test(link.url) ? new URL(link.url) : new URL(link.url, location.origin);
                    window.open(destination.href, '_blank', 'noopener');
                    link.lastCheckedAt = new Date().toISOString(); link.lastCheckStatus = 'manual-open'; rows();
                }); row.appendChild(test);
                const label = document.createElement('label'); label.textContent = 'Colonne / Column ';
                const select = document.createElement('select');
                [['left', 'Gauche / Left'], ['right', 'Droite / Right']].forEach(([value, text]) => select.add(new Option(text, value)));
                select.value = link.column; select.addEventListener('change', () => link.column = select.value); label.appendChild(select); row.appendChild(label);
                [['↑', -1], ['↓', 1], ['Supprimer / Delete', 0]].forEach(([text, offset]) => {
                    const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
                    button.disabled = offset !== 0 && (index + offset < 0 || index + offset >= draft.links.length);
                    button.addEventListener('click', () => {
                        if (!offset) draft.links.splice(index, 1);
                        else [draft.links[index], draft.links[index + offset]] = [draft.links[index + offset], draft.links[index]];
                        rows();
                    }); row.appendChild(button);
                });
                items.appendChild(row);
            });
            renderDiagnostics();
        }
        rows();
        const add = document.createElement('button'); add.type = 'button'; add.textContent = 'Ajouter un lien / Add link';
        add.addEventListener('click', () => { draft.links.push(newLink()); rows(); }); form.appendChild(add);
        form.appendChild(diagnostics);
        const error = document.createElement('p'); error.setAttribute('role', 'alert'); form.appendChild(error);
        const save = document.createElement('button'); save.type = 'submit'; save.className = 'btn btn-primary'; save.textContent = 'Enregistrer / Save'; form.appendChild(save);
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Annuler / Cancel'; cancel.addEventListener('click', () => dialog.close()); form.appendChild(cancel);
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (!window.PMKConfig?.isKohaSuperlibrarian?.()) return;
            const validation = moduleDefinition().validate(draft);
            if (!validation.ok) { error.textContent = validation.message; return; }
            if (draft.links.some(link => link.enabled && !/^(https?:\/\/|\/(?!\/))/i.test(link.url.trim()))) {
                error.textContent = 'Indiquez une URL http(s) ou un chemin local commençant par /.'; return;
            }
            save.disabled = true;
            try { await window.PMKConfig.saveConfig(MODULE_ID, draft); dialog.close(); }
            catch (_) { error.textContent = 'Enregistrement impossible. Réessayez.'; save.disabled = false; }
        });
        dialog.addEventListener('close', () => dialog.remove(), {once: true});
        dialog.appendChild(form); document.body.appendChild(dialog); dialog.showModal();
    }

    function registerConfigModule() {
        if (registered) return true;
        if (!window.PMKConfig?.registerModule) return false;
        try { window.PMKConfig.registerModule(moduleDefinition()); registered = true; return true; }
        catch (_) { return false; }
    }

    function loadConfig() {
        if (!registerConfigModule() || !window.PMKConfig?.getConfig) { config = clone(DEFAULT_CONFIG); render(); return; }
        window.PMKConfig.getConfig(MODULE_ID).then(value => { config = normalize(value); render(); }).catch(() => { config = clone(DEFAULT_CONFIG); render(); });
        if (!subscribed && window.PMKConfig?.subscribe) {
            subscribed = true;
            window.PMKConfig.subscribe(MODULE_ID, value => { config = normalize(value); render(); });
        }
    }

    async function mount(slot, context) {
        if (!slot) return;
        mountedSlot = slot;
        managerContext = context || null;
        loadConfig();
        const dispose=()=>{if(mountedSlot===slot){mountedSlot=null;managerContext=null;}};
        dispose.canRefresh=()=>!document.querySelector('#pmk137-links-settings[open]');
        return dispose;
    }

    function registerWidget() {
        if (!window.PMKHomeWidgets?.register) return false;
        window.PMKHomeWidgets.register({ id:WIDGET_ID, name:'Liens utiles', target:'announcements-column', mount });
        return true;
    }

    registerConfigModule();
    if (!registerWidget()) {
        window.addEventListener('pmk:home-widgets-ready', registerWidget, { once:true });
        let tries = 0;
        const timer = setInterval(function(){ tries += 1; if (registerWidget() || tries >= 100) clearInterval(timer); },50);
    }
    if (!registered) window.addEventListener('pmk:config-ready', function(){ registerConfigModule(); loadConfig(); }, { once:true });

    window.PMK137UsefulLinks = { version:VERSION, moduleId:MODULE_ID, getConfig:() => clone(config), diagnoseLinks:links => clone(diagnoseLinks(normalize({links}).links)), render };
})(window, document);
