/* ============================================================
   125-double_clic_resrvation.js
   PimpMyKoha — Protection double validation des réservations
   Version : 2.0.0-preplugin
   ============================================================ */
(function (window, document, $) {
    "use strict";

    if (!window || !document) return;
    if (window.__PMK125HoldSubmitGuard) return;
    window.__PMK125HoldSubmitGuard = true;

    const MODULE_ID = "hold-submit-guard";
    const MODULE_VERSION = "2.0.0-preplugin";
    const DEFAULT_CONFIG = Object.freeze({
        enabled: true,
        buttonSelector: "#hold_grp_btn",
        pendingTextFr: "Réservation en cours…",
        pendingTextEn: "Placing hold…",
        submissionMode: "navigation"
    });

    let currentConfig = clone(DEFAULT_CONFIG);
    let unsubscribe = null;
    let nativeBound = false;
    const pending = new Map();

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function lang() {
        if (window.PMKConfig && typeof window.PMKConfig.getLanguage === "function") return window.PMKConfig.getLanguage();
        return String(document.documentElement.lang || navigator.language || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
    }
    function normalizeConfig(raw) {
        const source = raw && typeof raw === "object" ? raw : {};
        return {
            enabled: source.enabled !== false,
            buttonSelector: String(source.buttonSelector || DEFAULT_CONFIG.buttonSelector),
            pendingTextFr: String(source.pendingTextFr || DEFAULT_CONFIG.pendingTextFr),
            pendingTextEn: String(source.pendingTextEn || DEFAULT_CONFIG.pendingTextEn),
            submissionMode: source.submissionMode === 'ajax' ? 'ajax' : 'navigation'
        };
    }

    function showPending(button) {
        const text = lang() === "en" ? currentConfig.pendingTextEn : currentConfig.pendingTextFr;
        const icon=document.createElement('i');icon.className='fa fa-spinner fa-spin';icon.setAttribute('aria-hidden','true');
        button.replaceChildren(icon,document.createTextNode(' '+text));
    }

    function release(form) {
        const saved=pending.get(form);if(!saved)return false;
        pending.delete(form);delete form.dataset.pmk125Submitting;
        saved.button.disabled=saved.disabled;
        if(saved.aria===null)saved.button.removeAttribute('aria-disabled');else saved.button.setAttribute('aria-disabled',saved.aria);
        saved.button.replaceChildren(...saved.children);
        return true;
    }

    function applyConfig(config) {
        currentConfig=normalizeConfig(config);
        if(!currentConfig.enabled)for(const form of pending.keys())release(form);
    }

    function findButton(form) {
        try { return form.querySelector(currentConfig.buttonSelector); } catch (_) { return null; }
    }

    function guardSubmit(event) {
        if (currentConfig.enabled === false) return;
        const form = event.target && event.target.closest ? event.target.closest("form") : null;
        if (!form) return;
        const button = findButton(form);
        if (!button) return;
        if(event.defaultPrevented)return;

        if (form.dataset.pmk125Submitting === "true") {
            event.preventDefault();
            event.stopImmediatePropagation();
            return false;
        }

        form.dataset.pmk125Submitting = "true";
        pending.set(form,{button,disabled:button.disabled,aria:button.getAttribute('aria-disabled'),children:[...button.childNodes]});
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
        showPending(button);
        // Attend la fin des validations synchrones de Koha. Une requête AJAX
        // annule aussi l'événement : elle doit libérer explicitement sa garde.
        if(currentConfig.submissionMode==='navigation')setTimeout(()=>{if(event.defaultPrevented)release(form);},0);
        return true;
    }

    function bindRuntime() {
        if (nativeBound) return;
        nativeBound = true;
        // Capture : la protection s'exécute avant les gestionnaires applicatifs
        // sans empêcher la première soumission légitime.
        document.addEventListener("submit", guardSubmit, true);
        window.addEventListener('pageshow',event=>{if(event.persisted)for(const form of pending.keys())release(form);});
        document.addEventListener('pmk:hold-submit-failed',event=>release(event.target.closest?.('form')));
        document.addEventListener('pmk:hold-submit-complete',event=>release(event.target.closest?.('form')));
    }

    function definition() {
        return {
            id: MODULE_ID,
            schemaVersion: 1,
            name: { fr: "Protection double validation — réservations", en: "Hold double-submit protection" },
            description: { fr: "Empêche un double clic ou une double soumission lors de la validation d’une réservation.", en: "Prevents double-clicks and duplicate submissions when placing a hold." },
            category: { fr: "Circulation / réservations", en: "Circulation / holds" },
            supportedPages: ["reserve.request"],
            defaults: clone(DEFAULT_CONFIG),
            schema: [
                { type: "section", id: "settings", label: { fr: "Réglages", en: "Settings" }, fields: [
                    { key: "enabled", type: "boolean", label: { fr: "Activer la protection", en: "Enable protection" } },
                    { key: "pendingTextFr", type: "text", label: { fr: "Texte pendant l’enregistrement — français", en: "Pending text — French" } },
                    { key: "pendingTextEn", type: "text", label: { fr: "Texte pendant l’enregistrement — anglais", en: "Pending text — English" } },
                    { key: "buttonSelector", type: "text", advanced: true, label: { fr: "Sélecteur du bouton Koha", en: "Koha button selector" } },
                    { key: "submissionMode", type: "select", advanced: true, label: {fr:"Envoi du formulaire",en:"Form submission"}, options:[{value:'navigation',label:{fr:'Navigation Koha native',en:'Native Koha navigation'}},{value:'ajax',label:{fr:'Requête AJAX personnalisée',en:'Custom AJAX request'}}],help:{fr:'Le mode natif débloque une validation annulée par Koha. En AJAX, l’intégration doit signaler explicitement la fin ou l’échec avec PMK125HoldSubmitGuard.release(form). Aucun délai ne relance automatiquement une réservation.',en:'Native mode releases a submission cancelled by Koha. AJAX integrations must explicitly call PMK125HoldSubmitGuard.release(form) on completion or failure. No timeout automatically retries a hold.'}}
                ]}
            ]
        };
    }

    function registerModule() {
        if (!window.PMKConfig || typeof window.PMKConfig.registerModule !== "function") return false;
        try { window.PMKConfig.registerModule(definition()); } catch (_) { return false; }
        if (!unsubscribe && typeof window.PMKConfig.subscribe === "function") {
            try { unsubscribe = window.PMKConfig.subscribe(MODULE_ID, applyConfig); } catch (_) {}
        }
        return true;
    }

    async function start() {
        registerModule();
        if (window.PMKConfig && typeof window.PMKConfig.getConfig === "function") {
            try { currentConfig = normalizeConfig(await window.PMKConfig.getConfig(MODULE_ID)); } catch (_) {}
        }
        bindRuntime();
    }

    window.PMK125HoldSubmitGuard = { moduleId: MODULE_ID, version: MODULE_VERSION, release };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
    if (!window.PMKConfig) window.addEventListener("pmk:config-ready", registerModule, { once: true });
})(window, document, window.jQuery);
