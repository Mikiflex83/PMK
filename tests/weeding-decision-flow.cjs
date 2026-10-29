const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/weeding-decision-flow.json');

(async()=>{
  let definition=null,source='';
  const sandbox={window:{PMKPages:{register:value=>{definition=value;}}}};sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages/138-page-weeding.js'),'utf8'),sandbox,{filename:'138-page-weeding.js'});
  assert(definition&&definition.id==='weeding');
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{source=value;}});
  const checks={
    criteriaProposal:source.includes('Proposition des critères'),
    criteriaRules:source.includes('À l’intérieur d’une ligne : ET ; entre les lignes : OU.'),
    candidateNotDecision:source.includes('Le classement ci-dessus est une proposition.'),
    explicitAgentDecision:source.includes('Décision de l’agent'),
    selectionNotDecision:source.includes('La sélection ne vaut pas décision'),
    separateSelectionState:source.includes('selectedItems:new Set()'),
    explicitDecisionRecord:source.includes('function recordDecision(item,opts)'),
    reversibleDecision:source.includes('Annuler la décision / restaurer'),
    confirmedActions:source.includes("confirmModal('Marquer pour Pilon'")&&source.includes("confirmModal('Mettre à revoir'")
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Contrat de la page : critères expliqués, liste sélectionnée distincte et décision explicite et réversible.'},null,2)+'\n');
  console.log('PASS weeding criteria proposal, selection and explicit decision flow');
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
