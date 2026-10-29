/* ============================================================
   PimpMyKoha 137 — Widgets & blocs d’accueil
   Généré le 22/09/2026
   Sous-widget autonome.
   IMPORTANT : conserver ce fichier séparé pour la maintenance.
   ============================================================ */
const WIDGET_ID = 'circulation-abonnements';
const STYLE_ID = 'pmk137-style-circulation-abonnements';
// Requêtes SQL de référence fournies pour Koha, proposées à la copie.
// Ces requêtes ne sont jamais exécutées directement par le navigateur.
const REPORT_SQL = Object.freeze({
    circulation: `SELECT 
    branch AS site,
    DATE(datetime) AS date,
    SUM(CASE WHEN type = 'issue' THEN 1 ELSE 0 END) AS Issues,
    SUM(CASE WHEN type = 'renew' THEN 1 ELSE 0 END) AS Renews,
    SUM(CASE WHEN type = 'return' THEN 1 ELSE 0 END) AS Returns
FROM statistics
WHERE datetime >= CURDATE() - INTERVAL <<Période en jours>> DAY
  AND type IN ('issue', 'renew', 'return')
GROUP BY branch, DATE(datetime)
ORDER BY branch, DATE(datetime)`,
    subscription: `SELECT 
    site,
    date,
    SUM(Nouveaux_abonnes) AS Nouveaux_abonnes,
    SUM(Renouvellements) AS Renouvellements
FROM (
    SELECT 
        b.branchcode AS site,
        DATE(b.dateenrolled) AS date,
        COUNT(*) AS Nouveaux_abonnes,
        0 AS Renouvellements
    FROM borrowers b
    WHERE b.dateenrolled >= CURDATE() - INTERVAL <<Période en jours>> DAY
    GROUP BY b.branchcode, DATE(b.dateenrolled)
    
    UNION ALL
    
    SELECT 
        b.branchcode AS site,
        DATE(b.date_renewed) AS date,
        0 AS Nouveaux_abonnes,
        COUNT(*) AS Renouvellements
    FROM borrowers b
    WHERE b.date_renewed >= CURDATE() - INTERVAL <<Période en jours>> DAY
    GROUP BY b.branchcode, DATE(b.date_renewed)
) AS t
GROUP BY site, date
ORDER BY site, date`
});
const STYLE_TEXT = `    :root {
        /* Même palette que le widget "Prochains créneaux" */
        --sub-report-koha-green: #2f7d5b;
        --sub-report-koha-green-dark: #256a4c;
        --sub-report-bg: #f4f7f8;
        --sub-report-bg-soft: #f8faf9;
        --sub-report-border: #dce4e8;
        --sub-report-border-light: #e8edef;
        --sub-report-text: #24313a;
        --sub-report-text-muted: #71808b;
    }

    .sub-report-container {
        position: relative;
        width: 100%;
        max-width: 430px !important;
        margin: 10px auto 24px;
        overflow: hidden;
        background: #ffffff;
        border: 1px solid var(--sub-report-border);
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(20, 40, 50, 0.07);
        color: var(--sub-report-text);
        font-family: Arial, Helvetica, sans-serif;
        box-sizing: border-box;
    }

    .sub-report-header {
        margin: 0;
        padding: 11px 12px 7px;
        background: #ffffff;
        border: 0;
        color: var(--sub-report-text);
        font-family: inherit;
        font-size: 17px;
        font-weight: 700;
        line-height: 1.2;
        text-align: left;
    }

    .sub-report-accordion {
        margin: 0;
        border: 0;
        border-bottom: 1px solid var(--sub-report-border-light);
        background: transparent;
    }

    .sub-report-accordion summary {
        position: relative;
        padding: 9px 32px 9px 12px;
        background: transparent;
        color: var(--sub-report-text);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.3;
        list-style: none;
        cursor: pointer;
        user-select: none;
    }

    .sub-report-accordion summary:hover {
        background: #f7f7f7;
        color: var(--sub-report-koha-green-dark);
    }

    .sub-report-accordion summary::after {
        content: "›";
        position: absolute;
        top: 50%;
        right: 0.72rem;
        color: var(--sub-report-koha-green);
        font-size: 1rem;
        font-weight: 700;
        transform: translateY(-50%) rotate(90deg);
        transition: transform 0.15s ease;
    }

    .sub-report-accordion[open] summary::after {
        transform: translateY(-50%) rotate(-90deg);
    }

    .sub-report-accordion summary::-webkit-details-marker {
        display: none;
    }

    .sub-report-filters {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        padding: 8px 12px 11px;
        background: transparent;
        border-top: 1px solid var(--sub-report-border-light);
    }

    .sub-report-filter-group {
        width: 100%;
    }

    .sub-report-filter-group label {
        display: block;
        margin-bottom: 0.22rem;
        color: var(--sub-report-text);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
    }

    .sub-report-select {
        width: 100%;
        min-height: 32px;
        padding: 7px 8px;
        background: #ffffff;
        border: 1px solid #bcbcbc;
        border-radius: 4px;
        color: var(--sub-report-text);
        font-family: inherit;
        font-size: 12px;
        line-height: 1.3;
    }

    .sub-report-select:focus {
        border-color: var(--sub-report-koha-green);
        outline: 0;
        box-shadow: 0 0 0 2px rgba(64, 133, 64, 0.15);
    }

    .sub-report-reset {
        align-self: flex-start;
        padding: 6px 9px;
        background: #ffffff;
        border: 1px solid #bcbcbc;
        border-radius: 6px;
        color: var(--sub-report-text);
        font-family: inherit;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.25;
        cursor: pointer;
    }

    .sub-report-reset:hover {
        background: #eeeeee;
        border-color: #9f9f9f;
        color: var(--sub-report-koha-green-dark);
    }

    .sub-report-reset:focus {
        border-color: var(--sub-report-koha-green);
        outline: 0;
        box-shadow: 0 0 0 2px rgba(64, 133, 64, 0.15);
    }

    .sub-report-table {
        width: 100%;
        margin: 0;
        border-collapse: collapse;
        background: #ffffff;
        color: var(--sub-report-text);
        font-size: 10px;
    }

    .sub-report-table th,
    .sub-report-table td {
        padding: 7px 8px;
        border-bottom: 1px solid var(--sub-report-border-light);
        text-align: left;
        vertical-align: middle;
        white-space: nowrap;
    }

    .sub-report-table th {
        background: var(--sub-report-bg-soft);
        border-bottom: 1px solid var(--sub-report-border);
        color: var(--sub-report-text);
        font-weight: 600;
        cursor: pointer;
    }

    .sub-report-table th:hover {
        background: #ebebeb;
        color: var(--sub-report-koha-green-dark);
    }

    .sub-report-table tbody tr:nth-child(even) {
        background: #fbfbfb;
    }

    .sub-report-table tbody tr:hover {
        background: #f3f7f3;
    }

    .sub-report-chart-container {
        padding: 9px 12px 12px;
        background: transparent;
    }

    .sub-report-chart-container canvas {
        max-width: 100%;
    }

    .sub-report-chart {
        width: 100% !important;
        height: 260px !important;
    }

    .sub-report-loading {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.88);
        color: var(--sub-report-text-muted);
        font-family: inherit;
        font-size: 0.8rem;
        font-weight: 600;
        z-index: 10;
    }

    @media (max-width: 640px) {
        .sub-report-container {
            max-width: none !important;
            width: auto;
            margin: 7px 5px 18px;
        }

        .sub-report-tabs {
            padding: 4px 10px 10px;
        }

        .sub-report-chart-container {
            padding: 8px 10px 10px;
        }
    }

    .sub-report-error {
        display: none;
        margin: 0.55rem 0.7rem;
        padding: 0.5rem 0.6rem;
        background: #fff7f7;
        border: 1px solid #e0b4b4;
        border-radius: 3px;
        color: #8a2f2f;
        font-size: 0.74rem;
        line-height: 1.35;
    }

    .sub-report-error.is-visible {
        display: block;
    }


    /* ============================================================
       ONGLETS CIRCULATION / ABONNEMENTS
       ============================================================ */

    .sub-report-tabs {
        display: flex;
        gap: 5px;
        padding: 4px 12px 10px;
        background: #ffffff;
        border-bottom: 1px solid var(--sub-report-border);
    }

    .sub-report-tab {
        flex: 1 1 0;
        appearance: none;
        min-width: 0;
        padding: 7px 9px;
        border: 1px solid var(--sub-report-border);
        border-radius: 8px;
        background: #ffffff;
        color: var(--sub-report-text-muted);
        font-family: inherit;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
        cursor: pointer;
        box-shadow: none;
        transition: background .12s ease, border-color .12s ease, color .12s ease;
    }

    .sub-report-tab:hover,
    .sub-report-tab:focus {
        background: #f5f5f5;
        border-color: #bcbcbc;
        color: var(--sub-report-text);
        outline: none;
    }

    .sub-report-tab.is-active {
        background: var(--sub-report-koha-green);
        border-color: var(--sub-report-koha-green);
        color: #ffffff;
    }

    .sub-report-tab-panel {
        position: relative;
        display: none;
        min-height: 180px;
        background: linear-gradient(180deg, #ffffff 0%, var(--sub-report-bg) 100%);
    }

    .sub-report-tab-panel.is-active {
        display: block;
    }


    /* ============================================================
       LÉGENDE DES GRAPHIQUES
       Les échantillons sont dessinés sur canvas avec le même
       borderDash et la même couleur que la série réelle.
       ============================================================ */

    .sub-report-html-legend {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        gap: 7px 12px;
        margin: 7px 4px 1px;
        padding: 4px 0 0;
        color: var(--sub-report-text-muted);
        font-size: 10px;
        line-height: 1.2;
    }

    .sub-report-legend-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        max-width: 100%;
        padding: 2px 3px;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        cursor: pointer;
    }

    .sub-report-legend-item:hover {
        color: var(--sub-report-koha-green-dark);
        text-decoration: underline;
    }

    .sub-report-legend-item.is-hidden {
        opacity: 0.38;
        text-decoration: line-through;
    }

    .sub-report-legend-sample {
        flex: 0 0 44px;
        width: 44px;
        height: 10px;
        display: block;
    }

    .sub-report-legend-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* PMK 137 : configuration des deux rapports, superlibrarians uniquement. */
    #circulationSubscriptionReport .pmk137-report-top {
        display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;
    }
    #circulationSubscriptionReport .pmk137-report-settings-toggle,
    #circulationSubscriptionReport .pmk137-report-settings button {
        border: 1px solid #cbd5dc; border-radius: 5px; background: #fff;
        color: #24313a; padding: 6px 10px; cursor: pointer;
    }
    #circulationSubscriptionReport .pmk137-report-settings-toggle:hover,
    #circulationSubscriptionReport .pmk137-report-settings button:hover { border-color: #2f7d5b; }
    #circulationSubscriptionReport .pmk137-report-settings-toggle:focus-visible,
    #circulationSubscriptionReport .pmk137-report-settings button:focus-visible,
    #circulationSubscriptionReport .pmk137-report-settings input:focus-visible {
        outline: 2px solid #2f7d5b; outline-offset: 2px;
    }
    #circulationSubscriptionReport .pmk137-report-settings[hidden] { display: none; }
    #circulationSubscriptionReport .pmk137-report-settings {
        margin: 10px 0 16px; padding: 13px; border: 1px solid #cbd5dc;
        border-radius: 8px; background: #f8faf9;
    }
    #circulationSubscriptionReport .pmk137-report-settings-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 12px;
    }
    #circulationSubscriptionReport .pmk137-report-settings-field {
        display: flex; flex-direction: column; gap: 6px; min-width: 0;
    }
    #circulationSubscriptionReport .pmk137-report-settings-field label { font-weight: 600; }
    #circulationSubscriptionReport .pmk137-report-settings-field input,
    #circulationSubscriptionReport .pmk137-report-settings-field textarea {
        width: 100%; box-sizing: border-box; padding: 8px;
        border: 1px solid #cbd5dc; border-radius: 5px;
        background: white; color: #24313a;
    }
    #circulationSubscriptionReport .pmk137-report-settings-field textarea {
        font-family: ui-monospace, Consolas, monospace; font-size: 12px; line-height: 1.45;
        resize: vertical;
    }
    #circulationSubscriptionReport .pmk137-report-settings-actions {
        display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px;
    }
    #circulationSubscriptionReport .pmk137-report-settings button[type=submit] {
        border-color: #2f7d5b; background: #2f7d5b; color: white;
    }
    #circulationSubscriptionReport .pmk137-report-settings-status {
        display: block; margin-top: 8px; min-height: 1.5em;
    }
    #circulationSubscriptionReport .pmk137-report-settings-status[data-kind=error] { color: #a52a2a; }
    #circulationSubscriptionReport .pmk137-report-settings-status[data-kind=success] { color: #256a4c; }
    #circulationSubscriptionReport .pmk137-report-help { color: #586975; font-size: 12px; }
    #circulationSubscriptionReport .pmk137-report-scope { display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;border-top:1px solid var(--sub-report-border-light);border-bottom:1px solid var(--sub-report-border-light);font-size:12px; }
    #circulationSubscriptionReport .pmk137-report-scope select,#circulationSubscriptionReport .pmk137-report-scope button{padding:5px 7px;border:1px solid #bcbcbc;border-radius:4px;background:#fff}.pmk137-report-meta{color:var(--sub-report-text-muted)}
    `;
