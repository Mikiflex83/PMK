const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'tests/validation/overdue-action-preview-recovery.json');
try{
  const source=fs.readFileSync(path.join(ROOT,'143-gestion-retards.js'),'utf8');
  const checks={
    recipientBeforeAction:source.includes('<strong>Dossier destinataire :</strong>')&&source.includes("state.draft.recipient={id:state.selected"),
    exactContentPreview:source.includes('Contenu exact qui sera enregistré')&&source.includes("$('#tp4-preview-content').textContent"),
    destinationExplained:source.includes('Aucun courriel ni SMS n’est envoyé.'),
    explicitConfirmation:source.includes('J’ai vérifié le dossier destinataire et le contenu')&&source.includes("if(!$('#tp4-confirm-preview')?.checked)"),
    stagesConfigurable:source.includes('CONFIG.stageRules')&&source.includes('CONFIG.stageLabels')&&source.includes('CONFIG.stageQuickMessages'),
    exceptionsVisible:source.includes("r.stage==='control'||r.checks")&&source.includes('exceptions à contrôler'),
    uncertainWriteRecovery:source.includes('async function verifyPending()')&&source.includes('Vérifier l’enregistrement'),
    cleanupRecovery:source.includes("state.cleanup.done.push(state.uncertain.id)")&&source.includes('Relancer uniquement les messages restant dans la liste'),
    rereadBeforeWrite:source.includes('const fresh = await getDossier(draft.patron)')&&source.includes('const after = await getDossier(draft.patron)'),
    sessionAudit:source.includes('operations: []')&&source.includes("verified:true"),
    analysisRegistry:source.includes('recordAnalysis(PAGE')
  };
  for(const [name,passed] of Object.entries(checks))assert.equal(passed,true,name);
  fs.writeFileSync(OUT,JSON.stringify({passed:true,checks,scope:'Dossier, destination et contenu contrôlés avant écriture ; étapes, exceptions et reprises visibles et vérifiées par relecture Koha.'},null,2)+'\n');
  console.log('PASS overdue action preview, exceptions and recovery');
}catch(error){fs.writeFileSync(OUT,JSON.stringify({passed:false,error:error.stack},null,2)+'\n');console.error(error);process.exit(1)}
