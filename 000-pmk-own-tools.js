/* PimpMyKoha — accès direct aux outils.
 * Le menu utilise le même moteur que les navigations personnalisées.
 * Le menu IntranetNav peut ajouter un raccourci, mais il n’est pas nécessaire
 * pour ouvrir ces outils.
 */
(function (window, document) {
    'use strict';
    if (window.PMKOwnTools) return;

    const ITEM_ID = 'pmk-own-tools';
    const STYLE_ID = 'pmk-own-tools-styles';
    let signature = '';
    let queued = false;

    function french() {
        return !String(document.documentElement.lang || '').toLowerCase().startsWith('en');
    }

    function text(fr, en) {
        return french() ? fr : en;
    }

    function enabled(bridge) {
        return !!bridge && bridge.enabled !== false;
    }

    function linkItem(id, fr, en, href, icon) {
        return { id: id, kind: 'link', enabled: true, labelFr: fr, labelEn: en, url: href, target: 'same', icon: icon, audience: 'all' };
    }

    function actionItem(id, fr, en, icon, run) {
        return { id: id, kind: 'action', enabled: true, labelFr: fr, labelEn: en, actionId: id, icon: icon, audience: 'all', run: run };
    }

    function withGroup(items, id, fr, en, children) {
        if (!children.length) return;
        items.push({ id: id, kind: 'group', parentId: '', enabled: true, labelFr: fr, labelEn: en, audience: 'all' });
        children.forEach(function (child) {
            child.parentId = id;
            items.push(child);
        });
    }

    function groupKey(label) {
        return 'pages-' + String(label || 'pages').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    function menuItems() {
        const items = [];
        const pages = [];
        const modules = [];
        const help = [];
        const pageGroups = new Map();
        try {
            const catalog = window.PMKPages;
            if (catalog && typeof catalog.canOpen === 'function' && typeof catalog.urlFor === 'function') {
                if (catalog.canOpen('hub')) pages.push(linkItem('hub', 'Pages & outils internes', 'Internal pages & tools', catalog.urlFor('hub'), 'fa-th-large'));
                (catalog.manifest || []).forEach(function (page) {
                    if (!page || !catalog.canOpen(page.id)) return;
                    const label = page.group || 'Pages';
                    if (!pageGroups.has(label)) pageGroups.set(label, []);
                    pageGroups.get(label).push(linkItem('page-' + page.id, page.title, page.title, catalog.urlFor(page.id), page.icon || 'fa-folder-open'));
                });
            }
        } catch (_) {}
        if (enabled(window.PMKPersonalLists) && typeof window.PMKPersonalLists.open === 'function') {
            modules.push(actionItem('lists', 'Listes personnelles', 'Personal lists', 'fa-bookmark', function () { return window.PMKPersonalLists.open(); }));
        }
        const history = window.PMKHistory071 || window.PMKRecentHistory || window.PMKHistory;
        if (enabled(history) && typeof history.open === 'function') {
            modules.push(actionItem('history', 'Historique récent', 'Recent history', 'fa-clock-o', function () { return history.open(); }));
        }
        if (enabled(window.PMKAdvancedSearch) && typeof window.PMKAdvancedSearch.open === 'function') {
            modules.push(actionItem('search', 'Recherche avancée', 'Advanced search', 'fa-search-plus', function () { return window.PMKAdvancedSearch.open(); }));
        }
        const attendance = window.PMKAttendanceMediabus;
        if (attendance && attendance.available === true && attendance.enabled !== false && typeof attendance.open === 'function') {
            modules.push(actionItem('attendance', 'Compteur de fréquentation', 'Attendance counter', 'fa-plus-square', function () { return attendance.open(); }));
        }
        const guides = window.PMKGuidesTraining;
        if (enabled(guides)) {
            if (typeof guides.startCurrent === 'function') {
                help.push(actionItem('guide-current', 'Guide de cet écran', 'Guide for this screen', 'fa-compass', function () { return guides.startCurrent(); }));
            }
            if (typeof guides.openCatalogue === 'function') {
                help.push(actionItem('guide-catalogue', 'Parcours de formation', 'Training paths', 'fa-graduation-cap', function () { return guides.openCatalogue(); }));
            }
        }
        withGroup(items, 'pages', 'Pages', 'Pages', pages);
        pageGroups.forEach(function (children, label) { withGroup(items, groupKey(label), label, label, children); });
        withGroup(items, 'modules', 'Modules', 'Modules', modules);
        withGroup(items, 'help', 'Aide', 'Help', help);
        return items;
    }

    function moreItem(ul) {
        return Array.from(ul.children || []).find(function (item) {
            return item.id !== ITEM_ID && !!item.querySelector('a.nav-link i.fa-bars, a.nav-link i.fa-solid.fa-bars');
        }) || null;
    }

    function closeMenu(toggle) {
        try {
            if (window.bootstrap && window.bootstrap.Dropdown) window.bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
        } catch (_) {}
    }

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = '.pmk-own-tools>.dropdown-menu{padding:0;border:0;background:transparent;min-width:0;overflow:visible}';
        document.head.appendChild(style);
    }

    function renderFlat(menu, toggle, items) {
        items.forEach(function (item) {
            if (item.kind === 'group') return;
            const control = document.createElement(item.kind === 'link' ? 'a' : 'button');
            control.className = 'dropdown-item';
            control.textContent = french() ? item.labelFr : item.labelEn;
            if (item.kind === 'link') control.href = item.url;
            else {
                control.type = 'button';
                control.addEventListener('click', function (event) {
                    event.preventDefault();
                    closeMenu(toggle);
                    try { item.run(); } catch (error) { console.error('PMK — outil indisponible', item.id, error); }
                });
            }
            menu.appendChild(control);
        });
    }

    function render() {
        const ul = document.getElementById('toplevelmenu');
        if (!ul) return;
        const items = menuItems();
        const next = items.map(function (item) { return item.id + '\n' + item.kind + '\n' + (item.url || '') + '\n' + item.labelFr; }).join('\n');
        let li = document.getElementById(ITEM_ID);
        if (!items.length) {
            if (li) li.remove();
            signature = '';
            return;
        }
        if (li && li.parentElement === ul && next === signature) return;
        signature = next;
        ensureStyle();
        if (!li) {
            li = document.createElement('li');
            li.id = ITEM_ID;
            li.className = 'nav-item dropdown pmk-own-tools';
        }
        li.replaceChildren();
        const toggle = document.createElement('a');
        toggle.className = 'nav-link dropdown-toggle';
        toggle.href = '#';
        toggle.setAttribute('data-bs-toggle', 'dropdown');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.title = text('Outils, disponibles sans configurer un menu', 'Tools, available without configuring a menu');
        const icon = document.createElement('i');
        icon.className = 'fa fa-th-large';
        icon.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'nav-label';
        label.textContent = text('Outils', 'Tools');
        toggle.append(icon, document.createTextNode(' '), label);
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        if (window.PMKMenuEngine && typeof window.PMKMenuEngine.renderPanel === 'function') {
            menu.appendChild(window.PMKMenuEngine.renderPanel({
                title: text('Outils', 'Tools'),
                items: items,
                audience: 'all',
                onAction: function (item, event) {
                    if (event) event.preventDefault();
                    const found = items.find(function (candidate) { return candidate.id === item.id; });
                    closeMenu(toggle);
                    try { if (found && found.run) found.run(); } catch (error) { console.error('PMK — outil indisponible', item.id, error); }
                },
                onClose: function () { closeMenu(toggle); }
            }));
            if (!li.dataset.pmkOwnToolsBound) {
                li.dataset.pmkOwnToolsBound = '1';
                li.addEventListener('hidden.bs.dropdown', function () {
                    if (window.PMKMenuEngine && window.PMKMenuEngine.closeAll) window.PMKMenuEngine.closeAll(li);
                });
            }
        } else {
            renderFlat(menu, toggle, items);
        }
        li.append(toggle, menu);
        if (!ul.contains(li)) {
            const more = moreItem(ul);
            if (more) more.before(li);
            else ul.appendChild(li);
        }
    }

    function queue() {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
            queued = false;
            watchPageActivation();
            render();
        });
    }

    function watchPageActivation() {
        if (watchPageActivation.started || !window.PMKConfig || typeof window.PMKConfig.subscribe !== 'function') return;
        watchPageActivation.started = true;
        window.PMKConfig.subscribe('internal-pages-tools', queue);
    }

    window.PMKOwnTools = { refresh: queue };
    ['pmk:pages-ready', 'pmk:config-ready', 'pmk:personal-lists-state', 'pmk:history-state', 'pmk:advanced-search-state', 'pmk:guides-training-state', 'pmk:attendance-mediabus-state'].forEach(function (name) {
        window.addEventListener(name, queue);
    });
    document.addEventListener('pmk:attendance-mediabus-state', queue);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', queue, { once: true });
    else queue();
    window.setTimeout(queue, 800);
    window.setTimeout(queue, 2500);
})(window, document);
