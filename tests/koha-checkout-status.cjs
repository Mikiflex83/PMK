// Native forced checkout, then PMK's configured status correction. Dedicated Koha only.
const {launch,ROOT,BASE}=require('./lib/koha.cjs');const {execFileSync}=require('node:child_process');const fs=require('node:fs'),assert=require('node:assert/strict');
const environment={...process.env};for(const name of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete environment[name];
function perl(source){return execFileSync('docker',['--host=unix:///var/run/docker.sock','exec','-i','pmk-koha-test-koha-1','koha-shell','kohadev','-c','perl'],{env:environment,input:"use Modern::Perl;use C4::Context;use JSON;die 'Dedicated database required' unless C4::Context->config('database') eq 'koha_kohadev';"+source,encoding:'utf8'}).trim();}
(async()=>{const h=await launch({offlineVendors:true}),p=h.page,item=h.fixtures.items.available,patron=h.fixtures.patrons.other,rows=[];let before,preference;
 async function read(){const r=await h.context.request.get(BASE+'/api/v1/items/'+item.id);assert.equal(r.status(),200);return r.json();}
 async function set(status){const r=await h.context.request.put(BASE+'/api/v1/biblios/'+item.biblio+'/items/'+item.id,{data:{not_for_loan_status:status}});assert.equal(r.status(),200);}
 try{
  before=await read();assert.equal(before.external_id,item.barcode);
  preference=JSON.parse(perl("say encode_json({value=>C4::Context->preference('AllowNotForLoanOverride')});")).value;assert(['0','1'].includes(String(preference)));
  perl("C4::Context->set_preference('AllowNotForLoanOverride',1);");
  await h.configure('checkout-status-correction',{enabled:true,categoryNotForLoan:'NOT_LOAN',categoryLost:'LOST',allowNotForLoan:['1'],allowLost:[]});
  await set(1);await h.goto('/cgi-bin/koha/circ/circulation.pl?borrowernumber='+patron.id);
  await p.locator('#barcode').fill(item.barcode);await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded',timeout:90000}),p.locator('#barcode').press('Enter')]);await h.ready();
  await p.locator('#pmk145-action').waitFor({timeout:30000});
  assert.equal(Number((await read()).not_for_loan_status),1,'Status unchanged before native confirmation');
  await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded',timeout:90000}),p.locator('#pmk145-action').click()]);await h.ready();
  for(let i=0;i<60;i++){if(Number((await read()).not_for_loan_status)===0)break;await p.waitForTimeout(200);}
  const after=await read();assert.equal(Number(after.not_for_loan_status),0);assert.equal(after.external_id,item.barcode);
  const checkouts=await h.context.request.get(BASE+'/api/v1/patrons/'+patron.id+'/checkouts?_per_page=500');assert.equal(checkouts.status(),200);const loans=await checkouts.json();assert(loans.some(x=>Number(x.item_id)===item.id),'Native checkout persisted before correction');
  assert.deepEqual(h.pageErrors,[]);rows.push({passed:true,item:item.id,patron:patron.id,nativeCheckout:true,configuredStatus:1,finalStatus:0});console.log('PASS native forced checkout, persisted loan and verified configured status correction');
 }catch(error){rows.push({passed:false,error:error.stack,pageErrors:h.pageErrors,httpErrors:h.httpErrors,text:(await p.locator('main').innerText()).slice(-6000)});console.error(error.message);process.exitCode=1;}
 finally{
  try{
   if(before){perl("use C4::Circulation qw(AddReturn);use Koha::Patrons;use Koha::Items;my $admin=Koha::Patrons->find({userid=>'koha'});C4::Context->set_userenv($admin->borrowernumber,$admin->userid,$admin->cardnumber,'PMK','Test','PMK_A','PMK Test PMK_A',1);my $item=Koha::Items->find({barcode=>'PMKTEST-AVAILABLE'});AddReturn($item->barcode,'PMK_A') if $item->checkout;die 'Synthetic checkout cleanup failed' if $item->discard_changes->checkout;");await set(before.not_for_loan_status);assert.equal((await read()).checked_out_date,null,'Synthetic checkout cleaned up');}
  }catch(error){rows.push({passed:false,phase:'cleanup',error:error.message});process.exitCode=1;}
  finally{if(preference!==undefined)perl("C4::Context->set_preference('AllowNotForLoanOverride',"+Number(preference)+");");}
  fs.writeFileSync(ROOT+'/tests/validation/koha-checkout-status.json',JSON.stringify({kind:'Real native Koha forced checkout and PMK correction; native preference restored',rows},null,2)+'\n');await h.close();
 }
})().catch(error=>{console.error(error.message);process.exitCode=1});
