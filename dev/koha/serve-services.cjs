const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const directory=path.resolve(process.argv[2]||'/workspace/work/local-services/public');
http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname.slice(1);
 if(!/^[a-zA-Z0-9_.-]+$/.test(name)){res.writeHead(404);return res.end();}
 const file=path.join(directory,name);
 if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Access-Control-Allow-Origin':'*'});
 fs.createReadStream(file).pipe(res);
}).listen(18900,'127.0.0.1',()=>console.log('LOCAL_SDK_READY 127.0.0.1:18900'));
