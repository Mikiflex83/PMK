const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/planning-transfer-common.json');

(async()=>{
  const commonSandbox={window:{}};commonSandbox.window.window=commonSandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'000-pmk-planning-common.js'),'utf8'),commonSandbox,{filename:'000-pmk-planning-common.js'});
  const engine=commonSandbox.window.PMKPlanningCommon;
  const config={services:[{id:'navette',title:'Navette intersites',active:true,maxUpcoming:10,slots:[{id:'thu',kind:'weekly',weekday:4,start:'09:00',stops:[{name:'Draguignan',time:'09:00'},{name:'Lorgues',time:'10:15'}]}],exceptions:[{date:'2026-10-29',cancelled:true}]}]};
  const query={from:'DRA',to:'LOR',at:new Date('2026-10-28T08:00:00Z'),aliases:{DRA:['Draguignan'],LOR:['Lorgues']}};
  const estimate=engine.estimate(config,query);
  assert(estimate);
  assert.equal(estimate.date,'2026-11-05','exception must skip the first weekly occurrence');
  assert.equal(estimate.serviceId,'navette');
  assert.equal(engine.estimate(config,{...query,from:'LOR',to:'DRA'}),null,'route order must be respected');

  let definition=null,pageSource='';
  const pageSandbox={window:{PMKPages:{register:value=>{definition=value;}}}};pageSandbox.window.window=pageSandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages/138-page-transfers.js'),'utf8'),pageSandbox,{filename:'138-page-transfers.js'});
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{pageSource=value;}});
  const widgetSource=fs.readFileSync(path.join(ROOT,'137-widgets/137-widget-planning-services.js'),'utf8');
  const commonSource=fs.readFileSync(path.join(ROOT,'000-pmk-planning-common.js'),'utf8');
  const checks={
    commonNativeDocument:commonSource.includes("createDatabase('planning')")&&commonSource.includes("'planning','config'"),
    weeklyAndDateOccurrences:commonSource.includes("slot.kind==='date'")&&commonSource.includes("date.getDay()!==slot.weekday"),
    exceptionsApplied:commonSource.includes('cancelled(service,iso,slot.period)')&&estimate.date==='2026-11-05',
    aliasesAndRouteOrder:commonSource.includes('aliasNames(query.from,query.aliases)')&&commonSource.includes('fromIndex>=toIndex'),
    widgetUsesCommonEngine:widgetSource.includes('PMKPlanningCommon.normalizeConfig')&&widgetSource.includes('PMKPlanningCommon.collectOccurrences'),
    transfersReadSamePlanning:pageSource.includes('window.PMKPlanningCommon.read()')&&pageSource.includes('window.PMKPlanningCommon.estimate'),
    realEventSeparated:pageSource.includes('Événement réel Koha : envoyé le')&&pageSource.includes('Estimation du planning'),
    universalMappingConfig:pageSource.includes('Alias des sites (JSON)')&&pageSource.includes('planningServiceId'),
    planningFailureDoesNotHideTransfers:pageSource.includes("state.planningError='Planning non chargé : '+error.message")
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,example:{estimatedDate:estimate.date,service:estimate.serviceTitle},scope:'Moteur commun : occurrences, exceptions, alias de sites et distinction entre estimation et événement Koha.'},null,2)+'\n');
  console.log('PASS shared planning engine and transfer estimates');
})().catch(error=>{
  fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');
  console.error(error);
  process.exit(1);
});
