window.PMKInstallationSQL={async copy(file){
 const url=window.PMKPlugin?.assetUrl?PMKPlugin.assetUrl('sql/'+file):'/public/koha-scripts/sql/'+file;
 const response=await fetch(url,{credentials:'same-origin'});if(!response.ok)throw new Error('SQL indisponible : '+response.status);
 const sql=await response.text();if(!/^\s*(?:--|SELECT|WITH)/i.test(sql))throw new Error('Fichier SQL invalide');
 PMKConfig.services.get('sql-reports').registerDefinition({id:file.toLowerCase(),sql,purpose:file,parameters:[...sql.matchAll(/<<([^>]+)>>/g)].map(x=>x[1]),columns:[]},{replace:true});
 await navigator.clipboard.writeText(sql);return {changed:false,message:'SQL copié. Créez un rapport privé Koha, puis renseignez son identifiant dans PMK.'};
}};
(function(){
 const defaults={enabled:true,allReportId:5246,duplicatesReportId:5245,orphansReportId:5260,personTypes:'NP\nPERS\nSAUT\nFAM'};
 const REPORTS=[['allReportId','Référentiel complet','Authorities-referentiel.sql'],['duplicatesReportId','Doublons','Authorities-doublons.sql'],['orphansReportId','Orphelins','Authorities-orphelins.sql']];
 function diagnose(config=defaults){
  const ids=new Map(),reports=REPORTS.map(([key,label,file])=>{const id=Number(config?.[key]),valid=Number.isSafeInteger(id)&&id>0;if(valid){if(!ids.has(id))ids.set(id,[]);ids.get(id).push(key);}return {key,label,file,id:valid?id:0,valid,state:valid?'à vérifier dans ce Koha':'identifiant manquant'};});
  for(const report of reports)if(report.valid&&ids.get(report.id).length>1)report.state='identifiant partagé avec un autre rapport';
  const raw=String(config?.personTypes||'').split(/[\n,;]+/).map(value=>value.trim()).filter(Boolean),seen=new Set(),duplicates=[],invalid=[];
  for(const value of raw){const normalized=value.toUpperCase();if(seen.has(normalized))duplicates.push(value);else seen.add(normalized);if(!/^[A-Za-z0-9_-]{1,20}$/.test(value))invalid.push(value);}
  return {reports,personTypes:[...seen],duplicatePersonTypes:[...new Set(duplicates)],invalidPersonTypes:[...new Set(invalid)],valid:reports.every(report=>report.valid&&report.state==='à vérifier dans ce Koha')&&seen.size>0&&!duplicates.length&&!invalid.length};
 }
 async function checkInstallation(config=defaults){
  const local=diagnose(config);if(!window.PMKWorkbench?.checkReports)return {...local,checked:false,error:'Le diagnostic commun des rapports n’est pas chargé.'};
  const reportConfig={};for(const report of local.reports)reportConfig[report.key]={reportId:report.id};
  const remote=await PMKWorkbench.checkReports(reportConfig),byId=new Map((remote.rows||[]).map(row=>[Number(row.id),row]));
  return {...local,checked:true,reports:local.reports.map(report=>({...report,remote:byId.get(report.id)||null}))};
 }
 function renderDiagnostic(ctx){
  const box=document.createElement('div'),result=diagnose(ctx.rootObject||defaults),title=document.createElement('strong');title.textContent='Diagnostic de cette installation';box.append(title);
  const list=document.createElement('ul');for(const report of result.reports){const li=document.createElement('li');li.textContent=report.label+' — rapport '+(report.id||'non configuré')+' : '+report.state;list.append(li);}box.append(list);
  const types=document.createElement('p');types.textContent='Types de personnes : '+(result.personTypes.join(', ')||'aucun')+(result.duplicatePersonTypes.length?' · doublons : '+result.duplicatePersonTypes.join(', '):'')+(result.invalidPersonTypes.length?' · codes invalides : '+result.invalidPersonTypes.join(', '):'');box.append(types);
  const note=document.createElement('p');note.textContent='Le contrôle à distance lit uniquement le nom et les paramètres des rapports. Il n’exécute pas leur SQL et ne modifie aucune autorité.';box.append(note);
  const button=document.createElement('button');button.type='button';button.className='btn btn-default btn-sm';button.textContent='Vérifier les rapports dans ce Koha';const status=document.createElement('div');status.setAttribute('role','status');status.style.marginTop='6px';
  button.onclick=async()=>{button.disabled=true;status.textContent='Vérification…';try{const checked=await checkInstallation(ctx.rootObject||defaults);status.textContent=checked.checked?checked.reports.map(report=>report.label+' : '+(report.remote?.state==='ok'?'disponible':report.remote?.state==='missing'?'introuvable':report.remote?.state||report.state)).join(' · '):checked.error;}catch(error){status.textContent='Vérification impossible : '+error.message;}finally{button.disabled=false;}};
  box.append(button,status);return box;
 }
 const definition={configurationOnly:true,id:'authority-installation-options',schemaVersion:1,name:{fr:'Autorités — paramètres de l’installation',en:'Authorities — installation settings'},description:{fr:'Périmètre v1 : UNIMARC/A. Configurez les trois rapports propres à ce Koha et les codes de types de personnes. Cette fiche contrôle uniquement l’installation ; le moteur métier de la page Autorités reste inchangé.',en:'v1: UNIMARC/A. Configure this Koha installation reports and person authority types.'},category:{fr:'Pages et outils internes',en:'Internal pages'},defaults,
  validate:config=>{const result=diagnose(config);return result.valid?{ok:true}:{ok:false,message:'Corrigez les identifiants de rapports et les codes de types signalés dans le diagnostic.'};},
  schema:[{type:'section',id:'reports',label:{fr:'Rapports et types d’autorités',en:'Reports and authority types'},description:{fr:'Les identifiants sont propres à chaque installation. Copiez les modèles SQL, créez les rapports dans Koha, puis indiquez ici leurs numéros.',en:'Report IDs belong to each installation.'},fields:[
   {key:'allReportId',type:'number',label:{fr:'Rapport Référentiel complet',en:'Full authority report'}},{key:'duplicatesReportId',type:'number',label:{fr:'Rapport Doublons',en:'Duplicate authority report'}},{key:'orphansReportId',type:'number',label:{fr:'Rapport Orphelins',en:'Orphan authority report'}},{key:'personTypes',type:'textarea',label:{fr:'Codes des types de personnes, un par ligne',en:'Person authority type codes, one per line'},help:{fr:'Codes auth_tag_to_report réellement utilisés dans cette installation, par exemple NP, PERS, SAUT ou FAM.',en:'Actual auth_tag_to_report codes used in this installation.'}},{type:'custom',render:renderDiagnostic}
  ]}]
 };
 definition.schema[0].fields.push(...REPORTS.map(([,label,file])=>({type:'action',label:{fr:file,en:file},buttonLabel:{fr:'Copier le SQL',en:'Copy SQL'},help:{fr:'Modèle pour le rapport '+label+'.',en:'SQL template.'},action:()=>PMKInstallationSQL.copy(file)})));
 window.PMKAuthorityInstallation=Object.freeze({diagnose,checkInstallation,defaults});
 PMKConfig.registerModule(definition);
})();
