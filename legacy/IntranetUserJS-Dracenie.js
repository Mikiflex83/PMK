/* PMK 0.4.0 transitoire sans plugin — remplace l'ancien tableau de fichiers PMK. */
(function () {
    'use strict';
    if (window.__PMK_NON_PLUGIN_BOOTSTRAP__) return;
    window.__PMK_NON_PLUGIN_BOOTSTRAP__ = true;

    function loadPmk() {
        const script = document.createElement('script');
        script.src = '/public/koha-scripts/pmk-non-plugin-loader.js?v=0.4.0-transition.3';
        script.async = false;
        script.onerror = function () {
            console.error('PimpMyKoha : chargeur non-plugin inaccessible');
        };
        document.head.appendChild(script);
    }

    const privateConfig = document.createElement('script');
    privateConfig.src = '/public/koha-scripts/pmk-legacy-private-config.js';
    privateConfig.async = false;
    privateConfig.onload = loadPmk;
    privateConfig.onerror = function () {
        console.error('PimpMyKoha : configuration historique privée absente. Copiez et renseignez pmk-legacy-private-config.example.js avant de charger PMK.');
    };
    document.head.appendChild(privateConfig);
})();
