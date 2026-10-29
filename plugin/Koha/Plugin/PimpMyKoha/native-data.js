/* PMK native documents: authenticated Koha API, atomic SQL commits, no remote SDK. */
(function () {
    'use strict';
    if (window.PMKNativeData) return;
    const namespaces = ['attendance','appointments','journal','lists','taxonomy','planning','frequency','internal-share','authorities'];
    const subscriptions = new Set();
    const clone = value => value == null ? value : revive(JSON.parse(JSON.stringify(value)));
    class Timestamp {
        constructor(seconds, nanoseconds = 0) { this.__pmkType='timestamp'; this.seconds=seconds; this.nanoseconds=nanoseconds; }
        static fromDate(date) { return Timestamp.fromMillis(date.getTime()); }
        static fromMillis(ms) { if (!Number.isFinite(ms)) throw new Error('invalid_timestamp'); const sec=Math.floor(ms/1000); return new Timestamp(sec,Math.round((ms-sec*1000)*1e6)); }
        static now() { return Timestamp.fromMillis(Date.now()); }
        toMillis() { return this.seconds*1000+this.nanoseconds/1e6; }
        toDate() { return new Date(this.toMillis()); }
        valueOf() { return this.toMillis(); }
    }
    function revive(value) {
        if (Array.isArray(value)) return value.map(revive);
        if (value && typeof value==='object') {
            if (value.__pmkType==='timestamp' || (typeof value.seconds==='number' && typeof value.nanoseconds==='number' && Object.keys(value).every(k=>['seconds','nanoseconds','type'].includes(k)))) return new Timestamp(value.seconds,value.nanoseconds);
            if (typeof value._seconds==='number' && typeof value._nanoseconds==='number' && Object.keys(value).every(k=>['_seconds','_nanoseconds'].includes(k))) return new Timestamp(value._seconds,value._nanoseconds);
            return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,revive(v)]));
        }
        return value;
    }
    async function request(db,input) {
        const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),30000);
        try {
            const response=await fetch('/api/v1/contrib/pmk/data/'+encodeURIComponent(db.namespace),{
                method:'POST',credentials:'same-origin',signal:controller.signal,
                headers:{Accept:'application/json','Content-Type':'application/json','X-PMK-Request':'1'},body:JSON.stringify(input)
            });
            const result=await response.json();
            if(!response.ok){const e=new Error(result.error||'Koha HTTP '+response.status);e.status=response.status;e.code=result.error;throw e;}
            return result;
        } finally { clearTimeout(timer); }
    }
    let sessionPromise;
    function getSession() {
        if(!sessionPromise)sessionPromise=fetch('/api/v1/contrib/pmk/session',{credentials:'same-origin',headers:{Accept:'application/json'}}).then(async r=>{if(!r.ok)throw new Error('Session Koha requise');return r.json();}).catch(e=>{sessionPromise=null;throw e;});
        return sessionPromise;
    }
    function createDatabase(namespace) {
        if(!namespaces.includes(namespace))throw new Error('invalid_namespace');
        return Object.freeze({namespace});
    }
    function reference(base,parts,kind) {
        const db=base.db||base;
        let path=[base.path||'',...parts].filter(x=>x!=='').join('/');
        if(kind==='document'&&parts.length===0&&base.kind==='collection')path+='/'+crypto.randomUUID();
        const seg=path.split('/');
        if(!path||path.length>512||seg.some(x=>!x||x==='.'||x==='..'||x.length>190)||seg.length%2!==(kind==='collection'?1:0))throw new Error('invalid_path');
        return Object.freeze({db,path,kind,id:seg.at(-1)});
    }
    const collection=(base,...parts)=>reference(base,parts,'collection');
    const doc=(base,...parts)=>reference(base,parts,'document');
    function snapshot(ref,result) { return {id:ref.id,ref,revision:result.revision||0,audit:clone(result.audit||null),exists:()=>!!result.exists,data:()=>clone(result.data)}; }
    async function getDoc(ref) { const r=await request(ref.db,{action:'get',path:ref.path});return snapshot(ref,r); }
    function field(data,path) { return path.split('.').reduce((v,k)=>v?.[k],data); }
    function comparable(v) { if(v instanceof Timestamp)return v.toMillis();if(v instanceof Date)return v.getTime();return v; }
    function equal(a,b) { return JSON.stringify(a)===JSON.stringify(b); }
    function testWhere(data,c) {
        const a=field(data,c.field),b=c.value,x=comparable(a),y=comparable(b);
        if(a===undefined)return false;
        switch(c.op){
            case '==':return equal(a,b);case '!=':return !equal(a,b);
            case '>=':return x>=y;case '<=':return x<=y;case '>':return x>y;case '<':return x<y;
            case 'in':return b.some(v=>equal(a,v));case 'not-in':return !b.some(v=>equal(a,v));
            case 'array-contains':return Array.isArray(a)&&a.some(v=>equal(v,b));
            case 'array-contains-any':return Array.isArray(a)&&a.some(v=>b.some(w=>equal(v,w)));
            default:throw new Error('unsupported_query_operator');
        }
    }
    const where=(field,op,value)=>({type:'where',field,op,value});
    const orderBy=(field,direction='asc')=>({type:'order',field,direction});
    const limit=count=>({type:'limit',count});
    function query(ref,...constraints) { return {...ref,constraints:[...(ref.constraints||[]),...constraints]}; }
    async function getDocs(ref) {
        let all=[],after=null;
        do {const r=await request(ref.db,{action:'list',parent:ref.path,after});all.push(...r.documents);after=r.next;} while(after);
        let docs=all.map(r=>snapshot(doc(ref.db,r.path),{...r,exists:true,data:revive(r.data)}));
        const constraints=ref.constraints||[],orders=constraints.filter(c=>c.type==='order');
        docs=docs.filter(d=>constraints.filter(c=>c.type==='where').every(c=>testWhere(d.data(),c))&&orders.every(c=>field(d.data(),c.field)!==undefined));
        docs.sort((a,b)=>{for(const o of orders){const x=comparable(field(a.data(),o.field)),y=comparable(field(b.data(),o.field));if(x<y)return o.direction==='desc'?1:-1;if(x>y)return o.direction==='desc'?-1:1;}return a.ref.path.localeCompare(b.ref.path);});
        for(const c of constraints.filter(c=>c.type==='limit'))docs=docs.slice(0,c.count);
        return {docs,size:docs.length,empty:!docs.length,forEach:fn=>docs.forEach(fn)};
    }
    function notify(db) { subscriptions.forEach(s=>{if(s.ref.db.namespace===db.namespace)s.refresh();}); }
    async function commit(db,reads,writes) {const result=await request(db,{action:'commit',reads,writes});notify(db);return result;}
    async function setDoc(ref,data,options={}) {return commit(ref.db,[],[{path:ref.path,op:'set',data,merge:!!options.merge}]);}
    async function updateDoc(ref,data) {return commit(ref.db,[],[{path:ref.path,op:'update',data}]);}
    async function deleteDoc(ref) {return commit(ref.db,[],[{path:ref.path,op:'delete'}]);}
    async function addDoc(ref,data) {const r=doc(ref);await setDoc(r,data);return r;}
    const serverTimestamp=()=>({__pmkType:'serverTimestamp'});
    function writeBatch(db) {
        const writes=[];
        const batch={set(ref,data,options={}){validate(ref);writes.push({path:ref.path,op:'set',data,merge:!!options.merge});return batch;},
            update(ref,data){validate(ref);writes.push({path:ref.path,op:'update',data});return batch;},
            delete(ref){validate(ref);writes.push({path:ref.path,op:'delete'});return batch;},
            commit(){return commit(db,[],writes);}};
        function validate(ref){if(ref.db.namespace!==db.namespace)throw new Error('cross_namespace_batch');}
        return batch;
    }
    async function runTransaction(db,callback) {
        for(let attempt=0;attempt<5;attempt++) {
            const reads=new Map(),writes=[];
            function validate(ref){if(ref.db.namespace!==db.namespace)throw new Error('cross_namespace_transaction');}
            const tx={async get(ref){validate(ref);if(writes.length)throw new Error('read_before_write_required');const s=await getDoc(ref);reads.set(ref.path,s.revision);return s;},
                set(ref,data,options={}){validate(ref);writes.push({path:ref.path,op:'set',data,merge:!!options.merge});return tx;},
                update(ref,data){validate(ref);writes.push({path:ref.path,op:'update',data});return tx;},
                delete(ref){validate(ref);writes.push({path:ref.path,op:'delete'});return tx;}};
            const result=await callback(tx);
            try {await commit(db,[...reads].map(([path,revision])=>({path,revision})),writes);return result;}
            catch(e){if(e.status!==409||attempt===4)throw e;await new Promise(r=>setTimeout(r,20*(attempt+1)));}
        }
    }
    function onSnapshot(ref,callback,onError=console.error) {
        let stopped=false,busy=false,again=false,last=null;
        const s={ref,async refresh(){
            if(stopped)return;if(busy){again=true;return;}busy=true;
            try {const snap=ref.kind==='document'?await getDoc(ref):await getDocs(ref);const signature=JSON.stringify(ref.kind==='document'?[snap.revision,snap.exists()]:snap.docs.map(d=>[d.ref.path,d.revision]));
                if(!stopped&&signature!==last){last=signature;callback(snap);}}
            catch(e){if(!stopped)onError(e);}finally{busy=false;if(again){again=false;s.refresh();}}
        }};
        subscriptions.add(s);s.refresh();
        const timer=setInterval(()=>{if(!document.hidden)s.refresh();},4000);
        const visible=()=>{if(!document.hidden)s.refresh();};document.addEventListener('visibilitychange',visible);
        return ()=>{stopped=true;clearInterval(timer);subscriptions.delete(s);document.removeEventListener('visibilitychange',visible);};
    }
    async function exportNamespace(namespace) {
        const db=createDatabase(namespace);let documents=[],after=null;
        do{const r=await request(db,{action:'export',after});documents.push(...r.documents);after=r.next;}while(after);
        return {format:'pmk-native-data-v1',namespace,documents};
    }
    async function previewImport(namespace,input) {
        if(input.namespace && input.namespace!==namespace)throw new Error('Le fichier concerne un autre module : '+input.namespace);
        const documents=Array.isArray(input.documents)?input.documents:null;
        if(!documents)throw new Error('Fichier attendu : {documents:[{path,data}]}');
        const db=createDatabase(namespace),seen=new Set(),rows=[];
        for(const item of documents){
            if(!item||typeof item.data!=='object'||item.data===null||Array.isArray(item.data))throw new Error('Document JSON invalide');
            const ref=doc(db,item.path);if(seen.has(ref.path))throw new Error('Chemin en double : '+ref.path);seen.add(ref.path);
            const snap=await getDoc(ref);rows.push({path:ref.path,data:item.data,exists:snap.exists(),revision:snap.revision});
        }
        return {namespace,rows,create:rows.filter(r=>!r.exists).length,existing:rows.filter(r=>r.exists).length};
    }
    async function applyImport(preview) {
        // Preserve all existing documents. Compare even missing rows against their
        // preview revision, so concurrent creation cannot be overwritten.
        if(!(await getSession()).isAdmin)throw new Error('Administrateur Koha requis');
        const db=createDatabase(preview.namespace),rows=preview.rows.filter(r=>!r.exists);
        let chunk=[],bytes=0;async function flush(){if(!chunk.length)return;await commit(db,chunk.map(r=>({path:r.path,revision:r.revision})),chunk.map(r=>({op:'set',path:r.path,data:r.data})));chunk=[];bytes=0;}
        for(const row of rows){const size=new TextEncoder().encode(JSON.stringify(row)).length;if(size>8_000_000)throw new Error('Document trop volumineux : '+row.path);if(chunk.length>=200||bytes+size>8_000_000)await flush();chunk.push(row);bytes+=size;}await flush();
        return {created:rows.length,preserved:preview.rows.length-rows.length};
    }
    async function previewConfiguration(input) {
        const documents=input.moduleId&&input.config ? [{path:input.moduleId,data:{config:input.config}}]
            : Array.isArray(input.documents)?input.documents
            : input.documents&&typeof input.documents==='object'?Object.entries(input.documents).map(([path,v])=>({path,data:v.data??v})):null;
        if(!documents)throw new Error('Export attendu : {moduleId,config} ou {documents:[{path,data}]}');
        const rows=[],seen=new Set();
        for(const item of documents){
            if(!/^[a-zA-Z0-9_-]{1,190}$/.test(item.path)||item.path.startsWith('147-favorites-')||seen.has(item.path))throw new Error('Identifiant invalide, personnel ou en double : '+item.path);
            seen.add(item.path);
            if(!item.data||typeof item.data!=='object'||Array.isArray(item.data))throw new Error('Configuration invalide');
            const ref=PMKConfigNativeStorage.db.collection('pimpmykoha_preplugin_modules').doc(item.path),before=await ref.get({fresh:true});
            rows.push({path:item.path,data:item.data,exists:before.exists,revision:before.revision,before:before.data()});
        }
        return {namespace:'configuration',rows,create:rows.filter(r=>!r.exists).length,existing:rows.filter(r=>r.exists).length};
    }
    async function importConfiguration(preview) {
        if(!(await getSession()).isAdmin)throw new Error('Administrateur Koha requis');
        function merge(old,next) {
            if(Array.isArray(old)&&Array.isArray(next)){
                if([...old,...next].every(x=>x&&typeof x==='object'&&x.id!=null)){
                    const byId=new Map(old.map(x=>[String(x.id),x]));
                    const out=next.map(x=>merge(byId.get(String(x.id)),x));
                    const ids=new Set(next.map(x=>String(x.id)));return out.concat(old.filter(x=>!ids.has(String(x.id))));
                }
                return [...next,...old.filter(x=>!next.some(y=>equal(x,y)))];
            }
            if(old&&next&&typeof old==='object'&&typeof next==='object'&&!Array.isArray(old)&&!Array.isArray(next)){
                const out={...old};for(const [key,value]of Object.entries(next))Object.defineProperty(out,key,{value:merge(old[key],value),enumerable:true,writable:true,configurable:true});return out;
            }
            return next;
        }
        for(const row of preview.rows){
            const ref=PMKConfigNativeStorage.db.collection('pimpmykoha_preplugin_modules').doc(row.path);
            // The API archives the full previous document in its history table.
            // Keep custom keys and rows even when absent from the imported version.
            const merged=merge(row.before||{},row.data);
            merged.pmkLastImport={at:new Date().toISOString(),previousRevision:row.revision,source:'json'};
            await ref.set(merged,{expectedRevision:row.revision});
        }
        return {created:preview.create,preserved:preview.existing,configuration:true};
    }
    function parseImport(input,namespace) {
        function restValue(v) {
            if('nullValue' in v)return null;
            for(const key of ['stringValue','booleanValue'])if(key in v)return v[key];
            if('integerValue' in v){const n=Number(v.integerValue);return Number.isSafeInteger(n)?n:v.integerValue;}
            if('doubleValue' in v)return Number(v.doubleValue);
            if('timestampValue' in v){const raw=v.timestampValue,ms=Date.parse(raw);if(!Number.isFinite(ms))throw new Error('Date invalide dans l’export');const fraction=raw.match(/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/);return new Timestamp(Math.floor(ms/1000),fraction?Number(fraction[1].padEnd(9,'0').slice(0,9)):0);}
            if('arrayValue' in v)return (v.arrayValue.values||[]).map(restValue);
            if('mapValue' in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,restValue(x)]));
            if('referenceValue' in v)return v.referenceValue;
            if('geoPointValue' in v)return v.geoPointValue;
            throw new Error('Type de donnée non reconnu dans l’export');
        }
        if(Array.isArray(input.documents))return {...input,documents:input.documents.map(d=>d.name&&d.fields?{
            path:d.name.split('/documents/')[1],data:Object.fromEntries(Object.entries(d.fields).map(([k,v])=>[k,restValue(v)]))
        }:d)};
        const documents=[];
        function walk(collections,prefix='') {
            for(const [name,rows] of Object.entries(collections))for(const [id,value] of Object.entries(rows)){
                const {__collections__,...data}=value,path=prefix+name+'/'+id;
                documents.push({path,data});if(__collections__)walk(__collections__,path+'/');
            }
        }
        if(input.__collections__){walk(input.__collections__);return {documents};}
        if(namespace==='internal-share'&&input.shares){
            for(const [id,data]of Object.entries(input.shares))documents.push({path:'shares/'+id,data});
            if(input.stats?.usage_count!=null)documents.push({path:'stats/usage_count',data:{count:Number(input.stats.usage_count)||0}});
            return {documents};
        }
        throw new Error('Formats acceptés : sauvegarde PMK, JSON documents, export JSON avec __collections__, export RTDB du partage.');
    }
    function download(name,value) {
        const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    async function openManager() {
        if(!(await getSession()).isAdmin)throw new Error('Administrateur Koha requis');
        document.getElementById('pmk-native-data-manager')?.remove();
        const overlay=document.createElement('div');overlay.id='pmk-native-data-manager';
        overlay.style.cssText='position:fixed;inset:0;background:#0006;z-index:2147483646;display:grid;place-items:center;padding:20px';
        const panel=document.createElement('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','pmk-native-data-title');
        panel.style.cssText='background:white;border:1px solid #d3ddc7;border-top:5px solid #6f8f32;border-radius:8px;max-width:760px;width:100%;padding:24px;max-height:90vh;overflow:auto;color:#28343d';
        panel.innerHTML='<h2 id="pmk-native-data-title">Données des modules</h2><p>Les données sont conservées dans la base Koha. Exportez une sauvegarde ou préparez la reprise d’un ancien export JSON. Pour les données métier, les documents déjà présents sont conservés. Pour les réglages, l’import applique votre configuration et archive la version précédente ; rechargez ensuite la page.</p><label for="pmk-native-namespace">Module</label> <select id="pmk-native-namespace" class="form-control"></select><p style="margin-top:16px"><button class="btn btn-default" id="pmk-native-export">Exporter les données</button></p><label for="pmk-native-file">Fichier JSON à reprendre</label><input id="pmk-native-file" type="file" accept=".json,application/json"><p style="margin-top:16px"><button class="btn btn-default" id="pmk-native-preview">Analyser le fichier</button> <button class="btn btn-primary" id="pmk-native-import" disabled>Importer les documents absents</button></p><p id="pmk-native-status" role="status" aria-live="polite"></p><p><small>Les dates, les identifiants et les champs inconnus sont conservés. Aucune connexion à l’ancien service n’est effectuée. Un export binaire Firestore doit d’abord être converti en JSON.</small></p><button class="btn btn-default" id="pmk-native-close">Fermer</button>';
        overlay.appendChild(panel);document.body.appendChild(overlay);
        const el=id=>panel.querySelector('#'+id),select=el('pmk-native-namespace'),status=el('pmk-native-status');
        const labels={attendance:'Compteur de fréquentation',appointments:'Rendez-vous et sondages',journal:'Journal des actions',lists:'Listes et modèles de bibliographies',taxonomy:'Arborescence et mémorisations de catalogage',planning:'Planning des services',frequency:'Statistiques de fréquentation', 'internal-share':'Partage interne',authorities:'Autorités'};
        ['configuration',...namespaces].forEach(ns=>{const option=document.createElement('option');option.value=ns;option.textContent=labels[ns]||'Configurations PMK';select.appendChild(option);});
        let preview=null;
        const reset=()=>{preview=null;el('pmk-native-import').disabled=true;el('pmk-native-import').textContent=select.value==='configuration'?'Appliquer les réglages importés et archiver les précédents':'Importer les documents absents';status.textContent='';};select.onchange=reset;el('pmk-native-file').onchange=reset;reset();
        async function busy(button,fn){button.disabled=true;try{await fn();}catch(e){status.textContent='Échec : '+e.message;}finally{button.disabled=false;}}
        el('pmk-native-export').onclick=e=>busy(e.target,async()=>{status.textContent='Export en cours…';let value;if(select.value==='configuration'){const r=await fetch('/api/v1/contrib/pmk/configuration',{credentials:'same-origin'});if(!r.ok)throw new Error('Export Koha refusé');value=await r.json();}else value=await exportNamespace(select.value);download('pmk-'+select.value+'-donnees.json',value);status.textContent=Object.keys(value.documents).length+' documents exportés.';});
        el('pmk-native-preview').onclick=e=>busy(e.target,async()=>{
            preview=null;el('pmk-native-import').disabled=true;
            const file=el('pmk-native-file').files[0];if(!file)throw new Error('Choisissez un fichier JSON.');
            status.textContent='Analyse en cours…';const input=window.PMKImportCommon?await PMKImportCommon.jsonFile(file,{maxBytes:32*1024*1024}):JSON.parse(await file.text());
            preview=select.value==='configuration'?await previewConfiguration(input):await previewImport(select.value,parseImport(input,select.value));
            status.textContent=preview.create+' documents à créer ; '+preview.existing+(select.value==='configuration'?' configurations à appliquer, versions précédentes archivées.':' documents existants conservés.');
            el('pmk-native-import').disabled=!(preview.create||(select.value==='configuration'&&preview.existing));
        });
        el('pmk-native-import').onclick=e=>busy(e.target,async()=>{if(!preview)return;status.textContent='Import en cours…';const r=preview.namespace==='configuration'?await importConfiguration(preview):await applyImport(preview);status.textContent=r.created+' documents importés ; '+r.preserved+(r.configuration?' configurations appliquées et archivées. Rechargez la page.':' conservés.');preview=null;});
        const close=()=>{overlay.remove();document.removeEventListener('keydown',escape);};const escape=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',escape);
        el('pmk-native-close').onclick=close;el('pmk-native-close').focus();
    }
    window.PMKNativeData=Object.freeze({namespaces,Timestamp,createDatabase,getSession,collection,doc,getDoc,getDocs,setDoc,updateDoc,deleteDoc,addDoc,query,where,orderBy,limit,serverTimestamp,writeBatch,runTransaction,onSnapshot,exportNamespace,parseImport,previewImport,applyImport,previewConfiguration,importConfiguration,openManager});
})();
