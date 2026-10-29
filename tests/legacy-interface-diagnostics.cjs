const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/legacy-interface-diagnostics.json');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PMK_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({...devices['iPhone 13'],locale:'fr-FR'});
  await context.addInitScript(()=>{
    Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});
    const track={label:'Caméra arrière simulée',getSettings:()=>({width:1920,height:1080}),stop:()=>{window.__trackStopped=true;}};
    Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getVideoTracks:()=>[track],getTracks:()=>[track]})},configurable:true});
    HTMLMediaElement.prototype.play=async()=>{};
    Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{get(){return this.__mockStream||null;},set(value){this.__mockStream=value;},configurable:true});
  });
  const page=await context.newPage();
  await page.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="fr"><head></head><body><form id="f"><input id="barcode" name="barcode"><button id="submit" type="submit">Valider</button></form><button id="newconcern">Problème</button><span id="placehold"></span></body></html>'}));
  await page.goto('http://pmk.test/cgi-bin/koha/circ/circulation.pl');
  await page.evaluate(()=>{
    window.__definition=null;window.__submitted=false;document.querySelector('#f').addEventListener('submit',event=>{event.preventDefault();__submitted=true;});
    window.PMKConfig={registerModule:d=>(__definition=d),getConfig:async()=>structuredClone(__definition.defaults),elementPicker:{pickForConfig:async()=>null}};
  });
  await page.addScriptTag({path:path.join(ROOT,'000-pmk-settings-legacy.js')});
  const diagnostics=await page.evaluate(()=>{
    const schedule=PMKLegacyOptions.diagnostics.scheduleRows('');
    const targets=PMKLegacyOptions.diagnostics.targetDiagnostics(__definition.defaults);
    const capabilities=PMKLegacyOptions.diagnostics.cameraCapabilities();
    const shuttle=__definition.schema.find(section=>section.id==='shuttle');
    const scanner=__definition.schema.find(section=>section.id==='scanner');
    return {schedule,targets,capabilities,schedulePreview:shuttle.fields.find(field=>field.type==='custom').render({rootObject:__definition.defaults}).innerText,targetPreview:scanner.fields.find(field=>field.type==='custom').render({rootObject:__definition.defaults}).innerText,pickers:__definition.schema.flatMap(section=>section.fields).filter(field=>field.type==='elementPicker').map(field=>field.key),invalidSchedule:__definition.validate({...__definition.defaults,shuttle:{...__definition.defaults.shuttle,schedule:'{"Mardi":[]}'}})};
  });
  assert.equal(diagnostics.schedule.valid,true);
  assert.equal(diagnostics.schedule.entries.length,5);
  assert.match(diagnostics.schedulePreview,/DRAGUIGNAN → FIGANIERES/);
  assert.equal(diagnostics.targets.find(item=>item.label==='Caméra — barcode').count,1);
  assert.equal(diagnostics.capabilities.permissionRequest,true);
  assert.equal(diagnostics.invalidSchedule.ok,false);
  assert.ok(diagnostics.pickers.includes('concern.source'));
  assert.ok(diagnostics.pickers.includes('scanner.extraSelector'));

  await page.evaluate(()=>{
    window.__detected=null;
    window.Quagga={stop(){},offDetected(){},init(config,callback){window.__quaggaConfig=config;callback(null);},start(){},onDetected(callback){window.__detected=callback;}};
    window.__events=[];for(const type of ['input','change','blur'])document.querySelector('#barcode').addEventListener(type,()=>__events.push(type));
  });
  await page.addScriptTag({path:path.join(ROOT,'112-responsive.js')});
  await page.waitForSelector('#barcode + .quagga-btn');
  await page.locator('#barcode + .quagga-btn').click();
  await page.waitForFunction(()=>typeof window.__detected==='function');
  await page.evaluate(()=>{for(let i=0;i<3;i++)__detected({codeResult:{code:'A1234567',format:'code_128'}});});
  await page.waitForFunction(()=>document.querySelector('#barcode').value==='A1234567');
  const scan=await page.evaluate(()=>({value:document.querySelector('#barcode').value,events:__events,submitted:__submitted,facingMode:__quaggaConfig.inputStream.constraints.facingMode,overlay:document.querySelector('#koha-quagga-overlay').style.display}));
  assert.equal(scan.value,'A1234567');
  assert.deepEqual(scan.events,['input','change','blur']);
  assert.equal(scan.submitted,false);
  assert.equal(scan.facingMode,'environment');
  fs.writeFileSync(OUT,JSON.stringify({passed:true,diagnostics,scan,hardware:'Parcours mobile exécuté avec l’API caméra simulée ; aucun téléphone physique connecté à cette session.'},null,2)+'\n');
  console.log('PASS legacy shuttle preview, visual targets and simulated mobile camera workflow');
  await browser.close();
})().catch(error=>{fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)});
