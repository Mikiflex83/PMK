/* PimpMyKoha — Abonnements / France Publications — v2.7.15 — Koha 25.11.
 * Ajouter dans IntranetUserJS APRÈS 000-pmk-config-firestore.js.
 * Nouveau module intégré aux pages Koha Périodiques, compatible avec 029.
 * France Publications : lecture et dépôt de réclamation après confirmation explicite.
 * Enregistrement des champs Koha via formulaire natif et relecture ; double réclamation conditionnelle.
 * Le compagnon navigateur est téléchargeable depuis le panneau.
 */
(function () {
  'use strict';
  if(window.__PMK_FP_MANAGER__)return;
  window.__PMK_FP_MANAGER__=true;
  const ID='france-publications-subscriptions',VERSION='2.7.16',COMPANION_VERSION='1.5.0';
  const FP='https://extranet.france-publications.fr',CHANNEL='pmk-fp-v1';
  const COMPANION_SOURCE="// ==UserScript==\n// @name         PimpMyKoha — France Publications (dépôt confirmé)\n// @namespace    https://koha.example.invalid/pmk\n// @version      1.5.0\n// @description  Vérifie la session et lit les abonnements et réclamations pour PMK.\n// @match        https://extranet.france-publications.fr/*\n// @match        https://koha.example.invalid/cgi-bin/koha/serials/*\n// @grant        GM_setValue\n// @grant        GM_getValue\n// @grant        GM_deleteValue\n// @grant        GM_addValueChangeListener\n// @run-at       document-end\n// ==/UserScript==\n/* Installer dans un gestionnaire de scripts navigateur. Aucun mot de passe,\n * cookie ou jeton de connexion n'est lu, enregistré ou transmis à Koha.\n * Les lectures sont automatiques ; le dépôt de réclamation exige une confirmation utilisateur.\n */\n(function () {\n  'use strict';\n  // Relay is enabled only on two specifically authorized origins.\n  const GM_RELAY=typeof GM_setValue==='function' && typeof GM_addValueChangeListener==='function' && typeof GM_getValue==='function' && typeof GM_deleteValue==='function';\n  const GM_COMMAND='pmk.fp.relay.v2.command', GM_RESPONSE='pmk.fp.relay.v2.response';\n  const relayPacket=(payload)=>({id:Date.now()+':'+Math.random().toString(36).slice(2), sent:Date.now(), payload});\n  const relaySend=(key,payload)=>{\n    const packet=relayPacket(payload);GM_setValue(key,packet);\n    setTimeout(()=>{try{if(GM_getValue(key)?.id===packet.id)GM_deleteValue(key);}catch{}},45000);\n  };\n  if(location.origin==='https://koha.example.invalid'){\n    if(!GM_RELAY||window.__PMK_FP_GM_RELAY__)return;\n    window.__PMK_FP_GM_RELAY__=true;\n    window.addEventListener('pmk-fp-relay-out',e=>{\n      let p;try{p=JSON.parse(String(e.detail||''));}catch{return;}\n      if(!p || p.channel!=='pmk-fp-v1'||p.nonce!=='relay'||!['hello','check','collect','cancel','detail','claim-form','claim-submit'].includes(p.type))return;\n      relaySend(GM_COMMAND,p);\n    });\n    GM_addValueChangeListener(GM_RESPONSE,(_key,_old,packet,remote)=>{\n      if(!remote||!packet||Date.now()-Number(packet.sent||0)>30000)return;\n      const p=packet.payload;if(!p||p.channel!=='pmk-fp-v1'||p.nonce!=='relay')return;\n      window.dispatchEvent(new CustomEvent('pmk-fp-relay-in',{detail:JSON.stringify(p)}));\n    });\n    const ready=()=>window.dispatchEvent(new CustomEvent('pmk-fp-relay-ready'));\n    window.addEventListener('pmk-fp-relay-probe',ready);\n    queueMicrotask(ready);\n    return;\n  }\n  if (window.__PMK_FP_COMPANION__) return;\n  window.__PMK_FP_COMPANION__ = true;\n  const VERSION = '1.5.0', CHANNEL = 'pmk-fp-v1', KEY = 'pmk.fp.bridge.v1';\n  const ORIGIN = 'https://extranet.france-publications.fr';\n  const COLUMNS = {\n    titles: ['tit_code','tit_issn','icones','tit_libelle','tit_editeur','InfosAbos','titpack_issn','titpack_libelle'],\n    global: ['abt_datefin','abt_refint','des_int','tit_libelle','destinataire','abt_email','RefAbo','colNote','Note'],\n    subscriptions: ['abt_etat','RefAbo','abt_refint','des_int','Destinataire','abt_email','colNote','Note','des_raison','des_nom','des_adresse','des_adresse1','des_cp','des_ville'],\n    claims: ['Cmd1','recla_date','RefAbo','Destinataire','Identifiant','RefInterne','ISSN','TitreLibelle','nbReponses','nbRelances','DateDerniereReponse','Cmd'],\n    replies: ['repons_date','RefAbo','CodeDestinataire','Identifiant','RefInterne','ISSN','Titre','Cmd'],\n    recipients: ['des_code','des_int','Destinataire','des_email','des_raison','des_nom','des_adresse','des_adresse1','des_cp','des_ville'],\n    renewals: ['Etat1','RefAbo','abt_datefin','tit_libelle','abt_email','abt_qte','HT','TTC','Etat','LibelleEtat','Select'],\n    pendingClaims: ['Cmd1','Date','RefAbo','Destinataire','Identifiant','RefInterne','ISSN','TitreLibelle','DateDerniereReponse','Cmd'],\n    invoices: ['totfac_date','totfac_codeclient','fac_boncom','totfac_numero','totfac_sens','totfac_datereglement','TotalHT','TotalTVA','TotalTTC']\n  };\n  const READ_POST = new Set(['/ajx/rechercheabonnements/liste_titres.php','/ajx/rechercheabonnements/liste_abos_partitre.php','/ajx/rechercheabonnements/recherche_abos.php','/ajx/reclamations_liste.php','/ajx/reclamations_reponses_listetitres.php','/ajx/destinataires/liste.php','/ajx/renouvellements/listedestinataires_abos.php','/ajx/reclamations_enattente.php','/ajx/factures/liste.php']);\n  let bridge = null, approved = false, run = null, aborter = null, detailBusy=false;\n  class SessionError extends Error {}\n  // Pas de délai artificiel par fiche. Le nombre de requêtes est borné par le pool.\n  const pause = async signal => {if(signal?.aborted)throw signal.reason||new Error('Récupération arrêtée.');};\n  async function readPool(items,limit,worker,signal) {\n    let next=0,fatal=null;\n    const workers=Array.from({length:Math.min(limit,items.length)},async()=>{\n      while(next<items.length&&!fatal&&!signal.aborted){\n        const i=next++;\n        try{await worker(items[i],i);}catch(e){\n          if(!fatal){fatal=e;if(aborter)aborter.abort(e);}\n        }\n      }\n    });\n    // Attendre TOUS les travailleurs avant d'envoyer le résultat final.\n    await Promise.allSettled(workers);\n    if(fatal)throw fatal;\n    if(signal.aborted)throw signal.reason||new Error('Récupération arrêtée.');\n  }\n  const clean = value => {\n    const input=String(value ?? '');\n    if(!/[<&]/.test(input))return input.replace(/\\s+/g,' ').trim();\n    const doc = new DOMParser().parseFromString(input, 'text/html');\n    doc.querySelectorAll('script,style,iframe,object').forEach(n=>n.remove());\n    return (doc.body.textContent || '').replace(/\\s+/g,' ').trim();\n  };\n  const num = value => { const s=clean(value).replace(/\\s/g,'').replace(',','.'); if(!s)return null; const n=Number(s); return Number.isFinite(n)?n:null; };\n  const isoDate = value => {\n    const s=clean(value),m=s.match(/\\b(\\d{2})\\/(\\d{2})\\/(\\d{4})\\b/);\n    if(!m)return /^\\d{4}-\\d{2}-\\d{2}$/.test(s)?s:null;\n    const out=m[3]+'-'+m[2]+'-'+m[1],d=new Date(out+'T12:00:00Z');\n    return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===out?out:null;\n  };\n  const el = (tag,text) => {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};\n  function parseBridge(raw) {\n    try {\n      const x=typeof raw==='string'?JSON.parse(raw):raw, u=new URL(x.origin);\n      if(u.protocol!=='https:'||u.origin!==x.origin||u.origin===ORIGIN||!/^[a-f0-9]{32}$/.test(x.nonce))return null;\n      if(!Number.isFinite(x.created)||Date.now()-x.created>12*3600000||x.created>Date.now()+60000)return null;\n      return {origin:u.origin,nonce:x.nonce,created:x.created};\n    } catch {return null;}\n  }\n  const hash=new URLSearchParams(location.hash.slice(1));\n  const fromKohaClick=hash.get('pmkfp')==='1';\n  if(fromKohaClick) {\n    bridge=parseBridge({origin:hash.get('origin'),nonce:hash.get('nonce'),created:Number(hash.get('created'))});\n    if(bridge){try{sessionStorage.setItem(KEY,JSON.stringify(bridge));sessionStorage.setItem(KEY+'.pending',bridge.nonce);}catch{} history.replaceState(null,'',location.pathname+location.search);}\n  } else {try{bridge=parseBridge(sessionStorage.getItem(KEY));}catch{}}\n  if(GM_RELAY){bridge={origin:'https://koha.example.invalid',nonce:'relay',created:Date.now()};}\n  if(!GM_RELAY&&(!bridge||!window.opener)){\n    const info=el('aside','PimpMyKoha : aucun onglet Koha associé. Ouvrez la recherche des abonnements dans Koha et cliquez sur « Connecter FP ».');\n    info.id='pmk-fp-companion';info.style.cssText='position:fixed;bottom:16px;right:16px;z-index:2147483646;background:#fff;color:#26364a;border:1px solid #aaa;padding:12px;border-radius:8px;max-width:360px;box-shadow:0 6px 22px #0003;font:13px/1.4 sans-serif';\n    document.body.append(info);return;\n  }\n  let pending=false;\n  try{approved=GM_RELAY || sessionStorage.getItem(KEY+'.approved')===bridge.nonce;pending=sessionStorage.getItem(KEY+'.pending')===bridge.nonce;}catch{}\n  const box=el('aside');box.id='pmk-fp-companion';\n  box.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147483646;width:350px;max-width:90vw;padding:16px;background:white;color:#273642;border:2px solid #447c76;border-radius:8px;box-shadow:0 5px 24px #0003;font:14px/1.45 sans-serif';\n  box.append(el('strong','France Publications → PimpMyKoha'));\n  const status=el('p','Connexion à vérifier.'),dest=el('p',GM_RELAY?'Liaison directe Koha ↔ FP (Tampermonkey)':'Destination : '+bridge.origin);\n  const approve=el('button','Associer à cet onglet Koha'),retry=el('button','Vérifier la connexion');\n  const login=el('a','Se connecter à France Publications');login.href=ORIGIN+'/index.php?route=login';\n  const stop=el('button','Arrêter la récupération');stop.hidden=true;\n  box.append(status,dest,approve,retry,el('br'),login,el('br'),stop);document.body.append(box);\n  // Panneau discret : le détail ne gêne pas la navigation dans l'extranet.\n  // Les messages urgents déplient automatiquement la zone de diagnostic.\n  const header=box.querySelector('strong');\n  const toggle=el('button','Détails ▾');toggle.type='button';toggle.setAttribute('aria-expanded','false');\n  toggle.style.cssText='float:right;padding:2px 7px;font-size:12px;border:1px solid #b7c4cc;border-radius:5px;background:#fff;color:#273642';\n  header.after(toggle);\n  const details=el('div');details.style.cssText='margin-top:8px';\n  for(const n of [dest,approve,retry,login,stop])details.append(n);\n  box.append(details);\n  function showDetails(open){details.hidden=!open;toggle.textContent=open?'Détails ▴':'Détails ▾';toggle.setAttribute('aria-expanded',String(open));}\n  toggle.onclick=()=>showDetails(details.hidden);\n  showDetails(false);\n  box.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483646;width:300px;max-width:90vw;padding:9px 12px;background:white;color:#273642;border:1px solid #9eb7ab;border-radius:8px;box-shadow:0 3px 14px #0002;font:12px/1.35 sans-serif';\n\n  approve.hidden=approved;retry.hidden=!approved;login.hidden=true;\n  const setStatus=text=>{status.textContent=text;if(/erreur|nécessaire|ferm[ée]|expir[ée]|impossible|introuvable/i.test(String(text)))showDetails(true);};\n  function send(type,payload={}) {\n    if(!approved)return;\n    const packet={channel:CHANNEL,nonce:bridge.nonce,type,...payload};\n    if(GM_RELAY)relaySend(GM_RESPONSE,packet);\n    else if(window.opener&&!window.opener.closed)window.opener.postMessage(packet,bridge.origin);\n    lastKohaPulse=Date.now();\n  }\n  // Repli partagé en cas de surcharge FP : évite de multiplier les erreurs 429/503.\n  let cooldownUntil=0;\n  async function waitCooldown(signal) {\n    while(Date.now()<cooldownUntil){\n      if(signal?.aborted)throw signal.reason||new Error('Lecture annulée.');\n      await new Promise((resolve,reject)=>{\n        const timer=setTimeout(finish,Math.min(500,cooldownUntil-Date.now()));\n        function finish(){signal?.removeEventListener('abort',cancel);resolve();}\n        function cancel(){clearTimeout(timer);reject(signal.reason||new Error('Lecture annulée.'));}\n        signal?.addEventListener('abort',cancel,{once:true});\n      });\n    }\n  }\n  async function request(path,body=null,signal=null) {\n    const u=new URL(path,ORIGIN);\n    if(u.origin!==ORIGIN)throw new Error('Destination refusée.');\n    const isDetail=u.pathname==='/index.php'&&['abonnements/detail','reclamations/detail'].includes(u.searchParams.get('modal'));\n    if(body!==null&&!READ_POST.has(u.pathname))throw new Error('Route POST non autorisée.');\n    if(body===null&&u.pathname!=='/ajx/checkSession.php'&&!isDetail)throw new Error('Route GET non autorisée.');\n    for(let attempt=0;attempt<3;attempt++){\n      await waitCooldown(signal);\n      const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);\n      const cancel=()=>ctl.abort();if(signal){if(signal.aborted)ctl.abort();else signal.addEventListener('abort',cancel,{once:true});}\n      try {\n        const r=await fetch(u.href,{method:body===null?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===null?{Accept:'application/json,text/html'}:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body:body===null?undefined:body.toString(),signal:ctl.signal});\n        if([429,503].includes(r.status)&&attempt<2){\n          const retryHeader=Number(r.headers.get('Retry-After'));\n          const delay=Number.isFinite(retryHeader)&&retryHeader>0?Math.min(30000,retryHeader*1000):1500*(attempt+1);\n          cooldownUntil=Math.max(cooldownUntil,Date.now()+delay);\n          continue;\n        }\n        if(!r.ok)throw new Error('France Publications : HTTP '+r.status);\n        const text=await r.text();if(text.length>12000000)throw new Error('Réponse trop volumineuse.');\n        const final=new URL(r.url);\n        if(final.origin!==ORIGIN||final.searchParams.get('route')==='login'||/<input\\b[^>]*name=[\"']password[\"']/i.test(text))throw new SessionError('Connexion France Publications nécessaire.');\n        return text;\n      } finally {clearTimeout(timer);if(signal)signal.removeEventListener('abort',cancel);}\n    }\n    throw new Error('France Publications : surcharge persistante. Réduisez les lectures simultanées.');\n  }\n  async function checkSession() {\n    const raw=await request('/ajx/checkSession.php');let j;\n    try{j=JSON.parse(raw);}catch{throw new Error('Session impossible à vérifier : réponse inattendue.');}\n    if(j.Etat!=='OK')throw new SessionError('Connexion France Publications nécessaire.');\n    return true;\n  }\n  let lastAnnounce=0,announcing=null,lastSessionOk=false;\n  let lastKohaPulse=0;\n  async function announce() {\n    if(announcing)return announcing;\n    lastAnnounce=Date.now();\n    announcing=announceSession().finally(()=>{announcing=null;});\n    return announcing;\n  }\n  async function announceSession() {\n    try {await checkSession();lastSessionOk=true;\n      // La liaison est autorisée par le clic explicite sur Koha et ce nonce unique.\n      if(!approved&&(pending||window.__pmkFpManualApproval)){approved=true;try{sessionStorage.setItem(KEY+'.approved',bridge.nonce);sessionStorage.removeItem(KEY+'.pending');}catch{}approve.hidden=true;retry.hidden=false;}\n      if(!approved)return;login.hidden=true;setStatus('Connecté · disponible pour Koha (sans rechargement).');send('session',{state:'connected',version:VERSION});}\n    catch(e){lastSessionOk=false;login.hidden=!(e instanceof SessionError);setStatus(e.message);send('session',{state:e instanceof SessionError?'disconnected':'unavailable',message:e.message});}\n  }\n  approve.onclick=()=>{window.__pmkFpManualApproval=true;announce();};\n  retry.onclick=announce;\n  stop.onclick=()=>{if(aborter)aborter.abort();};\n  function dataBody(kind,start,length) {\n    const body=new URLSearchParams({draw:'1',start:String(start),length:String(length),'search[value]':'','search[regex]':'false','order[0][column]':kind==='titles'?'3':kind==='replies'?'0':kind==='global'?'0':'1','order[0][dir]':['claims','replies'].includes(kind)?'desc':'asc'});\n    COLUMNS[kind].forEach((k,i)=>{body.set(`columns[${i}][data]`,k);body.set(`columns[${i}][name]`,k);body.set(`columns[${i}][searchable]`,'true');body.set(`columns[${i}][orderable]`,'true');body.set(`columns[${i}][search][value]`,'');body.set(`columns[${i}][search][regex]`,'false');});return body;\n  }\n  async function pages(path,kind,signal) {\n    const rows=[],signatures=new Set();let start=0,expected=null;\n    for(let page=0;page<1000;page++) {\n      await pause(signal);const raw=await request(path,dataBody(kind,start,500),signal);let j;\n      try{j=JSON.parse(raw);}catch{throw new Error('Liste '+kind+' : réponse non JSON.');}\n      if(!Array.isArray(j.data)||!Number.isInteger(Number(j.recordsFiltered))||Number(j.recordsFiltered)<0)throw new Error('Liste '+kind+' : format inattendu.');\n      const total=Number(j.recordsFiltered);if(expected!==null&&expected!==total)throw new Error('La liste a changé pendant la lecture. Relancez la récupération.');expected=total;\n      const sig=JSON.stringify(j.data);\n      if(signatures.has(sig)&&j.data.length)throw new Error('Pagination ignorée par le serveur.');\n      signatures.add(sig);\n      if(j.data.length===0&&rows.length<total)throw new Error('Liste incomplète : pagination interrompue.');\n      rows.push(...j.data);if(rows.length>20000)throw new Error('Limite de 20 000 lignes dépassée. Réduisez la période.');\n      if(rows.length>=total){if(rows.length!==total)throw new Error('Comptage incohérent.');return rows;}\n      start+=j.data.length;\n    }throw new Error('Trop de pages.');\n  }\n  function titleRow(r) {return {code:clean(r.DT_RowId),issn:clean(r.tit_issn),title:clean(r.tit_libelle),publisher:clean(r.tit_editeur),packIssn:clean(r.titpack_issn),packTitle:clean(r.titpack_libelle),summary:clean(r.InfosAbos)};}\n  function subscriptionRow(r,t) {\n    const dest=clean(r.Destinataire||r.LibelleDestinataire),m=dest.match(/^\\(?([0-9]+)\\)?\\s*:/);\n    const ref=clean(r.CodeAbo)||clean(r.RefAbo).split(' ')[0];\n    if(!ref)throw new Error('Référence abonnement absente.');\n    return {ref,titleCode:t.code,title:t.title,issn:t.issn,publisher:t.publisher,destinationCode:m?m[1]:'',destination:dest,startDate:null,endDate:isoDate(r.Echeance)||isoDate(r.RefAbo),quantity:num(r.Quantite),subscriberNumber:clean(r.NumeroAbonne),purchaseOrder:clean(r.BonCommande),internalReference:clean(r.abt_refint),destinationReference:clean(r.des_int),email:clean(r.exp_abt_email||r.abt_email),notes:clean(r.Note),support:clean(r.TypePublication),ht:num(r.HT),vatAmount:num(r.TVA),ttc:num(r.TTC),discount:num(r.Remise),state:clean(r.abt_etat),detailRead:false};\n  }\n  // Recherche globale observée sur la page FP « Recherche abos > Abonnements ».\n  // Les dates de début ne sont PAS présentes : elles restent lues dans la fiche détaillée.\n  function globalSubscriptionRow(r,titleByCode) {\n    const ref=clean(r.CodeAbo||r.RefAbo||r.DT_RowId);\n    if(!/^[A-Z0-9][A-Z0-9-]{2,79}$/i.test(ref))throw new Error('Référence FP globale invalide.');\n    const titleHtml=String(r.tit_libelle||'');\n    const titleCode=titleHtml.match(/[?&]code=(\\d+)/i)?.[1]||'';\n    const t=titleByCode.get(titleCode)||{};\n    const destHtml=String(r.destinataire||r.Destinataire||'');\n    const destinationCode=destHtml.match(/CodeDest=(\\d+)/i)?.[1]||clean(destHtml).match(/^(\\d{4,})\\b/)?.[1]||'';\n    const endDate=isoDate(r.Echeance)||isoDate(r.abt_datefin);\n    return {ref,titleCode,title:clean(r.tit_libelle)||t.title||'',issn:t.issn||'',publisher:t.publisher||'',destinationCode,destination:clean(destHtml),startDate:null,endDate,\n      quantity:num(r.Quantite),subscriberNumber:clean(r.NumeroAbonne),purchaseOrder:clean(r.BonCommande),internalReference:clean(r.abt_refint),destinationReference:clean(r.des_int),email:clean(r.exp_abt_email||r.abt_email),\n      notes:clean(r.Note),support:clean(r.TypePublication),ht:num(r.HT),vatAmount:num(r.TVA),ttc:num(r.TTC),discount:num(r.Remise),state:clean(r.abt_etat),detailRead:false};\n  }\n  // Cache local des dates validées, sans cookies, mot de passe ni rapprochement Koha.\n  // La référence ET l'échéance doivent être identiques, et l'entrée encore récente.\n  // La fiche détaillée demeure accessible à la demande pour notes/factures/historique.\n  const DATE_CACHE_KEY='pmk.fp.datecache.v2';\n  const DATE_CACHE_TTL=24*60*60*1000;\n  const DATE_CACHE_MAX=8000;\n  function readDateCache(){\n    try{\n      const parsed=JSON.parse(localStorage.getItem(DATE_CACHE_KEY)||'{}');\n      if(!parsed||parsed.schema!==2||typeof parsed.rows!=='object'||!parsed.rows)return {};\n      return parsed.rows;\n    }catch{return {};}\n  }\n  let dateCache=readDateCache(),dateCacheDirty=0;\n  function cachedPeriod(row){\n    const x=dateCache[row.ref];\n    if(!x||x.end!==row.endDate||!isoDate(x.start)||!isoDate(x.end)||Date.now()-x.ts>DATE_CACHE_TTL||x.ts>Date.now()+60000)return false;\n    row.startDate=x.start;row.endDate=x.end;row.datesFromCache=true;\n    return true;\n  }\n  function storePeriod(row){\n    if(!row.ref||!row.startDate||!row.endDate)return;\n    dateCache[row.ref]={start:row.startDate,end:row.endDate,ts:Date.now()};\n    if(++dateCacheDirty%20===0)flushDateCache();\n  }\n  function flushDateCache(){\n    try{\n      const entries=Object.entries(dateCache).filter(([,v])=>v&&Date.now()-v.ts<DATE_CACHE_TTL).sort((a,b)=>b[1].ts-a[1].ts).slice(0,DATE_CACHE_MAX);\n      dateCache=Object.fromEntries(entries);\n      localStorage.setItem(DATE_CACHE_KEY,JSON.stringify({schema:2,rows:dateCache}));\n      dateCacheDirty=0;\n    }catch(e){/* Stockage indisponible ou plein : la lecture FP reste fonctionnelle. */}\n  }\n  function detailRow(raw) {\n    const doc=new DOMParser().parseFromString(raw,'text/html');\n    let period='';for(const row of doc.querySelectorAll('.row')){const cells=Array.from(row.children);for(let i=0;i<cells.length-1;i++)if(clean(cells[i].textContent)==='Période')period=clean(cells[i+1].textContent);}\n    const dates=period.match(/\\d{2}\\/\\d{2}\\/\\d{4}/g)||[];\n    if(dates.length!==2)throw new Error('Dates de la fiche non reconnues.');\n    const startDate=isoDate(dates[0]),endDate=isoDate(dates[1]);if(!startDate||!endDate)throw new Error('Dates invalides.');\n    const tables=Array.from(doc.querySelectorAll('table')).map(table=>({headers:Array.from(table.querySelectorAll('thead th')).map(n=>clean(n.textContent)),rows:Array.from(table.querySelectorAll('tbody tr')).map(tr=>Array.from(tr.querySelectorAll('td')).map(td=>clean(td.textContent)))}));\n    return {startDate,endDate,notes:doc.querySelector('#txtInfo')?.value||'',detailRead:true,detailTables:tables};\n  }\n  const rawCleanRow=r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['Cmd','Cmd1'].includes(k)).map(([k,v])=>[k,clean(v)]));\n  function options(raw) {\n    const x=raw||{};for(const k of ['from','to'])if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(x[k]||''))throw new Error('Période invalide.');\n    if(x.from>x.to)throw new Error('Dates inversées.');\n    return {from:x.from,to:x.to,expired:x.expired===true,current:x.current!==false,future:x.future!==false,details:false,claims:x.claims===true,concurrency:Math.max(1,Math.min(12,parseInt(x.concurrency,10)||8))};\n  }\n  async function collect(raw) {\n    if(run||detailBusy){send('error',{message:'Une lecture est déjà en cours.'});return;}let opts;try{opts=options(raw);}catch(e){send('error',{message:e.message});return;}\n    run={schema:'pmk-france-publications',version:1,createdAt:new Date().toISOString(),scope:opts,titles:[],subscriptions:[],claims:[],replies:[],recipients:[],renewals:[],pendingClaims:[],invoices:[],errors:[],complete:false};\n    aborter=new AbortController();const signal=aborter.signal;stop.hidden=false;\n    let lastSnapshot=0;\n    function snapshot(force=false){if(force||Date.now()-lastSnapshot>=4000){lastSnapshot=Date.now();send('snapshot',{data:run});}}\n    function progress(text){setStatus(text);send('progress',{message:text,count:run.subscriptions.length});snapshot();}\n    try {\n      await checkSession();send('session',{state:'connected',version:VERSION});\n      const filters=new URLSearchParams({ckEchus:opts.expired?'1':'0',ckEnCours:opts.current?'1':'0',ckAVenir:opts.future?'1':'0'});\n      // Les réclamations et réponses démarrent sans attendre les abonnements.\n      const auxiliary = opts.claims ? (async()=>{\n        const qs=new URLSearchParams({ckEnCours:'1',ckArchivees:'1',ckRelances:'0',dDebut:opts.from,dFin:opts.to,visuMode:'1'});\n        await Promise.all([['claims','/ajx/reclamations_liste.php?'+qs,'claims'],['replies','/ajx/reclamations_reponses_listetitres.php?'+new URLSearchParams({visuMode:'1',dDebut:opts.from,dFin:opts.to}),'replies']].map(async([key,path,kind])=>{\n          try{run[key]=(await pages(path,kind,signal)).map(rawCleanRow);snapshot();}\n          catch(e){if(e instanceof SessionError||signal.aborted)throw e;run.errors.push({stage:key,message:e.message});}\n        }));\n      })() : Promise.resolve();\n      // Listes de gestion FP constatées dans le HAR du 13/10/2026.\n      // Indépendantes de la lecture principale : un échec est isolé et visible.\n      const extended = (async()=>{\n        const specs=[\n          ['recipients','/ajx/destinataires/liste.php','recipients'],\n          ['pendingClaims','/ajx/reclamations_enattente.php','pendingClaims'],\n          ['invoices','/ajx/factures/liste.php','invoices']\n        ];\n        await Promise.all(specs.map(async ([key,path,kind])=>{\n          try {run[key]=(await pages(path,kind,signal)).map(rawCleanRow);snapshot();}\n          catch(e){if(e instanceof SessionError||signal.aborted)throw e;run.errors.push({stage:key,message:e.message});}\n        }));\n      })();\n      // Pool global de fiches : pipeline sans attendre la fin de la liste des titres.\n      const detailJobs=[];let detailActive=0;const detailWait=[];let detailsDone=0,datesCached=0;\n      async function detailSlot(){\n        if(detailActive>=opts.concurrency)await new Promise(resolve=>detailWait.push(resolve));\n        detailActive++;\n      }\n      function detailRelease(){detailActive--;const next=detailWait.shift();if(next)next();}\n      async function fetchDetail(row){\n        await detailSlot();\n        try{\n          if(signal.aborted)return;\n          try{Object.assign(row,detailRow(await request('/index.php?'+new URLSearchParams({modal:'abonnements/detail',ref:row.ref,thismodal:'ModalBox'}),null,signal)));storePeriod(row);}\n          catch(e){if(e instanceof SessionError||signal.aborted)throw e;run.errors.push({stage:'detail',ref:row.ref,message:e.message});}\n          detailsDone++;progress(`Lecture simultanée · ${run.subscriptions.length} abonnements · ${detailsDone} fiches complètes`);\n        }finally{detailRelease();}\n      }\n      let titleError=null;\n      try{\n        run.phase='global-subscriptions';\n        progress('Chargement global FP (sans parcourir les titres)…');\n        // Deux lectures groupées au lieu d'une requête par titre. La liste titres enrichit les ISSN.\n        const [allRows,titleRows]=await Promise.all([\n          pages('/ajx/rechercheabonnements/recherche_abos.php?ckAbos=','global',signal),\n          pages('/ajx/rechercheabonnements/liste_titres.php?'+filters,'titles',signal)\n        ]);\n        run.titles=titleRows.map(titleRow);\n        const byCode=new Map(run.titles.map(t=>[t.code,t]));\n        const seen=new Set();\n        const today=new Date().toISOString().slice(0,10);\n        for(const rawRow of allRows){\n          const row=globalSubscriptionRow(rawRow,byCode);\n          // Ne pas récupérer les anciens cycles hors de la période demandée.\n          // Les abonnements sans échéance sont gardés pour ne pas masquer d'anomalies.\n          if(row.endDate && ((row.endDate<opts.from&&!opts.expired)||row.endDate>opts.to))continue;\n          if(row.endDate && !opts.expired && row.endDate<today)continue;\n          if(row.endDate && !opts.future && row.endDate>today && !opts.current)continue;\n          if(seen.has(row.ref))continue;\n          seen.add(row.ref);run.subscriptions.push(row);\n        }\n        progress(`Recherche globale : ${allRows.length} lignes · ${run.subscriptions.length} abonnements dans le périmètre`);\n        snapshot(true);\n        // Les fiches FP se chargent uniquement sur demande pour éviter des centaines d’appels.\n        if(false && opts.details){\n          run.phase='details';\n          for(const row of run.subscriptions){\n            if(cachedPeriod(row)){datesCached++;continue;}\n            detailJobs.push(fetchDetail(row));\n          }\n          progress(`Dates FP en cache : ${datesCached} · fiches à lire : ${detailJobs.length}`);\n        }\n      }catch(e){\n        if(e instanceof SessionError||signal.aborted)throw e;\n        // Repli compatible avec les anciennes routes FP si la recherche globale évolue.\n        run.errors.push({stage:'global-fallback',message:'Recherche globale indisponible : '+e.message+' ; récupération classique utilisée.'});\n        run.subscriptions=[];run.titles=[];\n        try{\n          progress('Repli : récupération par titres…');\n          run.titles=(await pages('/ajx/rechercheabonnements/liste_titres.php?'+filters,'titles',signal)).map(titleRow);\n          const seen=new Set();let titlesDone=0;\n          await readPool(run.titles,opts.concurrency,async t=>{\n            if(!/^\\d+$/.test(t.code))throw new Error('Code titre invalide.');\n            const qs=new URLSearchParams(filters);qs.set('Code',t.code);qs.set('dDebut',opts.from);qs.set('dFin',opts.to);qs.set('ckElectronique','');qs.set('ckPapierElectronique','');\n            const list=await pages('/ajx/rechercheabonnements/liste_abos_partitre.php?'+qs,'subscriptions',signal);\n            for(const r of list){const row=subscriptionRow(r,t);const key=t.code+'|'+row.ref+'|'+row.destinationCode;if(seen.has(key))continue;seen.add(key);run.subscriptions.push(row);if(false && opts.details){if(cachedPeriod(row)){datesCached++;}else detailJobs.push(fetchDetail(row));}}\n            titlesDone++;progress(`Repli : ${titlesDone}/${run.titles.length} titres`);\n          },signal);\n        }catch(inner){titleError=inner;}\n      }\n      // Le HAR ne montre pas de liste globale des renouvellements. Cette route\n      // exige dest et une plage dateDebut/dateFin. Un appel sans paramètres\n      // renvoie une page ou un autre format, d'où « format inattendu ».\n      // Récupérer les destinataires de la recherche globale, sans requêtes par titre.\n      const renewalRead = (async()=>{\n        if(!run.subscriptions.length)return;\n        const codes=[...new Set(run.subscriptions.map(r=>String(r.destinationCode||'').trim()).filter(x=>/^\\d{4,12}$/.test(x)))];\n        if(!codes.length)return; // pas de fausse erreur si codes indisponibles\n        const year=Number(opts.to?.slice(0,4))||new Date().getFullYear();\n        const from=(Number(opts.from?.slice(0,4))||year-1)+'-01-01';\n        const to=(year+1)+'-12-31';\n        const collected=new Map();\n        await readPool(codes,Math.min(4,opts.concurrency||4),async code=>{\n          const qs=new URLSearchParams({dest:code,dateDebut:from,dateFin:to,ckRenouvele:'',ckEcheance:'',ckAnnule:'',Type:'AEcheance'});\n          try {\n            for(const x of await pages('/ajx/renouvellements/listedestinataires_abos.php?'+qs,'renewals',signal)){\n              const row=rawCleanRow(x),ref=String(row.RefAbo||'').trim();\n              // Une même référence peut être dans plusieurs listes, dédoublonner.\n              if(ref)collected.set(code+'|'+ref,row);\n            }\n          }catch(e){\n            if(e instanceof SessionError||signal.aborted)throw e;\n            run.errors.push({stage:'renewals',message:'Destinataire '+code+' : '+e.message});\n          }\n        },signal);\n        run.renewals=[...collected.values()];snapshot();\n      })();\n      // Toujours récupérer les erreurs des tâches pour éviter les rejets non traités.\n      const settled=await Promise.allSettled([...detailJobs,auxiliary,extended,renewalRead]);\n      const rejected=settled.find(x=>x.status==='rejected');\n      if(titleError)throw titleError;\n      if(rejected)throw rejected.reason;\n      run.subscriptions.sort((a,b)=>a.title.localeCompare(b.title,'fr')||a.ref.localeCompare(b.ref,'fr'));\n      flushDateCache();\n      snapshot(true);\n      run.phase='finished';run.complete=run.errors.length===0;progress(`${run.subscriptions.length} abonnements lus · ${datesCached} dates depuis le cache · ${detailsDone} fiches actualisées · ${run.errors.length} erreur(s).`);\n    } catch(e) {\n      run.errors.push({stage:'run',message:e instanceof SessionError?e.message:signal.aborted?'Récupération arrêtée.':e.message});\n      if(e instanceof SessionError){login.hidden=false;send('session',{state:'disconnected',message:e.message});}\n      setStatus(e.message);\n    } finally {\n      flushDateCache();\n      run.finishedAt=new Date().toISOString();send('result',{data:run});run=null;aborter=null;stop.hidden=true;\n    }\n  }\n  async function loadOneDetail(m) {\n    const ref=String(m.ref||''),requestId=String(m.requestId||'');\n    if(!ref||ref.length>200||!requestId||requestId.length>100)return;\n    if(run||detailBusy){send('detail-result',{ref,requestId,error:'Attendez la fin de la lecture en cours.'});return;}\n    detailBusy=true;\n    try{\n      await checkSession();\n      const data=detailRow(await request('/index.php?'+new URLSearchParams({modal:'abonnements/detail',ref,thismodal:'ModalBox'})));\n      storePeriod({ref,...data});flushDateCache();\n      send('detail-result',{ref,requestId,data});\n    }catch(e){\n      if(e instanceof SessionError){login.hidden=false;send('session',{state:'disconnected',message:e.message});}\n      send('detail-result',{ref,requestId,error:e.message});\n    }finally{detailBusy=false;}\n  }\n  // Requêtes d'écriture identifiées dans le HAR du 13/10/2026. Jamais de soumission automatique.\n  const claimDrafts=new Map(), claimSent=new Map();\n  async function officialClaimForm(m){\n    const id=String(m.requestId||'');\n    try{\n      if(!/^[\\w.:\\-]{4,110}$/.test(id))throw Error('Identifiant de requête invalide.');\n      const ref=String(m.ref||'').trim(), dest=String(m.dest||'').trim();\n      if(!/^DRG-\\d+-\\d+$/i.test(ref)||!/^\\d{4,12}$/.test(dest))throw Error('Référence ou destinataire FP invalide.');\n      await checkSession();\n      const u=new URL('/index.php',ORIGIN);u.search=new URLSearchParams({modal:'reclamations/formulaire',RefAbo:ref,CodeDest:dest,route:'reclamations/listedestinataires',thismodal:'ModalBox'});\n      const response=await fetch(u.href,{credentials:'same-origin',cache:'no-store',headers:{Accept:'text/html'}});\n      if(!response.ok)throw Error('Formulaire FP : HTTP '+response.status);\n      const html=await response.text();const doc=new DOMParser().parseFromString(html,'text/html');const form=doc.querySelector('form#frm');\n      if(!form)throw Error('Formulaire de dépôt FP non reconnu.');\n      const fields={};for(const item of form.querySelectorAll('[name]')){if(item.name)fields[item.name]=item.value||'';}\n      if(fields.RefAbo!==ref||fields.CodeDest!==dest||!/^\\d+$/.test(fields.CodeTitre||'')||fields.op!=='add')throw Error('Données du formulaire FP incohérentes : envoi bloqué.');\n      const subjects=[...form.querySelectorAll('[name=\"fSujet\"] option')].map(o=>({code:String(o.value),label:o.textContent.trim()})).filter(x=>/^\\d+$/.test(x.code));\n      if(!subjects.length)throw Error('Aucun motif FP disponible.');\n      claimDrafts.set(id,{fields,subjects,created:Date.now(),ref,dest});\n      send('claim-form-result',{requestId:id,ref,subjects,referenceInterne:String(fields.fRefInterne||''),titleCode:fields.CodeTitre});\n    }catch(e){send('claim-form-result',{requestId:id,error:e.message});}\n  }\n  async function submitClaim(m){\n    const id=String(m.requestId||''), draftId=String(m.draftId||'');\n    try{\n      if(claimSent.has(draftId))throw Error('Cette demande a déjà été envoyée : actualisez le suivi FP, ne la renvoyez pas.');\n      const d=claimDrafts.get(draftId);if(!d||Date.now()-d.created>10*60*1000)throw Error('Formulaire FP expiré : rechargez les données.');\n      const subj=String(m.subject||''),body=String(m.message||'').trim();\n      if(!d.subjects.some(x=>x.code===subj)||body.length<8||body.length>4000)throw Error('Motif ou message invalide.');\n      if(m.confirmed!==true)throw Error('Confirmation explicite nécessaire.');\n      claimDrafts.delete(draftId); // une seule tentative par formulaire, même en cas de réponse incertaine\n      await checkSession();\n      const data=new URLSearchParams(d.fields);data.set('fSujet',subj);data.set('fContenu',body);data.set('op','add');\n      const response=await fetch(ORIGIN+'/ajx/reclamations/reclamations.gst.php',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',Accept:'application/json,text/html'},body:data.toString()});\n      if(!response.ok)throw Error('Résultat incertain : FP HTTP '+response.status+'. Contrôlez l’historique avant tout renvoi.');\n      const responseText=await response.text();let result;\n      try{result=JSON.parse(responseText);}catch{throw Error('Résultat incertain : réponse FP non JSON. Contrôlez l’historique.');}\n      if(!result||typeof result.Res!=='string'||!/^r[ée]clamation d[ée]pos[ée]e/i.test(result.Res.trim()))throw Error('Confirmation FP non reconnue : '+String(result?.Res||'Réponse inconnue'));\n      claimSent.set(draftId,{ref:d.ref,at:Date.now()});\n      send('claim-submit-result',{requestId:id,ok:true,ref:d.ref,result:result.Res});\n    }catch(e){send('claim-submit-result',{requestId:id,ok:false,error:e.message});}\n  }\n  function handleCommand(m){\n    if(!approved||!m||m.channel!==CHANNEL||m.nonce!==bridge.nonce)return;\n    if(m.type==='check')announce();\n    if(m.type==='hello'){send('session',{state:lastSessionOk?'connected':'unavailable',version:VERSION});if(!lastSessionOk)announce();}\n    if(m.type==='collect')collect(m.options);\n    if(m.type==='detail')loadOneDetail(m);\n    if(m.type==='claim-form')officialClaimForm(m);\n    if(m.type==='claim-submit')submitClaim(m);\n    if(m.type==='cancel'&&aborter)aborter.abort();\n  }\n  window.addEventListener('message',event=>{\n    if(GM_RELAY||event.origin!==bridge.origin||event.source!==window.opener)return;\n    handleCommand(event.data);\n  });\n  if(GM_RELAY){GM_addValueChangeListener(GM_COMMAND,(_key,_old,p,remote)=>{\n    if(!remote||!p||Date.now()-Number(p.sent||0)>30000)return;\n    handleCommand(p.payload);\n  });}\n  // Reprise après connexion, navigation interne, retour sur cet onglet ou mise en veille.\n  // Aucun polling lourd: un simple checkSession est envoyé au plus une fois par minute.\n  function resumeConnection(){\n    if(!approved&&!pending)return;\n    if(document.visibilityState==='hidden')return;\n    if(Date.now()-lastAnnounce>60000)announce();\n    else if(approved&&lastSessionOk)send('session',{state:'connected',version:VERSION});\n  }\n  window.addEventListener('focus',resumeConnection);\n  document.addEventListener('visibilitychange',resumeConnection);\n  setInterval(()=>{\n    if(approved&&(GM_RELAY||(window.opener&&!window.opener.closed))&&!run){send('pulse',{version:VERSION,sessionOk:lastSessionOk});}\n    if(!GM_RELAY&&(!window.opener||window.opener.closed)){setStatus('L’onglet Koha associé est fermé. Relancez la connexion depuis Koha.');return;}\n    if(approved&&!run&&!detailBusy&&Date.now()-lastAnnounce>120000)announce();\n  },10000);\n  window.addEventListener('pageshow',()=>{if(approved||pending)announce();});\n  if(approved||pending)announce();\n})();\n";
  const PAGE_PATHS=['/cgi-bin/koha/serials/serials-home.pl','/cgi-bin/koha/serials/serials-search.pl','/cgi-bin/koha/serials/subscription-detail.pl','/cgi-bin/koha/serials/serials-collection.pl','/cgi-bin/koha/serials/subscription-add.pl'];
  const year=new Date().getFullYear();
  const defaults={enabled:true,allowWrites:false,fpNotesTarget:'none',referencePrefix:'DRG',reportId:5262,issuesReportId:5263,onsiteRecentIssues:2,alertFields:'',from:(year-2)+'-01-01',to:(year+2)+'-12-31',includeExpired:false,includeCurrent:true,includeFuture:true,recoveryMode:'fast',readClaims:true,concurrency:8,branchMap:'',subscriptionMap:''};
  const txt=s=>({fr:s,en:s});
  const normalize=c=>{const x={...defaults,...c};x.enabled=x.enabled!==false;x.allowWrites=x.allowWrites===true;if(!['none','notes','internal_notes'].includes(x.fpNotesTarget))x.fpNotesTarget='none';x.referencePrefix=String(x.referencePrefix??'DRG').trim().toUpperCase().replace(/[^A-Z0-9._-]/g,'').slice(0,24);x.recoveryMode=x.recoveryMode==='complete'?'complete':'fast';x.reportId=Math.max(0,parseInt(x.reportId,10)||5262);x.issuesReportId=Math.max(0,parseInt(x.issuesReportId,10)||0);x.onsiteRecentIssues=Math.max(0,Math.min(20,Number.isFinite(Number(x.onsiteRecentIssues))?Math.round(Number(x.onsiteRecentIssues)):2));x.alertFields=String(x.alertFields||'');x.concurrency=Math.max(1,Math.min(12,parseInt(x.concurrency,10)||8));for(const k of ['branchMap','subscriptionMap'])x[k]=String(x[k]||'');for(const k of ['from','to'])if(!/^\d{4}-\d{2}-\d{2}$/.test(x[k]||''))x[k]=defaults[k];return x;};
  const $=(s,r=document)=>r?.querySelector(s)||null;
  const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const issn=s=>String(s||'').toUpperCase().replace(/[^0-9X]/g,'');
  const iso=s=>{const v=String(s||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';};
  let cfg=normalize(defaults),host=null,remote=null,nonce='',state='unknown',running=false,watchdog=null,bridgeCheckAt=0,bridgeAnswerAt=0,relayInstalled=false,fpAutoStarted=false;
  const CACHE_KEY='pmk.fp.native.v2',LINK_KEY='pmk.fp.bridge.koha.v2';
  // Données limitées à la session de l'onglet : pas de stockage partagé persistant
  // de données nominatives FP. Les caches ne contiennent aucun jeton de session.
  const KOHA_CACHE_KEY='pmk.fp.koha.5262-5263.v1',KOHA_CACHE_TTL=10*60*1000;
  const cacheClock={koha:0,fp:0};
  function readKohaCache(){
    try{const x=JSON.parse(sessionStorage.getItem(KOHA_CACHE_KEY)||'null');
      if(!x||x.reportId!==cfg.reportId||x.issuesReportId!==cfg.issuesReportId||!Array.isArray(x.koha)||!Array.isArray(x.libraries)||!Array.isArray(x.issues)||Date.now()-x.ts>KOHA_CACHE_TTL||x.ts>Date.now()+60000)return null;
      return x;
    }catch{return null;}
  }
  function saveKohaCache(){
    try{const issues=[];for(const rows of issueCache.values())issues.push(...rows);
      const blob=JSON.stringify({ts:Date.now(),reportId:cfg.reportId,issuesReportId:cfg.issuesReportId,koha,libraries,issues});
      if(blob.length<6500000){sessionStorage.setItem(KOHA_CACHE_KEY,blob);cacheClock.koha=Date.now();}
    }catch(e){console.warn('[PMK FP] Cache Koha indisponible',e);}
  }
  function clearKohaCache(){try{sessionStorage.removeItem(KOHA_CACHE_KEY);}catch{}cacheClock.koha=0;}
  function restoreKohaCache(){
    const c=readKohaCache();if(!c)return false;
    koha=c.koha;kohaLoaded=true;libraries=c.libraries;
    issueCache.clear();for(const r of c.issues){const id=String(r.subscription_id||'');if(!/^\d+$/.test(id))continue;
      if(!issueCache.has(id))issueCache.set(id,[]);issueCache.get(id).push(r);}
    issueRowsPromise=Promise.resolve(issueCache);cacheClock.koha=c.ts;
    return true;
  }
  function updateCacheNotice(){
    if(!host)return;
    const target=$('[data-fp-session]',host);if(!target)return;
    const age=cacheClock.fp?Math.max(0,Math.round((Date.now()-cacheClock.fp)/60000)):null;
    target.title=(cacheClock.fp?'Données FP en cache ('+age+' min). ':'Données FP non chargées. ')+(cacheClock.koha?'Koha en cache ('+Math.max(0,Math.round((Date.now()-cacheClock.koha)/60000))+' min).':'Koha non chargé.');
  }

  let dataset=null,partial=null,koha=[],kohaLoaded=false,view='subscriptions',page=0,search='';
  let unifiedIntent=false,kohaPromise=null,lastPaint=0,unifiedKohaDone=true,unifiedFpDone=true;
  const pendingDetails=new Map();
  const reportFields=["subscription_id", "biblio_id", "title", "issn", "library_id", "start_date", "end_date", "closed", "vendor_id", "vendor_name", "subscriber_number", "notes", "internal_notes", "callnumber", "grace_period", "frequency_id", "number_pattern_id", "publisher", "librarian", "cost", "aqbudgetid", "weeklength", "monthlength", "numberlength", "countissuesperunit", "status", "lastvalue1", "innerloop1", "lastvalue2", "innerloop2", "lastvalue3", "innerloop3", "firstacquidate", "manualhistory", "irregularity", "skip_serialseq", "letter", "locale", "distributedto", "location", "lastbranch", "serialsadditems", "staffdisplaycount", "opacdisplaycount", "reneweddate", "itemtype", "previousitemtype", "mana_id", "ccode", "published_on_template", "frequency_label", "biblio_periodicity", "library_name", "itemtype_label", "audience_from_itemtype", "numbering_pattern_label", "numbering_pattern_description", "frequency_unit", "frequency_unitsperissue", "frequency_issuesperunit", "marc326a_raw", "marc100a_raw", "serial_history_start", "serial_history_end", "serial_history_public_note", "serial_history_staff_note", "issues_total", "issues_expected", "issues_late", "issues_missing", "issues_claimed_status", "issues_received", "issue_claim_events_count", "issues_with_claim_date", "issues_claimable_now", "oldest_claimable_date", "next_expected_date", "latest_received_date", "latest_claim_date", "last_issue_planned_date", "days_since_oldest_claimable", "days_until_subscription_end", "expired_but_open", "ending_within_60_days"];
  function lines(text) {
    const map=new Map();for(const line of String(text||'').split(/[\n;]+/)){const m=line.trim().match(/^([^=]+)\s*=\s*([^=]+)$/);if(m)map.set(m[1].trim(),m[2].trim());}return map;
  }
  function download(name,data,type='application/json') {
    const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}),url=URL.createObjectURL(blob),a=make('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  const message=(text,error=false)=>{const n=$('[data-fp-status]',host);if(n){n.textContent=text;n.className=error?'pmkfp-error':'pmkfp-status';}};
  function updateState(next,description) {
    state=next;const labels={unknown:'À vérifier',waiting:'Compagnon à associer',connected:'Connecté',disconnected:'Connexion nécessaire',unavailable:'Vérification impossible'};
    const n=$('[data-fp-session]',host);if(n){n.textContent='France Publications : '+(labels[state]||state);n.dataset.state=state;}
    const reconnect=$('[data-fp-reconnect]',host);if(reconnect)reconnect.hidden=state==='connected';
    const link=$('[data-fp-login]',host);if(link)link.hidden=state!=='disconnected';
    const b=$('[data-fp-start]',host);if(b)b.disabled=running||state!=='connected';
    if(description)message(description,state==='unavailable');updateCacheNotice();
    if(document.getElementById('pmkfp-native-controls'))nativeCompactControls();
  }
  function validDate(s){const d=new Date(s+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
  function recoveryOptions(){if(!validDate(cfg.from)||!validDate(cfg.to)||cfg.from>cfg.to)throw new Error('Période de récupération invalide dans les réglages PMK.');return {from:cfg.from,to:cfg.to,expired:false,current:cfg.includeCurrent!==false,future:cfg.includeFuture!==false,details:false,claims:cfg.readClaims!==false,concurrency:cfg.concurrency};}
  function send(type,payload={}){
    if(relayInstalled){window.dispatchEvent(new CustomEvent('pmk-fp-relay-out',{detail:JSON.stringify({channel:CHANNEL,nonce:'relay',type,...payload})}));return;}
    if(remote&&!remote.closed&&nonce)remote.postMessage({channel:CHANNEL,nonce,type,...payload},FP);
  }
  function fpSnapshotNeedsRefresh(){
    const snapshot=dataset||partial;
    const last=Date.parse(String(snapshot?.finishedAt||snapshot?.createdAt||''));
    return !snapshot||!Number.isFinite(last)||Date.now()-last>3*3600000;
  }
  function probeRelay(){window.dispatchEvent(new CustomEvent('pmk-fp-relay-probe'));}
  window.addEventListener('pmk-fp-relay-ready',()=>{
    if(relayInstalled)return;
    relayInstalled=true;nonce='relay';remote={closed:false};
    if(host)send('hello');
  });
  function openBridge() {
    if(running)return;
    if(relayInstalled){
      updateState('waiting','Vérification de la session France Publications…');
      send('hello');send('check');
      // Explicit click only: use the existing FP named tab, or open it if absent.
      // Routine page changes never launch popups automatically.
      window.open(FP+'/index.php?route=accueil','pmk_france_publications');
      return;
    }
    if(remote&&!remote.closed&&state==='connected'){remote.focus();send('check');return;}
    // Si le compagnon n'a pas répondu, rouvrir le même onglet avec un nouveau nonce.
    // L'URL de liaison est à usage unique et ne contient aucun secret FP.
    nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
    try{sessionStorage.setItem(LINK_KEY,JSON.stringify({nonce,created:Date.now()}));}catch{}
    const hash=new URLSearchParams({pmkfp:'1',origin:location.origin,nonce,created:String(Date.now())});
    remote=window.open(FP+'/index.php?route=accueil#'+hash,'pmk_france_publications');
    if(!remote){updateState('unavailable','Onglet bloqué : autorisez l’ouverture de France Publications.');return;}
    updateState('waiting','Vérification automatique de la session et association sécurisée…');
    bridgeCheckAt=Date.now();
    clearTimeout(watchdog);watchdog=setTimeout(()=>{
      if(state==='waiting'){
        updateState('unavailable','Le compagnon ne répond pas. Vérifiez Tampermonkey et la session FP, puis cliquez sur « Réassocier FP ».');
        if(unifiedIntent){unifiedFpDone=true;endUnified(true);}
      }
    },22000);
  }
  function validateDataset(raw) {
    if(!raw||raw.schema!=='pmk-france-publications'||raw.version!==1)throw new Error('Fichier PMK France Publications non reconnu.');
    const out={schema:raw.schema,version:1,createdAt:String(raw.createdAt||''),finishedAt:String(raw.finishedAt||''),scope:raw.scope&&typeof raw.scope==='object'?raw.scope:{},complete:raw.complete===true};
    for(const key of ['titles','subscriptions','claims','replies','errors']){if(!Array.isArray(raw[key])||raw[key].length>20000)throw new Error('Liste '+key+' invalide.');out[key]=raw[key];}
    const known=new Set();for(const r of out.subscriptions){if(!r||typeof r!=='object'||typeof r.ref!=='string'||typeof r.titleCode!=='string'||r.ref.length>200)throw new Error('Abonnement invalide.');const k=r.titleCode+'|'+r.ref+'|'+r.destinationCode;if(known.has(k))throw new Error('Doublon dans le fichier : '+r.ref);known.add(k);}
    for(const key of ['recipients','renewals','pendingClaims','invoices']) {
      const list=raw[key];if(list!==undefined&&(!Array.isArray(list)||list.length>20000))throw new Error('Liste '+key+' invalide.');
      out[key]=Array.isArray(list)?list:[];
    }
    if(out.errors.length)out.complete=false;return out;
  }

  function storeFpSnapshot(d){
    try{const raw=JSON.stringify({timestamp:Date.now(),data:d});if(raw.length<4300000){sessionStorage.setItem(CACHE_KEY,raw);cacheClock.fp=Date.now();updateCacheNotice();}}catch(e){console.warn('[PMK FP] Cache non disponible',e);}
  }
  function restoreNativeSession(){
    try{const link=JSON.parse(sessionStorage.getItem(LINK_KEY)||'null');if(link&&/^[a-f0-9]{32}$/.test(link.nonce)&&Date.now()-link.created<12*3600000){nonce=link.nonce;state='waiting';}}
    catch{}
    try{const snapshot=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');if(snapshot&&Date.now()-snapshot.timestamp<3*3600000){const d=validateDataset(snapshot.data);if(d.complete)dataset=d;else partial=d;cacheClock.fp=snapshot.timestamp;}}
    catch(e){console.warn('[PMK FP] Cache écarté',e);}
  }
  restoreNativeSession();
  async function readReport() {
    if(!cfg.reportId)throw new Error('Renseignez le numéro du rapport SQL dans les réglages PMK du module.');
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);
    try {
      const r=await fetch('/cgi-bin/koha/svc/report?id='+cfg.reportId,{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store',signal:ctl.signal});
      if(!r.ok)throw new Error('Rapport Koha : HTTP '+r.status);
      const t=await r.text();if(t.length>25000000)throw new Error('Rapport trop volumineux.');
      let j;try{j=JSON.parse(t);}catch{throw new Error('Rapport Koha : réponse non JSON. Vérifiez les droits et la connexion.');}
      const rows=Array.isArray(j)?j:Array.isArray(j.rows)?j.rows:Array.isArray(j.data)?j.data:null;
      if(!rows)throw new Error('Rapport Koha : format non reconnu.');
      if(rows.length>20000)throw new Error('Rapport Koha : plus de 20 000 abonnements.');
      const out=rows.map(row=>Object.fromEntries(reportFields.map((k,i)=>[k,Array.isArray(row)?row[i]:row[k]]).filter(([,v])=>v!==undefined).map(([k,v])=>[k,v??''])));
      if(out.some(r=>!/^\d+$/.test(String(r.subscription_id))||!r.title))throw new Error('Colonnes du rapport inattendues : utilisez le SQL fourni.');
      const seen=new Set();for(const r of out){const id=String(r.subscription_id);if(seen.has(id))throw new Error('Rapport Koha : abonnement dupliqué '+id);seen.add(id);}return out;
    } finally {clearTimeout(timer);}
  }
  // A full interval proves overlap; in fast mode an end inside Koha's interval
  // is enough for a provisional comparison, never an end before/after it.
  function periodRelation(row,k){
    const date=s=>{const v=iso(s);return v&&validDate(v)?v:'';};
    const start=date(row.startDate),end=date(row.endDate),ks=date(k.start_date),ke=date(k.end_date);
    if((start&&end&&start>end)||(ks&&ke&&ks>ke))return 'unknown';
    if((end&&ks&&end<ks)||(start&&ke&&start>ke))return 'outside';
    if(!ks||!ke)return 'unknown';
    if(start&&end)return 'overlap';
    if(end&&end>=ks&&end<=ke)return 'provisional';
    return 'unknown';
  }
  // Références FP persistantes dans Koha, en attendant un champ supplémentaire dédié.
  // Chaque renouvellement possède une balise distincte : aucune note préexistante n'est supprimée.
  function fpTags(value){
    const refs=new Set();const re=/\[PMK-FP:([^\]\r\n]+)\]/g;let m;
    while((m=re.exec(String(value||''))))refs.add(m[1].trim());
    return refs;
  }
  function withFpTag(value,ref){
    if(!/^[A-Za-z0-9][A-Za-z0-9._/-]{1,99}$/.test(String(ref||'')))throw new Error('Référence FP non compatible avec le marquage Koha.');
    const previous=String(value||'');
    if(fpTags(previous).has(ref))return previous;
    return previous.replace(/\s*$/,'')+(previous.trim()?'\n':'')+'[PMK-FP:'+ref+']';
  }
  function covering(k,r){
    const a=iso(r.startDate),b=iso(r.endDate),x=iso(k.start_date),y=iso(k.end_date);
    return a&&b&&x&&y&&x<=a&&b<=y;
  }
  function matchedKoha(r){
    const matches=koha.filter(k=>fpTags(k.internal_notes).has(r.ref));
    if(matches.length>1)return {ambiguous:true,matches};
    return matches.length?{koha:matches[0]}:null;
  }
  const escapeReference=value=>Array.from(value).map(c=>'^$.*+?()[]{}|'.includes(c)||c.charCodeAt(0)===92?String.fromCharCode(92)+c:c).join('');
  const commercialPattern=()=>{const prefix=String(cfg.referencePrefix??'DRG').trim().toUpperCase();if(!prefix)return null;return new RegExp('\\b('+escapeReference(prefix)+')-(\\d+)-(\\d+)\\b','gi');};
  const commercialRef=s=>{const pattern=commercialPattern(),m=pattern&&pattern.exec(String(s||''));return m?{exact:m[0].toUpperCase(),family:m[1].toUpperCase()+'-'+m[3],cycle:m[2]}:null;};
  const commercialRefsInText=value=>{const pattern=commercialPattern();return pattern?[...new Set([...String(value||'').matchAll(pattern)].map(m=>m[0].toUpperCase()))]:[];};
  function companionSource(){
    if(location.protocol!=='https:')throw new Error('Le compagnon exige une adresse Koha en HTTPS.');
    const pattern=escapeReference(String(cfg.referencePrefix??'DRG').trim().toUpperCase());
    return COMPANION_SOURCE
      .replaceAll('https://koha.example.invalid',location.origin)
      .replace('/^DRG-\\d+-\\d+$/i','/^'+(pattern||'(?!)')+'-\\d+-\\d+$/i');
  }
  function kohaCommercialRefs(k){
    const text=[k.internal_notes,k.notes,...fpTags(k.internal_notes)].join(' '),out=new Set();
    for(const ref of commercialRefsInText(text))out.add(ref);
    return [...out];
  }
  function referenceCandidate(r,site){
    const ref=commercialRef(r.ref);if(!ref)return null;
    const candidates=[];
    for(const k of koha){
      if(site.code&&String(k.library_id)!==site.code)continue;
      const refs=kohaCommercialRefs(k);const exact=refs.includes(ref.exact);
      const family=!exact&&refs.some(s=>commercialRef(s)?.family===ref.family);
      if(!exact&&!family)continue;
      const siteVerified=!!site.code&&String(k.library_id)===site.code;
      const issnVerified=issn(r.issn).length===8&&issn(r.issn)===issn(k.issn);
      candidates.push({k,exact,family,siteVerified,issnVerified});
    }
    const exact=candidates.filter(x=>x.exact);
    if(exact.length===1)return {koha:exact[0].k,reason:'Référence FP exacte retrouvée dans Koha'};
    if(exact.length>1)return {ambiguous:true,related:exact.map(x=>x.k),reason:'Référence FP utilisée dans plusieurs abonnements Koha'};
    const related=candidates.filter(x=>x.family&&x.siteVerified&&x.issnVerified);
    if(related.length===1)return {koha:related[0].k,reason:'Même famille DRG, bibliothèque et ISSN (renouvellement probable)',probable:true};
    if(related.length>1)return {ambiguous:true,related:related.map(x=>x.k),reason:'Plusieurs abonnements de même famille DRG'};
    return null;
  }
  // DRG-<cycle>-<identifiant stable> : seul le bloc central change lors des renouvellements.
  // Le numero d'abonne FP est facultatif et ne conditionne jamais la liaison.
  function familyFpForKoha(k,visibleRefs=[]){
    const refs=[...new Set([...kohaCommercialRefs(k),...visibleRefs])];
    const families=new Set(refs.map(x=>commercialRef(x)?.family).filter(Boolean));
    const sources=[...(dataset?.subscriptions||[]),...(partial?.subscriptions||[])];
    const found=new Map();
    for(const f of sources){
      const ref=commercialRef(f.ref);
      if(!ref||!families.has(ref.family))continue;
      const site=autoLibrary(f)?.code;
      // Ne jamais attribuer automatiquement le contrat d'un autre site.
      if(!site||site!==String(k.library_id))continue;
      const key=ref.exact+'|'+String(f.destinationCode||'');
      found.set(key,f);
    }
    return [...found.values()];
  }
  function familyIssnDiagnostic(k,visibleRefs=[]){
    const candidates=familyFpForKoha(k,visibleRefs);
    const key=issn(k.issn);
    if(!key||key.length!==8||!candidates.length)return null;
    const distinct=new Set(candidates.map(f=>issn(f.issn)).filter(x=>x.length===8));
    if(distinct.size!==1)return null;
    const fpIssn=[...distinct][0];
    if(fpIssn===key)return null;
    return {koha:String(k.issn||''),fp:candidates.find(f=>issn(f.issn)===fpIssn)?.issn||fpIssn,refs:[...new Set(candidates.map(f=>f.ref))]};
  }
  function match(r) {
    if(r._koha){
      const k=r._koha, fp=(partial||dataset)?.subscriptions||[],refs=kohaCommercialRefs(k),families=new Set(refs.map(x=>commercialRef(x)?.family).filter(Boolean));
      // Matching must not collapse when FP destination mapping is absent.
      // Exact reference > stable DRG family > unique title (only one on each side).
      const fpSite=f=>autoLibrary(f)?.code||'';
      const siteCompatible=f=>!fpSite(f)||fpSite(f)===String(k.library_id);
      const uniqueFp=arr=>[...new Map(arr.map(f=>[String(f.ref||'')+'|'+String(f.destinationCode||''),f])).values()];
      const exact=uniqueFp(fp.filter(f=>refs.includes(String(f.ref||'').toUpperCase())&&siteCompatible(f)));
      const family=uniqueFp(fp.filter(f=>families.has(commercialRef(f.ref)?.family)&&siteCompatible(f)));
      const ki=issn(k.issn);
      const familyIssn=family.filter(f=>!ki||!issn(f.issn)||issn(f.issn)===ki);
      let candidates=exact.length?exact:(familyIssn.length?familyIssn:family);
      // Title-only fallback is an indication, not permission to write to Koha.
      // It is available only if FP and Koha each have exactly one subscription
      // for the normalized title/ISSN across the complete loaded sets.
      const titleKey=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      if(!candidates.length){
        const kohaTitle=koha.filter(x=>titleKey(x.title)===titleKey(k.title));
        const fpTitle=uniqueFp(fp.filter(f=>titleKey(f.title)===titleKey(k.title)));
        if(kohaTitle.length===1&&fpTitle.length===1&&siteCompatible(fpTitle[0]))candidates=fpTitle;
      }
      // La référence inscrite dans Koha peut déjà désigner le RENOUVELLEMENT suivant.
      // On compare d'abord la période, parmi tous les cycles de la famille DRG,
      // avant de donner la priorité à une référence textuelle exacte.
      const exactCandidates=candidates.filter(f=>refs.includes(String(f.ref||'').toUpperCase()));
      const periodPool=familyIssn.length?familyIssn:(family.length?family:candidates);
      const endKoha=iso(k.end_date),startKoha=iso(k.start_date);
      const sameEnd=periodPool.filter(f=>endKoha&&iso(f.endDate)===endKoha);
      const overlap=periodPool.filter(f=>iso(f.startDate)&&iso(f.endDate)&&startKoha&&endKoha&&iso(f.startDate)<=endKoha&&iso(f.endDate)>=startKoha);
      // Si la période exacte est disponible, elle prime sur DRG-7 dans la note Koha.
      // Sinon ne retenir une référence exacte que si son cycle n'est pas entièrement futur.
      const usableExact=exactCandidates.filter(f=>!endKoha||!iso(f.startDate)||iso(f.startDate)<=endKoha);
      const selected=sameEnd.length?sameEnd:(overlap.length?overlap:(usableExact.length?usableExact:candidates));
      const sorted=selected.slice().sort((a,b)=>String(b.endDate||'').localeCompare(String(a.endDate||'')));
      if(!sorted.length){
        const sameFamily=fp.filter(f=>families.has(commercialRef(f.ref)?.family));
        const sameTitle=fp.filter(f=>issn(f.issn).length===8&&issn(f.issn)===issn(k.issn));
        const unresolved=sameFamily.filter(f=>!autoLibrary(f).code);
        const conflicts=sameFamily.filter(f=>autoLibrary(f).code&&autoLibrary(f).code!==String(k.library_id));
        const diagnosis=unresolved.length?'Famille DRG trouvée chez FP, mais destinataire non identifié ('+unresolved.length+'). Configurer la correspondance du destinataire FP.':conflicts.length?'Famille DRG trouvée, mais attribuée à un autre site ('+conflicts.length+'). Vérifier avant toute association.':sameTitle.length?'ISSN retrouvé chez FP ('+sameTitle.length+' contrat(s)), mais aucune référence de même famille DRG pour ce site. Vérifier la référence commerciale.':(fp.length?'Aucune famille DRG ni ISSN correspondant dans les abonnements FP chargés.':'Données FP non disponibles : reconnecter ou actualiser.');
        return {label:diagnosis,kind:'unknown',koha:k,diff:[],fp:null};
      }
      const f=sorted[0];
      if(sorted.length>1&&sorted[0].endDate===sorted[1].endDate&&sorted[0].ref!==sorted[1].ref)return {label:'Plusieurs cycles FP de même échéance : à vérifier',kind:'period',koha:k,fp:null,diff:[]};
      const futureCycles=family.filter(x=>x!==f&&iso(x.endDate)&&endKoha&&iso(x.endDate)>endKoha)
        .sort((a,b)=>String(a.endDate).localeCompare(String(b.endDate)));
      const renewal=futureCycles[0]||null;
      // Une référence de renouvellement future n'est pas une discordance de dates.
      // Même si cette référence est écrite dans la note privée Koha.
      if(!sameEnd.length&&!overlap.length&&iso(f.endDate)&&endKoha&&iso(f.endDate)>endKoha){
        return {label:'Cycle FP futur identifié : comparer le renouvellement, pas les échéances',kind:'renewal',koha:k,fp:null,renewal:f,diff:[]};
      }
      const diff=[];
      // FP start date is optional: annual commercial cycles do not match Koha continuity start date.
      if(iso(f.endDate)&&iso(k.end_date)&&iso(f.endDate)!==iso(k.end_date))diff.push({field:'Fin',koha:iso(k.end_date),fp:iso(f.endDate)});
      const same=iso(f.endDate)&&iso(f.endDate)===iso(k.end_date);
      const covered=covering(k,f);
      return {label:same?'Périodes concordantes':covered?'Cycle FP inclus dans la couverture Koha':diff.length?'Cycle FP différent : vérifier renouvellement / continuité':'Données FP incomplètes',kind:same?'same':covered?'covered':diff.length?'period':'partial',koha:k,fp:f,renewal,diff};
    }
    if(!kohaLoaded)return {label:'Koha à charger',kind:'unknown'};
    const stored=matchedKoha(r);
    if(stored?.ambiguous)return {label:'Référence FP enregistrée dans plusieurs abonnements Koha : résoudre le doublon',kind:'unmatched',related:stored.matches};
    const site=autoLibrary(r),reference=stored?.koha?null:referenceCandidate(r,site);
    if(reference?.ambiguous)return {label:reference.reason,kind:'unmatched',related:reference.related};
    const manualId=stored?.koha?.subscription_id||reference?.koha?.subscription_id||lines(cfg.subscriptionMap).get(r.ref);let candidates;
    if(manualId)candidates=koha.filter(k=>String(k.subscription_id)===manualId);
    else {
      if(!site.code)return {label:site.reason,kind:'unmatched'};
      const key=issn(r.issn);if(key.length!==8)return {label:'ISSN absent ou invalide : rapprochement à vérifier',kind:'unmatched'};
      candidates=koha.filter(k=>String(k.library_id)===site.code&&issn(k.issn)===key&&Number(k.closed)!==1);
    }
    if(!candidates.length)return {label:'Aucune correspondance',kind:'unmatched'};
    // Une association FP explicitement enregistrée dans Koha est prioritaire
    // sur les heuristiques titre/ISSN/date : elle peut couvrir des renouvellements.
    if(stored?.koha||reference?.koha){
      const k=stored?.koha||reference.koha,complete=!!iso(r.startDate)&&!!iso(r.endDate);
      if(complete&&covering(k,r)&&!(iso(r.startDate)===iso(k.start_date)&&iso(r.endDate)===iso(k.end_date)))return {label:(reference?.reason||'Renouvellement FP')+' · période couverte',kind:'covered',koha:k,diff:[]};
      // Une référence de la même famille DRG peut représenter un cycle ANTERIEUR.
      // La différence de dates est alors normale : ne jamais remplacer les dates Koha.
      if(reference?.probable&&complete&&iso(k.start_date)&&iso(r.endDate)<iso(k.start_date))
        return {label:'Cycle FP antérieur, même famille DRG / site / ISSN : aucun alignement de dates requis',kind:'historical',koha:k,diff:[]};
      // Cycle suivant absent de la couverture Koha : renouvellement à instruire,
      // pas une correction aveugle du début de l’abonnement.
      if(reference?.probable&&complete&&iso(k.end_date)&&iso(r.startDate)>iso(k.end_date))
        return {label:'Nouveau cycle FP identifié : renouvellement Koha à vérifier',kind:'renewal',koha:k,diff:[]};
      const diff=[];for(const [fp,kf,label] of [['endDate','end_date','Fin']])if(iso(r[fp])&&iso(r[fp])!==iso(k[kf]))diff.push({field:label,koha:iso(k[kf]),fp:iso(r[fp])});
      return {label:(reference?.reason||'Association Koha')+(diff.length?' · '+diff.length+' date(s) différente(s)':''),kind:diff.length?'different':complete?'same':'partial',koha:k,diff};
    }
    const related=candidates,relations=candidates.map(k=>({k,relation:periodRelation(r,k)}));
    candidates=relations.filter(x=>['overlap','provisional'].includes(x.relation)).map(x=>x.k);
    // Unknown periods remain competitors: their dates must be read before choosing.
    if(relations.some(x=>x.relation==='unknown'))return {label:'Période à confirmer — lisez la fiche FP ou vérifiez les dates Koha',kind:'period',related};
    if(!candidates.length)return {label:'Même titre et site, période différente — aucune correction proposée',kind:'period',related};
    if(candidates.length!==1)return {label:'Plusieurs correspondances',kind:'unmatched'};
    const k=candidates[0],diff=[];
    for(const [fp,kf,label]of [['endDate','end_date','Fin']])if(iso(r[fp])&&iso(r[fp])!==iso(k[kf]))diff.push({field:label,koha:iso(k[kf]),fp:iso(r[fp])});
    const complete=!!iso(r.startDate)&&!!iso(r.endDate);
    return {label:diff.length?diff.length+' différence(s)':!r.startDate?'Fin concordante · début non lu':!complete?'Comparaison incomplète':'Concordant',kind:diff.length?'different':!complete?'partial':'same',koha:k,diff};
  }
  function requestDetail(row,button) {
    if(running||pendingDetails.size){message('Attendez la fin de la lecture en cours.');return;}
    if(state!=='connected'||!remote||remote.closed){openBridge();message('Connectez France Publications, puis rouvrez le détail pour lire la fiche complète.');return;}
    const requestId=nonce+'-'+Date.now().toString(36);
    if(button){button.disabled=true;button.textContent='Lecture de la fiche…';}
    const timer=setTimeout(()=>{pendingDetails.delete(requestId);if(button){button.disabled=false;button.textContent='Réessayer la fiche complète';}message('La fiche ne répond pas. Vous pouvez réessayer.',true);},60000);
    pendingDetails.set(requestId,{row,button,timer});send('detail',{ref:row.ref,requestId});
  }
  function showDetails(row) {
    $('[data-fp-detail]',host)?.remove();const p=make('div');p.dataset.fpDetail='1';p.className='pmkfp-detail pmkfp-modal';const close=make('button','✕');close.type='button';close.className='btn btn-default btn-sm pmkfp-modal-close';close.setAttribute('aria-label','Fermer la fiche');close.onclick=closeDrawer;p.setAttribute('role','dialog');p.setAttribute('aria-label','Fiche de l’abonnement');p.tabIndex=-1;p.setAttribute('aria-modal','true');activeRow=row;const header=make('header');header.className='pmkfp-modal-header';const headerCopy=make('div');headerCopy.append(make('small','FICHE ABONNEMENT · KOHA / FRANCE PUBLICATIONS'),make('h4',row.title||row.Titre||row.TitreLibelle||'Détail'));header.append(headerCopy,close);p.append(header);const tabs=make('nav');tabs.className='pmkfp-tabs';tabs.setAttribute('role','tablist');p.append(tabs);
    const m=(row.ref||row._koha)?match(row):null;
    if(m?.koha){const a=make('a','Ouvrir l’abonnement Koha');a.href='/cgi-bin/koha/serials/subscription-detail.pl?subscriptionid='+encodeURIComponent(m.koha.subscription_id);a.target='_blank';a.rel='noopener';p.append(a);}
    addAssociations(row,p);if(m?.koha){const edit=button('Corriger les champs Koha',()=>{if(!p.querySelector('[data-fp-editor]'))showEditor(row,p);},'btn btn-primary btn-sm');p.append(edit);const a=make('a','Modifier dans Koha');a.href=nativeURL(m.koha.subscription_id);a.target='_blank';a.rel='noopener';p.append(a);}let detailButton=null;if(row.ref&&!row._koha&&!row.detailRead){p.append(make('p','Les informations de base sont chargées. L’historique sera disponible depuis la fiche complète.'));detailButton=make('button','Charger la fiche complète');detailButton.type='button';detailButton.className='btn btn-default btn-sm';detailButton.onclick=()=>requestDetail(row,detailButton);p.append(detailButton);}
    if(m){addFieldComparison(row._koha&&m.fp?m.fp:row,m,p);}
    const labels={ref:'Référence FP',titleCode:'Code titre FP',title:'Titre',issn:'ISSN',publisher:'Éditeur',destinationCode:'Code destinataire FP',destination:'Destinataire',endDate:'Fin',quantity:'Quantité',subscriberNumber:'Numéro abonné',purchaseOrder:'Bon de commande',internalReference:'Référence interne abonnement',destinationReference:'Référence interne destinataire',email:'Courriel',notes:'Notes',support:'Support',ht:'Montant HT',vatAmount:'Montant TVA',ttc:'Montant TTC',discount:'Remise (valeur FP)',state:'État affiché par FP',detailRead:'Fiche détaillée lue',DT_RowId:'Identifiant FP',recla_date:'Date de réclamation',RefAbo:'Référence abonnement',Destinataire:'Destinataire',Identifiant:'Identifiant',RefInterne:'Référence interne',ISSN:'ISSN',TitreLibelle:'Titre',nbReponses:'Nombre de réponses',nbRelances:'Nombre de relances',DateDerniereReponse:'Dernière réponse',repons_date:'Date de réponse',CodeDestinataire:'Code destinataire',Titre:'Titre',Reponse:'Réponse'};const dl=make('dl');for(const [key,v] of Object.entries(row)){if(!labels[key])continue;dl.append(make('dt',labels[key]),make('dd',v===true?'Oui':v===false?'Non':String(v??'—')));}const info=make('details');info.className='pmkfp-raw-fields';info.append(make('summary','Informations complètes de l’abonnement'),dl);p.append(info);if(Array.isArray(row.detailTables))for(const [i,tab]of row.detailTables.entries()){const section=make('details');section.append(make('summary',i===0?'Factures / données de la fiche':'Historique / données de la fiche'));const table=make('table');table.className='table table-condensed';const head=make('tr');for(const h of tab.headers||[])head.append(make('th',h));table.append(head);for(const cells of tab.rows||[]){const tr=make('tr');for(const v of cells)tr.append(make('td',v));table.append(tr);}section.append(table);p.append(section);}if(m?.koha)addMissingKohaFields(m.koha,row,p);addClaimDashboard(m?.koha,m?.fp||(!row._koha&&row.ref?row:null),p);addInvoiceDashboard(m?.fp||(!row._koha&&row.ref?row:null),p);addCommercialDashboard(m?.fp||(!row._koha&&row.ref?row:null),p);addPendingClaims(m?.fp||(!row._koha&&row.ref?row:null),p);const elements=Array.from(p.children).filter(el=>el!==header&&el!==tabs);const buckets={controle:[],gestion:[],fp:[],reclamations:[]};for(const el of elements){const t=(el.textContent||'').slice(0,100).toLowerCase();const area=el.dataset.pmkArea||(el.tagName==='BUTTON'&&t.includes('corriger')?'gestion':el.tagName==='A'&&t.includes('modifier')?'gestion':t.includes('factures / données de la fiche')||t.includes('historique / données de la fiche')?'fp':t.includes('réclamation')&&el.tagName==='DETAILS'?'reclamations':'controle');buckets[area].push(el);}for(const [key,label]of [['controle','Contrôles'],['gestion','Édition Koha'],['fp','France Publications / factures'],['reclamations','Réclamations']]){const section=make('section');section.dataset.pmkTab=key;section.className='pmkfp-tab-content';section.hidden=key!=='controle';section.setAttribute('role','tabpanel');section.id='pmkfp-tab-'+key+'-'+String(m?.koha?.subscription_id||row.ref||'fp').replace(/[^a-z0-9_-]/gi,'');for(const el of buckets[key])section.append(el);p.append(section);const b=button(label,()=>{for(const s of p.querySelectorAll('[data-pmk-tab]')){s.hidden=s.dataset.pmkTab!==key;s.setAttribute('aria-hidden',String(s.hidden));}for(const n of tabs.querySelectorAll('button')){n.classList.toggle('active',n===b);n.setAttribute('aria-selected',String(n===b));}},'btn btn-default btn-sm');b.setAttribute('role','tab');b.id='pmkfp-tab-button-'+key;b.setAttribute('aria-label',label);b.setAttribute('aria-controls',section.id);b.setAttribute('aria-selected',String(key==='controle'));if(key==='controle')b.classList.add('active');section.setAttribute('aria-labelledby',b.id);tabs.append(b);}host.append(p);p.focus();p.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeDrawer();}});
  }
  const STATUS_UI={info:{icon:'i',label:'À interpréter',help:'Correspondance indicative ou champ sans équivalent vérifié.'},period:{icon:'◷',label:'Période à vérifier',help:'Le cycle FP ne correspond pas à la période Koha, ou les dates disponibles ne permettent pas de le confirmer. Aucune correction FP proposée.'},same:{icon:'✓',label:'Dates concordantes',help:'Les deux dates lues correspondent à Koha.'},different:{icon:'≠',label:'Écart de dates',help:'Une différence à examiner ; ce n’est pas forcément une erreur.'},historical:{icon:'✓',label:'Ancien cycle reconnu',help:'Le contrat FP est identifié par famille DRG, site et ISSN. Son cycle est antérieur à la période Koha : ne pas écraser les dates.'},renewal:{icon:'↻',label:'Renouvellement à vérifier',help:'Nouveau cycle FP postérieur à la couverture Koha : renouveler plutôt que remplacer aveuglément les dates.'},covered:{icon:'✓',label:'Période couverte',help:'La référence FP est enregistrée dans Koha et sa période est incluse dans celle de l’abonnement Koha.'},partial:{icon:'◐',label:'À compléter',help:'La comparaison reste partielle : une date n’a pas été lue.'},unmatched:{icon:'?',label:'À rapprocher',help:'Aucun abonnement Koha unique ne peut être retenu.'},unknown:{icon:'—',label:'Non comparé',help:'Chargez les abonnements Koha pour comparer.'},koha:{icon:'•',label:'Source Koha',help:'Abonnement Koha sans comparaison FP dans cette vue.'}};
  function stateBadge(kind,label){const meta=STATUS_UI[kind]||STATUS_UI.unknown,b=make('span',meta.icon+' '+(label||meta.label));b.className='pmkfp-badge pmkfp-tone-'+kind;b.title=meta.help;return b;}
  function displayDate(value){const v=iso(value);return v?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):value?String(value):'Non lue';}
  // Présentation commune et compacte des échéances : fiche, recherche, tableau PMK.
  // Une correspondance réelle est nécessaire pour afficher le symbole de concordance.
  function compactFpStatus(k,m){
    const end=iso(k?.end_date),fp=m?.fp,fpEnd=iso(fp?.endDate);
    const same=!!(end&&fpEnd&&end===fpEnd);
    const diff=!!(end&&fpEnd&&end!==fpEnd&&!['renewal','historical','covered'].includes(m?.kind));
    const renewal=m?.renewal?.endDate?m.renewal:(m?.kind==='renewal'?m.renewal:null);
    return {same,diff,fp,fpEnd,renewal};
  }
  function appendCompactFpStatus(container,k,m,options={}){
    const status=compactFpStatus(k,m);
    if(status.same){
      const n=make('span',' ✓');n.className='pmk-native-good';
      n.title='Concordance France Publications'+(status.fp?.ref?' · '+status.fp.ref:'');
      n.setAttribute('aria-label',n.title);container.append(n);
    }else if(status.diff){
      const n=make('span',' · ⚠ FP '+displayDate(status.fpEnd));n.className='pmk-native-alert';
      n.title='Échéance Koha '+displayDate(k.end_date)+' · FP '+displayDate(status.fpEnd)+(status.fp?.ref?' · '+status.fp.ref:'');
      container.append(n);
    }
    if(status.renewal){
      const n=make('small',' · ↻ FP '+String(status.renewal.endDate).slice(0,4));
      n.className='pmk-native-date';n.style.cssText='display:inline;color:#586c7b;margin-left:2px';
      n.title='Renouvellement France Publications '+String(status.renewal.ref||'')+' — échéance '+displayDate(status.renewal.endDate);
      n.setAttribute('aria-label',n.title);container.append(n);
    }
    if(!status.same&&!status.diff&&!status.renewal&&options.showUnknown){
      const n=make('small',m?.kind==='historical'?'Cycle FP antérieur':m?.kind==='covered'?'Période couverte':'FP à vérifier');
      n.title=m?.label||'Comparaison des dates non confirmée';container.append(n);
    }
    return status;
  }
  function dateCell(row,key,m){
    const td=make('td'),value=row[key],other=m.koha?.[key==='startDate'?'start_date':'end_date'];
    if(row._koha){td.append(make('span',displayDate(value)));addInline(td,row,EDIT_FIELDS.find(f=>f.key===(key==='startDate'?'start_date':'end_date')));return td;}
    if(!value){td.append(stateBadge('partial','Non lue'));addInline(td,row,EDIT_FIELDS.find(f=>f.key===(key==='startDate'?'start_date':'end_date')));return td;}
    const different=m.diff?.some(d=>d.field===(key==='startDate'?'Début':'Fin'));
    const line=make('strong',displayDate(value));line.className='pmkfp-date';td.append(line);
    if(m.koha){td.className=different?'pmkfp-date-diff':'pmkfp-date-same';td.append(make('small',different?'≠ Koha : '+(other?displayDate(other):'Non renseignée'):m.kind==='covered'?'✓ Couvert par la période Koha':m.kind==='historical'?'✓ Cycle antérieur reconnu':m.kind==='renewal'?'↻ Renouvellement à vérifier':'✓ Identique à Koha'));}
    if(!['historical','renewal'].includes(m.kind))addInline(td,row,EDIT_FIELDS.find(f=>f.key===(key==='startDate'?'start_date':'end_date')));return td;
  }
  function comparisonOverview(){
    const box=$('[data-fp-overview]',host);if(!box)return;box.replaceChildren();box.hidden=!['subscriptions','review','renewals'].includes(view)||filters.source==='koha';if(box.hidden)return;
    const rows=filteredRows(true),counts={same:0,covered:0,historical:0,renewal:0,different:0,partial:0,unmatched:0,unknown:0,period:0};for(const r of rows)counts[match(r).kind]++;
    box.append(make('p','Comparaison des dates · résultats correspondant à la recherche, au site et à la période.'));
    const cards=make('div');cards.className='pmkfp-cards';
    for(const kind of ['', 'same','covered','historical','renewal','different','partial','period','unmatched','unknown']){
      if(kind==='unknown'&&!counts.unknown)continue;
      const meta=kind?STATUS_UI[kind]:{icon:'',label:'Tous',help:'Afficher tous les états de comparaison.'};
      const b=button('',()=>{filters.comparison=kind;view='subscriptions';$('[data-fp-view]',host).value=view;page=0;buildFilters();renderTable();});b.className='pmkfp-card pmkfp-tone-'+(kind||'unknown');b.title=meta.help;b.setAttribute('aria-pressed',String(filters.comparison===kind&&view!=='review'));
      b.append(make('strong',String(kind?counts[kind]:rows.length)),make('span',(meta.icon?meta.icon+' ':'')+meta.label));cards.append(b);
    }box.append(cards);
  }
  function detailComparison(row,m,p){
    p.append(stateBadge(m.kind));p.append(make('p',m.label));if(m.kind==='period'&&m.related?.length){p.append(make('p','Échéance FP : '+displayDate(row.endDate)));for(const k of m.related){const a=make('a','Koha '+k.subscription_id+' · '+displayDate(k.start_date)+' → '+displayDate(k.end_date));a.href='/cgi-bin/koha/serials/subscription-detail.pl?subscriptionid='+encodeURIComponent(k.subscription_id);a.target='_blank';a.rel='noopener';const line=make('p');line.append(a);p.append(line);}}if(!m.koha||row._koha)return;
    const table=make('table');table.className='table pmkfp-comparison';const head=make('tr');for(const label of ['Champ','France Publications','Koha','État'])head.append(make('th',label));table.append(head);
    for(const [fp,k,label]of [['endDate','end_date','Fin']]){const tr=make('tr'),known=!!row[fp],different=m.diff?.some(d=>d.field===label),kind=!known?'partial':different?'different':'same';tr.className='pmkfp-compare-'+kind;tr.append(make('th',label),make('td',displayDate(row[fp])),make('td',m.koha[k]?displayDate(m.koha[k]):'Non renseignée'));const state=make('td');state.append(stateBadge(kind,!known?'Non lue':different?'Différent':'Identique'));tr.append(state);table.append(tr);}p.append(table);
  }

  function fpLink(label,path){
    const a=make('a',label);a.href=FP+path;a.target='_blank';a.rel='noopener';
    a.onclick=e=>{if(state!=='connected'){e.preventDefault();openBridge();message('Vérifiez la connexion France Publications, puis cliquez à nouveau sur ce lien.');}};return a;
  }
  function relatedReferences(row){
    const refs=new Set([row.ref]);
    for(const table of row.detailTables||[])if((table.headers||[]).some(h=>words(h).includes('CODE')&&words(h).includes('ECHEANCE'))){
      for(const cells of table.rows||[])for(const value of cells){const text=String(value).replace(/\d{2}\/\d{2}\/\d{4}/g,' ');for(const m of text.matchAll(/\b[A-Z]+-\d+-\d+\b/g))refs.add(m[0]);}
    }return refs;
  }
  function relatedEvents(row){
    const data=partial||dataset,refs=relatedReferences(row),events=[];
    for(const c of data?.claims||[])if(refs.has(c.RefAbo))events.push({type:'Réclamation',date:c.recla_date,ref:c.RefAbo,id:c.DT_RowId,text:(c.nbReponses||0)+' réponse(s) · '+(c.nbRelances||0)+' relance(s)',last:c.DateDerniereReponse});
    for(const r of data?.replies||[])if(refs.has(r.RefAbo))events.push({type:'Réponse',date:r.repons_date,ref:r.RefAbo,id:r.DT_RowId,text:r.Reponse});
    return events.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  }
  function invoiceNumbers(row){
    const ids=new Set();for(const table of row.detailTables||[]){const ix=(table.headers||[]).findIndex(h=>words(h)==='NUMERO');if(ix<0||!(table.headers||[]).some(h=>words(h)==='TTC'))continue;
      for(const cells of table.rows||[]){const id=clean(cells[ix]);if(/^\d{1,12}$/.test(id))ids.add(id);}
    }return [...ids];
  }
  function addServiceHistory(row,p){
    if(!row.ref||row._koha)return;
    const events=relatedEvents(row),section=make('details');section.open=true;section.append(make('summary','Réclamations et réponses ('+events.length+')'));
    const data=partial||dataset;section.append(make('small','Historique dans le périmètre récupéré'+(data?.scope?.from?' : '+displayDate(data.scope.from)+' → '+displayDate(data.scope.to):'')+'. Les anciens cycles sont reliés uniquement lorsqu’ils figurent dans la fiche FP lue.'));
    if(!events.length)section.append(make('p','Aucun événement dans les données chargées. Cela ne prouve pas l’absence d’une réclamation hors de ce périmètre.'));
    for(const e of events){const card=make('article');card.className='pmkfp-event';card.append(make('strong',e.type+' · '+displayDate(e.date)),make('small',e.ref),make('p',e.text||'Texte non fourni dans la liste'));
      if(e.last)card.append(make('small','Dernière réponse : '+displayDate(e.last)));
      if(/^\d+$/.test(String(e.id||'')))card.append(fpLink('Consulter dans France Publications','/index.php?modal=reclamations/detail&ref='+encodeURIComponent(e.id)));section.append(card);
    }p.append(section);
    const invoices=make('details');invoices.open=true;invoices.append(make('summary','Factures liées ('+invoiceNumbers(row).length+')'));
    for(const id of invoiceNumbers(row)){const line=make('p');line.append(fpLink('Télécharger la facture FP '+id,'/ajx/getFacture.php?nFact='+encodeURIComponent(id)));invoices.append(line);}
    if(!invoiceNumbers(row).length)invoices.append(make('p',row.detailRead?'Aucune facture identifiable dans cette fiche.':'Chargez la fiche complète pour lire les références des factures.'));
    invoices.append(make('small','Lien vers le document France Publications. Aucun rattachement à une facture des acquisitions Koha n’est effectué.'));p.append(invoices);
    addClaimDraft(row,p);
  }
  function claimText(row,numbers,reason,comment){
    if(!clean(numbers))throw new Error('Indiquez les numéros ou les dates des fascicules concernés.');
    return ['Référence France Publications : '+row.ref,'Titre : '+row.title,'ISSN : '+(row.issn||'non renseigné'),'Destinataire : '+(row.destination||row.destinationCode||'à préciser'),'Échéance FP : '+displayDate(row.endDate),'Motif : '+reason,'Fascicules concernés : '+clean(numbers),'',String(comment||'').trim()].join('\n');
  }
  function addClaimDraft(row,p){
    const box=make('details');box.append(make('summary','Préparer une réclamation'));
    box.append(make('p','Brouillon local à relire puis reporter dans le formulaire France Publications. Aucun envoi depuis PMK.'));
    const numbers=make('input');numbers.type='text';numbers.className='form-control';numbers.placeholder='Numéros ou dates des fascicules';numbers.setAttribute('aria-label','Fascicules concernés');
    const reason=make('select');reason.className='form-control';reason.setAttribute('aria-label','Motif');for(const label of ['Non reçu','Numéro endommagé','Autre']){const o=make('option',label);o.value=label;reason.append(o);}
    const comment=make('textarea');comment.className='form-control';comment.placeholder='Message complémentaire';comment.setAttribute('aria-label','Message complémentaire');
    const preview=make('textarea');preview.className='form-control';preview.rows=9;preview.readOnly=true;preview.setAttribute('aria-label','Aperçu de la réclamation');
    const update=()=>{try{preview.value=claimText(row,numbers.value,reason.value,comment.value);return true;}catch(e){message(e.message,true);return false;}};
    box.append(numbers,reason,comment,button('Préparer l’aperçu',update),preview,button('Copier le brouillon',async()=>{if(!update())return;try{await navigator.clipboard.writeText(preview.value);message('Brouillon copié. Relisez-le dans France Publications avant de l’envoyer.');}catch{message('Sélectionnez le texte de l’aperçu pour le copier.');}}),fpLink('Ouvrir le dépôt France Publications','/index.php?route=reclamations/depot'));
    p.append(box);
  }
  function fpFieldValue(row,def){
    if(row._koha)return undefined;
    if(['notes','internal_notes'].includes(def.key))return cfg.fpNotesTarget===def.key&&row.detailRead?row.notes:undefined;
    if(def.key==='library_id')return autoLibrary(row).code||undefined;
    return def.fp?row[def.fp]:undefined;
  }
  function comparisonFields(row,k){
    const rows=[];const has=v=>v!==undefined&&v!==null&&String(v)!=='';
    const add=(label,fp,koha,kind,note)=>rows.push({label,fp:has(fp)?String(fp):'Non renseigné / non lu',koha:koha===undefined?'Non chargé (rapport à actualiser)':has(koha)?String(koha):'Non renseigné',kind,note});
    const text=(label,fp,kv,normalizer,note,strict=false)=>add(label,fp,kv,!has(fp)||!has(kv)?'partial':normalizer(fp)===normalizer(kv)?'same':strict?'different':'info',note);
    text('Titre',row.title,k.title,words,'Notice bibliographique : libellé commercial FP potentiellement différent.');
    text('ISSN',row.issn,k.issn,issn,'Notice bibliographique ; correction dans le catalogage.',true);
    text('Éditeur',row.publisher,k.publisher,words,'Éditeur de la notice, distinct du fournisseur des abonnements.');
    const code=autoLibrary(row).code;text('Médiathèque',code,k.library_id,String,'Site reconnu à partir du destinataire FP.',true);
    if(cfg.fpNotesTarget==='none')add('Note FP',row.notes,[k.notes,k.internal_notes].filter(Boolean).join(' / '),'info','Choisir Note publique ou Note interne dans PMK avant toute reprise.');
    else {const label=cfg.fpNotesTarget==='notes'?'Note publique':'Note interne';text('Note FP → '+label,row.notes,k[cfg.fpNotesTarget],s=>String(s).replace(/\r\n/g,'\n').trim(),row.detailRead?'Reprise explicite possible après aperçu.':'Lire la fiche complète avant toute reprise de note.',true);}
    for(const [key,label]of [['ref','Référence abonnement FP'],['subscriberNumber','Numéro d’abonné'],['purchaseOrder','Bon de commande FP'],['internalReference','Référence interne abonnement'],['destinationReference','Référence interne destinataire'],['quantity','Quantité'],['support','Support'],['email','Courriel destinataire'],['ht','Montant HT'],['vatAmount','Montant TVA'],['ttc','Montant TTC'],['discount','Remise'],['state','État FP']])add(label,row[key],'—','info','Pas de correspondance native vérifiée. Examiner les champs supplémentaires ou les acquisitions.');
    return rows;
  }
  function addFieldComparison(row,m,p){
    if(!m.koha)return;
    if(!row._koha){const section=make('details');section.open=true;section.append(make('summary','Autres champs : FP / Koha'));
    const table=make('table');table.className='table pmkfp-comparison';const header=make('tr');for(const v of ['Champ','France Publications','Koha'])header.append(make('th',v));table.append(header);
    for(const field of comparisonFields(row,m.koha)){const tr=make('tr');tr.className='pmkfp-compare-'+field.kind;tr.append(make('th',field.label),make('td',field.fp),make('td',field.koha));table.append(tr);}section.append(table);p.append(section);}
    const inventory=make('details');inventory.append(make('summary','Tous les champs Koha chargés'));
    const dl=make('dl');for(const key of reportFields)dl.append(make('dt',key),make('dd',Object.hasOwn(m.koha,key)?String(m.koha[key]??''):'Non chargé (rapport à actualiser)'));inventory.append(dl);p.append(inventory);
  }

  function visibleData(){return filteredRows();}
  function selectControl(label,values,value,fn){const l=make('label',label+' '),s=make('select');for(const [v,t]of values){const o=make('option',t);o.value=v;s.append(o);}s.value=value;s.onchange=e=>fn(e.target.value);l.append(s);return l;}
  function buildFilters(){
    const previousField=$('[data-fp-common-field]',host)?.value,previousValue=$('[data-fp-common-value]',host)?.value;
    const box=$('[data-fp-filters]',host);box.replaceChildren();
    box.append(selectControl('Source',[['koha','Abonnements Koha ouverts'],['fp','France Publications']],filters.source,v=>{filters.source=v;page=0;renderTable();}));
    const sites=[['','Toutes les médiathèques'],['__unknown','Site non reconnu'],...libraries.map(l=>[String(l.library_id),l.name||l.library_id])];
    box.append(selectControl('Site',sites,filters.site,v=>{filters.site=v;page=0;renderTable();}));
    box.append(selectControl('Comparaison',[['','Tous les états'],['different','Dates différentes'],['historical','Ancien cycle reconnu'],['renewal','Renouvellement à vérifier'],['period','Période à vérifier'],['partial','Début non lu'],['unmatched','Correspondance à vérifier'],['same','Concordants']],filters.comparison,v=>{filters.comparison=v;page=0;renderTable();}));
    box.append(selectControl('Période',[['','Toutes'],['current','En cours'],['soon','Fin dans les 90 jours'],['expired','Échus'],['future','À venir']],filters.life,v=>{filters.life=v;page=0;renderTable();}));
    if(view==='site-list'){box.append(button('Exporter la liste en PDF',printSiteListPDF,'btn btn-primary btn-sm'));const label=make('label','Abonnés à la date du '),inp=make('input');inp.type='date';inp.value=filters.asOf;inp.onchange=()=>{filters.asOf=inp.value;page=0;renderTable();};label.append(inp);box.append(label);}
    if(view==='renewals')box.append(selectControl('Échéances',[['30','30 jours'],['60','60 jours'],['90','90 jours'],['180','180 jours'],['365','365 jours']],String(filters.renewalDays),v=>{filters.renewalDays=Number(v);page=0;renderTable();}));
    const bulk=$('[data-fp-bulk]',host);bulk.replaceChildren();const count=make('span');count.dataset.fpSelection='1';bulk.append(count);
    bulk.append(button('Préparer depuis FP',()=>stageSelection('fp')),button('Sélectionner tous les résultats filtrés',()=>{for(const row of visibleData())selectedRows.set(rowKey(row),row);renderTable();}),button('Effacer la sélection',()=>{selectedRows.clear();renderTable();}));
    const fields=selectControl('Champ commun',EDIT_FIELDS.map(f=>[f.key,f.label]),'grace_period',()=>{});fields.querySelector('select').dataset.fpCommonField='1';
    const value=make('input');value.dataset.fpCommonValue='1';value.type='text';value.placeholder='Nouvelle valeur (dates : AAAA-MM-JJ)';value.setAttribute('aria-label','Nouvelle valeur commune');
    bulk.append(fields,value,button('Préparer ce champ pour la sélection',()=>stageSelection('common')));if(previousField)fields.querySelector('select').value=previousField;if(previousValue!==undefined)value.value=previousValue;
  }
  function printSiteListPDF(){
    if(view!=='site-list'){message('Sélectionnez la vue Titres par site / date pour exporter le PDF.',true);return;}
    const entries=filteredRows(),at=iso(filters.asOf)||localDay();
    const paper=window.open('','_blank','noopener=no,width=1040,height=780');
    if(!paper){message('Autorisez les fenêtres pour créer le PDF.',true);return;}
    const d=paper.document;d.open();d.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Abonnements par site - '+at+'</title><style>@page{size:A4 landscape;margin:14mm}body{font:11px/1.4 Arial,sans-serif;color:#18283d}header{border-bottom:2px solid #146b80;margin-bottom:16px;padding-bottom:9px}h1{font-size:20px;margin:0}p{margin:3px 0 12px;color:#52657a}h2{font-size:15px;background:#edf4f7;padding:6px 10px;margin:18px 0 0;break-after:avoid}table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{padding:6px;text-align:left;vertical-align:top;border-bottom:1px solid #d9e1e9}th{background:#f3f6fa}tr{break-inside:avoid}td:nth-child(2),td:nth-child(3){white-space:nowrap}footer{margin-top:16px;font-size:9px;color:#68768a}.toolbar{margin-bottom:12px}@media print{.toolbar{display:none}body{margin:0}}</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div><header><h1>Titres de périodiques par médiathèque</h1><p>Situation au '+at.split('-').reverse().join('/')+' · '+entries.length+' abonnement(s) Koha · Source : rapport '+cfg.reportId+'</p></header>');
    const groups=new Map();for(const r of entries){const code=rowSite(r)||'Non identifié';if(!groups.has(code))groups.set(code,[]);groups.get(code).push(r);}
    const cell=(tag,text,parent)=>{const e=d.createElement(tag);e.textContent=String(text??'');parent.append(e);return e;};
    for(const [code,rows] of [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'fr'))){const name=libraries.find(l=>String(l.library_id)===code)?.name||code;cell('h2',name+' ('+code+') — '+rows.length+' titre(s)',d.body);const t=d.createElement('table'),thead=d.createElement('thead'),tr=d.createElement('tr');for(const h of ['Titre','ISSN','Début Koha','Fin Koha','Référence'])cell('th',h,tr);thead.append(tr);t.append(thead);const tb=d.createElement('tbody');for(const r of rows){const line=d.createElement('tr');for(const v of [r.title,r.issn||'—',displayDate(r.startDate),displayDate(r.endDate),r._koha?.internal_notes||'—'])cell('td',v,line);tb.append(line);}t.append(tb);d.body.append(t);}
    if(!entries.length)cell('p','Aucun abonnement correspondant aux critères.',d.body);
    cell('footer','PimpMyKoha · Liste établie à partir des abonnements Koha ouverts, y compris ceux dont la période a expiré si la date sélectionnée les couvre.',d.body);
    d.write('</body></html>');d.close();paper.focus();
  }
  // Gestion annuelle : génération à partir du rapport 5262 complet, jamais de la page DataTables visible.
  function annualTools(anchor){
    if(!anchor||document.getElementById('pmkfp-annual-tools'))return;
    const holder=make('span');holder.id='pmkfp-annual-tools';holder.style.cssText='display:inline-flex;align-items:center;gap:6px;margin-left:9px;vertical-align:middle';
    const toggle=button('Listes et renouvellements ▾',()=>{pane.hidden=!pane.hidden;},'btn btn-default btn-sm');toggle.setAttribute('aria-expanded','false');
    const pane=make('div');pane.hidden=true;pane.style.cssText='position:absolute;z-index:1100;background:#fff;border:1px solid #d6dee5;border-radius:9px;box-shadow:0 9px 32px #0002;padding:15px;width:min(520px,94vw);max-width:94vw;margin-top:6px';
    const title=make('strong','Préparer les abonnements par site');const description=make('p','Listes issues des abonnements Koha ouverts (rapport 5262), y compris ceux dont l’échéance est dépassée. Aucun renouvellement ni achat n’est déclenché.');description.style.cssText='font-size:12px;color:#536878;margin:7px 0';
    const site=make('select');site.className='form-control input-sm';site.style.maxWidth='220px';
    const horizon=make('select');horizon.className='form-control input-sm';for(const [value,label] of [['90','90 jours'],['180','6 mois'],['365','12 mois']]){const opt=make('option',label);opt.value=value;horizon.append(opt);}horizon.value='180';
    const asOf=make('input');asOf.type='date';asOf.value=localDay();asOf.className='form-control input-sm';asOf.style.maxWidth='170px';
    const control=(name,input)=>{const l=make('label');l.style.cssText='font-size:12px;display:inline-flex;flex-direction:column;gap:4px;margin:6px 10px 6px 0';l.append(make('span',name),input);return l;};
    const msg=make('small','');msg.style.display='block';msg.style.color='#566';
    function refreshSites(){const prev=site.value;site.replaceChildren();const all=make('option','Tous les sites');all.value='';site.append(all);const codes=[...new Set(koha.map(k=>String(k.library_id||'')).filter(Boolean))].sort();for(const code of codes){const opt=make('option',(libraries.find(l=>l.library_id===code)?.name||code)+' ('+code+')');opt.value=code;site.append(opt);}site.value=prev;msg.textContent=kohaLoaded?koha.length+' abonnements Koha chargés · filtrage sur toutes les lignes, pas la pagination.':'Chargement des abonnements Koha en cours…';}
    function publish(kind){
      if(!kohaLoaded){message('Les abonnements Koha ne sont pas encore chargés. Réessayez après le chargement automatique.',true);return;}
      const date=canonicalDate(asOf.value),base=date?new Date(date+'T12:00:00'):null;if(!base){message('Choisissez une date de référence valide.',true);return;}
      const cutoff=new Date(base);cutoff.setDate(cutoff.getDate()+Number(horizon.value));const end=dateOnly(cutoff);
      const selected=koha.filter(k=>Number(k.closed)!==1&&(!site.value||String(k.library_id)===site.value)).filter(k=>{
        const start=iso(k.start_date),finish=iso(k.end_date);if(!finish)return false;
        return kind==='renewal'?finish<=end:(!start||start<=date)&&finish>=date;
      }).sort((a,b)=>String(a.library_id).localeCompare(String(b.library_id),'fr')||(kind==='renewal'?String(a.end_date).localeCompare(String(b.end_date)):String(a.title).localeCompare(String(b.title),'fr')));
      const popup=window.open('','_blank','width=1000,height=780');if(!popup){message('Autorisez la fenêtre d’impression pour enregistrer le PDF.',true);return;}
      const d=popup.document;d.open();d.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>PMK - '+(kind==='renewal'?'Renouvellements':'Titres en cours')+'</title><style>@page{size:A4 landscape;margin:13mm}body{font:11px/1.5 Arial,sans-serif;color:#1d2c3b}h1{font-size:21px;margin-bottom:3px}header{border-bottom:2px solid #246b79;margin-bottom:17px}h2{font-size:15px;background:#eef4f7;padding:7px;margin-top:22px;break-after:avoid}table{width:100%;border-collapse:collapse}th{background:#edf1f5}th,td{border-bottom:1px solid #dbe2e7;text-align:left;padding:6px}tr{break-inside:avoid}.actions{padding:12px;background:#eee}@media print{.actions{display:none}}footer{margin-top:20px;font-size:10px;color:#60717d}</style></head><body><div class="actions"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>');
      const cell=(tag,val,parent)=>{const x=d.createElement(tag);x.textContent=String(val??'');parent.append(x);return x;};
      const header=d.createElement('header');cell('h1',kind==='renewal'?'Préparation des renouvellements':'Titres de périodiques par médiathèque',header);cell('p',kind==='renewal'?'Échéances jusqu’au '+displayDate(end)+' (y compris les abonnements échus)':'Abonnements en cours au '+displayDate(date),header);cell('p',selected.length+' abonnement(s) · Données Koha · Document de préparation, sans commande fournisseur',header);d.body.append(header);
      const grouped=new Map();for(const k of selected){const key=String(k.library_id||'Site inconnu');if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(k);}
      for(const [code,items] of grouped){cell('h2',(libraries.find(l=>l.library_id===code)?.name||code)+' — '+items.length+' abonnement(s)',d.body);const table=d.createElement('table'),head=d.createElement('thead'),tr=d.createElement('tr');const columns=kind==='renewal'?['Titre','ISSN','Fin Koha','Référence DRG','Fin FP','Contrôle / préparation']:['Titre','ISSN','Début Koha','Fin Koha','Référence DRG'];for(const c of columns)cell('th',c,tr);head.append(tr);table.append(head);const body=d.createElement('tbody');for(const k of items){const matchInfo=match({_koha:k}), fp=matchInfo?.fp,refs=kohaCommercialRefs(k);const values=kind==='renewal'?[k.title,k.issn||'—',displayDate(k.end_date),refs.join(' / ')||'—',fp?.endDate?displayDate(fp.endDate):'Non vérifiée',fp?.endDate&&iso(fp.endDate)!==iso(k.end_date)?'Échéance différente — vérifier':'À décider / renouveler']: [k.title,k.issn||'—',displayDate(k.start_date),displayDate(k.end_date),refs.join(' / ')||'—'];const line=d.createElement('tr');for(const v of values)cell('td',v,line);body.append(line);}table.append(body);d.body.append(table);}
      if(!selected.length)cell('p','Aucun abonnement correspondant aux critères.',d.body);cell('footer','PimpMyKoha · '+new Date().toLocaleString('fr-FR')+' · Vérifier la situation commerciale avant renouvellement',d.body);d.write('</body></html>');d.close();popup.focus();
    }
    pane.append(title,description,control('Site',site),control('Situation au',asOf),control('Renouvellements sous',horizon),make('div'));
    pane.append(button('PDF · Abonnements en cours',()=>publish('current'),'btn btn-default btn-sm'),make('span',' '),button('PDF · Renouvellements à préparer',()=>publish('renewal'),'btn btn-primary btn-sm'),msg);
    holder.append(toggle,pane);anchor.append(holder);toggle.onclick=()=>{pane.hidden=!pane.hidden;toggle.setAttribute('aria-expanded',String(!pane.hidden));if(!pane.hidden)refreshSites();};
    document.addEventListener('click',e=>{if(!holder.contains(e.target)){pane.hidden=true;toggle.setAttribute('aria-expanded','false');}});
  }
  function exportFilteredCsv(){
    const rows=visibleData(),fields=['Titre','Référence FP','ISSN','Bibliothèque','Fin FP','État','Diagnostic','ID abonnement Koha','Début Koha','Fin Koha'];
    const escapeCsv=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
    const content=[fields,...rows.map(r=>{const m=r.ref?match(r):null;return [r.title||r.TitreLibelle||r.Titre||'',r.ref||r.RefAbo||'',r.issn||r.ISSN||'',rowSite(r),r.endDate||'',m?.kind||'',m?.label||'',m?.koha?.subscription_id||'',m?.koha?.start_date||'',m?.koha?.end_date||''];})].map(row=>row.map(escapeCsv).join(';')).join('\r\n');
    download('PMK-FP-'+view+'-'+localDay()+'.csv','\uFEFF'+content,'text/csv;charset=utf-8');
  }
  const REQUIRED_SUBSCRIPTION_FIELDS=[
    ['title','Titre'],['biblio_id','Notice'],['library_id','Bibliothèque'],['vendor_id','Fournisseur'],
    ['start_date','Début Koha'],['end_date','Fin Koha'],['notes','Note publique'],['internal_notes','Note interne'],
    ['callnumber','Cote'],['frequency_id','Périodicité'],['number_pattern_id','Modèle de numérotation'],
    ['itemtype','Type de document'],['grace_period','Période de grâce'],['serialsadditems','Création des exemplaires']
  ];
  // A zéro, "0" et false sont des valeurs valides. Les champs contextuels
  // (localisation, collection, notification, budget, cout...) sont listés
  // à titre indicatif : ils ne sont pas obligatoires pour tous les sites.
  const OPTIONAL_SUBSCRIPTION_FIELDS=[
    ['publisher','Éditeur notice'],['librarian','Bibliothécaire'],['location','Localisation'],
    ['ccode','Collection'],['aqbudgetid','Budget'],['cost','Coût'],
    ['letter','Notification'],['distributedto','Distribution'],['firstacquidate','Premier fascicule']
  ];
  function blankKoha(v){return v===null||v===undefined||String(v).trim()==='';}
  function alertEnabled(key){
    const raw=String(cfg.alertFields||'').trim();if(!raw)return true;
    const selected=new Set(raw.split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean));
    return selected.has(key)||selected.has('*');
  }
  function periodicityClass(value){
    const v=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
    if(!v)return '';
    if(/nepassuppr|ne pas suppr|inconnu|aucune indication/.test(v))return 'invalid';
    if(/quotidien|journalier|\b1\s*\/?\s*jour\b|7\s*\/?\s*semaine/.test(v))return 'daily';
    if(/bi.?hebdomadaire|2\s*\/?\s*semaine|deux fois par semaine/.test(v))return 'twiceweek';
    if(/hebdomadaire|1\s*\/?\s*semaine|par semaine|52\s*\/?\s*an/.test(v))return 'weekly';
    if(/bimensuel|2\s*\/?\s*mois|24\s*\/?\s*an/.test(v))return 'twicemonth';
    if(/mensuel|1\s*\/?\s*mois|12\s*\/?\s*an/.test(v))return 'monthly';
    if(/bimestriel|1\s*\/?\s*2\s*mois|6\s*\/?\s*an/.test(v))return 'bimonthly';
    if(/trimestriel|1\s*\/?\s*trimestre|4\s*\/?\s*an/.test(v))return 'quarterly';
    if(/quadrimestriel|3\s*\/?\s*an/.test(v))return 'thirdly';
    if(/semestriel|2\s*\/?\s*an|biannuel/.test(v))return 'semiannual';
    if(/annuel|1\s*\/?\s*an/.test(v))return 'annual';
    return '';
  }
  function compareCadence(a,b){
    if(blankKoha(a)||blankKoha(b))return {kind:'unknown'};
    const x=periodicityClass(a),y=periodicityClass(b);
    if(y==='invalid')return {kind:'invalid'};
    if(x&&y)return {kind:x===y?'same':'mismatch'};
    return {kind:words(a)===words(b)?'same':'unverifiable'};
  }
  function kohaProblems(k,m){
    if(!k)return [{label:'🟠 Abonnement Koha non identifié'}];
    const result=[],today=localDay(),end=iso(k.end_date);
    if(!end&&alertEnabled('end_date'))result.push({label:'❌ Fin Koha absente',field:'end_date'});
    else if(alertEnabled('expired')&&end<today)result.push({label:'❌ Abonnement échu',field:'end_date'});
    else if(alertEnabled('ending_soon')&&daysBetween(today,end)<=90)result.push({label:'🟠 Échéance proche',field:'end_date'});
    for(const [key,label]of REQUIRED_SUBSCRIPTION_FIELDS)if(key!=='end_date'&&alertEnabled(key)&&blankKoha(k[key]))result.push({label:'❌ '+label+' manquant',field:key});
    for(const [key,label]of OPTIONAL_SUBSCRIPTION_FIELDS)if(alertEnabled(key)&&blankKoha(k[key]))result.push({label:'◐ '+label+' non renseigné',field:key,optional:true});
    const cadence=compareCadence(k.frequency_label,k.biblio_periodicity);
    if(alertEnabled('periodicity_mismatch')&&cadence.kind==='mismatch')result.push({label:'⚠ Périodicité Koha / 326$a différente',field:'frequency_id'});
    if(alertEnabled('periodicity_mismatch')&&cadence.kind==='invalid')result.push({label:'⚠ 326$a à corriger : '+String(k.biblio_periodicity).slice(0,30),field:'biblio_periodicity'});
    // En l'absence de la colonne SQL, ne pas générer de faux avertissement.
    if(alertEnabled('fp_end_mismatch')&&m?.fp&&end&&iso(m.fp.endDate)&&iso(m.fp.endDate)!==end)result.push({label:'🟠 Échéance FP différente de Koha',field:'end_date'});
    if(!m?.fp&&m?.kind!=='renewal'&&((partial||dataset)?.subscriptions?.length||0)>0&&alertEnabled('fp_unmatched'))result.push({label:'🟠 FP non rapproché',field:'fp_unmatched'});
    const stats=issueActions(k);const count=stats.available?stats.claimable.length:Number(k.issues_claimable_now||0),claimed=stats.available?stats.claimed.length:Number(k.issues_claimed_status||0),late=stats.available?stats.late.length:Number(k.issues_late||0);
    if(alertEnabled('claimable')&&count>0)result.unshift({label:'❌ '+count+' fascicule(s) à examiner',claim:true});
    else if(alertEnabled('late')&&late>0)result.unshift({label:'🟠 '+late+' fascicule(s) en retard',claim:true});
    if(alertEnabled('claimed')&&claimed>0)result.push({label:'◐ '+claimed+' fascicule(s) au statut réclamé',claim:true});
    return result;
  }
  function addMissingKohaFields(k,row,p){
    if(!k)return;
    const issues=kohaProblems(k,{koha:k,fp:match(row).fp});
    const section=make('section');section.dataset.pmkArea='gestion';
    section.append(make('h5','Champs manquants ou à contrôler ('+issues.length+')'));
    if(!issues.length)section.append(make('p','Aucune anomalie détectée sur les contrôles configurés.'));
    for(const issue of issues){const line=make('div');line.className='pmkfp-inline-field';line.append(make('span',issue.label));
      const f=EDIT_FIELDS.find(x=>x.key===issue.field);
      if(f){if(cfg.allowWrites)addInline(line,row,f);else line.append(make('small','Édition disponible après activation des écritures dans les réglages.'));}
      section.append(line);
    }
    p.append(section);displaySubscriptionExtras(k,section);
  }
  const issueColumns=['subscription_id','biblio_id','title','library_id','internal_notes','subscription_end_date','grace_period','serial_id','issue_number','planned_date','publication_date','issue_status_code','issue_status_label','claim_eligible_from','claimable_now','days_since_planned','last_claim_date','claims_count','issue_notes'];
  const issueCache=new Map();
  let issueRowsPromise=null;
  async function readIssueReport(){
    if(!cfg.issuesReportId)throw new Error('Configurez l’ID du rapport détaillé dans PMK.');
    if(issueRowsPromise)return issueRowsPromise;
    issueRowsPromise=(async()=>{
      const r=await fetch('/cgi-bin/koha/svc/report?id='+encodeURIComponent(cfg.issuesReportId),{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error('Rapport fascicules : HTTP '+r.status);
      const body=await r.json();const rows=Array.isArray(body)?body:Array.isArray(body.rows)?body.rows:Array.isArray(body.data)?body.data:null;
      if(!rows||rows.length>50000)throw new Error('Rapport fascicules : format ou volume non reconnu.');
      issueCache.clear();for(const source of rows){const record=Array.isArray(source)?Object.fromEntries(issueColumns.map((key,i)=>[key,source[i]])):source;
        if(!/^\d+$/.test(String(record.subscription_id||'')))continue;
        const key=String(record.subscription_id);if(!issueCache.has(key))issueCache.set(key,[]);issueCache.get(key).push(record);
      }return issueCache;
    })().catch(e=>{issueRowsPromise=null;throw e;});
    return issueRowsPromise;
  }
  function issueActions(k){
    if(!k)return {claimable:[],late:[],claimed:[],expected:[],missing:[],available:issueRowsPromise!==null};
    const rows=issueCache.get(String(k.subscription_id))||[];
    const result={claimable:[],late:[],claimed:[],expected:[],missing:[],available:issueRowsPromise!==null};
    for(const r of rows){
      const status=Number(r.issue_status_code),past=Number(r.days_since_planned)>0,eligible=String(r.claimable_now)==='1';
      // Attendu (1) n'est JAMAIS une anomalie en tant que tel. Seul le dépassement du délai de grâce est à examiner.
      if(status===1&&!eligible){result.expected.push(r);continue;}
      if(status===7){result.claimed.push(r);continue;}
      if([4,41,42,43,44].includes(status))result.missing.push(r);
      if(eligible)result.claimable.push(r);
      else if(status===3&&past)result.late.push(r);
    }
    return result;
  }
  function addIssueDetails(k,section){
    if(!k)return;
    const area=make('div');area.className='pmkfp-issue-detail';section.append(area);
    const draw=()=>{
      const rows=issueCache.get(String(k.subscription_id))||[],stats=issueActions(k);
      area.replaceChildren();area.append(make('h5','Fascicules Koha · '+rows.length+' suivis'));
      const metrics=make('div');metrics.className='pmkfp-metric-grid';
      for(const [label,val] of [['À examiner',stats.claimable.length],['En retard',stats.late.length],['Déjà réclamés',stats.claimed.length],['Attendus (normal)',stats.expected.length]]){const card=make('div');card.className='pmkfp-metric';card.append(make('strong',String(val)),make('small',label));metrics.append(card);}area.append(metrics);
      if(!rows.length){area.append(make('p','Aucun fascicule ouvert dans le rapport 5263.'));return;}
      const details=make('details');details.open=stats.claimable.length+stats.late.length+stats.missing.length+stats.claimed.length>0;details.append(make('summary','Consulter les fascicules ('+rows.length+')'));
      const wrap=make('div');wrap.className='pmkfp-responsive';const table=make('table');table.className='table table-striped table-condensed';const th=make('tr');for(const col of ['Numéro','Statut','Prévu le','Retard','Réclamations','Diagnostic'])th.append(make('th',col));table.append(th);
      for(const item of rows){const tr=make('tr'),status=Number(item.issue_status_code),eligible=String(item.claimable_now)==='1';for(const val of [item.issue_number||'—',item.issue_status_label||item.issue_status_code||'—',displayDate(item.planned_date),Number(item.days_since_planned)>0?item.days_since_planned+' j':'—',item.claims_count||'0'])tr.append(make('td',String(val)));
      tr.append(make('td',eligible?'À examiner':status===7?'Déjà réclamé':status===1?'Attendu normalement':status===3?'En retard':'À vérifier'));table.append(tr);
      }wrap.append(table);details.append(wrap);area.append(details);
    };
    if(issueRowsPromise){draw();}else {area.append(make('p','Lecture du rapport 5263…'));readIssueReport().then(draw).catch(e=>area.replaceChildren(make('p','Rapport 5263 indisponible : '+e.message)));}
  }
  function addClaimDashboard(k,fp,p){
    const section=make('section');section.dataset.pmkArea='reclamations';section.append(make('h5','Suivi des fascicules et des réclamations'));const pending=matchingFpRecords(fp,'pendingClaims');if(fp) section.append(make('p',pending.length+' réclamation(s) FP encore en attente (référence exacte).'));
    if(k){const stats=issueActions(k);const items=[['Fascicules à examiner',stats.available?stats.claimable.length:k.issues_claimable_now],['En retard',stats.available?stats.late.length:k.issues_late],['Manquants',stats.available?stats.missing.length:k.issues_missing],['Déjà réclamés dans Koha',stats.available?stats.claimed.length:k.issues_claimed_status],['Dernière réclamation Koha',k.latest_claim_date]];
      for(const [label,value]of items){const line=make('p',label+' : '+(value===null||value===undefined?'Non fourni par le rapport 5262':String(value)));section.append(line);}
      section.append(make('small','Les statuts Koha ne prouvent pas qu’une réclamation a été envoyée à FP.'));
    }
    addIssueDetails(k,section);addCrossClaimPreparation(k,fp,section);
    if(fp){const e=relatedEvents(fp);section.append(make('p',e.length+' événement(s) FP trouvé(s) pour cette référence.'));for(const item of e.slice(0,25))section.append(make('p',item.type+' · '+displayDate(item.date)+' · '+(item.text||'')));addClaimDraft(fp,section);}
    else section.append(make('p','Aucun cycle FP rapproché : consulter la recherche globale avant une réclamation FP.'));
    p.append(section);
  }
  // Champs supplémentaires d'abonnement : découverte à partir du formulaire Koha
  // (les identifiants techniques sont définis par chaque installation).
  // Lecture seule tant que leur schéma et la requête d'écriture n'ont pas été validés.
  const SUPPLEMENTARY_LABELS=[
    'Abo en ligne','N° d\u2019abonné','Note gestion abonnement','Note pour gestion retards',
    'Numéro casier','Prix base','Prix fascicule','Réajustement','Réclamation(s)'
  ];
  function extraLabel(text){return String(text||'').replace(/\s*Effacer\s*/gi,' ').replace(/\s*:\s*$/,'').replace(/\s+/g,' ').trim();}
  async function displaySubscriptionExtras(k,section){
    if(!k||!/^\d+$/.test(String(k.subscription_id)))return;
    const area=make('section');area.className='pmkfp-extra-fields';area.append(make('h5','Champs supplémentaires Koha'));
    const stateLine=make('p','Lecture des champs supplémentaires du formulaire Koha…');area.append(stateLine);section.append(area);
    try{
      const html=await kohaRequest(nativeURL(k.subscription_id));
      if(!area.isConnected)return;
      const doc=new DOMParser().parseFromString(html,'text/html');
      const legends=[...doc.querySelectorAll('fieldset')].filter(f=>/champs\s+suppl[eé]mentaires/i.test(f.querySelector('legend')?.textContent||''));
      const controls=[];
      for(const fieldset of legends){
        for(const item of fieldset.querySelectorAll('li')){
          const labelNode=item.querySelector('label,span.label');
          const label=extraLabel(labelNode?.textContent||'');
          if(!label)continue;
          const ctl=[...item.querySelectorAll('input,select,textarea')].find(c=>c.type!=='hidden'&&c.type!=='button'&&c.type!=='submit'&&!c.disabled);
          const value=ctl?.tagName==='SELECT'?ctl.selectedOptions?.[0]?.textContent:ctl?.type==='checkbox'?(ctl.checked?'Oui':'Non'):ctl?.value;
          controls.push({label,value:value??'',name:ctl?.name||'',type:ctl?.tagName||''});
        }
      }
      area.replaceChildren(make('h5','Champs supplémentaires Koha'));
      if(!controls.length){area.append(make('p','Champs non reconnus dans cette page. La structure du formulaire doit être vérifiée avant d’autoriser une édition assistée.'));}
      else {
        const grid=make('div');grid.className='pmkfp-extra-grid';
        for(const field of controls){const card=make('div');card.className='pmkfp-extra-card';card.append(make('strong',field.label),make('span',String(field.value).trim()||'Non renseigné'));grid.append(card);}
        area.append(grid);
      }
      const link=make('a','Modifier les champs supplémentaires dans Koha');link.href=nativeURL(k.subscription_id);link.target='_blank';link.rel='noopener';link.className='btn btn-default btn-sm';area.append(link);
      area.append(make('small','Lecture native uniquement : aucune écriture automatique avant validation des noms techniques, des valeurs autorisées et de la sauvegarde Koha.'));
    }catch(e){if(area.isConnected)stateLine.textContent='Lecture impossible : '+e.message;}
  }
  function addCrossClaimPreparation(k,fp,section){
    const box=make('section');box.className='pmkfp-cross-claim';box.append(make('h5','Transmission et suivi croisé'));
    box.append(make('p','Statuts séparés : dépôt France Publications / enregistrement du suivi dans Koha. Aucune transmission n’est simulée.'));
    const steps=make('ol');for(const caption of ['Examiner les fascicules problématiques dans le rapport 5263.','Déposer la réclamation dans France Publications et attendre sa confirmation.','Reporter ou vérifier le suivi dans Koha, sans réclamer deux fois.'])steps.append(make('li',caption));box.append(steps);
    const links=make('div');links.className='pmkfp-actions';
    if(fp)links.append(fpLink('Déposer dans France Publications','/index.php?route=reclamations/depot'));
    if(k){const a=make('a','Suivre dans Koha');a.href='/cgi-bin/koha/serials/subscription-detail.pl?subscriptionid='+encodeURIComponent(k.subscription_id);a.target='_blank';a.rel='noopener';links.append(a);}
    box.append(links);section.append(box);
  }
  function fpPlain(v){return String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
  function matchingFpRecords(fp,key){
    const data=partial||dataset;
    if(!fp?.ref||!data)return [];
    // Identifiant exact seulement; ni titre semblable ni famille DRG ne suffisent.
    return (data[key]||[]).filter(x=>String(x.RefAbo||'').trim()===String(fp.ref).trim());
  }
  function addCommercialDashboard(fp,p){
    const data=partial||dataset;
    const section=make('section');section.dataset.pmkArea='fp';
    section.append(make('h5','Renouvellements et destinataire'));
    if(!fp?.ref){section.append(make('p','Abonnement FP non identifié : comparaison commerciale indisponible.'));p.append(section);return;}
    const renewals=matchingFpRecords(fp,'renewals');
    section.append(make('p',renewals.length+' renouvellement(s) FP pour la référence exacte.'));
    for(const x of renewals){const e=make('article');e.className='pmkfp-event';e.append(make('strong',fpPlain(x.LibelleEtat||x.Etat||'État non fourni')),make('small',' · Échéance : '+displayDate(x.abt_datefin)),make('p','Montant TTC : '+fpPlain(x.TTC||'—')));section.append(e);}
    const recipient=(data?.recipients||[]).find(x=>String(x.des_code||'')===String(fp.destinationCode||''));
    if(recipient)section.append(make('p','Destinataire FP : '+fpPlain(recipient.Destinataire||recipient.des_raison||recipient.des_nom)+' · code '+fpPlain(recipient.des_code)));
    else section.append(make('small','Correspondance destinataire non confirmée.'));
    p.append(section);
  }
  function addPendingClaims(fp,p){
    const section=make('section');section.dataset.pmkArea='reclamations';
    section.append(make('h5','Réclamations FP en attente'));
    const list=matchingFpRecords(fp,'pendingClaims');
    section.append(make('p',list.length+' réclamation(s) en attente pour cette référence FP.'));
    for(const x of list){const card=make('article');card.className='pmkfp-event';card.append(make('strong','Réclamation · '+fpPlain(x.Date||'Date non fournie')),make('p',fpPlain(x.TitreLibelle||'')),make('small','Dernière réponse : '+fpPlain(x.DateDerniereReponse||'—')));section.append(card);}
    p.append(section);
  }
  function addInvoiceDashboard(fp,p){
    const section=make('section');section.dataset.pmkArea='fp';section.append(make('h5','Factures et informations France Publications'));
    section.append(fpLink('Ouvrir les factures FP','/index.php?route=factures/liste'));
    if(!fp){section.append(make('p','Aucun abonnement FP rapproché.'));p.append(section);return;}
    section.append(make('p','Référence FP : '+fp.ref+' · Échéance : '+displayDate(fp.endDate)));
    if(!fp.detailRead){section.append(make('p','L’export global ne fournit pas les numéros de facture. Consulter la fiche FP liée pour vérifier les factures.'));const open=button('Charger la fiche FP associée',()=>requestDetail(fp,open),'btn btn-default btn-sm');section.append(open);}
    const ids=invoiceNumbers(fp);for(const id of ids)section.append(fpLink('Facture FP '+id,'/ajx/getFacture.php?nFact='+encodeURIComponent(id)));
    if(!ids.length&&fp.detailRead)section.append(make('p','Aucune facture identifiable dans la fiche lue.'));
    const invoiceRows=(partial||dataset)?.invoices||[];
    const order=String(fp.purchaseOrder||'').trim();
    const linked=order?invoiceRows.filter(x=>String(x.fac_boncom||'').trim()===order):[];
    section.append(make('h5','Factures du relevé FP'));
    section.append(make('p',order?linked.length+' facture(s) portant le bon de commande '+order+'. Vérifiez le rattachement si plusieurs abonnements partagent ce bon.':'Aucun bon de commande FP pour relier une facture avec certitude.'));
    for(const x of linked){const line=make('article');line.className='pmkfp-event';line.append(make('strong','Facture '+fpPlain(x.totfac_numero||'—')),make('small',' · '+fpPlain(x.totfac_date||'')+' · TTC '+fpPlain(x.TotalTTC||'—')));const n=String(x.totfac_numero||'').trim();if(/^\d{1,14}$/.test(n))line.append(fpLink('Consulter la facture','/ajx/getFacture.php?nFact='+encodeURIComponent(n)));section.append(line);}
    if(!linked.length)section.append(make('small','Les factures globales ne portent pas nécessairement de référence DRG : aucun rapprochement par simple titre.'));

    p.append(section);
  }
  function renderTable(){
    if(!host)return;const target=$('[data-fp-table]',host);target.replaceChildren();const rows=visibleData(),data=partial||dataset;
    const summary=$('[data-fp-summary]',host);summary.textContent=`${data?.subscriptions?.length||0} FP recensés · ${kohaLoaded?koha.length+' Koha ouverts':'Koha non chargé'} · 5263 : ${issueRowsPromise?'chargé':'non chargé'} · ${data?.claims?.length||0} réclamations · ${data?.replies?.length||0} réponses${data&&!data.complete?' · lecture incomplète':''}`;
    const count=$('[data-fp-selection]',host);if(count)count.textContent=selectedRows.size+' abonnement(s) sélectionné(s)';
    const subs=['subscriptions','review','renewals','site-list'].includes(view);$('[data-fp-bulk-wrapper]',host).hidden=!subs;$('[data-fp-bulk-title]',host).textContent='Corrections sur la sélection · '+selectedRows.size+' abonnement(s)';comparisonOverview();
    const cols=subs?[['_issues','Points à traiter'],['title','Titre / référence'],['destination','Médiathèque'],...(filters.source==='koha'?[['startDate','Début Koha']]:[]),['endDate',filters.source==='koha'?'Fin Koha':'Fin FP'],...(view==='renewals'?[['_renewal','Échéance / situation']]:[]),['_side_by_side','Contrôle FP'],['_claims','Réclamations']]:view==='claims'?[['recla_date','Date'],['TitreLibelle','Titre'],['RefAbo','Abonnement'],['Destinataire','Destinataire'],['nbReponses','Réponses']]:[['repons_date','Date'],['Titre','Titre'],['RefAbo','Abonnement'],['CodeDestinataire','Destinataire'],['Reponse','Réponse']];
    page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(rows.length/50)-1)));const current=rows.slice(page*50,(page+1)*50);
    const table=make('table');table.className='table table-striped table-condensed';const thead=make('thead'),head=make('tr');
    if(subs){const th=make('th'),all=make('input');all.type='checkbox';all.setAttribute('aria-label','Sélectionner cette page');all.checked=current.length>0&&current.every(r=>selectedRows.has(rowKey(r)));all.onchange=()=>{for(const r of current)if(all.checked)selectedRows.set(rowKey(r),r);else selectedRows.delete(rowKey(r));renderTable();};th.append(all);head.append(th);}
    for(const [,label]of cols)head.append(make('th',label));head.append(make('th','Actions'));thead.append(head);table.append(thead);const body=make('tbody');
    for(const r of current){const tr=make('tr'),m=subs?match(r):null;tr.className=(subs?'pmkfp-row-'+m.kind:'')+(selectedRows.has(rowKey(r))?' pmkfp-selected':'');if(subs){const td=make('td'),check=make('input');check.type='checkbox';check.setAttribute('aria-label','Sélectionner '+r.title);check.checked=selectedRows.has(rowKey(r));check.onchange=()=>{if(check.checked)selectedRows.set(rowKey(r),r);else selectedRows.delete(rowKey(r));renderTable();};td.append(check);tr.append(td);}
      for(const [key]of cols){
        if(subs&&(key==='endDate'||(key==='startDate'&&filters.source==='koha'))){tr.append(dateCell(r,key,m));continue;}
        const c=make('td');if(key==='_issues'){
          const k=m?.koha,issues=kohaProblems(k,m);
          if(!issues.length)c.append(make('span','✓ RAS'));
          else {for(const item of issues.slice(0,4))c.append(make('div',item.label));if(issues.length>4)c.append(make('small','+'+(issues.length-4)+' autre(s) · Gérer'));}
        }else if(key==='_side_by_side'){if(m?.koha){appendCompactFpStatus(c,m.koha,m,{showUnknown:true});}else{const n=make('span',m?.label||'— FP non rapproché');n.title='Aucun abonnement Koha confirmé pour cette ligne';c.append(n);}}
        else if(key==='_claims'){const k=m?.koha,fp=m?.fp||(!r._koha?r:null),stats=issueActions(k),n=stats.available?stats.claimable.length:Number(k?.issues_claimable_now||0),late=stats.available?stats.late.length:Number(k?.issues_late||0),events=fp?relatedEvents(fp):[];c.append(make('strong',n?n+' à examiner':late?late+' retard(s)':'Aucun retard détecté'));if(events.length)c.append(make('small',events.filter(x=>x.type==='Réclamation').length+' réclamation(s) FP · '+events.filter(x=>x.type==='Réponse').length+' réponse(s)'));c.append(button('Gérer',()=>{showDetails(r);const b=Array.from(host.querySelectorAll('.pmkfp-tabs button')).find(x=>x.textContent==='Réclamations');b?.click();},'btn btn-default btn-xs'));}
        else if(key==='_renewal'){const today=localDay(),end=iso(r._koha?.end_date||r.endDate),kohaEnd=iso(m?.koha?.end_date);const days=end?daysBetween(today,end):null;c.append(make('strong',days===null?'Date absente':days<0?'Échue depuis '+Math.abs(days)+' j':days===0?'Échéance aujourd’hui':'Dans '+days+' j'));if(kohaEnd)c.append(make('small','Fin Koha : '+displayDate(kohaEnd)));if(m?.kind==='covered')c.append(make('small','Période FP couverte dans Koha'));else if(m?.kind==='different')c.append(make('small','Dates différentes : contrôler avant renouvellement'));}

        else if(subs&&key==='title'){const title=make('span',r.title);title.className='pmkfp-title';c.append(title,make('small',r.ref+' · ISSN '+(r.issn||'non renseigné')));}
        else if(subs&&key==='destination'){const site=rowSite(r),name=libraries.find(l=>String(l.library_id)===site)?.name;c.append(make('strong',name||site||'Site à vérifier'));const address=make('small',r.destination||'Destinataire non renseigné');c.append(address);}
        else c.textContent=String(r[key]??'—');tr.append(c);
      }
      const td=make('td'),actions=make('div');actions.className='pmkfp-row-actions';const k=m?.koha;if(k){for(const [label,url]of [['Notice','/cgi-bin/koha/catalogue/detail.pl?biblionumber='+encodeURIComponent(k.biblio_id)],['Abonnement','/cgi-bin/koha/serials/subscription-detail.pl?subscriptionid='+encodeURIComponent(k.subscription_id)],['Collections','/cgi-bin/koha/serials/serials-collection.pl?subscriptionid='+encodeURIComponent(k.subscription_id)]]){const a=make('a',label);a.href=url;a.target='_blank';a.rel='noopener';a.className='btn btn-default btn-xs';actions.append(a);}}actions.append(button('Gérer',()=>showDetails(r),'btn btn-primary btn-xs'));td.append(actions);tr.append(td);body.append(tr);}

    table.append(body);target.append(table);if(!rows.length)target.append(make('p','Aucun résultat pour ces filtres. Chargez Koha ou France Publications et ajustez les filtres.'));
    const nav=make('div');nav.className='pmkfp-actions';const prev=button('Précédent',()=>{page--;renderTable();}),next=button('Suivant',()=>{page++;renderTable();});prev.disabled=page===0;next.disabled=(page+1)*50>=rows.length;nav.append(prev,make('span',`${rows.length} résultat(s) · page ${page+1}/${Math.max(1,Math.ceil(rows.length/50))}`),next);target.append(nav);
    const errors=$('[data-fp-errors]',host);errors.replaceChildren();if(data?.errors?.length){errors.append(make('strong','Récupération incomplète :'));for(const e of data.errors.slice(0,30))errors.append(make('p',`${e.stage||''} ${e.ref||e.code||''} : ${e.message||''}`));}
    const scopeEl=$('[data-fp-scope]',host);scopeEl.textContent=data?`Périmètre FP : ${data.scope.from||'?'} → ${data.scope.to||'?'} · expirés exclus · fiches complètes à la demande`:'';
    renderQueueControls();
  }
  async function loadKoha(){
    if(kohaPromise)return kohaPromise;
    kohaPromise=loadKohaInternal().finally(()=>{kohaPromise=null;});return kohaPromise;
  }
  async function loadKohaInternal(){
    if(preparing||applying){message('Attendez la fin du traitement Koha.');return;}message('Lecture des abonnements et des bibliothèques Koha…');
    const result=await Promise.allSettled([readReport(),readLibraries(),readIssueReport()]);
    if(result[0].status==='fulfilled'){koha=result[0].value.filter(k=>!['1','true','yes'].includes(String(k.closed??'').trim().toLowerCase()));kohaLoaded=true;}if(result[1].status==='fulfilled')libraries=result[1].value;
    if(result[0].status==='fulfilled'&&result[1].status==='fulfilled'&&result[2].status==='fulfilled')saveKohaCache();
    buildFilters();renderTable();nativeRefresh();updateCacheNotice();const errors=result.filter(r=>r.status==='rejected').map(r=>r.reason.message);message((kohaLoaded?koha.length+' abonnements Koha · ':'')+libraries.length+' bibliothèques. '+errors.join(' '),!!errors.length);
  }
  function startCollect(){try{if(preparing||applying){message('Attendez la fin du traitement Koha.');return;}if(pendingDetails.size){message('Attendez la fin de la lecture de la fiche.');return;}const options=recoveryOptions();if(state!=='connected'){openBridge();return;}if(running)return;if(!relayInstalled&&(!remote||remote.closed)){updateState('unknown','L’onglet France Publications a été fermé.');return;}running=true;partial=null;updateState(state);nativeCompactControls();$('[data-fp-stop]',host).disabled=false;message('Récupération en cours…');send('collect',{options});}catch(e){message(e.message,true);}}
  function setBusy(flag,detail=''){
    const panel=$('[data-fp-loading]',host),bar=$('[data-fp-progress]',host),label=$('[data-fp-loading-text]',host);
    if(panel)panel.hidden=!flag;
    if(label&&detail)label.textContent=detail;
    if(bar){bar.removeAttribute('value');if(!flag)bar.value=100;}
    const b=$('[data-fp-unified]',host);if(b){b.disabled=flag;b.textContent=flag?'Actualisation…':'Actualiser';}
  }
  function unifiedLoad(){
    if(running||unifiedIntent||preparing||applying)return;
    unifiedIntent=true;setBusy(true,'Koha et France Publications : préparation…');
    unifiedKohaDone=false;unifiedFpDone=false;
    loadKoha().catch(e=>message('Koha : '+e.message,true)).finally(()=>{unifiedKohaDone=true;endUnified();});
    if(state==='connected'&&(relayInstalled||(remote&&!remote.closed)))startCollect();
    else openBridge();
  }
  function tryAutoStart(){
    if(running||state!=='connected'||!(relayInstalled||(remote&&!remote.closed)))return;
    if(unifiedIntent){startCollect();return;}
    if(!fpAutoStarted&&fpSnapshotNeedsRefresh()){
      fpAutoStarted=true;
      // Automatic refresh only when cache is stale; no re-fetch on page changes.
      startCollect();
    }
  }
  function endUnified(force=false){if(!unifiedIntent)return;if(!force&&(!unifiedKohaDone||!unifiedFpDone))return;unifiedIntent=false;setBusy(false);}
  async function inlineEdit(row,field,cell){
    const m=match(row);if(!m.koha){message('Correspondance Koha non unique : modification refusée.',true);return;}
    if(!cfg.allowWrites){message('Activez les corrections Koha dans les réglages PMK.',true);return;}
    if(cell.querySelector('input,textarea,select'))return;
    const original=cell.innerHTML;cell.replaceChildren();
    const input=make(field.type==='textarea'?'textarea':field.key==='library_id'?'select':'input');if(input.tagName==='INPUT')input.type=field.type==='date'?'date':field.type==='number'?'number':'text';if(field.key==='library_id')for(const lib of libraries){const o=make('option',lib.name||lib.library_id);o.value=lib.library_id;input.append(o);}input.className='form-control input-sm';input.value=field.type==='date'?iso(m.koha[field.key]):String(m.koha[field.key]??'');
    input.setAttribute('aria-label','Modifier '+field.label+' dans Koha');
    const save=button('✓',async()=>{
      save.disabled=true;try{
        const native=await readNative(m.koha.subscription_id),patch=checkedPatch(native,{[field.key]:input.value});
        if(!Object.keys(patch).length){message('Valeur déjà identique.');renderTable();return;}
        if(!window.confirm('Enregistrer dans Koha : '+field.label+'\n'+(native.fields[field.key]?.value||'—')+' → '+input.value+' ?')){save.disabled=false;return;}
        const body=new URLSearchParams(native.body),f=native.fields[field.key];
        body.set(f.name,f.def.type==='date'?nativeDate(input.value,f.raw):input.value);
        clearKohaCache();await kohaRequest(native.action,body);
        const reread=await readNative(m.koha.subscription_id);
        if(reread.fields[field.key]?.value!==input.value)throw new Error('Enregistrement non confirmé par relecture. Vérifiez Koha avant de réessayer.');
        m.koha[field.key]=input.value;message(field.label+' enregistré et vérifié dans Koha.');renderTable();
      }catch(e){message(e.message,true);save.disabled=false;}
    },'btn btn-primary btn-xs');save.title='Préparer cette correction';
    const cancel=button('×',()=>{cell.innerHTML=original;},'btn btn-default btn-xs');cancel.title='Annuler';
    cell.append(input,save,cancel);input.focus();
    input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();save.click();}if(e.key==='Escape')cancel.click();};
  }
  function addInline(cell,row,field){
    if(!match(row).koha||!cfg.allowWrites)return;
    const b=button('✎',()=>inlineEdit(row,field,cell),'btn btn-default btn-xs');b.title='Corriger '+field.label+' directement dans cette cellule';b.classList.add('pmkfp-pencil');cell.append(b);
  }
  async function importFile(file) {
    if(!file)return;if(preparing||applying||running){message('Attendez la fin du traitement.');return;}try{if(file.size>25000000)throw new Error('Fichier supérieur à 25 Mo.');const data=validateDataset(JSON.parse(await file.text()));if(data.complete){dataset=data;partial=null;}else{partial=data;}message(data.complete?'Fichier importé.':'Fichier incomplet importé : vérifiez les erreurs.',!data.complete);renderTable();}catch(e){message('Import impossible : '+e.message,true);}
  }
  function mount() {
    if(!cfg.enabled||!PAGE_PATHS.includes(location.pathname)||host)return;
    const style=make('style');style.textContent=`#pmkfp-panel{border:1px solid #92ada9;border-radius:6px;background:#fff;margin:14px 0;padding:14px;color:#273642}#pmkfp-panel .pmkfp-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}#pmkfp-panel table{font-size:12px}#pmkfp-panel td{vertical-align:top;max-width:320px;overflow-wrap:anywhere}#pmkfp-panel .pmkfp-scroll{max-height:550px;overflow:auto}#pmkfp-panel .pmkfp-error{color:#a32920;background:#fff0ed;padding:8px}#pmkfp-panel .pmkfp-status{background:#eef6f4;padding:8px}#pmkfp-panel .pmkfp-detail{border-top:1px solid #ccc;padding-top:12px}#pmkfp-panel dt{margin-top:7px}#pmkfp-panel dd{white-space:pre-wrap;overflow-wrap:anywhere}#pmkfp-panel button{cursor:pointer}#pmkfp-panel button:disabled{cursor:default;opacity:.6}`+`#pmkfp-panel .pmkfp-detail{position:fixed;right:0;top:0;width:min(780px,95vw);height:100vh;overflow:auto;z-index:1050;background:white;border-left:2px solid #92ada9;box-shadow:-8px 0 24px #0003;padding:22px;box-sizing:border-box}#pmkfp-panel .pmkfp-detail input,#pmkfp-panel .pmkfp-detail select,#pmkfp-panel .pmkfp-detail textarea{max-width:100%}#pmkfp-panel [data-fp-queue] td{white-space:pre-wrap}#pmkfp-panel [data-fp-bulk] input{min-width:220px}#pmkfp-panel [data-fp-detail]>button,#pmkfp-panel [data-fp-detail]>a{margin:4px}#pmkfp-panel .pmkfp-detail>button:first-child{position:sticky;top:0;float:right}`+`#pmkfp-panel{font-size:14px;line-height:1.45;border-color:#cbd5df;background:#fbfcfe;padding:18px}
#pmkfp-panel .pmkfp-cards{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px}
#pmkfp-panel .pmkfp-card{display:flex;flex:1 1 130px;flex-direction:column;align-items:flex-start;gap:4px;padding:11px 14px;border:1px solid #ccd5df;border-radius:8px;text-align:left}
#pmkfp-panel .pmkfp-card strong{font-size:25px;line-height:1.15}
#pmkfp-panel .pmkfp-card[aria-pressed="true"]{outline:2px solid #29465b;outline-offset:2px}
#pmkfp-panel .pmkfp-badge{display:inline-block;padding:3px 8px;border-radius:6px;font-weight:700;font-size:12px;line-height:1.4;white-space:normal;border:1px solid currentColor}
#pmkfp-panel .pmkfp-tone-same{background:#eaf5ee;color:#21623b}
#pmkfp-panel .pmkfp-tone-different{background:#fff0ed;color:#a33024}
#pmkfp-panel .pmkfp-event{border-left:3px solid #7793ac;padding:10px 14px;margin:12px 0;background:#f4f7fa}
#pmkfp-panel .pmkfp-event p{white-space:pre-wrap}
#pmkfp-panel .pmkfp-detail textarea{margin:8px 0;min-height:80px}
#pmkfp-panel .pmkfp-tone-info{background:#f0f2f5;color:#526170}
#pmkfp-panel .pmkfp-tone-period{background:#fff6dd;color:#795314}
#pmkfp-panel [data-fp-table] .pmkfp-row-period td:first-child{border-left-color:#b08527}
#pmkfp-panel .pmkfp-tone-partial{background:#fff6dd;color:#795314}
#pmkfp-panel .pmkfp-tone-unmatched{background:#eaf2fc;color:#28598b}
#pmkfp-panel .pmkfp-tone-unknown,#pmkfp-panel .pmkfp-tone-koha{background:#f0f2f5;color:#526170}
#pmkfp-panel [data-fp-table] table{font-size:13px;width:100%;border-collapse:separate;border-spacing:0;margin-bottom:0}
#pmkfp-panel [data-fp-table] th{position:sticky;top:0;z-index:1;background:#edf1f5;color:#33475b;padding:10px;border-bottom:2px solid #c6d0da;white-space:nowrap}
#pmkfp-panel [data-fp-table] td{padding:12px 10px;border-bottom:1px solid #e2e8ee;vertical-align:middle;background:white}
#pmkfp-panel [data-fp-table] tr:hover td{background:#f5f8fc}
#pmkfp-panel [data-fp-table] tr.pmkfp-selected td{background:#edf4ff}
#pmkfp-panel [data-fp-table] td:first-child{border-left:4px solid transparent}
#pmkfp-panel [data-fp-table] .pmkfp-row-same td:first-child{border-left-color:#398052}
#pmkfp-panel [data-fp-table] .pmkfp-row-different td:first-child{border-left-color:#bd4c3b}
#pmkfp-panel [data-fp-table] .pmkfp-row-partial td:first-child{border-left-color:#b08527}
#pmkfp-panel [data-fp-table] .pmkfp-row-unmatched td:first-child{border-left-color:#4078ad}
#pmkfp-panel small{display:block;font-size:12px;color:#5d6975;margin-top:4px;font-weight:400}
#pmkfp-panel .pmkfp-date{white-space:nowrap;font-variant-numeric:tabular-nums}
#pmkfp-panel [data-fp-table] td.pmkfp-date-diff{background:#fff1ed;color:#922b22}
#pmkfp-panel td.pmkfp-date-diff small{color:#922b22;font-weight:600}
#pmkfp-panel td.pmkfp-date-same small{color:#286a41}
#pmkfp-panel .pmkfp-title{font-size:14px;font-weight:700;color:#20384b}
#pmkfp-panel .pmkfp-row-actions{display:flex;gap:6px;flex-wrap:wrap;min-width:100px}
#pmkfp-panel .pmkfp-scroll{border:1px solid #dce3ea;border-radius:8px;max-height:65vh}
#pmkfp-panel [data-fp-bulk-wrapper]{padding:9px 12px;border:1px solid #d6dfe7;border-radius:7px;background:#f3f6fa;margin:10px 0}
#pmkfp-panel summary{cursor:pointer;font-weight:600;padding:5px 0}
#pmkfp-panel [data-fp-filters] label{font-size:12px;color:#526170;display:flex;flex-direction:column;gap:3px}
#pmkfp-panel [data-fp-filters] select{font-size:13px;max-width:260px;min-height:32px}
#pmkfp-panel [data-fp-queue]:not(:empty){margin-top:18px;border-top:1px solid #dce3ea;padding-top:10px}
#pmkfp-panel [data-fp-errors]:empty{display:none}
#pmkfp-panel .pmkfp-detail{line-height:1.5}
#pmkfp-panel .pmkfp-detail h4{font-size:20px;margin:12px 0}
#pmkfp-panel .pmkfp-detail details{border-top:1px solid #dce3ea;margin-top:14px;padding:8px 0}
#pmkfp-panel [data-fp-main]>summary{cursor:pointer;padding:8px;font-size:15px}#pmkfp-panel .pmkfp-main-inner{padding:7px}#pmkfp-panel .pmkfp-detail dl{display:grid;grid-template-columns:minmax(125px,35%) 1fr;gap:8px 14px;margin:10px 0}
#pmkfp-panel .pmkfp-detail dt,#pmkfp-panel .pmkfp-detail dd{margin:0;padding:4px 0;border-bottom:1px solid #edf1f5}
#pmkfp-panel .pmkfp-comparison{margin-top:14px;font-size:13px}
#pmkfp-panel .pmkfp-comparison td,#pmkfp-panel .pmkfp-comparison th{padding:9px;vertical-align:middle}
#pmkfp-panel .pmkfp-compare-different{background:#fff0ed}
#pmkfp-panel .pmkfp-compare-same{background:#edf7f0}
#pmkfp-panel .pmkfp-compare-partial{background:#fff7e5}
#pmkfp-panel .pmkfp-tone-covered{color:#186a45}#pmkfp-panel .pmkfp-loading{display:flex;align-items:center;gap:10px;margin:10px 0;padding:12px;background:#eaf4f6;border-radius:7px}#pmkfp-panel .pmkfp-loading[hidden]{display:none}#pmkfp-panel .pmkfp-loading progress{flex:1;min-width:80px}#pmkfp-panel .pmkfp-spinner{width:19px;height:19px;border:3px solid #b4d5d8;border-top-color:#276e78;border-radius:50%;animation:pmkfp-spin .8s linear infinite}@keyframes pmkfp-spin{to{transform:rotate(360deg)}}#pmkfp-panel .pmkfp-pencil{margin-left:6px}#pmkfp-panel .pmkfp-inline-field{padding:3px 0;border-bottom:1px solid #edf1f5;display:flex;align-items:center;justify-content:space-between;gap:6px}#pmkfp-panel .pmkfp-inline-field span{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#pmkfp-panel button:focus-visible,#pmkfp-panel a:focus-visible,#pmkfp-panel summary:focus-visible{outline:3px solid #315a85;outline-offset:3px}
@media(max-width:760px){#pmkfp-panel .pmkfp-card{flex-basis:40%}#pmkfp-panel [data-fp-main]>summary{cursor:pointer;padding:8px;font-size:15px}#pmkfp-panel .pmkfp-main-inner{padding:7px}#pmkfp-panel .pmkfp-detail dl{grid-template-columns:1fr}#pmkfp-panel .pmkfp-detail dd{padding-bottom:10px}#pmkfp-panel [data-fp-table] table{min-width:840px}}
`;document.head.append(style);
    const nativeCSS=make('style');nativeCSS.textContent='#pmk-native-integration .pmk-native-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:14px 0}#pmk-native-integration .pmk-native-pair{padding:10px;background:#f6f9fb;border:1px solid #e0e6ec;border-radius:7px;display:flex;flex-direction:column;gap:3px}#pmk-native-integration .pmk-native-pair span{color:#607080;font-size:12px}#pmk-native-integration .pmk-native-pair strong{font-size:14px}#pmk-native-integration details{margin:12px 0}#pmk-native-integration summary{cursor:pointer;font-weight:600}';nativeCSS.textContent+=' .pmk-native-annotation{display:block;font-size:11px;margin:3px 0 0;color:#586c7b;line-height:1.4}.pmk-native-annotation[data-tone=alert],.pmk-native-alert,.pmk-native-issue[data-tone=alert]{color:#a64f05}.pmk-native-annotation[data-tone=ok],.pmk-native-good{color:#287449}.pmk-native-issue{font-size:11px;margin-top:4px;font-weight:600}.pmk-native-date{font-weight:600}.pmk-native-commercial{padding:8px 12px;background:#f8fafc;border:1px solid #dde5eb;border-radius:6px}';document.head.append(nativeCSS);
    host=make('section');host.id='pmkfp-panel';
    const modalStyle=make('style');modalStyle.textContent=`#pmkfp-panel .pmkfp-detail.pmkfp-modal{position:fixed!important;left:50%!important;right:auto!important;top:5vh!important;transform:translateX(-50%);width:min(1100px,96vw)!important;height:90vh!important;max-height:90vh;overflow:auto;z-index:2100;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 20px 80px #0006;background:#fff;padding:24px}#pmkfp-panel .pmkfp-tabs{position:sticky;top:-24px;z-index:3;display:flex;gap:8px;flex-wrap:wrap;padding:10px 0;background:#fff;border-bottom:1px solid #ddd;margin-bottom:12px}#pmkfp-panel .pmkfp-tabs button.active{background:#1e5b78;color:#fff}#pmkfp-panel .pmkfp-tab-content[hidden]{display:none!important}#pmkfp-panel .pmkfp-tab-content:not([hidden]){display:block!important}#pmkfp-panel .pmkfp-detail.pmkfp-modal>h4{font-size:20px;font-weight:700;margin:5px 0 15px}#pmkfp-panel .pmkfp-detail.pmkfp-modal{display:flex;flex-direction:column}#pmkfp-panel .pmkfp-detail.pmkfp-modal>.pmkfp-tab-content{flex:1;overflow:auto;padding:14px 3px}#pmkfp-panel .pmkfp-tabs button{border:0;border-radius:8px 8px 0 0;padding:9px 14px}#pmkfp-panel .pmkfp-tabs button.active{box-shadow:inset 0 -3px #146b80}#pmkfp-panel .pmkfp-detail .pmkfp-comparison{max-width:100%}#pmkfp-panel .pmkfp-issue{white-space:nowrap;font-size:12px;margin:3px 0}#pmkfp-panel .pmkfp-detail.pmkfp-modal{padding:0!important;overflow:hidden!important;gap:0;max-width:1120px!important;border-radius:16px!important}#pmkfp-panel .pmkfp-modal-header{display:flex;align-items:start;justify-content:space-between;gap:20px;padding:22px 28px 14px;background:#f7fafc;border-bottom:1px solid #e1e8f0}#pmkfp-panel .pmkfp-modal-header small{font-weight:700;letter-spacing:.075em;color:#54717c}#pmkfp-panel .pmkfp-modal-header h4{margin:8px 0 0!important;font-size:23px!important}#pmkfp-panel .pmkfp-modal-close{border-radius:50%;width:38px;height:38px;font-size:19px;flex-shrink:0}#pmkfp-panel .pmkfp-tabs{position:static!important;margin:0!important;padding:5px 25px!important;gap:4px!important;flex-wrap:nowrap!important;overflow-x:auto;flex-shrink:0;background:#fff!important}#pmkfp-panel .pmkfp-tabs button{white-space:nowrap;border-radius:7px!important;padding:12px 15px!important;font-weight:600}#pmkfp-panel .pmkfp-detail.pmkfp-modal>.pmkfp-tab-content{min-height:0!important;padding:22px 28px 36px!important;overflow-y:auto!important}#pmkfp-panel .pmkfp-detail.pmkfp-modal .pmkfp-raw-fields{margin-top:28px}#pmkfp-panel .pmkfp-metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:14px 0 24px}#pmkfp-panel .pmkfp-metric{background:#f2f7f9;border:1px solid #dce9ee;padding:12px;border-radius:10px;display:flex;flex-direction:column;gap:3px}#pmkfp-panel .pmkfp-metric strong{font-size:24px}#pmkfp-panel .pmkfp-metric small{color:#556b75}#pmkfp-panel .pmkfp-responsive{overflow-x:auto}#pmkfp-panel .pmkfp-tab-content h5{font-size:16px;font-weight:700;margin:12px 0}#pmkfp-panel .pmkfp-tab-content>section{margin-bottom:22px}#pmkfp-panel .pmkfp-tab-content button,#pmkfp-panel .pmkfp-tab-content a{margin:3px}#pmkfp-panel .pmkfp-detail .pmkfp-inline-field{padding:9px;border-bottom:1px solid #e5e9ed;justify-content:space-between}#pmkfp-panel .pmkfp-detail .pmkfp-inline-field:nth-child(even){background:#f8fafc}#pmkfp-panel .pmkfp-row-actions{display:flex;gap:4px;flex-wrap:wrap}#pmkfp-panel .pmkfp-inline-field{display:flex;align-items:center;gap:4px}`;modalStyle.textContent+=' #pmkfp-panel .pmkfp-extra-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}#pmkfp-panel .pmkfp-extra-card{border:1px solid #dbe5ec;border-radius:9px;background:#f7fafb;padding:11px;display:flex;flex-direction:column;gap:7px}#pmkfp-panel .pmkfp-extra-card strong{font-size:12px;color:#426071}#pmkfp-panel .pmkfp-cross-claim{border:1px solid #d8e5ec;border-radius:10px;padding:16px;margin:14px 0;background:#f9fbfc}';document.head.append(modalStyle);
    host.innerHTML=`<details data-fp-main><summary><strong>Gestion des abonnements</strong> <small>Koha × France Publications</small></summary><div class="pmkfp-main-inner"><div class="pmkfp-actions"><strong data-fp-session>FP : À vérifier</strong><button type="button" class="btn btn-default btn-sm" data-fp-connect>Connecter France Publications</button><button type="button" class="btn btn-default btn-sm" data-fp-reconnect hidden>Réassocier FP</button><a data-fp-login hidden target="pmk_france_publications" href="${FP}/index.php?route=login">Se connecter à France Publications</a></div><div class="pmkfp-actions"><button type="button" class="btn btn-primary btn-sm" data-fp-unified>Actualiser</button><button type="button" class="btn btn-default btn-sm" data-fp-start hidden disabled>Actualiser depuis France Publications</button><button type="button" class="btn btn-default btn-sm" data-fp-stop disabled>Arrêter</button><button type="button" class="btn btn-default btn-sm" data-fp-koha hidden>Charger Koha</button><details class="pmkfp-tools"><summary>Outils et exports</summary><button type="button" class="btn btn-default btn-sm" data-fp-import>Importer un fichier PMK</button><button type="button" class="btn btn-default btn-sm" data-fp-export>Exporter les données récupérées</button><button type="button" class="btn btn-default btn-sm" data-fp-csv>Exporter la vue CSV</button><input type="file" accept=".json,application/json" data-fp-file hidden></details></div><details><summary>Première utilisation : installer le compagnon France Publications</summary><p>Le module Koha seul ne peut pas lire la session France Publications. Installez le compagnon dans votre gestionnaire de scripts navigateur, puis cliquez sur « Connecter France Publications ». Aucun mot de passe n’est enregistré dans PMK.</p><button type="button" class="btn btn-default btn-sm" data-fp-companion>Télécharger le compagnon .user.js</button></details><div data-fp-loading hidden class="pmkfp-loading" role="status" aria-live="polite"><span class="pmkfp-spinner"></span><span data-fp-loading-text>Lecture en cours…</span><progress data-fp-progress></progress></div><p role="status" aria-live="polite" data-fp-status>Prêt.</p><p data-fp-summary></p><details class="pmkfp-tools"><summary>Périmètre du chargement</summary><small data-fp-scope></small></details><div class="pmkfp-actions"><label>Vue <select data-fp-view><option value="subscriptions">Tous les abonnements</option><option value="review">À corriger</option><option value="renewals">Renouvellements</option><option value="site-list">Titres par site / date</option><option value="claims">Réclamations</option><option value="replies">Réponses</option></select></label><label>Rechercher <input type="search" data-fp-search placeholder="Titre, référence, destinataire…"></label></div><details class="pmkfp-tools"><summary>Filtres avancés</summary><div data-fp-filters class="pmkfp-actions"></div></details><div data-fp-overview></div><details data-fp-bulk-wrapper><summary data-fp-bulk-title>Corrections sur la sélection</summary><div data-fp-bulk class="pmkfp-actions"></div></details><div data-fp-table class="pmkfp-scroll"></div><div data-fp-errors class="pmkfp-error"></div><div data-fp-queue></div></div></details>`;
    // Koha inclut des titres h1 dans les modales Mana-KB AVANT le vrai titre.
    // Cibler le contenu principal et exclure toute fenêtre modale / zone cachée.
    const blocked='.modal,[role="dialog"],[hidden],[aria-hidden="true"]';
    const main=Array.from(document.querySelectorAll('main,#main,#content'))
      .find(n=>!n.closest(blocked))||document.body;
    const h=Array.from(main.querySelectorAll('h1'))
      .find(n=>!n.closest(blocked)&&n.getClientRects().length>0);
    if(h&&h.parentNode)h.after(host);else main.prepend(host);
    $('[data-fp-unified]',host).onclick=()=>{clearKohaCache();issueRowsPromise=null;issueCache.clear();unifiedLoad();};$('[data-fp-connect]',host).onclick=openBridge;$('[data-fp-reconnect]',host).onclick=()=>{if(running)return;updateState('unknown');openBridge();};$('[data-fp-start]',host).onclick=startCollect;
    $('[data-fp-stop]',host).onclick=()=>{send('cancel');message('Arrêt demandé…');};
    $('[data-fp-koha]',host).onclick=()=>{clearKohaCache();issueRowsPromise=null;issueCache.clear();return loadKoha();};
    $('[data-fp-companion]',host).onclick=()=>download('PMK-France-Publications.user.js',companionSource(),'text/javascript');
    $('[data-fp-import]',host).onclick=()=>$('[data-fp-file]',host).click();
    $('[data-fp-file]',host).onchange=e=>{importFile(e.target.files[0]);e.target.value='';};
    $('[data-fp-export]',host).onclick=()=>{const d=partial||dataset;if(!d){message('Aucune donnée à exporter.',true);return;}download('PMK-France-Publications-'+new Date().toISOString().slice(0,10)+(d.complete?'':'-INCOMPLET')+'.json',d);};
    $('[data-fp-csv]',host).onclick=exportFilteredCsv;
    $('[data-fp-view]',host).onchange=e=>{view=e.target.value;if(view==='review'){filters.source='koha';buildFilters();}if(view==='site-list'){filters.source='koha';buildFilters();}page=0;renderTable();};$('[data-fp-search]',host).oninput=e=>{search=e.target.value;page=0;renderTable();};buildFilters();renderTable();renderQueue();
    // Koha constitue désormais la source de départ, sans attendre une session FP.
    if(restoreKohaCache()){buildFilters();renderTable();nativeRefresh();updateCacheNotice();}
    else loadKoha().then(nativeRefresh).catch(e=>message('Chargement Koha : '+e.message,true));
    nativeRefresh();
    probeRelay();setTimeout(probeRelay,350);
    host.hidden=true; // Le tableau de bord général n'est plus une interface utilisateur.
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&host)closeDrawer();});
    setInterval(()=>{
      if(!relayInstalled&&remote&&remote.closed){
        if(running||unifiedIntent){running=false;unifiedFpDone=true;nativeCompactControls();endUnified(true);message('Onglet FP fermé : données précédentes conservées. Cliquez sur « Réassocier FP ».',true);}
        updateState('unknown');$('[data-fp-stop]',host).disabled=true;remote=null;return;
      }
      if((!relayInstalled&&!remote)||state!=='connected'||running||document.visibilityState==='hidden')return;
      // Vérification légère du compagnon; pas de nouvelle fenêtre sans clic de l’utilisateur.
      if(Date.now()-bridgeCheckAt>45000){bridgeCheckAt=Date.now();send('check');}
      if(bridgeAnswerAt&&Date.now()-bridgeAnswerAt>105000){
        updateState('unavailable','Réponse du compagnon interrompue. Cliquez sur « Réassocier FP » pour rétablir la liaison.');
        if(unifiedIntent){unifiedFpDone=true;endUnified(true);}
      }
    },5000);
  }
  const claimResponseHandlers=new Map();
  function askFpClaim(type,payload,callback){
    const requestId='cl'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
    const timeout=setTimeout(()=>{const p=claimResponseHandlers.get(requestId);if(p){claimResponseHandlers.delete(requestId);p.callback({error:'Aucune réponse du compagnon FP. Vérifiez sa connexion.'});}},20000);
    claimResponseHandlers.set(requestId,{callback,timeout});send(type,{requestId,...payload});return requestId;
  }
  function receiveFP(m,relay=false,event=null){
    if(!host||!cfg.enabled||!m||m.channel!==CHANNEL||m.nonce!==nonce)return;
    if(!relay){if(event?.origin!==FP)return;if(!remote)remote=event.source;if(event.source!==remote)return;}
    clearTimeout(watchdog);bridgeAnswerAt=Date.now();
    if(['claim-form-result','claim-submit-result'].includes(m.type)){
      const p=claimResponseHandlers.get(m.requestId);
      if(p){clearTimeout(p.timeout);claimResponseHandlers.delete(m.requestId);p.callback(m);}
      return;
    }
    if(m.type==='pulse'){if(m.version===COMPANION_VERSION){if(m.sessionOk&&state!=='connected'){updateState('connected');nativeRefresh();}else if(!m.sessionOk&&state==='waiting')updateState('unavailable','Session FP à vérifier.');}return;}
    if(m.type==='session'){nativeRefresh();if(m.state==='connected'&&m.version!==COMPANION_VERSION){updateState('unavailable','Mettez à jour le compagnon Tampermonkey vers la version '+COMPANION_VERSION+', puis rechargez France Publications.');return;}updateState(m.state,m.message);tryAutoStart();}
    if(m.type==='snapshot'){try{partial=validateDataset(m.data);if(Date.now()-lastPaint>6500){lastPaint=Date.now();renderTable();}}catch(e){message(e.message,true);}}
    if(m.type==='progress'){nativeCompactControls();if(!unifiedIntent)message('Lecture FP en cours…');const label=$('[data-fp-loading-text]',host);if(label)label.textContent=m.message;}
    if(m.type==='error'){running=false;unifiedFpDone=true;updateState(state);nativeCompactControls();message(m.message,true);endUnified();}
    if(m.type==='detail-result'){
      const pending=pendingDetails.get(m.requestId);if(!pending||m.ref!==pending.row.ref)return;
      clearTimeout(pending.timer);pendingDetails.delete(m.requestId);
      if(m.error){if(pending.button){pending.button.disabled=false;pending.button.textContent='Réessayer la fiche complète';}message(m.error,true);return;}
      const d=m.data;if(!d||!validDate(d.startDate)||!validDate(d.endDate)||!Array.isArray(d.detailTables)){message('Fiche complète invalide.',true);return;}
      Object.assign(pending.row,{startDate:d.startDate,endDate:d.endDate,notes:String(d.notes||''),detailRead:true,detailTables:d.detailTables});
      renderTable();if(!$('[data-fp-editor]',host)){const target=activeRow===pending.row?pending.row:activeRow?activeRow:null;if(target){const selected=Array.from(host.querySelectorAll('.pmkfp-tabs button')).find(x=>x.classList.contains('active'))?.textContent;showDetails(target);if(selected){Array.from(host.querySelectorAll('.pmkfp-tabs button')).find(x=>x.textContent===selected)?.click();}}}message('Fiche complète chargée.');
    }
    if(m.type==='result'){
      running=false;unifiedFpDone=true;updateState(state);nativeCompactControls();$('[data-fp-stop]',host).disabled=true;endUnified();
      try{const d=validateDataset(m.data);if(d.complete){dataset=d;partial=null;}else{partial=d;}storeFpSnapshot(d);page=0;message(`${d.subscriptions.length} abonnements récupérés. ${d.complete?'Périmètre lu sans erreur.':'Résultat incomplet : consultez les erreurs.'}`,!d.complete);renderTable();nativeRefresh();}catch(e){message(e.message,true);}
    }
  }
  window.addEventListener('message',event=>receiveFP(event.data,false,event));
  window.addEventListener('pmk-fp-relay-in',event=>{if(!relayInstalled)return;try{receiveFP(JSON.parse(String(event.detail||'')),true);}catch(e){console.warn('[PMK FP] Message relais invalide',e);}});
  const selectedRows=new Map(),drafts=new Map();
  const dateOnly=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  let libraries=[],filters={source:'koha',site:'',comparison:'',life:'',renewalDays:90,asOf:dateOnly(new Date())},preparing=false,applying=false,stopWrites=false,activeRow=null;
  const EDIT_FIELDS=[
    {key:'start_date',names:['startdate'],label:'Date de début Koha',type:'date',fp:null},
    {key:'end_date',names:['to','enddate'],label:'Date de fin',type:'date',fp:'endDate'},
    {key:'notes',names:['notes'],label:'Note publique',type:'textarea'},
    {key:'internal_notes',names:['internalnotes'],label:'Note interne',type:'textarea'},
    {key:'callnumber',names:['callnumber'],label:'Cote de l’abonnement',type:'text'},
    {key:'grace_period',names:['graceperiod'],label:'Période de grâce (jours)',type:'number'},
    {key:'library_id',names:['branchcode'],label:'Bibliothèque de l’abonnement',type:'text'},
    {key:'frequency_id',names:['periodicity'],label:'Périodicité abonnement',type:'text'},
    {key:'itemtype',names:['itemtype'],label:'Type de document',type:'select'},
    {key:'location',names:['location'],label:'Localisation',type:'select'}
  ];
  const words=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/([A-Z])([0-9])/g,'$1 $2').replace(/([0-9])([A-Z])/g,'$1 $2').replace(/[^A-Z0-9]+/g,' ').trim();
  const useful=s=>words(s).split(' ').filter(t=>t.length>2&&!['MEDIATHEQUE','MEDIATHEQUES','BIBLIOTHEQUE','BIBLIOTHEQUES','COMMUNAUTAIRE','MUNICIPALE','MUNICIPAL','POLE','CULTUREL','CULTURELLE','VILLE','LES','DES','SUR','SAINT','SAINTE','AVENUE','BOULEVARD','RUE','FRANCE'].includes(t));
  // Une destination FP peut porter le nom d'un service plutôt que celui de la bibliothèque
  // (ex. musée / artothèque). Prioriser les identifiants commerciaux déjà présents
  // dans Koha évite de traiter une simple variation de libellé comme un site inconnu.
  // Ne JAMAIS supposer que la ville de Draguignan implique la bibliothèque DRA.
  function libraryByReference(row) {
    if(!kohaLoaded||!row?.ref)return null;
    const fp=commercialRef(row.ref);if(!fp)return null;
    const matching=koha.filter(k=>kohaCommercialRefs(k).includes(fp.exact));
    const singleSite=rows=>{
      const codes=[...new Set(rows.map(k=>String(k.library_id||'')).filter(Boolean))];
      return codes.length===1&&libraries.some(l=>l.library_id===codes[0])?codes[0]:'';
    };
    const exactSite=singleSite(matching);
    if(exactSite)return {code:exactSite,reason:'Bibliothèque déduite de la référence FP exacte dans Koha',source:'reference-exact'};
    if(matching.length)return {code:'',reason:'Référence FP exacte présente dans plusieurs bibliothèques Koha',source:'reference-ambiguous'};
    // Une même famille DRG n'est PAS suffisante. ISSN valide identique obligatoire.
    const key=issn(row.issn);
    if(key.length!==8)return null;
    const family=koha.filter(k=>issn(k.issn)===key&&kohaCommercialRefs(k).some(ref=>commercialRef(ref)?.family===fp.family));
    const familySite=singleSite(family);
    if(familySite)return {code:familySite,reason:'Bibliothèque déduite de la même famille DRG et du même ISSN',source:'reference-family'};
    if(family.length)return {code:'',reason:'Même famille DRG et ISSN présents sur plusieurs sites Koha',source:'reference-ambiguous'};
    return null;
  }
  function autoLibrary(row) {
    const manual=lines(cfg.branchMap).get(String(row.destinationCode));
    if(manual){
      if(libraries.some(l=>l.library_id===manual))return {code:manual,reason:'Code destinataire FP configuré',source:'configured'};
      return {code:'',reason:'Code site configuré inconnu dans Koha : '+manual,source:'invalid-config'};
    }
    const byRef=libraryByReference(row);
    if(byRef)return byRef;
    const normalized=words(row.destination),dest=' '+normalized+' ',compact=normalized.replace(/ /g,''),scores=[];
    // Le Médiabus est nommé BIB dans certains abonnements, MDB dans d'autres
    // modules. N'utiliser que les mentions explicites de la destination FP ;
    // la simple adresse postale à Draguignan ne prouve pas le site BIB.
    const busMention=/(?:^| )(?:MEDIABUS|MEDIABUS|BIBLIOBUS|BIBLIOBUS)(?: |$)/.test(normalized);
    if(busMention){
      const busCodes=['BIB','MDB'].filter(code=>libraries.some(l=>l.library_id===code));
      if(busCodes.length===1)return {code:busCodes[0],reason:'Destinataire FP mentionne explicitement le Médiabus',source:'recipient-mobile-library'};
      const siteFromRef=koha.filter(k=>kohaCommercialRefs(k).some(ref=>commercialRef(ref)?.family===commercialRef(row.ref)?.family)&&issn(k.issn)===issn(row.issn)&&busCodes.includes(String(k.library_id)));
      const unique=[...new Set(siteFromRef.map(k=>String(k.library_id)))];
      if(unique.length===1)return {code:unique[0],reason:'Médiabus et famille DRG confirmés',source:'recipient-mobile-library'};
      return {code:'',reason:'Destinataire Médiabus reconnu mais codes BIB/MDB ambigus : configurer le code destinataire FP',source:'recipient-ambiguous'};
    }
    for(const l of libraries){
      const city=words(l.city),distinct=useful(l.name).filter(t=>!useful(city).includes(t));
      const nameHit=distinct.length>0&&distinct.every(t=>dest.includes(' '+t+' '));
      const cityHit=city.length>3&&dest.includes(' '+city+' ');
      const cityUnique=cityHit&&libraries.filter(x=>words(x.city)===city).length===1;
      const postal=String(l.postal_code||'').replace(/\s/g,''),postalHit=/^\d{5}$/.test(postal)&&compact.includes(postal);
      // Address lines have different orders in FP and Koha. Generic labels are
      // not addresses. Number boundaries tolerate HTML blocks stuck together.
      const addressHit=[l.address1,l.address2,l.address3].filter(Boolean).some(raw=>{
        const address=words(raw);if(address.length<12||!/(?:^| )(RUE|AVENUE|BOULEVARD|PLACE|ROUTE|CHEMIN|COURS|IMPASSE|ALLEE|QUAI|TRAVERSE|MONTEE|PASSAGE)(?: |$)/.test(address))return false;
        if(dest.includes(' '+address+' '))return true;
        if(!cityHit&&!postalHit)return false;
        const key=address.replace(/ /g,'');let i=compact.indexOf(key);
        while(i>=0){const before=i?compact[i-1]:'',tail=compact.slice(i+key.length),after=tail[0]||'';const beforeOK=!/^\d/.test(key)||!/[0-9]/.test(before);const afterOK=!after||(/\d$/.test(key)?!/[0-9]/.test(after)||(postalHit&&tail.startsWith(postal)):!/[A-Z]/.test(after));if(beforeOK&&afterOK)return true;i=compact.indexOf(key,i+1);}return false;
      });
      const score=addressHit?110:nameHit?100:cityUnique?80:0;
      if(score)scores.push({code:String(l.library_id),score,reason:addressHit?'Adresse du site reconnue':nameHit?'Nom du site reconnu':'Commune unique reconnue'});
    }
    scores.sort((a,b)=>b.score-a.score);
    if(!scores.length)return {code:'',reason:'Site non reconnu : aucune référence Koha, code destinataire configuré ou adresse unique'};
    if(scores[1]&&(scores[1].score===scores[0].score||scores[1].score>=100))return {code:'',reason:'Plusieurs sites possibles'};
    return scores[0];
  }
  async function readLibraries() {
    const out=[];for(let p=1;p<=20;p++){
      const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);let r,j;try{r=await fetch('/api/v1/libraries?_per_page=100&_page='+p,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:ctl.signal});if(!r.ok)throw new Error('Bibliothèques Koha : HTTP '+r.status);j=await r.json();}finally{clearTimeout(timer);}

      if(!Array.isArray(j)||j.some(l=>!l||typeof l.library_id!=='string'||!l.library_id))throw new Error('Bibliothèques Koha : réponse inattendue.');for(const l of j)if(out.some(x=>x.library_id===l.library_id))throw new Error('Bibliothèques Koha : pagination incohérente.');out.push(...j);
      if(j.length<100)return out;
    }throw new Error('Liste des bibliothèques trop longue.');
  }
  const rowKey=r=>r._koha?'koha:'+r._koha.subscription_id:'fp:'+r.titleCode+'|'+r.ref+'|'+r.destinationCode;
  function sourceRows() {
    const data=partial||dataset;
    if(['subscriptions','review','renewals','site-list'].includes(view)&&filters.source==='koha')return koha.map(k=>({ref:'Koha '+k.subscription_id,title:k.title,issn:k.issn,destination:libraries.find(l=>l.library_id===k.library_id)?.name||k.library_id,destinationCode:k.library_id,startDate:iso(k.start_date),endDate:iso(k.end_date),notes:k.notes,detailRead:true,_koha:k}));
    return ['review','renewals','site-list'].includes(view)?(data?.subscriptions||[]):(data?.[view]||[]);
  }
  const localDay=()=>dateOnly(new Date());
  function daysBetween(from,to){return Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);}
  function rowSite(r){if(r._koha)return String(r._koha.library_id);if(r.ref)return autoLibrary(r).code;const sub=(partial||dataset)?.subscriptions?.find(s=>s.ref===r.RefAbo);return sub?autoLibrary(sub).code:'';}
  function filteredRows(ignoreComparison=false) {
    let rows=sourceRows();const q=search.toLocaleLowerCase('fr');
    if(q)rows=rows.filter(r=>Object.entries(r).some(([k,v])=>k!=='_koha'&&typeof v!=='object'&&String(v??'').toLocaleLowerCase('fr').includes(q)));
    if(filters.site)rows=rows.filter(r=>filters.site==='__unknown'?!rowSite(r):rowSite(r)===filters.site);
    if(view==='site-list'){const at=iso(filters.asOf)||localDay();rows=rows.filter(r=>iso(r.startDate)&&iso(r.endDate)&&iso(r.startDate)<=at&&iso(r.endDate)>=at).sort((a,b)=>rowSite(a).localeCompare(rowSite(b))||String(a.title).localeCompare(String(b.title),'fr'));}
    if(view==='renewals'){const now=localDay(),limit=new Date(now+'T12:00:00');limit.setDate(limit.getDate()+filters.renewalDays);const cutoff=dateOnly(limit);rows=rows.filter(r=>iso(r.endDate)&&iso(r.endDate)<=cutoff).sort((a,b)=>String(a.endDate).localeCompare(String(b.endDate)));}
    if(!ignoreComparison&&view==='review')rows=rows.filter(r=>!['same','covered','historical','koha'].includes(match(r).kind));
    if(!ignoreComparison&&filters.comparison&&['subscriptions','review','renewals'].includes(view))rows=rows.filter(r=>match(r).kind===filters.comparison);
    if(filters.life&&['subscriptions','review','renewals'].includes(view)){
      const today=new Date(),now=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
      const limit=new Date(today);limit.setDate(limit.getDate()+90);const soon=[limit.getFullYear(),String(limit.getMonth()+1).padStart(2,'0'),String(limit.getDate()).padStart(2,'0')].join('-');
      rows=rows.filter(r=>filters.life==='expired'?r.endDate&&r.endDate<now:filters.life==='future'?r.startDate&&r.startDate>now:filters.life==='soon'?r.endDate&&r.endDate>=now&&r.endDate<=soon:r.endDate&&r.endDate>=now&&(!r.startDate||r.startDate<=now));
    }return rows;
  }
  function closeDrawer(){const p=$('[data-fp-detail]',host);if(p)p.remove();activeRow=null;}
  function button(text,fn,cls='btn btn-default btn-sm'){const b=make('button',text);b.type='button';b.className=cls;b.onclick=fn;return b;}
  function nativeURL(id){if(!/^\d+$/.test(String(id)))throw new Error('Identifiant Koha invalide.');return '/cgi-bin/koha/serials/subscription-add.pl?op=modify&subscriptionid='+encodeURIComponent(id);}
  function canonicalDate(v){const s=String(v||'').trim();if(validDate(s))return s;const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);const out=m?m[3]+'-'+m[2]+'-'+m[1]:'';return validDate(out)?out:'';}
  function controlFor(form,def){return def.names.map(n=>form.querySelector('[name="'+n+'"]')).find(n=>n&&!n.disabled&&!n.readOnly)||null;}
  function fieldValue(control,def){return def.type==='date'?canonicalDate(control.value):String(control.value??'');}
  function nativeDate(value,current){if(/^\d{2}\/\d{2}\/\d{4}$/.test(current))return value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4);return value;}
  function fingerprint(body){return JSON.stringify(Array.from(body.entries()).filter(([k])=>!['csrf_token','csrf-token'].includes(k)).sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1])));}
  function inspectNative(html,id) {
    const doc=new DOMParser().parseFromString(html,'text/html');
    if(doc.querySelector('input[type="password"]'))throw new Error('Connexion Koha nécessaire.');
    const forms=Array.from(doc.querySelectorAll('form')).filter(f=>String(f.querySelector('[name="subscriptionid"]')?.value||'')===String(id));
    if(forms.length!==1)throw new Error('Formulaire d’abonnement Koha non reconnu. Utilisez « Modifier dans Koha ».');
    const form=forms[0],actionAttr=form.getAttribute('action'),action=new URL(actionAttr||'/',location.origin);
    if(!actionAttr||action.origin!==location.origin||action.pathname!=='/cgi-bin/koha/serials/subscription-add.pl'||action.search||String(form.getAttribute('method')).toLowerCase()!=='post')throw new Error('Formulaire natif non compatible avec l’enregistrement assisté.');
    const body=new URLSearchParams();for(const [k,v]of new FormData(form).entries()){if(typeof v!=='string')throw new Error('Formulaire avec fichier non pris en charge.');body.append(k,v);}
    let op=body.get('op');
    if(!op){const submit=Array.from(form.querySelectorAll('button[name="op"],input[type="submit"][name="op"]')).find(n=>n.value==='cud-modsubscription');if(submit){op=submit.value;body.set('op',op);}}
    if(op!=='cud-modsubscription'||!body.get('csrf_token'))throw new Error('Opération de modification ou jeton Koha non reconnu. Aucun enregistrement envoyé.');
    if(body.getAll('op').length!==1||body.getAll('subscriptionid').length!==1)throw new Error('Paramètres de formulaire ambigus.');
    const fields={};for(const def of EDIT_FIELDS){const c=controlFor(form,def);if(c&&body.getAll(c.name).length===1)fields[def.key]={def,name:c.name,value:fieldValue(c,def),raw:String(c.value||''),choices:c.tagName==='SELECT'?Array.from(c.options).map(o=>({value:o.value,label:o.textContent})):null};}
    return {id:String(id),form,body,action:action.href,fields,fingerprint:fingerprint(body)};
  }
  async function kohaRequest(url,body=null){
    const u=new URL(url,location.origin);if(u.origin!==location.origin||u.pathname!=='/cgi-bin/koha/serials/subscription-add.pl')throw new Error('Destination Koha refusée.');
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);
    try{const r=await fetch(u.href,{method:body?'POST':'GET',body:body?body.toString():undefined,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'}:{},signal:ctl.signal});if(!r.ok)throw new Error('Formulaire Koha : HTTP '+r.status);const final=new URL(r.url);if(final.origin!==location.origin)throw new Error('Redirection Koha inattendue.');return await r.text();}finally{clearTimeout(timer);}
  }
  async function readNative(id){return inspectNative(await kohaRequest(nativeURL(id)),id);}
  function checkedPatch(native,patch){
    const result={};for(const [key,value]of Object.entries(patch)){
      const field=native.fields[key];if(!field)throw new Error('Champ indisponible dans le formulaire : '+key);let v=String(value??'');
      if(field.def.type==='date'&&(!native.fields.start_date||!native.fields.end_date))throw new Error('Les deux champs de période Koha doivent être reconnus avant de modifier une date.');
      if(field.def.type==='date'&&!validDate(v))throw new Error('Date invalide : '+field.def.label);
      if(field.def.type==='number'&&!/^\d+$/.test(v))throw new Error('Nombre entier positif ou nul requis : '+field.def.label);
      if(field.choices&&!field.choices.some(o=>o.value===v))throw new Error('Valeur non autorisée : '+field.def.label);
      if(v.length>10000)throw new Error('Valeur trop longue : '+field.def.label);
      if(v!==field.value)result[key]=v;
    }
    for(const f of Object.values(native.fields))if(f.def.type==='date'&&f.raw&&!f.value)throw new Error('Format de date Koha non reconnu : '+f.def.label);
    const start=result.start_date??native.fields.start_date?.value,end=result.end_date??native.fields.end_date?.value;
    if(start&&end&&start>end)throw new Error('La date de début dépasse la date de fin.');return result;
  }
  function putDraft(native,patch,title){
    const old=drafts.get(native.id);const merged=checkedPatch(native,old&&old.fingerprint===native.fingerprint&&old.status==='prepared'?{...old.patch,...patch}:patch);if(!Object.keys(merged).length){if(old?.status==='prepared')drafts.delete(native.id);return false;}
    drafts.set(native.id,{id:native.id,title,fingerprint:native.fingerprint,before:Object.fromEntries(Object.entries(native.fields).map(([k,v])=>[k,v.value])),patch:merged,status:'prepared',message:''});return true;
  }
  async function showEditor(row,p){if(!p||p.querySelector('[data-fp-editor]'))return;
    const m=match(row);if(!m.koha){p.append(make('p','Chargez Koha ou résolvez la correspondance avant de préparer une correction.'));return;}
    const h=make('section');h.dataset.fpEditor='1';p.append(h);h.append(make('p','Lecture du formulaire Koha…'));
    try{
      const native=await readNative(m.koha.subscription_id);if(!h.isConnected)return;h.replaceChildren();h.append(make('h4','Corriger cet abonnement Koha'));
      const table=make('table');table.className='table table-condensed';const head=make('tr');for(const t of ['Modifier','Champ','Actuel Koha','Nouvelle valeur'])head.append(make('th',t));table.append(head);
      const inputs=[];
      for(const field of Object.values(native.fields)){
        const tr=make('tr'),check=make('input');check.type='checkbox';check.setAttribute('aria-label','Modifier '+field.def.label);const input=make(field.choices?'select':field.def.type==='textarea'?'textarea':'input');
        if(field.choices)for(const o of field.choices){const option=make('option',o.label);option.value=o.value;input.append(option);}else if(field.def.type!=='textarea')input.type=field.def.type;
        input.value=field.value;input.className='form-control';input.oninput=()=>{check.checked=input.value!==field.value;};const c1=make('td'),c2=make('td');c1.append(check);c2.append(input);tr.append(c1,make('td',field.def.label),make('td',field.value||'—'),c2);table.append(tr);inputs.push({field,check,input});
      }h.append(table);
      h.append(button('Reprendre les valeurs FP disponibles',()=>{for(const x of inputs){const val=fpFieldValue(row,x.field.def);if(val!==null&&val!==undefined){x.input.value=String(val);x.check.checked=x.input.value!==x.field.value;}}}));
      h.append(button('Ajouter les champs cochés à l’aperçu',()=>{try{const patch=Object.fromEntries(inputs.filter(x=>x.check.checked).map(x=>[x.field.def.key,x.input.value]));const changed=putDraft(native,patch,row.title);message(changed?'Correction préparée : consultez l’aperçu avant application.':'Aucun changement sélectionné.');renderQueue();}catch(e){message(e.message,true);}},'btn btn-primary btn-sm'));
      h.append(make('p','Les autres paramètres du formulaire restent conservés. Les tarifs et la prévision des fascicules ne sont pas modifiés ici.'));
    }catch(e){h.replaceChildren(make('p',e.message));const a=make('a','Modifier dans Koha');a.href=nativeURL(m.koha.subscription_id);a.target='_blank';a.rel='noopener';h.append(a);}
  }
  async function prepareFpAssociation(row,id){
    if(preparing||applying||running){message('Une opération est déjà en cours.');return;}
    if(!/^[0-9]+$/.test(String(id))||!koha.some(k=>String(k.subscription_id)===String(id)))throw new Error('Abonnement Koha inconnu.');
    try{
      const native=await readNative(id),field=native.fields.internal_notes;
      if(!field)throw new Error('La note interne Koha n’est pas accessible dans le formulaire natif.');
      const pending=drafts.get(String(id));
      const base=pending?.status==='prepared'&&pending.fingerprint===native.fingerprint?(pending.patch.internal_notes??field.value):field.value;
      const value=withFpTag(base,row.ref);
      if(value===base){message('Référence FP déjà enregistrée dans Koha.');return;}
      if(!window.confirm('Associer durablement '+row.ref+' à l’abonnement Koha '+id+' ?\nUne balise sera ajoutée dans la note interne Koha, sans supprimer les notes existantes.\nAucune date ne sera modifiée.'))return;
      const added=putDraft(native,{internal_notes:value},row.title+' · '+row.ref);
      renderQueue();message(added?'Association préparée. Vérifiez l’aperçu puis cliquez sur « Appliquer les corrections préparées ».':'Association déjà préparée.');
      $('[data-fp-queue]',host)?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){message(e.message,true);}
  }
  async function associate(row,id){
    await prepareFpAssociation(row,id);
  }
  function addAssociations(row,p){
    if(row._koha||!row.ref)return;const info=autoLibrary(row);p.append(make('p','Site : '+(info.code||'à vérifier')+' — '+info.reason));
    if(!kohaLoaded)return;const m=match(row);if(m.koha)return;
    const box=make('details');box.append(make('summary','Résoudre une correspondance d’abonnement'));
    const select=make('select');select.className='form-control';const empty=make('option','Choisir parmi les abonnements Koha');empty.value='';select.append(empty);
    const candidates=koha.filter(k=>(!info.code||String(k.library_id)===info.code)&&((issn(row.issn).length===8&&issn(row.issn)===issn(k.issn))||words(k.title)===words(row.title))).slice(0,200);
    for(const k of candidates){const opt=make('option',`${k.subscription_id} · ${k.library_id} · ${k.title} · ${iso(k.end_date)}`);opt.value=k.subscription_id;select.append(opt);}
    const id=make('input');id.type='number';id.placeholder='Ou numéro d’abonnement Koha';id.className='form-control';box.append(select,id,button('Associer dans Koha',async()=>{try{await associate(row,id.value||select.value);}catch(e){message(e.message,true);}}));p.append(box);
  }
  async function stageSelection(mode){
    if(preparing||applying||running){message('Une opération est déjà en cours.');return;}
    const rows=Array.from(selectedRows.values());if(!rows.length){message('Sélectionnez des abonnements.');return;}
    let patch=null;
    if(mode==='common'){const key=$('[data-fp-common-field]',host).value,value=$('[data-fp-common-value]',host).value;patch={[key]:value};}
    preparing=true;let done=0,failures=[];const ids=new Set();
    try{for(const row of rows){const comparison=match(row),k=comparison.koha;if(!k){failures.push((row.title||row.ref)+' : '+comparison.label);continue;}const sid=String(k.subscription_id);if(ids.has(sid)){failures.push(row.title+' : abonnement Koha déjà présent dans la sélection');continue;}ids.add(sid);
      message(`Préparation ${++done}/${rows.length}…`);try{const native=await readNative(sid);const proposed=patch||Object.fromEntries(EDIT_FIELDS.filter(f=>!(comparison.kind==='covered'&&['start_date','end_date'].includes(f.key))&&fpFieldValue(row,f)!==null&&fpFieldValue(row,f)!==undefined).map(f=>[f.key,String(fpFieldValue(row,f))]));putDraft(native,proposed,row.title);}catch(e){failures.push(row.title+' : '+e.message);}}
      message(`${drafts.size} abonnement(s) dans l’aperçu. ${failures.length} échec(s).`,!!failures.length);renderQueue();if(failures.length){const box=$('[data-fp-queue]',host);box.append(make('h5','Corrections non préparées'));for(const failure of failures.slice(0,50))box.append(make('p',failure));}
    }finally{preparing=false;renderQueueControls();}
  }
  function queueState(d){const td=make('td'),kinds={prepared:'unmatched',verified:'same',failed:'different',unknown:'partial'},labels={prepared:'Préparé',verified:'Vérifié',failed:'Non enregistré',unknown:'Résultat à vérifier'};td.append(stateBadge(kinds[d.status]||'unknown',labels[d.status]||d.status));if(d.message)td.append(make('small',d.message));return td;}
  function renderQueue(){
    if(!host)return;const box=$('[data-fp-queue]',host);if(!box)return;box.replaceChildren();box.append(make('h4',`Aperçu des corrections (${drafts.size} abonnement(s))`));
    if(!drafts.size){box.append(make('p','Sélectionnez des lignes ou préparez une correction dans une fiche.'));return;}
    const t=make('table');t.className='table table-condensed';const h=make('tr');for(const s of ['Abonnement','Champ','Actuel → nouvelle valeur','État',''])h.append(make('th',s));t.append(h);
    for(const d of drafts.values())for(const [key,value]of Object.entries(d.patch)){const tr=make('tr');tr.append(make('td',d.id+' · '+d.title),make('td',EDIT_FIELDS.find(f=>f.key===key)?.label||key),make('td',(d.before[key]||'—')+' → '+value),queueState(d));const c=make('td');const remove=button('Retirer',()=>{drafts.delete(d.id);renderQueue();},'btn btn-default btn-xs');remove.disabled=applying;c.append(remove);tr.append(c);t.append(tr);}box.append(t);
    const apply=button('Appliquer les corrections préparées',applyQueue,'btn btn-primary btn-sm');apply.dataset.fpApply='1';apply.disabled=applying||preparing||running||cfg.allowWrites!==true;box.append(apply,button('Arrêter après cet abonnement',()=>{stopWrites=true;}),button('Exporter l’aperçu',()=>download('PMK-corrections-abonnements.json',Array.from(drafts.values()).map(({fingerprint,...d})=>d))));
    if(!cfg.allowWrites)box.append(make('p','Pour enregistrer dans Koha, activez « Autoriser les corrections Koha » dans les réglages PMK après vos tests.'));
  }
  async function applyQueue(){
    if(applying||preparing||running||cfg.allowWrites!==true)return;applying=true;stopWrites=false;renderQueue();
    try{for(const d of drafts.values()){
      if(stopWrites||!cfg.enabled||!cfg.allowWrites)break;if(d.status!=='prepared')continue;
      let sent=false;
      try{
        const native=await readNative(d.id);
        if(Object.entries(d.patch).every(([k,v])=>native.fields[k]?.value===v)){d.status='verified';d.message='Déjà en place (vérifié)';const k=koha.find(k=>String(k.subscription_id)===d.id);if(k)Object.assign(k,d.patch);renderQueue();renderTable();continue;}
        if(!cfg.enabled||!cfg.allowWrites)throw new Error('Corrections Koha désactivées : aucun enregistrement envoyé.');
        if(native.fingerprint!==d.fingerprint)throw new Error('Formulaire modifié depuis l’aperçu : préparez à nouveau cette correction.');
        const patch=checkedPatch(native,d.patch),body=new URLSearchParams(native.body);
        for(const [key,value]of Object.entries(patch)){const f=native.fields[key];body.set(f.name,f.def.type==='date'?nativeDate(value,f.raw):value);}
        sent=true;clearKohaCache();await kohaRequest(native.action,body);const reread=await readNative(d.id);
        if(!Object.entries(d.patch).every(([k,v])=>reread.fields[k]?.value===v))throw new Error('Enregistrement non confirmé par relecture.');
        d.status='verified';d.message='Enregistré et vérifié';const k=koha.find(k=>String(k.subscription_id)===d.id);if(k)Object.assign(k,d.patch);
      }catch(e){d.status=sent?'unknown':'failed';d.message=e.message;if(sent)stopWrites=true;}
      renderQueue();renderTable();
    }}finally{applying=false;renderQueue();message('Traitement terminé. Consultez le bilan de chaque abonnement.');}
  }

  function renderQueueControls(){const b=$('[data-fp-apply]',host);if(b)b.disabled=applying||preparing||running||cfg.allowWrites!==true;}


  const nativePage=()=>location.pathname.split('/').pop();
  const activeSubscription=()=>new URLSearchParams(location.search).get('subscriptionid');
  const nativeCell=(label,value)=>{const n=make('div');n.className='pmk-native-pair';const a=make('span',label),b=make('strong',String(value??'—'));n.append(a,b);return n;};
  function nativeMatching(id){const k=koha.find(x=>String(x.subscription_id)===String(id));return k?{k,m:match({_koha:k})}:null;}
  function nativePanel(title,container){
    let n=$('#pmk-native-integration');if(n)return n;
    n=make('section');n.id='pmk-native-integration';n.className='card';n.style.cssText='margin:14px 0;padding:15px;border:1px solid #d5dfe7;border-radius:9px;background:#fff';
    const h=make('h2',title);h.style.cssText='margin:0 0 10px;font-size:19px';n.append(h);
    (container||$('#subscription_description')||$('main')||document.body).prepend(n);return n;
  }
  // PMK 2.3.3 : enrichissement au sein des composants natifs Koha.
  const nativeMark=(node,key)=>{if(!node)return null;let n=node.querySelector('[data-pmk-native="'+key+'"]');if(!n){n=make('span');n.dataset.pmkNative=key;n.className='pmk-native-annotation';node.append(n);}return n;};
  const nativeFormatDate=v=>{const t=String(v||'');return /^\d{4}-\d{2}-\d{2}$/.test(t)?t.slice(8)+'/'+t.slice(5,7)+'/'+t.slice(0,4):t||'—';};
  function nativeNote(node,text,tone='info',key='note'){
    const n=nativeMark(node,key);if(!n)return;
    if(!text){n.remove();return;}n.textContent=text;n.dataset.tone=tone;
  }
  // Diagnostic indépendant du rapprochement des périodes : une famille DRG peut
  // désigner plusieurs cycles. Elle ne constitue jamais seule une autorisation d'écriture.
  // Source native d'abord : le rapport 5262 ne garantit pas que les deux notes
  // affichées dans serials-search.pl soient reprises dans k.notes/internal_notes.
  function visibleCommercialRefs(cell){
    if(!cell)return [];
    const clone=cell.cloneNode(true);
    clone.querySelectorAll('[data-pmk-native]').forEach(n=>n.remove());
    return primaryCommercialRef(clone.textContent);
  }
  function fpCommercialCandidates(k,visibleRefs=[]){
    const refs=[...new Set([...kohaCommercialRefs(k),...visibleRefs])];
    const families=new Set(refs.map(x=>commercialRef(x)?.family).filter(Boolean));
    const key=issn(k.issn);
    const sources=[...(dataset?.subscriptions||[]),...(partial?.subscriptions||[])];
    if(!families.size||key.length!==8)return [];
    const unique=new Map();
    for(const f of sources){
      const ref=commercialRef(f.ref);
      if(!ref||!families.has(ref.family)||refs.includes(ref.exact))continue;
      if(issn(f.issn)!==key)continue;
      const site=autoLibrary(f)?.code;
      if(site&&site!==String(k.library_id))continue;
      // A missing site is an UNVERIFIED candidate, never proof of identity.
      const signature=ref.exact+'|'+String(f.destCode||f.recipientCode||'');
      unique.set(signature,{fp:f,siteVerified:site===String(k.library_id)});
    }
    return [...unique.values()];
  }
  function commercialRefDiagnostic(k,m,visibleRefs=[]){
    const refs=[...new Set([...kohaCommercialRefs(k),...visibleRefs])];
    const fpRef=String(m?.fp?.ref||'').toUpperCase();
    if(fpRef&&refs.length&&!refs.includes(fpRef)){const family=commercialRef(fpRef)?.family;if(family&&refs.some(ref=>commercialRef(ref)?.family===family))return null;return {ref:fpRef,confidence:'matched',reason:'Référence FP de famille différente : vérifier avant de remplacer la référence Koha.'};}
    if(fpRef||!refs.length)return null;
    // Une autre année de cycle ne change pas la famille commerciale.
    // Le diagnostic par ISSN/site ne doit jamais suggérer de remplacer une référence
    // Koha par une variante de cycle de la même famille.
    const knownFamilies=new Set(refs.map(r=>commercialRef(r)?.family).filter(Boolean));
    if(knownFamilies.size){
      const sameFamily=[...(dataset?.subscriptions||[]),...(partial?.subscriptions||[])].some(f=>knownFamilies.has(commercialRef(f.ref)?.family));
      if(sameFamily)return null;
    }
    // Un candidat FP peut porter une famille DRG totalement différente.
    // Seule l'unicité ET le site confirmé permettent une proposition directe.
    const all=fpRefCandidatesByTitleSite(k).filter(x=>!refs.includes(String(x.fp.ref||'').toUpperCase()));
    const verified=all.filter(x=>x.siteVerified);
    if(verified.length===1){
      const x=verified[0];
      return {ref:String(x.fp.ref).toUpperCase(),confidence:'candidate-site',reason:'ISSN identique, destinataire FP confirmé et seul candidat pour ce site ; vérifier le cycle commercial avant validation.'};
    }
    if(verified.length>1)return {ambiguous:true,count:verified.length};
    if(all.length===1)return {unverified:true,count:1};
    if(all.length>1)return {ambiguous:true,count:all.length};
    return {unavailable:true};
  }
  // Rapprochement assisté : le numéro de famille DRG peut changer entièrement.
  // Ne pas assimiler même ISSN à même abonnement : site et décision humaine requis.
  function fpRefCandidatesByTitleSite(k){
    const key=issn(k.issn), list=[...(dataset?.subscriptions||[]),...(partial?.subscriptions||[])];
    if(key.length!==8)return [];
    const unique=new Map();
    for(const f of list){
      if(issn(f.issn)!==key||!commercialRef(f.ref))continue;
      const site=autoLibrary(f)?.code||'';
      if(site&&site!==String(k.library_id))continue;
      const sig=String(f.ref).toUpperCase()+'|'+String(f.destCode||f.recipientCode||'');
      unique.set(sig,{fp:f,site,siteVerified:site===String(k.library_id)});
    }
    return [...unique.values()].sort((a,b)=>Number(b.siteVerified)-Number(a.siteVerified)||String(b.fp.endDate||'').localeCompare(String(a.fp.endDate||'')));
  }
  function nativeReviewDrg(k,nativeRefs){
    const candidates=fpRefCandidatesByTitleSite(k);
    const overlay=make('div');overlay.style.cssText='position:fixed;inset:0;z-index:2147483500;display:grid;place-items:center;background:#101e3099;padding:15px';
    const panel=make('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Rapprocher la référence commerciale FP');panel.style.cssText='background:#fff;color:#253341;border-radius:12px;padding:20px;width:min(690px,100%);max-height:85vh;overflow:auto;box-shadow:0 18px 65px #0005';
    panel.append(make('h3','Rapprocher la référence DRG'));
    panel.append(make('p','Koha '+k.subscription_id+' · '+String(k.title||'')+' · ISSN '+String(k.issn||'')+' · site '+String(k.library_id||'')));
    panel.append(make('p','Référence affichée dans Koha : '+(nativeRefs.join(', ')||'absente')));
    panel.append(make('p','Proposition calculée à partir des abonnements France Publications récupérés : même ISSN, destinataire/site et cycle commercial. Une seule correspondance confirmée est requise pour proposer une correction directe.'));
    panel.append(button('↻ Actualiser les données FP',()=>{overlay.remove();unifiedLoad();message('Actualisation FP lancée. Rouvrez le crayon après le chargement pour utiliser les valeurs les plus récentes.');},'btn btn-default btn-sm'));
    const msg=make('p');msg.setAttribute('role','status');panel.append(msg);
    if(!candidates.length){msg.textContent='Aucune référence FP de même ISSN dans les données récupérées : actualisez FP. Aucune valeur ne sera inventée.';}
    for(const x of candidates.slice(0,30)){
      const f=x.fp, ref=String(f.ref||'').toUpperCase();
      const wrap=make('div');wrap.style.cssText='border:1px solid #d7dfe5;border-radius:7px;margin:8px 0;padding:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap';
      const meta=make('div');meta.append(make('strong',ref));meta.append(make('div','Fin FP : '+(f.endDate||'non renseignée')+' · '+(x.siteVerified?'Site confirmé':x.site?'Site '+x.site:'Site FP non identifiable')));wrap.append(meta);
      const choose=button('Proposer cette valeur dans Koha',async()=>{
        if(!x.siteVerified){msg.textContent='Destinataire FP non confirmé : correction bloquée pour éviter de remplacer la référence d’un autre site.';return;}
        if(candidates.filter(c=>c.siteVerified).length!==1){msg.textContent='Plusieurs contrats FP possibles pour ce site et cet ISSN : choisir le bon cycle avant une correction.';return;}
        if(nativeRefs.length!==1){msg.textContent='La note Koha contient zéro ou plusieurs références DRG. Correction automatique refusée.';return;}
        try{
          const form=await readNative(k.subscription_id);
          const found=['internal_notes','notes'].flatMap(key=>{
            const field=form.fields[key];return field?primaryCommercialRef(field.value).filter(v=>v===nativeRefs[0]).map(v=>({key,field,ref:v})):[];
          });
          if(found.length!==1){msg.textContent='Référence affichée non retrouvée de façon unique dans le formulaire Koha. Aucune écriture.';return;}
          if(!window.confirm('Vérification manuelle requise\nKoha : '+nativeRefs[0]+'\nFP : '+ref+'\nMême ISSN et même site, mais contrats et cycles éventuellement différents.\n\nProposer ce remplacement ?'))return;
          overlay.remove();
          nativeEditKohaField(k,found[0].key,'référence DRG',String(found[0].field.value).replace(nativeRefs[0],ref));
        }catch(e){msg.textContent='Lecture Koha : '+String(e.message||e);}
      },'btn btn-default btn-xs');wrap.append(choose);panel.append(wrap);
    }
    if(candidates.length>30)panel.append(make('p','Plus de 30 candidats : préciser le rapprochement avant de corriger.'));
    panel.append(button('Fermer',()=>overlay.remove(),'btn btn-default btn-sm'));
    overlay.append(panel);document.body.append(overlay);panel.tabIndex=-1;panel.focus();overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});overlay.addEventListener('keydown',e=>{if(e.key==='Escape')overlay.remove();});
  }
  function fpForKoha(k){return match({_koha:k});}
  function nativeExtras(ol,id){
    if(!ol)return;
    let li=ol.querySelector('[data-pmk-native="extra-link"]');
    if(!li){li=make('li');li.dataset.pmkNative='extra-link';ol.append(li);}
    li.replaceChildren();const a=make('a','Modifier les champs supplémentaires');a.href=nativeURL(id);a.className='btn btn-default btn-xs';li.append(a);
  }
  function nativeDetail(){
    if(nativePage()!=='subscription-detail.pl')return;
    $('#pmk-native-integration')?.remove();
    const id=activeSubscription(),hit=nativeMatching(id);if(!hit)return;
    const {k,m}=hit,fp=m.fp;
    const content=$('#subscription_info_panel')||$('#subscription_description');if(!content)return;
    const lists=Array.from(content.querySelectorAll('.rows ol'));
    const infoList=lists.find(ol=>/Abonnement n|Fournisseur|Bibliothécaire/.test(ol.textContent));
    const extraList=lists.find(ol=>/Abo en ligne|N° d.abonné|Prix base/.test(ol.textContent));
    const calendarList=lists.find(ol=>/Date de début|Périodicité/.test(ol.textContent));
    if(infoList){let li=infoList.querySelector('[data-pmk-native="fp-detail"]');if(!li){li=make('li');li.dataset.pmkNative='fp-detail';infoList.append(li);}li.replaceChildren();
      const label=make('span','France Publications : ');label.className='label';li.append(label);
      const text=make('span',fp?String(fp.ref||''):'Correspondance FP à vérifier');li.append(text);
      const ctl=button(state==='connected'?'Actualiser FP':(dataset||partial?'FP en cache · reconnecter':'Connecter FP'),state==='connected'?unifiedLoad:openBridge,'btn btn-default btn-xs');ctl.style.marginLeft='8px';li.append(ctl);
      // Les factures se consultent dans « Suivi FP » : pas de bouton redondant en permanence.
    }
    if(extraList)nativeExtras(extraList,id);
    if(calendarList){
      const periodic=Array.from(calendarList.querySelectorAll('li')).find(li=>/Périodicité\s*:/i.test(li.textContent||''));
      if(periodic){let note=periodic.querySelector('[data-pmk-native="marc326"]');
        if(!note){note=make('small');note.dataset.pmkNative='marc326';periodic.append(note);}
        const c=compareCadence(k.frequency_label,k.biblio_periodicity);
        note.textContent=blankKoha(k.biblio_periodicity)?'326$a : non renseigné':
          (c.kind==='same'?'':'Notice 326$a : '+String(k.biblio_periodicity)+(c.kind==='mismatch'?' · ⚠ Différence':c.kind==='invalid'?' · ⚠ Valeur à corriger':' · Concordance à vérifier'));
        note.style.cssText='display:block;margin:3px 0;color:'+(c.kind==='mismatch'||c.kind==='invalid'?'#a64f05':'#586c7b')+';font-size:12px';
        if(['mismatch','invalid'].includes(c.kind))note.title='Koha : '+String(k.frequency_label||'—')+' ; notice bibliographique 326$a : '+String(k.biblio_periodicity||'—');
      }
    }

    if(calendarList){let li=calendarList.querySelector('[data-pmk-native="fp-dates"]');if(!li){li=make('li');li.dataset.pmkNative='fp-dates';calendarList.append(li);}li.replaceChildren();
      const label=make('span','Fin de l’abonnement : ');label.className='label';li.append(label);
      const kohaEnd=make('strong',nativeFormatDate(k.end_date));li.append(kohaEnd);
      const expiryStatus=appendCompactFpStatus(li,k,m);
      if(expiryStatus.diff&&fp&&kohaCommercialRefs(k).includes(String(fp.ref||'').toUpperCase()))nativePencil(li,'fp-end-pencil','Comparer et corriger la fin Koha depuis FP',()=>nativeAlignEndDate(k,m,(text,error)=>message(text,!!error)));
    }
    let issues=kohaProblems(k,m).filter(x=>!x.optional);
    const title=content.querySelector('h2.section-header')||content.querySelector('h2');
    if(title){let note=title.querySelector('[data-pmk-native="detail-errors"]');if(!note){note=make('small');note.dataset.pmkNative='detail-errors';title.append(note);}note.textContent=issues.length?' · ⚠ '+issues.length+' à vérifier':'';note.title=issues.map(x=>x.label).join('\n');}
    const container=extraList||infoList;
    if(container){let li=container.querySelector('[data-pmk-native="commercial"]');if(!li){li=make('li');li.dataset.pmkNative='commercial';container.append(li);}li.replaceChildren();
      const summary=make('details'),heading=make('summary','Suivi FP');heading.title='Renouvellements, factures et réclamations France Publications';summary.append(heading);
      const body=make('div');body.className='pmk-native-commercial';const d=dataset||partial;
      if(fp){const same=x=>String(x.ref||x.RefAbo||'').toUpperCase()===String(fp.ref||'').toUpperCase();
        const renewals=(d?.renewals||[]).filter(same),pending=(d?.pendingClaims||[]).filter(same);
        if(renewals.length||pending.length)body.append(make('p',[renewals.length?`${renewals.length} renouvellement(s) FP`:null,pending.length?`${pending.length} réclamation(s) en attente`:null].filter(Boolean).join(' · ')));
        for(const entry of renewals.slice(0,8))body.append(make('div','Renouvellement : '+String(entry.etatLibelle||entry.status||entry.ref||entry.RefAbo||'À consulter')));
        // Ne pas exposer ici le nombre GLOBAL de factures du fournisseur.
        // Un détail de facture n'est jamais réputé lié à ce titre sans vérification.
      }else body.append(make('p','Rapprochement FP à vérifier.'));
      const actions=make('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin:8px 0';
      actions.append(button('Factures',()=>nativeFollowupDialog(k,m,nativeAlertEntries(k,m),'invoices'),'btn btn-default btn-xs'));
      actions.append(button('Réclamations et contrôles',()=>nativeFollowupDialog(k,m,nativeAlertEntries(k,m)),'btn btn-default btn-xs'));
      body.append(actions);summary.append(body);li.append(summary);
    }
    enhanceDetailFields(k,m,infoList,extraList,calendarList);
  }
  // Intégration fine dans les lignes Koha, avec édition seulement après une action utilisateur.
  function detailRowByLabel(list,fragment){
    if(!list)return null;
    const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
    return Array.from(list.querySelectorAll(':scope > li')).find(li=>!li.hasAttribute('data-pmk-native')&&norm(li.querySelector('.label')?.textContent).includes(norm(fragment)))||null;
  }
  function makeDetailPencil(row,key,label,handler){
    if(!row)return;
    let existing=row.querySelector('[data-pmk-native="detail-pencil-'+key+'"]');
    if(existing){existing.onclick=handler;return existing;}
    const b=button('✎',handler,'btn btn-link btn-xs');b.dataset.pmkNative='detail-pencil-'+key;
    b.className='btn btn-link btn-xs pmk-native-pencil';
    b.style.cssText='margin-left:5px;padding:0 3px;font-size:11px;line-height:1;color:#87919b;vertical-align:baseline;border:0;background:transparent';
    b.title='Modifier '+label+' dans Koha';b.setAttribute('aria-label','Modifier '+label+' dans Koha');row.append(b);return b;
  }
  async function editExtraOnDetail(k,label){
    if(!cfg.allowWrites){message('Activez « Autoriser les corrections Koha » dans les réglages PMK.',true);return;}
    try{
      const native=await readNative(k.subscription_id),c=nativeExtraControl(native,label);
      const old=String(c.value??'');
      const overlay=make('div');overlay.style.cssText='position:fixed;inset:0;z-index:2147483450;background:#16243a99;display:grid;place-items:center;padding:16px';
      const pane=make('div');pane.style.cssText='width:min(540px,100%);background:#fff;color:#263444;padding:22px;border-radius:12px;box-shadow:0 16px 48px #0004';
      pane.append(make('h3','Modifier '+label),make('p','Abonnement Koha '+k.subscription_id+' · Seul ce champ sera modifié.'));
      let field;
      if(c.tagName==='SELECT'){
        field=make('select');for(const o of c.options){const x=make('option',o.textContent);x.value=o.value;field.append(x);}field.value=old;
      }else if(c.tagName==='TEXTAREA'){
        field=make('textarea');field.rows=4;field.value=old;
      }else{field=make('input');field.type=c.type==='number'?'number':'text';field.value=old;}
      field.className='form-control';field.setAttribute('aria-label',label);pane.append(field);
      const status=make('p','');status.setAttribute('role','status');status.style.marginTop='10px';pane.append(status);
      const buttons=make('div');buttons.style.cssText='display:flex;gap:8px;justify-content:flex-end;margin-top:16px';
      const cancel=button('Annuler',()=>overlay.remove());
      const save=button('Enregistrer',async()=>{
        const value=String(field.value);if(value===old){overlay.remove();return;}
        if(!window.confirm('Enregistrer la correction de « '+label+' » pour l’abonnement '+k.subscription_id+' ?'))return;
        save.disabled=cancel.disabled=true;status.textContent='Enregistrement et vérification…';
        try{const body=new URLSearchParams(native.body);body.set(c.name,value);clearKohaCache();await kohaRequest(native.action,body);
          const verified=await readNative(k.subscription_id),c2=nativeExtraControl(verified,label);
          if(String(c2.value??'')!==value)throw Error('La valeur relue ne correspond pas à la correction.');
          overlay.remove();nativeRefresh();message(label+' mis à jour dans Koha.');
        }catch(e){status.textContent='Échec : '+e.message;save.disabled=cancel.disabled=false;}
      },'btn btn-primary btn-sm');buttons.append(cancel,save);pane.append(buttons);overlay.append(pane);
      overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});document.body.append(overlay);field.focus();
    }catch(e){message(label+' : '+e.message,true);}
  }
  function enhanceDetailFields(k,m,info,extras,calendar){
    // Le crayon sur la fiche est discret et placé sur la donnée, jamais dans un panneau autonome.
    const infoLists=Array.from(document.querySelectorAll('#subscription_info_panel .column:first-child .rows ol'));
    const base=[
      [info,'Bibliothécaire','librarian',null],
      [info,'Bibliothèque','library_id','Bibliothèque'],
      [info,'Localisation','location','Localisation'],
      [info,'Cote','callnumber','Cote'],
      [info,'Période de grâce','grace_period','Période de grâce'],
      [calendar,'Date de début','start_date','Date de début'],
      [calendar,'Périodicité','frequency_id','Périodicité abonnement']
    ];
    for(const [section,fragment,key,label] of base){
      if(!label)continue;
      const li=detailRowByLabel(section,fragment)||(section===info?infoLists.map(x=>detailRowByLabel(x,fragment)).find(Boolean):null);
      if(li)makeDetailPencil(li,key,label,()=>nativeEditKohaField(k,key,label));
    }
    const end=detailRowByLabel(calendar,'Date de fin');
    if(end&&m?.fp?.endDate&&String(m.fp.endDate).slice(0,10)!==String(k.end_date).slice(0,10)){
      makeDetailPencil(end,'end_date','Date de fin',()=>nativeAlignEndDate(k,m,(text,error)=>message(text,!!error)));
    }
    const extraNames=['Abo en ligne','N° d’abonné','Note gestion abonnement','Note pour gestion retards','Numéro casier','Prix base','Prix fascicule','Réajustement','Réclamation(s)'];
    for(const name of extraNames){const li=detailRowByLabel(extras,name);if(li)makeDetailPencil(li,'extra-'+name,name,()=>editExtraOnDetail(k,String(li.querySelector('.label')?.textContent||name).replace(/:\s*$/,'').trim()));}
    // Suivi des fascicules: seuls les événements anormaux sont montrés; la section native 029 reste propriétaire du tableau/calendrier.
    const issueSection=Array.from(document.querySelectorAll('#subscription_info_panel .section-header')).find(x=>/^Fascicules/i.test(x.textContent.trim()));
    if(issueSection){let badge=issueSection.querySelector('[data-pmk-native="follow-issue"]');if(!badge){badge=make('small');badge.dataset.pmkNative='follow-issue';issueSection.append(badge);}
      const issue=issueActions(k);const problems=[...issue.claimable,...issue.late,...issue.missing];
      badge.textContent=problems.length?' · '+problems.length+' à examiner':'';
      if(problems.length){badge.title=problems.slice(0,8).map(x=>String(x.issue_number||x.serial_id||'Fascicule')+' : '+String(x.issue_status_label||x.issue_status_code||'')).join('\n');}
    }
  }
  function audit029ItemStatuses(){
    if(nativePage()!=='serials-collection.pl')return;
    // Reuse PMK029's visible item cards, not inferred statuses from titles/notes.
    const cards=Array.from(document.querySelectorAll('table.subscription-year-table .pmk029-item-card'));
    let seenReceived=0;
    for(const card of cards){
      const chips=Array.from(card.querySelectorAll('.pmk029-item-chip'));
      const chip=chips.find(x=>/^statut\s*:/i.test(String(x.getAttribute('title')||x.textContent).trim()));
      if(!chip)continue;
      const status=String(chip.getAttribute('title')||chip.textContent||'').replace(/^statut\s*:/i,'').trim();
      const onsite=/consultation\s+sur\s+place/i.test(status);
      const discard=/\ba\s+pilonner\b|\bpilon\b|\bdesherb/i.test(status.normalize('NFD').replace(/[\u0300-\u036f]/g,''));
      const recent=seenReceived < cfg.onsiteRecentIssues;
      seenReceived++;
      const potential=(onsite&&!recent)||discard;
      let note=card.querySelector('[data-pmk-native="item-review"]');
      if(!potential){note?.remove();continue;}
      const msg=discard?'À pilonner : statut à vérifier':
        'Ancien fascicule en consultation sur place : à vérifier';
      if(note&&note.dataset.message===msg)continue;
      if(!note){note=make('div');note.dataset.pmkNative='item-review';note.className='pmk-native-item-review';card.append(note);}
      note.dataset.message=msg;note.replaceChildren();
      const label=make('strong','⚠ '+msg);label.style.cssText='font-size:11px;color:#98520e';note.append(label);
      const edit=card.querySelector('a.pmk029-item-edit[href]');
      if(edit){const a=make('a','Corriger l’exemplaire');a.href=edit.href;a.target='_blank';a.rel='noopener';a.style.cssText='margin-left:7px;font-size:11px;text-decoration:underline';note.append(a);}
      note.title='Vérification indicative uniquement : PMK ne modifie pas les statuts des exemplaires et ne suppose pas que le statut est erroné.';
    }
    const anchor=document.querySelector('#ser_serials-collection')||document.body;
    if(anchor.dataset.pmkItemObserver!=='1'){
      anchor.dataset.pmkItemObserver='1';let timer=null;
      const obs=new MutationObserver(records=>{
        // Only recompute when item cards arrive/disappear, not after editing our annotation.
        if(!records.some(x=>Array.from(x.addedNodes||[]).some(n=>n.nodeType===1&&(
           n.matches?.('.pmk029-item-card,.pmk029-item-chip')||n.querySelector?.('.pmk029-item-card,.pmk029-item-chip')
        ))))return;
        clearTimeout(timer);timer=setTimeout(audit029ItemStatuses,180);
      });
      obs.observe(anchor,{subtree:true,childList:true});
    }
  }
  function nativeCollection(){
    if(nativePage()!=='serials-collection.pl')return;
    $('#pmk-native-integration')?.remove();
    const id=activeSubscription(),hit=nativeMatching(id);if(!hit)return;
    const records=issueRowsForSubscription(id),map=new Map(records.map(r=>[String(r.serial_id),r]));
    for(const table of document.querySelectorAll('table.subscription-year-table')){
      const rows=table.tBodies[0]?.rows||[];
      for(const tr of rows){const serial=tr.querySelector('input[name="serialid"]');if(!serial)continue;const r=map.get(String(serial.value));
        const statusCell=tr.querySelector('[data-pmk029-status-key]')||tr.cells[6]||tr.lastElementChild;
        if(!statusCell)continue;let indicator=statusCell.querySelector('[data-pmk-native="issue"]');
        if(!r||!isActionableIssue(r)){indicator?.remove();continue;}
        if(!indicator){indicator=make('div');indicator.dataset.pmkNative='issue';indicator.className='pmk-native-issue';statusCell.append(indicator);}
        const already=Number(r.issue_status_code)===7;
        const missing=[4,41,42,43,44].includes(Number(r.issue_status_code));
        indicator.textContent=already?'Réclamation Koha à suivre':missing?'Manquant — à examiner':'Réclamation possible depuis '+nativeFormatDate(r.claim_eligible_from||r.planned_date);
        indicator.dataset.tone=already?'info':'alert';
        indicator.title=`Fascicule ${r.issue_number||serial.value} · statut ${r.issue_status_label||r.issue_status_code} · ${Number(r.claims_count||0)} réclamation(s) Koha`;
      }
    }
    // Audit contextualisé des statuts d’exemplaire exposés par PMK029.
    audit029ItemStatuses();
    // Réutiliser les états PMK029 déjà posés dans les tableaux : aucun second tableau de fascicules.
    const title=document.querySelector('main h1,#main h1,h1');
    if(title){let n=title.querySelector('[data-pmk-native="claims-counter"]');if(!n){n=make('small');n.dataset.pmkNative='claims-counter';title.append(n);}
      const bad=records.filter(isActionableIssue);n.textContent=bad.length?' · '+bad.length+' fascicule(s) à suivre':'';
    }
  }
  function nativeIssueLabel(r){
    const code=Number(r.issue_status_code),name=String(r.issue_number||'n° '+r.serial_id);
    if(code===7)return 'Réclamé : '+name;
    if([4,41,42,43,44].includes(code))return 'Manquant : '+name;
    if(String(r.claimable_now)==='1')return 'À réclamer : '+name;
    if(code===3)return 'En retard : '+name;
    return (String(r.issue_status_label||'Statut '+code))+': '+name;
  }
  function nativeAlertEntries(k,m){
    const stats=issueActions(k),rows=issueCache.get(String(k.subscription_id))||[];
    const out=[];
    for(const r of rows){
      const code=Number(r.issue_status_code),eligible=String(r.claimable_now)==='1';
      if((code===1&&!eligible)||[2,21,22,23].includes(code))continue;
      if([3,4,41,42,43,44,7].includes(code)||eligible){out.push({label:nativeIssueLabel(r),kind:code===7?'claim':'issue',record:r});}
    }
    for(const p of kohaProblems(k,m).filter(x=>!x.optional&&!x.claim)){
      if(p.field==='fp_unmatched'&&!((dataset||partial)?.subscriptions||[]).length)continue;
      out.push({label:p.label.replace(/^[^\p{L}\p{N}]+/u,''),kind:'check'});
    }
    const ref=String(m?.fp?.ref||'').toUpperCase();
    const data=dataset||partial;
    if(ref){
      const pending=(data?.pendingClaims||[]).filter(x=>String(x.ref||x.RefAbo||'').toUpperCase()===ref);
      if(pending.length)out.push({label:pending.length+' réclamation(s) FP en attente',kind:'fp'});
    }
    return out;
  }
  // L'enregistrement Koha passe exclusivement par le formulaire natif et une relecture.
  // Aucune action d'écriture FP n'est proposée tant que le HAR d'envoi n'est pas confirmé.
  async function nativeAlignEndDate(k,m,feedback){
    // Revalider le rapprochement au moment du clic : aucun cycle futur distinct.
    const fresh=match({_koha:k});
    if(!fresh.fp||String(fresh.fp.ref||'')!==String(m?.fp?.ref||'')||fresh.kind==='renewal'){
      feedback('Correction bloquée : cycle FP non confirmé ou renouvellement distinct.',true);return;
    }
    const target=iso(fresh.fp.endDate),current=iso(k.end_date);
    if(!target||!validDate(target)||!current||target===current){feedback('Pas de différence de date vérifiée.');return;}
    const refs=kohaCommercialRefs(k), exact=refs.includes(String(m?.fp?.ref||'').toUpperCase());
    const allFp=((dataset||partial)?.subscriptions||[]).filter(f=>String(f.ref||'').toUpperCase()===String(m?.fp?.ref||'').toUpperCase());
    const confirmed=exact&&allFp.length===1&&issn(k.issn).length===8&&issn(k.issn)===issn(m.fp.issn)&&(!autoLibrary(m.fp).code||autoLibrary(m.fp).code===String(k.library_id));
    if(!confirmed){feedback('Alignement refusé : la référence DRG, l’ISSN et le destinataire doivent identifier un seul abonnement FP. '+(m.label||'')+' Corrigez le rapprochement avant l’enregistrement.',true);return;}
    if(cfg.allowWrites!==true){feedback('Activez « Autoriser les corrections Koha » dans PMK pour confirmer cette modification.',true);return;}
    const agree=window.confirm('Modifier uniquement la fin de l’abonnement Koha '+k.subscription_id+' ?\n\nActuel : '+nativeFormatDate(current)+'\nFrance Publications : '+nativeFormatDate(target)+'\n\nLe formulaire natif sera relu et le résultat vérifié.');
    if(!agree)return;
    if(target<current&&!window.confirm('Attention : la date FP est ANTÉRIEURE à la date Koha. Cela raccourcira la période de l’abonnement. Confirmer expressément cette réduction ?'))return;
    try{
      const native=await readNative(k.subscription_id);
      const patch=checkedPatch(native,{end_date:target});
      if(!Object.keys(patch).length){feedback('Les dates sont déjà identiques.');return;}
      const body=new URLSearchParams(native.body);
      for(const [key,value] of Object.entries(patch)){const f=native.fields[key];body.set(f.name,f.def.type==='date'?nativeDate(value,f.raw):value);}
      feedback('Enregistrement dans Koha…');
      clearKohaCache();
      await kohaRequest(native.action,body);
      const saved=await readNative(k.subscription_id);
      if(saved.fields.end_date?.value!==target)throw new Error('La date n’a pas été confirmée après relecture Koha.');
      k.end_date=target;saveKohaCache();nativeRefresh();feedback('Date Koha mise à jour et vérifiée : '+nativeFormatDate(target));
    }catch(e){feedback('Correction non confirmée : '+e.message,true);}
  }
  const normalizedSubscriber=value=>{const raw=String(value??'').replace(/\s+/g,'').trim();return /^\d+$/.test(raw)?raw.replace(/^0+(?=\d)/,''):raw.toUpperCase();};
  const primaryCommercialRef=value=>{const refs=String(value??'').toUpperCase().match(/DRG-\d+-\d+/g)||[];return [...new Set(refs)];};
  function addNativeAction(parent,label,url){const a=make('a',label);a.className='btn btn-default btn-sm';a.href=url;a.target='_blank';a.rel='noopener';parent.append(a);return a;}
  function showKohaClaimWorkflow(container,k,record,m={}){
    container.querySelector('[data-pmk-koha-claim-workflow]')?.remove();
    const area=make('section');area.dataset.pmkKohaClaimWorkflow='1';area.className='pmk-follow-item';
    area.append(make('h3','Réclamation du fascicule '+String(record?.issue_number||record?.serial_id||'')));
    const ref=String(m.fp?.ref||''),dest=String(m.fp?.destinationCode||m.fp?.recipientCode||'');
    const info=make('p','Un seul lancement : FP puis Koha, avec contrôles séparés. Koha peut aussi expédier un courriel au fournisseur : vérifiez le modèle de lettre avant de confirmer.');area.append(info);
    const links=make('div');links.className='pmk-follow-actions';links.append(make('small','Si la préparation de l’envoi combiné échoue, les actions Koha restent accessibles ici.'));
    addNativeAction(links,'Suivi natif des réclamations Koha','/cgi-bin/koha/serials/claims.pl');
    addNativeAction(links,'Mettre à jour le fascicule dans Koha','/cgi-bin/koha/serials/serials-edit.pl?subscriptionid='+encodeURIComponent(k.subscription_id)+'&serstatus=1%2C3%2C7%2C4%2C41%2C42%2C43%2C44');
    area.append(links);
    if(!/^DRG-\d+-\d+$/i.test(ref)||!/^\d{4,12}$/.test(dest)){
      area.append(make('p','Envoi FP non disponible : la référence commerciale ou le code destinataire FP n’est pas confirmé pour cet abonnement.'));container.append(area);return;
    }
    const small=make('small','FP '+ref+' · destinataire '+dest+' · fascicule '+String(record.issue_number||record.serial_id));area.append(small);
    const form=make('div');form.className='pmkfp-claim-form';area.append(form);
    const feedback=make('p','Lecture du formulaire officiel France Publications…');feedback.setAttribute('role','status');form.append(feedback);const retry=button('Réessayer la connexion FP',()=>{showKohaClaimWorkflow(container,k,record,m);},'btn btn-default btn-xs');form.append(retry);
    askFpClaim('claim-form',{ref,dest},res=>{
      if(!form.isConnected)return;
      if(res.error){feedback.textContent='Formulaire indisponible : '+res.error+' Aucune réclamation envoyée. Vérifiez le compagnon FP puis réessayez.';return;}
      form.innerHTML='';
      const label=make('label','Motif France Publications');const select=make('select');select.className='form-control';
      for(const opt of res.subjects){const option=make('option',opt.label);option.value=opt.code;select.append(option);}
      if([...select.options].some(o=>o.value==='1'))select.value='1';label.append(select);form.append(label);
      const lbl=make('label','Message à transmettre');const input=make('textarea');input.className='form-control';input.rows=5;
      input.value='Bonjour,\nNous n’avons pas reçu le '+String(record.issue_number||'fascicule concerné')+' de « '+String(k.title||'ce périodique')+' ». Pourriez-vous nous l’expédier ?\nMerci.';
      lbl.append(input);form.append(lbl);
      // Progression par étapes, liée aux réponses réelles des deux services.
      // Pas de pourcentage fictif : chaque étape reste en cours jusqu'à confirmation.
      const progress=make('div');progress.className='pmkfp-claim-progress';progress.hidden=true;
      progress.setAttribute('role','status');progress.setAttribute('aria-live','polite');
      const steps=[
        {key:'prepare',text:'Préparation Koha'},
        {key:'fp',text:'Dépôt France Publications'},
        {key:'koha',text:'Réclamation Koha'}
      ];
      const rows=new Map();
      for(const step of steps){
        const row=make('div');row.className='pmkfp-claim-step';row.dataset.step=step.key;
        const mark=make('span','○');mark.className='pmkfp-claim-step-icon';mark.setAttribute('aria-hidden','true');
        const text=make('span',step.text);text.className='pmkfp-claim-step-label';
        row.append(mark,text);progress.append(row);rows.set(step.key,{row,mark,text,label:step.text});
      }
      function setStep(key,status,extra=''){
        const obj=rows.get(key);if(!obj)return;
        obj.row.dataset.status=status;
        obj.mark.textContent=status==='ok'?'✓':status==='error'?'!':status==='pending'?'○':'○';
        obj.text.textContent=obj.label+(extra?' · '+extra:'');
      }
      function showProgress(){progress.hidden=false;}
      function lockSubmit(text){submit.disabled=true;submit.setAttribute('aria-busy','true');submit.textContent=text;}
      function unlockBeforeDispatch(){submit.disabled=false;submit.removeAttribute('aria-busy');submit.textContent='Réclamer dans FP et Koha';}
      let started=false;
      const submit=button('Réclamer dans FP et Koha',async()=>{
        if(started)return;
        started=true;showProgress();lockSubmit('Préparation…');
        setStep('prepare','running');feedback.textContent='Vérification de la réclamation Koha…';
        let kohaReady;
        try{kohaReady=await prepareKohaClaim(record.serial_id,k.vendor_id);}
        catch(e){setStep('prepare','error','échec');feedback.textContent='Double action impossible : '+e.message+' Utilisez les liens Koha et FP après vérification.';started=false;unlockBeforeDispatch();return;}
        setStep('prepare','ok','prêt');
        if(!confirm('Cette action peut produire deux communications fournisseur (dépôt FP + courriel Koha « '+kohaReady.letter+' »). Confirmer le dépôt FP puis la réclamation native Koha pour le fascicule '+String(record.issue_number||record.serial_id)+' ?')){
          progress.hidden=true;started=false;unlockBeforeDispatch();feedback.textContent='Envoi annulé. Aucune réclamation transmise.';return;
        }
        lockSubmit('Transmission en cours…');
        setStep('fp','running');feedback.textContent='Transmission à France Publications…';
        askFpClaim('claim-submit',{draftId:res.requestId,subject:select.value,message:input.value,confirmed:true},reply=>{
          if(!form.isConnected)return;
          if(!reply.ok){
            setStep('fp','error','non confirmé');
            feedback.textContent='FP non confirmé : '+(reply.error||'Réponse inconnue')+' — aucun envoi Koha effectué. Vérifiez FP avant toute nouvelle tentative.';
            // L'état de l'envoi FP peut être incertain ; ne jamais autoriser de renvoi automatique.
            lockSubmit('Vérification FP nécessaire');submit.removeAttribute('aria-busy');return;
          }
          setStep('fp','ok','confirmé');setStep('koha','running');
          feedback.textContent='France Publications confirmé. Traitement Koha en cours…';
          lockSubmit('Traitement Koha…');clearKohaCache();
          submitKohaClaimPrepared(kohaReady,record.serial_id).then(x=>{
            setStep('koha','ok','confirmé');feedback.textContent='Réclamation terminée : FP confirmé. '+x;
            submit.textContent='Réclamation terminée';submit.removeAttribute('aria-busy');
          }).catch(e=>{
            setStep('koha','error','non confirmé');
            feedback.textContent='FP : confirmé. Koha : non confirmé ('+e.message+'). Ne renvoyez pas la réclamation FP.';
            submit.textContent='Vérification Koha nécessaire';submit.removeAttribute('aria-busy');
          });
        });
      },'btn btn-primary btn-sm');form.append(submit,progress,feedback);
    });
    container.append(area);
  }
  function nativeFollowupDialog(k,m,entries,initialTab){
    document.querySelector('#pmk-native-followup-modal')?.remove();
    const overlay=make('div');overlay.id='pmk-native-followup-modal';overlay.setAttribute('role','presentation');
    const style=make('style');style.textContent=`
      #pmk-native-followup-modal{position:fixed;inset:0;background:rgba(22,37,51,.65);z-index:2147480000;display:grid;place-items:center;padding:16px}
      #pmk-native-followup-modal .pmk-follow-panel{width:min(1040px,98vw);height:min(88vh,900px);background:#fff;color:#263747;border-radius:16px;box-shadow:0 24px 90px #0006;display:flex;flex-direction:column;overflow:hidden;font-size:14px}
      #pmk-native-followup-modal .pmk-follow-head{background:#f4f8fb;border-bottom:1px solid #dae4ee;padding:16px 22px;display:flex;align-items:start;justify-content:space-between;gap:20px}
      #pmk-native-followup-modal .pmk-follow-head h2{font-size:23px;margin:2px 0 6px;line-height:1.25}
      #pmk-native-followup-modal .pmk-follow-meta{color:#556d7b;font-size:12px}
      #pmk-native-followup-modal .pmk-follow-tabs{display:flex;gap:5px;padding:8px 20px;border-bottom:1px solid #e0e8ee;overflow-x:auto;flex-shrink:0}
      #pmk-native-followup-modal .pmk-follow-tabs button{border:0;background:transparent;padding:10px 14px;border-radius:8px;white-space:nowrap;font-weight:600}
      #pmk-native-followup-modal .pmk-follow-tabs button[aria-selected="true"]{background:#155f78;color:#fff}
      #pmk-native-followup-modal .pmk-follow-body{flex:1;overflow:auto;padding:20px 24px}
      #pmk-native-followup-modal [role="tabpanel"][hidden]{display:none!important}
      #pmk-native-followup-modal .pmk-follow-item{border:1px solid #dae5ed;border-radius:10px;padding:12px 14px;margin:0 0 10px;background:#fff}
      #pmk-native-followup-modal .pmk-follow-item strong{display:block;margin-bottom:5px}
      #pmk-native-followup-modal .pmk-follow-item small{display:block;color:#5d7080;line-height:1.5}
      #pmk-native-followup-modal .pmk-follow-item.warning{border-left:4px solid #e4a54c}
      #pmk-native-followup-modal .pmk-follow-item.claim{border-left:4px solid #4b88a9}
      #pmk-native-followup-modal .pmk-follow-footer{border-top:1px solid #e0e8ee;padding:12px 22px;display:flex;gap:8px;flex-wrap:wrap;background:#fbfcfd}
      #pmk-native-followup-modal .pmk-follow-dates{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:12px 0}
      #pmk-native-followup-modal .pmk-follow-date{border:1px solid #d9e4eb;border-radius:9px;padding:12px;background:#fafcfe}
      #pmk-native-followup-modal .pmk-follow-date small{display:block;color:#647889}
      #pmk-native-followup-modal .pmk-follow-date b{font-size:18px}
      #pmk-native-followup-modal .pmk-follow-event-details{margin-top:9px;border-top:1px solid #e1e8ee;padding-top:8px}
      #pmk-native-followup-modal .pmk-follow-event-details summary{cursor:pointer;font-size:12px;color:#155f78;font-weight:600}
      #pmk-native-followup-modal .pmk-follow-event-fields{display:grid;grid-template-columns:minmax(120px,30%) minmax(0,1fr);gap:6px 12px;margin:12px 0 4px;font-size:12px;overflow-wrap:anywhere}
      #pmk-native-followup-modal .pmk-follow-event-fields dt{font-weight:600;color:#536e80}
      #pmk-native-followup-modal .pmk-follow-event-fields dd{margin:0;white-space:pre-wrap}
      #pmk-native-followup-modal .pmk-follow-msg{min-height:20px;margin-top:8px;color:#1b6b51}
      #pmk-native-followup-modal .pmk-follow-msg.error{color:#aa2b22}
      #pmk-native-followup-modal .pmk-follow-actions{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:10px 0}
      #pmk-native-followup-modal .pmk-follow-muted{color:#6c7888;font-size:12px}
      #pmk-native-followup-modal .pmkfp-claim-progress{margin:12px 0;padding:12px 14px;border:1px solid #d8e5ec;background:#f7fafc;border-radius:9px}
      #pmk-native-followup-modal .pmkfp-claim-progress[hidden]{display:none!important}
      #pmk-native-followup-modal .pmkfp-claim-step{display:flex;align-items:center;gap:10px;min-height:30px;color:#607180;font-size:13px}
      #pmk-native-followup-modal .pmkfp-claim-step-icon{width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex:none;border:1px solid #c1ced7;border-radius:50%;font-size:12px;font-weight:700}
      #pmk-native-followup-modal .pmkfp-claim-step[data-status="running"]{color:#155f78;font-weight:600}
      #pmk-native-followup-modal .pmkfp-claim-step[data-status="running"] .pmkfp-claim-step-icon{font-size:0;border:2px solid #c4dbe7;border-top-color:#155f78;animation:pmkfp-claim-spin .85s linear infinite}
      #pmk-native-followup-modal .pmkfp-claim-step[data-status="ok"]{color:#19704c}
      #pmk-native-followup-modal .pmkfp-claim-step[data-status="ok"] .pmkfp-claim-step-icon{border-color:#19704c;background:#eaf8ef}
      #pmk-native-followup-modal .pmkfp-claim-step[data-status="error"]{color:#aa362e}
      #pmk-native-followup-modal .pmkfp-claim-step[data-status="error"] .pmkfp-claim-step-icon{border-color:#aa362e;background:#fff1ef}
      @keyframes pmkfp-claim-spin{to{transform:rotate(360deg)}}
      @media(prefers-reduced-motion:reduce){#pmk-native-followup-modal .pmkfp-claim-step[data-status="running"] .pmkfp-claim-step-icon{animation:none;border-color:#155f78}}
    `;overlay.append(style);
    const panel=make('section');panel.className='pmk-follow-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Suivi de l’abonnement');panel.tabIndex=-1;
    const header=make('header');header.className='pmk-follow-head';const left=make('div');left.append(make('div','SUIVI DES PÉRIODIQUES'),make('h2',k.title));const meta=make('div','Koha '+k.subscription_id+' · '+(k.library_id||'Site non renseigné')+' · '+(m.fp?.ref?'FP '+m.fp.ref:'Référence FP non vérifiée'));meta.className='pmk-follow-meta';left.append(meta);if(k.frequency_label||k.biblio_periodicity){const period=make('div','Périodicité abonnement : '+String(k.frequency_label||'non renseignée')+' · Notice 326$a : '+String(k.biblio_periodicity||'non renseigné'));period.className='pmk-follow-meta';left.append(period);}header.append(left,button('✕ Fermer',()=>overlay.remove(),'btn btn-default btn-sm'));panel.append(header);
    const nav=make('nav');nav.className='pmk-follow-tabs';nav.setAttribute('role','tablist');panel.append(nav);
    const body=make('div');body.className='pmk-follow-body';panel.append(body);
    const panes={};const tab=(id,label)=>{const b=button(label,()=>select(id),'btn btn-default btn-sm');b.setAttribute('role','tab');b.setAttribute('aria-selected','false');nav.append(b);const pane=make('section');pane.setAttribute('role','tabpanel');pane.hidden=true;pane.dataset.tab=id;body.append(pane);panes[id]={b,pane};return pane;};
    const select=id=>{for(const [key,x]of Object.entries(panes)){x.pane.hidden=key!==id;x.b.setAttribute('aria-selected',String(key===id));}};
    const overview=tab('issues','À traiter ('+entries.length+')');
    const issues=entries.filter(e=>e.record),others=entries.filter(e=>!e.record);
    if(!entries.length)overview.append(make('p','Aucun problème détecté par les contrôles actifs.'));
    for(const e of [...issues,...others]){
      const card=make('article');card.className='pmk-follow-item '+(e.kind==='claim'?'claim':'warning');card.append(make('strong',e.label));
      if(e.record){const r=e.record;const facts=['Statut : '+String(r.issue_status_label||r.issue_status_code),'Prévu : '+nativeFormatDate(r.planned_date),'Réclamations Koha : '+String(r.claims_count||0),r.last_claim_date?'Dernière réclamation : '+nativeFormatDate(r.last_claim_date):'',r.claim_eligible_from?'Réclamable depuis : '+nativeFormatDate(r.claim_eligible_from):''].filter(Boolean).join(' · ');card.append(make('small',facts));
        const kc=Number(r.claims_count||0)>0||Number(r.issue_status_code)===7;
        const fpEvents=m?.fp?.ref?[...((dataset||partial)?.claims||[]),...((dataset||partial)?.pendingClaims||[])].filter(x=>String(x.RefAbo||x.ref||'').toUpperCase()===String(m.fp.ref).toUpperCase()):[];
        const number=String(r.issue_number||'').trim();
        const fpVerified=number&&fpEvents.some(x=>[x.Numero,x.numero,x.NumFascicule,x.NumeroFascicule,x.fascicule,x.message,x.TitreLibelle].some(v=>v&&String(v).includes(number)));
        card.append(make('small','Suivi : Koha '+(kc?'réclamé':'non réclamé')+' · FP '+(fpVerified?'réclamation trouvée pour ce numéro':fpEvents.length?'événements présents, numéro non vérifié':'aucune réclamation associée dans les données chargées')));
      }
      if(e.record&&String(e.record.claimable_now)==='1'&&Number(e.record.issue_status_code)!==7){
        card.append(button('Réclamer ce fascicule — Koha + FP',()=>{select('claims');showKohaClaimWorkflow(claims,k,e.record,m);},'btn btn-primary btn-sm'));
      }
      if(e.label.includes('326$a')||e.label.includes('Périodicité')){
        const a=make('a','Corriger la notice 326$a ↗');a.className='btn btn-default btn-sm';a.href='/cgi-bin/koha/cataloguing/addbiblio.pl?biblionumber='+encodeURIComponent(k.biblio_id);a.target='_blank';a.rel='noopener';card.append(make('small','Périodicité de l’abonnement : '+String(k.frequency_label||'Non renseignée')+' · 326$a : '+String(k.biblio_periodicity||'Absent')),a);
      }
      overview.append(card);
    }
    const dates=tab('dates','Échéances et correction');
    dates.append(make('h3','Comparer les dates d’abonnement'));
    const dateGrid=make('div');dateGrid.className='pmk-follow-dates';for(const [label,val]of [['Fin Koha',k.end_date],['Fin France Publications',m.fp?.endDate]]){const box=make('div');box.className='pmk-follow-date';box.append(make('small',label),make('b',val?nativeFormatDate(val):'Non vérifiée'));dateGrid.append(box);}dates.append(dateGrid);
    const different=iso(m.fp?.endDate)&&iso(k.end_date)&&iso(m.fp.endDate)!==iso(k.end_date);
    if(different){const note=make('p','La correction ne modifie que la date de fin Koha, après confirmation.');dates.append(note);const msg=make('div');msg.className='pmk-follow-msg';dates.append(button('Aligner Koha sur FP : '+nativeFormatDate(m.fp.endDate),()=>nativeAlignEndDate(k,m,(text,error)=>{msg.textContent=text;msg.classList.toggle('error',!!error);}), 'btn btn-primary btn-sm'),msg);}
    else dates.append(make('p',m.fp?.endDate?'Dates concordantes : aucune correction nécessaire.':'Impossible de comparer tant que FP n’est pas rapproché.'));
    const claims=tab('claims','Réclamations et réponses');
    const claimToolbar=make('div');claimToolbar.className='pmk-follow-actions';claims.append(claimToolbar);
    const claimableIssues=issues.filter(e=>e.record&&String(e.record.claimable_now)==='1'&&Number(e.record.issue_status_code)!==7);
    if(claimableIssues.length)claimToolbar.append(button('Traiter les fascicules réclamables ('+claimableIssues.length+')',()=>showKohaClaimWorkflow(claims,k,claimableIssues[0].record,m),'btn btn-primary btn-sm'));
    else claimToolbar.append(make('p','Aucun nouveau fascicule confirmé réclamable dans les données Koha chargées.'));

    const fpRef=String(m?.fp?.ref||'').toUpperCase(),data=dataset||partial;
    const same=x=>String(x?.ref||x?.RefAbo||'').toUpperCase()===fpRef;
    // FP : afficher toutes les colonnes utiles réellement lues par le compagnon, sans
    // transformer une cellule Cmd HTML en lien ou en action non vérifiée.
    const claimEvents=[
      {heading:'En attente',type:'pending',rows:data?.pendingClaims||[]},
      {heading:'Historique des réclamations',type:'history',rows:data?.claims||[]},
      {heading:'Réponses FP',type:'reply',rows:data?.replies||[]}
    ];
    const fpText=value=>String(value==null?'':value).replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
    const fpLabels={recla_date:'Date de réclamation',repons_date:'Date de réponse',Date:'Date',Identifiant:'Identifiant de réclamation',RefInterne:'Référence interne',RefAbo:'Référence commerciale',Destinataire:'Destinataire',CodeDestinataire:'Code destinataire',ISSN:'ISSN',Titre:'Titre',TitreLibelle:'Titre',DateDerniereReponse:'Dernière réponse',nbReponses:'Nombre de réponses',nbRelances:'Nombre de relances',Numero:'Numéro',NumFascicule:'Fascicule',NumeroFascicule:'Fascicule',message:'Message',Reponse:'Réponse',Cmd:'Informations / actions FP',Cmd1:'Informations FP'};
    const fpOrder=['recla_date','repons_date','Date','Identifiant','RefInterne','Numero','NumFascicule','NumeroFascicule','fascicule','message','Reponse','nbReponses','nbRelances','DateDerniereReponse','ISSN','Destinataire','CodeDestinataire','TitreLibelle','Titre','RefAbo','Cmd1','Cmd'];
    const fpKeys=x=>[...new Set([...fpOrder,...Object.keys(x||{})])].filter(key=>x?.[key]!=null&&fpText(x[key])!==''&&!['DT_RowId','DT_RowClass','DT_RowData'].includes(key));
    const fpEventKey=x=>[x.Identifiant,x.RefAbo||x.ref,x.recla_date||x.Date,x.TitreLibelle||x.Titre].map(fpText).join('|');
    let count=0;
    const observed=new Map();
    for(const group of claimEvents){
      const hits=fpRef?group.rows.filter(same):[];
      count+=hits.length;
      claims.append(make('h3',group.heading+' ('+hits.length+')'));
      if(!hits.length)continue;
      for(const x of hits.slice(0,75)){
        const eventKey=fpEventKey(x);
        const inOther=eventKey&&observed.has(eventKey)?observed.get(eventKey):'';
        if(eventKey&&!inOther)observed.set(eventKey,group.heading);
        const card=make('article');card.className='pmk-follow-item';
        const date=fpText(x.recla_date||x.repons_date||x.Date);
        const ref=fpText(x.Identifiant);
        card.append(make('strong',[date,ref?'Réf. '+ref:''].filter(Boolean).join(' · ')||'Événement FP'));
        if(inOther)card.append(make('small','Cet événement figure également dans « '+inOther+' » : il ne s’agit pas nécessairement d’une deuxième réclamation.'));
        const title=fpText(x.TitreLibelle||x.Titre);
        if(title)card.append(make('small',title));
        const main=fpText(x.message||x.Reponse||x.Motif||x.Commentaire);
        if(main)card.append(make('p',main));
        const details=make('details');details.className='pmk-follow-event-details';
        details.append(make('summary','Voir le contenu et les données FP ('+fpKeys(x).length+' champs)'));
        const dl=make('dl');dl.className='pmk-follow-event-fields';
        for(const key of fpKeys(x)){
          const dt=make('dt',fpLabels[key]||key),dd=make('dd',fpText(x[key]).slice(0,5000));
          dl.append(dt,dd);
        }
        details.append(dl);card.append(details);claims.append(card);
      }
      if(hits.length>75)claims.append(make('small','Affichage limité aux 75 premiers événements de cette rubrique.'));
    }
    if(!count)claims.append(make('p','Aucun événement FP associé de manière certaine à cette référence.'));
    // Separate states: a Koha claim is NOT proof of a FP submission, and vice versa.
    const kohaIssueRows=issueCache.get(String(k.subscription_id))||[];
    const fpClaimsForRef=fpRef?(data?.claims||[]).filter(same):[];
    const fpPendingForRef=fpRef?(data?.pendingClaims||[]).filter(same):[];
    const kohaClaimsCount=kohaIssueRows.reduce((sum,r)=>sum+Math.max(0,Number(r.claims_count||0)),0);
    const fpClaimsCount=new Set([...fpClaimsForRef,...fpPendingForRef].map(fpEventKey)).size;
    const status=make('article');status.className='pmk-follow-item';status.append(make('strong','État croisé des réclamations'));
    status.append(make('small','Koha : '+(kohaClaimsCount?'réclamation(s) enregistrée(s) ('+kohaClaimsCount+')':'aucune réclamation recensée dans le rapport 5263')+' · FP : '+(fpClaimsCount?'réclamation(s) distincte(s) retrouvée(s) ('+fpClaimsCount+')':fpRef?'aucune réclamation retrouvée dans le périmètre chargé':'non vérifiable (abonnement FP non rapproché)')));
    status.append(make('small',kohaClaimsCount&&fpClaimsCount?'Réclamations présentes dans les deux systèmes — la correspondance fascicule par fascicule reste à contrôler.':kohaClaimsCount?'Réclamations visibles dans Koha uniquement (dans les données chargées).':fpClaimsCount?'Réclamations visibles dans FP uniquement (dans les données chargées).':'Aucune réclamation trouvée dans les jeux chargés ; cela ne prouve pas une absence historique.'));
    claims.insertBefore(status,claims.firstChild);
    const invoicePane=tab('invoices','Factures FP');
    invoicePane.append(make('h3','Factures associées à cet abonnement'));
    const inv=make('div');invoicePane.append(inv);
    const renderInvoices=()=>{
      inv.replaceChildren();
      const linked=m.fp;
      if(!linked){inv.append(make('p','Abonnement FP non rapproché : impossible de rattacher une facture avec certitude.'));return;}
      const idList=invoiceNumbers(linked);
      const order=String(linked.purchaseOrder||'').trim();
      const ledger=order?(data?.invoices||[]).filter(x=>String(x.fac_boncom||'').trim()===order):[];
      const ids=new Set([...idList,...ledger.map(x=>String(x.totfac_numero||'').trim()).filter(x=>/^\d{1,14}$/.test(x))]);
      if(!ids.size)inv.append(make('p',linked.detailRead?'Aucune facture rattachable dans la fiche FP récupérée.':'La fiche FP détaillée doit être chargée pour identifier les numéros de facture.'));
      for(const id of ids){const card=make('article');card.className='pmk-follow-item';card.append(make('strong','Facture FP '+id));const a=fpLink('Ouvrir / télécharger la facture FP '+id,'/ajx/getFacture.php?nFact='+encodeURIComponent(id));card.append(a);inv.append(card);}
      inv.append(make('small','Ouverture depuis Koha via la session France Publications authentifiée. Le document n’est pas importé ni enregistré dans Koha ; un bon de commande partagé ne prouve pas un rattachement exclusif.'));
      if(!linked.detailRead){const b=button('Charger la fiche FP détaillée',()=>requestDetail(linked,b),'btn btn-default btn-sm');inv.append(b);}
    };
    renderInvoices();
    const refs=primaryCommercialRef(k.internal_notes+' '+k.notes), fpCommercial=String(m.fp?.ref||'').toUpperCase();
    const referenceSection=make('section');referenceSection.className='pmk-follow-item';referenceSection.append(make('strong','Référence commerciale DRG'));
    referenceSection.append(make('small','Koha : '+(refs.join(', ')||'absente')+' · FP : '+(fpCommercial||'non rapprochée')));
    if(fpCommercial&&refs.length&& !refs.includes(fpCommercial))referenceSection.append(make('p','Les références DRG diffèrent : il peut s’agir d’un nouveau cycle. Vérifier avant de modifier la note interne Koha.'));
    claims.append(referenceSection);

    const help=make('p','La transmission FP utilise le formulaire officiel observé. L’enregistrement Koha reste une action native distincte et doit être vérifié après le dépôt.');help.style.color='#91600b';claims.append(help);
    const footer=make('footer');footer.className='pmk-follow-footer';for(const [label,url]of [['Fiche Koha','subscription-detail.pl'],['État des collections','serials-collection.pl'],['Bulletiner / statuts','serials-edit.pl']]){const a=make('a',label);a.className='btn btn-default btn-sm';a.href='/cgi-bin/koha/serials/'+url+'?subscriptionid='+encodeURIComponent(k.subscription_id);a.target='_blank';a.rel='noopener';footer.append(a);}panel.append(footer);
    select(initialTab&&panes[initialTab]?initialTab:(issues.length?'issues':different?'dates':'claims'));overlay.append(panel);document.body.append(overlay);panel.focus();
    overlay.addEventListener('mousedown',e=>{if(e.target===overlay)overlay.remove();});overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();overlay.remove();}});
  }
  // Les crayons restent accessibles même si les écritures PMK sont désactivées.
  // Les champs d'abonnement sont sauvegardés via le formulaire Koha puis relus.
  function nativePencil(cell,key,label,onClick){
    let b=cell.querySelector('[data-pmk-native="'+key+'"]');
    if(!b){b=button('✎',onClick,'btn btn-link btn-xs');b.dataset.pmkNative=key;b.classList.add('pmk-native-pencil');b.style.cssText='margin-left:3px;padding:0 2px;font-size:11px;line-height:1;color:#79838c;vertical-align:baseline;border:0;background:transparent;opacity:.85';cell.append(b);}
    b.title=label;b.setAttribute('aria-label',label);return b;
  }
  async function nativeEditKohaField(k,key,label,suggestedValue){
    if(!cfg.allowWrites){message('Activez « Autoriser les corrections Koha » dans les réglages PMK pour modifier '+label+'.',true);return;}
    const field=EDIT_FIELDS.find(f=>f.key===key);if(!field)return;
    try{
      const form=await readNative(k.subscription_id),existing=form.fields[key];
      if(!existing)throw new Error('Champ '+label+' absent du formulaire natif Koha.');
      let proposed;
      if(existing.choices&&['itemtype','location'].includes(key)){
        proposed=await new Promise(resolve=>{
          const overlay=make('div');overlay.style.cssText='position:fixed;inset:0;z-index:2147483500;display:grid;place-items:center;background:#101e3088;padding:16px';
          const panel=make('div');panel.style.cssText='background:white;color:#222;padding:22px;border-radius:12px;max-width:560px;width:100%;box-shadow:0 15px 55px #0005';
          panel.append(make('h3','Corriger '+label));panel.append(make('p','Choix autorisés lus directement dans le formulaire Koha pour l’abonnement '+k.subscription_id+'.'));
          const sel=make('select');sel.className='form-control';sel.setAttribute('aria-label',label);
          for(const ch of existing.choices){const op=make('option',ch.label);op.value=ch.value;sel.append(op);}sel.value=existing.value;
          panel.append(sel);const actions=make('div');actions.style.cssText='display:flex;justify-content:flex-end;gap:8px;margin-top:15px';
          const finish=value=>{overlay.remove();resolve(value);};
          actions.append(button('Annuler',()=>finish(null)),button('Valider le choix',()=>finish(sel.value),'btn btn-primary btn-sm'));panel.append(actions);overlay.append(panel);overlay.addEventListener('click',e=>{if(e.target===overlay)finish(null);});document.body.append(overlay);sel.focus();
        });
      }else proposed=window.prompt('Modifier '+label+' — abonnement '+k.subscription_id+'\nValeur Koha actuelle : '+String(existing.value??'')+(suggestedValue!==undefined?'\nProposition France Publications : '+String(suggestedValue)+'\nVérifiez le cycle commercial avant de remplacer la référence.':''),suggestedValue===undefined?String(existing.value??''):String(suggestedValue));
      if(proposed===null)return;
      const target=key==='end_date'?iso(proposed):String(proposed);
      if(key==='end_date'&&!validDate(target))throw new Error('Utilisez une date au format AAAA-MM-JJ.');
      const patch=checkedPatch(form,{[key]:target});
      if(!Object.keys(patch).length){message('Valeur déjà identique.');return;}
      if(!window.confirm('Confirmer la correction dans Koha ?\n'+label+'\n'+String(existing.value||'—')+' → '+target))return;
      const body=new URLSearchParams(form.body);body.set(existing.name,field.type==='date'?nativeDate(target,existing.raw):target);
      clearKohaCache();await kohaRequest(form.action,body);
      const saved=await readNative(k.subscription_id);
      if(String(saved.fields[key]?.value??'')!==target)throw new Error('Enregistrement non confirmé par relecture.');
      k[key]=target;saveKohaCache();nativeRefresh();message(label+' corrigé et vérifié dans Koha.');
    }catch(e){message(label+' : '+e.message,true);}
  }
  // Champs supplémentaires Koha : découverte par le libellé du formulaire réel.
  // Pas d'hypothèse sur les identifiants configurés dans cette installation.
  function nativeExtraControl(native,label){
    const wanted=label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
    const normalize=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
    const labels=Array.from(native.form.querySelectorAll('label,th,.label,dt'))
      .filter(el=>normalize(el.textContent)===wanted);
    const candidates=[];
    for(const el of labels){
      const id=el.getAttribute('for');
      let input=id?native.form.querySelector('#'+(window.CSS?.escape?CSS.escape(id):id)):null;
      if(!input){const scope=el.closest('.form-group,.row,li,tr,dd,div');input=scope?.querySelector('input[name]:not([type=hidden]),select[name],textarea[name]');}
      if(input&&input.name&&native.body.getAll(input.name).length===1&&!input.disabled&&!input.readOnly)candidates.push(input);
    }
    const unique=[...new Set(candidates)];
    if(unique.length!==1)throw new Error('Champ supplémentaire « '+label+' » non identifié sans ambiguïté dans le formulaire Koha.');
    return unique[0];
  }
  async function nativeEditAdditional(k,label,fpValue){
    if(!cfg.allowWrites){message('Activez « Autoriser les corrections Koha » dans PMK.',true);return;}
    try{
      const native=await readNative(k.subscription_id),c=nativeExtraControl(native,label);
      const old=String(c.value??''),target=String(fpValue??'').trim();
      if(!target)throw new Error('La valeur FP n’est pas disponible.');
      const popup=document.createElement('div');popup.className='pmkfp-extra-overlay';popup.style.cssText='position:fixed;inset:0;background:#172537aa;z-index:2147483000;display:grid;place-items:center;padding:20px';
      const box=make('div');box.style.cssText='background:white;color:#18202a;border-radius:12px;width:min(560px,100%);padding:22px;box-shadow:0 20px 50px #0005';
      box.append(make('h3','Corriger le numéro d’abonné'));
      box.append(make('p','Abonnement Koha '+k.subscription_id+' · valeur actuelle : '+(old||'non renseignée')));
      box.append(make('p','Valeur proposée par France Publications : '+target));
      const inp=make('input');inp.className='form-control';inp.value=target;box.append(inp);
      const status=make('p','Seul ce champ supplémentaire sera modifié.');box.append(status);
      const actions=make('div');actions.style.cssText='display:flex;gap:8px;justify-content:flex-end;margin-top:14px';
      const cancel=button('Annuler',()=>popup.remove());
      const save=button('Enregistrer dans Koha',async()=>{
        const value=inp.value.trim();if(!value||value.length>200){status.textContent='Valeur invalide.';return;}
        if(!confirm('Enregistrer '+value+' comme numéro d’abonné Koha '+k.subscription_id+' ?'))return;
        save.disabled=true;cancel.disabled=true;status.textContent='Enregistrement et contrôle dans Koha…';
        try{const body=new URLSearchParams(native.body);body.set(c.name,value);clearKohaCache();await kohaRequest(native.action,body);
          const readBack=await readNative(k.subscription_id);const check=nativeExtraControl(readBack,label);
          if(String(check.value??'').trim()!==value)throw new Error('Le champ n’a pas été confirmé après relecture.');
          popup.remove();nativeRefresh();message('Numéro d’abonné corrigé et vérifié.');
        }catch(e){status.textContent='Non confirmé : '+e.message;save.disabled=false;cancel.disabled=false;}
      },'btn btn-primary btn-sm');actions.append(cancel,save);box.append(actions);popup.append(box);popup.addEventListener('click',e=>{if(e.target===popup)popup.remove();});document.body.append(popup);
    }catch(e){message('Numéro d’abonné : '+e.message,true);}
  }
  // Préparation de l'action native des réclamations Koha. Elle peut envoyer un
  // courriel fournisseur : ne jamais la déclencher sans confirmation explicite.
  async function prepareKohaClaim(serialId,supplierId){
    if(!/^\d+$/.test(String(serialId))||!/^\d+$/.test(String(supplierId)))throw Error('Identifiant fascicule ou fournisseur Koha absent.');
    const r=await fetch('/cgi-bin/koha/serials/claims.pl?supplierid='+encodeURIComponent(supplierId),{credentials:'same-origin',cache:'no-store'});
    if(!r.ok)throw Error('Réclamations Koha : HTTP '+r.status);
    const doc=new DOMParser().parseFromString(await r.text(),'text/html');
    const candidates=Array.from(doc.forms).filter(f=>Array.from(f.querySelectorAll('input[name="serialid"]')).some(x=>x.value===String(serialId)));
    if(candidates.length!==1)throw Error('Le formulaire Koha des réclamations ne présente pas ce fascicule ; aucun envoi Koha effectué.');
    const form=candidates[0];
    // L'action HTML peut être relative (claims.pl), vide, ou ne pas être renseignée.
    // La résoudre par rapport à la page effectivement lue, jamais à la page de recherche courante.
    const actionRaw=(form.getAttribute('action')||'').trim();
    const pageURL=new URL(r.url||'/cgi-bin/koha/serials/claims.pl',location.origin);
    const url=new URL(actionRaw||pageURL.href,pageURL.href);
    // N'autoriser que le point de dépôt natif, sur la même origine. Ne pas envoyer vers un endpoint inconnu.
    if(url.origin!==location.origin||url.pathname.replace(/\/+$/,'')!=='/cgi-bin/koha/serials/claims.pl'){
      throw Error('Action Koha non reconnue ('+url.pathname+'). Aucun envoi effectué.');
    }
    const code=Array.from(form.querySelectorAll('select[name="letter_code"] option')).find(o=>o.value&&!o.disabled);
    if(!code)throw Error('Modèle de lettre de réclamation Koha absent : enregistrement automatique non disponible.');
    const body=new URLSearchParams();for(const [key,val] of new FormData(form).entries())if(typeof val==='string'&&key!=='serialid')body.append(key,val);
    body.set('serialid',String(serialId));body.set('letter_code',code.value);
    return {url:url.href,body,method:(form.method||'get').toUpperCase(),letter:code.textContent.trim()};
  }
  async function submitKohaClaimPrepared(prepared,serialId){
    const init={method:prepared.method,credentials:'same-origin',cache:'no-store',redirect:'follow'};
    let target=prepared.url;
    if(init.method==='POST'){init.headers={'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'};init.body=prepared.body.toString();}
    else{const u=new URL(target);for(const [k,v] of prepared.body.entries())u.searchParams.append(k,v);target=u.href;}
    const response=await fetch(target,init);
    if(!response.ok||new URL(response.url).origin!==location.origin)throw Error('Résultat Koha incertain (HTTP '+response.status+').');
    const html=await response.text();if(/connexion|login|permission denied/i.test(new DOMParser().parseFromString(html,'text/html').title))throw Error('Koha demande une connexion ou une autorisation.');
    clearKohaCache();
    // Le HTTP 200 peut être une page avec erreur métier ; relire le rapport.
    issueRowsPromise=null;
    try{
      const table=await readIssueReport();
      const issue=[...table.values()].flat().find(x=>String(x.serial_id)===String(serialId));
      if(issue&&(Number(issue.claims_count||0)>0||Number(issue.issue_status_code)===7))return 'Koha : réclamation retrouvée dans le rapport 5263 ('+Number(issue.claims_count||0)+' événement(s)).';
      return 'Koha : requête reçue, mais réclamation NON confirmée par le rapport 5263. Contrôle nécessaire, ne pas renvoyer FP.';
    }catch(e){return 'Koha : requête reçue, contrôle impossible ('+e.message+'). Ne pas renvoyer FP.';}

  }
  function nativeSearch(){
    if(nativePage()!=='serials-search.pl')return;
    $('#pmk-native-searchbar')?.remove();
    const tables=Array.from(document.querySelectorAll('#opened_panel table,#closed_panel table')).filter(t=>t.tBodies.length);
    for(const table of tables){
      const enhance=()=>{for(const tr of table.tBodies[0]?.rows||[]){
        const check=tr.querySelector('input[name="subscriptionid"]');if(!check)continue;
        const id=String(check.value),k=koha.find(x=>String(x.subscription_id)===id);
        if(!k)continue;const m=fpForKoha(k);
        const headers=Array.from(table.tHead?.rows[0]?.cells||[]).map(x=>x.textContent.trim().toLowerCase());
        const endIndex=headers.findIndex(x=>x.includes('expiration')),titleIndex=headers.findIndex(x=>x.includes('titre')),issnIndex=headers.findIndex(x=>x==='issn'),actionsIndex=headers.findIndex(x=>x==='actions');
        const endCell=endIndex>=0?tr.cells[endIndex]:null,titleCell=titleIndex>=0?tr.cells[titleIndex]:null,issnCell=issnIndex>=0?tr.cells[issnIndex]:null,actionsCell=actionsIndex>=0?tr.cells[actionsIndex]:null;
        const noticeURL=k.biblio_id?'/cgi-bin/koha/catalogue/detail.pl?biblionumber='+encodeURIComponent(k.biblio_id):'';
        const noticeEditURL=k.biblio_id?'/cgi-bin/koha/cataloguing/addbiblio.pl?biblionumber='+encodeURIComponent(k.biblio_id):'';
        if(issnCell&&noticeEditURL){
          const existing=issnCell.querySelector('[data-pmk-native="issn-edit"]');
          const kohaIssn=String(k.issn||'').replace(/[^0-9X]/gi,'').toUpperCase();
          // Un ISSN different ne doit pas masquer sa propre anomalie en empechant le match.
          // Diagnostic independant : meme famille DRG + destinataire FP confirme.
          const familyMismatch=familyIssnDiagnostic(k,visibleCommercialRefs(tr.cells[headers.findIndex(x=>x==='notes')]));
          const fpIssn=String(m.fp?.issn||familyMismatch?.fp||'').replace(/[^0-9X]/gi,'').toUpperCase();
          const differs=!!(kohaIssn&&fpIssn&&kohaIssn!==fpIssn);
          if(!differs)existing?.remove();
          else if(existing)existing.title='ISSN différents : Koha '+k.issn+' · FP '+(m.fp?.issn||familyMismatch?.fp||'')+' — vérifier avant correction';
          else if(!existing){const a=make('a','✎');a.dataset.pmkNative='issn-edit';a.href=noticeEditURL;a.target='_blank';a.rel='noopener';a.className='btn btn-link btn-xs';a.style.cssText='margin-left:3px;padding:0 2px;font-size:11px;color:#79838c';a.title='ISSN différents : Koha '+k.issn+' · FP '+(m.fp?.issn||familyMismatch?.fp||'')+' — vérifier la notice et le contrat FP avant de corriger';a.setAttribute('aria-label',a.title);issnCell.append(a);}
        }
        if(actionsCell&&noticeURL&&!actionsCell.querySelector('[data-pmk-native="notice-link"]')){const a=make('a','Notice');a.dataset.pmkNative='notice-link';a.href=noticeURL;a.className='btn btn-default btn-xs';a.style.marginLeft='5px';a.title='Voir la notice bibliographique';actionsCell.append(a);}
        // Accès direct au formulaire natif de modification de cet abonnement.
        if(actionsCell&&!actionsCell.querySelector('[data-pmk-native="subscription-edit-link"]')){
          const edit=make('a','Modifier');
          edit.dataset.pmkNative='subscription-edit-link';
          edit.href=nativeURL(id);
          edit.className='btn btn-default btn-xs';
          edit.style.marginLeft='5px';
          edit.title='Modifier cet abonnement dans le formulaire natif Koha';
          actionsCell.append(edit);
        }
        // Une seule entrée « Suivi FP » regroupe les factures et les contrôles.
        if(actionsCell){let suivi=actionsCell.querySelector('[data-pmk-native="invoice-link"]');if(!suivi){suivi=button('Suivi FP',()=>{},'btn btn-default btn-xs');suivi.dataset.pmkNative='invoice-link';suivi.style.marginLeft='5px';actionsCell.append(suivi);}suivi.textContent='Suivi FP';suivi.title='Factures, réclamations et contrôles France Publications';suivi.onclick=()=>nativeFollowupDialog(k,fpForKoha(k),nativeAlertEntries(k,fpForKoha(k)));}
        // Compare customer numbers only when both sources contain a real value.
        // This is a Koha additional field, not the DRG reference stored in Notes.
        const subscriberIndex=headers.findIndex(x=>/n[°o].*abonn[ée]/i.test(x));
        const subscriberCell=subscriberIndex>=0?tr.cells[subscriberIndex]:null;
        if(subscriberCell){
          const kohaNumber=(subscriberCell.querySelector('[data-pmk-native="subscriber"]')?subscriberCell.childNodes[0]?.textContent:subscriberCell.textContent||'').replace(/\s+/g,' ').trim();
          const fpNumber=String(m.fp?.subscriberNumber||'').replace(/\s+/g,' ').trim();
          const diffNumber=kohaNumber&&fpNumber&&kohaNumber!=='N.C.'&&normalizedSubscriber(kohaNumber)!==normalizedSubscriber(fpNumber);
          nativeNote(subscriberCell,diffNumber?'⚠ FP : '+fpNumber:'',diffNumber?'alert':'info','subscriber');
          if(diffNumber){const ann=subscriberCell.querySelector('[data-pmk-native="subscriber"]');if(ann)ann.title='Numéro d’abonné Koha : '+kohaNumber+' · FP : '+fpNumber+' · champ supplémentaire Koha à vérifier';}
          subscriberCell.querySelector('[data-pmk-native="subscriber-pencil"]')?.remove();
          if(diffNumber){
            nativePencil(subscriberCell,'subscriber-pencil','Corriger le N° d’abonné Koha : '+kohaNumber+' · FP : '+fpNumber,()=>{
              nativeEditAdditional(k,'N° d’abonné',fpNumber);
            });
          }
        }

        const locIndex=headers.findIndex(x=>x.includes('localisation'));const locCell=locIndex>=0?tr.cells[locIndex]:null;
        if(locCell){
          const loc=String(k.location||'').trim(),typ=String(k.itemtype_label||k.itemtype||'').trim();
          nativeNote(locCell,!typ?'⚠ Type de document manquant':'',!typ?'alert':'info','itemtype');
          if(!typ)nativePencil(locCell,'itemtype-pencil','Renseigner le type de document',()=>nativeEditKohaField(k,'itemtype','type de document'));
          else locCell.querySelector('[data-pmk-native="itemtype-pencil"]')?.remove();
          if(!loc){nativeNote(locCell,'Localisation manquante','alert','missing-location');nativePencil(locCell,'location-pencil','Renseigner la localisation',()=>nativeEditKohaField(k,'location','localisation'));}
          else{locCell.querySelector('[data-pmk-native="missing-location"]')?.remove();locCell.querySelector('[data-pmk-native="location-pencil"]')?.remove();}
        }
        const notesIndex=headers.findIndex(x=>x==='notes'||x.includes('note'));
        const notesCell=notesIndex>=0?tr.cells[notesIndex]:null;
        if(notesCell){
          const nativeRefs=visibleCommercialRefs(notesCell);
          const kohaRefs=[...new Set([...nativeRefs,...kohaCommercialRefs(k)])];
          const diagnostic=commercialRefDiagnostic(k,m,nativeRefs);
          const mismatch=!!(diagnostic?.ref&&nativeRefs.length&&!nativeRefs.includes(diagnostic.ref)&&!nativeRefs.some(ref=>commercialRef(ref)?.family&&commercialRef(ref)?.family===commercialRef(diagnostic.ref)?.family));
          const ambiguous=!!diagnostic?.ambiguous;
          const uncertain=!mismatch&&!ambiguous&&nativeRefs.length>0&&(m.kind==='unknown'||!!diagnostic?.unverified||!!diagnostic?.unavailable);
          const label=mismatch?'⚠ Référence FP à vérifier : '+diagnostic.ref+(diagnostic.confidence==='candidate'?' (site non confirmé)':''):
            ambiguous?'⚠ Plusieurs références FP possibles — rapprochement nécessaire':
            uncertain?'FP non rapproché · rechercher dans FP':'';
          nativeNote(notesCell,label,mismatch||ambiguous?'alert':'info','drg-ref');
          const ann=notesCell.querySelector('[data-pmk-native="drg-ref"]');
          if(ann)ann.title=mismatch?'Koha : '+nativeRefs.join(', ')+' · FP : '+diagnostic.ref+' · '+diagnostic.reason:'Plusieurs cycles commerciaux candidats ; aucune valeur proposée automatiquement.';
          if(!mismatch){
            notesCell.querySelector('[data-pmk-native="notes-pencil"]')?.remove();
            const review=uncertain||ambiguous;
            if(review)nativePencil(notesCell,'drg-review-pencil','Rechercher la référence dans FP et proposer sa correction Koha',()=>nativeReviewDrg(k,nativeRefs));
            else notesCell.querySelector('[data-pmk-native="drg-review-pencil"]')?.remove();
          }
          else {notesCell.querySelector('[data-pmk-native="drg-review-pencil"]')?.remove();nativePencil(notesCell,'notes-pencil','Examiner la référence FP puis corriger la note Koha',async()=>{
            // Re-read the ORIGINAL Koha edit form. Never replace a reference only
            // inferred from the table or SQL in an unrelated field.
            try{
              const form=await readNative(k.subscription_id);
              const matches=['internal_notes','notes'].flatMap(key=>{
                const f=form.fields[key];return f?primaryCommercialRef(f.value).filter(ref=>nativeRefs.includes(ref)).map(ref=>({key,ref})):[];
              });
              if(matches.length!==1){
                const reason=matches.length?'Plusieurs références retrouvées dans le formulaire Koha.':'Référence affichée absente des champs modifiables du formulaire Koha.';
                message(reason+' Correction automatique désactivée pour éviter une mauvaise écriture.',true);
                return;
              }
              const {key,ref}=matches[0];
              if(!window.confirm('Référence affichée : '+ref+'\nRéférence FP candidate : '+diagnostic.ref+'\n'+diagnostic.reason+'\n\nVérifiez le cycle commercial avant de confirmer.'))return;
              const f=form.fields[key];
              const proposed=String(f.value).replace(ref,diagnostic.ref);
              nativeEditKohaField(k,key,key==='notes'?'note publique / référence DRG':'note interne / référence DRG',proposed);
            }catch(e){message('Contrôle de la référence DRG : '+e.message,true);}
          });}
        }
        if(endCell){
          // Retirer les anciennes annotations (réexécution après actualisation FP).
          endCell.querySelector('[data-pmk-native="expiry"]')?.remove();
          endCell.querySelector('[data-pmk-native="expiry-compact"]')?.remove();
          const inline=make('span');inline.dataset.pmkNative='expiry-compact';
          const status=appendCompactFpStatus(inline,k,m);
          if(inline.childNodes.length)endCell.append(inline);
          const hasFp=Array.isArray((dataset||partial)?.subscriptions)&&((dataset||partial).subscriptions.length>0);
          if(!inline.childNodes.length&&hasFp&&m.label?.includes('Plusieurs cycles'))nativeNote(endCell,'⚠ FP : cycles à départager','alert','expiry');
          if(!status.diff||!m.fp||m.kind==='unknown')endCell.querySelector('[data-pmk-native="expiry-pencil"]')?.remove();
          else nativePencil(endCell,'expiry-pencil','Comparer et corriger la date Koha à partir de FP (vérification des identifiants obligatoire)',()=>nativeFollowupDialog(k,m,nativeAlertEntries(k,m)));
          endCell.querySelector('[data-pmk-native="expiry-action"]')?.remove();
        }
        if(titleCell){const entries=nativeAlertEntries(k,m);
          let area=titleCell.querySelector('[data-pmk-native="issues"]');
          if(!entries.length){area?.remove();continue;}
          if(!area){area=make('div');area.dataset.pmkNative='issues';area.className='pmk-native-annotation';titleCell.append(area);}
          area.replaceChildren();
          for(const e of entries.slice(0,2)){
            const tag=make('span',e.label);tag.className='pmk-native-inline-alert';
            tag.style.cssText='display:block;width:fit-content;margin:3px 0 0;padding:2px 6px;border-radius:4px;background:'+(e.kind==='claim'?'#eef1f5':'#fff3de')+';color:#704610;font-size:11px';
            area.append(tag);
            if(e.label.includes('326$a')||e.label.includes('Périodicité')){
              const notice=make('a','Modifier 326$a ↗');notice.href='/cgi-bin/koha/cataloguing/addbiblio.pl?biblionumber='+encodeURIComponent(k.biblio_id);notice.target='_blank';notice.rel='noopener';notice.className='btn btn-link btn-xs';notice.title='Périodicité abonnement : '+String(k.frequency_label||'—')+' · 326$a : '+String(k.biblio_periodicity||'—');area.append(notice);
            }
          }
          const more=button(entries.length>2?'+'+(entries.length-2)+' · Détails':'Détails',()=>nativeFollowupDialog(k,m,entries),'btn btn-link btn-xs');
          more.title=entries.map(x=>x.label).join('\n');more.style.cssText='margin-left:4px;font-size:11px;padding:0 3px';area.append(more);
        }
      }};
      enhance();if(!table.dataset.pmkNativeListener){table.dataset.pmkNativeListener='1';if(window.jQuery)window.jQuery(table).on('draw.dt.pmkNative',enhance);}
    }
    const nativeActions=document.querySelector('#opened_panel .actions,#serialstabs .actions');
    if(nativeActions&&!nativeActions.querySelector('[data-pmk-native="tools"]')){
      annualTools(nativeActions);
    }
  }
  // Interface exclusivement native : le conteneur interne est un service de données invisible.
  // Aucun tableau PMK autonome, y compris sur serials-home.pl.
  // Contrats FP sans correspondance Koha : une comparaison sur les jeux complets,
  // jamais sur la seule page courante du tableau DataTables.
  const FP_CREATE_DRAFT='pmk.fp.create.draft.v1';
  const compactTitle=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let fpUnlinkedStats=null;
  function fpUnlinkedRecords(){
    fpUnlinkedStats=null;
    // Ne pas accepter un relevé FP partiel : il fausserait les absences.
    const d=dataset?.complete?dataset:(partial?.complete?partial:null);
    if(!kohaLoaded||!d||!Array.isArray(d.subscriptions))return null;
    const unique=new Map();
    for(const f of d.subscriptions){if(!f?.ref)continue;unique.set(String(f.ref)+'|'+String(f.destinationCode||''),f);}
    const all=[...unique.values()];
    const stats={total:all.length,network:0,matched:0,guarded:0,missing:0,unrecognized:0};
    // Reconnaissance du DESTINATAIRE du réseau, indépendante des notes DRG.
    // Ne jamais exclure un contrat simplement parce que l'API des bibliothèques
    // ne renseigne pas l'adresse ou que FP omet « médiathèque » dans le libellé.
    const destinations={
      AMP:['AMPUS'],BAR:['BARGEMON'],CAL:['CALLAS'],CLA:['CLAVIERS'],
      COM:['COMPS SUR ARTUBY','COMPS'],DRA:['DRAGUIGNAN'],FIG:['FIGANIERES','FIGANIERE'],
      FLA:['FLAYOSC'],LMO:['LA MOTTE'],MUY:['LE MUY'],ARC:['LES ARCS'],
      LOR:['LORGUES'],MON:['MONTFERRAT'],SAL:['SALERNES'],VID:['VIDAUBAN'],
      MDB:['MEDIABUS','BIBLIOBUS']
    };
    const normalizeSite=x=>['BIB','RMDB','MDB'].includes(String(x||'').toUpperCase())?'MDB':String(x||'').toUpperCase();
    const networkSite=f=>{
      const configured=lines(cfg.branchMap).get(String(f.destinationCode||''));
      const configuredSite=normalizeSite(configured);
      if(destinations[configuredSite])return configuredSite;
      const dest=words([f.destination,f.recipient,f.recipientName,f.destinationName].filter(Boolean).join(' '));
      // Exiger des mots entiers pour éviter qu'un nom court soit trouvé dans une adresse.
      const found=Object.entries(destinations).filter(([code,aliases])=>aliases.some(alias=>(' '+dest+' ').includes(' '+alias+' ')));
      if(found.length===1){
        // Plusieurs lieux différents peuvent exister dans une même commune.
        // Pour un libellé très long, vérifier une mention de bibliothèque,
        // sauf si l'adresse précise du site est connue de Koha.
        const [code]=found[0];
        const form=String(f.destination||'').trim();
        const known=autoLibrary(f);
        if(known?.code&&normalizeSite(known.code)===code)return code;
        if(code==='DRA'&&dest.length>45&&!/(?:MEDIATHEQUE|BIBLIOTHEQUE|JACQUELINE|ROMILLY|CHABRAN)/.test(dest))return '';
        return code;
      }
      // Un code FP déjà associé manuellement est également suffisant.
      return '';
    };
    const output=[];
    for(const f of all){
      const site=networkSite(f);
      if(!site){stats.unrecognized++;continue;}
      stats.network++;
      const m=match(f);
      if(m?.koha){stats.matched++;continue;}
      const cf=commercialRef(f.ref);
      if(cf&&koha.some(k=>kohaCommercialRefs(k).some(x=>commercialRef(x)?.family===cf.family)&&normalizeSite(k.library_id)===site)){
        stats.guarded++;continue;
      }
      const ft=compactTitle(f.title),sameKoha=koha.filter(k=>compactTitle(k.title)===ft&&normalizeSite(k.library_id)===site);
      const sameFp=all.filter(x=>compactTitle(x.title)===ft&&networkSite(x)===site);
      if(ft&&sameKoha.length===1&&sameFp.length===1){stats.guarded++;continue;}
      output.push(f);
    }
    stats.missing=output.length;
    fpUnlinkedStats=stats;
    return output;
  }
  // Site de réception : les anciens abonnements utilisent parfois BIB pour
  // le Médiabus, mais la liste native des bibliothèques utilise MDB.
  const fpCreationSite=code=>['BIB','RMDB','MDB'].includes(String(code||'').toUpperCase())?'MDB':String(code||'').toUpperCase();
  const fpCreationMark=code=>fpCreationSite(code)==='MDB'?'BIB':String(code||'').toUpperCase();
  function fpCreationAudience(f){
    // Sur un titre déjà présent, conserver uniquement une classification
    // homogène dans les abonnements Koha ; sinon indice explicite du titre FP.
    const same=koha.filter(k=>issn(f.issn)&&issn(k.issn)===issn(f.issn));
    const types=new Set(same.map(k=>String(k.itemtype||'').toUpperCase()).filter(x=>x==='PERI'||x==='PERIJ'));
    if(types.size===1)return {code:[...types][0],source:'abonnements Koha du même ISSN'};
    const raw=String([f.audience,f.public,f.category,f.title].filter(Boolean).join(' '));
    if(/\b(?:jeunesse|junior|enfants?|ados?|kids?)\b/i.test(raw))return {code:'PERIJ',source:'indice explicite FP (à confirmer)'};
    if(/\b(?:adultes?)\b/i.test(raw))return {code:'PERI',source:'indice explicite FP'};
    return {code:'',source:''};
  }
  function fpCreationFrequency(f){
    const raw=[f.frequency,f.periodicity,f.periodicite,f.periodicityLabel,f.parution].find(v=>String(v||'').trim());
    const x=String(raw||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    if(!x)return '';
    const map=[[/\bquinzomadaire\b|tous les 15 jours/,'5'],[/\bbihebdomadaire\b|deux fois par semaine/,'18'],[/\bhebdomadaire\b|chaque semaine/,'4'],[/\bbimensuel\b|deux fois par mois/,'17'],[/\bbimestriel\b|tous les deux mois/,'8'],[/\btrimestriel\b/,'9'],[/\bsemestriel\b/,'10'],[/\bmensuel\b|chaque mois/,'7'],[/\bquotidien\b|chaque jour/,'2'],[/\bannuel\b|une fois par an/,'11'],[/\birregulier\b/,'13']];
    return map.find(([re])=>re.test(x))?.[1]||'';
  }
  function fpCreateDraft(f){
    const site=fpCreationSite(autoLibrary(f)?.code||'');
    const audience=fpCreationAudience(f);
    // La notice doit être unique dans Koha pour cet ISSN. Jamais de
    // sélection de notice sur une simple ressemblance de titre.
    const matches=koha.filter(k=>issn(k.issn).length===8&&issn(k.issn)===issn(f.issn)&&/^\d+$/.test(String(k.biblio_id||'')));
    const bibs=[...new Set(matches.map(k=>String(k.biblio_id)))];
    const vendorIds=[...new Set(koha.filter(k=>/france\s*publications/i.test(String(k.vendor_name||''))).map(k=>String(k.vendor_id||'')).filter(x=>/^\d+$/.test(x)))];
    return {ref:String(f.ref||''),title:String(f.title||''),issn:String(f.issn||''),site,start:iso(f.startDate),end:iso(f.endDate),biblionumber:bibs.length===1?bibs[0]:'',vendor:vendorIds.length===1?vendorIds[0]:'',destination:String(f.destination||''),audience:audience.code,audienceSource:audience.source,frequency:fpCreationFrequency(f),subscriberNumber:String(f.subscriberNumber||''),subscriptionHt:f.ht,subscriptionTtc:f.ttc,quantity:f.quantity,fpNotes:String(f.notes||''),created:Date.now()};
  }
  function fpOpenCreate(f){
    const draft=fpCreateDraft(f);
    try{sessionStorage.setItem(FP_CREATE_DRAFT,JSON.stringify(draft));}catch(e){alert('Impossible de préparer les champs : stockage de session indisponible.');return;}
    const q=draft.biblionumber?'?biblionumber_for_new_subscription='+encodeURIComponent(draft.biblionumber):'';
    // Même onglet : sessionStorage est accessible sur la page de création.
    location.assign('/cgi-bin/koha/serials/subscription-add.pl'+q);
  }
  function fpUnlinkedModal(){
    document.getElementById('pmkfp-unlinked-modal')?.remove();
    const overlay=make('div');overlay.id='pmkfp-unlinked-modal';overlay.style.cssText='position:fixed;inset:0;z-index:100060;background:rgba(15,24,34,.53);display:flex;justify-content:center;align-items:flex-start;padding:5vh 18px';
    const panel=make('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Abonnements FP absents de Koha');panel.style.cssText='width:min(1060px,100%);max-height:90vh;overflow:auto;background:white;color:#263541;border-radius:9px;padding:18px;box-shadow:0 10px 40px #0004';overlay.append(panel);
    const header=make('div');header.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px';const h=make('h2','Abonnements FP sans correspondance Koha');h.style.margin='0';header.append(h);const close=button('✕ Fermer',()=>overlay.remove());header.append(close);panel.append(header);
    const help=make('p','Liste calculée sur les abonnements FP récupérés et le rapport Koha complet. Une absence de correspondance ne prouve pas à elle seule que le titre manque dans Koha : vérifiez avant de créer.');help.style.marginTop='12px';panel.append(help);
    const records=fpUnlinkedRecords();
    if(!records){const n=make('p','Comparaison indisponible : il faut charger Koha et disposer d’un relevé FP complet. Aucun abonnement ne peut être déclaré absent à partir de données partielles.');panel.append(n);const load=button('Actualiser Koha et FP',()=>{overlay.remove();clearKohaCache();unifiedLoad();});panel.append(load);}
    else{
      panel.append(make('p',records.length+' référence(s) FP sans liaison vérifiée.'));
      if(fpUnlinkedStats){const st=fpUnlinkedStats;const diag=make('small','Contrats FP : '+st.total+' · Destinataires du réseau : '+st.network+' · Déjà rapprochés : '+st.matched+' · Correspondance probable : '+st.guarded+' · Destinataires non reconnus : '+st.unrecognized+'.');diag.style.cssText='display:block;margin:0 0 12px;color:#526476';panel.append(diag);
        if(!records.length&&st.unrecognized){const warning=make('p','Aucun candidat affiché. Vérifier les libellés des destinataires FP : '+st.unrecognized+' contrat(s) n’ont pas de destinataire du réseau reconnu.');warning.style.color='#95600b';panel.append(warning);}}

      const filter=make('input');filter.type='search';filter.className='form-control';filter.placeholder='Filtrer par titre, ISSN, référence ou destinataire';filter.style.marginBottom='10px';panel.append(filter);
      const table=make('table');table.className='table table-striped table-condensed';const head=make('thead');const hr=make('tr');for(const name of ['Titre / ISSN','Référence FP','Destinataire','Période','Action'])hr.append(make('th',name));head.append(hr);table.append(head);const body=make('tbody');table.append(body);panel.append(table);
      const draw=()=>{body.replaceChildren();let n=0;for(const f of records){const hay=[f.title,f.issn,f.ref,f.destination,f.destinationCode].join(' ').toLowerCase();if(!hay.includes(filter.value.toLowerCase()))continue;if(++n>250)break;const tr=make('tr');const a=make('td');a.append(make('strong',f.title||'Titre inconnu'));a.append(make('div',f.issn||'ISSN non renseigné'));tr.append(a);tr.append(make('td',f.ref));tr.append(make('td',f.destination||f.destinationCode||'Destinataire inconnu'));tr.append(make('td',[f.startDate,f.endDate].filter(Boolean).join(' → ')));const action=make('td');const b=button('Créer dans Koha ↗',()=>fpOpenCreate(f),'btn btn-primary btn-xs');b.title='Ouvrir le formulaire Koha, sans enregistrer automatiquement';action.append(b);tr.append(action);body.append(tr);}if(!n)body.append(make('tr')).append(make('td','Aucun résultat pour ce filtre.'));};filter.addEventListener('input',draw);draw();
    }
    document.body.append(overlay);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});close.focus();
  }
  // Préremplissage non destructif de la création native. Aucune soumission.
  function fpApplyCreateDraft(){
    if(location.pathname!=='/cgi-bin/koha/serials/subscription-add.pl')return;
    let d;try{d=JSON.parse(sessionStorage.getItem(FP_CREATE_DRAFT)||'null');}catch{return;}
    if(!d||Date.now()-d.created>20*60000)return;
    const form=document.querySelector('form:has([name="branchcode"]):has([name="biblionumber"])')||document.querySelector('form:has([name="startdate"]):has([name="branchcode"])');
    if(!form)return;
    if(document.getElementById('pmkfp-create-summary'))return;
    const section=make('div');section.id='pmkfp-create-summary';section.style.cssText='margin:10px 0;padding:12px;border:1px solid #b2cad2;border-radius:6px;background:#f4f8fa';section.append(make('strong','Préremplissage France Publications — '+d.title));section.append(make('p','Référence '+d.ref+' · '+d.issn+' · Vérifier tous les champs avant d’enregistrer.'));
    const applied=[];const pending=[];
    const byName=name=>form.querySelector('[name="'+name+'"]');
    const write=(name,value,label,overwrite=false)=>{
      if(value===undefined||value===null||String(value)==='')return;
      const el=byName(name);if(!el)return;
      if(el.tagName==='SELECT'&&!Array.from(el.options).some(o=>o.value===String(value))){pending.push(label+' (choix non disponible)');return;}
      if(!overwrite&&String(el.value||'').trim())return;
      el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
      if(String(el.value)===String(value))applied.push(label);else pending.push(label+' (non confirmé)');
    };
    write('branchcode',d.site,'Bibliothèque');
    // Cote et note publique : code local de rangement, différent du code
    // de branche Koha utilisé pour le Médiabus (MDB -> BIB).
    const shelfCode=fpCreationMark(d.site);
    if(shelfCode){write('callnumber',shelfCode,'Cote');write('notes',shelfCode,'Note publique');}
    write('aqbooksellerid',d.vendor,'Fournisseur');
    write('internalnotes',d.ref,'Note privée (DRG)');
    if(d.biblionumber)write('biblionumber',d.biblionumber,'Notice');
    // La localisation jeunesse est configurable et n'était pas présente dans
    // le HTML fourni. Ne sélectionner que si la VA existe réellement.
    const audience=d.audience;
    if(audience)write('itemtype',audience,'Type de document'+(d.audienceSource?' ('+d.audienceSource+')':''));
    const loc=byName('location');
    if(audience==='PERIJ'&&loc){
      const youth=Array.from(loc.options).find(o=>/petit\s*kios(?:que|k[eè])?/i.test(o.textContent||''));
      if(youth)write('location',youth.value,'Localisation : Le petit kiosque');
      else pending.push('Localisation jeunesse : « Le petit kiosque » absent des choix Koha');
    } else if(audience==='PERI'&&loc?.querySelector('option[value="Periodiques"]')){
      write('location','Periodiques','Localisation : La Presse');
    }else if(!audience)pending.push('Public adulte/jeunesse : non déterminé par les données FP');
    write('graceperiod','25','Période de grâce (25 jours)');
    write('numbering_pattern','46','Numérotation : N° XXX');
    write('locale','fr','Paramètres régionaux : français');
    if(d.frequency)write('frequency',d.frequency,'Périodicité FP');
    // Koha 25.11 stores dates in hidden flatpickr inputs. Update the flatpickr
    // instance when present, otherwise set the stored ISO value and visible input.
    const putDate=(id,value,label)=>{
      if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return;
      const el=document.getElementById(id);if(!el||!form.contains(el))return;
      try{
        if(el._flatpickr){el._flatpickr.setDate(value,true,'Y-m-d');}
        else {el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
          const visible=el.parentElement?.querySelector('.flatpickr_wrapper input[type="text"]');if(visible)visible.value=value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4);
        }
        if(el.value===value)applied.push(label);else pending.push(label+' (date à contrôler)');
      }catch{pending.push(label+' (date à saisir manuellement)');}
    };
    putDate('from',d.start,'Début');putDate('to',d.end,'Fin');
    // Champs supplémentaires Koha 25.11 : valeurs FP explicites uniquement.
    // Ne jamais recopier les autres informations (réclamations, casier, prix
    // fascicule, réajustement), faute d'une équivalence FP fiable.
    const additional=(id,value,label)=>{
      const el=form.querySelector('[name="additional_field_'+id+'"]');
      if(!el){pending.push(label+' (champ Koha non disponible)');return;}
      const v=String(value??'').trim();
      if(!v||/^(?:N\.?C\.?|NON COMMUNIQU[EÉ]|INCONNU|N\/?A|-)$/i.test(v))return;
      if(String(el.value||'').trim())return;
      el.value=v;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      if(el.value===v)applied.push(label);else pending.push(label+' (non confirmé)');
    };
    additional(8,d.subscriberNumber,'N° d’abonné');
    // « Montant HT » peut représenter une ligne commerciale, une quantité ou un
    // renouvellement : ne l'assimiler à « Prix base » que si une seule unité
    // est explicitement attestée. Si le champ est absent, ne rien inventer.
    const amount=Number(String(d.subscriptionHt??'').replace(',','.'));
    const qty=Number(String(d.quantity??'').replace(',','.'));
    if(Number.isFinite(amount)&&amount>0&&qty===1){
      additional(4,amount.toFixed(2),'Prix base HT (FP, quantité 1)');
    }else if(d.subscriptionHt!==undefined&&d.subscriptionHt!==null&&d.subscriptionHt!==''){
      pending.push('Prix base : montant FP non transposé (quantité ou nature à vérifier)');
    }
    // Aucune donnée fiable de prix au fascicule n'est présente dans le
    // relevé FP actuellement utilisé : laisser additional_field_7 intact.

    if(!d.start)pending.push('Début : non communiqué par FP');
    pending.push('Premier fascicule et durée : à compléter dans Koha');
    if(!d.frequency)pending.push('Périodicité : non fournie dans le relevé FP');
    if(!d.biblionumber)pending.push('Notice : rechercher et sélectionner une notice Koha');
    if(!d.vendor)pending.push('Fournisseur : identifiant Koha non déterminé');
    pending.push('Prix fascicule, abonnement en ligne, notes locales, réajustement et réclamations : non déduits de FP');
    section.append(make('small','Préremplissage confirmé : '+(applied.join(', ')||'aucun')+'. À vérifier : '+pending.join(' ; ')+'.'));
    const discard=button('Effacer les données FP préparées',()=>{sessionStorage.removeItem(FP_CREATE_DRAFT);section.remove();},'btn btn-default btn-xs');discard.style.marginLeft='10px';section.append(discard);form.prepend(section);
    sessionStorage.removeItem(FP_CREATE_DRAFT);
  }
  function nativeCompactControls(){
    const p=nativePage();
    if(!['serials-search.pl','subscription-detail.pl','serials-collection.pl','serials-home.pl'].includes(p))return;
    const anchor=p==='serials-search.pl'
      ? document.querySelector('#opened_panel .actions,#serialstabs .actions')
      : document.querySelector('#toolbar')||document.querySelector('main h1')||document.querySelector('main');
    if(!anchor)return;
    let shell=document.getElementById('pmkfp-native-controls');
    if(!shell){
      shell=make('span');shell.id='pmkfp-native-controls';shell.style.cssText='display:inline-flex;align-items:center;gap:7px;flex-wrap:wrap;margin:5px 8px;font-size:12px;vertical-align:middle';
      if(!document.getElementById('pmkfp-native-loading-style')){const css=make('style');css.id='pmkfp-native-loading-style';css.textContent='@keyframes pmkfp-native-spin{to{transform:rotate(360deg)}} #pmkfp-native-controls .pmkfp-native-spinner:not([hidden]){display:inline-block;width:12px;height:12px;border:2px solid #d6e2e9;border-top-color:#318477;border-radius:50%;animation:pmkfp-native-spin .8s linear infinite;vertical-align:-2px;margin-right:5px} @media(prefers-reduced-motion:reduce){#pmkfp-native-controls .pmkfp-native-spinner{animation:none;border-top-color:#318477}}';document.head.append(css);}
      const indicator=make('span');indicator.dataset.pmkFpIndicator='1';indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');indicator.style.cssText='display:inline-flex;align-items:center;gap:3px;min-height:19px';
      const spinner=make('span');spinner.className='pmkfp-native-spinner';spinner.setAttribute('aria-hidden','true');spinner.hidden=true;indicator.append(spinner);
      const status=make('span');status.dataset.pmkFpStatus='1';status.style.cssText='font-size:11px;color:#687885';status.title='Dernières données France Publications disponibles. Les données mises en cache restent visibles hors connexion.';indicator.append(status);shell.append(indicator);
      const refresh=button('↻',()=>{clearKohaCache();issueRowsPromise=null;issueCache.clear();unifiedLoad();},'btn btn-default btn-xs');
      refresh.title='Actualiser les données Koha et FP';refresh.setAttribute('aria-label','Actualiser Koha et France Publications');shell.append(refresh);
      if(p==='serials-search.pl'||p==='serials-home.pl'){const unlinked=button('FP absents de Koha',fpUnlinkedModal,'btn btn-default btn-xs');unlinked.title='Afficher les abonnements trouvés dans FP sans correspondance certaine dans Koha';shell.append(unlinked);}
      anchor.append(shell);
    }
    const status=shell.querySelector('[data-pmk-fp-status]');
    if(status){
      const d=partial||dataset,spinner=shell.querySelector('.pmkfp-native-spinner');
      const busy=running;
      if(spinner)spinner.hidden=!busy;
      status.textContent=busy?'FP · chargement…':state==='connected'?'FP · à jour':d?.subscriptions?.length?'FP · cache':'FP · indisponible';
      status.title=busy?'Récupération des abonnements et données France Publications en cours. Koha reste utilisable.':d?.createdAt?'Dernières données FP : '+new Date(d.createdAt).toLocaleString('fr-FR'):'Le chargement se fait automatiquement lorsque le compagnon répond';
      shell.setAttribute('aria-busy',String(busy));
    }
    if(p==='serials-search.pl'||p==='serials-home.pl')annualTools(anchor);
  }
  function nativeRefresh(){nativeCompactControls();if(nativePage()==='serials-search.pl')nativeSearch();else if(nativePage()==='subscription-detail.pl')nativeDetail();else if(nativePage()==='serials-collection.pl')nativeCollection();}

  // Diagnostic pur destiné à la configuration, à la recette et au support.
  // Il réutilise exactement le moteur de rapprochement de l'écran, puis restaure
  // l'état courant : aucune association n'est créée et aucune donnée Koha n'est écrite.
  function qualificationSummary(input={}){
    const previous={dataset,partial,koha,kohaLoaded,libraries,cfg};
    try{
      const source={
        schema:'pmk-france-publications',version:1,
        createdAt:new Date().toISOString(),finishedAt:new Date().toISOString(),
        scope:input.scope&&typeof input.scope==='object'?input.scope:{},
        complete:input.complete===true,
        titles:[],subscriptions:Array.isArray(input.subscriptions)?input.subscriptions:[],
        claims:[],replies:[],recipients:[],renewals:[],pendingClaims:[],invoices:[],
        errors:Array.isArray(input.errors)?input.errors:[]
      };
      if(source.errors.length)source.complete=false;
      dataset=source.complete?source:null;partial=source.complete?null:source;
      koha=Array.isArray(input.koha)?input.koha:[];
      libraries=Array.isArray(input.libraries)?input.libraries:[];
      cfg=normalize({...defaults,...(input.config&&typeof input.config==='object'?input.config:{})});
      kohaLoaded=true;
      const associations=source.subscriptions.map(row=>{
        const result=match(row),related=Array.isArray(result.related)?result.related:[];
        return {
          ref:String(row?.ref||''),kind:String(result.kind||'unknown'),label:String(result.label||''),
          kohaSubscriptionId:String(result.koha?.subscription_id||''),
          related:related.map(item=>String(item?.subscription_id||'')).filter(Boolean)
        };
      });
      const counts={};for(const item of associations)counts[item.kind]=(counts[item.kind]||0)+1;
      return {
        complete:source.complete,
        errors:source.errors.map(error=>String(error?.message||error||'Erreur non précisée')),
        total:associations.length,counts,associations
      };
    }finally{
      dataset=previous.dataset;partial=previous.partial;koha=previous.koha;
      kohaLoaded=previous.kohaLoaded;libraries=previous.libraries;cfg=previous.cfg;
    }
  }
  window.PMKFrancePublicationsDiagnostics=Object.freeze({qualify:qualificationSummary});

  function register() {
    if(!window.PMKConfig||typeof window.PMKConfig.registerModule!=='function')return false;
    window.PMKConfig.registerModule({id:ID,schemaVersion:1,name:txt('Périodiques — enrichissement natif Koha / FP'),description:txt('Enrichit les pages Koha et prépare les listes de renouvellement par site, sans tableau de bord autonome.'),category:txt('Périodiques'),supportedPages:PAGE_PATHS,prerequisites:[],dependencies:[],defaults,normalize,
      validate:c=>validDate(c.from)&&validDate(c.to)&&c.from<=c.to&&(c.includeExpired||c.includeCurrent||c.includeFuture)?{ok:true}:{ok:false,message:'Dates invalides ou aucun état d’abonnement sélectionné.'},
      schema:[{type:'section',id:'source',label:txt('Récupération France Publications'),description:txt('Les dates filtrent les échéances des abonnements et les dates de réclamation.'),fields:[
        {key:'enabled',type:'boolean',label:txt('Activer le module')},{key:'from',type:'text',label:txt('Du (AAAA-MM-JJ)')},{key:'to',type:'text',label:txt('Au (AAAA-MM-JJ)')},
        {key:'includeCurrent',type:'boolean',label:txt('Abonnements en cours')},{key:'includeFuture',type:'boolean',label:txt('Abonnements à venir')},
        {key:'concurrency',type:'number',min:1,max:12,label:txt('Lectures simultanées'),help:txt('8 par défaut ; maximum 12. En cas de surcharge FP, un repli automatique est appliqué. Si nécessaire réduisez à 4.')},
        {key:'recoveryMode',type:'select',label:txt('Mode de récupération'),options:[{value:'fast',label:txt('Rapide — détails à la demande')},{value:'complete',label:txt('Complet — toutes les fiches')}],help:txt('Rapide : pas de deuxième passe. Ouvrir Détail charge ensuite l’historique de cet abonnement. Complet : lit toutes les fiches au départ.')},
        {key:'readClaims',type:'boolean',label:txt('Lire les réclamations et réponses'),help:txt('Consultation uniquement. Aucun dépôt ni relance.')}
      ]},{type:'section',id:'koha',label:txt('Données Koha et correspondances'),description:txt('Une référence FP explicite et unique donne une correspondance certaine. Une association multiple ou incomplète reste à vérifier par un agent.'),fields:[
        {key:'fpNotesTarget',type:'select',label:txt('Destination des notes France Publications'),options:[{value:'none',label:txt('Ne pas reprendre automatiquement')},{value:'notes',label:txt('Note publique de l’abonnement')},{value:'internal_notes',label:txt('Note interne de l’abonnement')}],help:txt('Par défaut aucune reprise. Après choix, seule une note issue de la fiche complète peut être proposée dans l’aperçu.')},
        {key:'allowWrites',type:'boolean',label:txt('Autoriser les corrections Koha'),help:txt('Désactivé par défaut. Enregistrement uniquement après aperçu et clic Appliquer ; formulaire natif contrôlé puis relu. Tester d’abord un abonnement.')},
        ...['FP-abonnements.sql','FP-fascicules.sql'].map(file=>({type:'action',label:txt(file),buttonLabel:txt('Copier le SQL'),action:()=>window.PMKInstallationSQL.copy(file)})),
        {key:'referencePrefix',type:'text',label:txt('Préfixe des références commerciales'),help:txt('DRG par défaut. Le module reconnaît ensuite PRÉFIXE-cycle-numéro dans Koha et adapte le compagnon téléchargé.')},
        {key:'reportId',type:'number',label:txt('Numéro du rapport SQL Koha'),help:txt('Rapport principal 5262.')},{key:'issuesReportId',type:'number',label:txt('Rapport détaillé fascicules / réclamations (5263)'),help:txt('Chargé automatiquement avec le rapport 5262 pour signaler les fascicules en retard, manquants ou réclamables. Les fascicules simplement attendus ne sont pas des anomalies.')},{key:'onsiteRecentIssues',type:'number',min:0,max:20,label:txt('Fascicules récents : consultation sur place tolérée'),help:txt('Nombre indicatif de derniers exemplaires reçus autorisés en consultation sur place. Valeur 2 par défaut, à adapter à vos règles métier. Les cas plus anciens seront proposés à vérification, sans correction automatique.')},{key:'alertFields',type:'textarea',rows:6,label:txt('Alertes à afficher dans le tableau'),help:txt('Laisser vide pour toutes les alertes. Sinon : codes séparés par virgules. Exemples : expired,ending_soon,fp_end_mismatch,fp_unmatched,claimable,late,claimed,periodicity_mismatch,title,library_id,vendor_id,start_date,end_date,itemtype,frequency_id,number_pattern_id,notes,internal_notes,callnumber,grace_period,publisher,ccode,aqbudgetid,cost,letter.')} ,
        {key:'branchMap',type:'textarea',rows:6,label:txt('Exceptions de sites (facultatif)'),help:txt('Priorité aux références DRG déjà présentes dans Koha, puis aux codes FP configurés et aux adresses. En cas de destinataire partagé (musée/artothèque), utiliser CODE_FP=CODE_SITE_KOHA seulement après vérification. Aucun enregistrement Firebase.')},
        {key:'subscriptionMap',type:'textarea',rows:6,label:txt('Associations manuelles d’abonnements'),help:txt('Option de secours uniquement : privilégier les références commerciales déjà enregistrées dans Koha.')}
      ]}]
    });
    Promise.resolve(window.PMKConfig.getConfig(ID)).then(c=>{cfg=normalize(c);if(location.pathname==='/cgi-bin/koha/serials/subscription-add.pl'){let count=0;const poll=setInterval(()=>{fpApplyCreateDraft();if(document.getElementById('pmkfp-create-summary')||++count>35)clearInterval(poll);},250);}else mount();}).catch(e=>console.warn('[PMK FP]',e));
    if(typeof window.PMKConfig.subscribe==='function')window.PMKConfig.subscribe(ID,c=>{cfg=normalize(c);if(!cfg.enabled&&host){host.remove();host=null;}else mount();if(host){renderTable();renderQueue();}});return true;
  }
  function boot(){if(register())return;let tries=0;const timer=setInterval(()=>{if(register()||++tries>=60){clearInterval(timer);if(tries>=60)console.warn('[PMK FP] PMKConfig absent : charger le module après le noyau PMK.');}},500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
