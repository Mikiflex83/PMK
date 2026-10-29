/* ============================================================
   PimpMyKoha - Pré-plugin
   Fichier : 002-verification-coordonnees.js
   Version : 2.1.0-isolated

   Module fonctionnel : Vérification avant renouvellement lecteur

   Fonction :
   - détecte structurellement un lecteur expiré / bientôt expiré ;
   - affiche une checklist configurable des informations à vérifier ;
   - bloque les actions natives Koha de renouvellement d'adhésion tant
     que toutes les vérifications actives ne sont pas confirmées ;
   - couvre les liens d'alerte ET la commande native de la barre d'outils ;
   - FR/EN, responsive, idempotent, fail-safe ;
   - configuration partagée via 000-pmk-config-firestore.js ;
   - aucune dépendance directe à Firebase dans la logique métier.
   ============================================================ */

(function () {
    "use strict";

    if (window.__PMK_002_PATRON_RENEWAL_VERIFICATION__) return;
    window.__PMK_002_PATRON_RENEWAL_VERIFICATION__ = true;

    const MODULE_ID = "patron-renewal-verification";
    const UI_ID = "pmk-patron-renewal-verification";
    const STYLE_ID = "pmk-patron-renewal-verification-style";

    const PAGES = [
        {
            id: "members.moremember",
            path: "/cgi-bin/koha/members/moremember.pl",
            labelFr: "Fiche lecteur",
            labelEn: "Patron details"
        },
        {
            id: "circ.circulation",
            path: "/cgi-bin/koha/circ/circulation.pl",
            labelFr: "Circulation",
            labelEn: "Circulation"
        }
    ];

    // Native Koha information presets; each can be retargeted or supplemented with custom fields.
    const CHECK_OPTIONS = [
        { value: "address", label: { fr: "Adresse complète", en: "Full address" } },
        { value: "phone", label: { fr: "Téléphone de contact", en: "Contact phone" } },
        { value: "email", label: { fr: "E-mail de contact", en: "Contact email" } },
        { value: "dateofbirth", label: { fr: "Date de naissance", en: "Date of birth" } }
    ];

    const DEFAULT_CONFIG = {
        enabled: true,
        expired: true,
        expiringSoon: true,
        targets: {expired:'li.expired',expiringSoon:'li.warndeparture',patronRoot:'',renewAction:'',destination:''},
        introFr: "Vérifiez les informations du lecteur avant de renouveler son adhésion :",
        introEn: "Verify the patron information before renewing the membership:",
        missingFr: "Non renseigné",
        missingEn: "Not provided",
        pages: PAGES.map(function (page) {
            return {
                id: page.id,
                path: page.path,
                enabled: true,
                labelFr: page.labelFr,
                labelEn: page.labelEn
            };
        }),
        checks: [
            {
                id: "address",
                enabled: true,
                severity: "blocking",
                labelFr: "Adresse",
                labelEn: "Address"
            },
            {
                id: "phone",
                enabled: true,
                severity: "blocking",
                labelFr: "Téléphone",
                labelEn: "Phone"
            },
            {
                id: "email",
                enabled: true,
                severity: "blocking",
                labelFr: "E-mail",
                labelEn: "Email"
            }
        ]
    };

    let currentConfig = null;
    let coreRegistered = false;
    let fallbackStarted = false;
    let runtimeLocked = false;
    let guardInstalled = false;
    let currentWarning = null;
    let currentPageId = null;
    let currentLinks = [];
    const originalLinkAttributes=new WeakMap();

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeConfig(config) {
        const value = Object.assign(clone(DEFAULT_CONFIG), config || {});
        value.targets = Object.assign({}, DEFAULT_CONFIG.targets, config && config.targets || {});
        value.pages = Array.isArray(config && config.pages) ? config.pages.map(function (page) { return Object.assign({}, page); }) : clone(DEFAULT_CONFIG.pages);
        value.checks = Array.isArray(config && config.checks) ? config.checks.map(function (check) {
            const row = Object.assign({}, check);
            row.severity = ["information", "warning", "blocking"].includes(row.severity) ? row.severity : "blocking";
            return row;
        }) : clone(DEFAULT_CONFIG.checks);
        return value;
    }

    function detectLanguage() {
        if (window.PMKConfig && typeof window.PMKConfig.getLanguage === "function") {
            return window.PMKConfig.getLanguage();
        }
        const lang = (document.documentElement.getAttribute("lang") || navigator.language || "").toLowerCase();
        return lang.startsWith("fr") ? "fr" : "en";
    }

    function localText(fr, en) {
        return detectLanguage() === "fr" ? fr : en;
    }

    function getCurrentPageDefinition() {
        const path = window.location.pathname;
        return (currentConfig.pages || PAGES).find(function (page) {
            return page.path === path;
        }) || null;
    }

    function getPageConfig(config, pageId) {
        if (!config || !Array.isArray(config.pages)) return null;
        return config.pages.find(function (page) {
            return page && page.id === pageId;
        }) || null;
    }

    function safeQuery(selector, root) {
        try { return selector ? (root || document).querySelector(selector) : null; } catch (_) { return null; }
    }
    function targetSelector(key, fallback) { return (currentConfig.targets || {})[key] || fallback || ''; }
    function pickRenewalTarget(context) {
        const page = context.rootObject.pages.find(p => p.enabled !== false && p.path === location.pathname)
            || context.rootObject.pages.find(p => p.enabled !== false);
        return window.PMKConfig.elementPicker.pickForConfig({moduleId:MODULE_ID,rootObject:context.rootObject,
            fieldPath:context.fieldPath,targetUrl:page ? page.path : location.pathname,persistAfterPick:false});
    }

    function isSupportedRenewLink(link) {
        if (!link) return false;
        const selector = targetSelector('renewAction');
        if (selector) { try { return link.matches(selector) && link.matches('a,button,input[type="submit"],input[type="button"]'); } catch (_) { return false; } }
        if (link.tagName !== "A" || !link.href) return false;
        try {
            const url = new URL(link.href, window.location.origin);
            return url.origin === window.location.origin &&
                url.pathname === "/cgi-bin/koha/members/setstatus.pl" &&
                url.searchParams.get("reregistration") === "y";
        } catch (_) {
            return false;
        }
    }

    function findRenewLinks() {
        return Array.from(document.querySelectorAll('a[href],button,input[type="submit"],input[type="button"]'))
            .filter(isSupportedRenewLink);
    }

    function findPatronWarning(selector) {
        /*
         * Koha n'utilise pas le même conteneur selon la page :
         * - moremember.pl peut exposer #patron_messages ;
         * - circulation.pl rend patron_messages.inc dans un .circmessage
         *   dont l'id peut être absent ou vide selon le template/version.
         *
         * On cible donc l'élément métier (li.expired / li.warndeparture)
         * à l'intérieur des zones de messages Koha, sans dépendre d'un id.
         */
        const scopedSelectors = [
            "#patron_messages " + selector,
            "#circmessages " + selector,
            ".circmessage.warning " + selector,
            ".circmessage.attention " + selector,
            ".circmessage " + selector
        ];

        for (const scopedSelector of scopedSelectors) {
            const found = safeQuery(scopedSelector);
            if (found) return found;
        }

        /*
         * Dernier repli borné : patron_messages.inc produit directement
         * ces classes sur des <li>. Cela couvre une personnalisation de
         * conteneur sans élargir la détection à du texte traduit.
         */
        return safeQuery(selector);
    }

    function detectWarningState() {
        const expired = findPatronWarning(targetSelector('expired', 'li.expired'));
        if (expired) {
            return {
                type: "expired",
                element: expired,
                messages: expired.closest(".circmessage, #patron_messages") || expired.parentElement
            };
        }

        const expiring = findPatronWarning(targetSelector('expiringSoon', 'li.warndeparture'));
        if (expiring) {
            return {
                type: "expiringSoon",
                element: expiring,
                messages: expiring.closest(".circmessage, #patron_messages") || expiring.parentElement
            };
        }

        return null;
    }

    function warningEnabled(config, warning) {
        if (!config || !warning) return false;
        if (warning.type === "expired") return config.expired !== false;
        if (warning.type === "expiringSoon") return config.expiringSoon !== false;
        return false;
    }

    function getPatronInfoRoot() {
        /*
         * circ-menu.inc expose normalement .patroninfo sur les pages lecteur
         * et circulation. On prévoit plusieurs replis structurels pour rester
         * compatible avec les variantes de gabarit et personnalisations Koha.
         */
        if (targetSelector('patronRoot')) return safeQuery(targetSelector('patronRoot'));
        const patronInfo = document.querySelector(".patroninfo");
        if (patronInfo) return patronInfo;

        const briefInfo = document.querySelector(".patronbriefinfo");
        if (briefInfo) {
            return briefInfo.closest(".patroninfo") || briefInfo;
        }

        const patronInformation = document.getElementById("patron-information");
        if (patronInformation) return patronInformation;

        return null;
    }

    function cleanText(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function textOf(element) {
        return element ? cleanText(element.textContent) : "";
    }

    function firstText(root, selectors) {
        if (!root) return "";
        for (const selector of selectors) {
            const el = root.querySelector(selector);
            const value = textOf(el);
            if (value) return value;
        }
        return "";
    }

    function uniqueNonEmpty(values) {
        const seen = new Set();
        const result = [];
        values.forEach(function (value) {
            const cleaned = cleanText(value);
            if (!cleaned || seen.has(cleaned)) return;
            seen.add(cleaned);
            result.push(cleaned);
        });
        return result;
    }

    function resolveAddress(root) {
        if (!root) return "";

        const parts = [
            firstText(root, [".patronaddress1"]),
            firstText(root, [".patronaddress2"]),
            firstText(root, [".patronaddress3"]),
            firstText(root, [".patroncity"])
        ];

        const found = uniqueNonEmpty(parts);
        if (found.length) return found.join(", ");

        /* Repli borné pour les variantes de display-address-style.inc. */
        const addressBlock = root.querySelector(".address") || root.querySelector("ul.patronbriefinfo");
        if (!addressBlock) return "";

        const addressLines = Array.from(addressBlock.querySelectorAll(
            ".patronaddress1, .patronaddress2, .patronaddress3, .patroncity"
        )).map(textOf);

        return uniqueNonEmpty(addressLines).join(", ");
    }

    function resolvePhone(root) {
        return firstText(root, [
            ".patronphone a[href^='tel:']",
            ".patronphone",
            "a[href^='tel:']"
        ]);
    }

    function resolveEmail(root) {
        return firstText(root, [
            "li.email a[href^='mailto:']",
            ".email a[href^='mailto:']",
            "a[href^='mailto:']"
        ]);
    }

    function resolveDateOfBirth(root) {
        if (!root) return "";
        const item = root.querySelector(".patrondateofbirth");
        if (!item) return "";

        const copy = item.cloneNode(true);
        const firstDirectSpan = Array.from(copy.children).find(function (child) {
            return child.tagName === "SPAN";
        });
        if (firstDirectSpan) firstDirectSpan.remove();
        return textOf(copy);
    }

    const FIELD_RESOLVERS = {
        address: resolveAddress,
        phone: resolvePhone,
        email: resolveEmail,
        dateofbirth: resolveDateOfBirth
    };

    function getConfiguredValue(check, root, config) {
        if (!check) return '';
        const element = check.selector ? safeQuery(check.selector) : null;
        const value = check.selector ? cleanText(element && ('value' in element ? element.value : element.textContent))
            : FIELD_RESOLVERS[check.id] ? FIELD_RESOLVERS[check.id](root) : '';
        if (value) return value;
        return detectLanguage() === "fr"
            ? (config.missingFr || "Non renseigné")
            : (config.missingEn || "Not provided");
    }

    function labelForCheck(check) {
        if (!check) return "";
        if (detectLanguage() === "fr") return check.labelFr || check.labelEn || check.id || "";
        return check.labelEn || check.labelFr || check.id || "";
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            #${UI_ID} {
                margin-top: .65rem;
                padding: .65rem .75rem;
                border: 1px solid #d7dce1;
                border-left: 3px solid #e0a800;
                border-radius: .25rem;
                background: var(--bs-body-bg, #fff);
                color: var(--bs-body-color, #212529);
                max-width: 100%;
            }
            #${UI_ID} .pmk-renewal-heading {
                display: flex;
                align-items: center;
                gap: .35rem;
                margin-bottom: .5rem;
                min-width: 0;
            }
            #${UI_ID} .pmk-renewal-title {
                font-weight: 600;
                flex: 1 1 auto;
                min-width: 0;
                overflow-wrap: anywhere;
            }
            #${UI_ID} .pmk-renewal-checks {
                display: grid;
                gap: .35rem;
            }
            #${UI_ID} .pmk-renewal-check {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr);
                gap: .45rem;
                align-items: start;
                margin: 0;
                cursor: pointer;
                padding: .2rem .1rem;
                max-width: 100%;
            }
            #${UI_ID} .pmk-renewal-check input {
                margin-top: .2rem;
                width: 1rem;
                height: 1rem;
                flex: 0 0 auto;
            }
            #${UI_ID} .pmk-renewal-value {
                overflow-wrap: anywhere;
                word-break: break-word;
            }
            #${UI_ID} .pmk-renewal-status {
                margin-top: .5rem;
                font-size: .9em;
                color: #6c757d;
            }
            #${UI_ID} .pmk-renewal-level { display:inline-block;margin-right:.35rem;padding:.05rem .35rem;border-radius:999px;font-size:.78em;font-weight:700; }
            #${UI_ID} [data-severity="blocking"] .pmk-renewal-level { background:#f8d7da;color:#842029; }
            #${UI_ID} [data-severity="warning"] .pmk-renewal-level { background:#fff3cd;color:#664d03; }
            #${UI_ID} [data-severity="information"] .pmk-renewal-level { background:#cff4fc;color:#055160; }
            #${UI_ID}.pmk-complete {
                border-left-color: #198754;
            }
            .pmk-patron-renew-link-locked {
                opacity: .55 !important;
                cursor: not-allowed !important;
            }
            @media (max-width: 576px) {
                #${UI_ID} {
                    padding: .55rem;
                }
                #${UI_ID} .pmk-renewal-check {
                    gap: .5rem;
                    padding: .3rem 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function setLinkLocked(link, locked) {
        if (!link || (locked && !isSupportedRenewLink(link))) return;
        if (!locked && !originalLinkAttributes.has(link) && !link.hasAttribute("data-pmk-renew-original-tabindex")) return;

        if (locked) {
            if (!originalLinkAttributes.has(link)) originalLinkAttributes.set(link,{aria:link.getAttribute('aria-disabled'),tab:link.getAttribute('tabindex')});
            if (!link.hasAttribute("data-pmk-renew-original-tabindex")) {
                const original = link.getAttribute("tabindex");
                link.setAttribute("data-pmk-renew-original-tabindex", original === null ? "__none__" : original);
            }
            link.classList.add("pmk-patron-renew-link-locked");
            link.setAttribute("aria-disabled", "true");
            link.setAttribute("tabindex", "-1");
        } else {
            link.classList.remove("pmk-patron-renew-link-locked");
            link.removeAttribute("aria-disabled");

            const original = link.getAttribute("data-pmk-renew-original-tabindex");
            if (original === "__none__") link.removeAttribute("tabindex");
            else if (original !== null) link.setAttribute("tabindex", original);
            link.removeAttribute("data-pmk-renew-original-tabindex");
            const saved=originalLinkAttributes.get(link);
            if(saved){for(const [attr,value] of [['aria-disabled',saved.aria],['tabindex',saved.tab]]){if(value===null)link.removeAttribute(attr);else link.setAttribute(attr,value);}originalLinkAttributes.delete(link);}
        }
    }

    function syncRenewLinks() {
        const discovered = findRenewLinks();
        currentLinks = discovered;
        discovered.forEach(function (link) {
            setLinkLocked(link, runtimeLocked);
        });
    }

    function focusFirstUnchecked() {
        const first = document.querySelector("#" + UI_ID + " .pmk-renewal-check input:not(:checked)");
        if (first) {
            first.focus({ preventScroll: true });
            first.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    function installActionGuard() {
        if (guardInstalled) return;
        guardInstalled = true;

        const guard = function (event) {
            if (!runtimeLocked) return;
            const target = event.type === 'submit' ? (event.submitter || Array.from(event.target.elements || []).find(isSupportedRenewLink))
                : event.target && event.target.closest ? event.target.closest('a,button,input') : null;
            if (!target || !isSupportedRenewLink(target)) return;

            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
            syncRenewLinks();
            focusFirstUnchecked();
        };

        document.addEventListener("click", guard, true);
        document.addEventListener("auxclick", guard, true);
        document.addEventListener("submit", guard, true);
    }

    function setLockedState(locked) {
        runtimeLocked = Boolean(locked);
        syncRenewLinks();

        const container = document.getElementById(UI_ID);
        if (!container) return;

        container.classList.toggle("pmk-complete", !runtimeLocked);
        const status = container.querySelector(".pmk-renewal-status");
        if (status) {
            status.textContent = runtimeLocked
                ? localText(
                    "Le renouvellement sera disponible après validation de toutes les informations.",
                    "Renewal will be available after all information has been confirmed."
                )
                : localText(
                    "Vérification terminée : le renouvellement Koha est disponible.",
                    "Verification complete: Koha renewal is available."
                );
        }
    }

    function removeRuntimeUi() {
        const container = document.getElementById(UI_ID);
        if (container) container.remove();
        runtimeLocked = false;
        currentWarning = null;
        currentLinks.forEach(function (link) { setLinkLocked(link, false); });
        findRenewLinks().forEach(function (link) { setLinkLocked(link, false); });
        currentLinks = [];
    }

    function mountContextAccess(heading) {
        if (!heading || !window.PMKConfig || typeof window.PMKConfig.mountContextButton !== "function") return;

        window.PMKConfig.mountContextButton({
            moduleId: MODULE_ID,
            anchor: heading,
            position: "append",
            contextKey: currentPageId || "renewal",
            context: {
                pageId: currentPageId,
                sectionId: "pages"
            }
        });
    }

    function buildUi(config, warning, patronRoot, checks) {
        injectStyles();

        const container = document.createElement("div");
        container.id = UI_ID;
        container.setAttribute("role", "region");
        container.setAttribute(
            "aria-label",
            localText("Vérification avant renouvellement", "Verification before renewal")
        );

        const heading = document.createElement("div");
        heading.className = "pmk-renewal-heading";

        const title = document.createElement("div");
        title.className = "pmk-renewal-title";
        title.textContent = detectLanguage() === "fr"
            ? (config.introFr || DEFAULT_CONFIG.introFr)
            : (config.introEn || DEFAULT_CONFIG.introEn);
        heading.appendChild(title);
        container.appendChild(heading);

        const list = document.createElement("div");
        list.className = "pmk-renewal-checks";

        checks.forEach(function (check, index) {
            const label = document.createElement("label");
            label.className = "pmk-renewal-check";
            label.dataset.severity = check.severity || "blocking";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "pmk-renewal-checkbox";
            checkbox.id = "pmk-renewal-check-" + index + "-" + check.id;
            checkbox.setAttribute("data-pmk-check-id", check.id);
            checkbox.setAttribute("data-severity", check.severity || "blocking");
            if (check.severity === "information") { checkbox.checked = true; checkbox.disabled = true; }

            const value = document.createElement("span");
            value.className = "pmk-renewal-value";

            const strong = document.createElement("strong");
            const level = document.createElement("span");
            level.className = "pmk-renewal-level";
            level.textContent = check.severity === "information" ? localText("Information", "Information") : check.severity === "warning" ? localText("Avertissement", "Warning") : localText("Bloquant", "Blocking");
            value.appendChild(level);
            strong.textContent = labelForCheck(check) + " : ";
            value.appendChild(strong);
            value.appendChild(document.createTextNode(getConfiguredValue(check, patronRoot, config)));

            label.appendChild(checkbox);
            label.appendChild(value);
            list.appendChild(label);
        });

        container.appendChild(list);

        const status = document.createElement("div");
        status.className = "pmk-renewal-status";
        status.setAttribute("aria-live", "polite");
        container.appendChild(status);

        const update = function () {
            const boxes = Array.from(container.querySelectorAll(".pmk-renewal-checkbox"));
            const blocking = boxes.filter(function (box) { return box.dataset.severity === "blocking"; });
            const warnings = boxes.filter(function (box) { return box.dataset.severity === "warning" && !box.checked; });
            const remaining = blocking.filter(function (box) { return !box.checked; });
            setLockedState(remaining.length > 0);
            const status = container.querySelector(".pmk-renewal-status");
            if (status) status.textContent += " " + localText("Synthèse : ", "Summary: ") + remaining.length + localText(" contrôle(s) bloquant(s), ", " blocking check(s), ") + warnings.length + localText(" avertissement(s) non confirmé(s).", " unconfirmed warning(s).");
        };

        list.addEventListener("change", function (event) {
            if (event.target && event.target.classList.contains("pmk-renewal-checkbox")) update();
        });

        const destination = targetSelector('destination') ? safeQuery(targetSelector('destination')) : warning.element;
        if (!destination) return;
        destination.appendChild(container);
        mountContextAccess(heading);
        update();
    }

    function applyConfig(config) {
        removeRuntimeUi();
        currentConfig = normalizeConfig(config || DEFAULT_CONFIG);
        config = currentConfig;

        const pageDef = getCurrentPageDefinition();
        if (!pageDef || !config || config.enabled === false) return;

        currentPageId = pageDef.id;
        const pageConfig = getPageConfig(config, pageDef.id);
        if (!pageConfig || pageConfig.enabled === false || pageConfig.path !== pageDef.path) return;

        const warning = detectWarningState();
        if (!warning || !warningEnabled(config, warning)) return;

        const renewLinks = findRenewLinks();
        if (!renewLinks.length) return;

        const patronRoot = getPatronInfoRoot();
        if (!patronRoot) return;

        const checks = Array.isArray(config.checks)
            ? config.checks.filter(function (check) {
                return check && check.enabled !== false && (FIELD_RESOLVERS[check.id] || check.selector);
            })
            : [];
        if (!checks.length) return;

        currentWarning = warning;
        currentLinks = renewLinks;
        installActionGuard();
        buildUi(config, warning, patronRoot, checks);
    }

    function waitForRequiredStructure(timeoutMs) {
        return new Promise(function (resolve) {
            const inspect = function () {
                const warning = detectWarningState();
                const patron = getPatronInfoRoot();
                return warning && patron ? { warning: warning, patron: patron } : null;
            };

            const existing = inspect();
            if (existing) {
                resolve(existing);
                return;
            }

            const root = document.body || document.documentElement;
            if (!root) {
                resolve(null);
                return;
            }

            let finished = false;
            const observer = new MutationObserver(function () {
                const found = inspect();
                if (!found || finished) return;
                finished = true;
                observer.disconnect();
                resolve(found);
            });

            observer.observe(root, { childList: true, subtree: true });
            window.setTimeout(function () {
                if (finished) return;
                finished = true;
                observer.disconnect();
                resolve(inspect());
            }, timeoutMs || 3000);
        });
    }

    function validateConfig(config) {
        if (!config || !Array.isArray(config.pages) || !Array.isArray(config.checks)) {
            return { ok: false, message: "Configuration incomplète." };
        }

        if (config.enabled !== false && config.expired === false && config.expiringSoon === false) {
            return { ok: false, message: "Active au moins un état : adhésion expirée ou expiration prochaine." };
        }

        const selectors = Object.values(config.targets || {}).concat(config.checks.map(c => c && c.selector));
        for (const selector of selectors.filter(Boolean)) { try { document.createDocumentFragment().querySelector(selector); } catch (_) { return {ok:false,message:'Sélecteur invalide : '+selector}; } }

        const pageIds = new Set();
        for (const page of config.pages) {
            if (!page || !page.id || !/^\/cgi-bin\/koha\/[^?#]+$/.test(page.path || "")) {
                return { ok: false, message: "Une page configurée n'est pas reconnue par le module." };
            }
            if (pageIds.has(page.id)) {
                return { ok: false, message: "Une même page ne peut être configurée qu'une seule fois." };
            }
            pageIds.add(page.id);


        }

        const knownChecks = new Set(CHECK_OPTIONS.map(function (option) { return option.value; }));
        const checkIds = new Set();
        let activeCount = 0;

        for (const check of config.checks) {
            if (!check || !check.id || (!knownChecks.has(check.id) && !check.selector)) {
                return { ok: false, message: "Une information à vérifier n'est pas reconnue par le module." };
            }
            if (checkIds.has(check.id)) {
                return { ok: false, message: "Une information ne peut apparaître qu'une seule fois dans la checklist." };
            }
            checkIds.add(check.id);

            if (check.enabled !== false) {
                activeCount += 1;
                if (!String(check.labelFr || check.labelEn || "").trim()) {
                    return { ok: false, message: "Chaque vérification active doit avoir un libellé." };
                }
            }
        }

        if (config.enabled !== false && activeCount === 0) {
            return { ok: false, message: "Le module actif doit contenir au moins une information à vérifier." };
        }

        return { ok: true };
    }

    function nextUnusedPage(rootObject) {
        const used = new Set((rootObject.pages || []).map(function (page) { return page && page.id; }));
        return PAGES.find(function (page) { return !used.has(page.id); }) || PAGES[0];
    }

    function nextUnusedCheck(rootObject) {
        const used = new Set((rootObject.checks || []).map(function (check) { return check && check.id; }));
        return CHECK_OPTIONS.find(function (option) { return !used.has(option.value); }) || CHECK_OPTIONS[0];
    }

    function moduleDefinition() {
        return {id:MODULE_ID,schemaVersion:2,compactActivation:true,hidePageCount:true,
            name:{fr:'Vérification avant renouvellement lecteur',en:'Patron renewal verification'},
            description:{fr:'Avant de renouveler une adhésion expirée ou proche de son échéance, demande à l’agent de confirmer les coordonnées du lecteur. Choisissez les informations à vérifier ; les actions natives de Koha restent utilisées.',en:'Before renewing an expired or expiring membership, ask staff to confirm the patron information. Select the checks; renewal still uses native Koha actions.'},
            category:{fr:'Adhérents',en:'Patrons'},supportedPages:['*'],defaults:clone(DEFAULT_CONFIG),normalize:normalizeConfig,validate:validateConfig,
            schema:[
                {
                    type: "section",
                    id: "general",
                    label: { fr: "Paramètres généraux", en: "General settings" },
                    fields: [
                        {
                            key: "enabled",
                            type: "boolean",
                            label: { fr: "Module actif", en: "Module enabled" }
                        },
                        {
                            key: "expired",
                            type: "boolean",
                            label: { fr: "Contrôler les adhésions expirées", en: "Check expired memberships" }
                        },
                        {
                            key: "expiringSoon",
                            type: "boolean",
                            label: { fr: "Contrôler les adhésions arrivant à expiration", en: "Check memberships expiring soon" }
                        },
                        {
                            key: "introFr",
                            type: "text",
                            label: { fr: "Texte introductif — français", en: "Introductory text — French" }
                        },
                        {
                            key: "introEn",
                            type: "text",
                            label: { fr: "Texte introductif — anglais", en: "Introductory text — English" }
                        },
                        {
                            key: "missingFr",
                            type: "text",
                            label: { fr: "Valeur absente — français", en: "Missing value — French" }
                        },
                        {
                            key: "missingEn",
                            type: "text",
                            label: { fr: "Valeur absente — anglais", en: "Missing value — English" }
                        }
                    ]
                },

                {type:'section',id:'pages',label:{fr:'Pages concernées',en:'Target pages'},fields:[
                    {key:'pages',type:'repeater',addLabel:{fr:'Ajouter une page',en:'Add page'},reorder:true,
                        newItem:()=>({id:'page-'+Date.now().toString(36),enabled:true,path:location.pathname,labelFr:'Page Koha',labelEn:'Koha page'}),
                        itemTitle:p=>p.labelFr || p.path,
                        fields:[{key:'enabled',type:'boolean',label:{fr:'Page active',en:'Enabled page'}},
                            {key:'path',type:'text',label:{fr:'Chemin de la page Koha',en:'Koha page path'}},
                            {key:'labelFr',type:'text',label:{fr:'Nom français',en:'French name'}},{key:'labelEn',type:'text',label:{fr:'Nom anglais',en:'English name'}}]}
                ]},
                {type:'section',id:'checks',label:{fr:'Informations à vérifier',en:'Information to verify'},
                    description:{fr:'Toutes les informations actives doivent être confirmées. Pour une information ajoutée, choisissez sa valeur sur la fiche lecteur. Les champs préconfigurés utilisent la lecture native de Koha tant qu’aucune cible n’est choisie.',en:'All active checks must be confirmed. For extra information, pick its value on the patron page. Built-in checks use native Koha fields unless a target is chosen.'},fields:[
                    {key:'checks',type:'repeater',reorder:true,addLabel:{fr:'Ajouter une information',en:'Add information'},
                        newItem:root=>{const used=new Set(root.checks.map(c=>c.id));const option=CHECK_OPTIONS.find(c=>!used.has(c.value));return option ? {id:option.value,enabled:true,severity:'blocking',labelFr:option.label.fr,labelEn:option.label.en} : {id:'custom-'+Date.now().toString(36),enabled:true,severity:'blocking',labelFr:'Information à vérifier',labelEn:'Information to verify',selector:''};},
                        itemTitle:(c,i,lang)=>c[lang==='en'?'labelEn':'labelFr'] || c.id,
                        fields:[{key:'enabled',type:'boolean',label:{fr:'Vérification active',en:'Enabled check'}},
                            {key:'severity',type:'select',label:{fr:'Effet sur le renouvellement',en:'Renewal effect'},options:[{value:'information',label:{fr:'Information — lecture seule',en:'Information — read only'}},{value:'warning',label:{fr:'Avertissement — confirmation conseillée',en:'Warning — confirmation recommended'}},{value:'blocking',label:{fr:'Blocage — confirmation obligatoire',en:'Blocking — confirmation required'}}]},
                            {key:'labelFr',type:'text',label:{fr:'Libellé français',en:'French label'}},{key:'labelEn',type:'text',label:{fr:'Libellé anglais',en:'English label'}},
                            {key:'selector',type:'elementPicker',allowManual:true,manualAlways:true,label:{fr:'Valeur à lire sur la fiche',en:'Value to read on the page'},pick:pickRenewalTarget},
                            {key:'id',type:'readonly',advanced:true,label:{fr:'Identifiant conservé',en:'Preserved identifier'}}]}
                ]},
                {type:'section',id:'targets',label:{fr:'Adapter les éléments Koha',en:'Adapt Koha elements'},
                    description:{fr:'En cas de gabarit personnalisé, sélectionnez les avertissements, la zone d’informations et l’action de renouvellement. Une cible vide conserve la détection native. Choisissez une page concernée dans la liste avant de lancer le sélecteur.',en:'For custom templates, pick warnings, patron information and the renewal action. Empty targets keep native detection.'},
                    fields:[['expired','Avertissement d’adhésion expirée'],['expiringSoon','Avertissement d’expiration prochaine'],['patronRoot','Bloc des informations lecteur'],['renewAction','Action native de renouvellement'],['destination','Bloc où afficher les vérifications']].map(([key,label])=>({key:'targets.'+key,type:'elementPicker',allowManual:true,manualAlways:true,label,pick:pickRenewalTarget}))}
            ]};
    }

    async function startWithCore() {
        if (!window.PMKConfig) return;

        if (!coreRegistered) {
            window.PMKConfig.registerModule(moduleDefinition());
            coreRegistered = true;
        }

        currentConfig = normalizeConfig(await window.PMKConfig.getConfig(MODULE_ID));
        const pageDef = getCurrentPageDefinition();
        if (pageDef && currentConfig.enabled !== false) await waitForRequiredStructure(4000);
        applyConfig(currentConfig);

        window.PMKConfig.subscribe(MODULE_ID, function (newConfig) {
            currentConfig = normalizeConfig(newConfig);
            applyConfig(currentConfig);
        });
    }

    async function startWithoutCore() {
        if (fallbackStarted) return;
        fallbackStarted = true;

        const pageDef = getCurrentPageDefinition();
        if (!pageDef) return;

        const structure = await waitForRequiredStructure(4000);
        if (!structure) return;

        currentConfig = clone(DEFAULT_CONFIG);
        applyConfig(currentConfig);
    }

    function onDomReady(callback) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback, { once: true });
        } else {
            callback();
        }
    }

    onDomReady(function () {
        if (window.PMKConfig) {
            startWithCore();
        } else {
            startWithoutCore();
            window.addEventListener("pmk:config-ready", function () {
                startWithCore();
            }, { once: true });
        }
    });
})();
