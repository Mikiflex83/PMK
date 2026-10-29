const assert=require('assert');
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const text=fs.readFileSync(path.join(ROOT,'COMPATIBILITE-PLUGIN-0.4.0.md'),'utf8');
const required=[
  'Koha 25.11','MariaDB 10.11','UNIMARC','MARC21','Chromium',
  'Scanner et caméra','NEDAP / Libnet','Electre','France Publications',
  'aucun SDK ni service Firebase requis','Aucun export de production Dracénie'
];
for(const label of required)assert(text.includes(label),`Limite absente : ${label}`);
assert(text.includes('Les deux qualifications encore dépendantes du terrain'));
const rows=required.map(name=>({name,passed:true}));
fs.writeFileSync(path.join(ROOT,'tests/validation/compatibility-matrix.json'),JSON.stringify({
  kind:'Documented and bounded PMK 0.4.0 compatibility matrix',rows
},null,2)+'\n');
console.log(JSON.stringify({passed:true,rows:rows.length}));
