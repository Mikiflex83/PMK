/* PimpMyKoha — accès direct aux outils.
 * Chaque outil activé apparaît ici. Le menu IntranetNav peut ajouter un
 * raccourci, mais il n’est pas nécessaire pour ouvrir ces outils.
 */
(function (window, document) {
    'use strict';
    if (window.PMKOwnTools) return;

    const ITEM_ID = 'pmk-own-tools';
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

    function entries() {
        const list = [];
        try {
            if (window.PMKPages && typeof window.PMKPages.canOpen === 'function' && window.PMKPages.canOpen('hub') && typeof window.PMKPages.urlFor === 'function') {
                list.push({ id: 'hub', label: text('Pages & outils internes', 'Internal pages & tools'), href: window.PMKPages.urlFor('hub') });
            }
        } catch (_) {}
        if (enabled(window.PMKPersonalLists) && typeof window.PMKPersonalLists.open === 'function') {
            list.push({ id: 'lists', label: text('Listes personnelles', 'Personal lists'), run: function () { return window.PMKPersonalLists.open(); } });
        }
        const history = window.PMKHistory071 || window.PMKRecentHistory || window.PMKHistory;
        if (enabled(history) && typeof history.open === 'function') {
            list.push({ id: 'history', label: text('Historique récent', 'Recent history'), run: function () { return history.open(); } });
        }
        if (enabled(window.PMKAdvancedSearch) && typeof window.PMKAdvancedSearch.open === 'function') {
            list.push({ id: 'search', label: text('Recherche avancée', 'Advanced search'), run: function () { return window.PMKAdvancedSearch.open(); } });
        }
        const attendance = window.PMKAttendanceMediabus;
        if (attendance && attendance.available === true && attendance.enabled !== false && typeof attendance.open === 'function') {
            list.push({ id: 'attendance', label: text('Compteur de fréquentation', 'Attendance counter'), run: function () { return attendance.open(); } });
        }
        const guides = window.PMKGuidesTraining;
        if (enabled(guides)) {
            if (typeof guides.startCurrent === 'function') {
                list.push({ id: 'guide-current', label: text('Guide de cet écran', 'Guide for this screen'), run: function () { return guides.startCurrent(); } });
            }
            if (typeof guides.openCatalogue === 'function') {
                list.push({ id: 'guide-catalogue', label: text('Parcours de formation', 'Training paths'), run: function () { return guides.openCatalogue(); } });
            }
        }
        return list;
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

    function render() {
        const ul = document.getElementById('toplevelmenu');
        if (!ul) return;
        const items = entries();
        const next = items.map(function (item) { return item.id + '\n' + item.label; }).join('\n');
        let li = document.getElementById(ITEM_ID);
        if (!items.length) {
            if (li) li.remove();
            signature = '';
            return;
        }
        if (li && li.parentElement === ul && next === signature) return;
        signature = next;
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
        items.forEach(function (item) {
            const control = document.createElement(item.href ? 'a' : 'button');
            control.className = 'dropdown-item';
            control.textContent = item.label;
            if (item.href) {
                control.href = item.href;
            } else {
                control.type = 'button';
                control.addEventListener('click', function (event) {
                    event.preventDefault();
                    closeMenu(toggle);
                    try { item.run(); } catch (error) { console.error('PMK — outil indisponible', item.id, error); }
                });
            }
            menu.appendChild(control);
        });
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
            render();
        });
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
