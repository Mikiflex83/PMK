(async function(){
'use strict';
const pmkLegacy=await window.PMKLegacyOptions.ready;
const options=pmkLegacy.transferInfo;
if(pmkLegacy.enabled===false || options.enabled===false)return;
/*
 Nom du fichier: 092-popup-info-site-transfert.js
 Dépendances: KOHA_UTILS.waitFor (fallback included), jQuery optional
 Date de dernière modification: 2026-02-21
 Auteur: équipe PimpMyKoha
 Description: Affiche une pop-up d'information pour les sites de transfert.
*/

(function(){
  'use strict';
  try{
    (function(){})('092-popup-info-site-transfert: loaded');
    if (!window.location.pathname || window.location.pathname!==options.path) return;

    const waitFor = (selector, timeout) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector, timeout);
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => { const found = document.querySelector(selector); if (found) { obs.disconnect(); resolve(found); } });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout || 3000);
      });
    };

    waitFor(options.target, 3000).then(() => {
      try{
        document.querySelectorAll(options.target).forEach(el => {
          el.addEventListener('click', function(e){
            e.preventDefault(); const info = this.dataset.info || this.title || this.textContent; const modal = document.querySelector(options.modal); if (modal){ modal.querySelector('.modal-body').textContent = info; try{ if (window.jQuery) window.jQuery(modal).modal('show'); }catch(e){ (function(){})('092: show modal failed', e); } } else { alert(info); }
          });
        });
      }catch(e){ (function(){})('092: init failed', e); }
    }).catch(()=>{});

  }catch(e){ (function(){})('092-popup-info-site-transfert: failed', e); }
})();

})().catch(error=>console.error('[PMK options historiques]',error));
