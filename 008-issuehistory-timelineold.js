/* Compatibility URL. All defaults and SQL setup options are merged into 008-issuehistory-timeline.js. */
(function () {
    "use strict";
    if (window.__PMK_008_LOAN_HISTORY_TIMELINE__ || window.__PMK008CanonicalLoading) return;
    window.__PMK008CanonicalLoading = true;
    const current = document.currentScript;
    const url = new URL("008-issuehistory-timeline.js", current && current.src || new URL("/public/koha-scripts/", location.origin));
    if (current && current.src) url.search = new URL(current.src).search;
    const script = document.createElement("script"); script.src = url.href;
    if(current && current.nonce)script.nonce=current.nonce;
    script.onerror = function () { window.__PMK008CanonicalLoading = false; window.dispatchEvent(new CustomEvent("pmk:module-load-error", {detail:{moduleId:"loan-history-timeline",url:url.href}})); };
    (document.head || document.documentElement).appendChild(script);
})();
