const {launch,ROOT}=require('./lib/koha.cjs');
const fs=require('node:fs');
(async()=>{
 const h=await launch({offlineVendors:true});
 const f=h.fixtures,rows=[];
 const routes=[
  ['home','mainpage.pl'],['circulation','circ/circulation-home.pl'],['patrons','members/members-home.pl'],
  ['reports','reports/reports-home.pl'],['tools','tools/tools-home.pl'],['administration','admin/admin-home.pl'],
  ['detail','catalogue/detail.pl?biblionumber='+f.biblios.available],
  ['items-detail','catalogue/moredetail.pl?biblionumber='+f.biblios.available+'&itemnumber='+f.items.available.id],
  ['search','catalogue/search.pl?q=PMKTEST'],['patron-detail','members/moremember.pl?borrowernumber='+f.patrons.adult.id],
  ['checkout','circ/circulation.pl?borrowernumber='+f.patrons.adult.id],['returns','circ/returns.pl'],['renew','circ/renew.pl'],['branchtransfers','circ/branchtransfers.pl'],
  ['waiting-holds','circ/waitingreserves.pl'],['holds','reserve/request.pl?biblionumber='+f.biblios.available],
  ['patron-entry','members/memberentry.pl?op=add_form&categorycode=PMK_ADULT'],
  ['cataloguing','cataloguing/addbiblio.pl?biblionumber='+f.biblios.available],
  ['item-entry','cataloguing/additem.pl?biblionumber='+f.biblios.available],['batchmod','tools/batchMod.pl'],
  ['sql-editor','reports/guided_reports.pl?op=add_form_sql'],['saved-reports','reports/guided_reports.pl?op=list'],
  ['reading-record','members/readingrec.pl?borrowernumber='+f.patrons.adult.id],
  ['loan-history','catalogue/issuehistory.pl?biblionumber='+f.biblios.overdue],
  ['journal','tools/viewlog.pl?do_it=1&modules=CATALOGUING&object='+f.biblios.available],
  ['suggestions','suggestion/suggestion.pl?op=add_form'],
  ['subscription','serials/subscription-detail.pl?subscriptionid='+f.subscription],['serial-claims','serials/claims.pl?supplierid='+f.vendor],
  ['shelf','virtualshelves/shelves.pl?op=view&shelfnumber='+f.shelf],['authorities-home','authorities/authorities-home.pl'],
 ];
 try{
  // Local Koha has no Dracénie France Publications reports or supplier session.
  await h.configure('france-publications-subscriptions',{enabled:false});
  for(const [id,route]of routes){
   if(process.env.PMK_TEST_FILTER&&!id.includes(process.env.PMK_TEST_FILTER))continue;
   const e0=h.pageErrors.length,http0=h.httpErrors.length,started=Date.now();
   try{
    await h.goto('/cgi-bin/koha/'+route);
    const state=await h.page.evaluate(()=>({title:document.title,loaded:PMKPlugin.loaded.length,
     modules:PMKConfig.listModules().map(x=>({id:x.id,status:PMKConfig.getStatus(x.id)})),
     tables:[...document.querySelectorAll('table[id]')].map(x=>x.id),
     controls:[...document.querySelectorAll('[id*="pmk"],[class*="pmk"]')].slice(0,250).map(x=>({id:x.id,class:x.className,tag:x.tagName})),
    }));
    rows.push({id,route,state,ms:Date.now()-started,pageErrors:h.pageErrors.slice(e0),httpErrors:h.httpErrors.slice(http0)});
    console.log(id+': loaded '+state.loaded+', '+state.modules.length+' modules, errors '+(h.pageErrors.length-e0)+', HTTP '+(h.httpErrors.length-http0));
   }catch(e){rows.push({id,route,error:e.message,pageErrors:h.pageErrors.slice(e0),httpErrors:h.httpErrors.slice(http0)});console.log('FAIL '+id+' '+e.message.slice(0,200));}
   fs.writeFileSync(ROOT+'/tests/validation/koha-routes.json',JSON.stringify({kind:'Real dedicated Koha pages; native SQL storage; external services blocked',rows,blocked:h.blocked},null,2)+'\n');
  }
 }finally{await h.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
