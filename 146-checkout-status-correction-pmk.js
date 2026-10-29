/* PMK 145 — Correction du statut au prêt — pré-plugin v0.5.1
 * Koha 25.11. À charger dans IntranetUserJS APRÈS 000-pmk-config-firestore.js.
 * Enregistrement dans PMKConfig (aucun manifeste/plugin/KohaTools requis).
 * Une catégorie VA modifiable pour chaque statut et synchronisation des motifs.
 * Sécurité : module désactivé par défaut et aucune valeur autorisée au départ.
 */
(function () {
  'use strict';
  const ID = 'checkout-status-correction';
  if(window.__PMK145_PREPLUGIN_LOADER__)return;
  window.__PMK145_PREPLUGIN_LOADER__=true;
  const defaults={enabled:false,categoryNotForLoan:'STATUT',categoryLost:'LOST',allowNotForLoan:[],allowLost:[],valuesNotForLoan:[],valuesLost:[]};
  const validCodes=a=>Array.isArray(a)?[...new Set(a.map(String).filter(x=>/^-?\d+$/.test(x)&&Number(x)!==0))]:[];
  const category=s=>String(s||'').trim().toUpperCase();
  const validCategory=s=>/^[A-Z0-9_-]{1,40}$/.test(category(s));
  const normalize=c=>{
    const x=Object.assign({},defaults,c||{});
    x.enabled=x.enabled===true;
    x.categoryNotForLoan=category(x.categoryNotForLoan);
    x.categoryLost=category(x.categoryLost);
    x.allowNotForLoan=validCodes(x.allowNotForLoan);
    x.allowLost=validCodes(x.allowLost);
    x.valuesNotForLoan=Array.isArray(x.valuesNotForLoan)?x.valuesNotForLoan:[];
    x.valuesLost=Array.isArray(x.valuesLost)?x.valuesLost:[];
    return x;
  };
  let currentConfig=normalize(defaults);
  const txt=s=>({fr:s,en:s});
  function checkRenderer(key,valuesKey){
    return function({rootObject}){
      const host=document.createElement('div');
      const rows=Array.isArray(rootObject[valuesKey])?rootObject[valuesKey]:[];
      const chosen=new Set(validCodes(rootObject[key]));
      if(!rows.length){host.textContent='Aucun motif chargé. Renseignez la catégorie puis cliquez sur « Charger les motifs ». ';return host;}
      const hint=document.createElement('small');hint.textContent='Cochez les motifs que le personnel pourra remettre à 0 après le prêt.';host.appendChild(hint);
      for(const v of rows){
        const code=String(v.value),lab=document.createElement('label'),check=document.createElement('input'),span=document.createElement('span');
        lab.style.cssText='display:flex;gap:8px;align-items:center;margin:7px 0;cursor:pointer';
        check.type='checkbox';check.checked=chosen.has(code);
        for(const ev of ['pointerdown','mousedown','mouseup','click','dblclick']){
          check.addEventListener(ev,e=>e.stopPropagation());
          lab.addEventListener(ev,e=>e.stopPropagation());
        }
        check.addEventListener('change',(event)=>{
          event.stopPropagation();
          const set=new Set(validCodes(rootObject[key]));
          if(check.checked)set.add(code);else set.delete(code);
          rootObject[key]=[...set];
          // Déclare le brouillon modifié, sans reconstruire le formulaire.
          const categoryField=document.querySelector('#pmk-config-overlay [data-pmk-field-path="'+(key==='allowLost'?'categoryLost':'categoryNotForLoan')+'"]');
          if(categoryField)categoryField.dispatchEvent(new Event('input',{bubbles:false}));
        });
        span.textContent=code+' — '+String(v.description||v.opac_description||code);
        lab.append(check,span);host.appendChild(lab);
      }
      return host;
    };
  }
  function sync(categoryKey,valuesKey,allowKey){
    return async function({rootObject}){
      const cat=category(rootObject[categoryKey]);
      if(!validCategory(cat))return {message:'Catégorie VA invalide : saisissez un identifiant comme LOST ou STATUT.',level:'danger'};
      const response=await fetch('/api/v1/authorised_value_categories/'+encodeURIComponent(cat)+'/authorised_values?_per_page=500',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
      if(!response.ok)throw new Error('Chargement des valeurs autorisées : HTTP '+response.status);
      const result=await response.json();
      if(!Array.isArray(result))throw new Error('Réponse API invalide');
      const values=result.filter(v=>/^-?\d+$/.test(String(v.value))&&Number(v.value)!==0)
        .map(v=>({value:String(v.value),description:String(v.description||v.opac_description||v.value)}));
      rootObject[categoryKey]=cat;
      rootObject[valuesKey]=values;
      const known=new Set(values.map(v=>v.value));
      rootObject[allowKey]=validCodes(rootObject[allowKey]).filter(v=>known.has(v));
      return {changed:true,refresh:true,message:values.length+' motif(s) chargés depuis '+cat+'. Sélectionnez les motifs, puis cliquez sur Enregistrer.'};
    };
  }
  let registered=false;
  function register(){
    if(registered)return true;
    if(!window.PMKConfig || typeof window.PMKConfig.registerModule!=='function')return false;
    registered=true;
    window.PMKConfig.registerModule({
      id:ID,schemaVersion:1,
      name:{fr:'Correction du statut au prêt',en:'Checkout status correction'},
      description:{fr:'Lors d’un prêt forcé, permet de rendre empruntable un exemplaire pour les seuls motifs autorisés. Le prêt reste géré par Koha.',en:'Safely correct eligible item statuses after a native Koha checkout.'},
      category:{fr:'Circulation',en:'Circulation'},
      supportedPages:['/cgi-bin/koha/circ/circulation.pl'],prerequisites:[],dependencies:[],
      defaults:defaults,normalize:normalize,
      validate:c=>validCategory(c.categoryNotForLoan)&&validCategory(c.categoryLost)?{ok:true}:{ok:false,message:'Catégories VA invalides (1 à 40 caractères : lettres, chiffres, _ ou -).'},
      schema:[
        {type:'section',id:'statut',label:txt('1. Exclusion du prêt (STATUT)'),description:txt('Choisissez la catégorie VA de votre Koha, chargez ses motifs puis cochez uniquement les corrections autorisées.'),fields:[
          {key:'categoryNotForLoan',type:'text',label:txt('Catégorie VA pour le statut de prêt'),help:txt('Par défaut : STATUT. Modifiable selon votre paramétrage Koha.')},
          {type:'action',label:txt('Motifs du statut'),buttonLabel:txt('Charger les motifs'),action:sync('categoryNotForLoan','valuesNotForLoan','allowNotForLoan')},
          {type:'custom',label:txt('Motifs autorisés'),render:checkRenderer('allowNotForLoan','valuesNotForLoan')}
        ]},
        {type:'section',id:'perdu',label:txt('2. Statut perdu (LOST)'),description:txt('Catégorie VA indépendante : modifiez-la ici avant de charger les motifs de perte.'),fields:[
          {key:'categoryLost',type:'text',label:txt('Catégorie VA pour le statut perdu'),help:txt('Par défaut : LOST. Vous pouvez saisir le code exact de votre installation.')},
          {type:'action',label:txt('Motifs de perte'),buttonLabel:txt('Charger les motifs'),action:sync('categoryLost','valuesLost','allowLost')},
          {type:'custom',label:txt('Motifs autorisés'),render:checkRenderer('allowLost','valuesLost')}
        ]}
      ]
    });
    window.PMKConfig.getConfig(ID).then(c=>{currentConfig=normalize(c);startRuntime();}).catch(e=>console.warn('[PMK145] Configuration PMK indisponible',e));
    if(typeof window.PMKConfig.subscribe==='function')window.PMKConfig.subscribe(ID,c=>{currentConfig=normalize(c);});
    return true;
  }
  function startRuntime(){
    if(!/\/cgi-bin\/koha\/circ\/circulation\.pl$/.test(location.pathname))return;
    if(!currentConfig.enabled)return;
      ;(function () {
        'use strict';
        const MODULE = 'pmk145-checkout-status';
        const VERSION = '0.5.1';
        if (!/\/cgi-bin\/koha\/circ\/circulation\.pl$/.test(location.pathname)) return;
        if (window.__PMK145__) return;
        window.__PMK145__ = VERSION;
        console.info('[PMK145] v'+VERSION+' chargé (réglages dans PMK)');
      
        const PENDING_KEY = MODULE + ':pending:v1';
        const STATUS = {
          not_for_loan_status: { category: 'categoryNotForLoan', allowed: 'allowNotForLoan', label: 'Statut' },
          lost_status: { category: 'categoryLost', allowed: 'allowLost', label: 'Motif d’exclusion (LOST)' }
        };
        const css = `
        #pmk145-notice { padding:12px 15px;margin:10px 0;border-radius:5px;border:1px solid #8cabc4;background:#eaf4fc; }
        #pmk145-notice.pmk145-ok { background:#e8f5e9;border-color:#8ebf92; }
        #pmk145-notice.pmk145-warn { background:#fff3d5;border-color:#ddba60; }
        #pmk145-action { margin-left:10px; }
        #pmk145-action + .pmk145-action-hint { display:block;font-size:12px;margin-top:5px;color:#495057; }
        #pmk145-decision-trace { margin:6px 0 0;font-size:12px;color:#495057; }
        #pmk145-decision-trace summary { cursor:pointer;font-weight:600; }
        #pmk145-decision-trace ol { margin:4px 0 0;padding-left:20px; }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        const $ = (q,root=document) => root.querySelector(q);
        const $$ = (q,root=document) => Array.from(root.querySelectorAll(q));
        const el = (tag, opts={}) => Object.assign(document.createElement(tag),opts);
        const make = (tag,text,cls='') => {const node=el(tag);node.textContent=text;if(cls)node.className=cls;return node;};
        const safeList = input => Array.isArray(input) ? [...new Set(input.map(String).filter(s=>/^-?\d+$/.test(s)&&Number(s)!==0))] : [];
        // Catégories VA personnalisables dans PMK.
        // Une catégorie par champ, ou plusieurs séparées par une virgule, un point-virgule
        // ou un saut de ligne. Compatibilité avec les anciens réglages à catégorie unique.
        const categoryList = (value, fallback) => {
          const raw = Array.isArray(value) ? value : String(value ?? fallback).split(/[,;\n]+/);
          return [...new Set(raw.map(v=>String(v).trim().toUpperCase()).filter(v=>/^[A-Z0-9_-]{1,40}$/.test(v)))];
        };
        // Chargé exclusivement depuis le registre pré-plugin PMKConfig.
        const readConfig = () => currentConfig;
        const validCategory = s=>/^[A-Za-z0-9_-]{1,40}$/.test(s);
        const apiBase='/api/v1';
        async function api(path,method='GET',body=null){
          const headers={Accept:'application/json'};
          if(body!==null){
            headers['Content-Type']='application/json';
            const token=$('meta[name="csrf-token"]')?.content;
            if(token)headers['CSRF-TOKEN']=token;
          }
          const res=await fetch(apiBase+path,{method,credentials:'same-origin',headers,body:body===null?undefined:JSON.stringify(body),cache:'no-store'});
          const raw=await res.text();
          let data;
          try{data=raw?JSON.parse(raw):null;}catch{data={error:raw.slice(0,180)};}
          if(!res.ok)throw new Error('API '+res.status+' — '+(data?.error||data?.message||res.statusText));
          return data;
        }
        // Diagnostic uniquement dans la console : aucun réglage sur l'interface de prêt.
        function debugState(message, warning=false) {
          if(warning) console.warn('[PMK145] '+message);
          else console.debug('[PMK145] '+message);
        }
        function notice(text,kind='warn'){
          let host=$('#pmk145-notice');
          if(!host){
            host=make('div','');host.id='pmk145-notice';host.setAttribute('role','status');
            const target=$('#transient_result')||$('#circ_needsconfirmation')||$('#mainform')||$('h1')||document.body;
            target.parentNode.insertBefore(host,target);
          }
          host.className=kind==='ok'?'pmk145-ok':'pmk145-warn';host.hidden=false;host.textContent=text;
        }
        const currentPatron=()=>{
          const form=$('#mainform');
          return String(form?.querySelector('[name="borrowernumber"]')?.value||new URLSearchParams(location.search).get('borrowernumber')||$('form.confirmation-required-form [name="borrowernumber"]')?.value||'');
        };
        const readPending=()=>{
          try{return JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');}catch{return null;}
        };
        const clearPending=()=>sessionStorage.removeItem(PENDING_KEY);
        const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
        async function findItemByBarcode(barcode){
          const params=new URLSearchParams({external_id:barcode,_match:'exact',_per_page:'10'});
          const items=await api('/items?'+params.toString());
          if(!Array.isArray(items))throw new Error('Liste des exemplaires illisible');
          const matches=items.filter(v=>String(v.external_id)===barcode);
          if(matches.length!==1)throw new Error('Exemplaire introuvable ou code-barres non unique');
          return matches[0];
        }
        async function fetchItem(itemId){return api('/items/'+encodeURIComponent(itemId));}
        async function getAV(categories){
          const selected=categoryList(categories, '');
          if(!selected.length)throw new Error('Aucune catégorie VA valide configurée dans PMK');
          const values=[];
          for(const category of selected){
            const params=new URLSearchParams({_per_page:'500'});
            const r=await api('/authorised_value_categories/'+encodeURIComponent(category)+'/authorised_values?'+params);
            if(!Array.isArray(r))throw new Error('Les valeurs autorisées de '+category+' sont illisibles');
            values.push(...r.map(v=>({...v,pmk145Category:category})));
          }
          return values;
        }
        function decide(item,c){
          if(!c.enabled)return null;
          // Ne pas corriger des exemplaires retirés ou abîmés, ni une combinaison de deux statuts.
          if(Number(item.withdrawn||0)!==0||Number(item.damaged_status||0)!==0)return null;
          const nfl=Number(item.not_for_loan_status||0), lost=Number(item.lost_status||0);
          if(!Number.isInteger(nfl)||!Number.isInteger(lost))return null;
          if(nfl!==0&&lost===0&&c.allowNotForLoan.includes(String(nfl))){
            return {field:'not_for_loan_status',value:nfl};
          }
          if(lost!==0&&nfl===0&&c.allowLost.includes(String(lost))){
            return {field:'lost_status',value:lost};
          }
          return null;
        }
        function confirmationIsStatusOnly(box){
          if(!box || box.hidden || getComputedStyle(box).display==='none')return false;
          const rows=$$('li.needsconfirm',box);
          if(rows.length!==1)return false;
          const li=rows[0];
          // Les réservations et les autres exceptions n'entrent jamais dans ce dispositif.
          const classNames=li.className.toLowerCase();
          const statusClass=/(?:^|\s)(?:not_for_loan_forcing|itemlost|item_lost|lost|item_notforloan)(?:\s|$)/.test(classNames);
          if(!statusClass)return false;
          const flags=$$('input[name="session_confirmations"]',box).map(n=>n.value);
          const allowedFlags=new Set(['NOT_FOR_LOAN_FORCING','item_notforloan','item_lost','itemlost','ITEM_LOST']);
          if(flags.some(s=>!allowedFlags.has(s)))return false;
          if(/r[eé]serv(?:ation|[eé])|hold\s+(?:found|waiting)|transfer|transfert/i.test(li.textContent||''))return false;
          return true;
        }
        function clearAction(){
          const b=$('#pmk145-action');
          if(b){
            const hint=b.nextElementSibling;
            if(hint?.classList.contains('pmk145-action-hint'))hint.remove();
            b.remove();
          }
          $('#pmk145-decision-trace')?.remove();
        }
        let installing=false;
        async function initConfirmation(){
          const box=$('#circ_needsconfirmation');
          const confirmForm=box?.querySelector('form.confirmation-required-form');
          const nativeYes=confirmForm?.querySelector('button.approve[type="submit"]');
          if(!confirmForm||!nativeYes||installing)return;
          if(!confirmationIsStatusOnly(box)){
            clearAction();
            debugState('Confirmation non éligible (réservation ou autre avertissement)');return;
          }
          const c=readConfig();
          if(!c.enabled){clearAction();debugState('Désactivé dans les options');return;}
          if(!c.allowNotForLoan.length&&!c.allowLost.length){
            clearAction();
            debugState('Aucun motif autorisé dans la configuration PMK',true);return;
          }
          if($('#pmk145-action'))return;
          const barcode=confirmForm.querySelector('[name="barcode"]')?.value?.trim();
          const patron=confirmForm.querySelector('[name="borrowernumber"]')?.value?.trim();
          if(!barcode||!/^\d+$/.test(patron)){
            debugState('Code-barres ou numéro d’adhérent introuvable sur la confirmation',true);return;
          }
          installing=true;
          try{
            const item=await findItemByBarcode(barcode);
            // Ne pas modifier un document qui était déjà emprunté avant cette opération.
            if(item.checked_out_date){debugState('Exemplaire déjà en prêt avant l’opération');return;}
            const decision=decide(item,c);
            if(!decision){
              clearAction();
              const n=Number(item.not_for_loan_status||0),l=Number(item.lost_status||0);
              debugState('Statut actuel non autorisé ou situation complexe (STATUT='+n+', LOST='+l+')',true);
              return;
            }
            const fieldInfo=STATUS[decision.field];
            const av=await getAV(c[fieldInfo.category]);
            const known=av.some(x=>String(x.value)===String(decision.value));
            if(!known){debugState('Valeur '+decision.value+' absente des VA '+c[fieldInfo.category],true);return;}
            // Empêche une proposition pour un motif visuellement différent (ex. perte et avertissement de prêt).
            const msg=box.querySelector('li.needsconfirm')||box;
            const match=av.find(x=>String(x.value)===String(decision.value));
            const label=match?.description||String(decision.value);
            const button=el('button',{type:'button',id:'pmk145-action',className:'btn btn-primary'});
            button.textContent='Prêter et rendre empruntable';
            button.title='Prêt Koha classique puis remise à zéro du seul champ '+fieldInfo.label+' ('+label+', catégorie '+(match?.pmk145Category||'?')+')';
            nativeYes.insertAdjacentElement('afterend',button);
            debugState('Motif autorisé : bouton de correction disponible');
            const hint=make('small','Correction proposée : '+fieldInfo.label+' « '+label+' » → 0. Le prêt est d’abord effectué par Koha.', 'pmk145-action-hint');
            button.insertAdjacentElement('afterend',hint);
            const trace=el('details',{id:'pmk145-decision-trace'}),summary=make('summary','Pourquoi cette correction est proposée'),steps=el('ol');
            [
              'Koha demande une confirmation de prêt pour ce seul statut.',
              'L’exemplaire '+barcode+' a été relu : '+fieldInfo.label+' = '+decision.value+'.',
              'La valeur « '+label+' » est autorisée dans la catégorie '+(match?.pmk145Category||'?')+'.',
              'Koha effectuera le prêt avant que PMK relise et corrige uniquement ce statut.'
            ].forEach(text=>steps.append(make('li',text)));
            trace.append(summary,steps);hint.insertAdjacentElement('afterend',trace);
            button.addEventListener('click',async()=>{
              if(button.disabled)return;
              button.disabled=true;
              try{
                const fresh=await fetchItem(item.item_id);
                if(String(fresh.external_id)!==barcode||Number(fresh.biblio_id)!==Number(item.biblio_id))throw new Error('Exemplaire différent');
                const d=decide(fresh,readConfig());
                if(!d||d.field!==decision.field||d.value!==decision.value)throw new Error('Statut modifié ou non autorisé');
                if(fresh.checked_out_date)throw new Error('Exemplaire déjà emprunté avant cette confirmation');
                if(!confirmationIsStatusOnly(box))throw new Error('Confirmation Koha modifiée');
                const pending={barcode,patron,itemId:Number(item.item_id),biblioId:Number(item.biblio_id),field:d.field,from:d.value,ts:Date.now()};
                sessionStorage.setItem(PENDING_KEY,JSON.stringify(pending));
                // On ne reproduit jamais le prêt : soumission de son formulaire Koha original.
                if(confirmForm.requestSubmit)confirmForm.requestSubmit(nativeYes);
                else nativeYes.click();
                // Si une validation client empêche la soumission, le verrou temporel fera expirer l'opération.
              }catch(e){
                button.disabled=false;notice('Prêt non envoyé par PMK : '+e.message+' — utilisez le bouton Koha habituel.');
              }
            });
          }catch(e){
            // L'API est peut-être indisponible pour l'agent ; ne pas altérer la confirmation native.
            debugState('Impossible de vérifier l’exemplaire par API : '+e.message,true);
            console.warn('[PMK145] Aucune proposition de correction :',e);
          }finally{installing=false;}
        }
        async function verifyCheckout(pending){
          // Vérification sur les prêts ACTIFS du lecteur, filtrés sur l'item exact.
          const q=new URLSearchParams({q:JSON.stringify({item_id:pending.itemId}),_per_page:'20'});
          const checkouts=await api('/patrons/'+encodeURIComponent(pending.patron)+'/checkouts?'+q);
          if(!Array.isArray(checkouts))throw new Error('Réponse prêts illisible');
          const matches=checkouts.filter(x=>Number(x.item_id)===pending.itemId&&Number(x.patron_id)===Number(pending.patron));
          if(matches.length!==1)throw new Error('Le prêt actif du document au lecteur n’est pas confirmé');
          return matches[0];
        }
        async function finishPending(){
          const p=readPending();if(!p)return;
          if(!p.ts||Date.now()-p.ts>90000){clearPending();return;}
          // Attendre la réponse après « Prêter », sans toucher à une éventuelle nouvelle confirmation.
          if($('#circ_needsconfirmation')&&confirmationIsStatusOnly($('#circ_needsconfirmation')))return;
          if(currentPatron()!==String(p.patron)){
            clearPending();return;
          }
          if(window.__PMK145_FINISHING__)return;
          window.__PMK145_FINISHING__=true;
          const freshConfig=readConfig();
          try{
            let checkout;
            for(let n=0;n<4;n++){
              try{checkout=await verifyCheckout(p);break;}catch(e){if(n===3)throw e;await sleep(400*(n+1));}
            }
            const before=await fetchItem(p.itemId);
            if(Number(before.biblio_id)!==p.biblioId||String(before.external_id)!==p.barcode)throw new Error('Identité de l’exemplaire modifiée');
            if(!checkout)throw new Error('Prêt introuvable');
            if(Number(before[p.field])===0){
              // Certains paramétrages natifs Koha changent déjà le statut au prêt.
              clearPending();
              notice('Prêt confirmé : Koha avait déjà remis le statut à empruntable pour '+p.barcode+'.','ok');
              return;
            }
            const rule=decide(before,freshConfig);
            if(!rule||rule.field!==p.field||rule.value!==p.from)throw new Error('Le statut a évolué ou sa correction n’est plus autorisée');
            const changes={[p.field]:0};
            // PUT ne doit pas modifier d'autres champs : on transmet exclusivement le champ concerné.
            await api('/biblios/'+p.biblioId+'/items/'+p.itemId,'PUT',changes);
            const after=await fetchItem(p.itemId);
            if(Number(after[p.field])!==0)throw new Error('Koha n’a pas confirmé la remise à zéro');
            await verifyCheckout(p);
            clearPending();
            notice('Prêt confirmé et statut corrigé sur l’exemplaire '+p.barcode+' (valeur '+p.from+' → 0).','ok');
          }catch(e){
            clearPending();
            notice('Le prêt Koha n’a PAS été annulé. Correction PMK non confirmée : '+e.message+'. Vérifiez le prêt et le statut de l’exemplaire avant toute autre action.','warn');
            console.error('[PMK145]',e);
          }finally{window.__PMK145_FINISHING__=false;}
        }
        function start(){
          initConfirmation();
          finishPending();
          // Koha et PMK peuvent reconstruire le bloc de confirmation après chargement.
          let timer;
          const obs=new MutationObserver(()=>{
            clearTimeout(timer);
            timer=setTimeout(initConfirmation,120);
          });
          // Important sur Koha 25.11 : #messages est hors du bloc de confirmation.
          // Observer document.body pour les reconstructions AJAX de circ_needsconfirmation.
          obs.observe(document.body,{childList:true,subtree:true});
        }
        if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
        else start();
      })();
  }
  if(!register()){
    window.addEventListener('pmk:config-ready',register,{once:true});
    let attempts=0;
    const timer=setInterval(()=>{if(register()||++attempts>=100)clearInterval(timer);},100);
  }
})();
