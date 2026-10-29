const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/reservations-diagnostic-certainty.json');

(async()=>{
  let definition=null,source='';
  const sandbox={window:{PMKPages:{register:value=>{definition=value;}}}};
  sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages/138-page-reservations.js'),'utf8'),sandbox,{filename:'138-page-reservations.js'});
  assert(definition&&definition.id==='reservations');
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{source=value;}});
  const checks={
    analysisDateUsesCoverage:source.includes("const raw=coverage.finishedAt||coverage.startedAt")&&source.includes("coverage.complete?'Analyse complète':'Analyse partielle'"),
    analysisDateVisible:source.includes('${esc(analysisDateLabel())}')&&source.includes('Une hypothèse guide la vérification'),
    certaintyFromEvidence:source.includes("brief.intervention?.level==='required'")&&source.includes("label:'Constat vérifié'"),
    probableNamed:source.includes("label:'Hypothèse forte'")&&source.includes("label:'Hypothèse à vérifier'"),
    incompleteNamed:source.includes("label:'Hypothèse · données partielles'")&&source.includes('!deep||deep.error'),
    rowDisplaysCertainty:source.includes('${esc(certainty.label)}')&&source.includes('Constat ou hypothèse'),
    explanationAndActionSeparated:source.includes('<th>Constat ou hypothèse</th><th>Action proposée</th>'),
    noFirebaseReference:!source.includes('Firebase')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Contrat de la page : date et couverture de l’analyse, degré de certitude, cause et action distinctes.'},null,2)+'\n');
  console.log('PASS reservations analysis date, evidence and certainty labels');
})().catch(error=>{
  fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');
  console.error(error);
  process.exit(1);
});
