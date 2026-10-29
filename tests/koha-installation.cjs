// Upload the exact release KPZ through Koha's native plugin installer.
const {launch,ROOT}=require('./lib/koha.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const kpz=process.env.PMK_RELEASE_KPZ||'/workspace/work/PimpMyKoha-plugin-0.4.0.kpz';
(async()=>{const h=await launch(),p=h.page;try{
 await h.goto('/cgi-bin/koha/plugins/plugins-upload.pl');
 await p.locator('#uploadfile').setInputFiles(kpz);
 await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded',timeout:90000}),p.locator('input[type=submit][value=Upload]').click()]);
 assert.equal(new URL(p.url()).pathname,'/cgi-bin/koha/plugins/plugins-home.pl');
 await h.ready();assert.equal(await p.evaluate(()=>PMKPlugin.version),process.env.PMK_EXPECTED_PLUGIN_VERSION||'0.4.0');
 await h.goto('/cgi-bin/koha/mainpage.pl?pmk_page=hub');
 const status=await p.evaluate(async()=>({version:PMKPlugin.version,loaded:PMKPlugin.loaded.length,storage:PMKConfigNativeStorage.kind,user:(await PMKNativeData.getSession()).userid}));
 const manifestResponse=await h.context.request.get((process.env.PMK_KOHA_TEST_URL||'http://127.0.0.1:18081')+'/api/v1/contrib/pmk/static/manifest.json');assert.equal(manifestResponse.status(),200);const manifest=await manifestResponse.json();
 assert.equal(status.loaded,manifest.scripts.length);assert(status.loaded>0);assert.equal(status.storage,'koha');assert.equal(status.user,'koha');assert.deepEqual(h.pageErrors,[]);
 fs.writeFileSync(ROOT+'/tests/validation/koha-installation.json',JSON.stringify({passed:true,packageSha256:crypto.createHash('sha256').update(fs.readFileSync(kpz)).digest('hex'),kind:'Exact release KPZ uploaded via the real Koha 25.11 native installer',status},null,2)+'\n');
 console.log('PASS native Koha KPZ upload, redirect, plugin reload and authenticated native storage');
 }finally{await h.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
