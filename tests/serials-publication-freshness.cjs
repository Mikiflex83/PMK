const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/serials-publication-freshness.json');
(async()=>{
  let definition=null,source='';const sandbox={window:{PMKPages:{register:value=>{definition=value;}}}};sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages/138-page-serials.js'),'utf8'),sandbox,{filename:'138-page-serials.js'});
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{source=value;}});
  const checks={
    publicationThresholdConfig:source.includes('publicationGapDays:180')&&source.includes('Interruption possible sans réception (j)'),
    publicationRequiresActiveFutureSubscription:source.includes("!r.closed&&days(r.last_arrived)>=state.settings.publicationGapDays&&(!r.end||days(r.end)<0)"),
    publicationIsHypothesis:source.includes('Interruption de publication possible')&&source.includes('Interruption possible :'),
    reportReadTimestamp:source.includes('state.reportReadAt=new Date().toISOString()'),
    reportProvidedTimestamp:source.includes("Report_Generated_At','report_generated_at','Generated_At")&&source.includes('state.reportSourceAt=row.report_generated_at'),
    freshnessThresholdConfig:source.includes('reportFreshnessHours:24')&&source.includes('Fraîcheur maximale du rapport (heures)'),
    freshnessVisible:source.includes('<strong>Fraîcheur :</strong>')&&source.includes('Fraîcheur conforme au seuil.'),
    readFallbackExplained:source.includes("sourceDate?'Données produites par le rapport':'Rapport lu dans Koha'"),
    noExternalDependency:!source.includes('Firebase')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Contrat de la page : seuil d’interruption probable et fraîcheur fondée sur la date source ou, à défaut, la lecture Koha.'},null,2)+'\n');
  console.log('PASS serial publication interruption and report freshness');
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
