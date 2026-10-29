/* PMK 0.4.0 — adaptateur transitoire non-plugin pour les configurations existantes. */
(function(){
 'use strict';
 if(window.PMKConfigNativeStorage)return;
 const SDK='10.7.1',APP='pmk-preplugin',COLLECTION='pimpmykoha_preplugin_modules';
 // La configuration de production reste privée et doit être injectée avant le
 // chargeur. Aucune clé ni aucun identifiant de projet n'est publié avec PMK.
 const config=Object.assign({},window.PMK_FIREBASE_CONFIG||{});
 let ready;
 function script(src,id){return new Promise((ok,fail)=>{const old=document.getElementById(id);if(old){if(old.dataset.loaded==='1'||old.dataset.pmkLoaded==='1')return ok();old.addEventListener('load',ok,{once:true});old.addEventListener('error',fail,{once:true});return;}const node=document.createElement('script');node.id=id;node.src=src;node.async=false;node.onload=()=>{node.dataset.loaded='1';ok();};node.onerror=fail;document.head.append(node);});}
 async function ensureCompat(needsDatabase){
  if(!window.firebase?.initializeApp)await script('https://www.gstatic.com/firebasejs/'+SDK+'/firebase-app-compat.js','pmk-legacy-firebase-app');
  if(!window.firebase?.firestore)await script('https://www.gstatic.com/firebasejs/'+SDK+'/firebase-firestore-compat.js','pmk-legacy-firebase-firestore');
  if(needsDatabase&&!window.firebase?.database)await script('https://www.gstatic.com/firebasejs/'+SDK+'/firebase-database-compat.js','pmk-legacy-firebase-database');
  if(!window.firebase?.initializeApp||!window.firebase?.firestore)throw new Error('Firebase compat indisponible');
  return window.firebase;
 }
 async function ensureApp(appConfig=config,name=APP,needsDatabase=false){
  const fb=await ensureCompat(needsDatabase);let app=(fb.apps||[]).find(item=>item.name===name);
  if(!app&&appConfig?.projectId)app=(fb.apps||[]).find(item=>item.options?.projectId===appConfig.projectId);
  if(!app){if(!appConfig?.apiKey||!appConfig?.projectId)throw new Error('Configuration Firebase historique absente. Définissez window.PMK_FIREBASE_CONFIG avant le chargeur.');app=fb.initializeApp(appConfig,name);}
  return app;
 }
 function marker(){return {__pmkLegacyServerTimestamp:true};}
 function convert(value,fb){
  if(value&&value.__pmkLegacyServerTimestamp===true)return fb.firestore.FieldValue.serverTimestamp();
  if(Array.isArray(value))return value.map(item=>convert(item,fb));
  if(value&&Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,convert(item,fb)]));
  return value;
 }
 function ref(key){return {key,async get(){const db=(await ensureApp()).firestore(),snap=await db.collection(COLLECTION).doc(key).get();return {exists:snap.exists,revision:null,data:()=>snap.exists?snap.data():null};},async set(value,options={}){const fb=await ensureCompat(),db=(await ensureApp()).firestore();await db.collection(COLLECTION).doc(key).set(convert(value,fb),{merge:options.merge===true});}};}
 const db={collection(name){if(name!==COLLECTION)throw new Error('Collection de configuration non prise en charge : '+name);return {doc:ref};},async runTransaction(callback){const app=await ensureApp(),fb=await ensureCompat(),store=app.firestore();return store.runTransaction(async native=>callback({async get(reference){const snap=await native.get(store.collection(COLLECTION).doc(reference.key));return {exists:snap.exists,revision:null,data:()=>snap.exists?snap.data():null};},set(reference,value,options){native.set(store.collection(COLLECTION).doc(reference.key),convert(value,fb),{merge:options?.merge===true});}}));}};
 window.PMKLegacyFirebase=Object.freeze({SDK,config,ensureCompat,ensureApp,convert,serverTimestamp:marker});
 window.PMKConfigNativeStorage=Object.freeze({kind:'firebase-legacy',db,preload:async()=>{if(!ready)ready=ensureApp();await ready;},serverTimestamp:marker});
})();
