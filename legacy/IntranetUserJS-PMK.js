/* PMK 0.4.0 sans plugin — charge la configuration Firebase de cet établissement. */
(function () {
    'use strict';
    if (window.__PMK_NON_PLUGIN_BOOTSTRAP__) return;
    window.__PMK_NON_PLUGIN_BOOTSTRAP__ = true;

    function loadPmk() {
        const script = document.createElement('script');
        script.src = '/public/koha-scripts/pmk-non-plugin-loader.js?v=0.4.0-transition.4';
        script.async = false;
        script.onerror = function () {
            console.error('PimpMyKoha : chargeur non-plugin inaccessible');
        };
        document.head.appendChild(script);
    }

    const privateConfig = document.createElement('script');
    privateConfig.src = '/public/koha-scripts/pmk-firebase-config.js';
    privateConfig.async = false;
    privateConfig.onload = loadPmk;
    privateConfig.onerror = function () {
        console.error('PimpMyKoha : configuration Firebase locale absente. Copiez et renseignez pmk-firebase-config.example.js avant de charger PMK.');
    };
    document.head.appendChild(privateConfig);
})();
