// Copy optional third-party browser libraries for offline tests. No storage service.
const path=require('node:path');
const fs=require('node:fs');
const work=path.resolve(process.argv[2]||'/workspace/work/local-services');
(async()=>{
 fs.mkdirSync(path.join(work,'public'),{recursive:true});
 for(const [source,name]of [
  ['html2pdf.js/dist/html2pdf.bundle.min.js','html2pdf.bundle.min.js'],
  ['@emailjs/browser/dist/email.min.js','email.min.js'],
  ['qrcodejs/qrcode.min.js','qrcode.min.js'],
 ])fs.copyFileSync(path.join(work,'node_modules',source),path.join(work,'public',name));
})().catch(e=>{console.error(e);process.exitCode=1});
