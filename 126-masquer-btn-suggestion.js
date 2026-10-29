(async function(){
'use strict';
const pmkLegacy=await window.PMKLegacyOptions.ready;
const options=pmkLegacy.hideSuggestion;
if(pmkLegacy.enabled===false || options.enabled===false)return;
$(document).ready(function () {
    if (window.location.pathname === "/cgi-bin/koha/suggestion/suggestion.pl") {
        $("#newsuggestion").remove();
    }
});
})().catch(error=>console.error('[PMK options historiques]',error));
