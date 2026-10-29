// Dedicated PMKTEST fixture only. Native PMK restores without UndeleteRecords enabled.
const {launch,ROOT,BASE}=require('./lib/koha.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
function perl(code){return execFileSync('docker',['--host=unix:///var/run/docker.sock','exec','-i','pmk-koha-test-koha-1','koha-shell','kohadev','-c','perl'],{env,input:"use Modern::Perl;use C4::Context;use Koha::Plugins;use JSON;die 'Local test database required' unless C4::Context->config('database') eq 'koha_kohadev';\n"+code,encoding:'utf8'}).trim();}
(async()=>{const h=await launch({offlineVendors:true}),p=h.page,item=h.fixtures.items.deleted,available=h.fixtures.items.available,rows=[];let previousPlugin,staff;
 const endpoint=BASE+'/api/v1/contrib/pmk/restoration/items/'+item.id;
 const headers={Accept:'application/json','X-PMK-Request':'1'};
 const preview=()=>h.context.request.get(endpoint,{headers});
 const restore=plan=>h.context.request.post(endpoint,{headers,data:{fingerprint:plan.fingerprint,confirmed:true}});
 async function deleted(){const r=await h.context.request.get(BASE+'/api/v1/items/'+item.id);if(r.status()===200){assert.equal((await r.json()).external_id,item.barcode);assert.equal((await h.context.request.delete(BASE+'/api/v1/items/'+item.id)).status(),204);}else assert.equal(r.status(),404);}
 async function check(name,fn){try{const evidence=await fn();rows.push({name,passed:true,evidence});console.log('PASS '+name);}catch(e){rows.push({name,passed:false,error:e.stack});console.error('FAIL '+name,e);throw e;}finally{fs.writeFileSync(ROOT+'/tests/validation/koha-native-restoration.json',JSON.stringify({kind:'Native PMK restoration, inLibro disabled, local Koha and synthetic data',rows},null,2)+'\n');}}
 assert(item.barcode.startsWith('PMKTEST-')&&available.barcode.startsWith('PMKTEST-'));assert(Number.isInteger(item.id)&&Number.isInteger(item.biblio)&&Number.isInteger(available.id));
 try{
  await h.configure('147-home-submenus',{enabled:false});await h.configure('internal-pages-tools',{pageOptions:{'restore-deleted-items':{runtime:{allowedUsernames:[]}}}});
  previousPlugin=perl("use Koha::Plugin::UndeleteRecords;my $p=Koha::Plugin::UndeleteRecords->new;print $p->is_enabled ? 1 : 0;$p->disable;");
  await deleted();
  await check('Preview is read-only and rejects staff without restoration permission',async()=>{
    const r=await preview();assert.equal(r.status(),200,await r.text());const plan=await r.json();assert.equal(plan.item_id,item.id);assert.equal(plan.barcode_before,item.barcode);assert.equal((await h.context.request.get(BASE+'/api/v1/items/'+item.id)).status(),404);
    staff=await launch({user:'pmk-test-staff',password:'pmk-test-only'});assert.equal((await staff.context.request.get(endpoint,{headers})).status(),403);await staff.close();staff=null;
    const noHeader=await h.context.request.post(endpoint,{data:{fingerprint:plan.fingerprint,confirmed:true}});assert.equal(noHeader.status(),403);return {readOnly:true,staff:403,missingHeader:403};
  });
  await check('Stale confirmation and revoked configuration access leave the archive untouched',async()=>{
    const plan=await (await preview()).json();assert.equal((await restore({...plan,fingerprint:'0'.repeat(64)})).status(),409);
    await h.configure('internal-pages-tools',{pageOptions:{'restore-deleted-items':{runtime:{allowedUsernames:['PMKTEST-NOBODY']}}}});assert.equal((await restore(plan)).status(),403);
    await h.configure('internal-pages-tools',{pageOptions:{'restore-deleted-items':{runtime:{allowedUsernames:[]}}}});assert.equal((await h.context.request.get(BASE+'/api/v1/items/'+item.id)).status(),404);return {stale:409,revoked:403};
  });
  await check('Native restoration preserves fields, queues indexing and can replay a lost response',async()=>{
    const plan=await (await preview()).json(),r=await restore(plan);assert.equal(r.status(),200,await r.text());assert.equal((await r.json()).index_queued,true);
    const after=await h.context.request.get(BASE+'/api/v1/items/'+item.id);assert.equal(after.status(),200);assert.equal((await after.json()).external_id,item.barcode);
    const replay=await restore(plan);assert.equal(replay.status(),200,await replay.text());assert.equal((await replay.json()).replayed,true);
    return {item:item.id,barcode:item.barcode,fields:Object.keys(plan.fields).length,replayed:true,externalPluginEnabled:false};
  });
  await check('Barcode collision is previewed and confirmation becomes stale if the collision changes',async()=>{
    await deleted();const original=await (await preview()).json();
    perl(`C4::Context->dbh->do('UPDATE items SET barcode=? WHERE itemnumber=?',undef,'${item.barcode}',${available.id});`);
    try{assert.equal((await restore(original)).status(),409);const plan=await (await preview()).json();assert.equal(plan.barcode_conflict,true);assert.equal(plan.barcode_after,item.barcode+'_1');const r=await restore(plan);assert.equal(r.status(),200,await r.text());assert.equal((await r.json()).barcode,item.barcode+'_1');}
    finally{perl(`C4::Context->dbh->do('UPDATE items SET barcode=? WHERE itemnumber=?',undef,'${available.barcode}',${available.id});C4::Context->dbh->do('UPDATE items SET barcode=? WHERE itemnumber=?',undef,'${item.barcode}',${item.id});`);}
    return {explicitBarcode:item.barcode+'_1',stale:409};
  });
  await check('Deleted parent notice and MARC are restored together; invalid MARC rolls back all rows',async()=>{
    await deleted();const deletion=await h.context.request.delete(BASE+'/api/v1/biblios/'+item.biblio);assert.equal(deletion.status(),204,await deletion.text());
    const originalMetadata=perl(`print encode_json(C4::Context->dbh->selectall_arrayref('SELECT id,metadata FROM deletedbiblio_metadata WHERE biblionumber=?',{Slice=>{}},${item.biblio}));`);
    try{
      perl(`C4::Context->dbh->do('UPDATE deletedbiblio_metadata SET metadata=? WHERE biblionumber=?',undef,'<invalid',${item.biblio});`);
      const bad=await preview();assert.equal(bad.status(),200,await bad.text());const rejected=await restore(await bad.json());assert.equal(rejected.status(),409,await rejected.text());assert.equal((await rejected.json()).error,'metadata_invalid');
      assert.equal((await h.context.request.get(BASE+'/api/v1/items/'+item.id)).status(),404);assert.equal((await h.context.request.get(BASE+'/api/v1/biblios/'+item.biblio)).status(),404);
    }finally{
      perl("my $rows=decode_json(<<'FIXTURE_JSON');\n"+originalMetadata+"\nFIXTURE_JSON\nfor my $row (@$rows){C4::Context->dbh->do('UPDATE deletedbiblio_metadata SET metadata=? WHERE id=?',undef,$row->{metadata},$row->{id});}");
    }
    const plan=await (await preview()).json();assert.equal(plan.restore_biblio,true);const r=await restore(plan);assert.equal(r.status(),200,await r.text());
    assert.equal((await h.context.request.get(BASE+'/api/v1/biblios/'+item.biblio,{headers:{Accept:'application/marcxml+xml'}})).status(),200);assert.equal((await h.context.request.get(BASE+'/api/v1/items/'+item.id)).status(),200);
    return {biblio:item.biblio,rollbackVerified:true,parentAndItemRestored:true};
  });
 }finally{
   if(staff)await staff.close();
   if(previousPlugin==='1')perl('use Koha::Plugin::UndeleteRecords;Koha::Plugin::UndeleteRecords->new->enable;');
   await h.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
