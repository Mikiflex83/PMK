const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/circulation-widget-scope-refresh.json');
try{
  const source=fs.readFileSync(path.join(ROOT,'137-widgets/137-widget-circulation-abonnements.js'),'utf8');
  const checks={
    sqlPeriodParameter:(source.match(/<<Période en jours>>/g)||[]).length===3,
    periodSentToKoha:source.includes("endpoint.searchParams.set('sql_params',String(reportPeriodDays))"),
    periodVisible:source.includes('id="pmk137-report-period"')&&source.includes('Période proposée par défaut'),
    manualRefresh:source.includes('id="pmk137-report-refresh"')&&source.includes('async function refreshReports()'),
    optionalAutomaticRefresh:source.includes('reportRefreshMinutes')&&source.includes('window.setInterval(refreshReports,refreshMinutes*60000)'),
    refreshCleanup:source.includes('window.clearInterval(reportRefreshTimer)'),
    scopeVisible:source.includes('function reportScopeText()')&&source.includes('Sites : ${sites.join'),
    lastReadVisible:source.includes('Dernière lecture :'),
    zeroIsData:source.includes('<strong>0 activité</strong>')&&source.includes('<strong>0 inscription ou renouvellement</strong>'),
    unavailableDistinct:source.includes('rapport(s) indisponible(s)')&&source.includes("showErrorCirculation(results[0].reason)"),
    siteScopePreserved:source.includes('const previousSites = Array.from(selectSite.selectedOptions')&&source.includes('previousSites.includes(site)'),
    unknownConfigPreserved:source.includes('const latest = await pmk.getConfig')&&source.includes('...latest'),
    nativeWording:!source.includes('Firebase')&&!source.includes('Firestore')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Période transmise aux rapports Koha, actualisation manuelle/optionnelle, périmètre visible et états zéro/indisponible distincts.'},null,2)+'\n');
  console.log('PASS circulation widget period, scope and refresh states');
}catch(error){fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)}
