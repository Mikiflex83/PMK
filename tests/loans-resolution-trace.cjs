const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/loans-resolution-trace.json');

(async()=>{
  let definition=null,source='';
  const sandbox={window:{PMKPages:{register:value=>{definition=value;}}}};
  sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages/138-page-loans.js'),'utf8'),sandbox,{filename:'138-page-loans.js'});
  assert(definition&&definition.id==='loans');
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{source=value;}});
  const checks={
    threeExplicitStages:source.includes('Constat, proposition et action')&&source.includes('1 · Constat relu dans Koha')&&source.includes('2 · Proposition à confirmer')&&source.includes('3 · Action effectuée'),
    proposalIsSimulation:source.includes('La proposition ne réalise aucune écriture.')&&source.includes('Simuler la résolution'),
    justifiedByKohaValue:source.includes('Motif Koha justifiant la résolution')&&source.includes('RETURN_CLAIM_RESOLUTION'),
    explicitUnlockAndConfirmation:source.includes("state.writeUnlocked?'Écritures déverrouillées'")&&source.includes('Aucun retour de document ne sera effectué.'),
    rereadBeforeWrite:source.includes('const fresh=await loadDeep(x)')&&source.includes("String(fresh.claim_id)!==String(e.claim_id)"),
    verifyAfterWrite:source.includes('const verify=await loadDeep(x)')&&source.includes('if(!verify.claim_open)ok++;else fail++'),
    resultTrace:source.includes('state.lastAction={at:new Date().toISOString()')&&source.includes("fmt(state.lastAction.fail)+' échec(s)'"),
    noExternalDependency:!source.includes('Firebase')&&source.includes('Les analyses restent dans cette session Koha.')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Contrat de la page : constat, simulation motivée, écriture confirmée, relecture et bilan de session distincts.'},null,2)+'\n');
  console.log('PASS loans finding, proposal, confirmed action and verified result');
})().catch(error=>{
  fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');
  console.error(error);
  process.exit(1);
});
