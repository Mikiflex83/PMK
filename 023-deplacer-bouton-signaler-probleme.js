(async function(){
 const cfg=await PMKLegacyOptions.ready,options=cfg.concern;
 if(cfg.enabled===false||!options.enabled||!location.pathname.endsWith('/detail.pl'))return;
 const move=()=>{const source=document.querySelector(options.source),target=document.querySelector(options.after);if(!source||!target||source===target)return;source.textContent=options.label;source.classList.add('btn','btn-default');target.after(source);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',move,{once:true});else move();
})().catch(console.error);
