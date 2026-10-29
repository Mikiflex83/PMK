const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/cataloguing-tree-diagnostics.json');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({locale:'fr-FR'});
  await page.route('https://koha.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head></head><body><form id="cat_addbiblio"><li class="tag clearfix" id="tag_099_0"><select name="tag_099_subfield_a_0"><option value="A">A</option></select><select name="tag_099_subfield_b_0"><option value="B1">B1</option><option value="B2">B2</option></select></li></form></body></html>'}));
  await page.goto('https://koha.test/cgi-bin/koha/cataloguing/addbiblio.pl');
  await page.evaluate(()=>{
    const cfg={enabled:true,runtimeMode:'generic',page:{enabled:true,path:'/cgi-bin/koha/cataloguing/addbiblio.pl'},features:{assistant:true,nativeFiltering:true,preserveInvalidExistingValues:true,rememberSelection:false,rememberPanelState:false,showBreadcrumb:true},lists:{enabled:false},hierarchy:{relationshipMode:'configured'},levels:[
      {id:'parent',enabled:true,labelFr:'Parent',tag:'099',subfield:'a',sourceType:'manual',manualValues:'A|Parent A'},
      {id:'child',enabled:true,labelFr:'Enfant',tag:'099',subfield:'b',sourceType:'manual',manualValues:'B1|Enfant 1\nB2|Enfant 2'}
    ],extraFields:[],relationships:[
      {enabled:true,fromId:'parent',fromValue:'A',toId:'child',toValue:'B1'},
      {enabled:true,fromId:'missing',fromValue:'X',toId:'child',toValue:'B9'}
    ],appearance:{widthPx:360,mobileBreakpointPx:576},language:'fr'};
    window.PMKConfig={getConfig:async()=>structuredClone(cfg)};
  });
  await page.addScriptTag({path:path.join(ROOT,'109-helper-domaine.js')});
  await page.waitForFunction(()=>window.PMKCataloguingTreeAssistant?.diagnostics);
  const result=await page.evaluate(()=>({
    diagnostics:window.PMKCataloguingTreeAssistant.diagnostics,
    banner:document.querySelector('[data-generic-diagnostics]')?.innerText||'',
    status:document.querySelector('[data-generic-status]')?.innerText||''
  }));
  assert(result.diagnostics.counts['invalid-relation']>=1);
  assert(result.diagnostics.counts['orphan-value']>=1);
  assert.match(result.banner,/Configuration à contrôler/);
  assert(result.diagnostics.issues.some(issue=>/Enfant 2/.test(issue.message)));
  fs.writeFileSync(OUT,JSON.stringify({passed:true,...result},null,2)+'\n');
  console.log('PASS cataloguing hierarchy relation and orphan diagnostics');
  await browser.close();
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
