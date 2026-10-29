// Static declaration/syntax audit. No repository script is executed.
const fs=require('node:fs');
const path=require('node:path');
let acorn;
try{acorn=require('acorn');}catch(_){
  // Allows auditing in a provisioned Node environment before npm install.
  acorn={};new Function('exports','module',process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'])(acorn,{exports:acorn});
}
const root=path.resolve(__dirname,'..');
const records=[],files=[],coreImplementations=[];
function scan(file){
  const source=fs.readFileSync(file,'utf8');
  const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true});
  const relative=path.relative(root,file).split(path.sep).join('/');files.push(relative);
  function visit(node,scopes){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){node.forEach(item=>visit(item,scopes));return;}
    if(/Function/.test(node.type))scopes=scopes.concat(new Map());
    if(node.type==='VariableDeclarator'&&node.id.type==='Identifier'&&node.init?.type==='Literal')scopes[scopes.length-1].set(node.id.name,node.init.value);
    if(node.type==='AssignmentExpression'&&node.left.type==='MemberExpression'&&node.left.object.name==='window'&&node.left.property.name==='PMKConfig'&&node.right.type==='ObjectExpression')coreImplementations.push({file:relative,line:node.loc.start.line});
    if(node.type==='ObjectExpression'){
      const props=new Map(node.properties.filter(item=>item.type==='Property').map(item=>[item.key.name||item.key.value,item.value]));
      if(props.has('id')&&props.has('defaults')&&(props.has('schema')||props.has('name'))){
        const candidate=props.get('id');let id;
        if(candidate.type==='Literal')id=candidate.value;
        else if(candidate.type==='Identifier')for(let i=scopes.length-1;i>=0;i--)if(scopes[i].has(candidate.name)){id=scopes[i].get(candidate.name);break;}
        if(typeof id==='string')records.push({id,file:relative,line:node.loc.start.line,schemaVersion:props.get('schemaVersion')?.value||1});
      }
    }
    for(const [key,value]of Object.entries(node))if(!['loc','start','end'].includes(key)&&value&&typeof value==='object')visit(value,scopes);
  }
  visit(ast,[new Map()]);
}
function walk(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){if(entry.name.startsWith('.')||['tests','node_modules'].includes(entry.name))continue;const file=path.join(directory,entry.name);if(entry.isDirectory())walk(file);else if(entry.name.endsWith('.js'))scan(file);}
}
walk(root);
const grouped={};for(const record of records)(grouped[record.id]??=[]).push(record);
const report={syntaxChecked:files.length,declarations:records.length,moduleIds:Object.keys(grouped).length,coreImplementations,duplicateDeclarations:Object.entries(grouped).filter(([,sources])=>sources.length>1).map(([id,sources])=>({id,sources})),records};
if(coreImplementations.length!==1)throw new Error('Expected one PMK core implementation, found '+coreImplementations.length);
const reportIndex=process.argv.indexOf('--report');
if(reportIndex>=0){if(!process.argv[reportIndex+1])throw new Error('--report requires a filename');fs.writeFileSync(process.argv[reportIndex+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({syntaxChecked:report.syntaxChecked,moduleIds:report.moduleIds,declarations:report.declarations,coreImplementations:report.coreImplementations.length,duplicateDeclarations:report.duplicateDeclarations.map(entry=>entry.id)},null,2));
