/* ============================================================
   120-date-retrait-reservations.js
   PimpMyKoha — Date limite de retrait des réservations
   Version : 2.3.1-preplugin
   Date : 2026-10-29

   - Priorité à expiration_date renvoyée par Koha.
   - Identifie le site de retrait (pickup_library_id).
   - Lit le calendrier via un rapport SQL JSON compatible Koha 25.11.
   - Signale une échéance officielle sur un jour fermé et suggère
     le prochain jour d'ouverture, sans modifier Koha.
   - Si aucune date officielle n'existe, calcule une estimation
     en tenant compte du calendrier accessible.
   - Repli prudent en cas d'API indisponible.
   - Auto-enregistrement PMK, options FR/EN.
   ============================================================ */
(function (window, document) {
    "use strict";
    if (!window || !document) return;
    if (window.__PMK120HoldPickupExpiration) return;
    window.__PMK120HoldPickupExpiration = true;

    const MODULE_ID = "hold-pickup-expiration";
    const MODULE_VERSION = "2.3.1-preplugin";
    const PAGE_PATH = "/cgi-bin/koha/circ/returns.pl";
    const PAGE_ID = "circ.returns";
    const INFO_CLASS = "pmk120-hold-expiration-info";
    const MAX_SEARCH_DAYS = 90;
    const CALENDAR_REPORT_SQL = `SELECT
  'weekly' AS rule_type, branchcode, weekday,
  NULL AS day, NULL AS month, NULL AS year, 0 AS isexception
FROM repeatable_holidays
WHERE weekday IS NOT NULL
UNION ALL
SELECT
  'yearly' AS rule_type, branchcode, NULL AS weekday,
  day, month, NULL AS year, 0 AS isexception
FROM repeatable_holidays
WHERE weekday IS NULL
UNION ALL
SELECT
  'special' AS rule_type, branchcode, NULL AS weekday,
  day, month, year, isexception
FROM special_holidays
ORDER BY branchcode, rule_type, year, month, day, weekday`;

    const DEFAULT_CONFIG = Object.freeze({
        enabled: true,
        checkKohaCalendar: true,
        calendarReportId: 0,
        calendarSqlTemplate: CALENDAR_REPORT_SQL,
        suggestNextOpenDay: true,
        fallbackDays: 11,
        fallbackCountOpenDays: true,
        excludeSundays: true,
        fallbackFrenchHolidays: true,
        markFallbackAsEstimate: true,
        labelFr: "Mise de côté jusqu’au :",
        labelEn: "Hold available until:"
    });

    let currentConfig = clone(DEFAULT_CONFIG);
    let unsubscribe = null;
    let observer = null;
    const holdCache = new Map();
    const closureCache = new Map();
    let processedForms = new WeakMap();

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function language() {
        if (window.PMKConfig && typeof window.PMKConfig.getLanguage === "function") {
            return window.PMKConfig.getLanguage();
        }
        return String(document.documentElement.lang || navigator.language || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
    }
    function tr(fr, en) { return language() === "en" ? en : fr; }
    function normalizeConfig(raw) {
        const s = raw && typeof raw === "object" ? raw : {};
        const n = Number(s.fallbackDays);
        return {
            enabled: s.enabled !== false,
            checkKohaCalendar: s.checkKohaCalendar !== false,
            calendarReportId: Math.max(0, Math.floor(Number(s.calendarReportId) || 0)),
            calendarSqlTemplate: CALENDAR_REPORT_SQL,
            suggestNextOpenDay: s.suggestNextOpenDay !== false,
            fallbackDays: Number.isFinite(n) ? Math.max(0, Math.min(60, Math.floor(n))) : 11,
            fallbackCountOpenDays: true, // Même politique de fermeture dans tous les modes
            excludeSundays: s.excludeSundays !== false,
            fallbackFrenchHolidays: s.fallbackFrenchHolidays !== false,
            markFallbackAsEstimate: s.markFallbackAsEstimate !== false,
            labelFr: String(s.labelFr || DEFAULT_CONFIG.labelFr),
            labelEn: String(s.labelEn || DEFAULT_CONFIG.labelEn)
        };
    }
    function parseKohaDate(value) {
        const raw = String(value || "").trim();
        if (!raw) return null;
        const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
            const y = Number(m[1]), month = Number(m[2]) - 1, day = Number(m[3]);
            const d = new Date(y, month, day, 12, 0, 0, 0);
            return d.getFullYear() === y && d.getMonth() === month && d.getDate() === day ? d : null;
        }
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return null;
        d.setHours(12, 0, 0, 0);
        return d;
    }
    function dateISO(d) {
        return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
    }
    function formatDate(d) {
        return new Intl.DateTimeFormat(language() === "en" ? "en-GB" : "fr-FR", {
            day: "2-digit", month: "2-digit", year: "numeric"
        }).format(d);
    }
    function addDays(date, n) {
        const d = new Date(date.getTime());
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() + n);
        return d;
    }
    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
            return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c];
        });
    }
    async function getJson(url) {
        const response = await fetch(url.toString(), {
            method: "GET", credentials: "same-origin", headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error("Koha HTTP " + response.status);
        return response.json();
    }
    async function fetchHold(holdId) {
        const id = String(holdId || "").trim();
        if (!/^\d+$/.test(id)) throw new Error("hold_id invalide");
        if (holdCache.has(id)) return holdCache.get(id);
        const promise = (async function () {
            const url = new URL("/api/v1/holds", window.location.origin);
            url.searchParams.set("hold_id", id);
            url.searchParams.set("_per_page", "1");
            const data = await getJson(url);
            if (!Array.isArray(data)) throw new Error("Réponse de réservation inattendue");
            const match = data.find(h => String(h.hold_id) === id);
            if (!match) throw new Error("Réservation introuvable : " + id);
            return match;
        })().catch(function (error) { holdCache.delete(id); throw error; });
        holdCache.set(id, promise);
        return promise;
    }
    // Source : /cgi-bin/koha/svc/report?id=...&annotated=1 (rapport non public).
    // Préserve weekly, yearly, single, et exceptions de réouverture.
    let calendarReportCache = null;
    async function fetchCalendarRules() {
        const id = currentConfig.calendarReportId;
        if (!id) throw new Error("ID rapport calendrier non configuré dans PMK");
        if (calendarReportCache && calendarReportCache.id === id) return calendarReportCache.promise;
        const promise = (async () => {
            const url = new URL("/cgi-bin/koha/svc/report", window.location.origin);
            url.searchParams.set("id", String(id));
            url.searchParams.set("annotated", "1");
            const data = await getJson(url);
            if (!Array.isArray(data)) throw new Error("Rapport : réponse non tabulaire");
            // Le service JSON annoté renvoie un tableau d'objets.
            if (data.some(row => !row || typeof row !== "object" || Array.isArray(row))) {
                throw new Error("Rapport : format non annoté (attendu : objets)");
            }
            const rules = data.map(r => ({
                type: String(r.rule_type || "").toLowerCase(),
                branch: String(r.branchcode || "").trim().toUpperCase(),
                weekday: r.weekday == null ? null : Number(r.weekday),
                day: r.day == null ? null : Number(r.day),
                month: r.month == null ? null : Number(r.month),
                year: r.year == null ? null : Number(r.year),
                exception: Number(r.isexception || 0) === 1
            }));
            if (rules.some(r => !["weekly", "yearly", "special"].includes(r.type) || !r.branch)) {
                throw new Error("Le rapport ne correspond pas au modèle PMK 120");
            }
            return rules;
        })().catch(e => { calendarReportCache = null; throw e; });
        calendarReportCache = {id, promise};
        return promise;
    }
    async function fetchClosures(libraryId) {
        const branch = String(libraryId || "").trim().toUpperCase();
        if (!branch) throw new Error("Site de retrait inconnu");
        const key = branch + "|" + currentConfig.calendarReportId;
        if (closureCache.has(key)) return closureCache.get(key);
        const promise = fetchCalendarRules().then(all => ({
            branch,
            rules: all.filter(r => r.branch === branch)
        })).catch(e => { closureCache.delete(key); throw e; });
        closureCache.set(key, promise);
        return promise;
    }
    // Algorithme grégorien de Meeus/Jones/Butcher : dimanche de Pâques.
    function easterSunday(year) {
        const a = year % 19, b = Math.floor(year / 100), c = year % 100;
        const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4), k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const n = h + l - 7 * m + 114;
        return new Date(year, Math.floor(n / 31) - 1, n % 31 + 1, 12);
    }
    const holidayCache = new Map();
    function nationalFrenchHolidays(year) {
        if (holidayCache.has(year)) return holidayCache.get(year);
        const fixed = ['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'];
        const holidays = new Set(fixed.map(day => year + '-' + day));
        const easter = easterSunday(year);
        [1, 39, 50].forEach(offset => holidays.add(dateISO(addDays(easter, offset))));
        holidayCache.set(year, holidays);
        return holidays;
    }
    function isClosed(date, closures) {
        const iso = dateISO(date);
        if (closures) {
            const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate(), w = date.getDay();
            const matching = closures.rules.filter(r =>
                r.type === "special" && r.year === y && r.month === m && r.day === d
            );
            // Une exception annule un jour fermé récurrent. Une fermeture ponctuelle prime.
            if (matching.some(r => !r.exception)) return true;
            if (matching.some(r => r.exception)) return false;
            return closures.rules.some(r =>
                (r.type === "weekly" && r.weekday === w) ||
                (r.type === "yearly" && r.month === m && r.day === d)
            );
        }
        // Repli explicite uniquement lorsque la source Koha est inaccessible.
        if (currentConfig.fallbackFrenchHolidays && nationalFrenchHolidays(date.getFullYear()).has(iso)) return true;
        return currentConfig.excludeSundays && date.getDay() === 0;
    }
    function nextOpenDate(date, closures) {
        for (let i = 1; i <= MAX_SEARCH_DAYS; i++) {
            const candidate = addDays(date, i);
            if (!isClosed(candidate, closures)) return candidate;
        }
        return null;
    }
    // Politique unique : les jours fermés ne sont jamais comptés dans les 11 jours
    // de retrait. Sans calendrier accessible, le repli local exclut les dimanches.
    // Cette date reste indicative : seule Koha peut définir l'échéance officielle.
    function estimatedDeadline(baseDate, days, closures) {
        let date = addDays(baseDate, 0);
        let remaining = Math.max(0, Number(days) || 0);
        for (let i = 0; i < 180 && remaining > 0; i++) {
            date = addDays(date, 1);
            if (isClosed(date, closures)) continue;
            remaining--;
        }
        if (remaining > 0) return null;
        // Un délai de zéro jour peut tomber sur un jour fermé.
        if (isClosed(date, closures)) return nextOpenDate(date, closures);
        return date;
    }

    async function resolveExpiration(hold) {
        const official = parseKohaDate(hold.expiration_date || hold.waiting_expires_on || hold.expirationdate);
        const waiting = parseKohaDate(hold.waiting_date);
        const base = waiting || new Date();
        const library = String(hold.pickup_library_id || hold.branchcode || "").trim();
        let closures = null;
        if (currentConfig.checkKohaCalendar && library) {
            try { closures = await fetchClosures(library); }
            catch (error) { console.warn("[PMK120] Rapport calendrier Koha indisponible", error); }
        }
        const date = official || estimatedDeadline(base, currentConfig.fallbackDays, closures);
        if (!date) return null;
        // Un contrôle commun s'applique sans distinction au mode officiel/estimation.
        // Sans calendrier, on ne déclare jamais une date officiellement fermée.
        const closed = isClosed(date, closures);
        const suggested = closed && currentConfig.suggestNextOpenDay ? nextOpenDate(date, closures) : null;
        return {
            date, official: Boolean(official), estimated: !official,
            source: official ? "koha-expiration" : (waiting ? "waiting-date-fallback" : "today-fallback"),
            closed, suggested, calendarChecked: Boolean(closures)
        };
    }

    function modalBodyFor(form) {
        if (!form) return null;
        return form.querySelector(".modal-body, #hold-found-modal-body") ||
            (form.closest(".modal-content") && form.closest(".modal-content").querySelector(".modal-body")) ||
            form.closest(".modal-body") || form;
    }
    function removeExisting(body) {
        if (body) body.querySelectorAll("." + INFO_CLASS).forEach(function (node) { node.remove(); });
    }
    function injectLine(form, holdId, result) {
        const body = modalBodyFor(form);
        if (!body || !result || !result.date) return;
        // Évite d'insérer le résultat d'une ancienne requête dans une nouvelle modale.
        if (reserveIdFor(form) !== String(holdId)) return;
        removeExisting(body);
        const box = document.createElement("div");
        box.className = "alert " + (result.closed ? "alert-warning " : "alert-info ") + INFO_CLASS;
        box.dataset.holdId = String(holdId);
        box.dataset.source = result.source;
        box.style.margin = "10px 0";
        box.style.padding = "8px 12px";
        const label = language() === "en" ? currentConfig.labelEn : currentConfig.labelFr;
        const estimate = result.estimated && currentConfig.markFallbackAsEstimate ? tr(" (estimation)", " (estimate)") : "";
        let html = '<div><strong><i class="fa-regular fa-calendar" aria-hidden="true"></i> ' +
            escapeHtml(label) + '</strong> ' + escapeHtml(formatDate(result.date) + estimate) + '</div>';
        if (result.closed) {
            html += '<div style="margin-top:5px"><strong>' +
                escapeHtml(tr(result.calendarChecked ? "⚠ Jour de fermeture identifié (calendrier Koha ou jour férié)." : "⚠ Date tombant sur un jour de fermeture identifié (secours).", result.calendarChecked ? "⚠ Identified closure day (Koha calendar or national holiday)." : "⚠ Date falls on an identified closure day (fallback).")) + '</strong></div>';
            if (result.suggested) {
                html += '<div>' + escapeHtml(tr("Prochain jour ouvert possible : ", "Next possible open day: ") + formatDate(result.suggested)) + '</div>';
            }
            if (result.official) {
                html += '<div class="small">' + escapeHtml(tr(
                    "La date officielle reste celle enregistrée dans Koha ; proposition indicative, aucune modification de réservation.",
                    "The official date remains the one recorded in Koha; suggestion only, no hold modification."
                )) + '</div>';
            }
        }
        if (result.estimated && !result.calendarChecked) {
            html += '<div class="small">' + escapeHtml(tr(
                "Calendrier Koha non confirmé : estimation partielle (dimanches et jours fériés nationaux).",
                "Koha calendar not confirmed: partial estimate (Sundays and national holidays)."
            )) + '</div>';
        }
        if (result.estimated) {
            html += '<div class="small">' + escapeHtml(tr(
                "Date indicative calculée selon les jours d’ouverture disponibles ; à confirmer dans Koha.",
                "Indicative date based on available opening days; confirm in Koha."
            )) + '</div>';
        }
        box.innerHTML = html;
        const title = body.querySelector("h1, h2, h3, h4, .modal-title");
        if (title && title.parentNode) title.insertAdjacentElement("afterend", box);
        else body.prepend(box);
        if (window.PMKConfig && typeof window.PMKConfig.mountContextButton === "function") {
            try {
                window.PMKConfig.mountContextButton({
                    moduleId: MODULE_ID, anchor: box, position: "append", contextKey: "pmk120-hold-expiration"
                });
            } catch (_) {}
        }
    }
    function reserveIdFor(form) {
        const input = form && form.querySelector('input[name="reserve_id"], input[name="hold_id"], #reserve_id');
        return input ? String(input.value || "").trim() : "";
    }
    async function processForm(form) {
        if (!form || !currentConfig.enabled) return;
        const id = reserveIdFor(form);
        if (!id) return;
        if (processedForms.get(form) === id) return;
        processedForms.set(form, id);
        try {
            const hold = await fetchHold(id);
            const result = await resolveExpiration(hold);
            if (result && currentConfig.enabled && processedForms.get(form) === id) injectLine(form, id, result);
        } catch (error) {
            processedForms.delete(form);
            console.warn("[PMK120] Date de retrait indisponible", error);
        }
    }
    function candidateForms(root) {
        const scope = root && root.querySelectorAll ? root : document;
        const forms = Array.from(scope.querySelectorAll("#hold-found-modal-form, form.confirm, .modal form"));
        if (root && root.matches && root.matches("form")) forms.unshift(root);
        return Array.from(new Set(forms));
    }
    function scan(root) {
        if (window.location.pathname !== PAGE_PATH || !currentConfig.enabled) return;
        candidateForms(root).forEach(processForm);
    }
    function installObserver() {
        if (observer || typeof MutationObserver !== "function") return;
        observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node && node.nodeType === 1 && !node.classList.contains(INFO_CLASS)) scan(node);
                });
            });
        });
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
    function validate(config) {
        const n = Number(config && config.fallbackDays);
        if (config && config.fallbackDays !== undefined && (!Number.isFinite(n) || n < 0 || n > 60)) {
            return { ok: false, message: "Le nombre de jours de repli doit être compris entre 0 et 60." };
        }
        return { ok: true };
    }
    function definition() {
        return {
            id: MODULE_ID, schemaVersion: 1,
            name: { fr: "Date limite de retrait des réservations", en: "Hold pickup expiration date" },
            description: {
                fr: "Contrôle uniforme du calendrier pour les dates officielles et estimées. Calcule les estimations en jours ouverts, sans modifier les réservations Koha.",
                en: "Shows Koha's official expiration and checks pickup library closures. Suggests the next open day without altering Koha."
            },
            category: { fr: "Circulation / réservations", en: "Circulation / holds" },
            supportedPages: [PAGE_ID], prerequisites: [], dependencies: [],
            defaults: clone(DEFAULT_CONFIG), normalize: normalizeConfig, validate: validate,
            schema: [{
                type: "section", id: "settings", label: { fr: "Réglages", en: "Settings" },
                fields: [
                    { key: "enabled", type: "boolean", label: { fr: "Activer l’affichage", en: "Enable display" } },
                    { key: "checkKohaCalendar", type: "boolean", label: { fr: "Vérifier le calendrier Koha du site de retrait", en: "Check Koha pickup library calendar" } },
                    { key: "calendarReportId", type: "number", label: { fr: "ID du rapport SQL calendrier", en: "Calendar SQL report ID" }, help: { fr: "Rapport NON PUBLIC contenant les fermetures Koha ; recopier l’ID après création.", en: "NON-PUBLIC Koha closure report; paste the ID after creating it." } },
                    { key: "calendarSqlTemplate", type: "textarea", rows: 24, readOnly: true, label: { fr: "SQL du calendrier à copier dans Koha", en: "Calendar SQL to copy into Koha" }, help: { fr: "Créer un rapport guidé privé avec ce SQL, puis renseigner son identifiant ci-dessus.", en: "Create a private guided report with this SQL, then enter its ID above." } },
                    { key: "suggestNextOpenDay", type: "boolean", label: { fr: "Suggérer le prochain jour ouvert", en: "Suggest next open day" } },
                    { key: "fallbackDays", type: "number", label: { fr: "Délai de secours (jours)", en: "Fallback delay (days)" },
                      help: { fr: "Uniquement en l’absence de date officielle Koha. Décompte des jours ouverts selon le calendrier Koha, par défaut : 11.", en: "Only without an official Koha date. Counts open days using the Koha calendar; default: 11." } },
                    { key: "excludeSundays", type: "boolean", label: { fr: "Secours sans calendrier : exclure les dimanches", en: "Without calendar: exclude Sundays" } },
                    { key: "fallbackFrenchHolidays", type: "boolean", label: { fr: "Exclure les jours fériés nationaux français (y compris si API indisponible)", en: "Exclude French national holidays (including API fallback)" } },
                    { key: "markFallbackAsEstimate", type: "boolean", label: { fr: "Identifier les estimations", en: "Mark estimates" } },
                    { key: "labelFr", type: "text", label: { fr: "Libellé — français", en: "Label — French" } },
                    { key: "labelEn", type: "text", label: { fr: "Libellé — anglais", en: "Label — English" } }
                ]
            }]
        };
    }
    function registerModule() {
        if (!window.PMKConfig || typeof window.PMKConfig.registerModule !== "function") return false;
        try { window.PMKConfig.registerModule(definition()); } catch (_) { return false; }
        if (!unsubscribe && typeof window.PMKConfig.subscribe === "function") {
            try {
                unsubscribe = window.PMKConfig.subscribe(MODULE_ID, function (config) {
                    currentConfig = normalizeConfig(config);
                    closureCache.clear(); calendarReportCache = null;
                    processedFormsClear();
                    if (currentConfig.enabled) scan(document);
                    else document.querySelectorAll("." + INFO_CLASS).forEach(function (node) { node.remove(); });
                });
            } catch (_) {}
        }
        return true;
    }
    // WeakMap n'est pas itérable : on le remplace en changeant sa référence.
    function processedFormsClear() {
        processedForms = new WeakMap();
        document.querySelectorAll("." + INFO_CLASS).forEach(node => node.remove());
    }
    async function loadConfig() {
        registerModule();
        if (!window.PMKConfig || typeof window.PMKConfig.getConfig !== "function") return clone(DEFAULT_CONFIG);
        try { return normalizeConfig(await window.PMKConfig.getConfig(MODULE_ID)); }
        catch (_) { return clone(DEFAULT_CONFIG); }
    }
    async function start() {
        currentConfig = await loadConfig();
        if (window.location.pathname !== PAGE_PATH) return;
        installObserver();
        scan(document);
    }
    window.PMK120HoldPickupExpiration = {
        moduleId: MODULE_ID, version: MODULE_VERSION,
        refresh: function () {
            return loadConfig().then(function (cfg) {
                currentConfig = cfg;
                closureCache.clear(); calendarReportCache = null;
                processedFormsClear();
                scan(document);
            });
        },
        clearCache: function () { holdCache.clear(); closureCache.clear(); calendarReportCache = null; processedFormsClear(); scan(document); }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
    if (!window.PMKConfig) window.addEventListener("pmk:config-ready", function () { registerModule(); }, { once: true });
})(window, document);
