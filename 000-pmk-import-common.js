/* PMK — validation commune des fichiers, URL et fragments HTML importés. */
(function(window){
'use strict';
if(window.PMKImportCommon)return;
const DEFAULT_MAX_BYTES=25*1024*1024;
function plainObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function safeName(file){return String(file?.name||'fichier').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,180);}
async function textFile(file,options={}){
  if(!file||typeof file.arrayBuffer!=='function')throw new Error('Fichier absent ou illisible.');
  const maxBytes=Math.max(1,Number(options.maxBytes)||DEFAULT_MAX_BYTES);
  if(Number(file.size)>maxBytes)throw new Error(`${safeName(file)} dépasse la taille autorisée (${Math.ceil(maxBytes/1048576)} Mo).`);
  const buffer=await file.arrayBuffer();
  if(buffer.byteLength>maxBytes)throw new Error('Le fichier dépasse la taille autorisée.');
  const bytes=new Uint8Array(buffer);if(bytes.some((value,index)=>value===0&&index<8192))throw new Error('Le fichier semble binaire et ne peut pas être importé comme texte.');
  let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch(_){throw new Error('Le fichier n’est pas un texte UTF-8 valide.');}
  text=text.replace(/^\uFEFF/,'');if(!text.trim())throw new Error('Le fichier est vide.');return text;
}
function inspect(value,limits={}){
  const maxDepth=Math.max(1,Number(limits.maxDepth)||80),maxNodes=Math.max(1,Number(limits.maxNodes)||250000);let nodes=0;
  function visit(current,depth){if(++nodes>maxNodes)throw new Error('Le fichier contient trop d’éléments.');if(depth>maxDepth)throw new Error('Le fichier est imbriqué trop profondément.');if(!current||typeof current!=='object')return;for(const key of Object.keys(current)){if(['__proto__','prototype','constructor'].includes(key))throw new Error(`Propriété interdite dans le fichier : ${key}.`);visit(current[key],depth+1);}}
  visit(value,0);return value;
}
function jsonText(text,options={}){
  let value;try{value=JSON.parse(String(text));}catch(error){throw new Error(`JSON malformé : ${error.message}.`);}
  if(options.object!==false&&!plainObject(value))throw new Error('Le fichier JSON doit contenir un objet à sa racine.');
  return inspect(value,options);
}
async function jsonFile(file,options={}){return jsonText(await textFile(file,options),options);}
function sameOriginURL(value,options={}){
  let url;try{url=new URL(String(value||''),window.location.origin);}catch(_){throw new Error('Adresse URL malformée.');}
  if(!/^https?:$/.test(url.protocol)||url.origin!==window.location.origin)throw new Error('L’adresse doit appartenir à cette installation Koha.');
  const paths=options.paths||[];if(paths.length&&!paths.includes(url.pathname))throw new Error('Chemin Koha inattendu : '+url.pathname+'.');return url;
}
function htmlText(text,options={}){
  text=String(text||'');if(text.length>(Number(options.maxChars)||5_000_000))throw new Error('Le document HTML dépasse la taille autorisée.');if(!text.trim()||text.includes('\u0000'))throw new Error('Document HTML vide ou binaire.');
  const doc=new DOMParser().parseFromString(text,'text/html');if(!doc?.documentElement||!doc.body)throw new Error('Document HTML malformé.');
  if(options.allowActive!==true){const active=doc.querySelector('script,iframe,object,embed,base,meta[http-equiv]');const handler=Array.from(doc.querySelectorAll('*')).some(node=>Array.from(node.attributes||[]).some(attribute=>/^on/i.test(attribute.name)||/^(?:href|src|action|formaction)$/i.test(attribute.name)&&/^\s*javascript:/i.test(attribute.value)));if(active||handler)throw new Error('Le document HTML contient du contenu actif interdit.');}
  if(options.rejectLogin&&doc.querySelector('#loginform,input[name="password"],input[name="koha_login_context"]'))throw new Error('Le document importé est une page de connexion Koha.');return doc;
}
window.PMKImportCommon=Object.freeze({version:'1.0.0',textFile,jsonText,jsonFile,sameOriginURL,htmlText});
})(window);
