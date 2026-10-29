const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/menu-common-engine.json');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({locale:'fr-FR'});
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><body><span class="loggedinusername is_superlibrarian">Admin</span></body></html>'}));
  await page.goto('http://pmk.test/cgi-bin/koha/mainpage.pl');
  await page.evaluate(()=>{
    const docs=new Map(),listeners=new Map();
    const db={collection:()=>({doc:id=>({get:async()=>({exists:docs.has(id),data:()=>docs.get(id)}),set:async value=>{docs.set(id,value);(listeners.get(id)||[]).forEach(fn=>fn({exists:true,data:()=>value}))},onSnapshot:fn=>{listeners.set(id,[...(listeners.get(id)||[]),fn]);return()=>{}}})})};
    window.PMKConfigNativeStorage={kind:'koha',db,serverTimestamp:()=>0};
  });
  await page.addScriptTag({path:path.join(ROOT,'000-pmk-config-firestore.js')});
  await page.waitForFunction(()=>window.PMKMenuEngine);
  await page.waitForFunction(()=>window.PMKConfig?.services?.get?.('pmk.menus'));
  await page.evaluate(()=>{
    const host=PMKMenuEngine.renderPanel({title:'Moteur commun',favorites:new Set(['/favori-disparu']),actionAvailable:()=>false,items:[
      {id:'submenu',kind:'submenu',labelFr:'Sous-menu',enabled:true,parentId:''},
      {id:'child',kind:'link',labelFr:'Lien enfant',url:'/cgi-bin/koha/tools/test.pl',enabled:true,parentId:'submenu'},
      {id:'action',kind:'action',labelFr:'Action locale',actionId:'missing',enabled:true,parentId:''}
    ]});
    document.body.appendChild(host);
  });
  const action=page.getByRole('menuitem',{name:/Action locale.*indisponible/});
  const missing=page.getByRole('menuitem',{name:/favori-disparu.*indisponible/});
  assert.equal(await action.getAttribute('aria-disabled'),'true');
  assert.equal(await missing.getAttribute('aria-disabled'),'true');
  const submenu=page.getByRole('button',{name:'Sous-menu'});
  await submenu.dispatchEvent('pointerdown',{pointerType:'touch'});
  await submenu.click();
  assert.equal(await submenu.getAttribute('aria-expanded'),'true');
  await submenu.focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),'Lien enfant');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),'Sous-menu');
  const result={passed:true,engineVersion:await page.evaluate(()=>PMKMenuEngine.version),disabledAction:await action.innerText(),missingFavorite:await missing.innerText(),sharedService:await page.evaluate(()=>PMKConfig.services.get('pmk.menus')?.renderPanel===PMKMenuEngine.renderPanel)};
  assert.equal(result.sharedService,true);
  fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
  console.log('PASS shared 134/147 menu engine: keyboard, touch and unavailable destinations');
  await browser.close();
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
