/*
 Nom du fichier : 134-intranetnav-menu.js
 Version : 1.6.0
 Date : 2026-09-25

 Module PimpMyKoha : Menu IntranetNav

 Objectifs :
 - injecter autant de menus principaux que nécessaire dans #toplevelmenu ;
 - créer autant d'entrées, groupes et sous-menus que nécessaire ;
 - profondeur de sous-menus non limitée par le moteur ;
 - choisir une icône Font Awesome ;
 - choisir l'accès : tous / superlibrarian / hérité du parent ;
 - gérer des liens et des actions PMK ;
 - intégrer l'accès aux modules autonomes 066-067, 071, 075 et 135 sans modifier leur logique métier ;
 - proposer des sous-menus latéraux, déroulés ou méga-menu ;
 - fournir un accès direct aux guides, parcours de formation et mode accompagnement ;
 - intégrer le compteur fréquentation Médiabus (139) comme action PMK uniquement sur MEDIABUS ;
 - masquer les anciens boutons de la barre basse seulement lorsque l'action correspondante
   est réellement disponible dans le nouveau menu ;
 - supprimer le menu Outils historique #custom-tools-menu pour éviter les doublons.
*/
(function () {
    'use strict';

    if (window.__PMK_INTRAnET_NAV_MENU__) return;
    window.__PMK_INTRAnET_NAV_MENU__ = true;

    const MODULE_ID = 'intranet-nav-menu';
    const STYLE_ID = 'pmk-intranet-nav-menu-styles';
    const LEGACY_LISTS_CLASS = 'pmk-hide-legacy-lists-entry';
    const LEGACY_HISTORY_CLASS = 'pmk-hide-legacy-history-entry';
    const LEGACY_ADVANCED_CLASS = 'pmk-hide-legacy-advanced-search-entry';
    const LEGACY_GUIDES_CLASS = 'pmk-hide-legacy-guides-entry';
    const OWN_CLASS = 'pmk-intranet-nav-menu';

    let currentConfig = null;
    let registered = false;
    let unsubscribe = null;
    let observer = null;
    let renderQueued = false;
    let rendering = false;

    const ICON_OPTIONS = [
        ['', { fr: 'Aucune icône', en: 'No icon' }],
        ['fa-wrench', { fr: 'Outils', en: 'Tools' }],
        ['fa-bookmark', { fr: 'Marque-page / listes', en: 'Bookmark / lists' }],
        ['fa-list', { fr: 'Liste', en: 'List' }],
        ['fa-folder-open', { fr: 'Dossier', en: 'Folder' }],
        ['fa-sitemap', { fr: 'Arborescence', en: 'Tree' }],
        ['fa-dashboard', { fr: 'Tableau de bord', en: 'Dashboard' }],
        ['fa-search', { fr: 'Recherche', en: 'Search' }],
        ['fa-search-plus', { fr: 'Recherche avancée', en: 'Advanced search' }],
        ['fa-clock-o', { fr: 'Historique', en: 'History' }],
        ['fa-graduation-cap', { fr: 'Formation', en: 'Training' }],
        ['fa-question-circle', { fr: 'Aide', en: 'Help' }],
        ['fa-compass', { fr: 'Guide', en: 'Guide' }],
        ['fa-life-ring', { fr: 'Accompagnement', en: 'Assistance' }],
        ['fa-calendar', { fr: 'Calendrier', en: 'Calendar' }],
        ['fa-check-circle', { fr: 'Contrôle / qualité', en: 'Check / quality' }],
        ['fa-home', { fr: 'Accueil', en: 'Home' }],
        ['fa-book', { fr: 'Notice / livre', en: 'Record / book' }],
        ['fa-barcode', { fr: 'Code-barres / exemplaire', en: 'Barcode / item' }],
        ['fa-user-circle', { fr: 'Utilisateur / autorité', en: 'User / authority' }],
        ['fa-users', { fr: 'Usagers', en: 'Patrons' }],
        ['fa-hand-paper-o', { fr: 'Réservation', en: 'Hold' }],
        ['fa-exchange', { fr: 'Transfert', en: 'Transfer' }],
        ['fa-retweet', { fr: 'Prêt / retour', en: 'Loan / return' }],
        ['fa-clipboard', { fr: 'Inventaire', en: 'Inventory' }],
        ['fa-trash', { fr: 'Suppression', en: 'Delete' }],
        ['fa-medkit', { fr: 'Restauration', en: 'Repair' }],
        ['fa-map-marker', { fr: 'Localisation', en: 'Location' }],
        ['fa-newspaper-o', { fr: 'Périodiques', en: 'Serials' }],
        ['fa-flask', { fr: 'Test / laboratoire', en: 'Test / lab' }],
        ['fa-cog', { fr: 'Configuration', en: 'Settings' }],
        ['fa-link', { fr: 'Lien', en: 'Link' }]
    ];

    function uid(prefix) {
        const p = String(prefix || 'nav').replace(/[^a-z0-9_-]/gi, '-');
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return p + '-' + window.crypto.randomUUID();
        }
        return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function language() {
        if (window.PMKConfig && typeof window.PMKConfig.getLanguage === 'function') {
            return window.PMKConfig.getLanguage();
        }
        const value = String(document.documentElement.lang || navigator.language || 'fr').toLowerCase();
        return value.startsWith('en') ? 'en' : 'fr';
    }

    function tr(fr, en) {
        return language() === 'en' ? en : fr;
    }

    function labelOf(entry) {
        if (!entry) return '';
        const lang = language();
        const primary = lang === 'en' ? entry.labelEn : entry.labelFr;
        const fallback = lang === 'en' ? entry.labelFr : entry.labelEn;
        return String(primary || fallback || '').trim();
    }

    function effectiveIcon(entry) {
        const custom = String(entry && entry.iconCustom || '').trim();
        if (custom) return custom;
        return String(entry && entry.icon || '').trim();
    }

    function iconClass(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const parts = raw.split(/\s+/).filter(Boolean);
        const hasStyle = parts.some(function (part) {
            return part === 'fa' || /^fa-(?:solid|regular|brands|light|thin|duotone)$/.test(part);
        });
        if (!hasStyle) parts.unshift('fa');
        if (!parts.includes('fa-fw')) parts.push('fa-fw');
        return parts.join(' ');
    }

    function appendIcon(target, entry) {
        const cls = iconClass(effectiveIcon(entry));
        if (!cls) return;
        const i = document.createElement('i');
        i.className = cls;
        i.setAttribute('aria-hidden', 'true');
        target.appendChild(i);
    }

    function isSuperlibrarian() {
        if (window.PMKConfig && typeof window.PMKConfig.isKohaSuperlibrarian === 'function') {
            try { return !!window.PMKConfig.isKohaSuperlibrarian(); } catch (_) {}
        }

        const userEl = document.querySelector(
            '#logged-in-info-full .loggedinusername[data-loggedinusername], ' +
            '.loggedinusername[data-loggedinusername]'
        );
        if (!userEl) return false;
        return userEl.dataset.isSuperlibrarian === 'is_superlibrarian' ||
            userEl.classList.contains('is_superlibrarian');
    }

    function canSee(audience, parentAudience) {
        const requested = audience === 'all' || audience === 'superlibrarian'
            ? audience
            : (parentAudience || 'all');
        if (requested === 'superlibrarian') return isSuperlibrarian();
        return true;
    }

    function inheritedAudience(audience, parentAudience) {
        const own = audience === 'all' || audience === 'superlibrarian'
            ? audience
            : (parentAudience || 'all');
        if (parentAudience === 'superlibrarian') return 'superlibrarian';
        return own;
    }

    function menuAtPath(root, path) {
        const menuIndex = Array.isArray(path) && path[0] === 'menus' ? Number(path[1]) : NaN;
        return Number.isInteger(menuIndex) && root && Array.isArray(root.menus)
            ? root.menus[menuIndex]
            : null;
    }

    function itemAtPath(root, path) {
        const menu = menuAtPath(root, path);
        const itemsIndex = Array.isArray(path) ? path.indexOf('items') : -1;
        if (!menu || itemsIndex < 0) return null;
        const itemIndex = Number(path[itemsIndex + 1]);
        return Number.isInteger(itemIndex) && Array.isArray(menu.items)
            ? menu.items[itemIndex]
            : null;
    }

    function descendantsOf(items, id) {
        const result = new Set();
        let changed = true;
        while (changed) {
            changed = false;
            (items || []).forEach(function (candidate) {
                if (!candidate || !candidate.id || result.has(candidate.id)) return;
                if (candidate.parentId === id || result.has(candidate.parentId)) {
                    result.add(candidate.id);
                    changed = true;
                }
            });
        }
        return result;
    }

    function parentOptions(root, fieldPath) {
        const menu = menuAtPath(root, fieldPath);
        const current = itemAtPath(root, fieldPath);
        const items = menu && Array.isArray(menu.items) ? menu.items : [];
        const forbidden = current ? descendantsOf(items, current.id) : new Set();
        if (current && current.id) forbidden.add(current.id);

        const options = [{
            value: '',
            label: { fr: 'Racine du menu', en: 'Menu root' }
        }];

        items.forEach(function (item) {
            if (!item || !item.id || forbidden.has(item.id)) return;
            if (item.kind !== 'submenu' && item.kind !== 'group') return;
            const kind = item.kind === 'submenu'
                ? { fr: 'Sous-menu', en: 'Submenu' }
                : { fr: 'Groupe', en: 'Group' };
            const frLabel = String(item.labelFr || item.labelEn || item.id);
            const enLabel = String(item.labelEn || item.labelFr || item.id);
            options.push({
                value: item.id,
                label: {
                    fr: kind.fr + ' — ' + frLabel,
                    en: kind.en + ' — ' + enLabel
                }
            });
        });

        return options;
    }

    function itemKind(root, path) {
        const item = itemAtPath(root, path);
        return item ? item.kind : '';
    }

    function makeItem(kind, values) {
        return Object.assign({
            id: uid('item'),
            enabled: true,
            kind: kind || 'link',
            parentId: '',
            labelFr: '',
            labelEn: '',
            icon: '',
            iconCustom: '',
            audience: 'inherit',
            url: '',
            target: 'same',
            actionId: '',
            presentation: 'side',
            megaColumns: 3
        }, values || {});
    }

    function defaultItems() {
        return [
            makeItem('group', {
                id: 'tools-group',
                labelFr: 'Outils',
                labelEn: 'Tools',
                audience: 'all'
            }),
            makeItem('link', {
                id: 'collections-tree', parentId: 'tools-group',
                labelFr: 'Arborescence des collections', labelEn: 'Collections tree',
                icon: 'fa-sitemap', url: '/cgi-bin/koha/tools/page.pl?page_id=114', target: 'new'
            }),
            makeItem('action', {
                id: 'dashboard', parentId: 'tools-group',
                labelFr: 'Tableau de bord', labelEn: 'Dashboard',
                icon: 'fa-dashboard', actionId: 'dashboard',
                url: '/cgi-bin/koha/circ/circulation.pl#', target: 'same'
            }),
            makeItem('link', {
                id: 'item-search', parentId: 'tools-group',
                labelFr: "Recherche d'exemplaires", labelEn: 'Item search',
                icon: 'fa-search', url: '/cgi-bin/koha/reports/guided_reports.pl?id=4323&op=run', target: 'same'
            }),
            makeItem('link', {
                id: 'appointments', parentId: 'tools-group',
                labelFr: 'RDV et sondages', labelEn: 'Appointments and surveys',
                icon: 'fa-calendar', url: '/cgi-bin/koha/mainpage.pl?pmk_page=appointments', target: 'new'
            }),

            makeItem('separator', { id: 'sep-my-tools', audience: 'all' }),
            makeItem('group', {
                id: 'my-tools-group',
                labelFr: 'Mes outils', labelEn: 'My tools', audience: 'all'
            }),
            makeItem('action', {
                id: 'personal-lists', parentId: 'my-tools-group',
                labelFr: 'Listes personnelles', labelEn: 'Personal lists',
                icon: 'fa-bookmark', actionId: 'personal-lists', audience: 'inherit'
            }),
            makeItem('action', {
                id: 'recent-history', parentId: 'my-tools-group',
                labelFr: 'Historique récent', labelEn: 'Recent history',
                icon: 'fa-clock-o', actionId: 'recent-history', audience: 'inherit'
            }),
            makeItem('action', {
                id: 'advanced-search', parentId: 'my-tools-group',
                labelFr: 'Recherche avancée', labelEn: 'Advanced search',
                icon: 'fa-search-plus', actionId: 'advanced-search', audience: 'inherit'
            }),
            makeItem('action', {
                id: 'attendance-mediabus', parentId: 'my-tools-group',
                labelFr: 'Compteur de fréquentation', labelEn: 'Attendance counter',
                icon: 'fa-plus-square', actionId: 'attendance-mediabus', audience: 'inherit'
            }),
            makeItem('submenu', {
                id: 'guides-training-menu', parentId: 'my-tools-group',
                labelFr: 'Aide & formation', labelEn: 'Help & training',
                icon: 'fa-graduation-cap', audience: 'inherit',
                presentation: 'side'
            }),
            makeItem('action', {
                id: 'guides-current', parentId: 'guides-training-menu',
                labelFr: 'Guide de cet écran', labelEn: 'Guide for this screen',
                icon: 'fa-compass', actionId: 'guides-current', audience: 'inherit'
            }),
            makeItem('action', {
                id: 'guides-catalogue', parentId: 'guides-training-menu',
                labelFr: 'Parcours de formation', labelEn: 'Training paths',
                icon: 'fa-graduation-cap', actionId: 'guides-catalogue', audience: 'inherit'
            }),
            makeItem('action', {
                id: 'guides-assist-toggle', parentId: 'guides-training-menu',
                labelFr: 'Mode accompagnement', labelEn: 'Contextual assistance',
                icon: 'fa-life-ring', actionId: 'guides-assist-toggle', audience: 'inherit'
            }),

            makeItem('separator', { id: 'sep-admin', audience: 'superlibrarian' }),
            makeItem('group', {
                id: 'admin-group',
                labelFr: 'Administration', labelEn: 'Administration', audience: 'superlibrarian'
            }),
            makeItem('link', {
                id: 'internal-pages-hub', parentId: 'admin-group',
                labelFr: 'Pages & outils internes', labelEn: 'Internal pages & tools',
                icon: 'fa-th-large', url: '/cgi-bin/koha/mainpage.pl?pmk_page=hub', target: 'new'
            }),
            makeItem('link', {
                id: 'attendance-report', parentId: 'admin-group',
                labelFr: 'Fréquentation — rapports', labelEn: 'Attendance — reports',
                icon: 'fa-bar-chart', url: '/cgi-bin/koha/mainpage.pl?pmk_page=attendance-counter', target: 'new'
            }),
            makeItem('submenu', {
                id: 'quality-center', parentId: 'admin-group',
                labelFr: 'Centre qualité', labelEn: 'Quality center',
                icon: 'fa-check-circle', audience: 'inherit'
            }),
            makeItem('link', {
                id: 'quality-home', parentId: 'quality-center',
                labelFr: 'Ouvrir le Centre qualité', labelEn: 'Open Quality center',
                icon: 'fa-home', url: '/cgi-bin/koha/mainpage.pl?pmk_page=quality-center', target: 'new'
            }),
            makeItem('separator', { id: 'quality-sep', parentId: 'quality-center' }),
            makeItem('link', {
                id: 'quality-notices', parentId: 'quality-center',
                labelFr: 'Notices', labelEn: 'Records', icon: 'fa-book',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=biblios', target: 'new'
            }),
            makeItem('link', {
                id: 'quality-items', parentId: 'quality-center',
                labelFr: 'Exemplaires', labelEn: 'Items', icon: 'fa-barcode',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=items', target: 'new'
            }),
            makeItem('link', {
                id: 'quality-authorities', parentId: 'quality-center',
                labelFr: 'Autorités', labelEn: 'Authorities', icon: 'fa-user-circle',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=authorities', target: 'new'
            }),
            makeItem('link', {
                id: 'quality-holds', parentId: 'quality-center',
                labelFr: 'Réservations', labelEn: 'Holds', icon: 'fa-hand-paper-o',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=reservations', target: 'new'
            }),
            makeItem('link', {
                id: 'quality-transfers', parentId: 'quality-center',
                labelFr: 'Transferts', labelEn: 'Transfers', icon: 'fa-exchange',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=transfers', target: 'new'
            }),
            makeItem('link', {
                id: 'quality-loans', parentId: 'quality-center',
                labelFr: 'Prêts & litiges', labelEn: 'Loans & disputes', icon: 'fa-retweet',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=loans', target: 'new'
            }),
            makeItem('link', {
                id: 'quality-patrons', parentId: 'quality-center',
                labelFr: 'Comptes lecteurs', labelEn: 'Patron accounts', icon: 'fa-users',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=patrons', target: 'new'
            }),
            makeItem('link', {
                id: 'quality-serials', parentId: 'quality-center',
                labelFr: 'Périodiques', labelEn: 'Serials', icon: 'fa-newspaper-o',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=serials', target: 'new'
            }),
            makeItem('link', {
                id: 'inventory', parentId: 'admin-group',
                labelFr: 'Inventaire', labelEn: 'Inventory', icon: 'fa-clipboard',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=inventory', target: 'new'
            }),
            makeItem('link', {
                id: 'weeding', parentId: 'admin-group',
                labelFr: 'Désherbage', labelEn: 'Weeding', icon: 'fa-trash',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=weeding', target: 'new'
            }),
            makeItem('link', {
                id: 'restoration', parentId: 'admin-group',
                labelFr: 'Restauration', labelEn: 'Restoration', icon: 'fa-medkit',
                url: '/cgi-bin/koha/mainpage.pl?pmk_page=restore-deleted-items', target: 'new'
            }),
            makeItem('link', {
                id: 'patron-map', parentId: 'admin-group',
                labelFr: 'Carto adhérents', labelEn: 'Patron map', icon: 'fa-map-marker',
                url: '/cgi-bin/koha/tools/page.pl?page_id=130', target: 'new'
            }),
            makeItem('link', {
                id: 'heritage-funds', parentId: 'admin-group',
                labelFr: 'Suivi Fonds Pat.', labelEn: 'Heritage funds follow-up', icon: 'fa-book',
                url: '/cgi-bin/koha/tools/page.pl?page_id=119', target: 'new'
            }),
            makeItem('link', {
                id: 'serials-delete', parentId: 'admin-group',
                labelFr: 'Périodiques à supprimer', labelEn: 'Serials to delete', icon: 'fa-newspaper-o',
                url: '/cgi-bin/koha/reports/guided_reports.pl?id=5056&param_name=Site%7Cbranches%3Aall&sql_params=%25&op=run', target: 'new'
            })
        ];
    }

    function makeMenu(values) {
        return Object.assign({
            id: uid('menu'),
            enabled: true,
            labelFr: 'Nouveau menu',
            labelEn: 'New menu',
            icon: 'fa-wrench',
            iconCustom: '',
            audience: 'all',
            items: []
        }, values || {});
    }

    const DEFAULTS = {
        enabled: true,
        migrationVersion: 7,
        removeLegacyHardcodedMenu: true,
        hideLegacyListsButton: true,
        hideLegacyHistoryButton: true,
        hideLegacyAdvancedSearchButton: true,
        hideLegacyGuidesButton: true,
        collapseLabelsOnSmallScreens: true,
        menus: [
            makeMenu({
                id: 'tools',
                labelFr: 'Outils',
                labelEn: 'Tools',
                icon: 'fa-wrench',
                audience: 'all',
                items: defaultItems()
            })
        ]
    };

    function newMenu() {
        return makeMenu();
    }

    function newItem() {
        return makeItem('link', {
            labelFr: 'Nouvel élément',
            labelEn: 'New item',
            icon: 'fa-link'
        });
    }

    function iconOptions() {
        return ICON_OPTIONS.map(function (entry) {
            return { value: entry[0], label: entry[1] };
        });
    }

    function renderIntranetNavBuilder(context) {
        return window.PMKMenuEngine.renderEditor(context);
    }

    function moduleSchema() {
        return [
            {
                key: 'removeLegacyHardcodedMenu',
                type: 'boolean',
                label: {
                    fr: 'Remplacer le menu Outils historique de IntranetNav',
                    en: 'Replace the historical IntranetNav Tools menu'
                },
                help: {
                    fr: 'Supprime #custom-tools-menu pour éviter les doublons pendant la migration. Activé par défaut.',
                    en: 'Removes #custom-tools-menu to avoid duplicates during migration. Enabled by default.'
                }
            },
            {
                key: 'hideLegacyListsButton',
                type: 'boolean',
                label: {
                    fr: 'Masquer l’ancien bouton « Listes » de la barre basse',
                    en: 'Hide the old Lists button from the bottom bar'
                },
                help: {
                    fr: 'Le bouton #sidebar5 n’est masqué que si une action « Listes personnelles » active existe dans un menu visible.',
                    en: 'The #sidebar5 button is hidden only when an active Personal lists action exists in a visible menu.'
                }
            },
            {
                key: 'hideLegacyHistoryButton',
                type: 'boolean',
                label: {
                    fr: 'Masquer l’ancien bouton « Historique » de la barre basse',
                    en: 'Hide the old History button from the bottom bar'
                },
                help: {
                    fr: 'Le bouton #historique n’est masqué que si une action « Historique récent » active existe dans un menu visible et que le module 071 est disponible.',
                    en: 'The #historique button is hidden only when a visible Recent history action exists and module 071 is available.'
                }
            },
            {
                key: 'hideLegacyAdvancedSearchButton',
                type: 'boolean',
                label: {
                    fr: 'Masquer l’ancien bouton « Recherche avancée » de la barre basse',
                    en: 'Hide the old Advanced search button from the bottom bar'
                },
                help: {
                    fr: 'Le bouton #advancedSearch n’est masqué que si une action « Recherche avancée » active existe dans un menu visible et que le module 075 est disponible.',
                    en: 'The #advancedSearch button is hidden only when a visible Advanced search action exists and module 075 is available.'
                }
            },
            {
                key: 'hideLegacyGuidesButton',
                type: 'boolean',
                label: {
                    fr: 'Masquer l’ancien bouton « Aide & formation » de la barre basse',
                    en: 'Hide the old Help & training button from the bottom bar'
                },
                help: {
                    fr: 'Le bouton #tutoriel n’est masqué que si au moins un accès Guides & formation actif existe dans un menu visible et que le module 135 est disponible.',
                    en: 'The #tutoriel button is hidden only when at least one visible Guides & training action exists and module 135 is available.'
                }
            },
            {
                key: 'collapseLabelsOnSmallScreens',
                type: 'boolean',
                label: {
                    fr: 'N’afficher que les icônes des menus principaux sur petit écran',
                    en: 'Show only top-level menu icons on small screens'
                }
            },
            {
                key: '_builderSignal',
                type: 'text',
                label: { fr: 'Signal interne du constructeur', en: 'Builder internal signal' }
            },
            {
                type: 'custom',
                label: { fr: 'Composition visuelle du menu', en: 'Visual menu builder' },
                render: renderIntranetNavBuilder,
                help: {
                    fr: 'Cette vue représente les niveaux, séparateurs, groupes, sous-menus et l’ordre réellement utilisés dans IntranetNav. Glisse-dépose les éléments pour les réordonner ou changer de niveau. Les réglages techniques complets restent disponibles dans Réglages avancés.',
                    en: 'This view represents the actual levels, separators, groups, submenus and order used in IntranetNav. Drag and drop items to reorder or move them between levels. Full technical settings remain available in Advanced settings.'
                }
            },
            {
                key: 'menus',
                type: 'repeater',
                advanced: true,
                label: { fr: 'Menus IntranetNav', en: 'IntranetNav menus' },
                addLabel: { fr: 'Ajouter un menu', en: 'Add menu' },
                reorder: true,
                newItem: newMenu,
                liveTitleKey: 'labelFr',
                itemTitle: function (item, index, lang) {
                    const value = lang === 'en'
                        ? String(item && (item.labelEn || item.labelFr) || '')
                        : String(item && (item.labelFr || item.labelEn) || '');
                    return value.trim() || (lang === 'en' ? 'Menu ' : 'Menu ') + (index + 1);
                },
                fields: [
                    { key: 'enabled', type: 'boolean', label: { fr: 'Menu actif', en: 'Menu enabled' } },
                    { key: 'labelFr', type: 'text', label: { fr: 'Nom — français', en: 'Name — French' } },
                    { key: 'labelEn', type: 'text', label: { fr: 'Nom — anglais', en: 'Name — English' } },
                    {
                        key: 'icon', type: 'select', label: { fr: 'Icône', en: 'Icon' }, options: iconOptions
                    },
                    {
                        key: 'iconCustom', type: 'text', label: { fr: 'Icône personnalisée', en: 'Custom icon' },
                        advanced: true,
                        placeholder: { fr: 'Ex. fa-solid fa-star', en: 'E.g. fa-solid fa-star' },
                        help: {
                            fr: 'Optionnel. Si renseigné, remplace l’icône choisie ci-dessus.',
                            en: 'Optional. When filled, overrides the icon selected above.'
                        }
                    },
                    {
                        key: 'audience', type: 'select', label: { fr: 'Accès', en: 'Access' },
                        options: [
                            { value: 'all', label: { fr: 'Tous les agents', en: 'All staff' } },
                            { value: 'superlibrarian', label: { fr: 'Superlibrarian uniquement', en: 'Superlibrarian only' } }
                        ]
                    },
                    { key: 'id', type: 'text', readOnly: true, advanced: true, label: { fr: 'Identifiant technique', en: 'Technical ID' } },
                    {
                        key: 'items',
                        type: 'repeater',
                        label: { fr: 'Éléments du menu', en: 'Menu items' },
                        addLabel: { fr: 'Ajouter un élément', en: 'Add item' },
                        reorder: true,
                        newItem: newItem,
                        liveTitleKey: 'labelFr',
                        itemTitle: function (item, index, lang) {
                            if (item && item.kind === 'separator') return lang === 'en' ? 'Separator' : 'Séparateur';
                            const value = lang === 'en'
                                ? String(item && (item.labelEn || item.labelFr) || '')
                                : String(item && (item.labelFr || item.labelEn) || '');
                            return value.trim() || (lang === 'en' ? 'Item ' : 'Élément ') + (index + 1);
                        },
                        fields: [
                            { key: 'enabled', type: 'boolean', label: { fr: 'Élément actif', en: 'Item enabled' } },
                            {
                                key: 'kind', type: 'select', refreshOnChange: true,
                                label: { fr: 'Type', en: 'Type' },
                                options: [
                                    { value: 'link', label: { fr: 'Lien', en: 'Link' } },
                                    { value: 'submenu', label: { fr: 'Sous-menu', en: 'Submenu' } },
                                    { value: 'group', label: { fr: 'Groupe / titre', en: 'Group / heading' } },
                                    { value: 'separator', label: { fr: 'Séparateur', en: 'Separator' } },
                                    { value: 'action', label: { fr: 'Action PMK', en: 'PMK action' } }
                                ]
                            },
                            {
                                key: 'parentId', type: 'select',
                                label: { fr: 'Placer dans', en: 'Place inside' },
                                options: parentOptions,
                                help: {
                                    fr: 'Choisis la racine, un groupe ou n’importe quel sous-menu. Cette relation permet une profondeur de sous-menus libre.',
                                    en: 'Choose the root, a group, or any submenu. This relation allows unrestricted submenu depth.'
                                }
                            },
                            {
                                key: 'labelFr', type: 'text', label: { fr: 'Libellé — français', en: 'Label — French' },
                                when: function (root, path) { return itemKind(root, path) !== 'separator'; }
                            },
                            {
                                key: 'labelEn', type: 'text', label: { fr: 'Libellé — anglais', en: 'Label — English' },
                                when: function (root, path) { return itemKind(root, path) !== 'separator'; }
                            },
                            {
                                key: 'icon', type: 'select', label: { fr: 'Icône', en: 'Icon' }, options: iconOptions,
                                when: function (root, path) {
                                    const kind = itemKind(root, path);
                                    return kind !== 'separator' && kind !== 'group';
                                }
                            },
                            {
                                key: 'iconCustom', type: 'text', label: { fr: 'Icône personnalisée', en: 'Custom icon' },
                                advanced: true,
                                placeholder: { fr: 'Ex. fa-solid fa-star', en: 'E.g. fa-solid fa-star' },
                                when: function (root, path) {
                                    const kind = itemKind(root, path);
                                    return kind !== 'separator' && kind !== 'group';
                                }
                            },
                            {
                                key: 'presentation', type: 'select', refreshOnChange: true,
                                label: { fr: 'Présentation du sous-menu', en: 'Submenu presentation' },
                                when: function (root, path) { return itemKind(root, path) === 'submenu'; },
                                options: [
                                    { value: 'side', label: { fr: 'Latéral', en: 'Side' } },
                                    { value: 'dropdown', label: { fr: 'Déroulé vertical', en: 'Vertical dropdown' } },
                                    { value: 'mega', label: { fr: 'Méga-menu', en: 'Mega menu' } }
                                ],
                                help: {
                                    fr: 'Latéral conserve le comportement historique. Déroulé développe le contenu dans le menu courant. Méga-menu ouvre un panneau large en colonnes.',
                                    en: 'Side preserves the historical behavior. Vertical dropdown expands inside the current menu. Mega menu opens a wide multi-column panel.'
                                }
                            },
                            {
                                key: 'megaColumns', type: 'select',
                                label: { fr: 'Colonnes du méga-menu', en: 'Mega menu columns' },
                                when: function (root, path) {
                                    const item = itemAtPath(root, path);
                                    return itemKind(root, path) === 'submenu' && item && item.presentation === 'mega';
                                },
                                options: [
                                    { value: 2, label: { fr: '2 colonnes', en: '2 columns' } },
                                    { value: 3, label: { fr: '3 colonnes', en: '3 columns' } },
                                    { value: 4, label: { fr: '4 colonnes', en: '4 columns' } }
                                ]
                            },
                            {
                                key: 'audience', type: 'select', label: { fr: 'Accès', en: 'Access' },
                                options: [
                                    { value: 'inherit', label: { fr: 'Hériter du parent', en: 'Inherit from parent' } },
                                    { value: 'all', label: { fr: 'Tous les agents', en: 'All staff' } },
                                    { value: 'superlibrarian', label: { fr: 'Superlibrarian uniquement', en: 'Superlibrarian only' } }
                                ]
                            },
                            {
                                key: 'url', type: 'text', label: { fr: 'URL', en: 'URL' },
                                when: function (root, path) {
                                    const kind = itemKind(root, path);
                                    if (kind === 'link') return true;
                                    const item = itemAtPath(root, path);
                                    return kind === 'action' && item && item.actionId === 'dashboard';
                                }
                            },
                            {
                                key: 'target', type: 'select', label: { fr: 'Ouverture', en: 'Open in' },
                                when: function (root, path) {
                                    const kind = itemKind(root, path);
                                    if (kind === 'link') return true;
                                    const item = itemAtPath(root, path);
                                    return kind === 'action' && item && item.actionId === 'dashboard';
                                },
                                options: [
                                    { value: 'same', label: { fr: 'Même onglet', en: 'Same tab' } },
                                    { value: 'new', label: { fr: 'Nouvel onglet', en: 'New tab' } }
                                ]
                            },
                            {
                                key: 'actionId', type: 'select', refreshOnChange: true,
                                label: { fr: 'Action', en: 'Action' },
                                when: function (root, path) { return itemKind(root, path) === 'action'; },
                                options: [
                                    { value: '', label: { fr: 'Choisir une action', en: 'Choose an action' } },
                                    { value: 'personal-lists', label: { fr: 'Ouvrir les listes personnelles (066-067)', en: 'Open personal lists (066-067)' } },
                                    { value: 'recent-history', label: { fr: 'Ouvrir l’historique récent (071)', en: 'Open recent history (071)' } },
                                    { value: 'advanced-search', label: { fr: 'Ouvrir la recherche avancée (075)', en: 'Open advanced search (075)' } },
                                    { value: 'attendance-mediabus', label: { fr: 'Afficher le compteur de fréquentation', en: 'Show attendance counter' } },
                                    { value: 'guides-current', label: { fr: 'Lancer le guide de cet écran (135)', en: 'Start guide for this screen (135)' } },
                                    { value: 'guides-catalogue', label: { fr: 'Ouvrir les parcours de formation (135)', en: 'Open training paths (135)' } },
                                    { value: 'guides-assist-toggle', label: { fr: 'Activer / désactiver le mode accompagnement (135)', en: 'Toggle contextual assistance (135)' } },
                                    { value: 'dashboard', label: { fr: 'Ouvrir le tableau de bord', en: 'Open dashboard' } }
                                ]
                            },
                            { key: 'id', type: 'text', readOnly: true, advanced: true, label: { fr: 'Identifiant technique', en: 'Technical ID' } }
                        ]
                    }
                ]
            }
        ];
    }

    function validateConfig(config) {
        const lang = language();
        const menus = Array.isArray(config && config.menus) ? config.menus : [];
        const menuIds = new Set();

        for (const menu of menus) {
            const menuId = String(menu && menu.id || '').trim();
            if (!menuId || menuIds.has(menuId)) {
                return { ok: false, message: lang === 'en' ? 'Each main menu must have a unique technical ID.' : 'Chaque menu principal doit avoir un identifiant technique unique.' };
            }
            menuIds.add(menuId);

            const items = Array.isArray(menu.items) ? menu.items : [];
            const byId = new Map();
            for (const item of items) {
                const id = String(item && item.id || '').trim();
                if (!id || byId.has(id)) {
                    return { ok: false, message: lang === 'en' ? 'Each menu item must have a unique technical ID.' : 'Chaque élément de menu doit avoir un identifiant technique unique.' };
                }
                byId.set(id, item);
            }

            for (const item of items) {
                const parentId = String(item.parentId || '').trim();
                if (!parentId) continue;
                const parent = byId.get(parentId);
                if (!parent || (parent.kind !== 'submenu' && parent.kind !== 'group')) {
                    return { ok: false, message: lang === 'en' ? 'A menu item references an invalid parent.' : 'Un élément de menu référence un parent invalide.' };
                }

                const visited = new Set([item.id]);
                let cursor = parent;
                while (cursor) {
                    if (visited.has(cursor.id)) {
                        return { ok: false, message: lang === 'en' ? 'A cycle was detected in the menu hierarchy.' : 'Une boucle a été détectée dans l’arborescence du menu.' };
                    }
                    visited.add(cursor.id);
                    cursor = cursor.parentId ? byId.get(cursor.parentId) : null;
                }
            }
        }

        return { ok: true };
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .${OWN_CLASS} .dropdown-menu {
                background-color: #fff;
                color: #212529;
                border: 1px solid rgba(0,0,0,.15);
                box-shadow: 0 .25rem .75rem rgba(0,0,0,.12);
            }
            .${OWN_CLASS} .dropdown-item {
                color: #212529;
            }
            .${OWN_CLASS} .dropdown-item:hover,
            .${OWN_CLASS} .dropdown-item:focus {
                color: #16181b;
                background-color: #f1f3f5;
            }
            .${OWN_CLASS} .dropdown-header {
                color: #6c757d;
                font-weight: 600;
            }
            .${OWN_CLASS} .dropdown-divider {
                border-color: #dee2e6;
            }
            .${OWN_CLASS} .pmk-nav-submenu {
                position: relative;
            }
            .${OWN_CLASS} .pmk-nav-submenu > .pmk-submenu-toggle {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: .75rem;
                width: 100%;
                border: 0;
                background: transparent;
                text-align: left;
            }
            .${OWN_CLASS} .pmk-submenu-label {
                display: inline-flex;
                align-items: center;
                gap: .25rem;
                min-width: 0;
            }
            .${OWN_CLASS} .pmk-submenu-caret {
                margin-left: auto;
                transition: transform .15s ease;
            }
            .${OWN_CLASS} .pmk-nav-submenu.show > .pmk-submenu-toggle .pmk-submenu-caret {
                transform: rotate(90deg);
            }
            .${OWN_CLASS} .pmk-nav-submenu.pmk-submenu-side > .dropdown-menu {
                top: 0;
                left: 100%;
                margin-top: -.35rem;
                margin-left: .15rem;
                min-width: 250px;
            }
            .${OWN_CLASS} .pmk-nav-submenu.pmk-submenu-dropdown > .dropdown-menu {
                position: static !important;
                float: none !important;
                transform: none !important;
                margin: .15rem .4rem .35rem 1rem;
                border: 0;
                border-left: 2px solid #dee2e6;
                border-radius: 0;
                box-shadow: none;
                min-width: 0;
                padding-top: .15rem;
                padding-bottom: .15rem;
            }
            .${OWN_CLASS} .pmk-nav-submenu.pmk-submenu-dropdown > .pmk-submenu-toggle .pmk-submenu-caret {
                transform: rotate(90deg);
            }
            .${OWN_CLASS} .pmk-nav-submenu.pmk-submenu-dropdown.show > .pmk-submenu-toggle .pmk-submenu-caret {
                transform: rotate(270deg);
            }
            .${OWN_CLASS} .pmk-nav-submenu.pmk-submenu-mega > .dropdown-menu {
                top: 0;
                left: 100%;
                margin-top: -.35rem;
                margin-left: .15rem;
                width: min(760px, 72vw);
                min-width: 520px;
                padding: .65rem;
                display: none;
                grid-template-columns: repeat(var(--pmk-mega-columns, 3), minmax(0,1fr));
                gap: .2rem .65rem;
            }
            .${OWN_CLASS} .pmk-nav-submenu.pmk-submenu-mega > .dropdown-menu.show {
                display: grid;
            }
            .${OWN_CLASS} .pmk-nav-submenu.pmk-submenu-mega > .dropdown-menu > li {
                min-width: 0;
            }
            .${OWN_CLASS} .pmk-nav-submenu > .dropdown-menu.show {
                display: block;
            }
            .${OWN_CLASS} .pmk-nav-submenu.pmk-submenu-mega > .dropdown-menu.show {
                display: grid;
            }
            .${OWN_CLASS} .pmk-nav-group-children > .dropdown-item {
                padding-left: 1.55rem;
            }
            html.${LEGACY_LISTS_CLASS} #bottomActionBar #sidebar5 {
                display: none !important;
            }
            html.${LEGACY_HISTORY_CLASS} #bottomActionBar #historique {
                display: none !important;
            }
            html.${LEGACY_ADVANCED_CLASS} #bottomActionBar #advancedSearch {
                display: none !important;
            }
            html.${LEGACY_GUIDES_CLASS} #bottomActionBar #tutoriel {
                display: none !important;
            }
            @media (max-width: 991.98px) {
                .${OWN_CLASS} .pmk-nav-submenu > .dropdown-menu {
                    position: static !important;
                    float: none;
                    transform: none !important;
                    margin: .15rem .4rem .35rem 1rem;
                    border: 0;
                    border-left: 2px solid #dee2e6;
                    border-radius: 0;
                    box-shadow: none;
                    min-width: 0;
                }
                .${OWN_CLASS} .pmk-nav-submenu.pmk-submenu-mega > .dropdown-menu,
                .${OWN_CLASS} .pmk-nav-submenu.pmk-submenu-mega > .dropdown-menu.show {
                    width: auto;
                    min-width: 0;
                    display: block;
                    grid-template-columns: 1fr;
                }
                .${OWN_CLASS}.pmk-collapse-label .nav-label {
                    display: none !important;
                }
                .${OWN_CLASS}.pmk-collapse-label > .nav-link i {
                    margin-right: 0 !important;
                }
                .${OWN_CLASS}.pmk-collapse-label > .nav-link {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding-left: .65rem;
                    padding-right: .65rem;
                }
                .${OWN_CLASS}.pmk-collapse-label > .dropdown-toggle::after {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function removeOwnMenus() {
        document.querySelectorAll('.' + OWN_CLASS).forEach(function (node) { node.remove(); });
    }

    function removeLegacyMenu() {
        const legacy = document.getElementById('custom-tools-menu');
        if (legacy) legacy.remove();
    }

    function topLevelMenu() {
        return document.getElementById('toplevelmenu');
    }

    function moreMenuItem(ul) {
        return Array.from((ul && ul.children) || []).find(function (item) {
            return !!item.querySelector('a.nav-link i.fa-bars, a.nav-link i.fa-solid.fa-bars');
        }) || null;
    }

    function listActionAvailable() {
        if (window.PMKPersonalLists) return window.PMKPersonalLists.enabled !== false;
        return true;
    }

    function historyActionAvailable() {
        if (window.PMKHistory071) return window.PMKHistory071.enabled !== false;
        if (window.PMKRecentHistory) return window.PMKRecentHistory.enabled !== false;
        if (window.PMKHistory) return window.PMKHistory.enabled !== false;
        return !!((window.KOHA_HISTORY && typeof window.KOHA_HISTORY.open === 'function') || typeof window.openNav === 'function');
    }

    function advancedSearchActionAvailable() {
        if (window.PMKAdvancedSearch) return window.PMKAdvancedSearch.enabled !== false;
        return !!(window.__kohaAdvancedSearchSidebarV2 || typeof window.openAdvancedSearchSidebar === 'function' || typeof window.toggleAdvancedSearchSidebar === 'function');
    }

    function attendanceMediabusActionAvailable() {
        const bridge = window.PMKAttendanceMediabus;
        return !!(bridge && bridge.available === true && bridge.enabled !== false && typeof bridge.open === 'function');
    }

    function guidesModuleAvailable() {
        if (window.PMKGuidesTraining) return window.PMKGuidesTraining.enabled !== false;
        return !!window.KOHA_GUIDES;
    }

    function guidesCurrentActionAvailable() {
        if (!guidesModuleAvailable()) return false;
        if (window.PMKGuidesTraining && typeof window.PMKGuidesTraining.canStartCurrent === 'function') {
            try { return !!window.PMKGuidesTraining.canStartCurrent(); } catch (_) { return false; }
        }
        try {
            return !!(window.KOHA_GUIDES && typeof window.KOHA_GUIDES.currentGuide === 'function' && window.KOHA_GUIDES.currentGuide());
        } catch (_) { return false; }
    }

    function guidesCatalogueActionAvailable() {
        if (!guidesModuleAvailable()) return false;
        if (window.PMKGuidesTraining && typeof window.PMKGuidesTraining.canOpenCatalogue === 'function') {
            try { return !!window.PMKGuidesTraining.canOpenCatalogue(); } catch (_) { return false; }
        }
        return !!(window.KOHA_GUIDES && typeof window.KOHA_GUIDES.openCatalogue === 'function');
    }

    function guidesAssistActionAvailable() {
        if (!guidesModuleAvailable()) return false;
        if (window.PMKGuidesTraining && typeof window.PMKGuidesTraining.canUseAssist === 'function') {
            try { return !!window.PMKGuidesTraining.canUseAssist(); } catch (_) { return false; }
        }
        return !!(window.KOHA_GUIDES && window.KOHA_GUIDES.assist && typeof window.KOHA_GUIDES.assist.setEnabled === 'function');
    }

    function hasVisibleAction(config, actionId, availableFn) {
        if (!config || config.enabled === false) return false;
        if (typeof availableFn === 'function' && !availableFn()) return false;

        return (config.menus || []).some(function (menu) {
            if (!menu || menu.enabled === false || !canSee(menu.audience, 'all')) return false;
            const byId = new Map((menu.items || []).map(function (item) { return [item.id, item]; }));

            function visibleThroughParents(item) {
                let audience = menu.audience || 'all';
                let cursor = item;
                const visited = new Set();
                const chain = [];
                while (cursor) {
                    if (visited.has(cursor.id)) return false;
                    visited.add(cursor.id);
                    chain.unshift(cursor);
                    cursor = cursor.parentId ? byId.get(cursor.parentId) : null;
                }
                for (const node of chain) {
                    if (!node || node.enabled === false) return false;
                    audience = inheritedAudience(node.audience, audience);
                    if (!canSee(audience, audience)) return false;
                }
                return true;
            }

            return (menu.items || []).some(function (item) {
                return item && item.kind === 'action' && item.actionId === actionId && visibleThroughParents(item);
            });
        });
    }

    function syncLegacyButtons(config) {
        const enabled = !!(config && config.enabled !== false);

        const hideLists = !!(
            enabled &&
            config.hideLegacyListsButton !== false &&
            hasVisibleAction(config, 'personal-lists', listActionAvailable)
        );
        const hideHistory = !!(
            enabled &&
            config.hideLegacyHistoryButton !== false &&
            hasVisibleAction(config, 'recent-history', historyActionAvailable)
        );
        const hideAdvanced = !!(
            enabled &&
            config.hideLegacyAdvancedSearchButton !== false &&
            hasVisibleAction(config, 'advanced-search', advancedSearchActionAvailable)
        );
        const hideGuides = !!(
            enabled &&
            config.hideLegacyGuidesButton !== false &&
            (
                hasVisibleAction(config, 'guides-current', guidesCurrentActionAvailable) ||
                hasVisibleAction(config, 'guides-catalogue', guidesCatalogueActionAvailable) ||
                hasVisibleAction(config, 'guides-assist-toggle', guidesAssistActionAvailable)
            )
        );

        document.documentElement.classList.toggle(LEGACY_LISTS_CLASS, hideLists);
        document.documentElement.classList.toggle(LEGACY_HISTORY_CLASS, hideHistory);
        document.documentElement.classList.toggle(LEGACY_ADVANCED_CLASS, hideAdvanced);
        document.documentElement.classList.toggle(LEGACY_GUIDES_CLASS, hideGuides);
    }

    function childrenOf(items, parentId) {
        const wanted = String(parentId || '');
        return (items || []).filter(function (item) {
            return item && String(item.parentId || '') === wanted;
        });
    }

    function closeSiblingSubmenus(li) {
        const parent = li && li.parentElement;
        if (!parent) return;
        Array.from(parent.children).forEach(function (sibling) {
            if (sibling === li || !sibling.classList) return;
            if (sibling.classList.contains('pmk-nav-submenu')) {
                sibling.classList.remove('show');
                const menu = sibling.querySelector(':scope > .dropdown-menu');
                const toggle = sibling.querySelector(':scope > .pmk-submenu-toggle');
                if (menu) menu.classList.remove('show');
                if (toggle) toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function closeAllSubmenus(root) {
        if (!root) return;
        root.querySelectorAll('.pmk-nav-submenu.show').forEach(function (li) {
            li.classList.remove('show');
            const menu = li.querySelector(':scope > .dropdown-menu');
            const toggle = li.querySelector(':scope > .pmk-submenu-toggle');
            if (menu) menu.classList.remove('show');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
        });
    }

    function closeTopDropdown(node) {
        const root = node && node.closest ? node.closest('.' + OWN_CLASS) : null;
        const toggle = root && root.querySelector(':scope > .nav-link.dropdown-toggle');
        if (!toggle) return;
        try {
            if (window.bootstrap && window.bootstrap.Dropdown) {
                window.bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
            }
        } catch (_) {}
    }

    function runAction(item, event) {
        const actionId = String(item.actionId || '');
        if (actionId === 'personal-lists') {
            if (event) event.preventDefault();
            const bridge = window.PMKPersonalLists;
            if (bridge && typeof bridge.open === 'function') {
                bridge.open();
            } else if (typeof window.toggleSidebar5 === 'function') {
                window.toggleSidebar5();
            } else {
                try { document.dispatchEvent(new CustomEvent('pmk:open-personal-lists')); } catch (_) {}
            }
            closeTopDropdown(event && event.currentTarget);
            return;
        }

        if (actionId === 'recent-history') {
            if (event) event.preventDefault();

            const bridges = [
                window.PMKHistory071,
                window.PMKRecentHistory,
                window.PMKHistory
            ].filter(Boolean);
            const bridge = bridges.find(function (candidate) {
                return candidate && candidate.enabled !== false && typeof candidate.open === 'function';
            });

            if (bridge) {
                bridge.open();
            } else if (window.KOHA_HISTORY && typeof window.KOHA_HISTORY.open === 'function') {
                window.KOHA_HISTORY.open();
            } else if (typeof window.openNav === 'function') {
                window.openNav();
            } else {
                try { document.dispatchEvent(new CustomEvent('koha:requestOpenHistory')); } catch (_) {}
            }
            closeTopDropdown(event && event.currentTarget);
            return;
        }

        if (actionId === 'advanced-search') {
            if (event) event.preventDefault();

            const bridge = window.PMKAdvancedSearch;
            if (bridge && bridge.enabled !== false && typeof bridge.open === 'function') {
                bridge.open();
            } else if (typeof window.openAdvancedSearchSidebar === 'function') {
                window.openAdvancedSearchSidebar();
            } else if (typeof window.toggleAdvancedSearchSidebar === 'function') {
                window.toggleAdvancedSearchSidebar();
            } else {
                try { document.dispatchEvent(new CustomEvent('koha:toggleAdvancedSearch')); } catch (_) {}
            }
            closeTopDropdown(event && event.currentTarget);
            return;
        }

        if (actionId === 'attendance-mediabus') {
            if (event) event.preventDefault();
            const bridge = window.PMKAttendanceMediabus;
            if (bridge && bridge.available === true && bridge.enabled !== false && typeof bridge.open === 'function') {
                Promise.resolve(bridge.open()).finally(queueRender);
            }
            closeTopDropdown(event && event.currentTarget);
            return;
        }

        if (actionId === 'guides-current') {
            if (event) event.preventDefault();
            const bridge = window.PMKGuidesTraining;
            if (bridge && bridge.enabled !== false && typeof bridge.startCurrent === 'function') {
                bridge.startCurrent();
            } else if (window.KOHA_GUIDES && typeof window.KOHA_GUIDES.start === 'function') {
                window.KOHA_GUIDES.start();
            }
            closeTopDropdown(event && event.currentTarget);
            return;
        }

        if (actionId === 'guides-catalogue') {
            if (event) event.preventDefault();
            const bridge = window.PMKGuidesTraining;
            if (bridge && bridge.enabled !== false && typeof bridge.openCatalogue === 'function') {
                bridge.openCatalogue();
            } else if (window.KOHA_GUIDES && typeof window.KOHA_GUIDES.openCatalogue === 'function') {
                window.KOHA_GUIDES.openCatalogue();
            } else {
                try { document.dispatchEvent(new CustomEvent('koha:openGuideCatalogue')); } catch (_) {}
            }
            closeTopDropdown(event && event.currentTarget);
            return;
        }

        if (actionId === 'guides-assist-toggle') {
            if (event) event.preventDefault();
            const bridge = window.PMKGuidesTraining;
            if (bridge && bridge.enabled !== false && typeof bridge.toggleAssist === 'function') {
                Promise.resolve(bridge.toggleAssist()).finally(queueRender);
            } else if (window.KOHA_GUIDES && window.KOHA_GUIDES.assist) {
                try {
                    const on = typeof window.KOHA_GUIDES.assist.enabled === 'function' && window.KOHA_GUIDES.assist.enabled();
                    window.KOHA_GUIDES.assist.setEnabled(!on);
                    if (typeof window.KOHA_GUIDES.assist.refresh === 'function') window.KOHA_GUIDES.assist.refresh();
                } catch (_) {}
                queueRender();
            }
            return;
        }

        if (actionId === 'dashboard') {
            if (event) event.preventDefault();
            if (typeof window.loadDashboardKoha === 'function') {
                window.loadDashboardKoha();
                closeTopDropdown(event && event.currentTarget);
                return;
            }
            const url = String(item.url || '/cgi-bin/koha/circ/circulation.pl#');
            if (item.target === 'new') window.open(url, '_blank', 'noopener');
            else window.location.href = url;
            closeTopDropdown(event && event.currentTarget);
        }
    }

    function actionAvailable(id) {
        const checks = {'personal-lists':listActionAvailable,'recent-history':historyActionAvailable,
            'advanced-search':advancedSearchActionAvailable,'attendance-mediabus':attendanceMediabusActionAvailable,
            'guides-current':guidesCurrentActionAvailable,'guides-catalogue':guidesCatalogueActionAvailable,'guides-assist-toggle':guidesAssistActionAvailable};
        return !checks[id] || checks[id]();
    }

    function registerMenuActions() {
        const entries = {};
        ['personal-lists','recent-history','advanced-search','attendance-mediabus','guides-current','guides-catalogue','guides-assist-toggle','dashboard'].forEach(id => {
            entries[id]={available:()=>actionAvailable(id),run:runAction};
        });
        window.PMKMenuEngine.registerActions(entries);
    }

    function buildTopMenu(menuConfig) {
        const li = document.createElement('li');
        li.className = 'nav-item dropdown ' + OWN_CLASS;
        if (currentConfig && currentConfig.collapseLabelsOnSmallScreens !== false) {
            li.classList.add('pmk-collapse-label');
        }
        li.dataset.pmkMenuId = menuConfig.id;

        const toggle = document.createElement('a');
        toggle.className = 'nav-link dropdown-toggle';
        toggle.href = '#';
        toggle.role = 'button';
        toggle.setAttribute('data-bs-toggle', 'dropdown');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.title = labelOf(menuConfig);
        appendIcon(toggle, menuConfig);

        const label = document.createElement('span');
        label.className = 'nav-label';
        label.textContent = labelOf(menuConfig);
        toggle.appendChild(label);

        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-menu';
        dropdown.appendChild(window.PMKMenuEngine.renderPanel({title:labelOf(menuConfig),items:menuConfig.items || [],audience:menuConfig.audience || 'all',actionAvailable,onAction:runAction,onClose:function(){closeTopDropdown(toggle);}}));

        li.append(toggle, dropdown);
        li.addEventListener('hidden.bs.dropdown', function () { window.PMKMenuEngine.closeAll(li); });
        return li;
    }

    function normalizeOrphans(menu) {
        if (!menu || !Array.isArray(menu.items)) return menu;
        const ids = new Set(menu.items.map(function (item) { return item && item.id; }).filter(Boolean));
        menu.items.forEach(function (item) {
            if (item && item.parentId && !ids.has(item.parentId)) item.parentId = '';
        });
        return menu;
    }

    function render() {
        if (rendering) return;
        rendering = true;
        try {
            injectStyles();
            removeOwnMenus();

            const config = currentConfig || clone(DEFAULTS);
            if (config.removeLegacyHardcodedMenu !== false) removeLegacyMenu();

            syncLegacyButtons(config);

            if (config.enabled === false) return;

            const ul = topLevelMenu();
            if (!ul) return;
            const more = moreMenuItem(ul);

            (config.menus || []).forEach(function (sourceMenu) {
                if (!sourceMenu || sourceMenu.enabled === false) return;
                if (!canSee(sourceMenu.audience, 'all')) return;
                const menu = normalizeOrphans(sourceMenu);
                const node = buildTopMenu(menu);
                if (more) more.before(node);
                else ul.appendChild(node);
            });
        } finally {
            rendering = false;
        }
    }

    function queueRender() {
        if (renderQueued) return;
        renderQueued = true;
        window.requestAnimationFrame(function () {
            renderQueued = false;
            render();
        });
    }

    function watchDom() {
        if (observer) return;
        const root = document.documentElement;
        if (!root) return;
        observer = new MutationObserver(function (mutations) {
            if (rendering) return;
            let relevant = false;
            for (const mutation of mutations) {
                if (!mutation.addedNodes || !mutation.addedNodes.length) continue;
                for (const node of mutation.addedNodes) {
                    if (!node || node.nodeType !== 1) continue;
                    if (
                        node.id === 'custom-tools-menu' ||
                        node.id === 'toplevelmenu' ||
                        node.id === 'sidebar5' ||
                        node.id === 'historique' ||
                        node.id === 'advancedSearch' ||
                        node.id === 'tutoriel' ||
                        (node.querySelector && (
                            node.querySelector('#custom-tools-menu') ||
                            node.querySelector('#toplevelmenu') ||
                            node.querySelector('#sidebar5') ||
                            node.querySelector('#historique') ||
                            node.querySelector('#advancedSearch') ||
                            node.querySelector('#tutoriel')
                        ))
                    ) {
                        relevant = true;
                        break;
                    }
                }
                if (relevant) break;
            }
            if (relevant) queueRender();
        });
        observer.observe(root, { childList: true, subtree: true });
    }

    function hasAction(config, actionId) {
        return (config.menus || []).some(function (menu) {
            return Array.isArray(menu && menu.items) && menu.items.some(function (item) {
                return item && item.kind === 'action' && item.actionId === actionId;
            });
        });
    }

    function defaultActionItem(actionId) {
        const items = defaultItems();
        return items.find(function (item) {
            return item && item.kind === 'action' && item.actionId === actionId;
        }) || null;
    }

    function insertMigratedAction(config, actionId) {
        if (hasAction(config, actionId)) return false;

        const menus = Array.isArray(config.menus) ? config.menus : [];
        let menu = menus.find(function (entry) { return entry && entry.id === 'tools'; }) || menus[0];
        if (!menu) {
            menu = clone(DEFAULTS.menus[0]);
            config.menus = [menu];
        }
        if (!Array.isArray(menu.items)) menu.items = [];

        const source = defaultActionItem(actionId);
        if (!source) return false;

        const hasMyTools = menu.items.some(function (item) {
            return item && item.id === 'my-tools-group';
        });
        const migrated = clone(source);
        if (!hasMyTools) migrated.parentId = '';
        menu.items.push(migrated);
        return true;
    }

    function ensureSubmenuPresentation(config) {
        let changed = false;
        (config.menus || []).forEach(function (menu) {
            (menu && Array.isArray(menu.items) ? menu.items : []).forEach(function (item) {
                if (!item || item.kind !== 'submenu') return;
                if (!['side', 'dropdown', 'mega'].includes(String(item.presentation || ''))) {
                    item.presentation = 'side';
                    changed = true;
                }
                if (!item.megaColumns) {
                    item.megaColumns = 3;
                    changed = true;
                }
            });
        });
        return changed;
    }

    function insertGuidesTrainingBundle(config) {
        const menus = Array.isArray(config.menus) ? config.menus : [];
        let menu = menus.find(function (entry) { return entry && entry.id === 'tools'; }) || menus[0];
        if (!menu) {
            menu = clone(DEFAULTS.menus[0]);
            config.menus = [menu];
            return true;
        }
        if (!Array.isArray(menu.items)) menu.items = [];

        const alreadyHasGuides = menu.items.some(function (item) {
            return item && item.kind === 'action' && ['guides-current', 'guides-catalogue', 'guides-assist-toggle'].includes(item.actionId);
        });
        if (alreadyHasGuides) return false;

        const defaults = defaultItems();
        const ids = new Set(['guides-training-menu', 'guides-current', 'guides-catalogue', 'guides-assist-toggle']);
        const additions = defaults.filter(function (item) { return item && ids.has(item.id); }).map(clone);
        const hasMyTools = menu.items.some(function (item) { return item && item.id === 'my-tools-group'; });
        if (!hasMyTools) {
            additions.forEach(function (item) {
                if (item.id === 'guides-training-menu') item.parentId = '';
            });
        }
        menu.items.push.apply(menu.items, additions);
        return additions.length > 0;
    }


    function migrateGuidesSubmenuToSide(config) {
        let changed = false;

        (config.menus || []).forEach(function (menu) {
            (menu.items || []).forEach(function (item) {
                if (!item || item.id !== 'guides-training-menu') return;

                /*
                 * La présentation historique attendue pour Aide & formation
                 * est latérale : le sous-menu s'ouvre à droite du menu parent,
                 * pas à l'intérieur de celui-ci.
                 */
                if (item.presentation !== 'side') {
                    item.presentation = 'side';
                    changed = true;
                }
            });
        });

        return changed;
    }


    function migratePmk138VirtualPages(config) {
        let changed = false;
        const byId = {
            'appointments':'/cgi-bin/koha/mainpage.pl?pmk_page=appointments',
            'quality-home':'/cgi-bin/koha/mainpage.pl?pmk_page=quality-center',
            'quality-notices':'/cgi-bin/koha/mainpage.pl?pmk_page=biblios',
            'quality-items':'/cgi-bin/koha/mainpage.pl?pmk_page=items',
            'quality-authorities':'/cgi-bin/koha/mainpage.pl?pmk_page=authorities',
            'quality-holds':'/cgi-bin/koha/mainpage.pl?pmk_page=reservations',
            'quality-transfers':'/cgi-bin/koha/mainpage.pl?pmk_page=transfers',
            'quality-loans':'/cgi-bin/koha/mainpage.pl?pmk_page=loans',
            'quality-patrons':'/cgi-bin/koha/mainpage.pl?pmk_page=patrons',
            'quality-rules':'/cgi-bin/koha/mainpage.pl?pmk_page=quality-center',
            'inventory':'/cgi-bin/koha/mainpage.pl?pmk_page=inventory',
            'weeding':'/cgi-bin/koha/mainpage.pl?pmk_page=weeding',
            'restoration':'/cgi-bin/koha/mainpage.pl?pmk_page=restore-deleted-items'
        };
        (config.menus || []).forEach(function(menu){
            const items = Array.isArray(menu.items) ? menu.items : [];
            items.forEach(function(item){
                if (!item || !byId[item.id]) return;
                if (item.url !== byId[item.id]) { item.url = byId[item.id]; changed = true; }
            });
            const admin = items.find(function(item){ return item && item.id === 'admin-group'; });
            if (admin && !items.some(function(item){ return item && item.id === 'internal-pages-hub'; })) {
                items.push(makeItem('link', {
                    id:'internal-pages-hub', parentId:'admin-group',
                    labelFr:'Pages & outils internes', labelEn:'Internal pages & tools',
                    icon:'fa-th-large', url:'/cgi-bin/koha/mainpage.pl?pmk_page=hub', target:'new', audience:'inherit'
                }));
                changed = true;
            }
            const quality = items.find(function(item){ return item && item.id === 'quality-center'; });
            if (quality && !items.some(function(item){ return item && item.id === 'quality-serials'; })) {
                items.push(makeItem('link', {
                    id:'quality-serials', parentId:'quality-center',
                    labelFr:'Périodiques', labelEn:'Serials', icon:'fa-newspaper-o',
                    url:'/cgi-bin/koha/mainpage.pl?pmk_page=serials', target:'new', audience:'inherit'
                }));
                changed = true;
            }
        });
        return changed;
    }

    function insertAttendanceReportLink(config) {
        const menus = Array.isArray(config.menus) ? config.menus : [];
        let menu = menus.find(function(entry){ return entry && entry.id === 'tools'; }) || menus[0];
        if (!menu) {
            menu = clone(DEFAULTS.menus[0]);
            config.menus = [menu];
            return true;
        }
        if (!Array.isArray(menu.items)) menu.items = [];
        if (menu.items.some(function(item){ return item && (item.id === 'attendance-report' || String(item.url || '').includes('pmk_page=attendance-counter')); })) return false;
        const source = defaultItems().find(function(item){ return item && item.id === 'attendance-report'; });
        if (!source) return false;
        const migrated = clone(source);
        if (!menu.items.some(function(item){ return item && item.id === 'admin-group'; })) migrated.parentId = '';
        menu.items.push(migrated);
        return true;
    }

    function migrateConfig(config) {
        const supplied = config && typeof config === 'object' ? clone(config) : {};
        const cfg = Object.assign(clone(DEFAULTS), supplied);
        if (!Array.isArray(cfg.menus)) cfg.menus = clone(DEFAULTS.menus);

        let version = Number(supplied.migrationVersion || 0);
        let changed = false;

        if (version < 1) {
            changed = insertMigratedAction(cfg, 'recent-history') || changed;
            version = 1;
        }
        if (version < 2) {
            changed = insertMigratedAction(cfg, 'advanced-search') || changed;
            version = 2;
        }
        if (version < 3) {
            changed = ensureSubmenuPresentation(cfg) || changed;
            version = 3;
        }
        if (version < 4) {
            changed = insertGuidesTrainingBundle(cfg) || changed;
            version = 4;
        }

        /*
         * v5 : le sous-menu « Aide & formation » passe en présentation
         * latérale. Cette migration s'applique aussi aux configurations
         * 134 v1.4.0 déjà enregistrées avec presentation = "dropdown".
         */
        if (version < 5) {
            changed = migrateGuidesSubmenuToSide(cfg) || changed;
            version = 5;
        }
        if (version < 6) {
            changed = migratePmk138VirtualPages(cfg) || changed;
            version = 6;
        }

        if (version < 7) {
            changed = insertMigratedAction(cfg, 'attendance-mediabus') || changed;
            changed = insertAttendanceReportLink(cfg) || changed;
            version = 7;
        }

        if (cfg.migrationVersion !== version) {
            cfg.migrationVersion = version;
            changed = true;
        }

        return { config: cfg, changed: changed };
    }

    let migrationSaveInFlight = false;

    function applyConfig(config) {
        const migrated = migrateConfig(config);
        currentConfig = migrated.config;
        queueRender();


    }

    function registerWithPMK() {
        if (!window.PMKConfig || registered) return false;
        registered = true;
        registerMenuActions();

        window.PMKConfig.registerModule({
            id: MODULE_ID,
            schemaVersion: 8,
            name: {
                fr: 'Menu IntranetNav',
                en: 'IntranetNav menu'
            },
            description: {
                fr: 'Construit des menus Koha configurables dans IntranetNav avec un éditeur visuel fidèle au menu réel : liens, groupes, séparateurs, niveaux, sous-menus latéraux/déroulés/méga-menu, glisser-déposer, icônes, actions PMK et accès réservé aux superlibrarians. Intègre directement Listes, Historique, Recherche avancée, Guides & formation et le compteur de fréquentation.',
                en: 'Builds configurable Koha IntranetNav menus with a visual editor matching the real menu structure: links, groups, separators, levels, side/dropdown/mega submenus, drag and drop, icons, PMK actions and superlibrarian-only access. Directly integrates Lists, History, Advanced search, Guides & training and the attendance counter.'
            },
            category: {
                fr: 'Navigation et interface',
                en: 'Navigation and interface'
            },
            defaults: clone(DEFAULTS),
            schema: moduleSchema(),
            validate: validateConfig
        });

        window.PMKConfig.getConfig(MODULE_ID)
            .then(applyConfig)
            .catch(function () { applyConfig(clone(DEFAULTS)); });

        if (typeof window.PMKConfig.subscribe === 'function') {
            unsubscribe = window.PMKConfig.subscribe(MODULE_ID, applyConfig);
        }

        return true;
    }

    function bootstrap() {
        watchDom();

        if (!registerWithPMK()) {
            window.addEventListener('pmk:config-ready', registerWithPMK, { once: true });
            let tries = 0;
            const timer = window.setInterval(function () {
                tries += 1;
                if (registerWithPMK() || tries >= 100) {
                    window.clearInterval(timer);
                    if (!registered) applyConfig(clone(DEFAULTS));
                }
            }, 50);
        }

        window.addEventListener('pmk:personal-lists-state', queueRender);
        window.addEventListener('pmk:history-state', queueRender);
        window.addEventListener('pmk:advanced-search-state', queueRender);
        window.addEventListener('pmk:guides-training-state', queueRender);
        document.addEventListener('pmk:attendance-mediabus-state', queueRender);
        document.addEventListener('koha-guides-assist-toggle', queueRender);
        queueRender();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    } else {
        bootstrap();
    }

    window.addEventListener('beforeunload', function () {
        if (observer) {
            try { observer.disconnect(); } catch (_) {}
            observer = null;
        }
        if (typeof unsubscribe === 'function') {
            try { unsubscribe(); } catch (_) {}
        }
    }, { once: true });
})();
