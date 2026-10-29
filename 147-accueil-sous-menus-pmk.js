/**
 * PMK 147 — Menus personnalisables sur l'accueil Koha 25.11 — IntranetUserJS
 * VERSION 9.0 — catalogue étendu; administration uniquement dans PMK, favoris uniquement sur l’accueil.
 *
 * window.PMK147Store (injecté par PMK AVANT ce script):
 *   async getGlobal() => {version:1, sections:{ [sectionPath]: {entries:Entry[]} }} | null
 *   async setGlobal(config) => Promise<void>     // contrôle serveur admin requis
 *   async getFavorites(userId) => string[]
 *   async setFavorites(userId, ids) => Promise<void>
 *   userId: identifiant Koha AUTHENTIFIÉ fourni par PMK
 *   canEdit: bool, déterminé CÔTÉ SERVEUR, non par JS
 * Ces appels DOIVENT être sécurisés côté serveur. Le masquage UI n'est pas une ACL.
 *
 * Pour les liens personnalisés, l'accès ne peut pas être attesté par IntranetUserJS.
 * Ils ne deviennent visibles aux agents que si PMK fournit :
 *   async canAccess(url, userId) => boolean  (évaluation permissions côté serveur)
 * Les liens natifs sont extraits des pages Koha rendues pour la session.
 */
