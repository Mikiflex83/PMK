const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const rows=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({locale:'fr-FR'});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 const html='<html lang="fr"><body><select id="btitle"><option selected>Mme</option></select><input type="radio" name="sex" value="F"><input type="radio" name="sex" value="M"><input id="phone" value="0612345678"><input id="SMSnumber" value="+33999999999"><input id="cardnumber" value="12345678"><input id="password" value="manuel"><input id="password2" value="manuel"><select id="patron_attr_6"><option></option><option selected>Valeur manuelle</option></select><input id="firstname" value="Élodie"><input id="surname" value="D’Arc"><input id="userid" value="identifiant.manuel"><input id="othernames"></body></html>';
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:html}));
 try{
  await page.goto('http://pmk.test/cgi-bin/koha/members/memberentry.pl?op=add_form');
  await page.evaluate(()=>{window.PMKConfig={definition:null,registerModule(def){this.definition=def;},getConfig:async()=>({enabled:false}),subscribe(){},getLanguage:()=> 'fr'};});
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'057-member-pages-utils.js'),'utf8')});
  await page.waitForFunction(()=>window.PMKConfig.definition);
  const result=await page.evaluate(()=>{
   const before=Array.from(document.querySelectorAll('input,select')).map(n=>({id:n.id,value:n.value,checked:n.checked,selectedIndex:n.selectedIndex}));
   const definition=PMKConfig.definition,field=definition.schema.find(s=>s.id==='preview').fields[0];
   const cfg={...definition.defaults,phoneSmsOverwrite:'if-empty',passwordOverwrite:'if-empty',useridOverwrite:'if-empty',attributeDefaults:[{id:'a',enabled:true,name:'Attribut test',selector:'#patron_attr_6',valueMode:'selected-index',selectedIndex:0,overwrite:'if-empty'}]};
   const preview=field.render({rootObject:cfg});document.body.appendChild(preview);
   const after=Array.from(document.querySelectorAll('input,select')).map(n=>({id:n.id,value:n.value,checked:n.checked,selectedIndex:n.selectedIndex}));
   return {before,after,text:preview.textContent,rows:preview.querySelectorAll('tbody tr').length};
  });
  assert.deepEqual(result.after,result.before,'preview does not write to Koha fields');
  assert(result.rows>=6);
  assert.match(result.text,/Valeur manuelle conservée/);
  assert.match(result.text,/Identifiant manuel conservé/);
  assert.match(result.text,/valeur masquée/);
  assert.deepEqual(page.errors,[]);
  rows.push({name:'Patron automation preview identifies targets and manual-value priority without modifying any Koha field or exposing the generated password',passed:true});console.log('PASS '+rows[0].name);
 }catch(error){rows.push({passed:false,error:error.stack});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(ROOT,'tests/validation/patron-automation-preview.json'),JSON.stringify({kind:'Browser configuration preview on a Koha-like patron form; field state compared before and after',rows},null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
