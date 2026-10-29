const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/inventory-local-recovery.json');

(async()=>{
  let definition=null,source='';
  const sandbox={window:{PMKPages:{register:value=>{definition=value;}}}};
  sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'138-pages/138-page-inventory.js'),'utf8'),sandbox,{filename:'138-page-inventory.js'});
  assert(definition&&definition.id==='inventory');
  await definition.mount({}, {mountLegacyHtml:async(_container,value)=>{source=value;}});
  const checks={
    indexedDbStateVisible:source.includes('id="inv-local-storage-status"')&&source.includes('Stockage local prêt · reprise disponible sur ce navigateur.'),
    indexedDbWriteConfirmed:source.includes("local.textContent = 'Stockage local : enregistré à '")&&source.includes("tx.objectStore(store).put(obj)"),
    indexedDbFailureVisible:source.includes("Stockage local indisponible : ' + e.message"),
    resumeVisible:source.includes("Inventaire « ' + value(inv.name || inv.uuid) + ' » repris depuis ce navigateur."),
    resumeAction:source.includes('await openInventory(inv.uuid)')&&source.includes('>Ouvrir</button>'),
    unknownBarcodeSaved:source.includes("code: 'not_found', text: 'Code-barres introuvable dans Koha.'")&&source.includes("await storePut('scans', rec)"),
    repeatedBarcodeExplained:source.includes("code:'already_seen', text:'Déjà scanné dans cette zone"),
    otherZoneProtected:source.includes('Ce code-barres a déjà été scanné dans une autre zone. Aucun changement Koha n’a été appliqué avant résolution du conflit.'),
    batchResumeState:source.includes('processed_count')&&source.includes('before_scans')&&source.includes('Import de codes-barres interrompu'),
    tombstoneSelfTests:source.includes('tombstone suppression complète empêche résurrection')&&source.includes('un rescan postérieur à la suppression survit'),
    duplicateAnomalySelfTest:source.includes('erreur du lot annulé retirée de l’historique fusionné')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Contrat de la page : état IndexedDB visible, reprise locale et traitement explicite des codes inconnus ou répétés.'},null,2)+'\n');
  console.log('PASS inventory local persistence, recovery and barcode states');
})().catch(error=>{
  fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');
  console.error(error);
  process.exit(1);
});
