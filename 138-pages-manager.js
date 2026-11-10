/*
 Nom du fichier : 138-pages-manager.js
 Version : 1.3.0
 Date : 2026-10-17

 PimpMyKoha — Pages & outils internes
 - aucune page Koha personnalisée requise ;
 - routes virtuelles sur mainpage.pl?pmk_page=... ;
 - accès selon les droits historiques de chaque outil ;
 - configuration des pages regroupée dans PMK, sauf Autorités ;
 - une application par fichier JS séparé ;
 - seul le fichier demandé est chargé.
*/
(function (window, document) {
    'use strict';
    if (window.__PMK138_PAGES_MANAGER__) return;
    window.__PMK138_PAGES_MANAGER__ = true;

    const MODULE_ID = 'internal-pages-tools';
    const VERSION = '1.3.0';
    const ROUTE_PARAM = 'pmk_page';
    const HUB_ID = 'hub';

    // Marque immédiatement les routes virtuelles et canonicalise les anciennes URL.
    const initialParams = new URLSearchParams(window.location.search);
    let initialRoute = initialParams.get(ROUTE_PARAM);
    if(initialRoute==='rulelab'){initialRoute=HUB_ID;initialParams.set(ROUTE_PARAM,HUB_ID);try{history.replaceState(history.state,'',location.pathname+'?'+initialParams.toString()+location.hash);}catch(_){}}
    if (initialRoute && location.pathname === '/cgi-bin/koha/mainpage.pl') {
        try { document.documentElement.classList.add('pmk138-virtual-route'); } catch (_) {}
        if (initialRoute === 'attendance-counter' && initialParams.has('source')) {
            initialParams.delete('source');
            const cleanUrl = window.location.pathname + '?' + initialParams.toString() + window.location.hash;
            try { window.history.replaceState(window.history.state, '', cleanUrl); } catch (_) {}
        }
    }
    const selfUrl = new URL(document.currentScript && document.currentScript.src || window.location.href, window.location.href);
    const baseUrl = new URL('./', selfUrl);
    const release = selfUrl.searchParams.get('v') || '20261017-pmk138-v130';
    const manifest = [
    {
        "id": "attendance-counter",
        "title": "Compteur de fréquentation",
        "out": "138-page-attendance-counter",
        "icon": "fa-users",
        "group": "Outils généraux",
        "desc": "Saisie et suivi de fréquentation."
    },
    {
        "id": "action-journal",
        "title": "Journaux de suivis",
        "out": "138-page-action-journal",
        "icon": "fa-book",
        "group": "Outils généraux",
        "desc": "Plusieurs journaux de suivi pour l’équipe, distincts du journal Koha."
    },
    {
        "id": "restore-deleted-items",
        "title": "Restauration d’exemplaires",
        "out": "138-page-restore-deleted-items",
        "icon": "fa-medkit",
        "group": "Outils généraux",
        "desc": "Recherche, restauration et traitement d’exemplaires supprimés."
    },
    {
        "id": "weeding",
        "title": "Désherbage",
        "out": "138-page-weeding",
        "icon": "fa-trash",
        "group": "Outils généraux",
        "desc": "Outil de désherbage et d’analyse des collections.",
        "caution": true
    },
    {
        "id": "appointments",
        "title": "Rendez-vous et sondages",
        "out": "138-page-appointments",
        "icon": "fa-calendar",
        "group": "Outils généraux",
        "desc": "Créneaux, rendez-vous et sondages."
    },
    {
        "id": "patron-map",
        "title": "Cartographie des adhérents",
        "out": "138-page-patron-map",
        "icon": "fa-map-marker",
        "group": "Outils généraux",
        "desc": "Domiciles, sites d’inscription et échanges de documents entre les sites."
    },
    {
        "id": "authorities",
        "title": "Qualité des autorités",
        "out": "138-page-authorities",
        "icon": "fa-user-circle",
        "group": "Qualité Koha",
        "desc": "Doublons, fusions, orphelines, relink et audit des autorités.",
        "caution": true
    },
    {
        "id": "inventory",
        "title": "Inventaire",
        "out": "138-page-inventory",
        "icon": "fa-clipboard",
        "group": "Outils généraux",
        "desc": "Inventaire autonome des collections.",
        "caution": true
    },
    {
        "id": "items",
        "title": "Qualité des exemplaires",
        "out": "138-page-items",
        "icon": "fa-barcode",
        "group": "Qualité Koha",
        "desc": "Contrôle d’intégrité et maintenance des exemplaires.",
        "caution": true
    },
    {
        "id": "biblios",
        "title": "Qualité des notices",
        "out": "138-page-biblios",
        "icon": "fa-book",
        "group": "Qualité Koha",
        "desc": "Audit bibliographique, doublons et enrichissement assisté.",
        "caution": true
    },
    {
        "id": "patrons",
        "title": "Qualité des comptes lecteurs",
        "out": "138-page-patrons",
        "icon": "fa-users",
        "group": "Qualité Koha",
        "desc": "Doublons, comptes expirés et coordonnées lecteurs.",
        "caution": true
    },
    {
        "id": "bulk-framework-change",
        "title": "Modification de grille par lot",
        "icon": "fa-table",
        "group": "Outils généraux",
        "desc": "Change la grille de catalogage de plusieurs notices à partir de numéros de notice ou de codes-barres d’exemplaires.",
        "external": true
    },
    {
        "id": "xslt-assistant",
        "title": "Éditeur XSLT",
        "icon": "fa-code",
        "group": "Outils généraux",
        "desc": "Ouvrir, modifier, prévisualiser et exporter les feuilles XSLT Koha, avec sauvegarde des projets.",
        "caution": true,
        "external": true
    },
    {
        "id": "bibliography-builder",
        "title": "Bibliographies & publications",
        "icon": "fa-file-text-o",
        "group": "Outils généraux",
        "desc": "Créer et imprimer des bibliographies depuis les listes, paniers, paquets et réserves de cours.",
        "external": true
    },
    {
        "id": "bulk-permissions",
        "title": "Modification par lot de permissions",
        "icon": "fa-key",
        "group": "Outils généraux",
        "desc": "Préparer et appliquer des droits sur les comptes d’une catégorie de personnel, sans jamais modifier un superadministrateur.",
        "external": true
    }
];
    // External tools retain their existing access policy and business configuration.
    const externalSources = {
        'bulk-framework-change': {file:'141-modif-grille-par-lot.js',access:'staff'},
        'xslt-assistant': {file:'136-xslt-assistant.js',access:'superlibrarian'},
        'bibliography-builder': {file:'142-bibliography-builder.js',access:'staff'},
        'bulk-permissions': {file:'151-gestion-permissions.js',access:'superlibrarian'}
    };
    manifest.forEach(item=>Object.assign(item,externalSources[item.id] || {access:'superlibrarian'}));
    const releaseInfo = window.PMKPlugin && window.PMKPlugin.manifest || {};
    const excludedIds = new Set(releaseInfo.excludedPageIds || []);
    const stableRelease = releaseInfo.channel === 'stable';
    const withheld = new Map();
    for (let index = manifest.length - 1; index >= 0; index -= 1) {
        const item = manifest[index];
        if (excludedIds.has(item.id) || (stableRelease && item.caution)) {
            withheld.set(item.id, item);
            manifest.splice(index, 1);
        }
    }
    let config = {enabled:true};
    let configConnected=false;
    let routeGeneration=0;
    let disposePage=null;
    let routeController=null;
    let scriptSequence=0;
    const pageStatus=new Map();
    const hiddenNative=new Map();
    const originalTitle=document.title;
    const byId = new Map(manifest.map(item => [item.id, item]));
    const registry = new Map();
    const loading = new Map();

    function isSuperlibrarian() {
        try {
            if (window.PMKConfig && typeof window.PMKConfig.isKohaSuperlibrarian === 'function') {
                const result = window.PMKConfig.isKohaSuperlibrarian();
                if (result === true) return true;
            }
        } catch (_) {}
        try {
            const user = document.querySelector(
                '#logged-in-info-full .loggedinusername[data-loggedinusername], ' +
                '.loggedinusername[data-loggedinusername], ' +
                '.loggedinusername[data-is-superlibrarian], ' +
                '.loggedinusername.is_superlibrarian'
            );
            if (!user) return false;
            if (user.classList && user.classList.contains('is_superlibrarian')) return true;
            const raw = String(
                (user.dataset && user.dataset.isSuperlibrarian) ||
                user.getAttribute('data-is-superlibrarian') || ''
            ).trim().toLowerCase();
            return ['is_superlibrarian','superlibrarian','1','true','yes'].includes(raw);
        } catch (_) { return false; }
    }

    function urlFor(id) {
        if(id==='rulelab')id=HUB_ID;
        if (id && id !== HUB_ID && !byId.has(id)) throw new Error('Page inconnue : '+id);
        const u = new URL('/cgi-bin/koha/mainpage.pl', window.location.origin);
        u.searchParams.set(ROUTE_PARAM, String(id || HUB_ID));
        return u.pathname + u.search;
    }

    function open(id, target) {
        const url = urlFor(id);
        if (target === 'new') window.open(url, '_blank', 'noopener');
        else window.location.href = url;
    }

    function register(def) {
        if (!def || !def.id || !byId.has(def.id)) return false;
        registry.set(def.id, def);
        try { document.dispatchEvent(new CustomEvent('pmk:page-registered', { detail: { id:def.id } })); } catch (_) {}
        return true;
    }

    function childUrl(def) {
        const u = new URL(def.external ? './'+def.file : './138-pages/' + def.out + '.js', baseUrl);
        if (release) u.searchParams.set('v', release);
        return u.href;
    }

    function loadScript(src) {
        if (loading.has(src)) return loading.get(src);
        const promise = new Promise((resolve, reject) => {
            const existing = Array.from(document.scripts).find(s => s.src === src);
            if (existing && existing.dataset.pmk138Loaded === '1') return resolve(existing);
            const s = existing || document.createElement('script');
            const timer=setTimeout(()=>{s.remove();reject(new Error('Délai de chargement dépassé : '+src));},15000);
            s.addEventListener('load', () => { clearTimeout(timer);s.dataset.pmk138Loaded='1'; resolve(s); }, { once:true });
            s.addEventListener('error', () => {clearTimeout(timer);s.remove();reject(new Error('Impossible de charger ' + src));}, { once:true });
            if (!existing) {
                s.src = src;
                s.async = false;
                s.dataset.pmk138Child = '1';
                document.head.appendChild(s);
            } else if (existing.dataset.pmk138Loaded === '1') resolve(existing);
        });
        promise.catch(()=>loading.delete(src));
        loading.set(src, promise);
        return promise;
    }

    async function ensurePage(id) {
        if (registry.has(id)) return registry.get(id);
        const def = byId.get(id);
        if (!def) throw new Error('Page inconnue : ' + id);
        await loadScript(childUrl(def));
        if (registry.has(id)) return registry.get(id);
        await new Promise((resolve, reject) => {
            const started = Date.now();
            const timer = window.setInterval(() => {
                if (registry.has(id)) { window.clearInterval(timer); resolve(); }
                else if (Date.now()-started > 5000) { window.clearInterval(timer); reject(new Error('La page ne s’est pas enregistrée : '+id)); }
            }, 50);
        });
        return registry.get(id);
    }

    function pageHost() {
        // A floating counter must not cover the internal page's toolbar.
        window.PMKAttendance?.hide?.('internal-page');
        document.body && document.body.classList.add('pmk138-virtual-page');
        let host = document.getElementById('pmk138-page-host');
        if (host) return host;
        host = document.createElement('div');
        host.id = 'pmk138-page-host';
        host.className = 'pmk138-page-host';
        const main = document.querySelector('#container-main, main#main_intranet-main, main.container-fluid, main, #main');
        if (main) {
            Array.from(main.children).forEach(node => {
                if (node.id === host.id || node.matches('#toplevelmenu,#bottomActionBar,[data-pmk-intranetnav],.pmk-intranetnav,[id^="pmk-intranetnav"]')) return;
                hiddenNative.set(node,{value:node.style.getPropertyValue('display'),priority:node.style.getPropertyPriority('display')});
                node.style.setProperty('display','none','important');
            });
            main.appendChild(host);
        } else {
            document.body.appendChild(host);
        }
        return host;
    }

    function injectStyles() {
        if (document.getElementById('pmk138-styles')) return;
        const s=document.createElement('style');
        s.id='pmk138-styles';
        s.textContent=`
#pmk138-page-host{display:block!important;width:100%;max-width:none;margin:0;padding:14px 18px 40px;box-sizing:border-box}
#pmk138-page-host *{box-sizing:border-box}
#pmk138-page-host [hidden]{display:none!important}
#pmk138-page-host .pmk138-app-container > #pmk142-root{position:relative;inset:auto;z-index:auto;min-height:80vh}
.pmk138-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:8px 10px;border:1px solid #d8dee3;border-radius:8px;background:#fff}
.pmk138-toolbar .btn{border-color:#d8dee3;color:#39444d;background:#fff}
.pmk138-toolbar .btn:hover{border-color:#6f8f32;color:#526d22;background:#f2f7e9}
.pmk138-toolbar .pmk138-title{font-weight:600;font-size:13px;color:#697680;margin-right:auto}
.pmk138-inline-settings .form-control{max-width:640px;margin-top:4px}
.pmk138-inline-settings label{display:block;margin:10px 0}
.pmk138-inline-settings h5{margin:8px 0}
.pmk138-hub{max-width:1600px;margin:0 auto}
.pmk138-hub > input[type=search]{max-width:420px;margin:0 0 8px;border:1px solid #d8dee3;border-radius:6px}
.pmk138-hub-head{padding:18px 20px;margin-bottom:14px;border:1px solid #cedbbd;border-left:5px solid #6f8f32;border-radius:8px;background:#fff}
.pmk138-hub-head h1{font-size:26px;margin:0 0 4px;color:#526d22}
.pmk138-hub-head p{margin:0;color:#697680}
.pmk138-group{margin:18px 0}
.pmk138-group h2{font-size:18px;margin:0 0 9px;color:#39444d}
.pmk138-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.pmk138-card{display:flex;flex-direction:column;min-height:145px;padding:14px;border:1px solid #d8dee3;border-radius:8px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.pmk138-card h3{font-size:16px;margin:0 0 6px;color:#39444d}
.pmk138-card p{color:#697680;margin:0 0 12px;font-size:13px;flex:1}
.pmk138-card .btn{align-self:flex-start}
.pmk138-caution{margin:0 0 12px;padding:10px 12px;border:1px solid #e4cf96;border-radius:6px;background:#fff8e8;color:#725c22;font-size:13px;line-height:1.4}
.pmk138-card .pmk138-caution{margin:0 0 10px}
.pmk138-denied{max-width:760px;margin:35px auto;padding:20px;border:1px solid #e1b5b5;border-radius:8px;background:#fff1f1;color:#822929}
#pmk138-page-host{--pmk-g:#6f8f32;--pmk-gd:#526d22;--pmk-gl:#f2f7e9;--pmk-line:#d8dee3;--pmk-line-g:#cedbbd;--pmk-ink:#28343d;--pmk-muted:#697680}
#pmk138-page-host .pmk138-app-container{color:var(--pmk-ink);font-family:inherit}
#pmk138-page-host .pmk138-app-container > :is(#dqb-app,#dqi-app,#dqs-app,#dqp-app,#dql-app,#dqtr-app,#dq-center-app,#dqr-app,#dam-app,#kwd-app,#journal-app,#uds-root,#koha-carto-container,#inv-local-app,#inv-app,#doodle-koha-app,#freqApp,#kpm7,#pmk142-root,#pmk143,#pmk-bfc-app){max-width:1600px;margin-left:auto;margin-right:auto;color:var(--pmk-ink);font-family:inherit}
#pmk138-page-host :is(.dqb-hero,.dqi-hero,.dqs-hero,.dqp-hero,.dql-hero,.dqr-hero,.dqc-hero,.dam-hero,#dqtr-app .q-hero,#journal-app > h1,#uds-root > h1,#kwd-app > h1,#kpm7 .kpm-head,#pmk143 .tp4-head,#pmk-bfc-app .pmk-bfc-header,#inv-local-app .inv-masthead,#inv-app .inv-masthead){border:1px solid var(--pmk-line-g);border-left:5px solid var(--pmk-g);border-radius:8px;background:#fff;padding:16px 20px}
#pmk138-page-host :is(.dqb-hero h2,.dqi-hero h2,.dqs-hero h2,.dqp-hero h2,.dql-hero h2,.dqr-hero h2,.dqc-hero h2,.dam-hero h2,#dqtr-app h2,#journal-app > h1,#uds-root > h1,#kwd-app > h1,#kpm7 h1,#pmk143 h1,#pmk-bfc-app h1,#inv-local-app .inv-masthead h1,#inv-app .inv-masthead h1){color:var(--pmk-gd)}
#pmk138-page-host #journal-app > h1,#pmk138-page-host #uds-root > h1,#pmk138-page-host #kwd-app > h1{display:block;margin:0 0 14px;font-size:25px;font-weight:700}
#pmk138-page-host #pmk143 .tp4-head a[href*="mainpage.pl"]{display:none}
#pmk138-page-host #pmk142-root{background:#f6f7f8;color:var(--pmk-ink)}
#pmk138-page-host #pmk142-root .pmk142-topbar{background:#fff;color:var(--pmk-ink);border:1px solid var(--pmk-line-g);border-left:5px solid var(--pmk-g);border-radius:8px;box-shadow:none;margin:12px 12px 0}
#pmk138-page-host #pmk142-root .pmk142-title strong{color:var(--pmk-gd);font-size:22px}
#pmk138-page-host #pmk142-root .pmk142-topbar button{background:#fff;color:#39444d;border:1px solid var(--pmk-line)}
#pmk138-page-host #pmk142-root .pmk142-topbar button:hover{background:var(--pmk-gl);border-color:var(--pmk-g);color:var(--pmk-gd)}
#pmk138-page-host #pmk142-root .pmk142-topbar button[data-action="print"]{background:var(--pmk-g);border-color:var(--pmk-g);color:#fff}
#pmk138-page-host .pmk138-app-container :focus-visible{outline:2px solid var(--pmk-g);outline-offset:2px}
#pmk138-page-host .pmk138-page-information{margin:0 0 12px;padding:10px 14px;border:1px solid var(--pmk-line-g);border-left:5px solid var(--pmk-g);border-radius:8px;background:#fff}
@media(max-width:1050px){.pmk138-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:680px){#pmk138-page-host{padding:10px}.pmk138-grid{grid-template-columns:1fr}}
`;
        document.head.appendChild(s);
    }

    function toolbar(title) {
        const bar=document.createElement('div');bar.className='pmk138-toolbar';
        const back=document.createElement('a');back.className='btn btn-default btn-sm';back.href=urlFor(HUB_ID);back.innerHTML='<i class="fa fa-arrow-left" aria-hidden="true"></i> Pages & outils internes';
        const t=document.createElement('div');t.className='pmk138-title';t.textContent=title || '';
        const home=document.createElement('a');home.className='btn btn-default btn-sm';home.href='/cgi-bin/koha/mainpage.pl';home.innerHTML='<i class="fa fa-home" aria-hidden="true"></i> Accueil Koha';
        if(canOpen(HUB_ID) && requestedPage()!==HUB_ID)bar.appendChild(back);bar.append(t,home);
        const pageId=requestedPage();
        const configurable=pageId==='hub'||pageId==='authorities'||!!window.PMKPagesSettings?.catalog?.[pageId];
        if(isSuperlibrarian() && configurable){const settings=document.createElement('button');settings.type='button';settings.className='btn btn-default btn-sm';settings.textContent='Réglages de cette page';settings.onclick=()=>window.PMKPagesSettings?.openSettings(pageId);bar.appendChild(settings);}return bar;
    }

    const CAUTION_TEXT = 'En cours de développement. À utiliser avec précaution : cette page n’est pas forcément adaptée à toutes les installations Koha.';
    function cautionNote() {
        const note=document.createElement('p');
        note.className='pmk138-caution';
        note.textContent=CAUTION_TEXT;
        return note;
    }

    function renderHub(host) {
        host.replaceChildren();
        host.appendChild(toolbar('Pages & outils internes'));
        const wrap=document.createElement('div');wrap.className='pmk138-hub';
        const head=document.createElement('div');head.className='pmk138-hub-head';head.innerHTML='<h1>Pages & outils internes</h1><p>Retrouvez les outils accessibles avec votre compte Koha.</p>';
        wrap.appendChild(head);
        const search=document.createElement('input');search.type='search';search.className='form-control';search.placeholder='Rechercher un outil';search.setAttribute('aria-label','Rechercher un outil');wrap.appendChild(search);
        const empty=document.createElement('p');empty.textContent='Aucun outil ne correspond à cette recherche.';empty.hidden=true;
        search.addEventListener('input',()=>{
            const term=search.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
            wrap.querySelectorAll('.pmk138-card').forEach(card=>{card.hidden=!card.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term);});
            wrap.querySelectorAll('.pmk138-group').forEach(sec=>{sec.hidden=!Array.from(sec.querySelectorAll('.pmk138-card')).some(card=>!card.hidden);});
            empty.hidden=Array.from(wrap.querySelectorAll('.pmk138-card')).some(card=>!card.hidden);
        });
        const groups=[...new Set(manifest.filter(x=>canOpen(x.id)).map(x=>x.group))];
        groups.forEach(group => {
            const sec=document.createElement('section');sec.className='pmk138-group';
            const h=document.createElement('h2');h.textContent=group;sec.appendChild(h);
            const grid=document.createElement('div');grid.className='pmk138-grid';
            manifest.filter(x=>x.group===group && canOpen(x.id)).forEach(item => {
                const card=document.createElement('div');card.className='pmk138-card';
                const h3=document.createElement('h3');h3.innerHTML='<i class="fa '+item.icon+' fa-fw" aria-hidden="true"></i> '+escapeHtml(item.title);
                const p=document.createElement('p');p.textContent=item.desc;
                const a=document.createElement('a');a.className='btn btn-primary btn-sm';a.href=urlFor(item.id);a.textContent='Ouvrir';
                card.append(h3,p);
                if(item.caution)card.appendChild(cautionNote());
                card.appendChild(a);grid.appendChild(card);
            });
            sec.appendChild(grid);wrap.appendChild(sec);
        });
        wrap.appendChild(empty);
        host.appendChild(wrap);
        document.title='Pages & outils internes — Koha';
    }

    function escapeHtml(v) { return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    async function executeScript(oldScript, context) {
        if(context?.signal.aborted)return;
        return new Promise((resolve,reject)=>{
            const script=document.createElement('script');
            Array.from(oldScript.attributes || []).forEach(attr=>script.setAttribute(attr.name,attr.value));
            const token='pmk138-script-'+(++scriptSequence);
            const sourceName=token+'.js';
            let finished=false;
            const finish=error=>{
                if(finished)return;finished=true;clearTimeout(timer);
                document.removeEventListener('pmk:internal-script-complete',complete);
                window.removeEventListener('error',runtimeError);
                context?.signal.removeEventListener('abort',cancel);
                if(error)reject(error);else resolve();
            };
            const complete=event=>{if(event.detail===token)finish();};
            const runtimeError=event=>{if(String(event.filename || '').includes(sourceName)){event.preventDefault();finish(new Error(event.message || 'Erreur d’initialisation'));}};
            const cancel=()=>{script.remove();finish(new DOMException('Page fermée','AbortError'));};
            const timer=setTimeout(()=>finish(new Error('Délai d’initialisation dépassé')),15000);
            context?.signal.addEventListener('abort',cancel,{once:true});
            script.onerror=()=>finish(new Error('Impossible de charger une dépendance de la page'));
            if(oldScript.src){script.onload=()=>finish();oldScript.replaceWith(script);return;}
            document.addEventListener('pmk:internal-script-complete',complete);
            window.addEventListener('error',runtimeError);
            script.textContent=(oldScript.textContent || '')+'\n;document.dispatchEvent(new CustomEvent("pmk:internal-script-complete",{detail:'+JSON.stringify(token)+'}));\n//# sourceURL='+sourceName;
            try{oldScript.replaceWith(script);}catch(error){finish(error);}
        });
    }

    async function mountLegacyHtml(container, source) {
        const context=container.__pmkPageContext;
        if(context?.signal.aborted)return;
        container.innerHTML=source;
        const scripts=Array.from(container.querySelectorAll('script'));
        for(const script of scripts){
            if(context?.signal.aborted)return;
            if(script.dataset.pmkOptional==='true'){
                void executeScript(script,context).catch(error=>{if(context?.signal.aborted)return;const status=pageStatus.get(context?.id);if(status)(status.optionalDependenciesUnavailable ||= []).push(error.message);});
            }else await executeScript(script,context);
        }
    }

    function cleanupQualityCenter(container) {
        const root=container.querySelector('#dq-center-app');if(!root)return null;
        const clean=()=>{
            root.querySelectorAll('.dqc-panel').forEach(panel=>{
                const h=panel.querySelector('h3');
                if (h && /Configuration locale des pages/i.test(h.textContent||'')) panel.remove();
            });
        };
        clean();const obs=new MutationObserver(clean);obs.observe(root,{childList:true,subtree:true});return obs;
    }

    const pageChecks = new Map();
    function pageInformation(id, host, context) {
        if(id==='authorities')return;
        const service=window.PMKPagesSettings, definition=service?.catalog[id];
        if(!definition)return;
        const details=document.createElement('details');
        details.className='pmk138-page-information';
        details.style.cssText='max-height:45vh;overflow:auto;flex-shrink:0';
        const summary=document.createElement('summary');summary.textContent='À propos de cette page et vérifications';details.appendChild(summary);
        const add=(label,text)=>{const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label+' : ';p.append(strong,document.createTextNode(text||'Non renseigné'));details.appendChild(p);};
        add('Objectif',definition.objective);add('Fonctions',definition.functions?.join(' · '));add('Moteur',definition.engine);add('Prérequis',definition.prerequisites);
        const choice=config.pageOptions?.[id]?.access,access=choice&&choice!=='default'?choice:byId.get(id)?.access;add('Accès',(access==='staff'?'Personnel Koha':'Administrateur Koha')+' — les droits métier Koha restent nécessaires');
        const link=document.createElement('a');link.href=urlFor(id);link.textContent='Lien direct vers cette page';details.appendChild(link);
        const check=document.createElement('button');check.type='button';check.className='btn btn-default btn-sm';check.textContent='Vérifier les réglages et les rapports';check.style.marginLeft='12px';details.appendChild(check);
        const output=document.createElement('div');output.setAttribute('aria-live','polite');details.appendChild(output);
        const show=result=>{output.replaceChildren();const p=document.createElement('p');p.textContent=result?'Dernière vérification dans cette session : '+new Date(result.at).toLocaleString()+' — contrôle des réglages et des métadonnées, sans exécuter les rapports.':'Aucune vérification effectuée dans cette session.';output.appendChild(p);for(const text of result?.messages||[]){const row=document.createElement('p');row.textContent=text;output.appendChild(row);}};
        show(pageChecks.get(id));
        check.addEventListener('click',async()=>{
            check.disabled=true;
            try{
                const workbench=window.PMKWorkbench;if(!workbench)throw new Error('Service de diagnostic indisponible');
                const effective={runtime:service.runtime(id),settings:service.settings(id)};
                const diagnosis=workbench.diagnose(effective),reports=await workbench.checkReports(effective,{signal:context.signal});if(context.signal.aborted)return;
                const messages=diagnosis.rows.filter(row=>row.kind!=='report').map(row=>row.path.join(' / ')+' : '+row.message);
                const states={ok:'disponible',missing:'introuvable',forbidden:'accès refusé',unavailable:'indisponible'};
                for(const row of reports.rows)messages.push('Rapport '+row.id+' : '+states[row.state]+(row.name?' — '+row.name:''));
                if(!messages.length)messages.push('Aucune cible ni aucun rapport à contrôler automatiquement. Les prérequis indiqués ci-dessus restent à vérifier.');
                const result={at:new Date().toISOString(),messages};pageChecks.set(id,result);show(result);
            }catch(error){output.textContent='Vérification interrompue : '+error.message;}finally{check.disabled=false;}
        });
        context.informationElement=details;
        context.setInformationHost(context.informationHost);
        context.onDispose(()=>details.remove());
    }

    async function renderPage(id, host, generation) {
        const meta=byId.get(id);if(!meta) { host.textContent='Page inconnue.'; return; }
        host.replaceChildren();host.appendChild(toolbar(meta.title));
        if(meta.caution)host.appendChild(cautionNote());
        const app=document.createElement('div');app.className='pmk138-app-container';host.appendChild(app);
        const controller=routeController;const cleanups=[];
        const context={id,meta,isSuperlibrarian,urlFor,open,mountLegacyHtml,signal:controller.signal,onDispose:callback=>{if(typeof callback!=='function')return;if(controller.signal.aborted)callback();else cleanups.push(callback);}};
        // Full-screen tools may host the same information panel inside their own surface.
        context.setInformationHost=target=>{
            context.informationHost=target||host;
            if(context.informationElement)context.informationHost.prepend(context.informationElement);
        };
        app.__pmkPageContext=context;
        disposePage=()=>{pageStatus.set(id,Object.assign({},pageStatus.get(id),{state:'closed'}));cleanups.splice(0).reverse().forEach(callback=>{try{callback();}catch(_){}});};
        app.textContent='Ouverture de la page…';pageStatus.set(id,{state:'loading'});
        try {
            const def=await ensurePage(id);
            if (generation !== routeGeneration || !host.isConnected || config.enabled === false) return;
            app.replaceChildren();
            const cleanup=await def.mount(app,context);
            if(typeof cleanup==='function')context.onDispose(cleanup);
            if(generation!==routeGeneration || controller.signal.aborted)return;
            pageStatus.set(id,Object.assign({},pageStatus.get(id),{state:'mounted'}));
            if(id==='quality-center'){const observer=cleanupQualityCenter(app);context.onDispose(()=>observer?.disconnect());}
            pageInformation(id,host,context);
            document.title=meta.title+' — Koha';
        } catch(error) {
            if(generation!==routeGeneration || controller.signal.aborted)return;
            pageStatus.set(id,{state:'error',message:error.message || String(error)});
            console.error('PMK138 — page indisponible',id,error);
            const b=document.createElement('div');b.className='alert alert-danger';b.textContent='Application indisponible : '+(error.message||error);const retry=document.createElement('button');retry.type='button';retry.className='btn btn-default';retry.textContent='Réessayer';retry.addEventListener('click',renderRoute);app.replaceChildren(b,retry);
        }
    }

    function requestedPage() { return location.pathname === '/cgi-bin/koha/mainpage.pl' ? new URLSearchParams(window.location.search).get(ROUTE_PARAM) : null; }

    function renderDenied(host) { host.innerHTML='<div class="pmk138-denied"><strong>Accès réservé.</strong><br>Cette page exige le rôle superlibrarian Koha.<p><a href="/cgi-bin/koha/mainpage.pl">Retour à l’accueil Koha</a></p></div>'; }

    function renderPmkLauncher(ctx) {
        const wrap=document.createElement('div');
        const root=ctx && ctx.rootObject || {};
        const description=document.createElement('p');description.textContent='Cochez les pages à proposer. Elles apparaissent dans le menu Outils pour les comptes autorisés. Les autres réglages restent sur chaque page.';
        const list=document.createElement('div');
        list.style.cssText='max-height:320px;overflow:auto;border:1px solid #d5dde5;border-radius:8px;padding:8px;margin:8px 0';
        manifest.forEach(item=>{
            const row=document.createElement('label');
            row.style.cssText='display:flex;gap:8px;align-items:center;padding:4px 0';
            const box=document.createElement('input');
            box.type='checkbox';
            box.checked=root.pageOptions?.[item.id]?.enabled !== false;
            box.addEventListener('change',()=>{
                root.pageOptions ||= {};
                root.pageOptions[item.id] ||= {};
                root.pageOptions[item.id].enabled=box.checked;
                if (ctx && typeof ctx.markDirty==='function') ctx.markDirty();
            });
            const name=document.createElement('span');
            name.textContent=item.title+' — '+item.group;
            row.append(box,name);
            list.appendChild(row);
        });
        const link=document.createElement('a');link.className='btn btn-primary';link.href=urlFor(HUB_ID);link.target='_blank';link.rel='noopener';link.textContent='Ouvrir les pages & outils internes';
        const table=document.createElement('table');table.className='table table-striped';
        const head=table.createTHead().insertRow();['Page','Accès à la page','Prérequis particuliers'].forEach(label=>{const cell=document.createElement('th');cell.textContent=label;head.appendChild(cell);});
        const details={
            'attendance-counter':'Authentification et droits du compteur Koha',
            'action-journal':'Accès au journal stockage Koha',appointments:'Accès stockage Koha ; contrôle administrateur propre aux rendez-vous','patron-map':'Rapport SQL de ce Koha. La carte distingue le quartier (rue) et la commune. Le géocodage IGN n’envoie la rue que pour les usagers encore reliés à leur fiche.',
            'restore-deleted-items':'Filtre nominatif supplémentaire dans la page ; droits Koha de restauration',inventory:'Stockage local IndexedDB et droits API Koha',
            'quality-center':'Navigation et état des prérequis',
            weeding:'Droits Koha ; référentiel Koha facultatif',
            'xslt-assistant':'Module Éditeur XSLT actif ; projets stockés dans le navigateur',
            'bibliography-builder':'Droits Koha ; listes et modèles personnels selon la source',
            'bulk-framework-change':'Droits Koha de catalogage pour les modifications',
            'bulk-permissions':'Session superlibrarian. Catégories de personnel (type S) uniquement, jamais une catégorie de lecteurs.'
        };
        const body=table.createTBody();
        manifest.forEach(item=>{const row=body.insertRow();const a=document.createElement('a');a.href=urlFor(item.id);a.target='_blank';a.rel='noopener';a.textContent=item.title;row.insertCell().appendChild(a);row.insertCell().textContent=(item.id!=='authorities'&&config.pageOptions?.[item.id]?.access && config.pageOptions[item.id].access!=='default'?config.pageOptions[item.id].access:item.access)==='staff'?'Personnel Koha':'Superlibrarian Koha';row.insertCell().textContent=details[item.id] || 'Droits API Koha et paramètres de la page';});
        const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Voir les pages, leurs accès et leurs prérequis';detail.append(summary,table);wrap.append(description,list,link,detail);return wrap;
    }
    function registerPmk() {
        if (!window.PMKConfig || typeof window.PMKConfig.registerModule!=='function') return false;
        try {
            window.PMKConfig.registerModule({
                id:MODULE_ID,schemaVersion:4,compactActivation:true,hidePageCount:true,
                name:{fr:'Pages & outils internes',en:'Internal pages & tools'},
                description:{fr:'Le menu Outils, en haut de l’écran, affiche les pages cochées ici et les outils dont le module est actif. L’accès de chaque page se règle sur la page.',en:'The Tools menu at the top lists the pages checked here and the tools whose module is active. Each page’s access is set on the page.'},
                category:{fr:'Navigation et interface',en:'Navigation and interface'},
                supportedPages:['*'],prerequisites:[],dependencies:[],defaults:{enabled:true,hubAccess:'superlibrarian',pageOptions:{}},
                validate:cfg=>window.PMKPagesSettings?.validate(cfg)||{ok:true},
                schema:[
                    {type:'section',id:'pages',label:{fr:'Ouvrir les pages',en:'Open the pages'},fields:[
                        {type:'custom',render:renderPmkLauncher}
                    ]}
                ]
            });
            return true;
        } catch(_) { return false; }
    }

    window.PMKPages={version:VERSION,moduleId:MODULE_ID,manifest:manifest.map(x=>Object.assign({},x)),register,urlFor,open,isSuperlibrarian,mountLegacyHtml,canOpen,assetUrl:file=>new URL(file,baseUrl).href,refresh:renderRoute,getStatus:id=>Object.assign({},pageStatus.get(id)||{state:'not-opened'}),get:id=>registry.get(id)||null};
    try { document.dispatchEvent(new CustomEvent('pmk:pages-ready')); } catch (_) {}

    function pageActive(id) {
        if (id===HUB_ID) return true;
        return config.pageOptions?.[id]?.enabled !== false;
    }
    function canOpen(id) {
        if (id!==HUB_ID && !byId.has(id))return false;
        if (config.enabled === false) return false;
        if (!pageActive(id)) return false;
        const meta=byId.get(id);
        if(id==='authorities')return isSuperlibrarian();
        const access=id===HUB_ID?(config.hubAccess||'superlibrarian'):(config.pageOptions?.[id]?.access && config.pageOptions[id].access!=='default'?config.pageOptions[id].access:meta?.access);
        return access==='staff' || isSuperlibrarian();
    }
    function clearSurface() {
        routeGeneration++;
        routeController?.abort();routeController=null;
        if (disposePage) {try {disposePage();} catch (_) {} disposePage=null;}
        document.getElementById('pmk138-page-host')?.remove();
        hiddenNative.forEach((style,node)=>{if(style.value)node.style.setProperty('display',style.value,style.priority);else node.style.removeProperty('display');});
        hiddenNative.clear();
        document.body?.classList.remove('pmk138-virtual-page');
        document.documentElement.classList.remove('pmk138-virtual-route');
        document.title=originalTitle;
    }
    async function renderRoute() {
        let id=requestedPage();
        if (id==='quality-center') {
            id=HUB_ID;
            try { history.replaceState(history.state,'',urlFor(HUB_ID)); } catch (_) {}
        }
        if (!id || config.enabled === false) {clearSurface();return;}
        clearSurface();
        document.documentElement.classList.add('pmk138-virtual-route');
        const generation=routeGeneration;
        routeController=new AbortController();
        const host=pageHost();
        if (id !== HUB_ID && withheld.has(id)) {
            const item=withheld.get(id);
            host.appendChild(toolbar(item.title));
            host.appendChild(cautionNote());
            const note=document.createElement('p');
            note.textContent='Cette page n’est pas incluse dans la version stable de PimpMyKoha. Elle reste disponible dans la version aperçu.';
            host.appendChild(note);
            return;
        }
        if (id !== HUB_ID && !byId.has(id)) {host.appendChild(toolbar('Page inconnue'));host.append('Cette page interne n’existe pas.');return;}
        if (id !== HUB_ID && !pageActive(id)) {host.appendChild(toolbar(byId.get(id).title));host.append('Cette page est désactivée dans la configuration PMK.');return;}
        if (!canOpen(id)) {pageStatus.set(id,{state:'denied'});renderDenied(host);return;}
        if (id===HUB_ID) renderHub(host); else await renderPage(id,host,generation);
    }
    async function connectConfig() {
        if (!registerPmk() || configConnected) return;
        configConnected=true;
        try {config=Object.assign({enabled:true},await window.PMKConfig.getConfig(MODULE_ID));} catch (_) {}
        await renderRoute();
        window.PMKConfig.subscribe?.(MODULE_ID,next=>{
            const changed=config.enabled !== (next?.enabled !== false);
            config=Object.assign({enabled:true},next || {});
            if (changed) renderRoute();
            window.PMKOwnTools?.refresh();
        });
        window.PMKOwnTools?.refresh();
    }
    async function start() {
        injectStyles();
        try{if(!window.PMKPagesSettings){const source=new URL('138-pages-settings.js',baseUrl);source.searchParams.set('v',release);await loadScript(source.href);}window.PMKPagesSettings.attach({get:()=>config,update:next=>{config=Object.assign({enabled:true},next)}});}catch(error){if(requestedPage()){const host=pageHost();host.textContent='Configuration des pages indisponible : '+error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='Réessayer';retry.onclick=start;host.appendChild(retry);}return;}
        if (window.PMKConfig) await connectConfig();
        else {await renderRoute();window.addEventListener('pmk:config-ready',connectConfig,{once:true});}
    }
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})(window, document);
