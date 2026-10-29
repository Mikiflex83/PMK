/* ================================================================
 * PMK 145 — Édition rapide des exemplaires (édition rapide des exemplaires)
 * Koha 25.11 — catalogue/detail.pl et search.pl — version 0.2.1
 * Installation : charger après le socle PMK dans IntranetUserJS.
 * Ne manipule jamais l'état de prêt, les transferts ni les retours.
 * Les contrôles JS ne remplacent PAS les contrôles côté serveur.
 * ================================================================ */
(function () {
  'use strict';
  const ON_DETAIL = /\/cgi-bin\/koha\/catalogue\/detail\.pl$/.test(location.pathname);
  const ON_SEARCH = /\/cgi-bin\/koha\/catalogue\/search\.pl$/.test(location.pathname);
  if (window.__PMK145_LOADED__) return;
  window.__PMK145_LOADED__ = true;

  const NAME = 'PMK145';
  const API = '/api/v1'; // Préfixe intranet Koha (même origine)
  let BIBLIO = ON_DETAIL ? Number(new URLSearchParams(location.search).get('biblionumber')) : 0;

  // MARC de la grille Dracénie : les correspondances API sont celles
  // des données Koha, PAS une conversion automatique de sous-champs.
  // Ne jamais ajouter un champ non confirmé à cette liste.
  const FIELDS = [
    { id: 'homebranch', label: 'Site propriétaire', api: 'home_library_id', type: 'libraries', enabled: false, column: 'homebranch', sensitivity: 'strict' },
    { id: 'location', label: 'Localisation', api: 'location', va: 'LOC', enabled: true, column: 'location', sensitivity: 'normal' },
    { id: 'collection', label: 'Collection', api: 'collection_code', va: 'CCODE', enabled: true, column: 'ccode', sensitivity: 'normal' },
    { id: 'callnumber', label: 'Cote', api: 'callnumber', type: 'text', enabled: true, column: 'itemcallnumber', sensitivity: 'normal' },
    { id: 'itemtype', label: 'Type de document', api: 'item_type_id', type: 'itemtypes', enabled: false, column: 'itype', sensitivity: 'strict' },
    { id: 'internal', label: 'Note interne', api: 'internal_notes', type: 'textarea', enabled: true, sensitivity: 'normal' },
    { id: 'public', label: 'Note OPAC', api: 'public_notes', type: 'textarea', enabled: true, sensitivity: 'normal' },
    { id: 'notforloan', label: 'Statut', api: 'not_for_loan_status', va: 'statut', enabled: false, column: 'status', sensitivity: 'strict', values: ['0','1','2','3','5','6','7','8'], confirm: ['6','8'] },
    { id: 'lost', label: 'Statut perdu', api: 'lost_status', va: 'LOST', enabled: false, column: 'status', sensitivity: 'strict', values: ['0','1','2','5','8','9','10','11'], confirm: ['0','1','2'], excluded: ['4','7'] }
  ];
  // Champs absents : site actuel, code-barres, dates de circulation,
  // sous-champs personnalisés non mappés.
  // Aucun champ technique ou critique ne doit être édité ici.
  const STATUS_RULES = Object.fromEntries(FIELDS.filter(f => f.sensitivity === 'strict' && f.va).map(f => [f.id, {
    allowed: (f.values || []).join(','), excluded: (f.excluded || []).join(','), confirm: (f.confirm || []).join(',')
  }]));
  const MODULE_ID = 'item-quick-edit';
  const DEFAULTS = { enabled: true, ...Object.fromEntries(FIELDS.map(f => ['field_' + f.id, f.enabled])), ...Object.fromEntries(FIELDS.filter(f => f.va).map(f => ['va_' + f.id, f.va])), ...Object.fromEntries(Object.entries(STATUS_RULES).flatMap(([id,rules]) => Object.entries(rules).map(([key,value]) => [key+'_'+id,value]))) };
  let config = Object.fromEntries(FIELDS.map(f => [f.id, false]));
  let moduleEnabled = false;
  let configuredVA = {};
  let statusRules = {};
  const codes = value => String(value ?? '').split(/[\s,;]+/).filter(v => /^-?\d+$/.test(v));
  const cache = new Map();
  let dialog = null;
  let busy = false;
  let current = null;

  // Configuration native PMK : registre, Firestore et abonnement aux changements.
  function applyConfig(data) {
    if (!ON_DETAIL && !ON_SEARCH) return;
    const value = data && typeof data === 'object' ? data : DEFAULTS;
    moduleEnabled = value.enabled !== false;
    config = Object.fromEntries(FIELDS.map(f => [f.id, moduleEnabled && value['field_' + f.id] === true]));
    configuredVA = Object.fromEntries(FIELDS.filter(f => f.va).map(f => {
      const stored = String(value['va_' + f.id] || f.va).trim();
      return [f.id, stored];
    }));
    statusRules = Object.fromEntries(Object.entries(STATUS_RULES).map(([id,rules]) => [id, Object.fromEntries(Object.keys(rules).map(key => [key,codes(value[key+'_'+id] ?? rules[key])]))]));
    cache.clear();
    document.querySelectorAll('.pmk145-edit-cell, .pmk145-edit-card').forEach(node => node.remove());
    decorate();
    decorateCards();
  }
  function initPMKConfig() {
    const pmk = window.PMKConfig;
    if (!pmk || typeof pmk.registerModule !== 'function') return false;
    pmk.registerModule({
      id: MODULE_ID,
      schemaVersion: 1,
      name: { fr: 'Édition rapide des exemplaires', en: 'Quick item editing' },
      description: { fr: 'Modifie directement certains champs des exemplaires sur les notices et dans les résultats de recherche, via l’API Koha. Les champs sensibles (statuts, type de document, site propriétaire) sont bloqués pendant les opérations de circulation.', en: 'Edit selected item fields in catalogue detail through Koha REST API.' },
      category: { fr: 'Catalogue / exemplaires', en: 'Catalog / items' },
      supportedPages: ['catalogue.detail', 'catalogue.search'],
      defaults: { ...DEFAULTS },
      schema: [
        { key: 'enabled', type: 'boolean', label: { fr: 'Module actif', en: 'Module enabled' } },
        ...FIELDS.map(f => ({ key: 'field_' + f.id, type: 'boolean',
          label: { fr: 'Autoriser : ' + f.label, en: 'Allow: ' + f.label },
          help: f.sensitivity === 'strict' ? { fr: 'Sous réserve des contrôles de circulation. Désactivé par défaut.', en: 'Subject to circulation checks; disabled by default.' } : undefined })),
        ...Object.keys(STATUS_RULES).flatMap(id => ['allowed','excluded','confirm'].map(key => ({
          key: key+'_'+id, type:'text',
          label:{fr: ({allowed:'Codes proposés',excluded:'Codes exclus',confirm:'Codes avec confirmation'})[key]+' — '+FIELDS.find(f=>f.id===id).label},
          help:{fr:'Codes numériques séparés par des virgules. Pour les codes proposés, laisser vide pour utiliser toutes les valeurs autorisées de la catégorie Koha. Les contrôles de circulation restent obligatoires.'}
        }))),
        ...FIELDS.filter(f => f.va).map(f => ({ key: 'va_' + f.id, type: 'text', label: { fr: 'Catégorie VA — ' + f.label, en: 'Authorised value category — ' + f.label }, help: { fr: 'Code exact de la catégorie dans Koha, sensible à la casse (ex. LOC, CCODE, statut, LOST).', en: 'Exact Koha authorised value category code.' } }))
      ]
    });
    pmk.subscribe(MODULE_ID, applyConfig);
    pmk.getConfig(MODULE_ID).then(applyConfig).catch(err => console.warn('[PMK145] Lecture de configuration impossible', err));
    return true;
  }
  if (!initPMKConfig()) {
    window.addEventListener('pmk:config-ready', initPMKConfig, { once: true });
  }
  if ((!ON_DETAIL && !ON_SEARCH) || (ON_DETAIL && (!Number.isSafeInteger(BIBLIO) || BIBLIO < 1))) return;
  function el(tag, attrs = {}, text = null) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') node.className = value;
      else if (key === 'type') node.type = value;
      else node.setAttribute(key, String(value));
    }
    if (text !== null) node.textContent = String(text);
    return node;
  }
  function notify(message, error = false) {
    let box = document.getElementById('pmk145-toast');
    if (!box) { box = el('div', { id: 'pmk145-toast', role: 'status' }); document.body.append(box); }
    box.textContent = message;
    box.className = error ? 'pmk145-error' : 'pmk145-ok';
    clearTimeout(box._timer);
    box._timer = setTimeout(() => { box.textContent = ''; box.className = ''; }, 6000);
  }
  async function request(path, options = {}) {
    const endpoint = API + path;
    let response;
    try { response = await fetch(endpoint, {
      credentials: 'same-origin',
      ...options,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    }); } catch (err) { throw new Error('Connexion API impossible : ' + endpoint + ' — ' + err.message); }
    if (!response.ok) {
      let detail = '';
      try { const obj = await response.json(); detail = obj.error || obj.error_code || ''; } catch (_) {}
      console.warn('PMK145 requête API échouée', {method: options.method || 'GET', url: response.url || endpoint, status: response.status, detail});
      throw new Error('API ' + response.status + ' (' + (options.method || 'GET') + ' ' + endpoint + ')' + (detail ? ' — ' + detail : '') + (response.status === 404 ? ' — Route ou ressource introuvable sur cette installation.' : ''));
    }
    if (response.status === 204) return null;
    try { return await response.json(); } catch (_) { throw new Error('Réponse non JSON : ' + endpoint); }
  }
  function itemReadPath(itemId) { return '/items/' + itemId; }
  function itemWritePath(itemId) { return '/biblios/' + BIBLIO + '/items/' + itemId; }
  async function getItem(itemId, embedded = false) {
    const headers = embedded ? { 'x-koha-embed': 'checkout,transfer,first_hold' } : {};
    return request(itemReadPath(itemId), { headers });
  }
  async function getOptions(field) {
    const category = field.va ? (configuredVA[field.id] || field.va) : null;
    // Les catégories sont configurables dans PMK, y compris pour les statuts.
    // La sécurité dépend du champ API, jamais du code de catégorie VA.
    if (category && !/^[A-Za-z0-9_ -]{1,40}$/.test(category)) throw new Error('Catégorie VA incorrecte : ' + category);
    const key = field.id + ':' + (category || field.type);
    if (cache.has(key)) return cache.get(key);
    let values = [];
    if (category) {
      // La forme de réponse et la permission varient selon la version Koha.
      const list = await request('/authorised_value_categories/' + encodeURIComponent(category) + '/authorised_values' + '?_per_page=500');
      if (!Array.isArray(list)) throw new Error('Réponse VA inattendue pour ' + category);
      values = list.map(v => ({ value: String(v.value), label: field.id === 'lost' && String(v.value) === '0' ? '' : String(v.description || v.opac_description || v.value) }));
    } else if (field.type === 'itemtypes') {
      const list = await request('/item_types?_per_page=500');
      if (!Array.isArray(list)) throw new Error('Types de document indisponibles');
      values = list.map(v => ({ value: String(v.item_type_id || v.itemtype), label: String(v.description || v.item_type_id || v.itemtype) }));
    } else if (field.type === 'libraries') {
      // Source native Koha : ne jamais coder les sites en dur ou utiliser une VA.
      const list = await request('/libraries?_per_page=500');
      if (!Array.isArray(list)) throw new Error('Liste des bibliothèques Koha indisponible.');
      values = list.filter(v => v.library_id || v.branchcode)
        .map(v => ({ value: String(v.library_id || v.branchcode), label: String(v.name || v.branchname || v.library_id || v.branchcode) }))
        .sort((a,b) => a.label.localeCompare(b.label,'fr'));
      if (!values.length) throw new Error('Aucune bibliothèque reçue de l’API Koha.');
    }
    // Koha defines 0 as clear/available even when there is no authorised-value row.
    if (statusRules[field.id] && !values.some(v => v.value === '0')) {
      values.unshift({value:'0',label:field.id === 'lost' ? 'Aucun statut perdu' : 'Prêtable'});
    }
    const rules = statusRules[field.id];
    if (rules?.allowed.length) values = values.filter(v => rules.allowed.includes(v.value));
    if (rules?.excluded.length) values = values.filter(v => !rules.excluded.includes(v.value));
    if (!values.length && category) throw new Error('Aucune valeur autorisée récupérée pour ' + field.label);
    cache.set(key, values);
    return values;
  }
  function tableRow(button) { return button.closest('#holdings_table tbody tr'); }
  function idFromRow(row) {
    const checkbox = row && row.querySelector('input[name="itemnumber"]');
    const id = Number(checkbox && checkbox.value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }
  function fieldByColumn(cell) {
    if (!cell) return null;
    const table = cell.closest('table');
    const index = Array.prototype.indexOf.call(cell.parentElement.children, cell);
    const header = table && table.querySelector('thead tr th:nth-child(' + (index + 1) + ')');
    const colname = header && header.getAttribute('data-colname');
    return FIELDS.find(f => f.column === colname && colname !== 'status' && config[f.id]) || null;
  }
  // Liste personnalisée : le champ de recherche est À L'INTÉRIEUR du menu.
  function makeSearchableSelect(control, opts) {
    control.hidden = true;
    const wrap = el('div', { className: 'pmk145-combobox' });
    const trigger = button('', () => toggle(), 'pmk145-combo-trigger');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const panel = el('div', { className: 'pmk145-combo-panel pmk145-hidden' });
    const search = el('input', { type: 'search', className: 'pmk145-input pmk145-combo-search', placeholder: 'Rechercher dans les choix…', 'aria-label': 'Filtrer les valeurs' });
    const list = el('div', { className: 'pmk145-combo-list', role: 'listbox' });
    const count = el('div', { className: 'pmk145-option-count' });
    const normalise = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
    function label() { const option = opts.find(o => o.value === control.value); trigger.textContent = (option && option.label !== '' ? option.label : (fieldIsLostZero() ? ' ' : 'Choisir…')) + '  ▾'; }
    function fieldIsLostZero() { return opts.some(o => o.value === '0' && o.label === '') && control.value === '0'; }
    function render() {
      const q = normalise(search.value).trim();
      const filtered = opts.filter(o => normalise(o.label + ' ' + o.value).includes(q));
      list.replaceChildren();
      filtered.forEach(o => {
        const item = button(o.label || (o.value === '0' ? 'Aucun statut perdu' : '(vide)'), () => {
          control.value = o.value;
          control.dispatchEvent(new Event('change', { bubbles: true }));
          label(); close();
        }, 'pmk145-combo-option');
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(control.value === o.value));
        list.append(item);
      });
      count.textContent = filtered.length + ' résultat(s)';
      if (!filtered.length) list.append(paragraph('Aucune valeur correspondante.'));
    }
    function close() { panel.classList.add('pmk145-hidden'); trigger.setAttribute('aria-expanded', 'false'); }
    function toggle() {
      const opening = panel.classList.contains('pmk145-hidden');
      if (!opening) return close();
      panel.classList.remove('pmk145-hidden'); trigger.setAttribute('aria-expanded', 'true');
      search.value = ''; render();
      const r = trigger.getBoundingClientRect();
      const roomBelow = window.innerHeight - r.bottom;
      const roomAbove = r.top;
      panel.style.top = roomBelow < 280 && roomAbove > roomBelow ? 'auto' : 'calc(100% + 3px)';
      panel.style.bottom = roomBelow < 280 && roomAbove > roomBelow ? 'calc(100% + 3px)' : 'auto';
      search.focus();
    }
    search.addEventListener('input', render);
    search.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); trigger.focus(); } });
    document.addEventListener('pointerdown', e => { if (!wrap.contains(e.target)) close(); });
    panel.append(search, list, count);
    wrap.append(trigger, panel, control);
    label(); render();
    return { wrap, search, trigger };
  }

  // Cartes du module 129 : rafraîchir les libellés affichés uniquement,
  // sans jamais recréer les cartes ni modifier les compteurs de circulation.
  function updateCards(itemId, field, value, options) {
    const label = options?.find(o => String(o.value) === String(value))?.label ?? String(value ?? '');
    document.querySelectorAll('.kxri-item[data-item-id="' + itemId + '"]').forEach(card => {
      const set = (selector, text, root = card) => {
        const node = root.querySelector(selector);
        if (node) { const edit = node.querySelector(':scope > .pmk145-edit-card'); node.replaceChildren(document.createTextNode(text + (edit ? ' ' : ''))); if (edit) node.append(edit); }
      };
      const setDetails = (name, text) => {
        card.querySelectorAll('.kxri-detail-label').forEach(n => {
          if (n.textContent.trim().toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr')) {
            const sibling = n.nextElementSibling;
            if (sibling?.classList.contains('kxri-detail-value')) {
              const btn = sibling.querySelector('.pmk145-edit-card');
              sibling.replaceChildren(document.createTextNode(text + ' '));
              if (btn) sibling.append(btn);
            }
          }
        });
      };
      if (field.id === 'location') { set('.kxri-location', label); setDetails('Localisation', label); }
      if (field.id === 'callnumber') {
        card.querySelectorAll('.kxri-callnumber a, .kxri-detail-value a[href*="callnum"]').forEach(a => {
          a.textContent = String(value ?? '');
          a.href = '/cgi-bin/koha/catalogue/search.pl?idx=callnum&q=' + encodeURIComponent('"' + value + '"');
        });
        setDetails('Cote', String(value ?? ''));
      }
      if (field.id === 'homebranch') {
        set('.kxri-secondary strong', label);
        setDetails('Site propriétaire', label);
      }
      if (field.id === 'itemtype') { setDetails('Type', label); const candidates = [...card.querySelectorAll('.kxri-main > .kxri-secondary')]; const target = candidates.find(n => !n.querySelector('strong')); if (target) { const edit = target.querySelector('.pmk145-edit-card'); target.replaceChildren(document.createTextNode(label + ' ')); if (edit) target.append(edit); } card.querySelector('.kxri-itemtype-icon')?.remove(); }
      if (field.id === 'collection') setDetails('Code collection', label);
      if (field.id === 'notforloan' || field.id === 'lost') {
        let hint = card.querySelector('.pmk145-card-status-pending');
        if (!hint) { hint = el('small', { className: 'pmk145-card-status-pending' }); card.querySelector('.kxri-status')?.after(hint); }
        if (hint) hint.textContent = 'Statuts modifiés · rafraîchir pour la disponibilité';
      }
    });
  }

  // Synchronisation idempotente : une seule valeur affichée, jamais d'empilement.
  // Les décorations des autres modules sont préservées.
  function updateVisibleItem(itemId, field, value, options) {
    updateCards(itemId, field, value, options);
    const row = Array.from(document.querySelectorAll('#holdings_table tbody tr'))
      .find(tr => idFromRow(tr) === itemId);
    if (!row) return;
    const table = row.closest('table');
    const headers = Array.from(table?.tHead?.rows[0]?.cells || []);
    const index = headers.findIndex(th => th.dataset.colname === field.column);
    const cell = index >= 0 ? row.cells[index] : null;
    const label = options?.find(v => String(v.value) === String(value))?.label ?? String(value ?? '');
    const sourceLabel = String(label);

    // Remplacer les nœuds texte natifs sans altérer les badges, liens et boutons PMK.
    function setDirectText(target, text) {
      let textNode = target.querySelector(':scope > .pmk145-native-value');
      if (!textNode) {
        textNode = document.createElement('span');
        textNode.className = 'pmk145-native-value';
        target.prepend(textNode);
      }
      textNode.textContent = text;
      for (const node of Array.from(target.childNodes)) {
        if (node !== textNode && node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = '';
        }
      }
    }
    if (cell) {
      if (field.id === 'location') {
        const span = cell.querySelector('.shelvingloc');
        if (span) {
          span.textContent = sourceLabel;
          span.dataset.pmk033NativeText = sourceLabel;
          // Nettoyer les éventuels anciens libellés directement dans la cellule.
          for (const node of Array.from(cell.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.textContent = '';
          }
          cell.querySelector(':scope > .pmk145-native-value')?.remove();
        } else setDirectText(cell, sourceLabel);
      } else if (field.id === 'homebranch') {
        // La bibliothèque actuelle n'est jamais modifiée par cette opération.
        setDirectText(cell, sourceLabel);
      } else if (field.id === 'callnumber') {
        setDirectText(cell, sourceLabel);
        cell.dataset.pmk065SourceValue = sourceLabel;
      } else if (field.id === 'collection') {
        const link = cell.querySelector('a[data-pmk021-dynamic-link], a[href*="ccode"]');
        if (link) {
          link.textContent = sourceLabel;
          link.href = '/cgi-bin/koha/catalogue/search.pl?q=' + encodeURIComponent('ccode:"' + value + '"');
          for (const node of Array.from(cell.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.textContent = '';
          }
          cell.querySelector(':scope > .pmk145-native-value')?.remove();
        } else setDirectText(cell, sourceLabel);
      } else if (field.id === 'itemtype') {
        const desc = cell.querySelector('.itypedesc, .itypetext');
        if (desc) {
          desc.textContent = sourceLabel;
          cell.querySelector(':scope > .pmk145-native-value')?.remove();
        } else setDirectText(cell, sourceLabel);
        // L'icône du type de document est liée au type Koha et ne peut pas être
        // déduite du seul libellé ; on retire l'ancienne plutôt que d'afficher une fausse icône.
        cell.querySelectorAll('img.itemtype-image').forEach(img => img.remove());
      } else if (field.id === 'notforloan' || field.id === 'lost') {
        // Le statut visible est composite (prêt, perdu, NOT_LOAN...). Il ne faut
        // surtout pas le remplacer par le libellé d'une seule valeur.
        // Informer l'utilisateur qu'une mise à jour Koha sera nécessaire.
        cell.dataset.pmk145StatusPending = '1';
        let indicator = cell.querySelector(':scope > .pmk145-status-changed');
        if (!indicator) {
          indicator = el('span', { className: 'pmk145-status-changed' });
          cell.append(indicator);
        }
        indicator.textContent = 'Statut modifié · actualiser pour l’affichage complet';
      } else {
        setDirectText(cell, sourceLabel);
      }
    }
    // Pas d'invalidate('dom') : DataTables pourrait réutiliser le DOM décoré
    // (boutons/badges) comme donnée source et provoquer des doublons aux redraws.
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = el('div', { id: 'pmk145-overlay', className: 'pmk145-hidden' });
    dialog.innerHTML = '<div class="pmk145-modal" role="dialog" aria-modal="true" aria-labelledby="pmk145-title"><div class="pmk145-head"><strong id="pmk145-title">Édition rapide</strong><button type="button" id="pmk145-close" aria-label="Fermer">×</button></div><div id="pmk145-content"></div><div id="pmk145-foot"></div></div>';
    document.body.append(dialog);
    dialog.querySelector('#pmk145-close').addEventListener('click', closeDialog);
    dialog.addEventListener('click', e => { if (e.target === dialog && !busy) closeDialog(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !busy) closeDialog(); });
    return dialog;
  }
  function closeDialog() {
    if (busy || !dialog) return;
    dialog.classList.add('pmk145-hidden');
    current = null;
  }
  function showDialog(title) {
    ensureDialog().classList.remove('pmk145-hidden');
    dialog.querySelector('#pmk145-title').textContent = title;
    dialog.querySelector('#pmk145-content').replaceChildren();
    dialog.querySelector('#pmk145-foot').replaceChildren();
  }
  function paragraph(text, cls = '') { return el('p', { className: cls }, text); }
  function displayValue(value, options = null) {
    const raw = String(value ?? '');
    const option = options?.find(entry => String(entry.value) === raw);
    return option ? String(option.label || (raw === '0' ? 'Aucun' : '(vide)')) : (raw || '(vide)');
  }
  function changePreview(field, before, after, options = null) {
    const changed = String(before ?? '') !== String(after ?? '');
    const box = el('div', {
      className: 'pmk145-change-preview' + (changed ? ' pmk145-change-preview-active' : ''),
      role: 'status',
      'aria-live': 'polite'
    });
    box.dataset.changed = String(changed);
    box.append(el('strong', {}, changed ? 'Modification à confirmer' : 'Aucune modification'));
    if (changed) {
      box.append(paragraph(field.label + ' : « ' + displayValue(before, options) + ' » → « ' + displayValue(after, options) + ' »'));
      if (field.sensitivity === 'strict') box.append(paragraph('Champ sensible : l’état de circulation sera relu juste avant l’écriture.', 'pmk145-sensitive-label'));
    }
    return box;
  }
  function button(label, click, cls = '') {
    const b = el('button', { type: 'button', className: cls }, label);
    b.addEventListener('click', click);
    return b;
  }
  // L'absence de données de circulation n'est jamais interprétée comme une autorisation.
  async function validateStrict(itemId) {
    let snapshot;
    try {
      const path = '/biblios/' + BIBLIO + '/items?q=' + encodeURIComponent(JSON.stringify({ item_id: itemId })) + '&_per_page=20';
      const list = await request(path, { headers: { 'x-koha-embed': 'checkout,transfer,first_hold' } });
      snapshot = Array.isArray(list) ? list.find(x => Number(x.item_id) === itemId) : null;
      if (!snapshot) throw new Error('Exemplaire absent de la réponse de contrôle.');
    } catch (err) { throw new Error('Vérification de circulation indisponible : ' + err.message + '. Modification du champ sensible bloquée.'); }
    if (!Object.hasOwn(snapshot, 'checkout') || !Object.hasOwn(snapshot, 'transfer') || !Object.hasOwn(snapshot, 'first_hold')) {
      throw new Error('Impossible de certifier l’état de circulation (embeds API manquants). Modification bloquée.');
    }
    if (snapshot.checkout) throw new Error('Exemplaire en prêt : modification interdite.');
    if (snapshot.transfer) throw new Error('Exemplaire en transfert : modification interdite.');
    if (snapshot.first_hold) throw new Error('Réservation active : modification interdite.');
    // Une réservation au niveau notice peut ne pas apparaître dans first_hold.
    // On bloque si une quelconque réservation active de la notice existe.
    const holds = await request('/holds?biblio_id=' + BIBLIO + '&_per_page=500');
    if (!Array.isArray(holds)) throw new Error('Réservations non vérifiables : modification bloquée.');
    if (holds.length > 0) throw new Error('Réservations actives sur la notice : modification interdite.');
    // Ne jamais supposer qu'un état perdu/retiré est neutre.
    if (snapshot.withdrawn || snapshot.withdrawn_status) throw new Error('Exemplaire retiré : modification sensible bloquée.');
    return snapshot;
  }
  async function openEditor(itemId, field) {
    if (!moduleEnabled || !config[field.id] || busy) return;
    busy = true;
    showDialog(field.label + ' — exemplaire ' + itemId);
    const content = dialog.querySelector('#pmk145-content');
    const foot = dialog.querySelector('#pmk145-foot');
    content.append(paragraph('Chargement de l’exemplaire et des valeurs autorisées…'));
    try {
      const item = await getItem(itemId);
      if (Number(item.item_id) !== itemId || Number(item.biblio_id) !== BIBLIO) throw new Error('Identité de l’exemplaire incohérente.');
      if (!Object.hasOwn(item, field.api)) throw new Error('Champ API ' + field.api + ' absent : édition interdite.');
      if (field.sensitivity === 'strict') await validateStrict(itemId);
      const old = item[field.api];
      const select = field.va || field.type === 'itemtypes' || field.type === 'libraries';
      const control = select ? el('select', { className: 'pmk145-input' }) : el(field.type === 'textarea' ? 'textarea' : 'input', { className: 'pmk145-input' });
      if (!select && field.type !== 'textarea') control.type = 'text';
      let options = null;
      let searchInput = null;
      if (select) {
        const opts = await getOptions(field);
        // Une ancienne valeur de collection peut ne plus appartenir à CCODE.
        // On l'affiche pour permettre sa correction, sans la considérer autorisée.
        const originalCode = String(old ?? '');
        const present = opts.some(v => v.value === originalCode);
        options = present ? opts : [
          { value: originalCode, label: originalCode ? originalCode + ' — valeur actuelle hors VA' : '(vide) — valeur actuelle hors VA', legacy: true },
          ...opts
        ];
        options.forEach(v => control.append(el('option', { value: v.value }, v.label)));
        control.value = originalCode;
      } else control.value = old == null ? '' : String(old);
      const choice = select ? makeSearchableSelect(control, options) : null;
      if (choice) searchInput = choice.search;
      const previewHost = el('div', { className: 'pmk145-preview-host' });
      const renderPreview = () => previewHost.replaceChildren(changePreview(field, old, control.value, options));
      content.replaceChildren(paragraph('Valeur actuelle : ' + (old == null || (field.id === 'lost' && String(old) === '0') ? '(vide)' : String(old)), 'pmk145-old'), choice ? choice.wrap : control, previewHost);
      control.addEventListener(select ? 'change' : 'input', renderPreview);
      renderPreview();
      if (select && options.some(o => o.legacy)) {
        content.append(paragraph('La valeur actuelle ne figure pas dans la catégorie de valeurs autorisées configurée. Sélectionnez une valeur autorisée pour la remplacer ; la valeur historique est conservée tant que vous ne validez pas.', 'pmk145-warning'));
      }
      if (field.sensitivity === 'strict') content.append(paragraph('Modification conditionnée : prêt, transfert et réservations doivent être absents. Un contrôle API sera relancé juste avant l’écriture.', 'pmk145-warning'));
      foot.replaceChildren(button('Annuler', closeDialog), button('Enregistrer', async () => {
        if (busy) return;
        const raw = control.value;
        let value = field.id === 'notforloan' || field.id === 'lost' ? Number(raw) : raw;
        if (String(old ?? '') === String(raw)) return closeDialog();
        if (select && !options.some(o => o.value === raw && !o.legacy)) {
          return notify('Choisissez une valeur présente dans la catégorie autorisée.', true);
        }
        if (!select && raw.length > 1000) return notify('Valeur trop longue (maximum 1000 caractères).', true);
        if (statusRules[field.id]?.confirm.includes(raw) && !window.confirm('Confirmer le passage à « ' + (control.selectedOptions[0].textContent || 'Aucun statut perdu') + ' » ?')) return;
        busy = true;
        try {
          // Relecture obligatoire : refuse une modification concurrente du même champ.
          const latest = field.sensitivity === 'strict' ? await validateStrict(itemId) : await getItem(itemId);
          if (Number(latest.item_id) !== itemId || Number(latest.biblio_id) !== BIBLIO) throw new Error('L’exemplaire a changé.');
          if (String(latest[field.api] ?? '') !== String(old ?? '')) throw new Error('La valeur a changé depuis l’ouverture. Rechargez pour éviter un conflit.');
          if (field.id === 'homebranch' && !window.confirm('Confirmer le changement de site propriétaire pour l’exemplaire ' + itemId + ' ?\n\nLe site actuel restera inchangé.')) return;
          // La sémantique PUT de Koha doit être confirmée sur la base de recette.
          // Une écriture partielle peut effacer d'autres champs sur certaines API.
          await request(itemWritePath(itemId), { method: 'PUT', body: JSON.stringify({ [field.api]: value }) });
          const after = await getItem(itemId);
          if (String(after[field.api] ?? '') !== String(value)) throw new Error('Écriture non confirmée par la relecture API. Rechargez la page.');
          notify('Exemplaire ' + itemId + ' : ' + field.label + ' « ' + displayValue(old, options) + ' » → « ' + displayValue(after[field.api], options) + ' ».');
          dialog.classList.add('pmk145-hidden');
          current = null;
          updateVisibleItem(itemId, field, after[field.api], options);
        } catch (err) {
          content.querySelectorAll('.pmk145-error-text').forEach(n => n.remove());
          content.append(paragraph(err.message, 'pmk145-error-text'));
          notify(err.message, true);
        } finally { busy = false; }
      }, 'pmk145-primary'));
      (choice ? choice.trigger : control).focus();
    } catch (err) {
      content.replaceChildren(paragraph(err.message, 'pmk145-error-text'));
      foot.replaceChildren(button('Fermer', closeDialog));
    } finally { busy = false; }
  }
  // Édition groupée : un seul crayon, deux champs indépendamment configurables.
  // Aucun traitement ni aucune annulation de transfert.
  async function openStatusEditor(itemId) {
    const fields = FIELDS.filter(f => (f.id === 'notforloan' || f.id === 'lost') && config[f.id]);
    if (!moduleEnabled || !fields.length || busy) return;
    busy = true;
    showDialog('Statuts — exemplaire ' + itemId);
    const content = dialog.querySelector('#pmk145-content');
    const foot = dialog.querySelector('#pmk145-foot');
    content.append(paragraph('Lecture des statuts et contrôle de circulation…'));
    try {
      const item = await getItem(itemId);
      if (Number(item.item_id) !== itemId || Number(item.biblio_id) !== BIBLIO) throw new Error('Identité de l’exemplaire incohérente.');
      for (const field of fields) if (!Object.hasOwn(item, field.api)) throw new Error('Champ API ' + field.api + ' absent.');
      await validateStrict(itemId);
      const initial = Object.fromEntries(fields.map(f => [f.id, item[f.api]]));
      const widgets = [];
      const previewHost = el('div', { className: 'pmk145-preview-host' });
      content.replaceChildren();
      for (const field of fields) {
        const options = await getOptions(field);
        const original = initial[field.id];
        if (!options.some(o => o.value === String(original ?? ''))) throw new Error('Valeur actuelle absente de la liste : ' + field.label);
        const select = el('select', { className: 'pmk145-input' });
        options.forEach(o => select.append(el('option', {value: o.value}, o.label)));
        select.value = String(original ?? '');
        const choice = makeSearchableSelect(select, options);
        const label = el('label', {className:'pmk145-status-field-label'}, field.label);
        const group = el('div', {className:'pmk145-status-field'});
        group.append(label, choice.wrap);
        content.append(group);
        widgets.push({field, options, select, choice});
      }
      const renderPreviews = () => {
        const changes = widgets.filter(w => String(initial[w.field.id] ?? '') !== w.select.value);
        previewHost.replaceChildren(...(changes.length
          ? changes.map(w => changePreview(w.field, initial[w.field.id], w.select.value, w.options))
          : [changePreview(fields[0], '', '')]));
      };
      widgets.forEach(w => w.select.addEventListener('change', renderPreviews));
      content.append(previewHost);
      renderPreviews();
      content.append(paragraph('La modification est interdite pendant un prêt, un transfert ou une réservation. Aucun transfert ne sera annulé.', 'pmk145-warning'));
      foot.replaceChildren(button('Annuler', closeDialog), button('Enregistrer', async () => {
        if (busy) return;
        const changes = widgets.filter(w => String(initial[w.field.id] ?? '') !== w.select.value);
        if (!changes.length) return closeDialog();
        for (const w of changes) {
          if (statusRules[w.field.id]?.confirm.includes(w.select.value)) {
            const display = w.options.find(o => o.value === w.select.value)?.label || 'Aucun statut perdu';
            if (!window.confirm('Confirmer le changement de « ' + w.field.label + ' » vers « ' + display + ' » ?')) return;
          }
        }
        busy = true;
        try {
          await validateStrict(itemId);
          const latest = await getItem(itemId);
          if (Number(latest.item_id) !== itemId || Number(latest.biblio_id) !== BIBLIO) throw new Error('L’exemplaire a changé.');
          for (const w of widgets) if (String(latest[w.field.api] ?? '') !== String(initial[w.field.id] ?? '')) {
            throw new Error('Un statut a changé depuis l’ouverture. Rechargez la notice.');
          }
          const payload = Object.fromEntries(changes.map(w => [w.field.api, Number(w.select.value)]));
          await request(itemWritePath(itemId), {method:'PUT', body:JSON.stringify(payload)});
          const after = await getItem(itemId);
          for (const w of changes) if (String(after[w.field.api] ?? '') !== w.select.value) {
            throw new Error('Écriture non confirmée pour ' + w.field.label + '. Rechargez la notice.');
          }
          dialog.classList.add('pmk145-hidden');
          current = null;
          for (const w of changes) updateVisibleItem(itemId, w.field, after[w.field.api], w.options);
          notify('Statuts de l’exemplaire ' + itemId + ' mis à jour : ' + changes.map(w => w.field.label + ' « ' + displayValue(initial[w.field.id], w.options) + ' » → « ' + displayValue(after[w.field.api], w.options) + ' »').join(' ; ') + '.');
        } catch (err) {
          content.querySelectorAll('.pmk145-error-text').forEach(n => n.remove());
          content.append(paragraph(err.message, 'pmk145-error-text'));
          notify(err.message, true);
        } finally {busy = false;}
      }, 'pmk145-primary'));
    } catch (err) {
      content.replaceChildren(paragraph(err.message, 'pmk145-error-text'));
      foot.replaceChildren(button('Fermer', closeDialog));
    } finally {busy = false;}
  }
  // Le module 129 reconstruit ses cartes à chaque chargement AJAX :
  // décorations idempotentes, indépendantes de son moteur et de son tri.
  function cardBiblio(card) {
    const row = card.closest('tr[id^="row"]');
    const match = row?.id?.match(/^row(\d+)$/);
    if (match) return Number(match[1]);
    const link = row?.querySelector('a[href*="biblionumber="]');
    if (link) { try { return Number(new URL(link.href, location.origin).searchParams.get('biblionumber')); } catch (_) {} }
    return 0;
  }
  function cardEdit(card, itemId, field, anchor, status = false) {
    if (!anchor || anchor.querySelector(':scope > .pmk145-edit-card')) return;
    const b = button('✎', () => {
      const bib = cardBiblio(card);
      if (!Number.isSafeInteger(bib) || bib < 1) return notify('Numéro de notice introuvable pour cet exemplaire.', true);
      BIBLIO = bib;
      if (status) openStatusEditor(itemId);
      else openEditor(itemId, field);
    }, 'pmk145-edit-card');
    b.title = status ? 'Modifier les statuts' : 'Modifier ' + field.label;
    b.setAttribute('aria-label', b.title + ' pour l’exemplaire ' + itemId);
    anchor.append(b);
  }
  function decorateCards() {
    if (!ON_SEARCH || !moduleEnabled) return;
    document.querySelectorAll('.kxri-item[data-item-id]').forEach(card => {
      const itemId = Number(card.dataset.itemId);
      if (!Number.isSafeInteger(itemId) || itemId <= 0) return;
      const find = id => FIELDS.find(f => f.id === id);
      const bindings = [
        ['location', '.kxri-location'],
        ['callnumber', '.kxri-callnumber'],
        ['itemtype', '.kxri-secondary:not(:has(strong))'],
        ['homebranch', '.kxri-secondary:has(strong)']
      ];
      bindings.forEach(([id, selector]) => {
        if (config[id]) cardEdit(card, itemId, find(id), card.querySelector(selector));
      });
      if (config.notforloan || config.lost) cardEdit(card, itemId, null, card.querySelector('.kxri-status'), true);
      card.querySelectorAll('.kxri-detail-label').forEach(label => {
        const name = label.textContent.trim();
        const map = {'Code collection':'collection', 'Localisation':'location', 'Cote':'callnumber', 'Site propriétaire':'homebranch', 'Type':'itemtype'};
        const id = map[name];
        if (id && config[id]) cardEdit(card, itemId, find(id), label.nextElementSibling);
      });
    });
  }
  function decorate() {
    const table = document.getElementById('holdings_table');
    if (!table) return;
    table.querySelectorAll('tbody tr').forEach(row => {
      const itemId = idFromRow(row);
      if (!itemId) return;
      Array.from(row.cells).forEach(cell => {
        const field = fieldByColumn(cell);
        if (!field || cell.querySelector('.pmk145-edit-cell')) return;
        const b = button('✎', () => openEditor(itemId, field), 'pmk145-edit-cell');
        b.title = 'Modifier ' + field.label;
        b.setAttribute('aria-label', 'Modifier ' + field.label + ' pour exemplaire ' + itemId);
        cell.append(b);
      });
      const statusIndex = Array.from(table.tHead?.rows[0]?.cells || []).findIndex(th => th.dataset.colname === 'status');
      const statusCell = statusIndex >= 0 ? row.cells[statusIndex] : null;
      if (statusCell && (config.notforloan || config.lost) && !statusCell.querySelector('[data-pmk145-status-editor="1"]')) {
        const b = button('✎', () => openStatusEditor(itemId), 'pmk145-edit-cell');
        b.dataset.pmk145StatusEditor = '1';
        b.title = 'Modifier les statuts';
        b.setAttribute('aria-label', 'Modifier les statuts pour exemplaire ' + itemId);
        statusCell.append(b);
      }
      // Aucun second crayon dans la cellule statut, même si plusieurs champs sont actifs.

    });
    // Supprimer d'anciens boutons lorsqu'une ancienne version était injectée.
    table.querySelectorAll('.pmk145-edit-item').forEach(node => node.remove());
    document.getElementById('pmk145-settings')?.remove();
  }
  const style = el('style', { id: 'pmk145-style' });
  style.textContent = `
    .pmk145-status-field{margin:0 0 15px}
    .pmk145-status-field-label{display:block;font-weight:600;margin-bottom:5px}
    .pmk145-edit-cell{border:0;background:transparent;color:#63738a;padding:0 4px;font-size:13px;cursor:pointer}
    .pmk145-edit-cell:hover{color:#0056b3}
    .pmk145-edit-card{display:inline-flex;align-items:center;justify-content:center;margin-left:5px;padding:1px 4px;border:0;border-radius:4px;background:transparent;color:#52708f;cursor:pointer;font-size:12px;vertical-align:baseline;line-height:1.1}
    .pmk145-edit-card:hover,.pmk145-edit-card:focus-visible{background:#dcebf6;color:#104d85}
    .pmk145-card-status-pending{display:block;color:#8a6110;font-size:11px;margin-top:3px}
    .pmk145-status-changed{display:block;font-size:11px;color:#806600;font-weight:normal;margin-top:3px}
    #pmk145-overlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.50);display:flex;align-items:center;justify-content:center;padding:14px;overflow-y:auto}
    #pmk145-overlay.pmk145-hidden{display:none}
    .pmk145-modal{background:#fff;color:#273443;border-radius:9px;width:min(560px,100%);overflow:visible;box-shadow:0 12px 40px #0004;padding:18px}
    .pmk145-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:11px;margin-bottom:12px;font-size:17px}
    #pmk145-close{font-size:25px;border:0;background:transparent;cursor:pointer}
    #pmk145-foot{margin-top:17px;display:flex;justify-content:flex-end;gap:9px}
    #pmk145-foot button,.pmk145-fields button{border:1px solid #cbd3dc;background:#fff;border-radius:5px;padding:7px 12px;cursor:pointer}
    #pmk145-foot .pmk145-primary{background:#1769aa;border-color:#1769aa;color:#fff}
    .pmk145-input{width:100%;padding:7px;border:1px solid #bbb;border-radius:4px;margin-top:6px}
    .pmk145-combobox{position:relative;width:100%;margin-top:7px}
    .pmk145-combo-trigger{display:block;width:100%;padding:9px 11px;text-align:left;border:1px solid #b9c5d2;background:white;border-radius:6px;cursor:pointer}
    .pmk145-combo-panel{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:100;max-height:min(340px,60vh);overflow:auto;background:#fff;border:1px solid #b9c5d2;border-radius:7px;box-shadow:0 8px 24px #0002;padding:7px}
    .pmk145-combo-panel.pmk145-hidden{display:none}
    .pmk145-combo-search{margin:0 0 6px!important;width:100%!important}
    .pmk145-combo-list{max-height:220px;overflow-y:auto}
    .pmk145-combo-option{display:block;width:100%;text-align:left;padding:7px 9px;border:0;background:white;color:#263648;cursor:pointer;border-radius:4px}
    .pmk145-combo-option:hover,.pmk145-combo-option[aria-selected=true]{background:#edf4fb}

    .pmk145-option-count{font-size:11px;color:#6b7280;text-align:right;margin-top:4px}
    textarea.pmk145-input{min-height:85px}
    .pmk145-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:8px}
    .pmk145-config-row{display:flex;gap:9px;align-items:center;padding:7px 2px;border-bottom:1px solid #eee}
    .pmk145-warning{background:#fff5d7;padding:8px;border-radius:5px;font-size:12px;margin-top:12px}
    .pmk145-old{font-size:13px;color:#536074}
    .pmk145-change-preview{margin-top:12px;padding:10px 12px;border:1px solid #c9d2dc;border-radius:6px;background:#f5f7f9;color:#536074}
    .pmk145-change-preview-active{border-color:#6d99bf;background:#edf6fd;color:#243746}
    .pmk145-change-preview p{margin:5px 0 0;overflow-wrap:anywhere}
    .pmk145-sensitive-label{font-size:12px;font-weight:600;color:#7c4b00}
    .pmk145-error-text{color:#aa2532;font-weight:600}
    #pmk145-toast{position:fixed;bottom:20px;right:20px;z-index:1000001;max-width:450px;padding:0;border-radius:6px}
    #pmk145-toast.pmk145-ok{background:#ddf3e6;color:#175c35;padding:11px}
    #pmk145-toast.pmk145-error{background:#fde5e5;color:#922;padding:11px}
  `;
  document.head.append(style);
  decorate();
  decorateCards();
  if (ON_SEARCH) {
    let cardFrame = false;
    const cardObserver = new MutationObserver(records => {
      if (!records.some(r => Array.from(r.addedNodes).some(n => n.nodeType === 1 && (n.matches?.('.kxri-item, .kxri-items, .kxri-panel') || n.querySelector?.('.kxri-item'))))) return;
      if (cardFrame) return;
      cardFrame = true;
      requestAnimationFrame(() => { cardFrame = false; decorateCards(); });
    });
    cardObserver.observe(document.body, {childList:true, subtree:true});
    window.addEventListener('pmk129:items-rendered', decorateCards);
  }
  // DataTables reconstruit régulièrement tbody ; observer seulement le tableau.
  const tryObserve = () => {
    const table = document.getElementById('holdings_table');
    if (!table || table.dataset.pmk145Observed) return;
    table.dataset.pmk145Observed = '1';
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; decorate(); });
    });
    observer.observe(table.tBodies[0] || table, { childList: true, subtree: true });
  };
  tryObserve();
  if (!document.getElementById('holdings_table')) {
    const watcher = new MutationObserver(() => {
      if (document.getElementById('holdings_table')) { watcher.disconnect(); decorate(); tryObserve(); }
    });
    watcher.observe(document.body, { childList: true, subtree: true });
  }
  console.info(NAME + ' : module chargé ; autorisations API et correspondances à valider en recette.');
})();