(()=>{
 'use strict';
 if(location.pathname!=='/cgi-bin/koha/mainpage.pl'||window.__PMK147V83)return;
 // Internal tools share mainpage.pl, but do not display Koha's home menus.
 const routeParams=new URLSearchParams(location.search);
 if(routeParams.has('pmk_page')||routeParams.get('pmk_admin')==='1')return;
 window.__PMK147V83=true;

 const pmk = window.PMKConfig;
 const moduleKey='147-home-submenus';
 // L'identifiant doit être celui de la session Koha, jamais fourni depuis une entrée de menu.
 const detectKohaUser = () => {
   const values=[window.Koha?.user?.userid,window.Koha?.user?.id,window.logged_in_user?.userid,
     window.Koha?.loggedInUser?.userid,window.patron?.userid,
     document.querySelector('[data-koha-userid]')?.getAttribute('data-koha-userid'),
     document.querySelector('#logged-in-user [data-userid]')?.getAttribute('data-userid'),
     document.querySelector('#logged-in-dropdown .loggedinusername[data-loggedinusername]')?.dataset.loggedinusername,
     document.querySelector('#logged-in-dropdown .toplinks-myaccount a[href*=borrowernumber]')?.href.match(/[?&]borrowernumber=(\d+)/)?.[1],
     document.querySelector('#logged-in-dropdown .loggedinusername')?.textContent];
   const value=values.find(v=>typeof v==='string'&&v.trim())??values.find(v=>Number.isSafeInteger(v));
   return value==null?'':String(value).trim();
 };
 const localUser=detectKohaUser();
 if (!pmk || typeof pmk.getConfig !== 'function') {console.warn('[PMK147] Socle PMK indisponible');return;}
 const favoriteService = pmk?.services?.get?.('pmk147.favorites');
 const store = {
   userId: localUser || null,
   canAccess:typeof window.PMK147Store?.canAccess==='function'?window.PMK147Store.canAccess.bind(window.PMK147Store):null,
   getFavorites: favoriteService && localUser ? () => favoriteService.load(localUser) : null,
   setFavorites: favoriteService && localUser ? (_id, ids) => favoriteService.save(localUser, ids) : null,
   async getGlobal(){
      const value=await pmk.getConfig(moduleKey);
      if(value && value.enabled===false)return {version:1,sections:{}};
      return {version:1,sections:Object.fromEntries((value?.sections||[]).filter(x=>x&&x.path).map(x=>[x.path,{...x,entries:x.entries||[]}]))};
   }
 };


 const PMK147_HOME_META={
 '/circ/circulation-home.pl':'Circulation','/members/members-home.pl':'Adhérents',
 '/catalogue/search.pl':'Recherche avancée','/catalogue/itemsearch.pl':'Recherche d’exemplaires',
 '/virtualshelves/shelves.pl':'Listes de notices','/course_reserves/course-reserves.pl':'Réserves de cours / Listes d’exemplaires',
 '/authorities/authorities-home.pl':'Autorités','/cataloguing/cataloging-home.pl':'Catalogage',
 '/serials/serials-home.pl':'Périodiques','/acqui/acqui-home.pl':'Acquisitions',
 '/reports/reports-home.pl':'Rapports','/tools/tools-home.pl':'Outils','/admin/admin-home.pl':'Administration'
};
 const ROOT='/cgi-bin/koha/';
 const DEFAULT_CATALOG={}; // Source de vérité : pages Koha rendues, pas une liste d’URL supposées.

 const conf={timeoutMs:6500,maxLinks:600};let discoveryOptions={...window.PMKMenuEngine.homeDiscoveryDefaults};
 const sections=new Map(); let globalConfig={version:1,sections:{}}; let fav=new Set();
 const userId=typeof store.userId==='string'||typeof store.userId==='number'?String(store.userId):null;

 const norm=s=>(s||'').replace(/\s+/g,' ').trim();
 const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n};
 const safe=(value,base=location.href)=>{const url=window.PMKMenuEngine.nativeUrl(value,base,discoveryOptions);return url?new URL(url,location.origin):null;};
 const idFor=u=>u.origin===location.origin?u.pathname+u.search:u.href;
 const denied=/(?:access denied|permission denied|insufficient privileges|not authorized|not authorised|droits insuffisants|accès refusé|vous n'avez pas (?:les? )?(?:droits?|autorisations?|permissions?))/i;
 const css=`
 .pmk147host{position:relative;display:flex;align-items:stretch;width:100%}.pmk147host>.icon_general{width:100%!important;flex:1;min-width:0;padding-right:40px!important}
 .pmk147toggle{position:absolute;right:7px;top:50%;transform:translateY(-50%);height:28px;width:28px;border:0;border-radius:6px;background:transparent;display:grid;place-items:center;color:inherit;cursor:pointer;opacity:.73}
 .pmk147toggle:hover,.pmk147toggle:focus-visible{background:#536d8a20;opacity:1}.pmk147toggle[hidden]{display:none!important}
 .pmk147toggle[aria-expanded=true] svg{transform:rotate(180deg)}.pmk147toggle svg{transition:transform .15s}
 .pmk147panel{position:absolute;left:0;top:calc(100% + 4px);width:min(430px,90vw);max-height:65vh;overflow:auto;z-index:11000;background:var(--bs-body-bg,#fff);color:var(--bs-body-color,#253342);border:1px solid #cbd5df;box-shadow:0 12px 24px #26374b26;border-radius:9px;padding:12px;text-align:left}
 .pmk147panel[hidden]{display:none!important}.pmk147head{font-size:14px;font-weight:700;margin:0 0 9px}.pmk147search{width:100%;padding:7px 9px;border:1px solid #b6c5d3;border-radius:6px;margin:0 0 8px;box-sizing:border-box}
 .pmk147category{margin:12px 0 4px;padding:5px 3px;color:#596c7b;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-bottom:1px solid #e3e9ee}
 .pmk147separator{height:1px;background:#e4eaf0;margin:8px 0}.pmk147entry{display:flex;gap:4px;align-items:center;border-radius:5px}.pmk147entry:hover{background:#ecf2f7}.pmk147entry>a{flex:1;padding:8px 3px;text-decoration:none;color:#235b81;font-size:13px;overflow-wrap:anywhere}
 .pmk147star{border:0;background:none;color:#8796a4;font-size:18px;cursor:pointer;padding:4px 7px}.pmk147star[aria-pressed=true]{color:#d39b1a}
 .pmk147note{font-size:12px;color:#596c7b}
 `;const style=el('style');style.textContent=css;document.head.append(style);
 function extract(doc,url){return window.PMKMenuEngine.extractNativePage(doc,url,{...discoveryOptions,linkSelector:sectionConfig(new URL(url,location.origin).pathname)?.pmkMenu?.discoverySelector});}
 async function discover(url){const ck='PMK147:v90:tools:'+(userId||'anonymous')+':'+JSON.stringify(discoveryOptions)+':'+(sectionConfig(new URL(url,location.origin).pathname)?.pmkMenu?.discoverySelector||'')+':'+url;try{const cached=JSON.parse(sessionStorage.getItem(ck)||'null');if(cached&&Date.now()-cached.at<180000&&Array.isArray(cached.links))return cached.links;}catch{} const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),conf.timeoutMs);try{const r=await fetch(url,{credentials:'same-origin',signal:ctrl.signal,redirect:'follow',headers:{Accept:'text/html'}});if(!r.ok||!/text\/html/i.test(r.headers.get('content-type')||'')||!safe(r.url))return [];const doc=new DOMParser().parseFromString(await r.text(),'text/html');if(doc.querySelector('#loginform,form[action*="auth.pl"]')||denied.test(norm(doc.title)+' '+norm(doc.querySelector('h1,.alert-danger,.error')?.textContent)))return [];const items=extract(doc,url);try{sessionStorage.setItem(ck,JSON.stringify({at:Date.now(),links:items}));}catch{}return items;}catch{return []}finally{clearTimeout(tm)}}
 const sectionConfig=k=>globalConfig.sections?.[k]||null;
 function normalizeEntry(e){
   if(!e||!['link','category','separator'].includes(e.type))return null;
   if(e.type==='separator')return {...e,type:'separator',id:String(e.id||e.pmkMenu?.id||crypto.randomUUID())};
   if(e.type==='category')return {...e,type:'category',id:String(e.id||e.pmkMenu?.id||crypto.randomUUID()),label:String(e.label||'Catégorie')};
   if(e.pmkMenu?.kind==='action')return {...e,id:e.pmkMenu.id||e.id||e.pmkMenu.actionId};
   const u=safe(e.url);if(!u)return null;
   return {...e,type:'link',id:idFor(u),url:idFor(u),label:String(e.label||'Lien'),origin:e.origin==='custom'?'custom':'koha',hidden:e.hidden===true,category:String(e.category||'Autres')};
 }
 function enrich(rec,found){return found.map(entry=>({...entry}));}
 function applyConfig(rec){
  const found=enrich(rec,rec.discovered), configured=sectionConfig(rec.key)?.entries;
  const byId=new Map(found.map(e=>[e.id,e]));
  if(!Array.isArray(configured))return found.slice();
  const ordered=[],used=new Set();
  for(const raw of configured){
   const e=normalizeEntry(raw);if(!e)continue;
   if(e.type!=='link'){ordered.push(e);continue;}
   if(e.pmkMenu?.kind==='action'){if(window.PMKMenuEngine.actionAvailable(e.pmkMenu.actionId))ordered.push(e);continue;}
   if(used.has(e.id))continue; // Un même outil ne peut apparaître plusieurs fois.
   if(e.hidden){used.add(e.id);continue;}
   if(e.origin==='koha'){
    const natural=byId.get(e.id);
    if(natural){ordered.push({...natural,...e,label:(e.label&&e.label!=='Lien'&&e.label.trim()!=='Créer une notice'?e.label:natural.label),category:e.category&&e.category!=='Autres'?e.category:natural.category});used.add(e.id);}
    else {ordered.push({...e,unavailable:true,unavailableReason:'Cette destination n’est pas présente dans la page Koha chargée pour cette session.'});used.add(e.id);}
   }else if(rec.allowedCustom.has(e.id)){ordered.push(e);used.add(e.id);}
  }
  for(const e of found)if(!used.has(e.id)){ordered.push(e);used.add(e.id);}
  return ordered;
 }
 async function refresh(rec){const section=sectionConfig(rec.key);if(section?.enabled===false||section?.pmkMenu?.enabled===false){rec.toggle.hidden=true;rec.panel.hidden=true;return;}const configured=sectionConfig(rec.key)?.entries||[];const custom=configured.filter(e=>e.type==='link'&&e.origin==='custom'&&!e.hidden);rec.allowedCustom=new Set();if(typeof store.canAccess==='function'&&userId){await Promise.all(custom.map(async e=>{try{const u=safe(e.url);if(u&&await store.canAccess(idFor(u),userId)===true)rec.allowedCustom.add(idFor(u));}catch{}}));}rec.items=applyConfig(rec);rec.toggle.hidden=!rec.items.some(x=>x.type==='link');if(!rec.toggle.hidden&&!rec.panel.hidden)render(rec);}
 async function toggleFavorite(id){
   if(!userId || typeof store.setFavorites!=="function")return;
   const old=new Set(fav);
   fav.has(id)?fav.delete(id):fav.add(id);
   for(const r of sections.values())if(!r.panel.hidden)render(r);
   try {await store.setFavorites(userId,[...fav]);}
   catch(e){fav=old;for(const r of sections.values())if(!r.panel.hidden)render(r);console.error('[PMK147] Favoris non enregistrés dans PMK',e);window.alert('Impossible d’enregistrer le favori dans PMK : '+String(e?.message||e));}
 }
 function render(rec){
   const section=sectionConfig(rec.key)||{};
   const converted=window.PMKMenuEngine.fromHome({...section,label:section.label||rec.label,entries:rec.items},rec.key);
   const menu=converted.menu;
   const onFavorite=id=>{
     if(!userId||typeof store.setFavorites!=='function'){
       window.alert(!userId?'Favoris PMK : identifiant utilisateur Koha introuvable.':'Favoris PMK : stockage partagé indisponible.');return;
     }
     return toggleFavorite(id);
   };
   rec.panel.replaceChildren(window.PMKMenuEngine.renderPanel({title:(pmk.getLanguage?.()==='en'?menu.labelEn:menu.labelFr)||rec.label,items:menu.items,audience:menu.audience||'all',favorites:fav,onFavorite,
     actionAvailable:window.PMKMenuEngine.actionAvailable,onAction:window.PMKMenuEngine.runAction,
     onClose:()=>{rec.panel.hidden=true;rec.toggle.setAttribute('aria-expanded','false');rec.toggle.focus();}}));
 }
 function syncAll(){return Promise.all([...sections.values()].map(refresh));}
 function closeAll(){for(const r of sections.values()){r.panel.hidden=true;r.toggle.setAttribute('aria-expanded','false')}}
 // PMK ouvre son éditeur dans sa propre page, jamais sur l'accueil Koha.
 // API lecture et inventaire pour le gestionnaire de configuration PMK.
 window.PMK147={
   version:'9.0.0',
   defaultCatalog:()=>JSON.parse(JSON.stringify(DEFAULT_CATALOG)),
   getDiscovered:()=>Object.fromEntries([...sections.values()].map(r=>[r.key,{label:r.label,links:r.discovered.map(x=>({...x}))}])),
   getConfig:()=>JSON.parse(JSON.stringify(globalConfig)),
   validateConfig:config=>{
     if(!config||config.version!==1||!config.sections||typeof config.sections!=='object')throw Error('Configuration PMK147 invalide');
     for(const [key,section] of Object.entries(config.sections)){
       if(!safe(key)||!Array.isArray(section.entries))throw Error('Section invalide : '+key);
       for(const entry of section.entries)if(!normalizeEntry(entry))throw Error('Entrée invalide dans '+key);
     }
     return true;
   },
   reload:async()=>{if(typeof store.getGlobal!=='function')throw Error('Stockage partagé PMK non connecté');const c=await store.getGlobal();window.PMK147.validateConfig(c);globalConfig=c;await syncAll();},
   // Ne fournit volontairement aucune fonction d'écriture globale dans l'accueil.
 };
 async function init(){
   if(userId && typeof store.getFavorites==='function') {
     try {const a=await store.getFavorites(userId);fav=new Set(Array.isArray(a)?a:[]);}
     catch(e){console.warn('[PMK147] Favoris PMK inaccessibles',e);store.setFavorites=null;}
   }
 let moduleCfg;
 try {
   if (typeof pmk.getDefinition === 'function' && !pmk.getDefinition(moduleKey)) {
     console.error('[PMK147] Le module 147 n’est pas déclaré dans 000-pmk-config-firestore.js. Remplacer le fichier 000 et actualiser sans cache.');
     return;
   }
   moduleCfg = await pmk.getConfig(moduleKey);
 } catch (error) {
   console.error('[PMK147] Configuration introuvable : vérifier la version du socle 000 et le cache du navigateur.',error);
   return;
 }
 if(moduleCfg.enabled===false)return;
 discoveryOptions={...window.PMKMenuEngine.homeDiscoveryDefaults,...moduleCfg.discovery};conf.timeoutMs=Number(discoveryOptions.timeoutMs)||6500;conf.maxLinks=Number(discoveryOptions.maxLinks)||600;
 globalConfig={version:1,sections:Object.fromEntries((moduleCfg.sections||[]).filter(x=>x&&x.path).map(x=>[x.path,{...x,entries:x.entries||[]}]))};
 if(typeof pmk.subscribe==='function'){
   pmk.subscribe(moduleKey,async next=>{
     discoveryOptions={...window.PMKMenuEngine.homeDiscoveryDefaults,...next?.discovery};
     if(next?.enabled===false){for(const rec of sections.values()){rec.toggle.hidden=true;rec.panel.hidden=true;}return;}
     globalConfig={version:1,sections:Object.fromEntries((next?.sections||[]).filter(x=>x&&x.path).map(x=>[x.path,{...x,entries:x.entries||[]}]))};
     await Promise.all([...sections.values()].map(async rec=>{rec.discovered=await discover(location.origin+rec.key);await refresh(rec)}));
   });
 }
 const links=[...document.querySelectorAll('.biglinks-list > li > a.icon_general[href]')];for(const [i,a] of links.entries()){const u=safe(a.getAttribute('href'));if(!u)continue;if(String(discoveryOptions.ignoredSections||'').split(/\n/).map(path=>path.trim()).includes(u.pathname))continue;const key=idFor(u),label=norm(a.textContent)||PMK147_HOME_META[u.pathname.replace(ROOT,'/')];const host=el('div','pmk147host');a.before(host);host.append(a);const toggle=el('button','pmk147toggle');toggle.hidden=true;toggle.type='button';toggle.setAttribute('aria-label','Ouvrir le sous-menu '+label);toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';const panel=el('div','pmk147panel');panel.hidden=true;panel.id='pmk147-panel-'+i;toggle.setAttribute('aria-controls',panel.id);host.append(toggle,panel);const rec={key,label,toggle,panel,discovered:[],allowedCustom:new Set(),items:[]};sections.set(key,rec);toggle.onclick=e=>{e.preventDefault();e.stopPropagation();const wasClosed=panel.hidden;closeAll();if(wasClosed){panel.hidden=false;toggle.setAttribute('aria-expanded','true');render(rec)}};}
 document.addEventListener('click',e=>{if(!e.target.closest('.pmk147host')&&!e.target.closest('.pmk147modal'))closeAll()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
 // Toutes les rubriques en parallèle : pas de vérification HTTP par lien.
 await Promise.all([...sections.values()].map(async rec=>{rec.discovered=await discover(location.origin+rec.key);await refresh(rec)}));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