const HTML_TEXT = `<!-- Rapport Circulation & Abonnements -->
<div class="sub-report-container" id="circulationSubscriptionReport">
    <div class="pmk137-report-top">
        <h1 class="sub-report-header">Circulation &amp; abonnements</h1>
        <div id="pmk137-report-admin-slot"></div>
    </div>

    <div class="pmk137-report-scope">
        <label for="pmk137-report-period"><strong>Période</strong></label>
        <select id="pmk137-report-period"><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option><option value="365">365 jours</option></select>
        <button type="button" id="pmk137-report-refresh">Actualiser</button>
        <span id="pmk137-report-meta" class="pmk137-report-meta" role="status" aria-live="polite">Périmètre : chargement…</span>
    </div>

    <div class="sub-report-tabs" role="tablist" aria-label="Type de rapport">
        <button
            type="button"
            class="sub-report-tab is-active"
            id="tabCirculation"
            role="tab"
            aria-selected="true"
            aria-controls="panelCirculation"
            data-report-tab="circulation"
        >Circulation</button>
        <button
            type="button"
            class="sub-report-tab"
            id="tabSubscription"
            role="tab"
            aria-selected="false"
            aria-controls="panelSubscription"
            data-report-tab="subscription"
        >Abonnements</button>
    </div>

    <section
        class="sub-report-tab-panel is-active"
        id="panelCirculation"
        role="tabpanel"
        aria-labelledby="tabCirculation"
        data-report-panel="circulation"
    >
        <div id="circulationReport">
            <details class="sub-report-accordion">
                <summary>Filtres</summary>
                <div class="sub-report-filters">
                    <div class="sub-report-filter-group">
                        <label for="filterSite">Site</label>
                        <select id="filterSite" class="sub-report-select" multiple="multiple"></select>
                    </div>
                    <div class="sub-report-filter-group">
                        <label for="filterDate">Date</label>
                        <select id="filterDate" class="sub-report-select">
                            <option value="tous" selected="selected">Tous</option>
                        </select>
                    </div>
                    <div class="sub-report-filter-group">
                        <label for="filterType">Type</label>
                        <select id="filterType" class="sub-report-select">
                            <option value="tous" selected="selected">Tous</option>
                            <option value="Issues">Pr&ecirc;ts</option>
                            <option value="Renews">Renouvellements</option>
                            <option value="Returns">Retours</option>
                        </select>
                    </div>
                    <button id="resetFiltersCirculation" class="sub-report-reset" onclick="resetFiltersCirculation()">R&eacute;initialiser</button>
                </div>
            </details>

            <details class="sub-report-accordion">
                <summary>Donn&eacute;es brutes</summary>
                <table id="dataTableCirculation" class="sub-report-table">
                    <thead>
                        <tr>
                            <th data-key="site">Site</th>
                            <th data-key="date">Date</th>
                            <th data-key="Issues">Pr&ecirc;ts</th>
                            <th data-key="Renews">Renouv.</th>
                            <th data-key="Returns">Retours</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </details>

            <div class="sub-report-chart-container" id="chartContainerCirculation"></div>
            <div class="sub-report-loading" id="loadingSpinnerCirculation" style="display: none;">Chargement...</div>
        </div>
    </section>

    <section
        class="sub-report-tab-panel"
        id="panelSubscription"
        role="tabpanel"
        aria-labelledby="tabSubscription"
        data-report-panel="subscription"
        hidden
    >
        <div id="subscriptionReport">
            <details class="sub-report-accordion">
                <summary>Filtres</summary>
                <div class="sub-report-filters">
                    <div class="sub-report-filter-group">
                        <label for="filterSiteSubscription">Site</label>
                        <select id="filterSiteSubscription" class="sub-report-select" multiple="multiple"></select>
                    </div>
                    <div class="sub-report-filter-group">
                        <label for="filterDateSubscription">Date</label>
                        <select id="filterDateSubscription" class="sub-report-select">
                            <option value="tous" selected="selected">Tous</option>
                        </select>
                    </div>
                    <div class="sub-report-filter-group">
                        <label for="filterTypeSubscription">Type</label>
                        <select id="filterTypeSubscription" class="sub-report-select">
                            <option value="tous" selected="selected">Tous</option>
                            <option value="inscription">Nouveaux</option>
                            <option value="renouvellement">Renouvellements</option>
                        </select>
                    </div>
                    <button id="resetFiltersSubscription" class="sub-report-reset" onclick="resetFiltersSubscription()">R&eacute;initialiser</button>
                </div>
            </details>

            <details class="sub-report-accordion">
                <summary>Donn&eacute;es brutes</summary>
                <table id="dataTableSubscription" class="sub-report-table">
                    <thead>
                        <tr>
                            <th data-key="site">Site</th>
                            <th data-key="date">Date</th>
                            <th data-key="Nouveaux_abonnes">Nouveaux</th>
                            <th data-key="Renouvellements">Renouv.</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </details>

            <div class="sub-report-chart-container" id="chartContainerSubscription"></div>
            <div class="sub-report-loading" id="loadingSpinnerSubscription" style="display: none;">Chargement...</div>
        </div>
    </section>
</div>`

