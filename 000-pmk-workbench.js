/* Outils de contrôle communs : lecture seule jusqu’à une action explicite.
   Les confirmations, le ciblage et les requêtes restent ceux du socle PMK. */
(function () {
  'use strict';
  if (window.PMKWorkbench) return;
  const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
  const sensitive = /password|secret|token|api.?key|credential/i;
  const undo = new Map();
  const openPanels = new Set();
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (object(value)) return Object.fromEntries(Object.keys(value).filter(k=>!forbidden.has(k)).sort().map(k=>[k,canonical(value[k])]));
    return value;
  }
  const equal = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  function differences(before, after, path=[], out=[]) {
    if (equal(before,after)) return out;
    if (object(before) && object(after) && path.length<20) {
      for (const key of new Set([...Object.keys(before),...Object.keys(after)])) {
        if (!forbidden.has(key)) differences(before[key],after[key],[...path,key],out);
      }
    } else out.push({path, before:clone(before), after:clone(after), resettable:before!==undefined && !Array.isArray(before) && !Array.isArray(after) && !object(before) && !object(after)});
    return out;
  }
  function display(value,path=[]) {
    if (path.some(key=>sensitive.test(key))) return 'Valeur confidentielle masquée';
    if (value===undefined) return 'Non défini';
    const raw=typeof value==='string'?value:JSON.stringify(value);
    return raw.length>600?raw.slice(0,600)+'…':raw;
  }
  function safeUrl(value, options={}) {
    const url=new URL(String(value),location.href);
    if(!(options.protocols||['http:','https:']).includes(url.protocol)||url.username||url.password)throw new Error('Adresse non autorisée');
    if(options.sameOrigin && url.origin!==location.origin)throw new Error('Adresse extérieure à ce Koha');
    if(options.hosts && !options.hosts.includes(url.hostname))throw new Error('Fournisseur non autorisé');
    return url;
  }
  function urlSummary(value) {
    const url=safeUrl(value), parameters=[];
    for(const [key,value]of [...url.searchParams]){parameters.push({name:key,value:sensitive.test(key)?'Masqué':value});if(sensitive.test(key))url.searchParams.set(key,'MASQUE');}
    return {href:url.href,origin:url.origin,external:url.origin!==location.origin,parameters};
  }
  function renderTemplate(template, context, options={}) {
    let invalid=false;
    const rendered=String(template||'').trim().replace(/\{([a-z0-9_]+)\}/gi,(_,token)=>{
      const key=options.uppercase?token.toUpperCase():token;
      const raw=options.rawTokens?.includes(key)||key.endsWith('_RAW');
      const name=key.endsWith('_RAW')?key.slice(0,-4):key;
      if(!Object.prototype.hasOwnProperty.call(context,name)){invalid=true;return '';}
      const value=String(context[name]??'');
      if(!value&&(options.required||[]).includes(name))invalid=true;
      return raw||options.encode===false?value:encodeURIComponent(value);
    });
    if(invalid||!rendered||/\{[a-z0-9_]+\}/i.test(rendered))return null;
    try {const url=safeUrl(rendered,{protocols:options.protocols});return options.absolute?url.href:rendered;}catch(_){return null;}
  }
  const linkDescriptions=new WeakMap();
  function restoreLinkDescription(anchor){const original=linkDescriptions.get(anchor);if(!original)return;for(const [name,value]of Object.entries(original)){if(value===null)anchor.removeAttribute(name);else anchor.setAttribute(name,value);}linkDescriptions.delete(anchor);delete anchor.dataset.pmkLinkTitle;}
  function describeLink(anchor) {
    if(!anchor?.getAttribute('href'))return;
    try {
      const url=safeUrl(anchor.href,{protocols:['http:','https:','mailto:','tel:','ftp:']}),en=window.PMKConfig?.getLanguage?.()==='en';
      const info=['http:','https:'].includes(url.protocol)?urlSummary(url.href):{href:url.href,parameters:[]};
      const label=(en?'Destination: ':'Destination : ')+info.href+(info.parameters.length?'\n'+(en?'Parameters sent: ':'Paramètres transmis : ')+info.parameters.map(p=>p.name+' = '+p.value).join(' ; '):'');
      if(!linkDescriptions.has(anchor))linkDescriptions.set(anchor,{title:anchor.getAttribute('title'),'aria-description':anchor.getAttribute('aria-description')});
      if(!anchor.dataset.pmkLinkTitle)anchor.dataset.pmkLinkTitle=anchor.title||' ';
      anchor.title=[anchor.dataset.pmkLinkTitle.trim(),label].filter(Boolean).join('\n');
      anchor.setAttribute('aria-description',label);
      return info;
    }catch(_){return null;}
  }
  // Shared text ownership: explicit user labels override module presentation defaults.
  const labelLayers = new Map();
  function labelNode(element) {
    if(element?.nodeType===Node.TEXT_NODE)return element;
    if(!element?.querySelector)return null;
    const title=element.querySelector('.dt-column-title, .label');
    if(title)return labelNode(title);
    const own=[...element.childNodes].find(node=>node.nodeType===Node.TEXT_NODE && node.data.trim());
    if(own)return own;
    const simple=[...element.children].find(child=>!child.matches('button,input,select,textarea,i,img,svg,.fa,[data-pmk-ui-injected]') && !child.children.length && child.textContent.trim());
    return simple ? labelNode(simple) : null;
  }
  function renderLabel(node,state) {
    if(node.data!==state.last)state.base=node.data;
    const winner=[...state.layers.values()].sort((a,b)=>b.priority-a.priority || a.owner.localeCompare(b.owner))[0];
    const value=winner?winner.value:state.base;
    if(node.data!==value)node.data=value;
    state.last=value;
    if(!winner)labelLayers.delete(node);
  }
  const labels={
    claim(element,value,options) {
      const node=labelNode(element);if(!node)return null;
      let state=labelLayers.get(node);
      if(!state){state={base:node.data,last:node.data,layers:new Map()};labelLayers.set(node,state);}
      const layer={owner:options.owner,title:options.title||options.owner,priority:Number(options.priority)||0,value:String(value)};
      state.layers.set(layer.owner,layer);renderLabel(node,state);
      return ()=>{if(state.layers.get(layer.owner)!==layer)return;state.layers.delete(layer.owner);renderLabel(node,state);};
    },
    conflicts(root=document) {
      return [...labelLayers].filter(([node,state])=>root.contains(node) && state.layers.size>1 && new Set([...state.layers.values()].map(layer=>layer.value)).size>1).map(([node,state])=>{
        const layers=[...state.layers.values()].sort((a,b)=>b.priority-a.priority || a.owner.localeCompare(b.owner));
        return {value:node.data,winner:layers[0].title,owners:layers.map(layer=>layer.title)};
      });
    }
  };
  function contrast(foreground,background) {
    const rgb=value=>{const match=String(value||'').match(/^#([a-f0-9]{3}|[a-f0-9]{6})$/i);if(!match)return null;const h=match[1].length===3?[...match[1]].map(c=>c+c).join(''):match[1];return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));};
    const a=rgb(foreground),b=rgb(background);if(!a||!b)return null;
    const luminance=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722,x=luminance(a),y=luminance(b);
    return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  }
  function pageMatches(value) {
    if(!value||value==='*')return true;
    try {const expected=new URL(value,location.origin);return expected.pathname===location.pathname && [...expected.searchParams].every(([k,v])=>new URL(location.href).searchParams.get(k)===v);}catch(_){return false;}
  }
  function diagnose(config, root=document) {
    const rows=[], targets=new Map(),matchedNodes=new WeakMap(); let visited=0;
    function visit(value,path=[],scope=true,active=true) {
      if(++visited>12000||path.length>18)return;
      if(Array.isArray(value)){value.forEach((row,i)=>visit(row,[...path,String(i)],scope,active));return;}
      if(!object(value))return;
      const localScope=scope && (value.allPages===true || pageMatches(value.pageUrl || value.pagePath || (typeof value.path==='string'&&value.path.startsWith('/cgi-bin/')?value.path:null)));
      const localActive=active && value.enabled!==false;
      const ratio=contrast(value.textColor||value.color||value.linkColor,value.backgroundColor||value.textBackgroundColor||value.background||value.linkBackground);
      if(localScope&&localActive&&ratio!==null&&ratio<4.5)rows.push({path,kind:'contrast',state:'review',message:'Contraste texte/fond : '+ratio.toFixed(2)+' ; vérifier la lisibilité (4,5 conseillé pour du texte courant).'});
      for(const [key,entry]of Object.entries(value)) {
        if(forbidden.has(key)||sensitive.test(key))continue;
        const here=[...path,key];
        if(typeof entry==='string'&&entry.trim()&&(/selector/i.test(key)||(/^(target|anchor|root|source|after|before)$/i.test(key)&&(/[#.\[ >:+~,*]/.test(entry)||/^(body|main|table|form|h[1-6])$/.test(entry))))&&!/^https?:|^\/|^\d+$/.test(entry)&&!/[{}]/.test(entry)) {
          try {
            if(!localScope||!localActive){rows.push({path:here,kind:'target',state:'untested',message:localActive?'À vérifier sur la page concernée':'Règle désactivée'});continue;}
            const nodes=root.querySelectorAll(entry),count=nodes.length;
            const overlaps=new Set();for(const node of [...nodes].slice(0,200)){const prior=matchedNodes.get(node);if(prior&&prior.selector!==entry)overlaps.add(prior.path.join(' / '));else matchedNodes.set(node,{selector:entry,path:here});}
            if(overlaps.size)rows.push({path:here,kind:'overlap',state:'review',message:'Éléments également ciblés par '+[...overlaps].join(', ')+'. Vérifier les effets et la priorité des règles.'});
            rows.push({path:here,kind:'target',state:count?'ok':'missing',message:count+' élément(s) trouvé(s) sur cette page',selector:entry});
            const prior=targets.get(entry);if(prior)rows.push({path:here,kind:'overlap',state:'review',message:'Cible également utilisée par '+prior.join(' / ')+'. Vérifier l’ordre et les effets.'});else targets.set(entry,here);
          }catch(_){rows.push({path:here,kind:'target',state:'invalid',message:'Sélecteur invalide'});}
        } else if(typeof entry==='string'&&entry.trim()&&/url|href|endpoint/i.test(key)&&!/[{}]/.test(entry)) {
          try {const info=urlSummary(entry);rows.push({path:here,kind:'url',state:info.external?'external':'ok',message:info.external?'Destination externe : '+info.origin:'Destination de ce Koha',url:info.href,parameters:info.parameters});}
          catch(_){rows.push({path:here,kind:'url',state:'invalid',message:'Adresse invalide ou protocole non autorisé'});}
        } else if(/report.*id|^REPORT_/i.test(key)&&(typeof entry==='number'||/^\d+$/.test(String(entry)))) {
          rows.push({path:here,kind:'report',state:Number(entry)>0?'untested':'missing',reportId:Number(entry),message:Number(entry)>0?'Rapport '+entry+' : disponibilité à vérifier':'Rapport non configuré'});
        }
        if(entry && typeof entry==='object')visit(entry,here,localScope,localActive);
      }
    }
    visit(config);
    labels.conflicts(root).forEach(conflict=>rows.push({path:[],kind:'overlap',state:'review',message:'Libellé partagé « '+conflict.value+' » : priorité à '+conflict.winner+'. Autres réglages : '+conflict.owners.slice(1).join(', ')+'.'}));
    return {at:new Date().toISOString(),page:location.pathname+location.search,rows,limited:visited>12000};
  }
  async function checkReports(config,options={}) {
    const ids=[...new Set(diagnose(config).rows.filter(row=>row.kind==='report'&&row.reportId>0).map(row=>row.reportId))];
    const rows=[];
    for(const id of ids.slice(0,50)){
      if(options.signal?.aborted)break;
      try{
        const response=await fetch('/api/v1/contrib/pmk/reports/'+id+'/diagnostic',{credentials:'same-origin',headers:{Accept:'application/json'},signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)});
        const data=response.ok?await response.json():null;
        rows.push({id,state:response.ok?'ok':response.status===404?'missing':response.status===403?'forbidden':'unavailable',name:data?.name||'',parameters:data?.parameters||[],executed:false});
      }catch(error){if(options.signal?.aborted)break;rows.push({id,state:'unavailable',executed:false});}
    }
    return {rows,limited:ids.length>50};
  }
  function node(tag,text,className) {const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
  function button(text,action) {const el=node('button',text,'btn btn-default btn-sm');el.type='button';el.addEventListener('click',action);return el;}
  async function confirm(options={}) {
    const changes=(options.changes||[]).map(row=>row.label+' : '+display(row.before)+' → '+display(row.after)).join('\n');
    return window.PMKConfig.confirmAction({title:options.title,message:[options.summary,changes].filter(Boolean).join('\n\n'),confirmLabel:options.confirmLabel||'Confirmer',danger:options.danger!==false});
  }
  async function batch(entries, action, options={}) {
    const result={rows:[],completed:0,failed:0,cancelled:false};
    const previous=new Map((options.previous?.rows||[]).map(row=>[row.key,row]));
    const keys=entries.map((entry,i)=>String(options.key?options.key(entry):i));
    if(new Set(keys).size!==keys.length)throw new Error('Chaque ligne du traitement doit avoir un identifiant unique.');
    for(let i=0;i<entries.length;i++) {
      if(options.signal?.aborted){result.cancelled=true;break;}
      const entry=entries[i],key=keys[i],old=previous.get(key);
      if(options.failedOnly&&old?.ok){result.rows.push(old);result.completed++;continue;}
      let row;
      try {row={key,ok:true,value:await action(entry,i)};result.completed++;}
      catch(error){row={key,ok:false,error:String(error.message||error)};result.failed++;}
      result.rows.push(row);options.onProgress?.({...result,rows:result.rows.slice(),total:entries.length});
    }
    return result;
  }
  function mountConfigPanel(ctx) {
    const panel=node('details',undefined,'pmk-workbench-panel');
    panel.appendChild(node('summary','Vérifier mes réglages et leurs cibles'));
    const content=node('div');panel.appendChild(content);
    const labelMap=new Map();
    function labels(fields,prefix=[]){for(const field of fields||[]){const here=field.key?[...prefix,...field.key.split('.')]:prefix;if(field.label&&field.key)labelMap.set(here.join('.'),typeof field.label==='string'?field.label:(field.label.fr||field.label.en));if(field.fields)labels(field.fields,here);}}
    labels(ctx.definition.schema);
    const label=path=>labelMap.get(path.join('.'))||path.join(' / ');
    const status=node('p');status.setAttribute('role','status');
    function render() {
      content.replaceChildren();
      const custom=differences(ctx.definition.defaults||{},ctx.draft),changed=differences(ctx.saved||{},ctx.draft);
      content.appendChild(node('p',custom.length+' personnalisation(s) ; '+changed.length+' changement(s) non enregistré(s). Les vérifications ne modifient aucune donnée.'));
      let page=0;
      const table=node('table',undefined,'table table-striped table-sm');const thead=node('thead'),head=node('tr');['Réglage','Valeur par défaut','Votre valeur','Action'].forEach(t=>{const th=node('th',t);th.scope='col';head.appendChild(th);});thead.appendChild(head);table.appendChild(thead);const body=node('tbody');table.appendChild(body);
      function more(){custom.slice(page,page+30).forEach(row=>{const tr=node('tr');tr.append(node('td',label(row.path)),node('td',display(row.before,row.path)),node('td',display(row.after,row.path)));const cell=node('td');if(row.resettable&&!row.path.some(k=>sensitive.test(k)))cell.appendChild(button('Reprendre cette valeur',async()=>{
        if(!await confirm({title:'Reprendre une valeur par défaut',changes:[{label:label(row.path),before:row.after,after:row.before}],summary:'Seul ce réglage sera modifié dans le brouillon. Enregistrez ensuite pour appliquer.'}))return;
        let target=ctx.draft;for(const key of row.path.slice(0,-1)){if(forbidden.has(key)||!object(target[key]))return;target=target[key];}
        const key=row.path.at(-1);if(!key||forbidden.has(key))return;
        undo.set(ctx.moduleId,{path:row.path,before:clone(target[key]),after:clone(row.before)});target[key]=clone(row.before);ctx.changed();render();
      }));else cell.textContent='À modifier dans les options ci-dessous';tr.appendChild(cell);body.appendChild(tr);});page+=30;moreButton.hidden=page>=custom.length;}
      const moreButton=button('Afficher les suivantes',more);more();content.append(table,moreButton);
      const record=undo.get(ctx.moduleId);
      if(record)content.appendChild(button('Annuler la dernière remise à défaut',()=>{let target=ctx.draft;for(const key of record.path.slice(0,-1))target=target?.[key];const key=record.path.at(-1);if(!target||!equal(target[key],record.after)){status.textContent='Ce réglage a été modifié depuis. Annulation automatique refusée.';return;}target[key]=clone(record.before);undo.delete(ctx.moduleId);ctx.changed();render();}));
      const output=node('div');content.appendChild(button('Contrôler les cibles sur cette page',()=>{output.replaceChildren();const result=diagnose(ctx.draft);output.appendChild(node('p','Vérifié le '+new Date(result.at).toLocaleString()+' sur '+result.page+'. Une cible absente peut dépendre du contenu affiché.'));for(const row of result.rows){const line=node('p',label(row.path)+' — '+row.message);if(row.url){const code=node('code',row.url);line.append(' ',code);}output.appendChild(line);}if(!result.rows.length)output.appendChild(node('p','Aucune cible ou adresse contrôlable automatiquement pour ces réglages.'));}));content.append(output,status);
      if(window.PMKPlugin)content.appendChild(button('Vérifier les rapports configurés',async event=>{
        const trigger=event.currentTarget;trigger.disabled=true;status.textContent='Vérification des rapports…';
        try{const result=await checkReports(ctx.draft);output.replaceChildren();for(const row of result.rows){const descriptions={ok:'disponible : '+row.name,missing:'introuvable',forbidden:'accès refusé',unavailable:'vérification indisponible'};output.appendChild(node('p','Rapport '+row.id+' — '+descriptions[row.state]+(row.parameters.length?' · Paramètres : '+row.parameters.join(', '):'')));}status.textContent=(result.rows.length?'Métadonnées vérifiées. Aucun rapport exécuté ; les colonnes et le contenu restent à vérifier avec les données de ce Koha.':'Aucun rapport configuré à vérifier.')+(result.limited?' Contrôle limité aux 50 premiers rapports.':'');}catch(_){status.textContent='Vérification indisponible. Aucun réglage modifié.';}finally{trigger.disabled=false;}
      }));
    }
    panel.open=openPanels.has(ctx.moduleId);if(panel.open)render();
    panel.addEventListener('toggle',()=>{if(!panel.isConnected)return;if(panel.open){openPanels.add(ctx.moduleId);render();}else openPanels.delete(ctx.moduleId);});
    return panel;
  }
  const api={version:'1.0.0',differences,diagnose,checkReports,safeUrl,urlSummary,renderTemplate,describeLink,restoreLinkDescription,contrast,labels,confirm,batch,mountConfigPanel,display,equal};
  window.PMKWorkbench=api;
  window.PMKConfig?.services.register('workbench',api);
})();
