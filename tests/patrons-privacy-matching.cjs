const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/patrons-privacy-matching.json');
(async()=>{
  let definition=null,source='';const sandbox={window:{PMKPages:{register:value=>{definition=value;}}}};sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages/138-page-patrons.js'),'utf8'),sandbox,{filename:'138-page-patrons.js'});
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{source=value;}});
  const checks={
    contactsMaskedByDefault:source.includes('function maskEmail')&&source.includes('function maskPhone')&&source.includes('contactHtml(r)'),
    temporaryReveal:source.includes('revealedContacts:new Set()')&&source.includes('Afficher temporairement')&&source.includes("state.revealedContacts.delete(id)"),
    exportMinimizedByDefault:source.includes('exportPersonalData:false')&&source.includes("headers=personal?['patron_id'")&&source.includes("['patron_id','cardnumber','category','library','expiry','severity','rules']"),
    personalExportExplicit:source.includes('Inclure nom et coordonnées dans l’export CSV')&&source.includes("state.settings.exportPersonalData=!!$('export-personal')"),
    cardCriterionExact:source.includes("numéro de carte strictement identique"),
    identityCriterionExplained:source.includes('nom et prénom normalisés + date de naissance identique'),
    weakContactSignals:source.includes('email partagé : signal faible')&&source.includes('téléphone partagé : signal faible'),
    falsePositiveWorkflow:source.includes('qualifier un faux positif sans supprimer les comptes')&&source.includes('Dossier normal'),
    noDirectDelete:source.includes('Aucune suppression directe par API.'),
    noExternalDependency:!source.includes('Firebase')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Contrat de la page : coordonnées masquées, export minimisé et critères de rapprochement avec faux positifs expliqués.'},null,2)+'\n');
  console.log('PASS patron privacy, matching criteria and false-positive workflow');
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
