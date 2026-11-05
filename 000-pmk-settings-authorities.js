window.PMKInstallationSQL={async copy(file){
 const url=window.PMKPlugin?.assetUrl?PMKPlugin.assetUrl('sql/'+file):'/public/koha-scripts/sql/'+file;
 const response=await fetch(url,{credentials:'same-origin'});if(!response.ok)throw new Error('SQL indisponible : '+response.status);
 const sql=await response.text();if(!/^\s*(?:--|SELECT|WITH)/i.test(sql))throw new Error('Fichier SQL invalide');
 PMKConfig.services.get('sql-reports').registerDefinition({id:file.toLowerCase(),sql,purpose:file,parameters:[...sql.matchAll(/<<([^>]+)>>/g)].map(x=>x[1]),columns:[]},{replace:true});
 await navigator.clipboard.writeText(sql);return {changed:false,message:'SQL copié. Créez un rapport privé Koha, puis renseignez son identifiant dans PMK.'};
}};
(function(){
 const defaults={enabled:true,allReportId:0,duplicatesReportId:0,orphansReportId:0,personTypes:'NP\nPERS\nSAUT\nFAM'};
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
 function reportFields(key, label, file) {
  return [
   {key:key,type:'number',min:0,label:{fr:'Numéro Koha — '+label,en:'Koha number — '+label},help:{fr:'0 tant que ce rapport n’existe pas dans ce Koha.',en:'0 until this report exists in this Koha.'}},
   {type:'action',buttonLabel:{fr:'Copier le SQL',en:'Copy SQL'},help:{fr:'Copie le modèle « '+label+' ». Créez le rapport privé dans Koha, puis indiquez son numéro au-dessus.',en:'Copies the '+label+' template. Create the private Koha report, then enter its number above.'},action:()=>PMKInstallationSQL.copy(file)}
  ];
 }
 const definition={configurationOnly:true,id:'authority-installation-options',schemaVersion:2,name:{fr:'Autorités — paramètres de l’installation',en:'Authorities — installation settings'},description:{fr:'Indique à la page Autorités quels rapports SQL de ce Koha utiliser : le référentiel complet, les doublons et les orphelins. Les numéros sont ceux de votre installation. Aucune notice d’autorité n’est modifiée depuis cette page.',en:'Tells the authorities page which SQL reports on this Koha to use: the full list, duplicates and orphans. The numbers belong to this installation. No authority record is changed from this page.'},category:{fr:'Pages et outils internes',en:'Internal pages'},defaults,
  validate:config=>{const result=diagnose(config);if(result.invalidPersonTypes.length)return {ok:false,message:'Un code de type de personne est invalide.'};if(result.duplicatePersonTypes.length)return {ok:false,message:'Un code de type de personne est répété.'};const ids=result.reports.map(report=>report.id).filter(id=>id>0);if(new Set(ids).size!==ids.length)return {ok:false,message:'Deux rapports utilisent le même numéro.'};return {ok:true};},
  schema:[
   {type:'section',id:'reports',label:{fr:'Rapports de cette installation',en:'Reports on this installation'},description:{fr:'Pour chaque liste, copiez le SQL, créez le rapport dans Koha, puis saisissez son numéro. Un numéro 0 laisse cette liste débranchée.',en:'For each list, copy the SQL, create the Koha report, then enter its number. 0 leaves that list disconnected.'},fields:REPORTS.flatMap(entry=>reportFields(entry[0],entry[1],entry[2]))},
   {type:'section',id:'types',label:{fr:'Types de personnes',en:'Person types'},description:{fr:'Codes qui désignent une autorité personne dans ce Koha. Un code par ligne.',en:'Codes that mark a person authority in this Koha. One code per line.'},fields:[
    {key:'personTypes',type:'textarea',label:{fr:'Codes, un par ligne',en:'Codes, one per line'},help:{fr:'Exemples UNIMARC : NP, PERS, SAUT, FAM. Remplacez-les par les codes réellement utilisés ici.',en:'UNIMARC examples: NP, PERS, SAUT, FAM. Replace them with the codes actually used here.'}}
   ]},
   {type:'section',id:'check',label:{fr:'Vérification',en:'Check'},description:{fr:'Contrôle que les numéros saisis correspondent à des rapports de ce Koha. Le SQL n’est pas exécuté et aucune autorité n’est modifiée.',en:'Checks that the entered numbers match reports on this Koha. The SQL is not run and no authority is changed.'},fields:[{type:'custom',render:renderDiagnostic}]}
  ]
 };
 function renderPanel(host){
  const intro=document.createElement('p');intro.textContent='Indiquez les rapports SQL de ce Koha et les codes qui désignent une personne. Aucune autorité n’est modifiée depuis ce formulaire.';host.appendChild(intro);
  const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Lecture des réglages…';host.appendChild(status);
  (async()=>{
   let draft;try{draft=Object.assign({},defaults,await window.PMKConfig.getConfig('authority-installation-options')||{});}catch(error){status.textContent='Réglages indisponibles : '+error.message;return;}
   status.textContent='';
   for(const [key,label,file] of REPORTS){
    const input=document.createElement('input');input.type='number';input.min='0';input.className='form-control';input.value=String(Number(draft[key])||0);input.addEventListener('input',()=>{draft[key]=input.value===''?0:Number(input.value);});
    const row=document.createElement('div');const field=document.createElement('label');field.textContent='Numéro Koha — '+label+' ';field.appendChild(input);row.appendChild(field);
    const copy=document.createElement('button');copy.type='button';copy.className='btn btn-default btn-sm';copy.textContent='Copier le SQL — '+label;
    copy.onclick=async()=>{copy.disabled=true;try{const result=await window.PMKInstallationSQL.copy(file);status.textContent=result.message||'SQL copié';}catch(error){status.textContent='Copie impossible : '+error.message;}finally{copy.disabled=false;}};
    row.appendChild(copy);host.appendChild(row);
   }
   const types=document.createElement('textarea');types.className='form-control';types.rows=5;types.value=String(draft.personTypes||'');types.addEventListener('input',()=>{draft.personTypes=types.value;});
   const typesLabel=document.createElement('label');typesLabel.textContent='Codes de personnes, un par ligne ';typesLabel.appendChild(types);host.appendChild(typesLabel);
   const help=document.createElement('p');help.textContent='Exemples UNIMARC : NP, PERS, SAUT, FAM. Remplacez-les par les codes de ce Koha. Un numéro 0 laisse le rapport correspondant débranché.';host.appendChild(help);
   const check=document.createElement('button');check.type='button';check.className='btn btn-default btn-sm';check.textContent='Vérifier les rapports dans ce Koha';
   check.onclick=async()=>{check.disabled=true;status.textContent='Vérification…';try{const checked=await checkInstallation(draft);status.textContent=checked.checked?checked.reports.map(report=>report.label+' : '+(report.remote?.state==='ok'?'disponible':report.remote?.state==='missing'?'introuvable':report.remote?.state||report.state)).join(' · '):checked.error;}catch(error){status.textContent='Vérification impossible : '+error.message;}finally{check.disabled=false;}};
   const save=document.createElement('button');save.type='button';save.className='btn btn-primary btn-sm';save.textContent='Enregistrer';save.style.marginLeft='8px';
   save.onclick=async()=>{save.disabled=true;try{const result=diagnose(draft);if(result.invalidPersonTypes.length)throw new Error('Un code de type de personne est invalide.');if(result.duplicatePersonTypes.length)throw new Error('Un code de type de personne est répété.');const ids=result.reports.map(report=>report.id).filter(id=>id>0);if(new Set(ids).size!==ids.length)throw new Error('Deux rapports utilisent le même numéro.');await window.PMKConfig.saveConfig('authority-installation-options',Object.assign({},draft,{enabled:true}));status.textContent='Enregistré. Rechargez la page pour que ces rapports soient utilisés.';}catch(error){status.textContent=error.message;}finally{save.disabled=false;}};
   host.append(check,save);
  })();
 }
 window.PMKAuthorityInstallation=Object.freeze({diagnose,checkInstallation,defaults,renderPanel});
 PMKConfig.registerModule(definition);
})();
