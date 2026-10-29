/* Compatibility entry point. Settings and rendering are unified in relative-dates.
 * Existing Firestore documents are read and preserved by 000; no document is deleted. */
(function () {
    'use strict';
    if (window.VC_DATE_UTILS || document.querySelector('script[data-pmk-date-runtime]')) return;
    const current=document.currentScript;
    if (!current || !current.src) return;
    const script=document.createElement('script');
    script.dataset.pmkDateRuntime='1';
    script.src=new URL('070-date-utils.js',current.src).href;
    document.head.appendChild(script);
})();
