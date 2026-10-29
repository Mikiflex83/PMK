/* PMK — Dernier emprunteur — module isolé, Koha 25.11
 * Charger APRES 000-pmk-config-firestore.js.
 * Configuration via PMKConfig.registerModule, aucune configuration locale parallèle.
 * SQL attendu : WHERE ilb.itemnumber = <<itemnumber>>
 * Ne fournit aucun mécanisme de contournement des permissions Koha.
 */
(function (w, d) {
  'use strict';
  const ID = 'last-borrower', VERSION = '1.1.3';
  if (w.PMKLastBorrower?.version) return;
  const PMK = w.PMKConfig;
  if (!PMK || typeof PMK.registerModule !== 'function') {
    console.error('[PMK dernier emprunteur] Le socle 000 doit être chargé avant ce module.');
    return;
  }
  const REPORT_SQL = `SELECT
  i.itemnumber,
  b.borrowernumber,
  b.cardnumber,
  b.firstname,
  b.surname,
  (
    SELECT MAX(oi.returndate)
    FROM old_issues oi
    WHERE oi.itemnumber = i.itemnumber
  ) AS created_on
FROM items i
LEFT JOIN borrowers b ON b.borrowernumber = i.last_returned_by
WHERE i.itemnumber = <<itemnumber>>`;
  const defaults = {
    enabled: true, reportId: '',
    sqlTemplate: REPORT_SQL,
    detailEnabled: true, moredetailEnabled: true,
    detailSelector: '#holdings_table tbody tr, #holdings tbody tr, #items_table tbody tr',
    moredetailSelector: '#catalogue_detail_biblio, #catalogue_detail, #main, main',
    buttonLabel: 'Dernier emprunteur anonymisé', showCardNumber: true, showDate: true
  };
  const pair = (fr, en) => ({fr, en});
  function pickTarget(path) {
    return function (ctx) {
      return PMK.elementPicker.pickForConfig({
        moduleId: ID,
        targetUrl: path,
        fieldPath: Array.isArray(ctx?.fieldPath) ? ctx.fieldPath.slice() : [],
        rootObject: ctx?.rootObject || {},
        persistAfterPick: false,
        options: {bannerText:'Clique sur la zone cible — Échap pour annuler'}
      });
    };
  }
  PMK.elementPicker.register(ID, {
    applyPending: function (draft, pending, picked) {
      const key = pending?.fieldPath?.[0];
      if ((key === 'detailSelector' || key === 'moredetailSelector') && picked?.selector) draft[key] = picked.selector;
      return draft;
    }
  });
  PMK.registerModule({
    id: ID, schemaVersion: 1,
    name: pair('Dernier emprunteur anonymisé', 'Last borrower retained after anonymization'),
    description: pair('Recherche du dernier emprunteur conservé par Koha grâce à StoreLastBorrower, y compris lorsque l’historique des prêts a été anonymisé. Ce module ne réidentifie pas les données supprimées : il consulte une donnée distincte conservée par Koha. Nécessite un rapport SQL privé et les droits Koha adéquats.', 'Lookup of the last borrower retained by Koha through StoreLastBorrower, even after loan history anonymization. This module does not reverse anonymization: it reads separately retained data. Requires a private SQL report and appropriate Koha permissions.'),
    category: pair('Catalogue / exemplaires', 'Catalog / items'),
    supportedPages: ['catalogue.detail', 'catalogue.moredetail'],
    defaults,
    validate: c => (!c.reportId || /^[1-9]\d*$/.test(String(c.reportId)))
      ? {ok:true} : {ok:false, message:pair('L’identifiant du rapport doit être numérique.', 'Report ID must be numeric.')},
    schema: [
      {type:'section', id:'activation', label:pair('Activation', 'Activation'), fields:[
        {key:'enabled',type:'boolean',label:pair('Activer le module','Enable module')},
        {key:'detailEnabled',type:'boolean',label:pair('Afficher sur detail.pl','Show on detail.pl')},
        {key:'moredetailEnabled',type:'boolean',label:pair('Afficher sur moredetail.pl','Show on moredetail.pl')}
      ]},
      {type:'section', id:'source', label:pair('Source SQL Koha','Koha SQL source'), fields:[
        {key:'reportId',type:'text',label:pair('Identifiant du rapport SQL privé','Private SQL report ID'),placeholder:'5270'},
        {key:'sqlTemplate',type:'textarea',rows:16,readOnly:true,label:pair('SQL à copier dans Koha','SQL to copy into Koha'),help:pair('Créer un rapport guidé privé avec ce SQL, conserver le paramètre <<itemnumber>>, puis saisir son identifiant ci-dessus. Le droit d’exécuter ce rapport reste géré par Koha.','Create a private guided report with this SQL, keep the <<itemnumber>> parameter, then enter its ID above. Koha continues to enforce report permissions.')}
      ]},
      {type:'section', id:'ciblage', label:pair('Emplacement des boutons','Button placement'), fields:[
        {key:'detailSelector',type:'elementPicker',allowManual:true,pick:pickTarget('/cgi-bin/koha/catalogue/detail.pl'),label:pair('Lignes exemplaires de detail.pl','Item rows on detail.pl')},
        {key:'moredetailSelector',type:'elementPicker',allowManual:true,pick:pickTarget('/cgi-bin/koha/catalogue/moredetail.pl'),label:pair('Zone d’affichage sur moredetail.pl','Display area on moredetail.pl')}
      ]},
      {type:'section', id:'affichage', label:pair('Présentation','Presentation'), fields:[
        {key:'buttonLabel',type:'text',label:pair('Texte du bouton','Button label')},
        {key:'showCardNumber',type:'boolean',label:pair('Afficher le numéro de carte','Show card number')},
        {key:'showDate',type:'boolean',label:pair('Afficher la date d’enregistrement','Show record date')}
      ]}
    ]
  });
  const style = d.createElement('style');
  style.textContent = `.pmk-lb-widget{display:inline-block;vertical-align:top;max-width:100%;margin:4px 6px;position:relative}
    .pmk-lb-button{padding:4px 9px;border:1px solid #c9d2dd;border-radius:7px;background:#f8fafc;color:#334155;font:inherit;font-size:12px;cursor:pointer}
    .pmk-lb-button:hover{background:#e9eef5}.pmk-lb-button:disabled{opacity:.55}
    .pmk-lb-card{margin-top:6px;padding:10px 12px;border:1px solid #d7e0e8;border-radius:9px;background:#fff;box-shadow:0 2px 8px #0001;min-width:215px;max-width:340px;overflow-wrap:anywhere;line-height:1.5;font-size:13px}
    .pmk-lb-card[hidden]{display:none}.pmk-lb-card strong{display:block;color:#334155}.pmk-lb-secondary{color:#64748b;font-size:12px}`;
  d.head.appendChild(style);
  let cfg = defaults;
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = x => {if (!x) return '';const v = new Date(String(x).replace(' ','T'));return Number.isNaN(+v)?String(x):new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(v);};
  const isDetail = () => location.pathname.endsWith('/catalogue/detail.pl');
  const isMore = () => location.pathname.endsWith('/catalogue/moredetail.pl');
  function itemId(row) {
    for (const attr of ['data-itemnumber','data-item-number','data-item-id']) {
      const val = row.getAttribute?.(attr) || row.querySelector?.('['+attr+']')?.getAttribute(attr);
      if (/^\d+$/.test(val || '')) return val;
    }
    for (const node of [row,...row.querySelectorAll('a[href],input[name],button[name]')]) {
      const match = (node.getAttribute('href') || '').match(/[?&](?:itemnumber|item_id)=(\d+)/);
      if (match) return match[1];
      if (/^(itemnumber|item_id)$/.test(node.name || '') && /^\d+$/.test(node.value || '')) return node.value;
    }
    return null;
  }
  async function query(itemnumber) {
    const params = new URLSearchParams({id:String(cfg.reportId),annotated:'1',sql_params:String(itemnumber),param_names:'itemnumber'});
    const resp = await fetch('/cgi-bin/koha/svc/report?'+params, {credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if (!resp.ok) throw new Error('Koha HTTP '+resp.status);
    if (!/json/i.test(resp.headers.get('content-type') || '')) throw new Error('Réponse non JSON : authentification ou accès au rapport à contrôler.');
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('Format de réponse inattendu.');
    return data.find(r => String(r.itemnumber) === String(itemnumber)) || null;
  }
  function add(target, itemnumber) {
    if (!target || !/^\d+$/.test(String(itemnumber)) || target.querySelector('.pmk-lb-widget')) return;
    const wrap = d.createElement('span');wrap.className='pmk-lb-widget';
    const button = d.createElement('button');button.type='button';button.className='pmk-lb-button';button.textContent='♙ '+(cfg.buttonLabel || 'Dernier emprunteur anonymisé');
    const card = d.createElement('div');card.className='pmk-lb-card';card.hidden=true;
    button.addEventListener('click', async () => {
      if (!card.hidden) {card.hidden=true;return;}
      card.hidden=false;
      if (!/^\d+$/.test(String(cfg.reportId))) {card.textContent='Identifiant du rapport SQL non configuré dans PMK.';return;}
      button.disabled=true;card.textContent='Chargement…';
      try {
        const r=await query(itemnumber);
        if (!r) {card.textContent='Aucun dernier emprunteur conservé pour cet exemplaire.';return;}
        const name=[r.firstname,r.surname].filter(Boolean).join(' ') || 'Identité non renseignée';
        const patron=String(r.borrowernumber || '');
        const link=/^\d+$/.test(patron)?'/cgi-bin/koha/members/moremember.pl?borrowernumber='+encodeURIComponent(patron):'';
        card.innerHTML='<strong>Dernier emprunteur anonymisé</strong>'+
          '<div class="pmk-lb-secondary">Donnée conservée indépendamment de l’historique des prêts anonymisé (StoreLastBorrower).</div>'+ 
          (link?'<a href="'+link+'">'+esc(name)+'</a>':'<span>'+esc(name)+'</span>')+
          (cfg.showCardNumber?'<div class="pmk-lb-secondary">Carte : '+esc(r.cardnumber || '—')+'</div>':'')+
          (cfg.showDate?'<div class="pmk-lb-secondary">Enregistré le : '+esc(date(r.created_on) || '—')+'</div>':'');
      } catch (e) {card.textContent='Impossible de consulter le rapport : '+e.message;}
      finally {button.disabled=false;}
    });
    wrap.append(button,card);target.append(wrap);
  }
  function render() {
    d.querySelectorAll('.pmk-lb-widget').forEach(el=>el.remove());
    if (!cfg.enabled) return;
    if (isDetail() && cfg.detailEnabled) {
      let rows=[];try {rows=[...d.querySelectorAll(cfg.detailSelector)];}catch(e){console.warn('[PMK dernier emprunteur] Sélecteur invalide',e);}
      for(const row of rows){const id=itemId(row);if(id)add(row.querySelector('td:last-child') || row,id);}
    } else if (isMore() && cfg.moredetailEnabled) {
      const id=new URLSearchParams(location.search).get('itemnumber');
      if (/^\d+$/.test(id || '')) {
        let target=null;try{target=d.querySelector(cfg.moredetailSelector);}catch(e){}
        add(target,id);
      }
    }
  }
  async function refresh() {
    try {cfg=Object.assign({},defaults,await PMK.getConfig(ID));render();}
    catch(e){console.error('[PMK dernier emprunteur] Configuration indisponible',e);}
  }
  PMK.subscribe(ID, refresh);
  w.PMKLastBorrower={version:VERSION,refresh};
  if (d.readyState==='loading')d.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})(window,document);