/*
 * Les rapports restent des rapports enregistrés Koha. L'interface ne crée
 * jamais de rapport et ne lance jamais de SQL : elle ne fait que copier le texte.
 * Les ID sont enregistrés sur la configuration existante du module 137.
 */
function mountReportSettings(container) {
    const api = window.PMKHomeWidgets;
    const pmk = window.PMKConfig;
    if (!api?.isSuperlibrarian?.() || typeof pmk?.saveConfig !== 'function') return () => {};

    const root = container.querySelector('#circulationSubscriptionReport');
    const slot = root?.querySelector('#pmk137-report-admin-slot');
    if (!root || !slot) return () => {};

    slot.innerHTML = '<button type="button" class="pmk137-report-settings-toggle" aria-controls="pmk137-report-settings-panel" aria-expanded="false">⚙ Configurer les rapports</button>';
    const toggle = slot.querySelector('button');
    const section = document.createElement('section');
    section.className = 'pmk137-report-settings';
    section.id = 'pmk137-report-settings-panel';
    section.hidden = true;
    section.setAttribute('aria-label', 'Configuration des rapports Koha');
    section.innerHTML = `
        <form id="pmk137-report-settings-form" novalidate>
            <p class="pmk137-report-help">Enregistrez d’abord ces requêtes dans les rapports SQL de Koha, puis saisissez leurs identifiants. La valeur 0 désactive le rapport. Les paramètres sont partagés via la configuration existante de PMK.</p>
            <div class="pmk137-report-settings-grid">
                <div class="pmk137-report-settings-field">
                    <label for="pmk137-circulation-report-id">Rapport de circulation — ID Koha</label>
                    <input type="number" id="pmk137-circulation-report-id" name="circulationReportId" min="0" step="1" required>
                    <label for="pmk137-sql-circulation">SQL du rapport de circulation (période paramétrable)</label>
                    <textarea id="pmk137-sql-circulation" rows="14" readonly spellcheck="false"></textarea>
                    <button type="button" data-copy-report="circulation">Copier le SQL circulation</button>
                </div>
                <div class="pmk137-report-settings-field">
                    <label for="pmk137-subscription-report-id">Rapport des abonnés — ID Koha</label>
                    <input type="number" id="pmk137-subscription-report-id" name="subscriptionReportId" min="0" step="1" required>
                    <label for="pmk137-sql-subscription">SQL du rapport des abonnés (période paramétrable)</label>
                    <textarea id="pmk137-sql-subscription" rows="20" readonly spellcheck="false"></textarea>
                    <button type="button" data-copy-report="subscription">Copier le SQL abonnés</button>
                </div>
                <div class="pmk137-report-settings-field">
                    <label for="pmk137-report-period-default">Période proposée par défaut (jours)</label>
                    <input type="number" id="pmk137-report-period-default" name="reportPeriodDays" min="1" max="3650" step="1" required>
                    <label for="pmk137-report-refresh-minutes">Actualisation automatique (minutes, 0 = désactivée)</label>
                    <input type="number" id="pmk137-report-refresh-minutes" name="reportRefreshMinutes" min="0" max="1440" step="1" required>
                    <p class="pmk137-report-help">Le périmètre de site reste choisi dans les filtres. La date de dernière lecture et les rapports indisponibles sont affichés dans le widget.</p>
                </div>
            </div>
            <div class="pmk137-report-settings-actions">
                <button type="submit">Enregistrer les identifiants</button>
                <button type="button" data-close-reports>Fermer</button>
            </div>
            <output class="pmk137-report-settings-status" role="status" aria-live="polite"></output>
        </form>`;
    root.querySelector('.pmk137-report-top').insertAdjacentElement('afterend', section);
    const form = section.querySelector('form');
    const circulationInput = form.querySelector('[name=circulationReportId]');
    const subscriptionInput = form.querySelector('[name=subscriptionReportId]');
    const periodInput = form.querySelector('[name=reportPeriodDays]');
    const refreshInput = form.querySelector('[name=reportRefreshMinutes]');
    const sqlCirculation = form.querySelector('#pmk137-sql-circulation');
    const sqlSubscription = form.querySelector('#pmk137-sql-subscription');
    const status = form.querySelector('[role=status]');
    const saveButton = form.querySelector('[type=submit]');
    sqlCirculation.value = REPORT_SQL.circulation;
    sqlSubscription.value = REPORT_SQL.subscription;
    const original = api.getConfig();
    circulationInput.value = original.circulationReportId ?? 0;
    subscriptionInput.value = original.subscriptionReportId ?? 0;
    periodInput.value = original.reportPeriodDays ?? 7;
    refreshInput.value = original.reportRefreshMinutes ?? 0;
    let active = true;

    function message(value, error = false) {
        if (!active) return;
        status.textContent = value;
        status.dataset.kind = error ? 'error' : 'success';
    }
    function openSettings(open) {
        section.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) circulationInput.focus();
        else toggle.focus();
    }
    function readReportId(input) {
        const value = input.value.trim();
        if (!/^(0|[1-9]\d*)$/.test(value)) {
            throw new Error('Les identifiants doivent être des entiers positifs ou 0.');
        }
        const numeric = Number(value);
        if (!Number.isSafeInteger(numeric)) throw new Error('Identifiant de rapport trop grand.');
        return numeric;
    }
    const onToggle = () => openSettings(section.hidden);
    const onClose = () => openSettings(false);
    toggle.addEventListener('click', onToggle);
    form.querySelector('[data-close-reports]').addEventListener('click', onClose);

    const onCopy = async event => {
        const kind = event.currentTarget.getAttribute('data-copy-report');
        const area = kind === 'circulation' ? sqlCirculation : sqlSubscription;
        let copied = false;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(area.value);
                copied = true;
            }
        } catch (_) {}
        if (!copied) {
            try {
                area.focus();
                area.select();
                copied = !!document.execCommand?.('copy');
                area.setSelectionRange(0, 0);
            } catch (_) {}
        }
        message(copied ? 'Requête SQL copiée dans le presse-papiers.' : 'Copie automatique indisponible : sélectionnez et copiez le texte SQL.', !copied);
    };
    form.querySelectorAll('[data-copy-report]').forEach(button => button.addEventListener('click', onCopy));

    const onSave = async event => {
        event.preventDefault();
        if (!active || saveButton.disabled || !api.isSuperlibrarian?.()) return;
        let circulationReportId, subscriptionReportId, reportPeriodDays, reportRefreshMinutes;
        try {
            circulationReportId = readReportId(circulationInput);
            subscriptionReportId = readReportId(subscriptionInput);
            reportPeriodDays = readReportId(periodInput);
            reportRefreshMinutes = readReportId(refreshInput);
            if(reportPeriodDays<1||reportPeriodDays>3650)throw new Error('La période doit être comprise entre 1 et 3 650 jours.');
            if(reportRefreshMinutes>1440)throw new Error('L’actualisation automatique ne peut pas dépasser 1 440 minutes.');
        } catch (error) {
            message(error.message, true);
            return;
        }
        saveButton.disabled = true;
        message('Enregistrement des identifiants…');
        try {
            // Relecture de l'intégralité de la configuration pour ne pas écraser
            // les widgets, les paramètres inconnus ou un réglage plus récent.
            const latest = await pmk.getConfig(api.moduleId, { force: true, ignoreGlobal: true });
            if (typeof pmk.getStatus === 'function' && pmk.getStatus(api.moduleId).readOk === false) {
                throw new Error('Lecture de la configuration native indisponible : aucune modification enregistrée.');
            }
            const next = {
                ...latest,
                circulationReportId,
                subscriptionReportId
                ,reportPeriodDays
                ,reportRefreshMinutes
            };
            await pmk.saveConfig(api.moduleId, next);
            message('Identifiants enregistrés. Les rapports seront actualisés au rechargement.');
            // L'abonnement du socle relance lui-même PMK si la configuration a changé.
        } catch (error) {
            message('Enregistrement non confirmé : ' + (error?.message || 'erreur inconnue') + '. Vérifiez les paramètres avant de réessayer.', true);
        } finally {
            if (active) saveButton.disabled = false;
        }
    };
    form.addEventListener('submit', onSave);
    return () => {
        active = false;
        form.removeEventListener('submit', onSave);
        toggle.removeEventListener('click', onToggle);
        form.querySelector('[data-close-reports]').removeEventListener('click', onClose);
        form.querySelectorAll('[data-copy-report]').forEach(button => button.removeEventListener('click', onCopy));
        section.remove();
        slot.replaceChildren();
    };
}

