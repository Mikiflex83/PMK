const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/france-publications-qualification.json');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({locale:'fr-FR'});
  await page.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="fr"><head></head><body><main><h1>Accueil</h1></main></body></html>'}));
  await page.goto('http://pmk.test/cgi-bin/koha/mainpage.pl');
  await page.evaluate(()=>{
    window.__definition=null;
    window.PMKConfig={registerModule:d=>(__definition=d),getConfig:async()=>({enabled:false}),subscribe:()=>()=>{},getLanguage:()=> 'fr'};
  });
  await page.addScriptTag({path:path.join(ROOT,'PMK-abonnements-France-Publications-v0.1.0.js')});
  await page.waitForFunction(()=>window.PMKFrancePublicationsDiagnostics&&window.__definition);
  const result=await page.evaluate(()=>PMKFrancePublicationsDiagnostics.qualify({
    complete:true,
    subscriptions:[
      {ref:'DRG-1-100',title:'Revue certaine',issn:'1234-5678',destinationCode:'10',startDate:'2026-01-01',endDate:'2026-12-31'},
      {ref:'DRG-1-101',title:'Revue partielle',issn:'1111-2222',destinationCode:'10',startDate:null,endDate:'2026-12-31'},
      {ref:'DRG-1-102',title:'Référence en double',issn:'3333-4444',destinationCode:'10',startDate:'2026-01-01',endDate:'2026-12-31'},
      {ref:'AUTRE-9',title:'Sans correspondance',issn:'9999-0000',destinationCode:'99',startDate:'2026-01-01',endDate:'2026-12-31'}
    ],
    koha:[
      {subscription_id:'1',title:'Revue certaine',issn:'1234-5678',library_id:'SITE',start_date:'2026-01-01',end_date:'2026-12-31',internal_notes:'[PMK-FP:DRG-1-100]',closed:0},
      {subscription_id:'2',title:'Revue partielle',issn:'1111-2222',library_id:'SITE',start_date:'2026-01-01',end_date:'2026-12-31',internal_notes:'[PMK-FP:DRG-1-101]',closed:0},
      {subscription_id:'3',title:'Référence en double',issn:'3333-4444',library_id:'SITE',start_date:'2026-01-01',end_date:'2026-12-31',internal_notes:'[PMK-FP:DRG-1-102]',closed:0},
      {subscription_id:'4',title:'Référence en double',issn:'3333-4444',library_id:'AUTRE',start_date:'2026-01-01',end_date:'2026-12-31',internal_notes:'[PMK-FP:DRG-1-102]',closed:0}
    ],
    libraries:[{library_id:'SITE',name:'Site principal',city:'Draguignan'}]
  }));
  assert.equal(result.complete,true);
  assert.equal(result.total,4);
  assert.equal(result.counts.same,1);
  assert.equal(result.counts.partial,1);
  assert.equal(result.counts.unmatched,2);
  assert.match(result.associations.find(item=>item.ref==='DRG-1-102').label,/plusieurs abonnements Koha/i);
  assert.equal(result.associations.find(item=>item.ref==='DRG-1-102').related.length,2);
  const incomplete=await page.evaluate(()=>PMKFrancePublicationsDiagnostics.qualify({complete:true,errors:[{message:'Lecture interrompue'}],subscriptions:[],koha:[]}));
  assert.equal(incomplete.complete,false);
  assert.deepEqual(incomplete.errors,['Lecture interrompue']);
  const kohaDescription=await page.evaluate(()=>__definition.schema.find(section=>section.id==='koha').description.fr);
  assert.match(kohaDescription,/association multiple ou incomplète/i);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,...result,incomplete,kohaDescription},null,2)+'\n');
  console.log('PASS France Publications qualification, ambiguity and partial-read report');
  await browser.close();
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
