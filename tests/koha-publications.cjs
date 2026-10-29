// Actual MARC API, browser XSLT engine and native Koha list; no mocked content.
const {launch,ROOT}=require('./lib/koha.cjs');const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const h=await launch({offlineVendors:true}),p=h.page,rows=[];
 async function check(name,fn){const e=h.pageErrors.length,http=h.httpErrors.length;try{const evidence=await fn();assert.deepEqual(h.pageErrors.slice(e),[]);const optional=h.httpErrors.slice(http).filter(x=>x.status===404&&new URL(x.url).pathname==='/api/v1/contrib/electre/image');assert.deepEqual(h.httpErrors.slice(http).filter(x=>!optional.includes(x)),[]);rows.push({name,passed:true,evidence,optionalCoverServiceAbsent:optional});console.log('PASS '+name);}catch(error){rows.push({name,passed:false,error:error.stack,pageErrors:h.pageErrors.slice(e),httpErrors:h.httpErrors.slice(http),text:(await p.locator('body').innerText()).slice(-6000)});console.log('FAIL '+name+' '+error.message.slice(0,300));}fs.writeFileSync(ROOT+'/tests/validation/koha-publications.json',JSON.stringify({kind:'Real Koha plugin: XSLT preview and bibliography workflows',rows},null,2)+'\n');}
 try{
 await check('XSLT import, actual MARC preview and project backup',async()=>{
  await h.configure('xslt-assistant',{defaultPreviewBiblio:String(h.fixtures.biblios.available)});
  await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=xslt-assistant');
  await p.getByRole('button',{name:'Nouveau projet',exact:true}).click();
  const dialog=p.getByRole('dialog',{name:'Importer mon XSLT',exact:true});await dialog.waitFor();
  const xml='<?xml version="1.0" encoding="UTF-8"?><xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:m="http://www.loc.gov/MARC21/slim"><xsl:output method="html"/><xsl:template match="/"><div id="pmk-recipe-xslt"><h1>PMKTEST aperçu réel €</h1><p><xsl:value-of select="//m:datafield[@tag=\'200\']/m:subfield[@code=\'a\']"/></p></div></xsl:template></xsl:stylesheet>';
  await dialog.locator('textarea').fill(xml);await dialog.getByRole('button',{name:'Ouvrir dans l’éditeur',exact:true}).click();
  await p.getByRole('button',{name:'2. Modifier et prévisualiser',exact:true}).click();
  await p.locator('.pmk136-live-controls input[inputmode="numeric"]').fill(String(h.fixtures.biblios.available));
  await p.locator('.pmk136-live-preview-section').getByRole('button',{name:'Actualiser',exact:true}).click();
  await p.locator('.pmk136-live-preview #pmk-recipe-xslt p').filter({hasText:'PMKTEST'}).waitFor({timeout:60000});
  const title=await p.locator('.pmk136-live-preview #pmk-recipe-xslt p').innerText();assert(title.includes('PMKTEST'));
  await p.getByRole('button',{name:'Mes projets',exact:true}).click();
  const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'Sauvegarder ce projet',exact:true}).click();const download=await downloadPromise;
  const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert(JSON.stringify(backup).includes('pmk-recipe-xslt'));assert(JSON.stringify(backup).includes('PMKTEST aperçu réel €'));
  await p.getByRole('dialog',{name:'Mes projets XSLT',exact:true}).getByRole('button',{name:'Fermer',exact:true}).last().click();
  await p.locator('.pmk135-topbar').getByRole('button',{name:'Fermer',exact:true}).click();
  return {biblio:h.fixtures.biblios.available,preview:title,backup:download.suggestedFilename()};
 });
 await check('Bibliography from the real native Koha list renders both records',async()=>{
  await h.goto('/cgi-bin/koha/virtualshelves/shelves.pl?op=view&shelfnumber='+h.fixtures.shelf);
  await p.locator('#pmk142-koha-list-button').click();await p.waitForURL('**/mainpage.pl?pmk_page=bibliography-builder&source=session',{timeout:90000});await h.ready();
  await p.waitForFunction(()=>window.PMKPages?.getStatus('bibliography-builder').state==='mounted',null,{timeout:90000});
  const payload=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('pmk142-session-source')));assert.equal(payload.kind,'koha-native');assert.equal(payload.entries.length,2);
  const preview=p.locator('#pmk142-root [data-zone="preview"]');await preview.filter({hasText:'PMKTEST'}).waitFor({timeout:60000});
  const text=await preview.innerText();assert(text.includes('Disponible'));assert(text.includes('Prêt et renouvellement'));
  await p.locator('#pmk142-root [data-control="doc-title"]').fill('PMKTEST Bibliographie €');await p.locator('#pmk142-root [data-control="doc-title"]').dispatchEvent('change');
  await preview.filter({hasText:'PMKTEST Bibliographie €'}).waitFor();
  await p.waitForFunction(()=>document.querySelector('#pmk142-root [data-zone=\"preview\"]')?.getAttribute('aria-busy')!=='true',null,{timeout:30000});return {shelf:h.fixtures.shelf,entries:payload.entries.length,preview:text.slice(0,800)};
 });
 }finally{await h.close();}if(rows.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