function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.appendChild(style);
}

async function mount(container) {
    if (!container || container.dataset.pmk137Mounted === WIDGET_ID) return;
    container.dataset.pmk137Mounted = WIDGET_ID;
    ensureStyle();
    container.innerHTML = HTML_TEXT;
    const disposeReportSettings = mountReportSettings(container);

    try {
        await window.PMKHomeWidgets.loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js');
        await window.PMKHomeWidgets.loadScript('https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js');
    } catch (error) {
        disposeReportSettings();
        delete container.dataset.pmk137Mounted;
        throw error;
    }

    let disposeCharts = () => {};
    const previousResetCirculation = window.resetFiltersCirculation;
    const previousResetSubscription = window.resetFiltersSubscription;
    const reportControllers = new Set();
    let reportRefreshTimer = 0;
    (() => {
        'use strict';

        /* ============================================================
           CONFIGURATION
           ============================================================ */

        const reportConfig = window.PMKHomeWidgets.getConfig();
        let reportPeriodDays = Math.max(1, Math.min(3650, Number(reportConfig.reportPeriodDays) || 7));
        const getReportEndpoint = id => {
            const parsed = Number(id);
            if(!Number.isSafeInteger(parsed)||parsed<=0)return '';
            const endpoint=new URL('/cgi-bin/koha/svc/report',window.location.origin);
            endpoint.searchParams.set('id',String(parsed));
            endpoint.searchParams.set('sql_params',String(reportPeriodDays));
            return endpoint.pathname+endpoint.search;
        };
        const FETCH_TIMEOUT_MS = 30000;

        let rawDataCirculation = [];
        let rawDataSubscription = [];

        let sortConfigCirculation = { key: null, direction: 1 };
        let sortConfigSubscription = { key: null, direction: 1 };

        let chartCirculation = null;
        let chartSubscription = null;

        const SITE_COLORS = [
            '#408540',
            '#2f6f9f',
            '#7a5c9e',
            '#b06b35',
            '#9b4f69',
            '#3f7f75',
            '#6a7180',
            '#8a6d3b',
            '#5f7f46',
            '#4f6fa8',
            '#8a5f5f',
            '#4b7f8c'
        ];

        /* ============================================================
           OUTILS COMMUNS
           ============================================================ */

        function toInteger(value) {
            const parsed = Number.parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : 0;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function getLoggedInBranchCode() {
            const candidates = [
                document.querySelector('.logged-in-branch-code'),
                document.querySelector('[data-branchcode]'),
                document.querySelector('[data-branch-code]')
            ].filter(Boolean);

            for (const element of candidates) {
                const value =
                    element.getAttribute('data-branchcode') ||
                    element.getAttribute('data-branch-code') ||
                    element.textContent;

                if (value && value.trim()) {
                    return value.trim();
                }
            }

            return '';
        }

        async function fetchReport(endpoint) {
            if (!endpoint) throw new Error('Rapport SQL non configuré : renseignez son identifiant dans le module 137 de PMK.');
            const controller = new AbortController();
            reportControllers.add(controller);
            const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }

                const jsonData = await response.json();

                if (!Array.isArray(jsonData)) {
                    throw new Error('Réponse du rapport Koha invalide.');
                }

                return jsonData;
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('Le rapport Koha met plus de 30 secondes à répondre.');
                }
                throw error;
            } finally {
                reportControllers.delete(controller);
                window.clearTimeout(timeoutId);
            }
        }

        function getSiteColor(site) {
            let hash = 0;
            const value = String(site || '');

            for (let i = 0; i < value.length; i += 1) {
                hash = ((hash << 5) - hash) + value.charCodeAt(i);
                hash |= 0;
            }

            return SITE_COLORS[Math.abs(hash) % SITE_COLORS.length];
        }


        /**
         * Conserve la couleur de famille d'un site mais crée une nuance légère
         * pour distinguer les types de données lorsqu'ils se superposent.
         * amount < 0 = plus sombre ; amount > 0 = plus clair.
         */
        function adjustHexColor(hex, amount = 0) {
            const match = /^#([0-9a-f]{6})$/i.exec(String(hex || '').trim());
            if (!match || !amount) return hex;

            const value = match[1];
            const channels = [0, 2, 4].map(offset =>
                Number.parseInt(value.slice(offset, offset + 2), 16)
            );

            const adjusted = channels.map(channel => {
                if (amount > 0) {
                    return Math.round(channel + (255 - channel) * (amount / 100));
                }
                return Math.round(channel * (1 + amount / 100));
            });

            return `#${adjusted
                .map(channel => Math.max(0, Math.min(255, channel))
                .toString(16)
                .padStart(2, '0'))
                .join('')}`;
        }

        /**
         * Dessine dans la légende exactement le même style de trait
         * que celui utilisé par Chart.js (couleur + borderDash).
         */
        function drawLegendLineSample(canvas, dataset) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);
            ctx.save();

            ctx.strokeStyle = dataset.borderColor || '#666666';
            ctx.lineWidth = Number(dataset.borderWidth) || 2;
            ctx.setLineDash(Array.isArray(dataset.borderDash) ? dataset.borderDash : []);

            ctx.beginPath();
            ctx.moveTo(1, height / 2);
            ctx.lineTo(width - 1, height / 2);
            ctx.stroke();

            ctx.restore();
        }

        /**
         * Légende HTML cliquable :
         * - l'échantillon est réellement dessiné avec le borderDash de la série ;
         * - un clic masque / réaffiche la série comme la légende native Chart.js.
         */
        function renderHtmlLineLegend(chart, chartContainer) {
            const oldLegend = chartContainer.querySelector('.sub-report-html-legend');
            if (oldLegend) oldLegend.remove();

            if (!chart || chart.data.datasets.length > 12) {
                return;
            }

            const legend = document.createElement('div');
            legend.className = 'sub-report-html-legend';
            legend.setAttribute('aria-label', 'Légende du graphique');

            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'sub-report-legend-item';
                button.title = `Afficher ou masquer : ${dataset.label}`;

                const sample = document.createElement('canvas');
                sample.className = 'sub-report-legend-sample';

                // Taille intrinsèque volontairement supérieure à la taille CSS
                // pour un rendu net sur les écrans haute densité.
                sample.width = 88;
                sample.height = 20;

                drawLegendLineSample(sample, {
                    ...dataset,
                    borderWidth: (Number(dataset.borderWidth) || 2) * 2,
                    borderDash: Array.isArray(dataset.borderDash)
                        ? dataset.borderDash.map(value => value * 2)
                        : []
                });

                const label = document.createElement('span');
                label.className = 'sub-report-legend-label';
                label.textContent = dataset.label;

                button.appendChild(sample);
                button.appendChild(label);

                const syncState = () => {
                    const visible = chart.isDatasetVisible(datasetIndex);
                    button.classList.toggle('is-hidden', !visible);
                    button.setAttribute('aria-pressed', visible ? 'true' : 'false');
                };

                syncState();

                button.addEventListener('click', () => {
                    const currentlyVisible = chart.isDatasetVisible(datasetIndex);
                    chart.setDatasetVisibility(datasetIndex, !currentlyVisible);
                    chart.update();
                    syncState();
                });

                legend.appendChild(button);
            });

            chartContainer.appendChild(legend);
        }

        function showReportError(reportId, message) {
            const report = document.getElementById(reportId);
            if (!report) return;

            let box = report.querySelector('.sub-report-error');

            if (!box) {
                box = document.createElement('div');
                box.className = 'sub-report-error';
                box.setAttribute('role', 'alert');

                const chartContainer = report.querySelector('.sub-report-chart-container');
                if (chartContainer) {
                    report.insertBefore(box, chartContainer);
                } else {
                    report.appendChild(box);
                }
            }

            box.textContent = message || '';
            box.classList.toggle('is-visible', Boolean(message));
        }

        function destroyChart(chart) {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        }

        function setupExclusiveAllOption(select, onChange) {
            let previousValues = new Set(
                Array.from(select.selectedOptions).map(option => option.value)
            );

            select.addEventListener('change', () => {
                const currentValues = new Set(
                    Array.from(select.selectedOptions).map(option => option.value)
                );

                const allOption = Array.from(select.options)
                    .find(option => option.value === 'tous');

                const newlySelected = Array.from(currentValues)
                    .filter(value => !previousValues.has(value));

                if (newlySelected.includes('tous')) {
                    Array.from(select.options).forEach(option => {
                        option.selected = option.value === 'tous';
                    });
                } else if (allOption && allOption.selected && currentValues.size > 1) {
                    allOption.selected = false;
                }

                if (!select.selectedOptions.length && allOption) {
                    allOption.selected = true;
                }

                previousValues = new Set(
                    Array.from(select.selectedOptions).map(option => option.value)
                );

                onChange();
            });
        }

        function sortData(data, sortConfig) {
            if (!sortConfig.key) {
                return data;
            }

            return data.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

                const numA = Number(valA);
                const numB = Number(valB);

                if (Number.isFinite(numA) && Number.isFinite(numB)) {
                    return (numA - numB) * sortConfig.direction;
                }

                return String(valA ?? '').localeCompare(
                    String(valB ?? ''),
                    'fr',
                    { numeric: true, sensitivity: 'base' }
                ) * sortConfig.direction;
            });
        }

        /* ============================================================
           RAPPORT DE CIRCULATION
           ============================================================ */

        async function initializeCirculation() {
            try {
                showLoadingCirculation();
                showReportError('circulationReport', '');
                await loadDataCirculation();
                populateFiltersCirculation();
                addFilterListenersCirculation();
                addSortListenersCirculation();
                renderTableCirculation();
            } catch (error) {
                showErrorCirculation(error);
                throw error;
            } finally {
                hideLoadingCirculation();
            }
        }

        async function loadDataCirculation() {
            const jsonData = await fetchReport(getReportEndpoint(reportConfig.circulationReportId));

            rawDataCirculation = jsonData
                .filter(row => Array.isArray(row))
                .map(row => ({
                    site: String(row[0] ?? '').trim(),
                    date: String(row[1] ?? '').trim(),
                    Issues: toInteger(row[2]),
                    Renews: toInteger(row[3]),
                    Returns: toInteger(row[4])
                }));
        }

        function populateFiltersCirculation() {
            const userSite = getLoggedInBranchCode();
            const selectSite = document.getElementById('filterSite');
            const previousSites = Array.from(selectSite.selectedOptions || []).map(option => option.value);

            const uniqueSites = [...new Set(rawDataCirculation.map(item => item.site))]
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));

            let optionsHTML = '<option value="tous">Tous</option>';
            optionsHTML += uniqueSites.map(site => {
                const selected = (previousSites.length ? previousSites.includes(site) : site === userSite) ? ' selected' : '';
                return `<option value="${escapeHtml(site)}"${selected}>${escapeHtml(site)}</option>`;
            }).join('');

            selectSite.innerHTML = optionsHTML;

            if (previousSites.includes('tous') || (!previousSites.length && (!userSite || !uniqueSites.includes(userSite)))) {
                selectSite.options[0].selected = true;
            }

            const selectDate = document.getElementById('filterDate');
            const uniqueDates = [...new Set(rawDataCirculation.map(item => item.date))]
                .filter(Boolean)
                .sort();

            let dateOptions = '<option value="tous" selected>Tous</option>';
            dateOptions += uniqueDates
                .map(date => `<option value="${escapeHtml(date)}">${escapeHtml(date)}</option>`)
                .join('');

            selectDate.innerHTML = dateOptions;
        }

        function filterDataCirculation() {
            const selectedSites = Array.from(
                document.getElementById('filterSite').selectedOptions
            ).map(option => option.value);

            const sitesFilter = selectedSites.includes('tous') ? [] : selectedSites;
            const selectedDate = document.getElementById('filterDate').value;
            const typeFilter = document.getElementById('filterType').value;

            return rawDataCirculation.filter(item => {
                if (sitesFilter.length && !sitesFilter.includes(item.site)) return false;
                if (selectedDate !== 'tous' && item.date !== selectedDate) return false;

                if (typeFilter !== 'tous' && item[typeFilter] <= 0) {
                    return false;
                }

                return true;
            });
        }

        function renderTableCirculation() {
            const tbody = document.querySelector('#dataTableCirculation tbody');
            let filteredData = filterDataCirculation();

            filteredData = sortData(filteredData, sortConfigCirculation);

            if (!filteredData.length) {
                tbody.innerHTML = '<tr><td colspan="5"><strong>0 activité</strong> enregistrée dans le périmètre choisi.</td></tr>';
            } else {
                tbody.innerHTML = filteredData.map(item => `
                    <tr>
                        <td>${escapeHtml(item.site)}</td>
                        <td>${escapeHtml(item.date)}</td>
                        <td>${item.Issues}</td>
                        <td>${item.Renews}</td>
                        <td>${item.Returns}</td>
                    </tr>
                `).join('');
            }

            renderLineChartCirculation();
        }

        function renderLineChartCirculation() {
            const filteredData = filterDataCirculation();
            const allDates = [...new Set(filteredData.map(item => item.date))]
                .filter(Boolean)
                .sort();

            const dataBySite = {};

            filteredData.forEach(item => {
                if (!dataBySite[item.site]) {
                    dataBySite[item.site] = {};
                }

                if (!dataBySite[item.site][item.date]) {
                    dataBySite[item.site][item.date] = {
                        Issues: 0,
                        Renews: 0,
                        Returns: 0
                    };
                }

                dataBySite[item.site][item.date].Issues += item.Issues;
                dataBySite[item.site][item.date].Renews += item.Renews;
                dataBySite[item.site][item.date].Returns += item.Returns;
            });

            const typeFilter = document.getElementById('filterType').value;

            const types = {
                Issues: {
                    label: 'Prêts',
                    dash: [],
                    shade: 0,
                    pointStyle: 'circle'
                },
                Renews: {
                    label: 'Renouvellements',
                    dash: [8, 4],
                    shade: -18,
                    pointStyle: 'rectRot'
                },
                Returns: {
                    label: 'Retours',
                    dash: [2, 4],
                    shade: 18,
                    pointStyle: 'triangle'
                }
            };

            const datasets = [];

            Object.keys(dataBySite)
                .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
                .forEach(site => {
                    Object.entries(types).forEach(([type, config]) => {
                        if (typeFilter !== 'tous' && typeFilter !== type) {
                            return;
                        }

                        const baseColor = getSiteColor(site);
                        const seriesColor = adjustHexColor(baseColor, config.shade);

                        datasets.push({
                            label: `${config.label} - ${site}`,
                            data: allDates.map(date =>
                                dataBySite[site][date]
                                    ? dataBySite[site][date][type]
                                    : 0
                            ),
                            borderColor: seriesColor,
                            backgroundColor: seriesColor,
                            borderDash: config.dash,
                            borderWidth: 2,
                            fill: false,
                            tension: 0.15,
                            pointStyle: config.pointStyle,
                            pointRadius: allDates.length > 55 ? 1.5 : 3,
                            pointHoverRadius: 5,
                            pointBorderWidth: 1,
                            pointBorderColor: seriesColor,
                            pointBackgroundColor: '#ffffff'
                        });
                    });
                });

            const chartContainer = document.getElementById('chartContainerCirculation');

            destroyChart(chartCirculation);
            chartCirculation = null;
            chartContainer.innerHTML = '';

            if (!allDates.length || !datasets.length) {
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.id = 'lineChartCirculation';
            canvas.className = 'sub-report-chart';
            chartContainer.appendChild(canvas);

            chartCirculation = new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: allDates,
                    datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Activité de circulation par site'
                        },
                        tooltip: {
                            callbacks: {
                                title(context) {
                                    if (!context.length) return '';

                                    const parsedDate = new Date(context[0].parsed.x);
                                    if (Number.isNaN(parsedDate.getTime())) {
                                        return context[0].label || '';
                                    }

                                    return parsedDate.toLocaleDateString('fr-FR', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    });
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                parser: 'yyyy-MM-dd',
                                unit: 'day',
                                displayFormats: {
                                    day: 'dd/MM'
                                },
                                tooltipFormat: 'eeee d MMMM yyyy'
                            },
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Nombre de mouvements'
                            }
                        }
                    }
                }
            });

            renderHtmlLineLegend(chartCirculation, chartContainer);
        }

        function addFilterListenersCirculation() {
            setupExclusiveAllOption(
                document.getElementById('filterSite'),
                renderTableCirculation
            );

            document.getElementById('filterDate')
                .addEventListener('change', renderTableCirculation);

            document.getElementById('filterType')
                .addEventListener('change', renderTableCirculation);
        }

        function addSortListenersCirculation() {
            document.querySelectorAll('#dataTableCirculation th').forEach(header => {
                header.addEventListener('click', () => {
                    const key = header.getAttribute('data-key');

                    if (sortConfigCirculation.key === key) {
                        sortConfigCirculation.direction *= -1;
                    } else {
                        sortConfigCirculation.key = key;
                        sortConfigCirculation.direction = 1;
                    }

                    renderTableCirculation();
                });
            });
        }

        function showLoadingCirculation() {
            document.getElementById('loadingSpinnerCirculation').style.display = 'flex';
        }

        function hideLoadingCirculation() {
            document.getElementById('loadingSpinnerCirculation').style.display = 'none';
        }

        function showErrorCirculation(error) {
            destroyChart(chartCirculation);
            chartCirculation = null;
            showReportError(
                'circulationReport',
                `Impossible de charger les données de circulation : ${error.message}`
            );
        }

        window.resetFiltersCirculation = function resetFiltersCirculation() {
            const siteSelect = document.getElementById('filterSite');

            Array.from(siteSelect.options).forEach((option, index) => {
                option.selected = index === 0;
            });

            document.getElementById('filterDate').selectedIndex = 0;
            document.getElementById('filterType').selectedIndex = 0;

            sortConfigCirculation = { key: null, direction: 1 };
            renderTableCirculation();
        };

        /* ============================================================
           RAPPORT D'ABONNEMENTS
           ============================================================ */

        async function initializeSubscription() {
            try {
                showLoadingSubscription();
                showReportError('subscriptionReport', '');
                await loadDataSubscription();
                populateFiltersSubscription();
                addFilterListenersSubscription();
                addSortListenersSubscription();
                renderTableSubscription();
            } catch (error) {
                showErrorSubscription(error);
                throw error;
            } finally {
                hideLoadingSubscription();
            }
        }

        async function loadDataSubscription() {
            const jsonData = await fetchReport(getReportEndpoint(reportConfig.subscriptionReportId));

            rawDataSubscription = jsonData
                .filter(row => Array.isArray(row))
                .map(row => ({
                    site: String(row[0] ?? '').trim(),
                    date: String(row[1] ?? '').trim(),
                    Nouveaux_abonnes: toInteger(row[2]),
                    Renouvellements: toInteger(row[3])
                }));
        }

        function populateFiltersSubscription() {
            const userSite = getLoggedInBranchCode();
            const selectSite = document.getElementById('filterSiteSubscription');
            const previousSites = Array.from(selectSite.selectedOptions || []).map(option => option.value);

            const uniqueSites = [...new Set(rawDataSubscription.map(item => item.site))]
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));

            let optionsHTML = '<option value="tous">Tous</option>';
            optionsHTML += uniqueSites.map(site => {
                const selected = (previousSites.length ? previousSites.includes(site) : site === userSite) ? ' selected' : '';
                return `<option value="${escapeHtml(site)}"${selected}>${escapeHtml(site)}</option>`;
            }).join('');

            selectSite.innerHTML = optionsHTML;

            if (previousSites.includes('tous') || (!previousSites.length && (!userSite || !uniqueSites.includes(userSite)))) {
                selectSite.options[0].selected = true;
            }

            const selectDate = document.getElementById('filterDateSubscription');
            const uniqueDates = [...new Set(rawDataSubscription.map(item => item.date))]
                .filter(Boolean)
                .sort();

            let dateOptions = '<option value="tous" selected>Tous</option>';
            dateOptions += uniqueDates
                .map(date => `<option value="${escapeHtml(date)}">${escapeHtml(date)}</option>`)
                .join('');

            selectDate.innerHTML = dateOptions;
        }

        function filterDataSubscription() {
            const selectedSites = Array.from(
                document.getElementById('filterSiteSubscription').selectedOptions
            ).map(option => option.value);

            const sitesFilter = selectedSites.includes('tous') ? [] : selectedSites;
            const selectedDate = document.getElementById('filterDateSubscription').value;
            const typeFilter = document.getElementById('filterTypeSubscription').value;

            return rawDataSubscription.filter(item => {
                if (sitesFilter.length && !sitesFilter.includes(item.site)) return false;
                if (selectedDate !== 'tous' && item.date !== selectedDate) return false;

                if (typeFilter === 'inscription' && item.Nouveaux_abonnes <= 0) {
                    return false;
                }

                if (typeFilter === 'renouvellement' && item.Renouvellements <= 0) {
                    return false;
                }

                return true;
            });
        }

        function renderTableSubscription() {
            const tbody = document.querySelector('#dataTableSubscription tbody');
            let filteredData = filterDataSubscription();

            filteredData = sortData(filteredData, sortConfigSubscription);

            if (!filteredData.length) {
                tbody.innerHTML = '<tr><td colspan="4"><strong>0 inscription ou renouvellement</strong> dans le périmètre choisi.</td></tr>';
            } else {
                tbody.innerHTML = filteredData.map(item => `
                    <tr>
                        <td>${escapeHtml(item.site)}</td>
                        <td>${escapeHtml(item.date)}</td>
                        <td>${item.Nouveaux_abonnes}</td>
                        <td>${item.Renouvellements}</td>
                    </tr>
                `).join('');
            }

            renderLineChartSubscription();
        }

        function renderLineChartSubscription() {
            const filteredData = filterDataSubscription();
            const allDates = [...new Set(filteredData.map(item => item.date))]
                .filter(Boolean)
                .sort();

            const dataBySite = {};

            filteredData.forEach(item => {
                if (!dataBySite[item.site]) {
                    dataBySite[item.site] = {};
                }

                if (!dataBySite[item.site][item.date]) {
                    dataBySite[item.site][item.date] = {
                        Nouveaux_abonnes: 0,
                        Renouvellements: 0
                    };
                }

                dataBySite[item.site][item.date].Nouveaux_abonnes += item.Nouveaux_abonnes;
                dataBySite[item.site][item.date].Renouvellements += item.Renouvellements;
            });

            const typeFilter = document.getElementById('filterTypeSubscription').value;
            const datasets = [];

            Object.keys(dataBySite)
                .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
                .forEach(site => {
                    const color = getSiteColor(site);

                    if (typeFilter === 'tous' || typeFilter === 'inscription') {
                        const seriesColor = color;

                        datasets.push({
                            label: `Nouveaux abonnés - ${site}`,
                            data: allDates.map(date =>
                                dataBySite[site][date]
                                    ? dataBySite[site][date].Nouveaux_abonnes
                                    : 0
                            ),
                            borderColor: seriesColor,
                            backgroundColor: seriesColor,
                            borderDash: [],
                            borderWidth: 2,
                            fill: false,
                            tension: 0.15,
                            pointStyle: 'circle',
                            pointRadius: allDates.length > 55 ? 1.5 : 3,
                            pointHoverRadius: 5,
                            pointBorderWidth: 1,
                            pointBorderColor: seriesColor,
                            pointBackgroundColor: '#ffffff'
                        });
                    }

                    if (typeFilter === 'tous' || typeFilter === 'renouvellement') {
                        const seriesColor = adjustHexColor(color, -18);

                        datasets.push({
                            label: `Renouvellements - ${site}`,
                            data: allDates.map(date =>
                                dataBySite[site][date]
                                    ? dataBySite[site][date].Renouvellements
                                    : 0
                            ),
                            borderColor: seriesColor,
                            backgroundColor: seriesColor,
                            borderDash: [8, 4],
                            borderWidth: 2,
                            fill: false,
                            tension: 0.15,
                            pointStyle: 'rectRot',
                            pointRadius: allDates.length > 55 ? 1.5 : 3,
                            pointHoverRadius: 5,
                            pointBorderWidth: 1,
                            pointBorderColor: seriesColor,
                            pointBackgroundColor: '#ffffff'
                        });
                    }
                });

            const chartContainer = document.getElementById('chartContainerSubscription');

            destroyChart(chartSubscription);
            chartSubscription = null;
            chartContainer.innerHTML = '';

            if (!allDates.length || !datasets.length) {
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.id = 'lineChartSubscription';
            canvas.className = 'sub-report-chart';
            chartContainer.appendChild(canvas);

            chartSubscription = new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: allDates,
                    datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Évolution des abonnements par site'
                        },
                        tooltip: {
                            callbacks: {
                                title(context) {
                                    if (!context.length) return '';

                                    const parsedDate = new Date(context[0].parsed.x);
                                    if (Number.isNaN(parsedDate.getTime())) {
                                        return context[0].label || '';
                                    }

                                    return parsedDate.toLocaleDateString('fr-FR', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    });
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                parser: 'yyyy-MM-dd',
                                unit: 'day',
                                displayFormats: {
                                    day: 'dd/MM'
                                },
                                tooltipFormat: 'eeee d MMMM yyyy'
                            },
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Nombre d\'abonnements'
                            }
                        }
                    }
                }
            });

            renderHtmlLineLegend(chartSubscription, chartContainer);
        }

        function addFilterListenersSubscription() {
            setupExclusiveAllOption(
                document.getElementById('filterSiteSubscription'),
                renderTableSubscription
            );

            document.getElementById('filterDateSubscription')
                .addEventListener('change', renderTableSubscription);

            document.getElementById('filterTypeSubscription')
                .addEventListener('change', renderTableSubscription);
        }

        function addSortListenersSubscription() {
            document.querySelectorAll('#dataTableSubscription th').forEach(header => {
                header.addEventListener('click', () => {
                    const key = header.getAttribute('data-key');

                    if (sortConfigSubscription.key === key) {
                        sortConfigSubscription.direction *= -1;
                    } else {
                        sortConfigSubscription.key = key;
                        sortConfigSubscription.direction = 1;
                    }

                    renderTableSubscription();
                });
            });
        }

        function showLoadingSubscription() {
            document.getElementById('loadingSpinnerSubscription').style.display = 'flex';
        }

        function hideLoadingSubscription() {
            document.getElementById('loadingSpinnerSubscription').style.display = 'none';
        }

        function showErrorSubscription(error) {
            destroyChart(chartSubscription);
            chartSubscription = null;
            showReportError(
                'subscriptionReport',
                `Impossible de charger les données d'abonnements : ${error.message}`
            );
        }

        window.resetFiltersSubscription = function resetFiltersSubscription() {
            const siteSelect = document.getElementById('filterSiteSubscription');

            Array.from(siteSelect.options).forEach((option, index) => {
                option.selected = index === 0;
            });

            document.getElementById('filterDateSubscription').selectedIndex = 0;
            document.getElementById('filterTypeSubscription').selectedIndex = 0;

            sortConfigSubscription = { key: null, direction: 1 };
            renderTableSubscription();
        };

        /* ============================================================
           ONGLETS
           ============================================================ */

        function setupReportTabs() {
            const tabs = Array.from(document.querySelectorAll('[data-report-tab]'));
            const panels = Array.from(document.querySelectorAll('[data-report-panel]'));

            const activateTab = tabName => {
                tabs.forEach(tab => {
                    const active = tab.dataset.reportTab === tabName;
                    tab.classList.toggle('is-active', active);
                    tab.setAttribute('aria-selected', active ? 'true' : 'false');
                    tab.tabIndex = active ? 0 : -1;
                });

                panels.forEach(panel => {
                    const active = panel.dataset.reportPanel === tabName;
                    panel.classList.toggle('is-active', active);
                    panel.hidden = !active;
                });

                // Chart.js calcule parfois une largeur nulle si le canvas a été
                // initialisé alors que son panneau était masqué.
                window.requestAnimationFrame(() => {
                    if (tabName === 'circulation' && chartCirculation) {
                        chartCirculation.resize();
                    }

                    if (tabName === 'subscription' && chartSubscription) {
                        chartSubscription.resize();
                    }
                });
            };

            tabs.forEach((tab, index) => {
                tab.addEventListener('click', () => {
                    activateTab(tab.dataset.reportTab);
                });

                tab.addEventListener('keydown', event => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                        return;
                    }

                    event.preventDefault();

                    let targetIndex = index;

                    if (event.key === 'ArrowRight') {
                        targetIndex = (index + 1) % tabs.length;
                    } else if (event.key === 'ArrowLeft') {
                        targetIndex = (index - 1 + tabs.length) % tabs.length;
                    } else if (event.key === 'Home') {
                        targetIndex = 0;
                    } else if (event.key === 'End') {
                        targetIndex = tabs.length - 1;
                    }

                    tabs[targetIndex].focus();
                    activateTab(tabs[targetIndex].dataset.reportTab);
                });
            });

            activateTab('circulation');
        }

        /* ============================================================
           INITIALISATION DES DEUX RAPPORTS
           ============================================================ */

        function reportScopeText() {
            const active=document.querySelector('[data-report-panel].is-active');
            const select=active?.querySelector('select[id^="filterSite"]');
            const sites=select?Array.from(select.selectedOptions).map(option=>option.value==='tous'?'tous les sites':option.textContent.trim()):[];
            return `Période : ${reportPeriodDays} jour(s) · Sites : ${sites.join(', ')||'selon le rapport'}`;
        }
        function updateReportMeta(results) {
            const meta=document.getElementById('pmk137-report-meta');if(!meta)return;
            const failures=(results||[]).filter(result=>result.status==='rejected').length;
            meta.textContent=`${reportScopeText()} · Dernière lecture : ${new Date().toLocaleString('fr-FR')}`+(failures?` · ${failures} rapport(s) indisponible(s)`:' · données disponibles');
        }
        async function refreshReports() {
            const button=document.getElementById('pmk137-report-refresh');if(button)button.disabled=true;
            showLoadingCirculation();showLoadingSubscription();
            const results=await Promise.allSettled([loadDataCirculation(),loadDataSubscription()]);
            if(results[0].status==='fulfilled'){showReportError('circulationReport','');populateFiltersCirculation();renderTableCirculation();}else showErrorCirculation(results[0].reason);
            if(results[1].status==='fulfilled'){showReportError('subscriptionReport','');populateFiltersSubscription();renderTableSubscription();}else showErrorSubscription(results[1].reason);
            hideLoadingCirculation();hideLoadingSubscription();updateReportMeta(results);if(button)button.disabled=false;
        }

        setupReportTabs();
        const periodSelect=document.getElementById('pmk137-report-period');
        if(!Array.from(periodSelect.options).some(option=>Number(option.value)===reportPeriodDays)){const option=document.createElement('option');option.value=String(reportPeriodDays);option.textContent=reportPeriodDays+' jours';periodSelect.appendChild(option);}
        periodSelect.value=String(reportPeriodDays);
        periodSelect.addEventListener('change',()=>{reportPeriodDays=Math.max(1,Number(periodSelect.value)||7);refreshReports();});
        document.getElementById('pmk137-report-refresh').addEventListener('click',refreshReports);
        document.getElementById('circulationSubscriptionReport').addEventListener('change',event=>{if(event.target.matches('#filterSite,#filterSiteSubscription,#filterDate,#filterDateSubscription,#filterType,#filterTypeSubscription'))updateReportMeta();});
        Promise.allSettled([initializeCirculation(),initializeSubscription()]).then(updateReportMeta);
        const refreshMinutes=Math.max(0,Math.min(1440,Number(reportConfig.reportRefreshMinutes)||0));
        if(refreshMinutes)reportRefreshTimer=window.setInterval(refreshReports,refreshMinutes*60000);

        disposeCharts = () => {
            try { chartCirculation?.destroy(); } catch (_) {}
            try { chartSubscription?.destroy(); } catch (_) {}
            chartCirculation = null;
            chartSubscription = null;
        };
    })();
    const ownResetCirculation = window.resetFiltersCirculation;
    const ownResetSubscription = window.resetFiltersSubscription;
    const dispose = () => {
        if (window.resetFiltersCirculation === ownResetCirculation) {
            if (previousResetCirculation === undefined) delete window.resetFiltersCirculation;
            else window.resetFiltersCirculation = previousResetCirculation;
        }
        if (window.resetFiltersSubscription === ownResetSubscription) {
            if (previousResetSubscription === undefined) delete window.resetFiltersSubscription;
            else window.resetFiltersSubscription = previousResetSubscription;
        }
        reportControllers.forEach(controller => controller.abort());
        reportControllers.clear();
        if(reportRefreshTimer)window.clearInterval(reportRefreshTimer);
        disposeReportSettings();
        disposeCharts();
        if (container.dataset.pmk137Mounted === WIDGET_ID) delete container.dataset.pmk137Mounted;
    };
    dispose.canRefresh=()=>container.querySelector('#pmk137-report-settings-panel')?.hidden!==false;
    return dispose;
}

window.PMKHomeWidgets?.register({
    id: WIDGET_ID,
    name: 'Circulation & abonnements',
    target: 'announcements-column',
    mount
});
