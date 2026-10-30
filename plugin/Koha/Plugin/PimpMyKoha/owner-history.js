(function(){
'use strict';
if(window.PMKOwnerHistory) return;
const MODULE_ID='pmk-owner-history';
const state=window.PMKOwnerHistory={id:MODULE_ID,pluginOnly:true,enabled:true};
let unsubscribe;
function applyConfig(config){
  state.enabled=!config || config.enabled!==false;
  const panel=document.getElementById('pmk-owner-history');
  if(panel)panel.hidden=!state.enabled;
}
function register(){
  if(!window.PMKConfig || typeof window.PMKConfig.registerModule!=='function')return;
  try{window.PMKConfig.registerModule({
    id:MODULE_ID,schemaVersion:1,
    name:{fr:'Historique des affectations',en:'Item ownership history'},
    description:{fr:'Historise côté serveur les changements de bibliothèque propriétaire et affiche une timeline ou un tableau brut (plugin uniquement).',en:'Tracks item home library changes on the server and displays timeline or raw table (plugin only).'},
    category:{fr:'Catalogue / exemplaires',en:'Catalogue / items'},
    supportedPages:['catalogue.detail','catalogue.moredetail'],
    defaults:{enabled:true},
    schema:[{type:'section',id:'display',label:{fr:'Affichage',en:'Display'},fields:[
      {key:'enabled',type:'boolean',label:{fr:'Afficher l’historique sur les fiches exemplaires',en:'Show ownership history on item pages'}}
    ]}]
  });}catch(e){console.warn('PMK owner module registration',e);}
  if(!unsubscribe && typeof window.PMKConfig.subscribe==='function'){
    try{unsubscribe=window.PMKConfig.subscribe(MODULE_ID,applyConfig)}catch(e){}
  }
  if(typeof window.PMKConfig.getConfig==='function'){
    Promise.resolve(window.PMKConfig.getConfig(MODULE_ID)).then(applyConfig).catch(()=>{});
  }
}
register();
if(!window.PMKConfig)window.addEventListener('pmk:config-ready',register,{once:true});
function itemId(){
  const u=new URL(location.href);
  const n=u.searchParams.get('itemnumber')||u.searchParams.get('item_id');
  return n&&/^\d+$/.test(n)?n:null;
}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function render(root,data){
 root.replaceChildren();
 const controls=el('div','pmk-owner-controls'), timeline=el('div','pmk-owner-timeline'),table=el('div','pmk-owner-table');
 const title=el('strong',null,'Historique des affectations (propriétaire)');
 root.append(title,controls,timeline,table);
 const b1=el('button','btn btn-default btn-sm','Timeline'),b2=el('button','btn btn-default btn-sm','Données brutes'),csv=el('button','btn btn-default btn-sm','Exporter CSV');
 b1.type=b2.type=csv.type='button';
 controls.append(b1,document.createTextNode(' '),b2,document.createTextNode(' '),csv);
 let rows=[...(data.events||[])];
 if(data.state&&!rows.some(x=>x.event_type==='baseline'))rows.unshift({
   event_type:'baseline',new_homebranch:data.state.initial_homebranch,changed_at:data.state.first_seen,source:'snapshot'});
 function show(mode){timeline.hidden=mode!=='timeline';table.hidden=mode!=='raw';try{localStorage.setItem('pmk-owner-view',mode)}catch(e){}}
 rows.forEach(r=>{
   const line=el('div','pmk-owner-event');
   line.style.cssText='padding:10px 14px;margin:10px 0;border-left:3px solid #6689a6;background:#f7f9fc';
   const label=r.event_type==='baseline'?'Premier état constaté : '+(r.new_homebranch||'—'):
     r.event_type==='deleted'?'Exemplaire supprimé (dernier propriétaire : '+(r.old_homebranch||'—')+')':
     (r.old_homebranch||'—')+' → '+(r.new_homebranch||'—');
   line.append(el('strong',null,label),el('div',null,(r.changed_at||'').replace('T',' ')+' · '+(r.source||'inconnue')));
   timeline.append(line);
 });
 const t=el('table','table table-striped table-condensed');table.append(t);
 const head=el('thead'),hr=el('tr');['Date','Type','Avant','Après','Source','Agent'].forEach(x=>hr.append(el('th',null,x)));head.append(hr);t.append(head);
 const body=el('tbody');t.append(body);
 rows.forEach(r=>{const tr=el('tr');[r.changed_at,r.event_type,r.old_homebranch,r.new_homebranch,r.source,r.actor_id].forEach(v=>tr.append(el('td',null,v==null?'—':String(v))));body.append(tr);});
 b1.onclick=()=>show('timeline');b2.onclick=()=>show('raw');
 csv.onclick=()=>{const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';const cols=['changed_at','event_type','old_homebranch','new_homebranch','source','actor_id'];const lines=[cols.join(';'),...rows.map(r=>cols.map(k=>q(r[k])).join(';'))];const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download='pmk-affectations-'+itemId()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 show((()=>{try{return localStorage.getItem('pmk-owner-view')==='raw'?'raw':'timeline'}catch(e){return 'timeline'}})());
 if(data.partial)root.append(el('p','text-warning','Historique limité aux 2 000 premiers événements.'));
 root.append(el('small','text-muted','Périmètre : changements pris en charge par les hooks Koha. Les changements SQL directs ne sont pas garantis.'));
}
async function boot(){
 if(!/\/(moredetail|detail)\.pl$/.test(location.pathname))return;
 const id=itemId();if(!id)return;
 const host=document.querySelector('#catalogue_detail_biblio, #catalogue_detail, #content, main');
 if(!host)return;
 const section=el('section','panel panel-default');section.id='pmk-owner-history';section.hidden=!state.enabled;section.style.cssText='padding:14px;margin:16px 0';
 section.append(el('div',null,'Chargement de l’historique des affectations…'));host.append(section);
 try{const res=await fetch('/api/v1/contrib/pmk/owner-history/items/'+encodeURIComponent(id),{credentials:'same-origin',headers:{'Accept':'application/json'}});
 if(!res.ok)throw new Error('HTTP '+res.status);render(section,await res.json());}
 catch(e){section.replaceChildren(el('p','text-warning','Historique indisponible : '+e.message));}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
