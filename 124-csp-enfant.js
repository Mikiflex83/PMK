/* ============================================================
   124-csp-enfant.js
   PimpMyKoha — Valeurs par défaut selon la catégorie d'adhérent
   Version : 3.0.0-preplugin
   Date : 2026-09-21

   Historique Dracénie conservé : catégorie C -> sort1 = 12
   uniquement si sort1 est vide.

   Extension PMK :
   - plusieurs règles ;
   - catégories d'adhérents proposées depuis l'API Koha ;
   - choix sort1 / sort2 ;
   - catégories et valeurs autorisées proposées dynamiquement ;
   - saisie manuelle de repli si l'API n'est pas accessible.
   ============================================================ */
(function (window, document) {
    "use strict";

    if (!window || !document) return;
    if (window.__PMK124PatronCategoryDefaults) return;
    window.__PMK124PatronCategoryDefaults = true;

    const MODULE_ID = "patron-category-defaults";
    const MODULE_VERSION = "3.0.0-preplugin";
    const PAGE_PATH = "/cgi-bin/koha/members/memberentry.pl";
    const PAGE_ID = "members.memberentry";

    const DEFAULT_RULES = [
        {
            id: "legacy-child-csp",
            enabled: true,
            label: "Enfant — CSP 12",
            patronCategory: "C",
            targetField: "sort1",
            authorisedValueCategory: "",
            authorisedValue: "",
            manualValue: "12",
            onlyIfEmpty: true
        }
    ];

    const DEFAULT_CONFIG = Object.freeze({
        enabled: true,
        rules: clone(DEFAULT_RULES)
    });

    const catalogs = {
        patronCategories: [{ value: "C", label: { fr: "C — Enfant (historique)", en: "C — Child (legacy)" } }],
        authorisedCategories: [],
        authorisedValues: new Map(),
        loading: null
    };

    let currentConfig = clone(DEFAULT_CONFIG);
    let unsubscribe = null;
    let formObserver = null;
    const automaticValues = new WeakMap();

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function clean(value) { return String(value == null ? "" : value).trim(); }
    function language() {
        if (window.PMKConfig && typeof window.PMKConfig.getLanguage === "function") return window.PMKConfig.getLanguage();
        return String(document.documentElement.lang || navigator.language || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
    }

    function makeId() {
        return "patron-default-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    }

    function normalizeRule(raw, index) {
        const source = raw && typeof raw === "object" ? raw : {};
        return {
            id: clean(source.id) || ("patron-default-" + (index + 1)),
            enabled: source.enabled !== false,
            label: clean(source.label) || ("Règle " + (index + 1)),
            patronCategory: clean(source.patronCategory),
            targetField: source.targetField === "sort2" ? "sort2" : "sort1",
            authorisedValueCategory: clean(source.authorisedValueCategory),
            authorisedValue: clean(source.authorisedValue),
            manualValue: clean(source.manualValue),
            onlyIfEmpty: source.onlyIfEmpty !== false
        };
    }

    function normalizeConfig(raw) {
        const source = raw && typeof raw === "object" ? raw : {};
        const rules = Array.isArray(source.rules) ? source.rules.map(normalizeRule) : clone(DEFAULT_RULES).map(normalizeRule);
        return { enabled: source.enabled !== false, rules: rules };
    }

    async function fetchJson(url, headers) {
        const response = await fetch(url, {
            credentials: "same-origin",
            headers: Object.assign({ "Accept": "application/json" }, headers || {})
        });
        if (!response.ok) {
            const error = new Error("Koha API " + response.status + " — " + url);
            error.status = response.status;
            throw error;
        }
        return response.json();
    }

    async function prefetchCatalogs() {
        if (catalogs.loading) return catalogs.loading;
        catalogs.loading = Promise.allSettled([
            fetchJson("/api/v1/patron_categories?_per_page=500&_order_by=name"),
            fetchJson("/api/v1/authorised_value_categories?_per_page=500&_order_by=category_name", {
                "x-koha-embed": "authorised_values"
            })
        ]).then(function (results) {
            const patronResult = results[0];
            if (patronResult.status === "fulfilled" && Array.isArray(patronResult.value)) {
                const seen = new Set();
                catalogs.patronCategories = patronResult.value.map(function (row) {
                    const value = clean(row && (row.patron_category_id || row.categorycode));
                    const name = clean(row && (row.name || row.description));
                    if (!value || seen.has(value)) return null;
                    seen.add(value);
                    const display = name ? value + " — " + name : value;
                    return { value: value, label: { fr: display, en: display } };
                }).filter(Boolean);
                if (!seen.has("C")) catalogs.patronCategories.unshift({ value: "C", label: { fr: "C — valeur historique", en: "C — legacy value" } });
            }

            const avResult = results[1];
            if (avResult.status === "fulfilled" && Array.isArray(avResult.value)) {
                catalogs.authorisedCategories = [];
                catalogs.authorisedValues.clear();
                avResult.value.forEach(function (row) {
                    const name = clean(row && row.category_name);
                    if (!name) return;
                    catalogs.authorisedCategories.push({ value: name, label: { fr: name, en: name } });
                    const values = Array.isArray(row.authorised_values) ? row.authorised_values : [];
                    catalogs.authorisedValues.set(name, values.map(function (entry) {
                        const value = clean(entry && entry.value);
                        const description = clean(entry && (entry.description || entry.opac_description));
                        return {
                            value: value,
                            label: { fr: description ? value + " — " + description : value, en: description ? value + " — " + description : value }
                        };
                    }).filter(function (entry) { return entry.value; }));
                });
                catalogs.authorisedCategories.sort(function (a, b) { return a.value.localeCompare(b.value, language()); });
            }
            return catalogs;
        }).finally(function () { catalogs.loading = null; });
        return catalogs.loading;
    }

    function ruleFromPath(root, path) {
        if (!root || !Array.isArray(root.rules) || !Array.isArray(path)) return null;
        const pos = path.indexOf("rules");
        if (pos < 0) return null;
        const index = Number(path[pos + 1]);
        return Number.isInteger(index) ? root.rules[index] : null;
    }

    function optionWithCurrent(list, current, emptyLabel) {
        const result = [{ value: "", label: emptyLabel }].concat(list || []);
        if (current && !result.some(function (entry) { return String(entry.value) === String(current); })) {
            result.push({ value: current, label: { fr: current + " — valeur actuelle", en: current + " — current value" } });
        }
        return result;
    }

    function patronCategoryOptions(root, path) {
        const rule = ruleFromPath(root, path);
        return optionWithCurrent(catalogs.patronCategories, rule && rule.patronCategory, { fr: "— Choisir une catégorie —", en: "— Choose a category —" });
    }

    function authorisedCategoryOptions(root, path) {
        const rule = ruleFromPath(root, path);
        return optionWithCurrent(catalogs.authorisedCategories, rule && rule.authorisedValueCategory, { fr: "— Aucune / valeur manuelle —", en: "— None / manual value —" });
    }

    function authorisedValueOptions(root, path) {
        const rule = ruleFromPath(root, path);
        const category = clean(rule && rule.authorisedValueCategory);
        const values = category ? (catalogs.authorisedValues.get(category) || []) : [];
        return optionWithCurrent(values, rule && rule.authorisedValue, { fr: "— Choisir une valeur —", en: "— Choose a value —" });
    }

    function chosenValue(rule) {
        if (clean(rule.authorisedValueCategory)) return clean(rule.authorisedValue);
        return clean(rule.manualValue);
    }

    function dispatchChange(element) {
        element.dispatchEvent(new Event("change", { bubbles: true }));
        if (window.jQuery) {
            try { window.jQuery(element).trigger("change.select2"); } catch (_) {}
        }
    }

    function isEmptyValue(value) {
        const cleaned = clean(value);
        return cleaned === "" || cleaned === "0";
    }

    function ruleDecision(rule, target, current) {
        const value = chosenValue(rule);
        if (!target) return {state:"missing", value};
        if (rule.onlyIfEmpty && !isEmptyValue(current)) return {state:"preserved", value};
        if (!value) return {state:"empty", value};
        if (target.tagName === "SELECT" && !Array.from(target.options).some(option => String(option.value) === value)) {
            return {state:"unavailable", value};
        }
        return {state:String(current) === value ? "unchanged" : "apply", value};
    }

    function inspectRules(config, category) {
        const cfg = normalizeConfig(config || currentConfig);
        const form = document.getElementById("entryform");
        const selected = category === undefined ? clean(form?.querySelector("#categorycode_entry, #categorycode")?.value) : clean(category);
        const simulated = new Map(), rows = [];
        cfg.rules.forEach(rule => {
            if (!rule.enabled || rule.patronCategory !== selected) return;
            const target = form?.querySelector("#" + CSS.escape(rule.targetField));
            const current = simulated.has(rule.targetField) ? simulated.get(rule.targetField) : String(target?.value || "");
            const decision = ruleDecision(rule, target, current);
            const origin = target && automaticValues.get(target);
            rows.push({rule:rule.label, field:rule.targetField, current, proposed:decision.value,
                state:cfg.enabled ? decision.state : "disabled",
                origin:origin && origin.value === String(target.value) ? "automatic" : isEmptyValue(target?.value) ? "empty" : "existing",
                previousRule:origin?.label || "", conflicts:[]});
            if (cfg.enabled && decision.state === "apply") simulated.set(rule.targetField, decision.value);
        });
        rows.forEach(row => { row.conflicts = rows.filter(other => other !== row && other.field === row.field && other.proposed && row.proposed && other.proposed !== row.proposed).map(other => other.rule); });
        return {category:selected, onForm:!!form, rows};
    }

    function renderPreview(context) {
        const box = document.createElement("div"), select = document.createElement("select"), button = document.createElement("button"), output = document.createElement("div");
        const label = document.createElement("label");label.textContent = "Catégorie à simuler : ";label.appendChild(select);
        const native = document.querySelector("#entryform #categorycode_entry, #entryform #categorycode");
        const categories = new Map(Array.from(native?.options || []).map(option => [option.value, option.textContent]));
        (context.rootObject.rules || []).forEach(rule => { if(rule.patronCategory && !categories.has(rule.patronCategory)) categories.set(rule.patronCategory,rule.patronCategory); });
        categories.forEach((text,value) => { const option = document.createElement("option");option.value=value;option.textContent=text;select.appendChild(option); });
        if(native)select.value=native.value;
        button.type="button";button.className="btn btn-default btn-sm";button.textContent="Prévisualiser sans remplir les champs";
        output.setAttribute("aria-live","polite");
        button.addEventListener("click", () => {
            output.replaceChildren();
            const plan=inspectRules(context.rootObject,select.value), intro=document.createElement("p");
            intro.textContent=plan.onForm ? "Simulation dans l’ordre des règles. Les champs de l’adhérent restent inchangés. Une règle autorisant le remplacement peut remplacer la valeur d’une règle précédente." : "Ouvrez une fiche de création ou modification d’adhérent pour vérifier les champs et les valeurs disponibles.";
            output.appendChild(intro);
            const states={missing:"Champ absent",preserved:"Valeur conservée : le champ n’est pas vide",empty:"Valeur proposée vide",unavailable:"Valeur absente de la liste Koha",unchanged:"Valeur déjà présente",apply:"Sera rempli ou remplacé",disabled:"Module désactivé"};
            const origins={automatic:"Valeur proposée par PMK",existing:"Valeur existante ou saisie",empty:"Champ vide"};
            const table=document.createElement("table");table.className="table table-sm";
            const header=table.createTHead().insertRow();["Règle / champ","Valeur actuelle","Valeur proposée","Résultat"].forEach(text=>{const th=document.createElement("th");th.scope="col";th.textContent=text;header.appendChild(th);});
            const body=table.createTBody();plan.rows.forEach(row=>{
                const tr=body.insertRow();[row.rule+" / "+row.field,row.current+" — "+origins[row.origin],row.proposed,states[row.state]+(row.conflicts.length?". Autres valeurs proposées par : "+row.conflicts.join(", "):"")].forEach(text=>{tr.insertCell().textContent=text;});
            });
            if(plan.rows.length)output.appendChild(table);else{const p=document.createElement("p");p.textContent="Aucune règle active pour cette catégorie.";output.appendChild(p);}
        });
        box.append(label,button,output);return box;
    }

    function applyRules() {
        if (window.location.pathname !== PAGE_PATH || currentConfig.enabled === false) return;
        const form = document.getElementById("entryform");
        const categorySelect = form?.querySelector("#categorycode_entry, #categorycode");
        if (!categorySelect) return;
        const category = clean(categorySelect.value);
        currentConfig.rules.forEach(rule => {
            if (!rule || !rule.enabled || rule.patronCategory !== category) return;
            const target = form.querySelector("#" + CSS.escape(rule.targetField));
            const decision = ruleDecision(rule,target,target?.value);
            if(decision.state !== "apply")return;
            target.value=decision.value;
            dispatchChange(target);
            automaticValues.set(target,{value:decision.value,label:rule.label});
        });
    }

    function bindRuntime() {
        if (window.location.pathname !== PAGE_PATH) return;
        const form = document.getElementById("entryform");
        if (!form) return;
        const category = form.querySelector("#categorycode_entry, #categorycode");
        if (category && !category.dataset.pmk124Bound) {
            category.dataset.pmk124Bound = "1";
            category.addEventListener("change", function () { window.setTimeout(applyRules, 0); });
        }
        if (!formObserver && typeof MutationObserver === "function") {
            formObserver = new MutationObserver(function () { window.requestAnimationFrame(applyRules); });
            formObserver.observe(form, { childList: true, subtree: true });
        }
        applyRules();
    }

    function newRule() {
        return {
            id: makeId(),
            enabled: true,
            label: "Nouvelle règle",
            patronCategory: "",
            targetField: "sort1",
            authorisedValueCategory: "",
            authorisedValue: "",
            manualValue: "",
            onlyIfEmpty: true
        };
    }

    function validate(config) {
        const cfg = normalizeConfig(config);
        const ids = new Set();
        for (const rule of cfg.rules) {
            if (ids.has(rule.id)) return { ok: false, message: "Chaque règle doit avoir un identifiant unique." };
            ids.add(rule.id);
            if (rule.enabled && !rule.patronCategory) return { ok: false, message: "Une règle active doit préciser une catégorie d’adhérent." };
            if (rule.enabled && !chosenValue(rule)) return { ok: false, message: "Une règle active doit préciser une valeur à appliquer." };
        }
        return { ok: true };
    }

    function definition() {
        return {
            id: MODULE_ID,
            schemaVersion: 2,
            name: { fr: "Valeurs par défaut selon la catégorie d’adhérent", en: "Defaults by patron category" },
            description: {
                fr: "Renseigne automatiquement une catégorie statistique lors de la création ou de la modification d’un adhérent, selon sa catégorie d’inscription. Choisissez la catégorie concernée, le champ à remplir et la valeur proposée. Par défaut, une valeur déjà saisie est conservée.",
                en: "Automatically fills a statistical category when creating or editing a patron, based on the membership category. Choose the category, target field and proposed value. Existing values are kept by default."
            },
            category: { fr: "Lecteurs / saisie", en: "Patrons / entry" },
            supportedPages: [PAGE_ID],
            prerequisites: [],
            dependencies: [],
            defaults: clone(DEFAULT_CONFIG),
            normalize: normalizeConfig,
            validate: validate,
            schema: [
                {type:"custom",render:renderPreview},
                {
                    type: "section",
                    id: "rules",
                    label: { fr: "Règles de préremplissage", en: "Prefill rules" },
                    description: {
                        fr: "Par défaut : catégorie C → sort1 = 12, uniquement si sort1 est vide. Les listes Koha sont préchargées depuis les API REST ; si les droits ne permettent pas leur lecture, les codes actuels restent utilisables.",
                        en: "Default: category C → sort1 = 12, only when sort1 is empty. Koha lists are preloaded from REST APIs; current codes remain usable if API permissions prevent loading them."
                    },
                    fields: [
                        { key: "enabled", type: "boolean", label: { fr: "Activer le module", en: "Enable module" } },
                        {
                            key: "rules",
                            type: "repeater",
                            label: { fr: "Règles", en: "Rules" },
                            addLabel: { fr: "Ajouter une règle", en: "Add rule" },
                            reorder: true,
                            newItem: newRule,
                            itemTitle: function (item, index) { return clean(item && item.label) || ("Règle " + (index + 1)); },
                            fields: [
                                { key: "enabled", type: "boolean", label: { fr: "Règle active", en: "Rule enabled" } },
                                { key: "label", type: "text", label: { fr: "Nom", en: "Name" } },
                                {
                                    key: "patronCategory",
                                    type: "select",
                                    label: { fr: "Catégorie d’adhérent", en: "Patron category" },
                                    options: patronCategoryOptions
                                },
                                {
                                    key: "targetField",
                                    type: "select",
                                    label: { fr: "Champ à préremplir", en: "Field to prefill" },
                                    options: [
                                        { value: "sort1", label: { fr: "sort1 — catégorie statistique 1", en: "sort1 — statistical category 1" } },
                                        { value: "sort2", label: { fr: "sort2 — catégorie statistique 2", en: "sort2 — statistical category 2" } }
                                    ]
                                },
                                {
                                    key: "authorisedValueCategory",
                                    type: "select",
                                    refreshOnChange: true,
                                    label: { fr: "Catégorie de valeurs autorisées Koha", en: "Koha authorised-value category" },
                                    options: authorisedCategoryOptions,
                                    help: { fr: "Facultatif. Si aucune catégorie n’est choisie, utilisez la valeur manuelle.", en: "Optional. If no category is selected, use the manual value." }
                                },
                                {
                                    key: "authorisedValue",
                                    type: "select",
                                    label: { fr: "Valeur autorisée", en: "Authorised value" },
                                    options: authorisedValueOptions,
                                    help: { fr: "Liste dépendante de la catégorie choisie ci-dessus.", en: "List depends on the category selected above." }
                                },
                                {
                                    key: "manualValue",
                                    type: "text",
                                    label: { fr: "Valeur manuelle de repli", en: "Manual fallback value" },
                                    help: { fr: "Utilisée lorsqu’aucune catégorie de valeurs autorisées n’est sélectionnée. Valeur historique : 12.", en: "Used when no authorised-value category is selected. Historical value: 12." }
                                },
                                { key: "onlyIfEmpty", type: "boolean", label: { fr: "Ne remplir que si le champ est vide", en: "Only fill when the field is empty" } }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    function registerModule() {
        if (!window.PMKConfig || typeof window.PMKConfig.registerModule !== "function") return false;
        try { window.PMKConfig.registerModule(definition()); } catch (_) { return false; }
        if (!unsubscribe && typeof window.PMKConfig.subscribe === "function") {
            try { unsubscribe = window.PMKConfig.subscribe(MODULE_ID, function (cfg) { currentConfig = normalizeConfig(cfg); applyRules(); }); } catch (_) {}
        }
        return true;
    }

    async function start() {
        registerModule();
        // Les listes dynamiques ne servent qu'à la configuration PMK, réservée
        // au super-administrateur. On évite ainsi des appels API inutiles (et
        // d'éventuels 403) sur les postes des agents ordinaires.
        const mayConfigure = !window.PMKConfig || typeof window.PMKConfig.isKohaSuperlibrarian !== "function"
            ? false
            : window.PMKConfig.isKohaSuperlibrarian();
        if (mayConfigure) {
            prefetchCatalogs().catch(function (error) { console.info("[PMK124] Listes Koha non préchargées", error); });
        }
        if (window.PMKConfig && typeof window.PMKConfig.getConfig === "function") {
            try { currentConfig = normalizeConfig(await window.PMKConfig.getConfig(MODULE_ID)); } catch (_) {}
        }
        bindRuntime();
    }

    window.PMK124PatronCategoryDefaults = {
        moduleId: MODULE_ID,
        version: MODULE_VERSION,
        refreshCatalogs: function () { catalogs.loading = null; return prefetchCatalogs(); },
        refresh: applyRules,
        inspectRules: inspectRules
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
    if (!window.PMKConfig) window.addEventListener("pmk:config-ready", registerModule, { once: true });
})(window, document);
