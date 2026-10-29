/* ============================================================
   PimpMyKoha 137 — Widgets & blocs d’accueil
   Généré le 22/09/2026
   Sous-widget autonome.
   IMPORTANT : conserver ce fichier séparé pour la maintenance.
   ============================================================ */


const {
    doc,
    getDoc,
    setDoc
  , createDatabase, getSession} = window.PMKNativeData;

const WIDGET_ID = 'frequency-nedap';
const STYLE_ID = 'pmk137-style-frequency-nedap';
const STYLE_TEXT = `  #nf-app {
    --nf-accent: #2f7d5b;
    --nf-accent-soft: #eef8f3;
    --nf-present-accent: #2f7d5b;
    --nf-present-soft: #eef8f3;
    --nf-text: #24313a;
    --nf-muted: #71808b;
    --nf-border: #dce4e8;
    --nf-surface: #ffffff;
    --nf-bg: #f4f7f8;
    --nf-danger: #b42318;
    --nf-danger-bg: #fff2f0;

    max-width: 460px;
    margin: 18px auto;
    font-family: Arial, Helvetica, sans-serif;
    color: var(--nf-text);
  }

  #nf-app * {
    box-sizing: border-box;
  }

  #nf-app .nf-card {
    position: relative;
    background: var(--nf-surface);
    border: 1px solid var(--nf-border);
    border-radius: 12px;
    box-shadow: 0 3px 14px rgba(20, 40, 50, .08);
    overflow: hidden;
  }

  #nf-app .nf-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 16px 10px;
  }

  #nf-app .nf-title-wrap {
    min-width: 0;
  }

  #nf-app .nf-title {
    margin: 0;
    font-size: 19px;
    line-height: 1.2;
    color: var(--nf-text);
  }

  #nf-app .nf-subtitle {
    margin-top: 4px;
    color: var(--nf-muted);
    font-size: 12px;
  }

  #nf-app .nf-admin-trigger {
    flex: 0 0 auto;
    appearance: none;
    border: 1px solid transparent;
    background: transparent;
    color: #98a3aa;
    border-radius: 6px;
    padding: 3px 5px;
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    opacity: .42;
    transition: opacity .15s ease, color .15s ease, background .15s ease, border-color .15s ease;
  }

  #nf-app .nf-admin-trigger:hover,
  #nf-app .nf-admin-trigger:focus,
  #nf-app .nf-admin-trigger.nf-active {
    opacity: 1;
    color: var(--nf-accent);
    background: #f7faf8;
    border-color: #dce5df;
    outline: none;
  }

  #nf-app .nf-body {
    padding: 6px 16px 16px;
    background: linear-gradient(180deg, #fff 0%, var(--nf-bg) 100%);
  }

  #nf-app .nf-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  #nf-app .nf-stat {
    background: #fff;
    border: 1px solid var(--nf-border);
    border-radius: 10px;
    padding: 13px 14px;
    min-height: 88px;
  }

  #nf-app .nf-stat.nf-present {
    grid-column: 1 / -1;
    background: var(--nf-present-soft);
    border-color: color-mix(in srgb, var(--nf-present-accent) 35%, #fff);
  }

  #nf-app .nf-label {
    display: block;
    margin-bottom: 7px;
    color: var(--nf-muted);
    font-size: 12px;
  }

  #nf-app .nf-value {
    display: block;
    color: var(--nf-text);
    font-size: 26px;
    line-height: 1;
    font-weight: 700;
    letter-spacing: -.02em;
  }

  #nf-app .nf-present .nf-value {
    color: var(--nf-present-accent);
  }

  #nf-app .nf-yesterday {
    display: block;
    margin-top: 6px;
    color: var(--nf-muted);
    font-size: 11px;
  }

  #nf-app .nf-estimate {
    color: var(--nf-muted);
    font-size: 10px;
    font-weight: 400;
  }

  #nf-app .nf-status {
    margin-top: 12px;
    padding: 9px 10px;
    border-radius: 8px;
    background: rgba(255,255,255,.68);
    border: 1px solid var(--nf-border);
    color: var(--nf-muted);
    font-size: 11px;
    line-height: 1.45;
    text-align: center;
  }

  #nf-app .nf-actions {
    margin-top: 10px;
    display: flex;
    gap: 8px;
  }

  #nf-app .nf-refresh {
    width: 100%;
    appearance: none;
    border: 0;
    border-radius: 8px;
    background: var(--nf-accent);
    color: white;
    padding: 9px 12px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity .15s ease, transform .05s ease;
  }

  #nf-app .nf-refresh:hover {
    opacity: .92;
  }

  #nf-app .nf-refresh:active {
    transform: translateY(1px);
  }

  #nf-app .nf-refresh:disabled {
    opacity: .5;
    cursor: wait;
  }

  #nf-app .nf-error {
    display: none;
    margin-top: 10px;
    padding: 9px 10px;
    color: var(--nf-danger);
    background: var(--nf-danger-bg);
    border: 1px solid #ffd5cf;
    border-radius: 8px;
    font-size: 11px;
    line-height: 1.4;
  }

  /* ---------- verrou local ---------- */

  #nf-app .nf-lock {
    display: none;
    position: absolute;
    top: 47px;
    right: 12px;
    z-index: 50;
    width: min(260px, calc(100% - 24px));
    padding: 12px;
    background: #fff;
    border: 1px solid var(--nf-border);
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(20,40,50,.16);
  }

  #nf-app .nf-lock.nf-open {
    display: block;
  }

  #nf-app .nf-lock-title {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 700;
  }

  #nf-app .nf-lock-row {
    display: flex;
    gap: 6px;
  }

  #nf-app .nf-lock input {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--nf-border);
    border-radius: 6px;
    padding: 7px 8px;
    font-size: 12px;
  }

  #nf-app .nf-mini-btn {
    appearance: none;
    border: 1px solid var(--nf-border);
    background: #fff;
    color: var(--nf-text);
    border-radius: 6px;
    padding: 6px 9px;
    font-size: 11px;
    cursor: pointer;
  }

  #nf-app .nf-mini-btn.nf-primary {
    background: var(--nf-accent);
    color: #fff;
    border-color: var(--nf-accent);
  }

  #nf-app .nf-lock-error {
    min-height: 15px;
    margin-top: 6px;
    color: var(--nf-danger);
    font-size: 10px;
  }

  /* ---------- administration ---------- */

  #nf-app .nf-admin {
    display: none;
    margin-top: 12px;
    background: #fff;
    border: 1px solid var(--nf-border);
    border-radius: 12px;
    box-shadow: 0 3px 14px rgba(20,40,50,.08);
    overflow: hidden;
  }

  #nf-app .nf-admin.nf-open {
    display: block;
  }

  #nf-app .nf-admin-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 13px 14px;
    background: #f8faf9;
    border-bottom: 1px solid var(--nf-border);
  }

  #nf-app .nf-admin-head strong {
    font-size: 14px;
  }

  #nf-app .nf-admin-body {
    padding: 14px;
  }

  #nf-app .nf-section-title {
    margin: 14px 0 8px;
    font-size: 12px;
    color: var(--nf-accent);
    text-transform: uppercase;
    letter-spacing: .04em;
  }

  #nf-app .nf-section-title:first-child {
    margin-top: 0;
  }

  #nf-app .nf-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px 10px;
  }

  #nf-app .nf-field {
    min-width: 0;
  }

  #nf-app .nf-field.nf-full {
    grid-column: 1 / -1;
  }

  #nf-app .nf-field label {
    display: block;
    margin-bottom: 4px;
    color: var(--nf-muted);
    font-size: 10px;
    font-weight: 700;
  }

  #nf-app .nf-field input,
  #nf-app .nf-field select {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--nf-border);
    border-radius: 6px;
    background: #fff;
    color: var(--nf-text);
    padding: 7px 8px;
    font-size: 12px;
  }

  #nf-app .nf-check {
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 30px;
    font-size: 11px;
    color: var(--nf-text);
  }

  #nf-app .nf-check input {
    width: auto;
  }

  #nf-app .nf-admin-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 14px;
  }

  #nf-app .nf-admin-message {
    min-height: 18px;
    margin-top: 8px;
    font-size: 11px;
    color: var(--nf-muted);
  }

  #nf-app .nf-source-badge {
    margin-top: 7px;
    font-size: 10px;
    color: var(--nf-muted);
  }

  @media (max-width: 520px) {
    #nf-app {
      margin: 10px 8px;
    }

    #nf-app .nf-head {
      padding: 14px 13px 9px;
    }

    #nf-app .nf-body {
      padding: 5px 13px 13px;
    }

    #nf-app .nf-stats,
    #nf-app .nf-form-grid {
      grid-template-columns: 1fr;
    }

    #nf-app .nf-stat.nf-present,
    #nf-app .nf-field.nf-full {
      grid-column: auto;
    }
  }


  /* =========================================================
     AFFICHAGE COMPACT + VALEURS CENTRÉES — v1.0.1
     ========================================================= */

  #nf-app {
    max-width: 430px;
    margin: 10px auto;
  }

  #nf-app .nf-card {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(20, 40, 50, .07);
  }

  #nf-app .nf-head {
    padding: 11px 12px 7px;
    gap: 8px;
  }

  #nf-app .nf-title {
    font-size: 17px;
  }

  #nf-app .nf-subtitle {
    margin-top: 2px;
    font-size: 11px;
  }

  #nf-app .nf-admin-trigger {
    padding: 2px 4px;
    font-size: 12px;
  }

  #nf-app .nf-body {
    padding: 4px 12px 11px;
  }

  #nf-app .nf-stats {
    gap: 7px;
  }

  #nf-app .nf-stat {
    min-height: 70px;
    padding: 9px 10px 8px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  #nf-app .nf-label {
    margin-bottom: 4px;
    font-size: 11px;
    text-align: center;
  }

  #nf-app .nf-value {
    width: 100%;
    font-size: 24px;
    line-height: 1;
    text-align: center;
  }

  #nf-app .nf-yesterday {
    width: 100%;
    margin-top: 4px;
    font-size: 10px;
    text-align: center;
  }

  #nf-app .nf-present {
    min-height: 66px;
  }

  #nf-app .nf-present .nf-label {
    margin-bottom: 4px;
  }

  #nf-app .nf-estimate {
    font-size: 9px;
  }

  #nf-app .nf-status {
    margin-top: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 10px;
    line-height: 1.35;
  }

  #nf-app .nf-actions {
    margin-top: 7px;
  }

  #nf-app .nf-refresh {
    width: auto;
    min-width: 160px;
    margin: 0 auto;
    padding: 7px 11px;
    border-radius: 6px;
    font-size: 12px;
  }

  #nf-app .nf-error {
    margin-top: 7px;
    padding: 7px 8px;
    border-radius: 6px;
    font-size: 10px;
  }

  #nf-app .nf-source-badge {
    margin-top: 5px;
    text-align: center;
    font-size: 9px;
  }

  /* Administration légèrement resserrée également */
  #nf-app .nf-admin {
    margin-top: 8px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(20,40,50,.07);
  }

  #nf-app .nf-admin-head {
    padding: 10px 11px;
  }

  #nf-app .nf-admin-body {
    padding: 11px;
  }

  #nf-app .nf-section-title {
    margin: 10px 0 6px;
    font-size: 11px;
  }

  #nf-app .nf-form-grid {
    gap: 7px 8px;
  }

  #nf-app .nf-field label {
    margin-bottom: 3px;
  }

  #nf-app .nf-field input,
  #nf-app .nf-field select {
    padding: 6px 7px;
    font-size: 11px;
  }

  #nf-app .nf-admin-actions {
    margin-top: 10px;
    gap: 6px;
  }

  @media (max-width: 520px) {
    #nf-app {
      max-width: none;
      margin: 7px 5px;
    }

    #nf-app .nf-head {
      padding: 10px 10px 6px;
    }

    #nf-app .nf-body {
      padding: 4px 10px 10px;
    }

    #nf-app .nf-stats {
      grid-template-columns: 1fr 1fr;
    }

    #nf-app .nf-stat.nf-present {
      grid-column: 1 / -1;
    }

    #nf-app .nf-refresh {
      min-width: 145px;
    }
  }
  #nf-app .nf-stat { position:relative; overflow:hidden; }
  #nf-app .nf-stat > * { position:relative; z-index:1; }
  #nf-app .nf-stat::before { content:""; position:absolute; inset:auto 0 0; height:var(--nf-fill-level,0%); background:var(--nf-fill-color,var(--nf-accent)); opacity:.17; z-index:0; transition:height .65s ease,background .3s ease; pointer-events:none; }
  #nf-app .nf-gauge-caption { display:block; width:100%; margin-top:5px; font-size:10px; color:var(--nf-muted); text-align:center; }
  #nf-app .nf-gauge-caption[hidden] { display:none; }
  @media (prefers-reduced-motion:reduce) { #nf-app .nf-stat::before { transition:none; } }
  #nf-app .nf-stat.nf-present { grid-column:auto; }
  #nf-app .nf-actions { width:fit-content; max-width:100%; margin:8px auto 0; gap:6px; align-items:center; }
  #nf-app .nf-actions .nf-refresh { width:auto; min-width:110px; margin:0; padding:7px 12px; }
  #nf-app .nf-chart-toggle { display:inline-flex; align-items:center; justify-content:center; flex:0 0 34px; width:34px; height:30px; padding:5px; margin:0; color:var(--nf-accent); border-color:#dce5df; background:var(--nf-accent-soft); }
  #nf-app .nf-chart-toggle[aria-expanded="true"] { background:var(--nf-accent); color:#fff; border-color:var(--nf-accent); }
  #nf-app #nf-last-update { background:none; border:0; border-radius:0; box-shadow:none; margin:5px 0 0; padding:0; font-size:10px; line-height:1.3; }
  #nf-app .nf-chart { margin-top:10px; padding:10px 8px; background:#fff; border:1px solid var(--nf-border); border-radius:8px; }
  #nf-app .nf-chart[hidden] { display:none; }
  #nf-app .nf-chart h3 { margin:0 0 4px; font-size:13px; text-align:center; }
  #nf-app .nf-chart-note, #nf-app .nf-chart-status { font-size:10px; color:var(--nf-muted); text-align:center; line-height:1.4; }
  #nf-app .nf-chart svg { display:block; width:100%; height:auto; margin-top:8px; }
  #nf-app .nf-chart-bar { fill:var(--nf-accent); }
  #nf-app .nf-chart-bar:hover { opacity:.75; }
  #nf-app .nf-chart-bar.nf-chart-today { opacity:.55; }
  #nf-app .nf-chart-controls { display:flex; align-items:center; justify-content:center; gap:7px; margin:8px 0; font-size:11px; }
  #nf-app .nf-chart-nav { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:6px; margin:8px 0; font-size:10px; }
  #nf-app .nf-chart-nav input { min-width:0; max-width:135px; border:1px solid var(--nf-border); border-radius:6px; padding:5px; background:#fff; color:var(--nf-text); font-size:11px; }
  #nf-app .nf-chart-nav input[hidden], #nf-app .nf-chart-nav label[hidden] { display:none; }
  #nf-app .nf-chart-nav button:disabled { opacity:.35; cursor:default; }
  #nf-app .nf-chart-controls select { border:1px solid var(--nf-border); border-radius:6px; padding:5px 22px 5px 7px; background:#fff; color:var(--nf-text); }
  #nf-app .nf-chart-table-wrap { max-height:260px; overflow:auto; }
  #nf-app .nf-chart-plot { position:relative; margin-top:7px; }
  #nf-app .nf-chart-scroll { overflow-x:auto; scrollbar-width:thin; }
  #nf-app .nf-chart-hit { cursor:help; outline:none; }
  #nf-app .nf-chart-hit:focus { stroke:var(--nf-accent); stroke-width:1.5; stroke-dasharray:3 3; }
  #nf-app .nf-chart-tooltip { position:relative; margin:8px auto 0; z-index:10; width:250px; max-width:calc(100% - 16px); padding:12px; background:#fff; color:var(--nf-text); border:1px solid var(--nf-border); border-top:3px solid var(--nf-accent); border-radius:10px; box-shadow:0 8px 28px rgba(20,40,50,.22); pointer-events:none; font-size:11px; }
  #nf-app .nf-chart-tooltip[hidden] { display:none; }
  #nf-app .nf-chart-tooltip-title { display:block; margin-bottom:8px; font-size:12px; line-height:1.35; }
  #nf-app .nf-chart-tooltip-row { display:flex; justify-content:space-between; gap:10px; padding:4px 0; border-bottom:1px solid #eef2f4; }
  #nf-app .nf-chart-tooltip-row strong { font-size:12px; }
  #nf-app .nf-chart-tooltip-info { margin-top:7px; color:var(--nf-muted); font-size:10px; line-height:1.4; }
  #nf-app .nf-chart-totals { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin:9px 0; }
  #nf-app .nf-chart-total { padding:8px 4px; border:1px solid var(--nf-border); border-radius:7px; background:var(--nf-bg); text-align:center; }
  #nf-app .nf-chart-total span { display:block; font-size:9px; color:var(--nf-muted); margin-bottom:4px; }
  #nf-app .nf-chart-total strong { display:block; font-size:15px; color:var(--nf-accent); }
  #nf-app .nf-chart details { margin-top:7px; font-size:10px; }
  #nf-app .nf-chart table { width:100%; border-collapse:collapse; margin-top:5px; font-size:10px; }
  #nf-app .nf-chart th, #nf-app .nf-chart td { padding:4px; border-bottom:1px solid var(--nf-border); text-align:right; }
  #nf-app .nf-chart th:first-child, #nf-app .nf-chart td:first-child { text-align:left; }
  `;
