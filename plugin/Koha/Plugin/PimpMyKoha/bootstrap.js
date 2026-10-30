(function () {
    'use strict';
    if (window.PMKPlugin) return;
    const script = document.currentScript;
    const base = new URL('./',script.src);
    const state = window.PMKPlugin = {version:'0.4.0',loaded:[],errors:[],ready:false,
        assetUrl:file => new URL('assets/'+file,base).href};
    if (!window.PMK_BRAND_LOGO_URL) window.PMK_BRAND_LOGO_URL=state.assetUrl('pimp-my-koha.png');
    function load(file,version) {
        return new Promise((resolve,reject) => {
            const node = document.createElement('script');
            const url=new URL(file,base);
            if(version)url.searchParams.set('v',version);
            node.src = url.href;
            node.async = false;
            node.onload = resolve;
            node.onerror = () => reject(new Error('Ressource PMK inaccessible : '+file));
            document.head.appendChild(node);
        });
    }
    async function start() {
        // Empêche l'exécution d'une seconde copie complète par le plugin.
        const setup=script.dataset.pmkSetup==='1' || new URLSearchParams(location.search).get('pmk_migration')==='1';
        if (!setup && window.PMKConfig) throw new Error('PMK est déjà chargé. Désactivez son ancien chargeur avant d’activer le plugin.');
        await load('storage.js',state.version);
        await load('native-data.js',state.version);
        await window.PMKConfigNativeStorage.preload();
        await load('migration.js',state.version);
        const response = await fetch(new URL('manifest.json',base),{credentials:'same-origin'});
        if (!response.ok) throw new Error('Manifeste PMK inaccessible');
        const manifest = await response.json();
        state.manifest=manifest;
        state.build=manifest.build;
        if(setup){state.ready=true;await window.PMKMigration.open();return;}
        await load(manifest.autoloadBundle,manifest.build);
        if (!window.PMKConfig) throw new Error('Le socle PMK n’a pas démarré.');
        await load('owner-history.js',state.version);
        if (state.errors.length) throw new Error(state.errors.join('\n'));
        state.ready = true;
        if (new URLSearchParams(location.search).get('pmk_admin') === '1') window.PMKConfig?.openAdmin();
        window.dispatchEvent(new CustomEvent('pmk:plugin-ready',{detail:state}));
    }
    start().catch(error => {
        state.errors.push(error.message);
        const message=document.createElement('div');
        message.className='alert alert-danger';message.setAttribute('role','alert');
        message.textContent=error.message;
        (document.querySelector('main') || document.body).prepend(message);
    });
})();
