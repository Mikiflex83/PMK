const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
let browser;

async function fixture(url,body,viewport={width:1280,height:800}){
 const page=await browser.newPage({locale:'fr-FR',viewport});
 page.errors=[];
 page.on('pageerror',error=>page.errors.push(error.message));
 await page.route('**/*',route=>route.request().isNavigationRequest()
  ? route.fulfill({contentType:'text/html; charset=utf-8',body:'<html lang="fr"><body>'+body+'</body></html>'})
  : route.fulfill({contentType:'application/json',body:'[]'}));
 await page.goto('http://pmk.test'+url);
 await page.evaluate(()=>{window.PMKConfig={getLanguage:()=> 'fr',getConfig:async()=>({recalculateActiveFacets:false}),subscribe:()=>()=>{},mountContextButton(){}};});
 await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'055-facets-drawer.js'),'utf8')});
 await page.waitForSelector('.pmk055-facet-toggle');
 return page;
}

async function check(name,fn){
 try{await fn();rows.push({name,passed:true});console.log('PASS '+name);}
 catch(error){rows.push({name,passed:false,error:error.stack});throw error;}
}

(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const facets='<div id="search-facets"><ul><li id="topics"><h5>Sujets particulièrement longs pour petit écran</h5><ul><li><span class="facet-label"><a href="?q=book&limit=su:Art">Art et création contemporaine avec un intitulé volontairement très long</a></span></li></ul></li></ul></div>';
  await check('Facet changes cancel with Escape and browser history rebuilds current URL state without stale drawers',async()=>{
   const page=await fixture('/cgi-bin/koha/catalogue/search.pl?q=book',facets);
   await page.waitForTimeout(1000);
   await page.locator('#topics > .pmk055-facet-toggle').click();
   const checkbox=page.locator('.pmk055-choice-ui input');
   await checkbox.check();
   assert.deepEqual(await page.evaluate(()=>PMK055SearchFacets.getPending()),{add:['su:Art'],remove:[]});
   await checkbox.focus();
   await page.keyboard.press('Escape');
   assert.deepEqual(await page.evaluate(()=>PMK055SearchFacets.getPending()),{add:[],remove:[]});
   assert.equal(await checkbox.isChecked(),false);
   assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('form-check-input')),true);

   await page.evaluate(()=>{history.pushState({},'',location.pathname+'?q=book&limit=su:Art');window.dispatchEvent(new PopStateEvent('popstate'));});
   await page.waitForFunction(()=>document.querySelector('.pmk055-choice-ui input')?.checked===true);
   assert.equal(await page.locator('#topics').getAttribute('class').then(value=>String(value).includes('pmk055-open')),true);
   await page.evaluate(()=>{history.pushState({},'',location.pathname+'?q=book');window.dispatchEvent(new PopStateEvent('popstate'));});
   await page.waitForFunction(()=>document.querySelector('.pmk055-choice-ui input')?.checked===false);
   assert.equal(await page.locator('#topics').getAttribute('class').then(value=>String(value).includes('pmk055-open')),false);
   assert.deepEqual(page.errors,[]);
   await page.close();
  });

  await check('Facet controls fit a phone viewport and pageshow reapplies the local availability state',async()=>{
   const results='<span class="logged-in-branch-code" data-logged-in-branch-code="PMK_A">PMK A</span><form id="bookbag_form"><table><tbody><tr id="row1"><td><ul class="available_items_loop_items"><li data-branchcode="PMK_A">PMK A</li></ul></td></tr><tr id="row2"><td>Ailleurs</td></tr></tbody></table></form>';
   const page=await browser.newPage({locale:'fr-FR',viewport:{width:360,height:760}});
   page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));
   await page.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html; charset=utf-8',body:'<html lang="fr"><body>'+facets+results+'</body></html>'}):route.fulfill({json:[]}));
   await page.goto('http://pmk.test/cgi-bin/koha/catalogue/search.pl?q=book');
   await page.evaluate(()=>{sessionStorage.setItem('pmk055:local-availability','1');window.PMKConfig={getLanguage:()=> 'fr',getConfig:async()=>({recalculateActiveFacets:false,quickFilters:{local:{enabled:true,resultDisplay:'dimmed',persistAcrossPages:true}}}),subscribe:()=>()=>{},mountContextButton(){}};});
   await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'055-facets-drawer.js'),'utf8')});
   await page.waitForFunction(()=>document.querySelector('#row2').classList.contains('pmk055-local-availability-dimmed'));
   const sizes=await page.evaluate(()=>({root:[document.querySelector('#search-facets').scrollWidth,document.querySelector('#search-facets').clientWidth],buttons:[...document.querySelectorAll('.pmk055-actions-buttons .btn,#pmk-search-quick-filters button')].map(node=>[node.getBoundingClientRect().left,node.getBoundingClientRect().right])}));
   assert(sizes.root[0]<=sizes.root[1]+1);assert(sizes.buttons.every(([left,right])=>left>=0&&right<=360));
   await page.evaluate(()=>{document.querySelector('#row2').classList.remove('pmk055-local-availability-dimmed','pmk055-local-availability-excluded');window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
   await page.waitForFunction(()=>document.querySelector('#row2').classList.contains('pmk055-local-availability-dimmed'));
   assert.equal(await page.locator('#row1').evaluate(node=>node.classList.contains('pmk055-local-availability-excluded')),false);
   assert.deepEqual(page.errors,[]);
   await page.close();
  });
 }finally{
  await browser?.close();
  fs.writeFileSync(path.join(ROOT,'tests/validation/facets-navigation.json'),JSON.stringify({kind:'Actual browser module with local Koha result markup; navigation, keyboard and mobile viewport',rows},null,2)+'\n');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