const HTML_TEXT = `<div id="nf-app">
<div class="nf-card">
<div class="nf-head">
<div class="nf-title-wrap">
<h2 class="nf-title" id="nf-title">Fr&eacute;quentation</h2>
<div class="nf-subtitle" id="nf-subtitle">Fréquentation du jour</div>
</div>
<button type="button" id="nf-admin-trigger" class="nf-admin-trigger" title="Param&egrave;tres" aria-label="Param&egrave;tres">⚙</button></div>
<div id="nf-lock" class="nf-lock" aria-hidden="true">
<div class="nf-lock-title">Administration</div>
<form id="nf-lock-form">
<div class="nf-lock-row"><input type="password" id="nf-lock-password" autocomplete="current-password" placeholder="Mot de passe" /> <button type="submit" class="nf-mini-btn nf-primary">Ouvrir</button> <button type="button" id="nf-lock-cancel" class="nf-mini-btn">&times;</button></div>
<div id="nf-lock-error" class="nf-lock-error"></div>
</form></div>
<div class="nf-body">
<div class="nf-stats">
<div class="nf-stat" id="nf-in-card"><span class="nf-label" id="nf-label-in">Entr&eacute;es</span> <span class="nf-value" id="nf-entrees">0</span> <span class="nf-yesterday" id="nf-entrees-yesterday">(Hier : 0)</span><span class="nf-gauge-caption" id="nf-in-gauge-caption" hidden></span></div>
<div class="nf-stat nf-present" id="nf-present-card"><span class="nf-label"> <span id="nf-label-present">Personnes pr&eacute;sentes</span> <span class="nf-estimate" id="nf-label-estimate"> &middot; estimation</span> </span> <span class="nf-value" id="nf-present">0</span><span class="nf-gauge-caption" id="nf-present-gauge-caption" hidden></span></div>
</div>
<div class="nf-error" id="nf-error-message"></div>
<div class="nf-actions" id="nf-refresh-wrap"><button class="nf-refresh" id="nf-refresh-button" type="button">Actualiser</button><button class="nf-mini-btn nf-chart-toggle" id="nf-chart-toggle" type="button" title="Afficher le graphique" aria-label="Afficher le graphique" aria-expanded="false" aria-controls="nf-chart"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 3v17h17"/><path d="m7 15 4-5 4 3 5-7"/></svg></button></div>
<div class="nf-status" id="nf-last-update">Aucune donn&eacute;e historique disponible</div>
<section id="nf-chart" class="nf-chart" hidden aria-labelledby="nf-chart-title">
<h3 id="nf-chart-title">Fréquentation des 7 derniers jours</h3>
<div class="nf-chart-controls"><label for="nf-chart-range">Période</label><select id="nf-chart-range"><option value="1">1 jour</option><option value="7" selected>7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option><option value="365">365 jours</option><option value="year">Année civile</option></select></div>
<div class="nf-chart-nav"><button id="nf-chart-prev" type="button" class="nf-mini-btn" aria-label="Période précédente" title="Période précédente">‹</button><label id="nf-chart-date-label" for="nf-chart-date">Jusqu’au</label><input id="nf-chart-date" type="date" /><label id="nf-chart-year-label" for="nf-chart-year" hidden>Année</label><input id="nf-chart-year" type="number" min="1900" hidden /><button id="nf-chart-next" type="button" class="nf-mini-btn" aria-label="Période suivante" title="Période suivante">›</button><button id="nf-chart-current" type="button" class="nf-mini-btn">Aujourd’hui</button></div>
<div id="nf-chart-note" class="nf-chart-note">Entrées par jour · aujourd’hui : comptage en cours</div>
<div id="nf-chart-content"></div>
<div id="nf-chart-status" class="nf-chart-status" role="status"></div>
</section>

</div>
</div>
<section id="nf-admin" class="nf-admin" aria-hidden="true">
<div class="nf-admin-head"><strong>Param&egrave;tres de fr&eacute;quentation</strong> <button type="button" id="nf-admin-close" class="nf-mini-btn">Fermer</button></div>
<div class="nf-admin-body">
<div class="nf-section-title">Connexion au compteur</div>
<div class="nf-form-grid">
<div class="nf-field nf-full"><label for="nf-cfg-mode">Mode de connexion</label><select id="nf-cfg-mode"><option value="worker">Cloudflare (configuration actuelle)</option><option value="direct">API Nedap directe</option><option value="koha">Relais du plugin Koha — clé côté serveur</option></select></div>
<div class="nf-field nf-full" id="nf-worker-field"><label for="nf-cfg-worker">URL du Worker</label> <input id="nf-cfg-worker" type="url" /></div>
<div class="nf-field nf-full nf-direct-field"><label for="nf-cfg-api-key">Clé API Nedap / Libnet</label><input id="nf-cfg-api-key" type="password" autocomplete="off" spellcheck="false" /><small id="nf-key-help">En mode direct, la clé est transmise aux navigateurs. Avec le relais Koha, elle reste sur le serveur.</small></div>
<div class="nf-field nf-full nf-direct-field"><label for="nf-cfg-display">Inclure les périodes sans données</label><select id="nf-cfg-display"><option value="NO">Non (recommandé)</option><option value="YES">Oui</option></select></div>
<div class="nf-field nf-full nf-direct-field"><small>Connexion CCInfo Libnet configurée automatiquement. Utiliser « Tester l’API » pour vérifier l’accès direct ; conserver Cloudflare si le serveur le bloque.</small></div>
<div class="nf-field nf-full nf-relay-field"><small id="nf-relay-status" role="status">La clé serveur doit être configurée par un administrateur Koha.</small><button type="button" id="nf-relay-clear" class="nf-mini-btn">Effacer la clé serveur</button><small>Le serveur Koha contacte Libnet. Les anciennes connexions restent disponibles. Une clé conservée dans les anciennes sauvegardes n’est pas effacée de ces sauvegardes.</small></div>
<div class="nf-field"><label for="nf-cfg-rcr">RCR</label> <input id="nf-cfg-rcr" type="text" /></div>
<div class="nf-field"><label for="nf-cfg-period">P&eacute;riode API</label> <input id="nf-cfg-period" type="text" /></div>
<div class="nf-field nf-worker-detail"><label for="nf-cfg-start-hour">D&eacute;but de journ&eacute;e &mdash; heure</label> <input id="nf-cfg-start-hour" type="number" min="0" max="23" /></div>
<div class="nf-field nf-worker-detail"><label for="nf-cfg-start-minute">D&eacute;but de journ&eacute;e &mdash; minute</label> <input id="nf-cfg-start-minute" type="number" min="0" max="59" /></div>
</div>
<div class="nf-section-title">Affichage</div>
<div class="nf-form-grid">
<div class="nf-field nf-full"><label for="nf-cfg-title">Titre</label> <input id="nf-cfg-title" type="text" /></div>
<div class="nf-field nf-full"><label for="nf-cfg-subtitle">Sous-titre</label> <input id="nf-cfg-subtitle" type="text" /></div>
<div class="nf-field"><label for="nf-cfg-label-in">Libell&eacute; entr&eacute;es</label> <input id="nf-cfg-label-in" type="text" /></div>
<div class="nf-field"><label for="nf-cfg-label-present">Libell&eacute; pr&eacute;sents</label> <input id="nf-cfg-label-present" type="text" /></div>
<div class="nf-field"><label for="nf-cfg-label-estimate">Mention estimation</label> <input id="nf-cfg-label-estimate" type="text" /></div>
<div class="nf-field"><label for="nf-cfg-accent">Couleur principale</label> <input id="nf-cfg-accent" type="color" /></div>
<div class="nf-field"><label for="nf-cfg-present-accent">Couleur pr&eacute;sents</label> <input id="nf-cfg-present-accent" type="color" /></div>
<div class="nf-field nf-full"><label class="nf-check"> <input id="nf-cfg-show-yesterday" type="checkbox" /> Afficher les valeurs d&rsquo;hier </label></div>
<div class="nf-field nf-full"><label class="nf-check"> <input id="nf-cfg-show-present" type="checkbox" /> Afficher l&rsquo;estimation des personnes pr&eacute;sentes </label></div>
<div class="nf-field nf-full"><label class="nf-check"> <input id="nf-cfg-clamp-present" type="checkbox" /> Ne jamais afficher une estimation n&eacute;gative </label></div>
<div class="nf-field nf-full"><label class="nf-check"> <input id="nf-cfg-show-refresh" type="checkbox" /> Afficher le bouton d&rsquo;actualisation manuelle </label></div>
</div>
<div class="nf-section-title">Niveaux de remplissage des cartes</div>
<div class="nf-form-grid">
<div class="nf-field nf-full"><label class="nf-check"><input id="nf-cfg-gauges-enabled" type="checkbox" /> Afficher les fonds de remplissage</label></div>
<div class="nf-field nf-full"><label for="nf-cfg-capacity">Capacité maximale de l’espace (personnes)</label><input id="nf-cfg-capacity" type="number" min="1" step="1" placeholder="À renseigner" /><small>Sans capacité renseignée, aucun niveau d’occupation n’est calculé.</small></div>
<div class="nf-field"><label for="nf-cfg-capacity-warning">Seuil orange (% de capacité)</label><input id="nf-cfg-capacity-warning" type="number" min="1" max="100" step="1" /></div>
<div class="nf-field"><label for="nf-cfg-capacity-critical">Seuil rouge (% de capacité)</label><input id="nf-cfg-capacity-critical" type="number" min="1" max="100" step="1" /></div>
</div>
<div class="nf-admin-actions"><button type="button" id="nf-admin-test" class="nf-mini-btn">Tester l&rsquo;API</button> <button type="button" id="nf-admin-defaults" class="nf-mini-btn">Valeurs d&rsquo;origine</button> <button type="button" id="nf-admin-save" class="nf-mini-btn nf-primary">Enregistrer</button></div>
<div id="nf-admin-message" class="nf-admin-message"></div>
</div>
</section>
</div>`;

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

    // Seule adaptation au script historique : le bouton de paramètres
    // n'est visible que pour les superlibrarians Koha.
    const adminTrigger = document.getElementById('nf-admin-trigger');
    if (adminTrigger && !window.PMKHomeWidgets?.isSuperlibrarian?.()) {
        adminTrigger.style.display = 'none';
    }







      /* =========================================================
         STOCKAGE KOHA
         ========================================================= */


      const CONFIG_COLLECTION = "frequencyCounter";
      const CONFIG_DOCUMENT = "config";

      /*
       * Verrou d’interface uniquement.
       * Ce mot de passe est visible dans le code source du navigateur.
       * Il ne constitue donc PAS une authentification forte.
       */
      const ADMIN_PASSWORD = "admin";
      const ADMIN_SESSION_KEY = "nfAdminUnlocked";

      /* =========================================================
         CONFIGURATION EMBARQUÉE
         Reprise exacte des paramètres du script de production.
         ========================================================= */

      const DEFAULT_CONFIG = {
        schemaVersion: 15,
        connectionMode: "worker",
        nedapDisplay: "NO",
        nedapApiKey: "",

        title: "Fréquentation",
        subtitle: "Fréquentation du jour",

        rcr: "",
        workerUrl: "",
        period: "DAY",

        dayStartHour: 1,
        dayStartMinute: 0,

        labels: {
          in: "Entrées",
          present: "Personnes présentes",
          estimate: "estimation"
        },

        display: {
          showYesterday: true,
          showPresent: true,
          clampPresentToZero: false,
          showRefreshButton: true
        },

        gauges: {
          enabled: true,
          capacity: 0,
          warningPercent: 80,
          criticalPercent: 95
        },

        appearance: {
          accent: "#2f7d5b",
          presentAccent: "#2f7d5b"
        }
      };

      const NEDAP_ENDPOINT = "https://api.libnet.online/CCinfo.php";

      // En mode direct historique, la clé est partagée dans la configuration à la demande de l’administrateur.
      // Le champ password masque l’affichage, sans constituer un chiffrement.
      let nedapApiKey = "";
      let relayState = null, relayLoading = null;
      const RELAY_ROOT = "/api/v1/contrib/pmk/nedap";
      const relayErrors = {
        configuration_changed: "La connexion serveur a été modifiée ailleurs. Fermez puis rouvrez les paramètres avant de réessayer.",
        key_required: "Renseignez une clé pour activer le relais Koha.",
        relay_not_configured: "La clé serveur du relais Koha n’est pas configurée.",
        rcr_not_configured: "Le RCR choisi ne correspond pas à celui enregistré pour le relais Koha.",
        invalid_interval: "Période trop longue ou invalide pour cette granularité API.",
        provider_authentication_failed: "Libnet refuse la clé ou l’accès au RCR.",
        provider_invalid_response: "Libnet a renvoyé des données de comptage illisibles.",
        provider_unavailable: "Libnet est indisponible ou le délai de réponse est dépassé.",
        superlibrarian_required: "Seul un administrateur Koha peut modifier la clé serveur."
      };
      async function relayRequest(path, options = {}) {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
        try {
          const response = await fetch(RELAY_ROOT + path, { credentials: "same-origin", cache: "no-store", redirect: "error", ...options, signal: controller.signal });
          const data = await response.json();
          if (!response.ok) throw new Error(relayErrors[data?.error] || `Relais Koha indisponible (HTTP ${response.status}).`);
          return data;
        } catch (error) {
          if (error?.name === "AbortError") throw new Error("Le relais Koha n’a pas répondu dans le délai prévu.");
          throw error;
        } finally { clearTimeout(timer); }
      }
      function showRelayState() {
        document.getElementById("nf-relay-status").textContent = relayState
          ? (relayState.hasKey ? `Clé serveur enregistrée pour le RCR ${relayState.rcr}. Laissez le champ vide pour la conserver.` : "Aucune clé serveur enregistrée.")
          : "État de la clé serveur non chargé.";
      }
      async function loadRelaySettings() {
        if (relayLoading) return relayLoading;
        relayLoading = relayRequest("/settings").then(data => { relayState = data; showRelayState(); return data; }).finally(() => { relayLoading = null; });
        return relayLoading;
      }
      function relayURL(from, to, period, display = "NO") {
        const url = new URL(RELAY_ROOT + "/counts", location.origin);
        for (const [name, value] of Object.entries({ rcr: currentConfig.rcr, from, to, period, display })) url.searchParams.set(name, value);
        return url.href;
      }
      function keyStorageKey(config) {
        return "nfNedapApiKey:" + NEDAP_ENDPOINT;
      }
      function loadNedapApiKey(config) {
        if (config.connectionMode === "koha") return "";
        if (typeof config.nedapApiKey === "string" && config.nedapApiKey.trim()) {
          return config.nedapApiKey.trim();
        }
        // Reprendre l’ancienne clé locale pour la partager au prochain enregistrement.
        try { return localStorage.getItem(keyStorageKey(config)) || ""; }
        catch { return ""; }
      }
      let currentConfig = structuredClone(DEFAULT_CONFIG);
      let db = null;
      let storageAvailable = false;
      let configSource = "Paramètres embarqués";
      let displayedToday = null;
      let displayedYesterday = null;

      /* =========================================================
         OUTILS
         ========================================================= */

      function deepMerge(base, extra) {
        if (!extra || typeof extra !== "object") {
          return structuredClone(base);
        }

        const result = structuredClone(base);

        Object.keys(extra).forEach(key => {
          const value = extra[key];

          if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            result[key] &&
            typeof result[key] === "object" &&
            !Array.isArray(result[key])
          ) {
            result[key] = deepMerge(result[key], value);
          } else if (value !== undefined) {
            result[key] = value;
          }
        });

        return result;
      }

      function clampInt(value, min, max, fallback) {
        const n = Number.parseInt(value, 10);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(Math.max(n, min), max);
      }

      function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        return `${year}${month}${day}${hours}${minutes}${seconds}`;
      }

      function getAPIDatesForDay(targetDate, isToday) {
        const start = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          clampInt(currentConfig.dayStartHour, 0, 23, 1),
          clampInt(currentConfig.dayStartMinute, 0, 59, 0),
          0
        );

        const end = isToday
          ? new Date()
          : new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate(),
              23,
              59,
              59
            );

        return {
          start: formatDate(start),
          end: formatDate(end)
        };
      }

      function buildApiUrl(targetDate, isToday) {
        const dates = getAPIDatesForDay(targetDate, isToday);
        const rcr = encodeURIComponent(String(currentConfig.rcr || "").trim());
        const period = encodeURIComponent(String(currentConfig.period || "DAY").trim());
        if (!["direct", "koha"].includes(currentConfig.connectionMode)) {
          const root = String(currentConfig.workerUrl || "").replace(/\/+$/, "");
          return `${root}/CCinfo/${rcr}/${dates.start}/${dates.end}/${period}`;
        }
        // CCInfo directe : intervalle [jour à minuit, lendemain à minuit[.
        // La réponse Libnet indique TO_DATE à 00:00:00 : la fin est exclusive.
        // Aucun en-tête personnalisé, conformément à la documentation Libnet.
        const formatDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const day = formatDay(targetDate);
        const nextDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
        if (currentConfig.connectionMode === "koha") return relayURL(day, formatDay(nextDay), currentConfig.period, currentConfig.nedapDisplay);
        const url = new URL(`${NEDAP_ENDPOINT}/${rcr}/${day}/${formatDay(nextDay)}/${period}`);
        url.searchParams.set("key", nedapApiKey);
        url.searchParams.set("display", currentConfig.nedapDisplay === "YES" ? "YES" : "NO");
        return url.href;
      }

      function calculateTotals(data) {
        let totalIn = 0;
        let totalOut = 0;

        if (!Array.isArray(data)) {
          throw new Error("Réponse API invalide : tableau attendu.");
        }

        data.forEach(site => {
          if (!site?.CCINFO || !Array.isArray(site.CCINFO)) return;

          site.CCINFO.forEach(zone => {
            if (!zone?.DATA || !Array.isArray(zone.DATA)) return;

            zone.DATA.forEach(entrance => {
              if (!entrance?.VALUES || !Array.isArray(entrance.VALUES)) return;

              entrance.VALUES.forEach(dateValues => {
                if (!dateValues || typeof dateValues !== "object") return;

                Object.values(dateValues).forEach(values => {
                  if (!values || typeof values !== "object") return;

                  const inValue = Number(values.IN);
                  const outValue = Number(values.OUT);

                  if (Number.isFinite(inValue)) totalIn += inValue;
                  if (Number.isFinite(outValue)) totalOut += outValue;
                });
              });
            });
          });
        });

        return {
          in: totalIn,
          out: totalOut
        };
      }

      function formatCount(value) {
        const n = Number(value);
        return Number.isFinite(n)
          ? new Intl.NumberFormat("fr-FR").format(n)
          : "0";
      }

      function showError(message) {
        const el = document.getElementById("nf-error-message");
        if (!el) return;
        el.textContent = message;
        el.style.display = "block";
      }

      function hideError() {
        const el = document.getElementById("nf-error-message");
        if (!el) return;
        el.textContent = "";
        el.style.display = "none";
      }

      function setStatus(text) {
        const el = document.getElementById("nf-last-update");
        setPlainStatus(el, text);
      }

      function setPlainStatus(el, text) {
        if (!el) return;
        delete el.dataset.nfUpdatedAt;
        el.removeAttribute("title");
        el.textContent = text;
      }

      function relativeUpdateText(timestamp, now = Date.now()) {
        const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
        if (seconds < 10) return "À l’instant";
        if (seconds < 60) return `Il y a ${seconds} secondes`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? "s" : ""}`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
          const remainder = minutes % 60;
          return `Il y a ${hours} heure${hours > 1 ? "s" : ""}${remainder ? ` et ${remainder} min` : ""}`;
        }
        const days = Math.floor(hours / 24);
        return `Il y a ${days} jour${days > 1 ? "s" : ""}`;
      }

      function setRelativeStatus(el, timestamp) {
        if (!el) return;
        const time = Number(timestamp);
        if (!Number.isFinite(time) || !Number.isFinite(new Date(time).getTime())) return;
        el.dataset.nfUpdatedAt = String(time);
        el.textContent = relativeUpdateText(time);
        el.title = `Dernière actualisation : ${new Date(time).toLocaleString("fr-FR")}`;
      }

      function refreshRelativeStatuses() {
        ["nf-last-update", "nf-chart-status"].forEach(id => {
          const el = document.getElementById(id);
          if (el?.dataset.nfUpdatedAt) el.textContent = relativeUpdateText(Number(el.dataset.nfUpdatedAt));
        });
      }

      function setAdminMessage(text, isError = false) {
        const el = document.getElementById("nf-admin-message");
        if (!el) return;

        el.textContent = text;
        el.style.color = isError ? "#b42318" : "";
      }

      /* =========================================================
         AFFICHAGE
         ========================================================= */

      function normalizePresentColor() {
        // Adapter aussi l’ancien bleu déjà enregistré dans Firebase.
        if (String(currentConfig.appearance.presentAccent || "").toLowerCase() === "#2f73b7") {
          currentConfig.appearance.presentAccent = currentConfig.appearance.accent || "#2f7d5b";
        }
      }

      function applyConfigToUI() {
        normalizePresentColor();
        if (currentConfig.subtitle === "Compteur d’entrées / sorties") currentConfig.subtitle = "Fréquentation du jour";
        const app = document.getElementById("nf-app");
        if (!app) return;

        app.style.setProperty("--nf-accent", currentConfig.appearance.accent || "#2f7d5b");
        app.style.setProperty("--nf-present-accent", currentConfig.appearance.presentAccent || "#2f7d5b");

        document.getElementById("nf-title").textContent =
          currentConfig.title || "Fréquentation";

        document.getElementById("nf-subtitle").textContent =
          currentConfig.subtitle || "";

        document.getElementById("nf-label-in").textContent =
          currentConfig.labels.in || "Entrées";

        document.getElementById("nf-label-present").textContent =
          currentConfig.labels.present || "Personnes présentes";

        document.getElementById("nf-label-estimate").textContent =
          currentConfig.labels.estimate
            ? ` · ${currentConfig.labels.estimate}`
            : "";

        document.getElementById("nf-entrees-yesterday").style.display =
          currentConfig.display.showYesterday ? "" : "none";

        document.getElementById("nf-present-card").style.display =
          currentConfig.display.showPresent ? "" : "none";

        document.getElementById("nf-refresh-button").style.display =
          currentConfig.display.showRefreshButton ? "" : "none";
        updateGaugeLevels();
      }

      function updateDisplay(inCount, outCount) {
        displayedToday = { in: Number(inCount), out: Number(outCount) };
        document.getElementById("nf-entrees").textContent = formatCount(inCount);

        let present = Number(inCount) - Number(outCount);

        if (currentConfig.display.clampPresentToZero) {
          present = Math.max(0, present);
        }

        document.getElementById("nf-present").textContent = formatCount(present);
        updateGaugeLevels();
      }

      function updateDisplayYesterday(inCount, outCount) {
        displayedYesterday = { in: Number(inCount), out: Number(outCount) };
        document.getElementById("nf-entrees-yesterday").textContent =
          `(Hier : ${formatCount(inCount)})`;

        updateGaugeLevels();
      }

      function gaugePercent(value, reference) {
        const current = Number(value), max = Number(reference);
        if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) return null;
        return Math.max(0, current) / max * 100;
      }

      function paintGauge(cardId, captionId, percent, text, color) {
        const card = document.getElementById(cardId);
        const caption = document.getElementById(captionId);
        if (!card || !caption) return;
        card.style.setProperty("--nf-fill-level", `${percent === null ? 0 : Math.min(100, Math.max(0, percent))}%`);
        card.style.setProperty("--nf-fill-color", color);
        caption.hidden = !currentConfig.gauges.enabled || !text;
        caption.textContent = text;
      }

      function updateGaugeLevels() {
        const config = currentConfig.gauges;
        if (!config) return;
        const enabled = config.enabled;
        const accent = currentConfig.appearance.accent || "#2f7d5b";
        ["in"].forEach(kind => {
          const percent = enabled && displayedToday && displayedYesterday
            ? gaugePercent(displayedToday[kind], displayedYesterday[kind]) : null;
          let text = "";
          if (enabled && displayedToday) {
            text = percent !== null
              ? `${percent.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} % d’hier`
              : displayedYesterday && displayedYesterday[kind] === 0
                ? "Hier : aucun comptage" : "Comparaison avec hier indisponible";
          }
          paintGauge(`nf-${kind}-card`, `nf-${kind}-gauge-caption`, percent, text, accent);
        });
        const present = displayedToday ? Math.max(0, displayedToday.in - displayedToday.out) : null;
        const percent = enabled && present !== null ? gaugePercent(present, config.capacity) : null;
        const color = percent !== null && percent >= config.criticalPercent ? "#b42318"
          : percent !== null && percent >= config.warningPercent ? "#c07b18"
          : currentConfig.appearance.presentAccent || accent;
        const text = !enabled ? "" : !config.capacity ? ""
          : percent === null ? "" : `${percent.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} % de ${formatCount(config.capacity)} places`;
        paintGauge("nf-present-card", "nf-present-gauge-caption", percent, text, color);
      }


      /* =========================================================
         CACHE LOCAL
         ========================================================= */

      const CACHE_KEY = "nfLastCount";

      function saveToLocalStorage(totalsToday, totalsYesterday = null) {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            today: totalsToday,
            yesterday: totalsYesterday,
            timestamp: Date.now()
          })
        );
      }

      function loadFromLocalStorage() {
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (!raw) {
            setStatus("Aucune donnée historique disponible");
            return;
          }

          const saved = JSON.parse(raw);

          if (saved?.today) {
            updateDisplay(saved.today.in, saved.today.out);
          }

          if (saved?.yesterday) {
            updateDisplayYesterday(saved.yesterday.in, saved.yesterday.out);
          }

          if (saved?.timestamp) {
            setRelativeStatus(document.getElementById("nf-last-update"), saved.timestamp);
          }
        } catch {
          setStatus("Données locales indisponibles");
        }
      }

      /* ---------- Historique : cache local par plage, sans clé API ---------- */
      const WEEK_CACHE_TTL = 5 * 60 * 1000;
      let weekRequest = null;
      let chartRangeDays = 7;
      let chartScope = "days";
      let chartEndDate = null;
      let chartYear = null;

      function formatWeekDay(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      }

      function weekDays(now = new Date(), length = chartRangeDays) {
        return Array.from({ length }, (_, index) => {
          const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - length + 1 + index);
          return { date: formatWeekDay(date), in: 0, out: 0 };
        });
      }

      function parseHistoryDate(value) {
        const match = typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return formatWeekDay(date) === value ? date : null;
      }

      function chartDays(now = new Date()) {
        if (chartScope !== "year") return weekDays(parseHistoryDate(chartEndDate) || now, chartRangeDays);
        const year = chartYear || now.getFullYear();
        const end = year === now.getFullYear()
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(year, 11, 31);
        const days = [];
        // Avancer par dates civiles, sans durée fixe, pour les changements d’heure.
        for (let date = new Date(year, 0, 1); date <= end; date.setDate(date.getDate() + 1)) {
          days.push({ date: formatWeekDay(date), in: 0, out: 0 });
        }
        return days;
      }

      function weekCacheKey(days = chartDays()) {
        return "nfHistoryCounts:v3:" + JSON.stringify([
          currentConfig.connectionMode || "worker",
          currentConfig.connectionMode === "direct" ? NEDAP_ENDPOINT : currentConfig.workerUrl,
          String(currentConfig.rcr || "").trim(),
          days[0].date, days[days.length - 1].date,
          chartScope
        ]);
      }

      function updateHistoryControls(days = chartDays()) {
        const today = formatWeekDay(new Date());
        const annual = chartScope === "year";
        const date = document.getElementById("nf-chart-date");
        const year = document.getElementById("nf-chart-year");
        date.hidden = annual; date.max = today; date.value = days[days.length - 1].date;
        year.hidden = !annual; year.max = new Date().getFullYear(); year.value = chartYear || new Date().getFullYear();
        document.getElementById("nf-chart-date-label").hidden = annual;
        document.getElementById("nf-chart-date-label").textContent = chartRangeDays === 1 ? "Date" : "Jusqu’au";
        document.getElementById("nf-chart-year-label").hidden = !annual;
        document.getElementById("nf-chart-next").disabled = annual
          ? Number(year.value) >= new Date().getFullYear() : days[days.length - 1].date >= today;
        document.getElementById("nf-chart-prev").disabled = annual && Number(year.value) <= 1900;
        document.getElementById("nf-chart-current").textContent = annual ? "Année actuelle" : "Aujourd’hui";
        document.getElementById("nf-chart-title").textContent = annual
          ? `Fréquentation en ${year.value}` : `Fréquentation sur ${chartRangeDays} jour${chartRangeDays > 1 ? "s" : ""}`;
        const ongoing = days[days.length - 1].date === today;
        document.getElementById("nf-chart-note").textContent = (annual || days.length > 90)
          ? "Entrées par mois" + (ongoing ? " · période actuelle en cours" : "")
          : days.length > 30 ? "Entrées par tranches de 7 jours" + (ongoing ? " · période actuelle en cours" : "")
          : "Entrées par jour" + (ongoing ? " · aujourd’hui : comptage en cours" : "");
      }

      function refreshHistorySelection() {
        updateHistoryControls();
        document.getElementById("nf-chart-content").replaceChildren();
        loadWeekChart().catch(() => {});
      }

      function moveHistoryPeriod(direction) {
        const now = new Date();
        if (chartScope === "year") {
          chartYear = Math.max(1900, Math.min(now.getFullYear(), (chartYear || now.getFullYear()) + direction));
        } else {
          const anchor = parseHistoryDate(chartEndDate) || new Date(now.getFullYear(), now.getMonth(), now.getDate());
          anchor.setDate(anchor.getDate() + direction * chartRangeDays);
          chartEndDate = formatWeekDay(anchor) >= formatWeekDay(now) ? null : formatWeekDay(anchor);
        }
        refreshHistorySelection();
      }

      function buildWeekApiUrl(days) {
        const rcr = encodeURIComponent(String(currentConfig.rcr || "").trim());
        const last = days[days.length - 1].date.split("-").map(Number);
        const next = formatWeekDay(new Date(last[0], last[1] - 1, last[2] + 1));
        if (currentConfig.connectionMode === "koha") return relayURL(days[0].date, next, "DAY");
        if (currentConfig.connectionMode === "direct") {
          const url = new URL(`${NEDAP_ENDPOINT}/${rcr}/${days[0].date}/${next}/DAY`);
          url.searchParams.set("key", nedapApiKey);
          url.searchParams.set("display", "NO");
          return url.href;
        }
        const root = String(currentConfig.workerUrl || "").replace(/\/+$/, "");
        const start = days[0].date.replace(/-/g, "") + "000000";
        const end = days[days.length - 1].date.replace(/-/g, "") + "235959";
        return `${root}/CCinfo/${rcr}/${start}/${end}/DAY`;
      }

      function calculateDailyTotals(data, days) {
        if (!Array.isArray(data)) throw new Error("Réponse de l’historique invalide : tableau attendu.");
        const totals = days.map(day => ({ ...day, in: 0, out: 0 }));
        const byDay = new Map(totals.map(day => [day.date, day]));
        let valueCount = 0;
        let recognized = 0;
        data.forEach(site => {
          (Array.isArray(site?.CCINFO) ? site.CCINFO : []).forEach(zone => {
            (Array.isArray(zone?.DATA) ? zone.DATA : []).forEach(entrance => {
              (Array.isArray(entrance?.VALUES) ? entrance.VALUES : []).forEach(dateValues => {
                if (!dateValues || typeof dateValues !== "object") return;
                Object.entries(dateValues).forEach(([key, values]) => {
                  if (!values || typeof values !== "object") return;
                  valueCount++;
                  const match = key.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:$|[ T\d])/);
                  if (!match) return;
                  recognized++;
                  const day = byDay.get(`${match[1]}-${match[2]}-${match[3]}`);
                  if (!day) return;
                  const inside = Number(values.IN), outside = Number(values.OUT);
                  if (Number.isFinite(inside)) day.in += inside;
                  if (Number.isFinite(outside)) day.out += outside;
                });
              });
            });
          });
        });
        if (valueCount && !recognized) throw new Error("Format des dates de comptage non reconnu.");
        return totals;
      }

      function readWeekCache(key, days) {
        try {
          const saved = JSON.parse(localStorage.getItem(key) || "null");
          if (!saved || !Array.isArray(saved.days) || saved.days.length !== days.length || !Number.isFinite(saved.timestamp)) return null;
          if (!saved.days.every((day, i) => day.date === days[i].date && Number.isFinite(day.in) && Number.isFinite(day.out))) return null;
          return saved;
        } catch { return null; }
      }

      function groupHistoryDays(days) {
        if (days.length <= 30 && chartScope !== "year") return days.map(day => ({ ...day, end: day.date }));
        const groups = [];
        days.forEach((day, index) => {
          const id = chartScope === "year" || days.length > 90 ? day.date.slice(0, 7) : Math.floor(index / 7);
          let group = groups[groups.length - 1];
          if (!group || group.id !== id) {
            group = { id, date: day.date, end: day.date, in: 0, out: 0 };
            groups.push(group);
          }
          group.end = day.date;
          group.in += day.in;
          group.out += day.out;
        });
        return groups;
      }

      function renderWeekChart(saved) {
        const host = document.getElementById("nf-chart-content");
        host.replaceChildren();
        const groups = groupHistoryDays(saved.days);
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        const chartWidth = groups.length > 14 ? groups.length * 30 + 42 : 392;
        svg.setAttribute("viewBox", `0 0 ${chartWidth} 190`);
        svg.setAttribute("role", "group");
        svg.setAttribute("aria-label", "Comptages par période, accessibles au clavier ou au survol");
        if (groups.length > 14) svg.style.minWidth = `${chartWidth}px`;
        const plot = document.createElement("div"); plot.className = "nf-chart-plot";
        const scroll = document.createElement("div"); scroll.className = "nf-chart-scroll";
        scroll.appendChild(svg); plot.appendChild(scroll);
        const tooltip = document.createElement("div");
        tooltip.className = "nf-chart-tooltip"; tooltip.hidden = true;
        tooltip.id = "nf-chart-tooltip"; tooltip.setAttribute("role", "tooltip");
        plot.appendChild(tooltip);
        let activeHit = null;
        const totalIn = saved.days.reduce((sum, day) => sum + day.in, 0);
        const fullDate = day => {
          const parts = day.split("-").map(Number);
          return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        };
        function hideTooltip() {
          if (activeHit) activeHit.removeAttribute("aria-describedby");
          tooltip.hidden = true; activeHit = null;
        }
        function showTooltip(hit, group, current) {
          if (activeHit && activeHit !== hit) activeHit.removeAttribute("aria-describedby");
          activeHit = hit; tooltip.replaceChildren();
          const title = document.createElement("strong"); title.className = "nf-chart-tooltip-title";
          title.textContent = group.date === group.end ? fullDate(group.date) : `Du ${fullDate(group.date)} au ${fullDate(group.end)}`;
          tooltip.appendChild(title);
          const countDays = saved.days.filter(day => day.date >= group.date && day.date <= group.end).length;
          const metrics = [
            ["Entrées", formatCount(group.in)],
            ["Moyenne / jour", formatCount(Math.round(group.in / Math.max(1, countDays)))]
          ];
          metrics.forEach(([label, value]) => {
            const row = document.createElement("div"); row.className = "nf-chart-tooltip-row";
            const caption = document.createElement("span"); caption.textContent = label;
            const number = document.createElement("strong"); number.textContent = value;
            row.appendChild(caption); row.appendChild(number); tooltip.appendChild(row);
          });
          if (current) {
            const info = document.createElement("div"); info.className = "nf-chart-tooltip-info";
            info.textContent = "Période en cours"; tooltip.appendChild(info);
          }
          tooltip.hidden = false;
          hit.setAttribute("aria-describedby", tooltip.id);
          const outer = plot.getBoundingClientRect();
          const anchor = hit.getBoundingClientRect();
          const gap = 10;
          const rightSpace = outer.right - anchor.right - gap;
          const leftSpace = anchor.left - outer.left - gap;
          // Toujours hors de la colonne pointée, même au centre ou au bord du widget.
          if (Math.max(rightSpace, leftSpace) >= 160) {
            const right = rightSpace >= leftSpace;
            tooltip.style.position = "absolute";
            tooltip.style.margin = "0";
            tooltip.style.width = `${Math.min(250, right ? rightSpace : leftSpace)}px`;
            const tip = tooltip.getBoundingClientRect();
            tooltip.style.left = `${right ? anchor.right - outer.left + gap : anchor.left - outer.left - gap - tip.width}px`;
            tooltip.style.top = "8px";
          } else {
            // Écran étroit : encart sous le graphique, sans superposition.
            tooltip.style.position = "relative";
            tooltip.style.margin = "8px auto 0";
            tooltip.style.width = "250px";
            tooltip.style.left = "auto";
            tooltip.style.top = "auto";
          }
        }
        scroll.addEventListener("scroll", hideTooltip, { passive: true });
        plot.addEventListener("keydown", event => { if (event.key === "Escape") hideTooltip(); });
        const max = Math.max(1, ...groups.map(group => group.in));
        function node(name, attrs, label) {
          const el = document.createElementNS(ns, name);
          Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
          if (label !== undefined) el.textContent = label;
          svg.appendChild(el);
          return el;
        }
        [0, 0.5, 1].forEach(fraction => {
          const y = 145 - 110 * fraction;
          node("line", { x1: 38, x2: chartWidth - 4, y1: y, y2: y, stroke: "#dce4e8", "stroke-dasharray": fraction ? "3 3" : "none" });
          node("text", { x: 33, y: y + 3, "text-anchor": "end", "font-size": 9, fill: "#71808b" }, formatCount(Math.round(max * fraction)));
        });
        const step = (chartWidth - 42) / groups.length;
        const width = Math.min(31, step * 0.7);
        const every = 1;
        const shortDate = day => day.slice(8, 10) + "/" + day.slice(5, 7);
        groups.forEach((group, index) => {
          const x = 38 + index * step + (step - width) / 2;
          const height = Math.max(0, group.in / max * 110);
          const current = group.date <= formatWeekDay(new Date()) && group.end >= formatWeekDay(new Date());
          const bar = node("rect", { x, y: 145 - height, width, height, rx: 2, class: "nf-chart-bar" + (current ? " nf-chart-today" : "") });
          node("text", { x: x + width / 2, y: 138 - height, "text-anchor": "middle", "font-size": groups.length > 10 ? 9 : 10, fill: "#24313a" }, formatCount(group.in));
          const hit = node("rect", { x: 38 + index * step, y: 20, width: step, height: 127, fill: "transparent", class: "nf-chart-hit", tabindex: 0, role: "img", "aria-label": `${group.date}${group.end !== group.date ? " au " + group.end : ""} : ${formatCount(group.in)} entrées${current ? ", en cours" : ""}` });
          hit.addEventListener("pointerenter", event => { if (event.pointerType !== "touch") showTooltip(hit, group, current); });
          hit.addEventListener("pointerleave", () => { if (document.activeElement !== hit) hideTooltip(); });
          hit.addEventListener("focus", () => showTooltip(hit, group, current));
          hit.addEventListener("blur", hideTooltip);
          hit.addEventListener("click", () => showTooltip(hit, group, current));
          if (index % every !== 0) return;
          const parts = group.date.split("-").map(Number);
          const date = new Date(parts[0], parts[1] - 1, parts[2]);
          let label, second;
          if (chartScope === "year" || saved.days.length > 90) {
            label = date.toLocaleDateString("fr-FR", { month: "short" });
            second = String(parts[0]);
          } else if (saved.days.length > 30) {
            label = shortDate(group.date);
            second = "→ " + shortDate(group.end);
          } else {
            label = saved.days.length <= 7 ? date.toLocaleDateString("fr-FR", { weekday: "short" }) : shortDate(group.date);
            second = saved.days.length <= 7 ? shortDate(group.date) : "";
          }
          node("text", { x: x + width / 2, y: 160, "text-anchor": "middle", "font-size": groups.length > 10 ? 8 : 10, fill: "#71808b" }, label);
          if (second) node("text", { x: x + width / 2, y: 174, "text-anchor": "middle", "font-size": 8, fill: "#71808b" }, second);
        });
        host.appendChild(plot);
        if (groups.length > 14) {
          const hint = document.createElement("div"); hint.className = "nf-chart-note";
          hint.textContent = "Faites défiler le graphique horizontalement pour voir toutes les dates.";
          host.appendChild(hint);
        }
        const summary = document.createElement("div");
        summary.className = "nf-chart-note";
        summary.textContent = `Du ${shortDate(saved.days[0].date)}/${saved.days[0].date.slice(0, 4)} au ${shortDate(saved.days[saved.days.length - 1].date)}/${saved.days[saved.days.length - 1].date.slice(0, 4)} · ${formatCount(saved.days.reduce((sum, day) => sum + day.in, 0))} entrées`;
        host.appendChild(summary);
        const totals = document.createElement("div"); totals.className = "nf-chart-totals";
        [["Total entrées", totalIn], ["Moyenne / jour", Math.round(totalIn / saved.days.length)]].forEach(([label, value]) => {
          const card = document.createElement("div"); card.className = "nf-chart-total";
          const caption = document.createElement("span"); caption.textContent = label;
          const number = document.createElement("strong"); number.textContent = formatCount(value);
          card.appendChild(caption); card.appendChild(number); totals.appendChild(card);
        });
        host.appendChild(totals);
        const note = document.createElement("div");
        note.className = "nf-chart-note";
        note.textContent = "Moyenne des entrées sur tous les jours de la plage, jours sans comptage inclus. Une date absente de l’API est affichée à 0.";
        host.appendChild(note);
        const details = document.createElement("details");
        const heading = document.createElement("summary");
        heading.textContent = "Voir les chiffres quotidiens";
        details.appendChild(heading);
        const table = document.createElement("table");
        const thead = table.createTHead();
        const row = thead.insertRow();
        ["Date", "Entrées"].forEach(label => {
          const th = document.createElement("th"); th.scope = "col"; th.textContent = label; row.appendChild(th);
        });
        const tbody = table.createTBody();
        saved.days.forEach((day, index) => {
          const row = tbody.insertRow();
          [day.date.split("-").reverse().join("/") + (day.date === formatWeekDay(new Date()) ? " (en cours)" : ""), formatCount(day.in)].forEach(label => { row.insertCell().textContent = label; });
        });
        const wrap = document.createElement("div");
        wrap.className = "nf-chart-table-wrap";
        wrap.appendChild(table); details.appendChild(wrap); host.appendChild(details);
      }

      async function loadWeekChart(options = {}) {
        const days = chartDays();
        updateHistoryControls(days);
        const key = weekCacheKey(days);
        const status = document.getElementById("nf-chart-status");
        const cached = readWeekCache(key, days);
        if (cached) {
          renderWeekChart(cached);
          setRelativeStatus(status, cached.timestamp);
          if (!options.force && Date.now() - cached.timestamp >= 0 && Date.now() - cached.timestamp < WEEK_CACHE_TTL) return;
        } else {
          document.getElementById("nf-chart-content").replaceChildren();
        }
        if (weekRequest?.key === key && weekRequest.day === days[days.length - 1].date) return weekRequest.promise;
        setPlainStatus(status, cached ? "Actualisation du graphique…" : "Chargement de la période…");
        const request = { key, day: days[days.length - 1].date, promise: null };
        request.promise = (async () => {
          try {
            const data = await fetchJson(buildWeekApiUrl(days));
            const saved = { days: calculateDailyTotals(data, days), timestamp: Date.now() };
            if (key !== weekCacheKey()) return;
            try { localStorage.setItem(key, JSON.stringify(saved)); } catch {}
            renderWeekChart(saved);
            setRelativeStatus(status, saved.timestamp);
          } catch (error) {
            if (key === weekCacheKey()) {
              setPlainStatus(status, (cached ? "Données en cache conservées. " : "") + (error?.message || "Graphique indisponible."));
            }
          } finally {
            if (weekRequest === request) weekRequest = null;
          }
        })();
        weekRequest = request;
        return request.promise;
      }

      /* =========================================================
         API
         ========================================================= */

      async function fetchJson(url) {
        if (currentConfig.connectionMode === "koha") {
          const parsed = new URL(url, location.origin);
          if (parsed.origin !== location.origin || parsed.pathname !== RELAY_ROOT + "/counts") throw new Error("Destination du relais invalide.");
          return relayRequest("/counts" + parsed.search);
        }
        const direct = currentConfig.connectionMode === "direct";
        if (direct) {
          validateConfig(currentConfig);
          if (!nedapApiKey) throw new Error("Renseigner la clé API Nedap dans les paramètres.");
        }
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
        try {
          const response = await fetch(url, { method: "GET", cache: "no-store", signal: controller.signal,
            ...(direct ? { credentials: "omit", redirect: "error" } : {}) });
          if (!response.ok) throw new Error(response.status === 401 ? "Clé API invalide" : response.status === 402 ? "Aucun RCR accessible" : `Erreur HTTP ${response.status}`);
          return await response.json();
        } catch (error) {
          if (error?.name === "AbortError") throw new Error("Le compteur n’a pas répondu dans le délai prévu.");
          if (error instanceof TypeError) throw new Error(direct
            ? "Connexion directe Nedap impossible : vérifier le réseau et l’autorisation CORS, ou choisir le relais Koha."
            : "Connexion au Worker impossible : vérifier l’URL et le réseau.");
          throw error;
        } finally { clearTimeout(timer); }
      }

      async function fetchAllCounts(options = {}) {
        const button = document.getElementById("nf-refresh-button");
        const silent = Boolean(options.silent);

        try {
          hideError();

          if (button && !silent) {
            button.disabled = true;
            button.textContent = "Actualisation en cours…";
          }

          const now = new Date();

          const [dataToday, dataYesterdayResult] = await Promise.all([
            fetchJson(buildApiUrl(now, true)),
            (async () => {
              if (!currentConfig.display.showYesterday && !currentConfig.gauges.enabled) return null;

              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);

              try {
                return await fetchJson(buildApiUrl(yesterday, false));
              } catch {
                return null;
              }
            })()
          ]);

          const totalsToday = calculateTotals(dataToday);

          let totalsYesterday = null;

          if (dataYesterdayResult) {
            totalsYesterday = calculateTotals(dataYesterdayResult);
          }

          updateDisplay(totalsToday.in, totalsToday.out);

          if (totalsYesterday) {
            updateDisplayYesterday(totalsYesterday.in, totalsYesterday.out);
          } else {
            displayedYesterday = null;
            document.getElementById("nf-entrees-yesterday").textContent = "(Hier : indisponible)";
            updateGaugeLevels();
          }

          saveToLocalStorage(totalsToday, totalsYesterday);
          if (!document.getElementById("nf-chart").hidden) {
            loadWeekChart({ force: true }).catch(() => {});
          }

          setRelativeStatus(document.getElementById("nf-last-update"), now.getTime());

          return {
            today: totalsToday,
            yesterday: totalsYesterday
          };
        } catch (error) {
          showError(error?.message || "Erreur lors de la récupération des données.");
          throw error;
        } finally {
          if (button && !silent) {
            button.disabled = false;
            button.textContent = "Actualiser";
          }
        }
      }

      /* =========================================================
         STOCKAGE KOHA
         ========================================================= */

      function initStorage() {
        try {
          db = createDatabase('frequency');
          storageAvailable = true;
          return true;
        } catch {
          storageAvailable = false;
          db = null;
          return false;
        }
      }

      // Interface commune PMK : conservation intégrale du format Firestore historique.
      // L'adaptateur ne change pas l'authentification ni les autorisations existantes.
      const frequencyStore = window.PMKHomeWidgets.storage.register('frequency-nedap/config', {
        read: () => getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOCUMENT)),
        write: (payload, options) => setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOCUMENT), payload, options)
      });

      async function loadConfigFromStorage() {
        if (!storageAvailable || !db) {
          currentConfig = structuredClone(DEFAULT_CONFIG);
          configSource = "paramètres embarqués";
          return;
        }

        try {
          const snap = await frequencyStore.read();

          if (!snap.exists()) {
            currentConfig = structuredClone(DEFAULT_CONFIG);
            configSource = "paramètres embarqués";
            return;
          }

          const saved = snap.data()?.config;

          if (!saved || typeof saved !== "object") {
            currentConfig = structuredClone(DEFAULT_CONFIG);
            configSource = "paramètres embarqués";
            return;
          }

          currentConfig = deepMerge(DEFAULT_CONFIG, saved);
          configSource = "Koha";
        } catch {
          currentConfig = structuredClone(DEFAULT_CONFIG);
          configSource = "paramètres embarqués";
        }
      }

      async function saveConfigToStorage(config) {
        if (!storageAvailable || !db) {
          throw new Error("Le stockage Koha est indisponible.");
        }

        await frequencyStore.write(
          {
            config,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      }

      /* =========================================================
         ADMINISTRATION LOCALE
         ========================================================= */

      function adminUnlocked() {
        return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
      }

      function showLock() {
        if (adminUnlocked()) {
          openAdmin();
          return;
        }

        const lock = document.getElementById("nf-lock");
        lock.classList.add("nf-open");
        lock.setAttribute("aria-hidden", "false");

        document.getElementById("nf-lock-error").textContent = "";
        const input = document.getElementById("nf-lock-password");
        input.value = "";
        input.focus();
      }

      function hideLock() {
        const lock = document.getElementById("nf-lock");
        lock.classList.remove("nf-open");
        lock.setAttribute("aria-hidden", "true");
        document.getElementById("nf-lock-error").textContent = "";
      }

      function openAdmin() {
        hideLock();

        const admin = document.getElementById("nf-admin");
        const trigger = document.getElementById("nf-admin-trigger");

        fillAdminForm();
        if (window.PMKHomeWidgets?.isSuperlibrarian?.()) loadRelaySettings().catch(error => { document.getElementById("nf-relay-status").textContent = error.message; });

        admin.classList.add("nf-open");
        admin.setAttribute("aria-hidden", "false");
        trigger.classList.add("nf-active");
      }

      function closeAdmin() {
        const admin = document.getElementById("nf-admin");
        const trigger = document.getElementById("nf-admin-trigger");

        admin.classList.remove("nf-open");
        admin.setAttribute("aria-hidden", "true");
        trigger.classList.remove("nf-active");
      }

      function updateConnectionFields() {
        const mode = document.getElementById("nf-cfg-mode").value, api = mode !== "worker";
        document.getElementById("nf-worker-field").style.display = api ? "none" : "";
        document.querySelectorAll("#nf-app .nf-direct-field").forEach(el => { el.style.display = api ? "" : "none"; });
        document.querySelectorAll("#nf-app .nf-worker-detail").forEach(el => { el.style.display = api ? "none" : ""; });
        document.querySelectorAll("#nf-app .nf-relay-field").forEach(el => { el.style.display = mode === "koha" ? "" : "none"; });
        document.getElementById("nf-key-help").textContent = mode === "koha"
          ? "Clé conservée sur le serveur Koha. Un champ vide conserve la clé déjà enregistrée ; une nouvelle clé la remplace."
          : "En mode direct, la clé est enregistrée dans la configuration et transmise aux navigateurs.";
      }

      function fillAdminForm() {
        normalizePresentColor();
        document.getElementById("nf-cfg-mode").value = currentConfig.connectionMode || "worker";
        document.getElementById("nf-cfg-api-key").value = nedapApiKey || loadNedapApiKey(currentConfig);
        document.getElementById("nf-cfg-display").value = currentConfig.nedapDisplay === "YES" ? "YES" : "NO";
        updateConnectionFields();
        document.getElementById("nf-cfg-worker").value = currentConfig.workerUrl || "";
        document.getElementById("nf-cfg-rcr").value = currentConfig.rcr || "";
        document.getElementById("nf-cfg-period").value = currentConfig.period || "DAY";
        document.getElementById("nf-cfg-start-hour").value = currentConfig.dayStartHour ?? 1;
        document.getElementById("nf-cfg-start-minute").value = currentConfig.dayStartMinute ?? 0;

        document.getElementById("nf-cfg-title").value = currentConfig.title || "";
        document.getElementById("nf-cfg-subtitle").value = currentConfig.subtitle || "";

        document.getElementById("nf-cfg-label-in").value = currentConfig.labels.in || "";
        document.getElementById("nf-cfg-label-present").value = currentConfig.labels.present || "";
        document.getElementById("nf-cfg-label-estimate").value = currentConfig.labels.estimate || "";

        document.getElementById("nf-cfg-accent").value = currentConfig.appearance.accent || "#2f7d5b";
        document.getElementById("nf-cfg-present-accent").value =
          currentConfig.appearance.presentAccent || "#2f7d5b";

        document.getElementById("nf-cfg-show-yesterday").checked =
          Boolean(currentConfig.display.showYesterday);

        document.getElementById("nf-cfg-show-present").checked =
          Boolean(currentConfig.display.showPresent);

        document.getElementById("nf-cfg-clamp-present").checked =
          Boolean(currentConfig.display.clampPresentToZero);

        document.getElementById("nf-cfg-show-refresh").checked =
          Boolean(currentConfig.display.showRefreshButton);

        document.getElementById("nf-cfg-gauges-enabled").checked = currentConfig.gauges.enabled;
        document.getElementById("nf-cfg-capacity").value = currentConfig.gauges.capacity || "";
        document.getElementById("nf-cfg-capacity-warning").value = currentConfig.gauges.warningPercent;
        document.getElementById("nf-cfg-capacity-critical").value = currentConfig.gauges.criticalPercent;

        setAdminMessage(
          storageAvailable
            ? `Configuration actuellement chargée depuis : ${configSource}.`
            : "Stockage Koha indisponible : les valeurs embarquées sont utilisées."
        );
      }

      function readAdminForm() {
        const config = structuredClone(currentConfig);

        config.connectionMode = document.getElementById("nf-cfg-mode").value;
        config.schemaVersion = 15;
        config.nedapApiKey = document.getElementById("nf-cfg-api-key").value.trim();
        config.nedapDisplay = document.getElementById("nf-cfg-display").value;
        delete config.nedapApiUrl;
        delete config.nedapAuthMode;
        delete config.nedapAuthName;
        config.workerUrl = document.getElementById("nf-cfg-worker").value.trim();
        config.rcr = document.getElementById("nf-cfg-rcr").value.trim();
        config.period = document.getElementById("nf-cfg-period").value.trim() || "DAY";

        config.dayStartHour = clampInt(
          document.getElementById("nf-cfg-start-hour").value,
          0,
          23,
          1
        );

        config.dayStartMinute = clampInt(
          document.getElementById("nf-cfg-start-minute").value,
          0,
          59,
          0
        );

        config.title = document.getElementById("nf-cfg-title").value.trim() || "Fréquentation";
        config.subtitle = document.getElementById("nf-cfg-subtitle").value.trim();

        config.labels.in = document.getElementById("nf-cfg-label-in").value.trim() || "Entrées";
        delete config.labels.out;
        config.labels.present =
          document.getElementById("nf-cfg-label-present").value.trim() || "Personnes présentes";
        config.labels.estimate = document.getElementById("nf-cfg-label-estimate").value.trim();

        config.appearance.accent =
          document.getElementById("nf-cfg-accent").value || "#2f7d5b";

        config.appearance.presentAccent =
          document.getElementById("nf-cfg-present-accent").value || "#2f7d5b";

        config.display.showYesterday =
          document.getElementById("nf-cfg-show-yesterday").checked;

        config.display.showPresent =
          document.getElementById("nf-cfg-show-present").checked;

        config.display.clampPresentToZero =
          document.getElementById("nf-cfg-clamp-present").checked;

        config.display.showRefreshButton =
          document.getElementById("nf-cfg-show-refresh").checked;

        config.gauges = {
          enabled: document.getElementById("nf-cfg-gauges-enabled").checked,
          capacity: Number(document.getElementById("nf-cfg-capacity").value || 0),
          warningPercent: Number(document.getElementById("nf-cfg-capacity-warning").value),
          criticalPercent: Number(document.getElementById("nf-cfg-capacity-critical").value)
        };
        delete config.autoRefresh;
        return config;
      }

      function validateConfig(config) {
        if (config.gauges) {
          const { capacity, warningPercent, criticalPercent } = config.gauges;
          if (!Number.isInteger(capacity) || capacity < 0) {
            throw new Error("La capacité doit être un nombre entier positif, ou rester vide.");
          }
          if (!Number.isFinite(warningPercent) || !Number.isFinite(criticalPercent) || warningPercent < 1 || criticalPercent > 100 || warningPercent >= criticalPercent) {
            throw new Error("Les seuils doivent vérifier : 1 ≤ orange < rouge ≤ 100.");
          }
        }
        if (!["worker", "direct", "koha"].includes(config.connectionMode || "worker")) {
          throw new Error("Mode de connexion invalide.");
        }
        if ((config.connectionMode || "worker") === "worker") {
          if (!config.workerUrl) throw new Error("L’URL du Worker est obligatoire.");
          let parsed;
          try { parsed = new URL(config.workerUrl); } catch { throw new Error("URL du Worker invalide."); }
          if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error("L’URL du Worker doit commencer par http:// ou https://.");
          }
        }
        if (!config.rcr) throw new Error("Le RCR est obligatoire.");
        if (config.connectionMode === "koha" && !/^\d{9}$/.test(config.rcr)) throw new Error("Le relais Koha attend un RCR de 9 chiffres.");
        if (!config.period) throw new Error("La période API est obligatoire.");
        if (["direct", "koha"].includes(config.connectionMode) && !["1", "5", "10", "15", "30", "HOUR", "DAY"].includes(config.period)) {
          throw new Error("Période CCInfo : utiliser 1, 5, 10, 15, 30, HOUR ou DAY.");
        }
      }

      async function testConfigFromForm() {
        const previous = currentConfig;
        const previousKey = nedapApiKey;

        try {
          const candidate = readAdminForm();
          validateConfig(candidate);

          if (candidate.connectionMode === "koha") {
            const saved = relayState || await loadRelaySettings();
            if (candidate.nedapApiKey || !saved.hasKey || saved.rcr !== candidate.rcr) throw new Error("Enregistrez d’abord la clé et le RCR du relais Koha, puis testez l’API. Le test ne modifie aucun réglage.");
          }
          currentConfig = candidate;
          nedapApiKey = document.getElementById("nf-cfg-api-key").value.trim();
          setAdminMessage("Test de connexion en cours…");

          const now = new Date();
          const data = await fetchJson(buildApiUrl(now, true));
          const totals = calculateTotals(data);

          setAdminMessage(
            `Test réussi : ${formatCount(totals.in)} entrée(s).`
          );
        } catch (error) {
          setAdminMessage(error?.message || "Échec du test.", true);
        } finally {
          currentConfig = previous;
          nedapApiKey = previousKey;
        }
      }

      async function saveAdminConfig() {
        try {
          const candidate = readAdminForm();
          validateConfig(candidate);

          const candidateKey = candidate.nedapApiKey;
          if (candidate.connectionMode === "direct" && !candidateKey) {
            throw new Error("La clé API Nedap est obligatoire en mode direct.");
          }
          setAdminMessage("Enregistrement…");

          if (candidate.connectionMode === "koha") {
            const saved = relayState || await loadRelaySettings();
            relayState = await relayRequest("/settings", { method: "PUT", headers: { "Content-Type": "application/json", "X-PMK-Request": "1" }, body: JSON.stringify({ revision: saved.revision, rcr: candidate.rcr, ...(candidateKey ? { apiKey: candidateKey } : {}) }) });
            showRelayState();
            candidate.nedapApiKey = "";
          }
          await saveConfigToStorage(candidate);
          nedapApiKey = candidate.connectionMode === "koha" ? "" : candidateKey;
          if (candidate.connectionMode === "koha") document.getElementById("nf-cfg-api-key").value = "";
          // Nettoyer l’ancienne copie locale uniquement après succès du stockage Koha.
          try { localStorage.removeItem(keyStorageKey(candidate)); } catch {}

          currentConfig = candidate;
          configSource = "Koha";

          applyConfigToUI();
          document.getElementById("nf-chart-content").replaceChildren();
          setPlainStatus(document.getElementById("nf-chart-status"), "");

          setAdminMessage(candidate.connectionMode === "koha"
            ? "Paramètres enregistrés. La clé serveur ne sera pas renvoyée aux navigateurs."
            : candidate.connectionMode === "direct" ? "Paramètres et clé enregistrés dans la configuration Koha, partagés entre les postes." : "Paramètres enregistrés.");

          fetchAllCounts({ silent: true }).catch(() => {});
        } catch (error) {
          setAdminMessage(error?.message || "Impossible d’enregistrer.", true);
        }
      }

      /* =========================================================
         INITIALISATION
         ========================================================= */

      async function init() {
        initStorage();
        await loadConfigFromStorage();
        nedapApiKey = loadNedapApiKey(currentConfig);
        document.getElementById("nf-cfg-mode").addEventListener("change", updateConnectionFields);
        document.getElementById("nf-relay-clear").addEventListener("click", async () => {
          try {
            const saved = relayState || await loadRelaySettings();
            if (!saved.hasKey) return;
            const message = "Effacer la clé serveur Nedap ? Le relais ne pourra plus actualiser les compteurs jusqu’à l’enregistrement d’une nouvelle clé.";
            const accepted = window.PMKConfig?.confirmAction ? await window.PMKConfig.confirmAction({ title: "Clé serveur Nedap", message }) : window.confirm(message);
            if (!accepted) return;
            relayState = await relayRequest("/settings", { method: "PUT", headers: { "Content-Type": "application/json", "X-PMK-Request": "1" }, body: JSON.stringify({ revision: saved.revision, rcr: saved.rcr, clearKey: true }) });
            showRelayState();setAdminMessage("Clé serveur effacée. Les anciennes sauvegardes ne sont pas modifiées.");
          } catch (error) { setAdminMessage(error.message, true); }
        });


        applyConfigToUI();
        loadFromLocalStorage();
        updateHistoryControls();
        document.getElementById("nf-chart-range").addEventListener("change", event => {
          const selectedDays = chartDays();
          const lastDate = selectedDays[selectedDays.length - 1].date;
          if (event.target.value === "year") {
            chartScope = "year";
            chartYear = parseHistoryDate(lastDate).getFullYear();
          } else {
            chartEndDate = lastDate === formatWeekDay(new Date()) ? null : lastDate;
            chartScope = "days";
            const length = Number(event.target.value);
            chartRangeDays = [1, 7, 30, 90, 365].includes(length) ? length : 7;
          }
          refreshHistorySelection();
        });
        document.getElementById("nf-chart-date").addEventListener("change", event => {
          const chosen = parseHistoryDate(event.target.value);
          if (!chosen || formatWeekDay(chosen) > formatWeekDay(new Date())) { updateHistoryControls(); return; }
          chartEndDate = event.target.value === formatWeekDay(new Date()) ? null : event.target.value;
          refreshHistorySelection();
        });
        document.getElementById("nf-chart-year").addEventListener("change", event => {
          const year = Number(event.target.value);
          if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) { updateHistoryControls(); return; }
          chartYear = year; refreshHistorySelection();
        });
        document.getElementById("nf-chart-prev").addEventListener("click", () => moveHistoryPeriod(-1));
        document.getElementById("nf-chart-next").addEventListener("click", () => moveHistoryPeriod(1));
        document.getElementById("nf-chart-current").addEventListener("click", () => {
          chartEndDate = null; chartYear = null; refreshHistorySelection();
        });
        document.getElementById("nf-chart-toggle").addEventListener("click", () => {
          const panel = document.getElementById("nf-chart");
          panel.hidden = !panel.hidden;
          document.getElementById("nf-chart-toggle").setAttribute("aria-expanded", String(!panel.hidden));
          const chartButtonLabel = panel.hidden ? "Afficher le graphique" : "Masquer le graphique";
          document.getElementById("nf-chart-toggle").title = chartButtonLabel;
          document.getElementById("nf-chart-toggle").setAttribute("aria-label", chartButtonLabel);
          if (!panel.hidden) loadWeekChart().catch(() => {});
        });

        document.getElementById("nf-refresh-button")
          ?.addEventListener("click", () => {
            fetchAllCounts().catch(() => {});
          });

        document.getElementById("nf-admin-trigger")
          ?.addEventListener("click", showLock);

        document.getElementById("nf-lock-cancel")
          ?.addEventListener("click", hideLock);

        document.getElementById("nf-lock-form")
          ?.addEventListener("submit", event => {
            event.preventDefault();

            const password =
              document.getElementById("nf-lock-password").value;

            if (password !== ADMIN_PASSWORD) {
              document.getElementById("nf-lock-error").textContent =
                "Mot de passe incorrect.";
              return;
            }

            sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
            openAdmin();
          });

        document.getElementById("nf-admin-close")
          ?.addEventListener("click", closeAdmin);

        document.getElementById("nf-admin-defaults")
          ?.addEventListener("click", () => {
            currentConfig = structuredClone(DEFAULT_CONFIG);
            fillAdminForm();
            setAdminMessage(
              "Valeurs d’origine chargées dans le formulaire. Clique sur Enregistrer pour les appliquer."
            );
          });

        document.getElementById("nf-admin-test")
          ?.addEventListener("click", testConfigFromForm);

        document.getElementById("nf-admin-save")
          ?.addEventListener("click", saveAdminConfig);

        if (adminUnlocked()) {
          document.getElementById("nf-admin-trigger")?.classList.add("nf-active");
        }
      }

    await init();
    // Actualiser uniquement les libellés : aucun appel réseau dans ce minuteur.
    const relativeLabelTimer = setInterval(() => {
      if (!container.isConnected) { clearInterval(relativeLabelTimer); return; }
      refreshRelativeStatuses();
    }, 15000);
    const dispose=()=>{clearInterval(relativeLabelTimer);delete container.dataset.pmk137Mounted;};
    dispose.refresh=()=>fetchAllCounts();
    return dispose;
}

window.PMKHomeWidgets?.register({
    id: WIDGET_ID,
    name: 'Fréquentation NEDAP',
    target: 'announcements-column',
    mount
});
