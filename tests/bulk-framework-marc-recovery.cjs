const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/bulk-framework-marc-recovery.json');

(async()=>{
  const source=fs.readFileSync(path.join(ROOT,'141-modif-grille-par-lot.js'),'utf8');
  const start=source.indexOf('    function marcStructure(xml)');
  const end=source.indexOf('    async function getMarcXML',start);
  assert(start>=0&&end>start,'fonctions de contrôle MARC absentes');
  const functions=source.slice(start,end);
  const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  const results=await page.evaluate(code=>{
    const api=new Function(`${code};return {marcStructure,compareMarc};`)();
    const a=`<record xmlns="http://www.loc.gov/MARC21/slim"><leader>00000nam a2200000 i 4500</leader><controlfield tag="001">42</controlfield><datafield tag="200" ind1="1" ind2=" "><subfield code="a">Titre</subfield><subfield code="e">Sous-titre</subfield></datafield></record>`;
    const formatted=`<record xmlns="http://www.loc.gov/MARC21/slim">
      <leader>00000nam a2200000 i 4500</leader>
      <controlfield tag="001">42</controlfield>
      <datafield tag="200" ind1="1" ind2=" "><subfield code="a">Titre</subfield><subfield code="e">Sous-titre</subfield></datafield>
    </record>`;
    const changed=a.replace('Sous-titre','Valeur modifiée');
    const reordered=a.replace('<subfield code="a">Titre</subfield><subfield code="e">Sous-titre</subfield>','<subfield code="e">Sous-titre</subfield><subfield code="a">Titre</subfield>');
    return {same:api.compareMarc(a,formatted),changed:api.compareMarc(a,changed),reordered:api.compareMarc(a,reordered),summary:api.marcStructure(a)};
  },functions);
  await browser.close();
  const checks={
    formattingIgnored:results.same.preserved===true,
    valuesProtected:results.changed.preserved===false&&results.changed.details.includes('position'),
    fieldOrderProtected:results.reordered.preserved===false,
    detailedSummary:results.summary.fieldCount===2&&results.summary.subfieldCount===2,
    freshReadBeforeWrite:source.includes('const xml = await getMarcXML(row.biblioId)')&&source.includes('body: xml'),
    readAfterWrite:source.includes('const afterXML = await getMarcXML(row.biblioId)')&&source.includes('compareMarc(beforeXML, afterXML)'),
    retryTechnicalFailures:source.includes('async function retryFailures()')&&source.includes('Reprendre les échecs techniques'),
    marcMismatchBlocked:source.includes('row.retryable = false')&&source.includes('Vérification manuelle requise avant toute reprise'),
    csvAudit:source.includes('"controle_marc", "detail_marc"')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Comparaison sémantique MARCXML avant/après, détail visible et reprise limitée aux échecs techniques.'},null,2)+'\n');
  console.log('PASS bulk framework MARC preservation and failure recovery');
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
