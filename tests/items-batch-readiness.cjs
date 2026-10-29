const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/items-batch-readiness.json');

(async()=>{
  let definition=null,source='';
  const sandbox={window:{PMKPages:{register:value=>{definition=value;}}}};sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages/138-page-items.js'),'utf8'),sandbox,{filename:'138-page-items.js'});
  assert(definition&&definition.id==='items');
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{source=value;}});
  const checks={
    progressRegion:source.includes('id="dqi-load-progress"')&&source.includes('role="status"'),
    progressPerPage:source.includes('updateLoadProgress(rows.length,page,false)')&&source.includes('exemplaire(s) reçus · page'),
    progressCompletion:source.includes('updateLoadProgress(rows.length,page,true)')&&source.includes("bar.style.width=done?'100%'"),
    prefilterExplained:source.includes('function activePrefilter()')&&source.includes('Préfiltrage lors de la sélection'),
    allUsefulFiltersIncluded:['state.search','state.severity','state.home','state.holding','state.type','state.statusFilter'].every(value=>source.includes(value)),
    recapBeforeCommands:source.indexOf('${batchSummary(rows)}')<source.indexOf('<button id="deep"'),
    recapCounts:source.includes('code(s)-barres utilisable(s)')&&source.includes('dossier(s) approfondi(s)')&&source.includes('statut(s) perdu ou retiré'),
    destructiveActionStillSimulated:source.includes('Simuler suppression')&&source.includes('Koha sera relu avant chaque DELETE'),
    noExternalDependency:!source.includes('Firebase')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Contrat de la page : progression du chargement, préfiltrage explicite et récapitulatif avant commandes.'},null,2)+'\n');
  console.log('PASS items loading progress, prefilter and pre-action summary');
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
