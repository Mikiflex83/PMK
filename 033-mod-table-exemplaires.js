/*
 Nom du fichier: 033-mod-table-exemplaires.js
 Module PMK: holdings-table-presentation
 Version: 4.0.0-preplugin
 Date de dernière modification: 2026-09-17
 Auteur: équipe PimpMyKoha

 Rôle:
 - remplace le legacy 033 sur catalogue/detail.pl et course_reserves/course-details.pl ;
 - absorbe la partie utile du legacy 032 pour l'affichage de la localisation ;
 - conserve les couleurs/comportements historiques Dracénie comme valeurs par défaut ;
 - s'appuie en priorité sur les statuts structurés Koha (_status / classes item-status) ;
 - résiste aux redraw/reconstructions DataTables ;
 - ne masque PAS #catalogue_detail_elastic_record : cette fonction appartient au module
   transversal "conditional-visibility" ;
 - ne lance aucune action métier et ne modifie aucune donnée Koha.
*/

(function () {
  'use strict';

  if (window.__PMK033_HOLDINGS_TABLE_PRESENTATION__) return;
  window.__PMK033_HOLDINGS_TABLE_PRESENTATION__ = true;

  const MODULE_ID = 'holdings-table-presentation';
  const MODULE_VERSION = '4.2.0-preplugin';

  const PAGE_DETAIL = '/cgi-bin/koha/catalogue/detail.pl';
  const PAGE_COURSE = '/cgi-bin/koha/course_reserves/course-details.pl';

  const DETAIL_TABLES = ['#holdings_table', '#otherholdings_table'];
  const COURSE_TABLE = '#course_reserves_table';

  const DETAIL_STATUS_TARGETS = {
    checked_out: '.datedue',
    local_use: '',
    in_transit: '.intransit, .transitrequested',
    lost: '.lost',
    withdrawn: '.wdn',
    damaged: '.dmg',
    not_for_loan: '.notforloan',
    on_hold: '.waitingat, .holdonitem, .heldfor',
    recalled: '.recallwaiting, .recalledby',
    restricted: '.restricted',
    in_bundle: '.bundled',
    available: ''
  };

  const COURSE_STATUS_TARGETS = {
    available: '.item-status.available',
    checked_out: '.item-status.checkedout',
    local_use: '.item-status.checkedout',
    in_transit: '.item-status.intransit',
    lost: '.item-status.lost',
    withdrawn: '.item-status.withdrawn',
    damaged: '.item-status.damaged',
    not_for_loan: '.item-status.notforloan',
    on_hold: '.item-status.pendinghold, .item-status.holdwaiting, .item-status.itemhold, .item-status.holdfor',
    restricted: '.item-status.restricted'
  };

  const STRUCTURE_DEFAULTS = {"detail": {"tableSelector": "#holdings_table, #otherholdings_table", "rowSelector": "tbody tr", "statusCellSelector": "td.status", "locationCellSelector": "td.location", "locationSelector": ".shelvingloc"}, "course": {"tableSelector": "#course_reserves_table", "rowSelector": "tbody tr", "statusCellSelector": "td.status", "availableSelector": ".item-status.available"}, "library": {"codeSelector": ".logged-in-branch-code, #logged-in-branch-code, [data-branchcode], [data-branch-code]", "nameSelector": ".logged-in-branch-name, #logged-in-branch-name, [data-branch-name]", "codeAttribute": "data-branchcode, data-branch-code", "nameAttribute": "data-branch-name"}, "dataFields": {"statuses": "_status", "holdingLibrary": "holding_library_id", "holdingName": "_strings.holding_library_id.str", "location": "_strings.location.str", "rawLocation": "location"}};
  const DEFAULT_CONFIG = {
    enabled: true,
    pages: [
      { pageId: 'catalogue.detail', enabled: true, path: PAGE_DETAIL },
      { pageId: 'course_reserves.course-details', enabled: true, path: PAGE_COURSE }
    ],
    detail: {
      locationMode: 'current-only',
      columnLabels: [
        { id: 'copynumber', enabled: true, colname: 'copynumber', labelFr: 'Sous-localisation', labelEn: 'Sub-location' },
        { id: 'barcode', enabled: true, colname: 'barcode', labelFr: 'Code barres', labelEn: 'Barcode' },
        { id: 'enumchron', enabled: true, colname: 'enumchron', labelFr: 'Etage / Numéro', labelEn: 'Floor / Number' },
        { id: 'course_reserves', enabled: true, colname: 'course_reserves', labelFr: "Listes d'exemplaires", labelEn: 'Item lists' }
      ],
      statusRules: [
        { id: 'transfer', enabled: true, statusKey: 'in_transit', rowBackground: '#f7f1e9', textColor: '', bold: false },
        { id: 'hold', enabled: true, statusKey: 'on_hold', rowBackground: '#f7f1e9', textColor: '', bold: false },
        { id: 'available', enabled: true, statusKey: 'available', rowBackground: '#ebfaeb', textColor: '#008000', bold: true },
        { id: 'not-for-loan', enabled: true, statusKey: 'not_for_loan', rowBackground: '#fcd2d2', textColor: '#990000', bold: true },
        { id: 'checked-out', enabled: true, statusKey: 'checked_out', rowBackground: '#fff3cd', textColor: '', bold: false },
        { id: 'local-use', enabled: true, statusKey: 'local_use', rowBackground: '#fff3cd', textColor: '', bold: false },
        { id: 'lost', enabled: false, statusKey: 'lost', rowBackground: '', textColor: '', bold: false },
        { id: 'withdrawn', enabled: false, statusKey: 'withdrawn', rowBackground: '', textColor: '', bold: false },
        { id: 'damaged', enabled: false, statusKey: 'damaged', rowBackground: '', textColor: '', bold: false },
        { id: 'restricted', enabled: false, statusKey: 'restricted', rowBackground: '', textColor: '', bold: false },
        { id: 'recalled', enabled: false, statusKey: 'recalled', rowBackground: '', textColor: '', bold: false },
        { id: 'in-bundle', enabled: false, statusKey: 'in_bundle', rowBackground: '', textColor: '', bold: false }
      ],
      currentLibrary: {
        enabled: true,
        availableOnly: true,
        iconClass: 'fa fa-star',
        color: '#b8860b',
        titleFr: 'Disponible dans le site de connexion',
        titleEn: 'Available at the current library'
      }
    },
    course: {
      statusRules: [
        { id: 'available', enabled: true, statusKey: 'available', textColor: '#008000', bold: true },
        { id: 'checked-out', enabled: true, statusKey: 'checked_out', textColor: '#990000', bold: true }
      ],
      availableLabelFr: 'Non emprunté',
      availableLabelEn: 'Not checked out'
    },
    observerDelay: 70
  };

  let currentConfig = deepMerge(STRUCTURE_DEFAULTS,DEFAULT_CONFIG);
  let mutationObserver = null;
  let applyTimer = null;
  let jqueryEventsBound = false;

  function deepClone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function deepMerge(base, override) {
    if (Array.isArray(base)) {
      return Array.isArray(override) ? deepClone(override) : deepClone(base);
    }
    if (!isPlainObject(base)) {
      return override === undefined ? deepClone(base) : deepClone(override);
    }
    const out = deepClone(base) || {};
    if (!isPlainObject(override)) return out;
    Object.keys(override).forEach(function (key) {
      if (Array.isArray(override[key])) out[key] = deepClone(override[key]);
      else if (isPlainObject(override[key]) && isPlainObject(out[key])) out[key] = deepMerge(out[key], override[key]);
      else out[key] = deepClone(override[key]);
    });
    return out;
  }

  function normalizedPath(path) { const value=String(path || '').trim();return value.startsWith('/cgi-bin/koha/')?value:'/cgi-bin/koha/'+value.replace(/^\/+/, ''); }
  function pageMode() { const page=(currentConfig.pages || []).find(entry=>normalizedPath(entry.path)===location.pathname);return page?.pageId==='course_reserves.course-details'?'course':page?'detail':null; }
  function tables(mode) { const result=[];try{result.push(...document.querySelectorAll(currentConfig[mode]?.tableSelector || STRUCTURE_DEFAULTS[mode].tableSelector))}catch(_){}return result; }
  function rows(table,mode) { try{return Array.from(table.querySelectorAll(currentConfig[mode]?.rowSelector || 'tbody tr'))}catch(_){return []} }
  function dataValue(value,path) { return String(path || '').split('.').reduce((node,key)=>node?.[key],value); }
  function configuredData(data,key) {return dataValue(data,currentConfig.dataFields?.[key] || STRUCTURE_DEFAULTS.dataFields[key]);}
  const originalTextNodes=new Map(),originalLocationNodes=new Map();
  function setLabel(element,label) {
    if(!element)return;
    let textNode=Array.from(element.childNodes).find(node=>node.nodeType===Node.TEXT_NODE && node.textContent.trim());
    if(!textNode){const inner=element.querySelector('.dt-column-title, .label');if(inner){setLabel(inner,label);return;}const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);textNode=walker.nextNode();}
    if(!textNode){textNode=document.createTextNode('');element.appendChild(textNode);}
    if(window.PMKWorkbench?.labels){
      const release=window.PMKWorkbench.labels.claim(textNode,label,{owner:MODULE_ID,priority:50,title:"Présentation du tableau des exemplaires"});
      if(release){originalTextNodes.set(textNode,release);return;}
    }
    if(!originalTextNodes.has(textNode))originalTextNodes.set(textNode,textNode.textContent);
    textNode.textContent=label;
  }
  function restoreLabels(root) { for(const [node,value]of originalTextNodes)if(!node.isConnected || !root || root.contains(node)){if(typeof value==='function')value();else node.textContent=value;originalTextNodes.delete(node)} }
  function matchesRule(statuses,statusCell,rule) {
    if(rule.enabled===false)return false;
    let matched=statuses.includes(String(rule.statusKey || ''));
    const target=rule.selector?safeQuery(statusCell,rule.selector):statusCell;
    if(rule.selector)matched=!!target;
    if(rule.matchText){try{matched=!!target && new RegExp(rule.matchText,'i').test(target.textContent || '')}catch(_){return false}}
    return matched;
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeComparable(value) {
    return normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function language() {
    const htmlLang = String(document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (htmlLang.startsWith('fr')) return 'fr';
    if (htmlLang.startsWith('en')) return 'en';
    return String(navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  function pageConfig(pageId) {
    const pages = Array.isArray(currentConfig.pages) ? currentConfig.pages : [];
    return pages.find(function (page) { return page && page.pageId === pageId; }) || null;
  }

  function pageEnabled(pageId) {
    const page = pageConfig(pageId);
    return currentConfig.enabled !== false && (!page || page.enabled !== false);
  }

  function safeQuery(root, selector) {
    if (!root || !selector) return null;
    try { return root.querySelector(selector); } catch (_) { return null; }
  }

  function getDataTableRowData(table, row) {
    try {
      if (!window.jQuery || !window.jQuery.fn || !window.jQuery.fn.dataTable) return null;
      if (!window.jQuery.fn.dataTable.isDataTable(table)) return null;
      return window.jQuery(table).DataTable().row(row).data() || null;
    } catch (_) {
      return null;
    }
  }

  function getStatusCell(row) {
    return safeQuery(row, currentConfig[pageMode() || 'detail']?.statusCellSelector || 'td.status');
  }

  function inferDetailStatuses(statusCell) {
    const out = [];
    if (!statusCell) return out;

    const tests = [
      ['checked_out', '.datedue'],
      ['in_transit', '.intransit, .transitrequested'],
      ['lost', '.lost'],
      ['withdrawn', '.wdn'],
      ['damaged', '.dmg'],
      ['not_for_loan', '.notforloan'],
      ['on_hold', '.waitingat, .holdonitem, .heldfor'],
      ['recalled', '.recallwaiting, .recalledby'],
      ['restricted', '.restricted'],
      ['in_bundle', '.bundled']
    ];

    tests.forEach(function (entry) {
      if (safeQuery(statusCell, entry[1])) out.push(entry[0]);
    });

    if (!out.length) {
      const text = normalizeComparable(statusCell.textContent);
      if (/\b(disponible|available)\b/.test(text)) out.push('available');
      else if (/\b(prete|checked out|currently in local use|local use)\b/.test(text)) out.push('checked_out');
    }

    return out;
  }

  function detailStatuses(table, row, statusCell) {
    const data = getDataTableRowData(table, row);
    const statuses=data && Array.isArray(configuredData(data,'statuses'))?configuredData(data,'statuses').map(String):inferDetailStatuses(statusCell);
    (currentConfig.detail.statusRules || []).forEach(rule=>{if((rule.selector||rule.matchText)&&matchesRule([],statusCell,rule))statuses.push(String(rule.statusKey || ''));});
    return Array.from(new Set(statuses));
  }

  function courseStatuses(statusCell) {
    const out = [];
    if (!statusCell) return out;
    Object.keys(COURSE_STATUS_TARGETS).forEach(function (key) {
      const selector = COURSE_STATUS_TARGETS[key];
      if (selector && safeQuery(statusCell, selector)) out.push(key);
    });
    if(safeQuery(statusCell,currentConfig.course.availableSelector))out.push('available');
    (currentConfig.course.statusRules || []).forEach(rule=>{if((rule.selector||rule.matchText)&&matchesRule([],statusCell,rule))out.push(String(rule.statusKey || ''));});
    return Array.from(new Set(out));
  }

  function cleanupLegacy033Row(row) {
    if (!row) return;

    row.classList.remove('vc-disponible', 'vc-prete', 'vc-exclu', 'vc-prete-pret');
    row.removeAttribute('data-vc-row-colored');

    row.querySelectorAll('img.vc-star, img[src$="starred.png"]').forEach(function (el) { el.remove(); });

    const statusCell = getStatusCell(row);
    if (!statusCell) return;

    statusCell.querySelectorAll('span[style]').forEach(function (span) {
      const style = String(span.getAttribute('style') || '').replace(/\s+/g, '').toLowerCase();
      const isLegacy033 =
        !normalizeText(span.className) &&
        style.indexOf('font-weight:bold') !== -1 &&
        (style.indexOf('color:green') !== -1 || style.indexOf('color:#900') !== -1 || style.indexOf('color:#990000') !== -1);

      if (isLegacy033) {
        span.replaceWith(document.createTextNode(span.textContent || ''));
      }
    });
  }

  function clearRowPresentation(row) {
    if (!row) return;
    cleanupLegacy033Row(row);
    row.classList.remove('pmk033-row-state');
    row.style.removeProperty('--pmk033-row-background');

    row.querySelectorAll('[data-pmk033-status-styled="1"]').forEach(function (el) {
      el.removeAttribute('data-pmk033-status-styled');
      el.style.removeProperty('--pmk033-status-color');
      el.style.removeProperty('--pmk033-status-weight');
    });

    row.querySelectorAll('.pmk033-current-library-icon').forEach(function (el) { el.remove(); });
  }

  function statusTarget(statusCell, statusKey, courseMode) {
    const map = courseMode ? COURSE_STATUS_TARGETS : DETAIL_STATUS_TARGETS;
    const selector = map[statusKey];
    if (selector) return safeQuery(statusCell, selector);

    // Sur detail.pl, Koha rend "available" dans un span sans classe.
    if (!courseMode && statusKey === 'available') {
      const directSpan = Array.from(statusCell.children || []).find(function (child) {
        return child.tagName === 'SPAN' && !normalizeText(child.className);
      });
      if (directSpan) return directSpan;
    }

    return statusCell;
  }

  function applyStatusTextStyle(statusCell, rule, courseMode) {
    if (!statusCell || !rule) return;
    const target = rule.selector?safeQuery(statusCell,rule.selector):statusTarget(statusCell, rule.statusKey, courseMode);
    if (!target) return;

    const color = normalizeText(rule.textColor);
    const weight = rule.bold ? '700' : '';
    if (!color && !weight) return;

    target.setAttribute('data-pmk033-status-styled', '1');
    if (color) target.style.setProperty('--pmk033-status-color', color);
    if (weight) target.style.setProperty('--pmk033-status-weight', weight);
  }

  function applyRowRule(row, rule) {
    if (!row || !rule || rule.enabled === false) return;
    const background = normalizeText(rule.rowBackground);
    if (!background) return;
    row.classList.add('pmk033-row-state');
    row.style.setProperty('--pmk033-row-background', background);
  }

  function getLoggedInBranchName() {
    const cfg=currentConfig.library || STRUCTURE_DEFAULTS.library;
    let elements=[];try{elements=Array.from(document.querySelectorAll(cfg.nameSelector || STRUCTURE_DEFAULTS.library.nameSelector))}catch(_){}
    for(const element of elements){
      for(const attr of String(cfg.nameAttribute || '').split(',').map(value=>value.trim()).filter(Boolean)){const value=normalizeText(element.getAttribute(attr));if(value)return value;}
      const value=normalizeText(element.textContent);if(value)return value;
    }
    return '';
  }

  function getLoggedInBranchCode() {
    const cfg=currentConfig.library || STRUCTURE_DEFAULTS.library;
    let elements=[];try{elements=Array.from(document.querySelectorAll(cfg.codeSelector || STRUCTURE_DEFAULTS.library.codeSelector))}catch(_){}
    for(const element of elements){
      for(const attr of String(cfg.codeAttribute || '').split(',').map(value=>value.trim()).filter(Boolean)){const value=normalizeText(element.getAttribute(attr));if(value)return value;}
      const value=normalizeText(element.textContent);if(value)return value;
    }
    return '';
  }

  function rowIsCurrentLibrary(table, row, data) {
    const branchCode = getLoggedInBranchCode();
    if (branchCode && data && configuredData(data,'holdingLibrary')) {
      if (normalizeComparable(branchCode) === normalizeComparable(configuredData(data,'holdingLibrary'))) return true;
    }

    const branchName = getLoggedInBranchName();
    if (!branchName) return false;

    const locationCell = safeQuery(row,currentConfig.detail.locationCellSelector || 'td.location');
    const holdingName = normalizeText(
      data && configuredData(data,'holdingName')
        ? configuredData(data,'holdingName')
        : (locationCell ? locationCell.textContent : '')
    );

    return holdingName && normalizeComparable(holdingName) === normalizeComparable(branchName);
  }

  function mountCurrentLibraryIndicator(table, row, statuses, statusCell) {
    const cfg = currentConfig.detail && currentConfig.detail.currentLibrary || {};
    if (cfg.enabled === false || !statusCell) return;
    if (cfg.availableOnly !== false && !statuses.includes('available')) return;

    const data = getDataTableRowData(table, row);
    if (!rowIsCurrentLibrary(table, row, data)) return;
    if (statusCell.querySelector('.pmk033-current-library-icon')) return;

    const icon = document.createElement('i');
    icon.className = normalizeText(cfg.iconClass) || 'fa fa-star';
    icon.classList.add('pmk033-current-library-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.style.setProperty('--pmk033-current-library-color', normalizeText(cfg.color) || '#b8860b');
    icon.title = language() === 'fr'
      ? (normalizeText(cfg.titleFr) || 'Disponible dans le site de connexion')
      : (normalizeText(cfg.titleEn) || 'Available at the current library');

    statusCell.insertBefore(icon, statusCell.firstChild);
  }

  function applyDetailRow(table, row) {
    if (!row || !row.cells || !row.cells.length) return;
    clearRowPresentation(row);

    const statusCell = getStatusCell(row);
    if (!statusCell) return;

    const statuses = detailStatuses(table, row, statusCell);
    const rules = currentConfig.detail && Array.isArray(currentConfig.detail.statusRules)
      ? currentConfig.detail.statusRules
      : [];

    let rowRuleApplied = false;
    rules.forEach(function (rule) {
      if (!rule || rule.enabled === false || !matchesRule(statuses,statusCell,rule)) return;
      applyStatusTextStyle(statusCell, rule, false);
      if (!rowRuleApplied && normalizeText(rule.rowBackground)) {
        applyRowRule(row, rule);
        rowRuleApplied = true;
      }
    });

    mountCurrentLibraryIndicator(table, row, statuses, statusCell);
  }

  function restoreLocationElement(el) {
    if(!el)return;
    const original=originalLocationNodes.get(el);if(original){el.replaceChildren(...original);originalLocationNodes.delete(el);}
    el.removeAttribute('data-pmk033-location-current');
  }

  function currentLocationText(el, table, row) {
    const data = getDataTableRowData(table, row);
    if (data) {
      const fromStrings = configuredData(data,'location');
      const raw = fromStrings || configuredData(data,'rawLocation');
      if (normalizeText(raw)) return normalizeText(raw);
    }

    const original = normalizeText(el.dataset.pmk033NativeText || el.textContent);
    const match = original.match(/\(([^()]*)\)\s*$/);
    if (match && normalizeText(match[1])) return normalizeText(match[1]);
    return original;
  }

  function applyLocations(table) {
    const mode = currentConfig.detail && currentConfig.detail.locationMode || 'native';
    rows(table,'detail').forEach(function (row) {
      const el = safeQuery(row, currentConfig.detail.locationSelector || '.shelvingloc');
      if (!el) return;

      if (el.dataset.pmk033NativeText === undefined) {
        el.dataset.pmk033NativeText = normalizeText(el.textContent);
      }

      if (mode === 'current-only') {
        const value = currentLocationText(el, table, row);
        if(value){if(!originalLocationNodes.has(el))originalLocationNodes.set(el,Array.from(el.childNodes));if(el.textContent!==value || el.children.length)el.replaceChildren(document.createTextNode(value));}
        el.setAttribute('data-pmk033-location-current', '1');
      } else {
        restoreLocationElement(el);
      }
    });
  }

  function findHeader(table, colname) {
    const escaped = String(colname || '').replace(/"/g, '\\"');
    return safeQuery(table, 'thead th[data-colname="' + escaped + '"]') ||
      safeQuery(table, 'thead th#holdings_' + colname) ||
      safeQuery(table, 'thead th#otherholdings_' + colname);
  }

  function applyColumnLabels(table) {
    const rules = currentConfig.detail && Array.isArray(currentConfig.detail.columnLabels)
      ? currentConfig.detail.columnLabels
      : [];
    const lang = language();

    rules.forEach(function (rule) {
      if (!rule || (!normalizeText(rule.colname) && !rule.headerSelector)) return;
      const th = rule.headerSelector?safeQuery(table,rule.headerSelector):findHeader(table, rule.colname);
      if (!th) return;

      if (th.dataset.pmk033NativeLabel === undefined) {
        th.dataset.pmk033NativeLabel = normalizeText(th.textContent);
      }

      if (rule.enabled === false) {
        restoreLabels(th);
        return;
      }

      const label = lang === 'fr' ? normalizeText(rule.labelFr) : normalizeText(rule.labelEn);
      if(label)setLabel(th,label);else restoreLabels(th);
    });
  }

  function restoreColumnLabels(table) { restoreLabels(table); }

  function applyDetailTable(table) {
    if (!table) return;
    applyColumnLabels(table);
    applyLocations(table);
    rows(table,'detail').forEach(function (row) { applyDetailRow(table, row); });
  }

  function restoreCourseLabel(span) { restoreLabels(span); }

  function applyCourseAvailableLabel(statusCell) {
    const span = safeQuery(statusCell, currentConfig.course.availableSelector || '.item-status.available');
    if (!span) return;

    if (span.dataset.pmk033OriginalText === undefined) {
      span.dataset.pmk033OriginalText = normalizeText(span.textContent);
    }

    const label = language() === 'fr'
      ? normalizeText(currentConfig.course && currentConfig.course.availableLabelFr)
      : normalizeText(currentConfig.course && currentConfig.course.availableLabelEn);

    if(label)setLabel(span,label);else restoreCourseLabel(span);
  }

  function applyCourseRow(row) {
    if (!row) return;
    clearRowPresentation(row);
    const statusCell = getStatusCell(row);
    if (!statusCell) return;

    const available = safeQuery(statusCell, currentConfig.course.availableSelector || '.item-status.available');
    if (available) restoreCourseLabel(available);

    const statuses = courseStatuses(statusCell);
    const rules = currentConfig.course && Array.isArray(currentConfig.course.statusRules)
      ? currentConfig.course.statusRules
      : [];

    rules.forEach(function (rule) {
      if (!rule || rule.enabled === false || !matchesRule(statuses,statusCell,rule)) return;
      applyStatusTextStyle(statusCell, rule, true);
    });

    if (statuses.includes('available')) applyCourseAvailableLabel(statusCell);
  }

  function restoreDetailPage() {
    tables('detail').forEach(table=>{restoreColumnLabels(table);rows(table,'detail').forEach(clearRowPresentation)});
    for(const element of Array.from(originalLocationNodes.keys()))restoreLocationElement(element);
  }
  function restoreCoursePage() { tables('course').forEach(table=>{restoreLabels(table);rows(table,'course').forEach(clearRowPresentation)}); }
  function applyCurrentPage() {
    const mode=pageMode();if(!mode)return;
    const id=mode==='course'?'course_reserves.course-details':'catalogue.detail';
    if(!pageEnabled(id)){if(mode==='course')restoreCoursePage();else restoreDetailPage();return;}
    if(mode==='detail')tables(mode).forEach(applyDetailTable);
    else tables(mode).forEach(table=>rows(table,mode).forEach(applyCourseRow));
    mountContextAccess(id);
  }

  function scheduleApply() {
    clearTimeout(applyTimer);
    const delay = Math.max(0, Number(currentConfig.observerDelay || 70));
    applyTimer = window.setTimeout(applyCurrentPage, delay);
  }

  function installStyles() {
    const legacyStyle = document.getElementById('vc-holdings-row-styles');
    if (legacyStyle) legacyStyle.remove();
    if (document.getElementById('pmk033-holdings-presentation-style')) return;
    const style = document.createElement('style');
    style.id = 'pmk033-holdings-presentation-style';
    style.textContent = `
      tr.pmk033-row-state > td, tr.pmk033-row-state > th {
        background-color: var(--pmk033-row-background) !important;
      }

      [data-pmk033-status-styled="1"] {
        color: var(--pmk033-status-color, inherit) !important;
        font-weight: var(--pmk033-status-weight, inherit) !important;
      }

      .pmk033-current-library-icon {
        color: var(--pmk033-current-library-color, #b8860b);
        margin-right: 5px;
        vertical-align: baseline;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function bindDataTableEvents() {
    if (jqueryEventsBound || !window.jQuery) return;
    jqueryEventsBound = true;
    try {
      window.jQuery(document).on(
        'draw.dt.pmk033 column-visibility.dt.pmk033 responsive-display.dt.pmk033',
        function(event){if(tables(pageMode() || 'detail').includes(event.target))scheduleApply();}
      );
    } catch (_) {}
  }

  function observeRelevantDom() {
    if (mutationObserver) return;
    mutationObserver = new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList' || !mutation.addedNodes || !mutation.addedNodes.length) continue;

        const relevant = Array.from(mutation.addedNodes).some(function (node) {
          if (!node || node.nodeType !== 1) return false;
          if (node.classList && node.classList.contains('pmk033-current-library-icon')) return false;
          const mode=pageMode() || 'detail',selector=(currentConfig[mode].tableSelector || STRUCTURE_DEFAULTS[mode].tableSelector)+', tbody, tr';
          try{return !!(node.matches?.(selector) || node.querySelector?.(selector))}catch(_){return false;}
        });

        if (relevant) {
          scheduleApply();
          return;
        }
      }
    });
    mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function mountContextAccess(pageId) {
    if (!window.PMKConfig || typeof window.PMKConfig.mountContextButton !== 'function') return;

    const anchor=tables(pageMode() || 'detail')[0];

    if (!anchor) return;

    try {
      window.PMKConfig.mountContextButton({
        moduleId: MODULE_ID,
        anchor: anchor,
        position: 'after',
        contextKey: 'holdings-table-presentation-' + pageId,
        context: {
          page: pageId,
          sectionId: pageId === 'catalogue.detail' ? 'detail-statuses' : 'course-statuses'
        }
      });
    } catch (_) {}
  }

  function loadConfig() {
    if (!window.PMKConfig || typeof window.PMKConfig.getConfig !== 'function') {
      return Promise.resolve(deepClone(DEFAULT_CONFIG));
    }
    return Promise.resolve(window.PMKConfig.getConfig(MODULE_ID))
      .then(function (cfg) { return deepMerge(DEFAULT_CONFIG, cfg || {}); })
      .catch(function () { return deepClone(DEFAULT_CONFIG); });
  }

  function applyConfig(config) {
    restoreDetailPage();restoreCoursePage();
    currentConfig = deepMerge(deepMerge(STRUCTURE_DEFAULTS,DEFAULT_CONFIG), config || {});

    if (currentConfig.enabled === false) {
      restoreDetailPage();
      restoreCoursePage();
      return;
    }

    installStyles();
    bindDataTableEvents();
    observeRelevantDom();
    scheduleApply();
  }

  function registerVisualEditorAdapter() {
    const editor = window.PMKConfig && window.PMKConfig.visualEditor;
    if (!editor || typeof editor.register !== 'function') return false;
    editor.register(MODULE_ID, {
      capabilities: { livePreview: true },
      canPreview: function () {
        return !!pageMode();
      },
      previewDraft: function (draft) {
        if (!pageMode()) throw new Error('visual_preview_wrong_page');
        const before = deepClone(currentConfig || DEFAULT_CONFIG);
        applyConfig(draft);
        clearTimeout(applyTimer);
        applyCurrentPage();
        return function () { applyConfig(before); clearTimeout(applyTimer); applyCurrentPage(); };
      }
    });
    return true;
  }

  function start() {
    registerVisualEditorAdapter();
    loadConfig().then(applyConfig);

    if (window.PMKConfig && typeof window.PMKConfig.subscribe === 'function') {
      try { window.PMKConfig.subscribe(MODULE_ID, applyConfig); } catch (_) {}
    }
  }

  window.addEventListener('pmk:config-ready', registerVisualEditorAdapter, { once: true });

  window.PMK033HoldingsTablePresentation = {
    version: MODULE_VERSION,
    moduleId: MODULE_ID,
    refresh: scheduleApply,
    applyConfig: applyConfig,
    getConfig: function () { return deepClone(currentConfig); }
  };

  start();
})();
