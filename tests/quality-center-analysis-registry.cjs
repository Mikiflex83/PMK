const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/quality-center-analysis-registry.json');

async function mountedSource(name){
  let definition=null,source='';
  const sandbox={window:{PMKPages:{register:value=>{definition=value;}}}};
  sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages',`138-page-${name}.js`),'utf8'),sandbox,{filename:`138-page-${name}.js`});
  assert(definition,`${name}: définition absente`);
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{source=value;}});
  return source;
}

(async()=>{
  const settings=fs.readFileSync(path.join(ROOT,'138-pages-settings.js'),'utf8');
  const center=await mountedSource('quality-center');
  const pages=['reservations','loans','transfers','items','biblios','serials','patrons'];
  const sources=Object.fromEntries(await Promise.all(pages.map(async id=>[id,await mountedSource(id)])));
  const checks={
    commonRegistry:settings.includes("const ANALYSIS_STATUS_KEY='pmk:page-analysis-status:v1'")&&settings.includes('function recordAnalysis(id,status={})'),
    metadataOnly:settings.includes("detail:String(status.detail||'').slice(0,240)")&&!settings.includes('analysisPayload'),
    boundedOutcomes:settings.includes("['running','success','partial','error'].includes(status.outcome)"),
    centerReadsRegistry:center.includes('tools.analysisStatus(page.id)'),
    centerShowsDates:center.includes('Dernière fin :')&&center.includes("dateStyle:'short',timeStyle:'short'"),
    centerShowsPrerequisites:center.includes('Prérequis :')&&center.includes('Rapport SQL des transferts')&&center.includes('API REST et droits sur les exemplaires'),
    noSecondEngine:center.includes('ne relance, ne recalcule et ne duplique aucune analyse'),
    authorityUnchanged:center.includes("page.id!=='authorities'")&&center.includes('La page Autorités est conservée inchangée.'),
    analysisPagesConnected:pages.every(id=>sources[id].includes(`recordAnalysis('${id}'`))
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Registre commun limité aux métadonnées, synthèse des dates et prérequis, sans second moteur métier.'},null,2)+'\n');
  console.log('PASS quality center common analysis registry');
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
