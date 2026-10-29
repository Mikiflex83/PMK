const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/biblios-diagnostic-states.json');

(async()=>{
  let definition=null,source='';
  const sandbox={window:{PMKPages:{register:value=>{definition=value;}}}};sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages/138-page-biblios.js'),'utf8'),sandbox,{filename:'138-page-biblios.js'});
  assert(definition&&definition.id==='biblios');
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{source=value;}});
  const checks={
    exactIsbnCriterion:source.includes("if(isbn)return`isbn:${isbn}`")&&source.includes('ISBN valide identique'),
    fallbackCriterion:source.includes("`tay:${t}|${a}|${y}`")&&source.includes('Titre normalisé + auteur normalisé + année identiques'),
    candidateNotProof:source.includes('Un groupe reste une proposition à vérifier dans le MARC complet.'),
    missingDistinct:source.includes("kind:'missing',label:'Donnée manquante'")&&source.includes('/absent|incomplet|sans exemplaire|vide/i'),
    anomalyDistinct:source.includes("kind:'anomaly',label:'Anomalie à vérifier'"),
    technicalErrorDistinct:source.includes("kind:'error',label:'Erreur technique'")&&source.includes('state.auditErrors.set(b.id'),
    errorClearedAfterSuccess:source.includes('state.auditErrors.delete(b.id)'),
    auditSummaryCountsFailures:source.includes('${failed} erreur(s) technique(s)'),
    noExternalDependency:!source.includes('Firebase')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Contrat de la page : critères de rapprochement visibles et états métier/technique non confondus.'},null,2)+'\n');
  console.log('PASS bibliographic matching criteria and diagnostic states');
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
