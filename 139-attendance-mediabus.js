/* ============================================================
   139-attendance-mediabus.js
   PimpMyKoha — Compteur de fréquentation
   Version : 2.0.0 — 22/09/2026

   Extraction du compteur flottant historiquement collé dans IntranetNav.
   - périmètre des bibliothèques configurable ;
   - même Koha / mêmes collections que Attendance Counter 138 ;
   - configuration et moteur de comptage partagés entre les deux vues ;
   - PMK pilote présentation, catégories, pas de saisie et stockage ;
   - API open consommée par IntranetNav 134 ;
   - aucune fermeture utilisateur : le compteur reste disponible sur les sites autorisés ;
   - boutons statistiques / rapport complet 138 visibles uniquement aux superlibrarians ;
   - +/- sécurisés par transaction stockage Koha.
   ============================================================ */
(function(window, document) {
    'use strict';

    if (window.__PMK_ATTENDANCE_MEDIABUS_139__) return;
    window.__PMK_ATTENDANCE_MEDIABUS_139__ = true;

    const MODULE_ID = 'attendance-mediabus-mini';
    const VERSION = '2.0.0';
    const REPORT_URL = '/cgi-bin/koha/mainpage.pl?pmk_page=attendance-counter';
    const STYLE_ID = 'pmk139-attendance-mediabus-style';
    // Keep the historical document ID and count fields; both views use this configuration.
    const DEFAULTS = { enabled:true, autoOpen:true, miniEnabled:true, pageEnabled:true,
        branchNames:'', branchSelector:'.logged-in-branch-name', defaultLocationId:'',
        title:'Compteur de fréquentation', adminPin:'admin', defaultCountedWeeks:8, adultsLabel:'Adultes', kidsLabel:'Enfants',
        step:1, miniWidth:340, countsCollection:'counts', locationsCollection:'locations' };
    let resolveReady;
    const ready = new Promise(resolve => {resolveReady=resolve});

    let config = { ...DEFAULTS };
    let started = false;
    let starting = null;
    let registered = false;
    let unsubscribe = null;

    const LEGACY_CSS = `

    #freqAppMini {
        --freq-bg: #0f1720;
        --freq-card: #0b1220;
        --freq-accent: #10b981;
        --freq-muted: #9aa4b2;
        --freq-radius: 12px;
        --freq-pad: 12px;
        font-family: Inter, system-ui, Segoe UI, Roboto, "Helvetica Neue", Arial;
        color: #e6eef6;
        background: var(--freq-bg);
        border-radius: var(--freq-radius);
        padding: var(--freq-pad);
        width: 340px;
        position: fixed;
        z-index: 10000;
        top: 20px;
        right: 20px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        cursor: move;
        user-select: none;
        resize: both;
        overflow: hidden;
        min-width: 300px;
        max-width: 520px;
        min-height: 250px;
        transition: all 0.3s ease;
        display: none;
    }

    #freqAppMini.visible {
        display: block;
    }

    #freqAppMini:hover {
        border-color: rgba(255, 255, 255, 0.25);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    }

    #freqAppMini.compact {
        width: 200px !important;
        min-width: 200px;
        height: 50px !important;
        min-height: 50px;
        max-height: 50px;
        padding: 8px 12px;
    }

    #freqAppMini.compact .freq-content {
        display: none !important;
    }

    #freqAppMini.compact .freq-title {
        font-size: 11px;
    }

    #freqAppMini .freq-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }

    #freqAppMini.compact .freq-header {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
    }

    #freqAppMini .freq-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--freq-accent);
        letter-spacing: 0.5px;
    }

    #freqAppMini .freq-controls-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: bold;
        color: var(--freq-muted);
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 24px;
        text-align: center;
    }

    #freqAppMini .freq-controls-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
        color: white;
    }

    #freqAppMini .freq-content {
        transition: all 0.3s ease;
    }

    #freqAppMini .freq-compact-row {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 6px;
        font-size: 11px;
    }

    #freqAppMini select, #freqAppMini input[type=date] {
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.4);
        color: white;
        font-size: 11px;
        width: 100%;
        transition: all 0.2s ease;
    }

    #freqAppMini select:focus, #freqAppMini input[type=date]:focus {
        border-color: var(--freq-accent);
        outline: none;
    }

    #freqAppMini select {
        flex: 2;
    }

    #freqAppMini input[type=date] {
        flex: 1;
    }

    #freqAppMini.compact .freq-date-input {
        display: none;
    }

    #freqAppMini .freq-counters {
        display: flex;
        gap: 12px;
        margin: 12px 0;
    }

    #freqAppMini .freq-counter-compact {
        flex: 1;
        text-align: center;
    }

    #freqAppMini .freq-counter-label {
        font-size: 10px;
        color: var(--freq-muted);
        margin-bottom: 6px;
        font-weight: 600;
        letter-spacing: 0.5px;
    }

    #freqAppMini .freq-counter-buttons {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: center;
    }

    #freqAppMini .freq-counter-btn {
        width: 32px;
        height: 32px;
        font-size: 14px;
        font-weight: bold;
        background: linear-gradient(180deg, #10b981, #059669);
        border: 1px solid #047857;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        color: white;
        cursor: pointer;
    }

    #freqAppMini .freq-counter-btn:hover {
        background: linear-gradient(180deg, #34d399, #10b981);
        transform: translateY(-1px);
    }

    #freqAppMini .freq-counter-btn:active {
        transform: translateY(0px);
    }

    #freqAppMini .freq-counter-btn:disabled {
        background: linear-gradient(180deg, #6b7280, #4b5563);
        border-color: #374151;
        cursor: not-allowed;
        transform: none;
        opacity: 0.6;
    }

    #freqAppMini .freq-count-display {
        min-width: 40px;
        height: 32px;
        text-align: center;
        font-weight: 800;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #10b981;
    }

    #freqAppMini .freq-footer {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    #freqAppMini .freq-status {
        font-size: 10px;
        color: var(--freq-muted);
        flex: 1 1 100%;
        font-weight: 500;
    }

    #freqAppMini .freq-action-btn {
        background: linear-gradient(180deg, #3b82f6, #1d4ed8);
        border: 1px solid #1e40af;
        border-radius: 6px;
        padding: 5px 10px;
        font-size: 10px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        margin-left: 0;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    #freqAppMini .freq-action-btn:hover {
        background: linear-gradient(180deg, #60a5fa, #3b82f6);
        transform: translateY(-1px);
    }

    #freqAppMini .freq-action-btn:disabled {
        background: linear-gradient(180deg, #6b7280, #4b5563);
        border-color: #374151;
        cursor: not-allowed;
        transform: none;
        opacity: 0.6;
    }

    #freqAppMini .freq-reset-btn {
        background: linear-gradient(180deg, #6b7280, #4b5563);
        border: 1px solid #374151;
    }

    #freqAppMini .freq-reset-btn:hover {
        background: linear-gradient(180deg, #9ca3af, #6b7280);
    }

    #freqAppMini .freq-report-btn {
        background: linear-gradient(180deg, #8b5cf6, #7c3aed);
        border: 1px solid #6d28d9;
        border-radius: 6px;
        padding: 5px 10px;
        font-size: 10px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        margin-left: 6px;
        transition: all 0.2s ease;
        text-decoration: none;
        display: inline-block;
        line-height: 1.2;
    }

    #freqAppMini .freq-report-btn:hover {
        background: linear-gradient(180deg, #a78bfa, #8b5cf6);
        transform: translateY(-1px);
        text-decoration: none;
        color: white;
    }

    #freqAppMini .freq-correction-btn {
        background: linear-gradient(180deg, #f59e0b, #d97706);
        border: 1px solid #b45309;
        border-radius: 6px;
        padding: 5px 10px;
        font-size: 10px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        margin-left: 6px;
        transition: all 0.2s ease;
    }

    #freqAppMini .freq-correction-btn:hover {
        background: linear-gradient(180deg, #fbbf24, #f59e0b);
        transform: translateY(-1px);
    }

    /* Overlay et modal de correction */
    #freq-correction-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10001;
        display: none;
    }

    #freq-correction-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--freq-card);
        border-radius: var(--freq-radius);
        padding: 20px;
        z-index: 10002;
        width: 280px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        display: none;
    }

    #freq-correction-modal.visible {
        display: block;
    }

    #freq-correction-overlay.visible {
        display: block;
    }

    .freq-correction-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--freq-accent);
        margin-bottom: 15px;
        text-align: center;
    }

    .freq-time-inputs {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: center;
        margin-bottom: 15px;
    }

    .freq-time-inputs input {
        width: 50px;
        padding: 8px;
        text-align: center;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: white;
        font-size: 14px;
    }

    .freq-time-inputs span {
        color: var(--freq-muted);
        font-weight: bold;
    }

    .freq-correction-buttons {
        display: flex;
        gap: 8px;
        margin-bottom: 15px;
        justify-content: center;
    }

    .freq-correction-counter-btn {
        background: linear-gradient(180deg, #10b981, #059669);
        border: 1px solid #047857;
        border-radius: 8px;
        padding: 10px 15px;
        font-size: 11px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        flex: 1;
    }

    .freq-correction-counter-btn:hover {
        background: linear-gradient(180deg, #34d399, #10b981);
        transform: translateY(-1px);
    }

    .freq-modal-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
    }

    .freq-modal-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid;
    }

    .freq-modal-cancel {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        color: var(--freq-muted);
    }

    .freq-modal-cancel:hover {
        background: rgba(255, 255, 255, 0.15);
        color: white;
    }

    .freq-modal-validate {
        background: linear-gradient(180deg, #10b981, #059669);
        border-color: #047857;
        color: white;
    }

    .freq-modal-validate:hover {
        background: linear-gradient(180deg, #34d399, #10b981);
    }

    .freq-modal-validate:disabled {
        background: linear-gradient(180deg, #6b7280, #4b5563);
        border-color: #374151;
        cursor: not-allowed;
        opacity: 0.6;
    }

    .freq-correction-preview {
        font-size: 11px;
        text-align: center;
        color: var(--freq-muted);
        margin-bottom: 10px;
        min-height: 16px;
    }

    .freq-correction-reason {display:block;font-size:11px;color:var(--freq-muted);margin:0 0 12px}
    .freq-correction-reason textarea {display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:7px;border:1px solid rgba(255,255,255,.2);border-radius:6px;background:rgba(0,0,0,.4);color:#fff;resize:vertical}

    #freq-location-fix-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10001;
        display: none;
    }

    #freq-location-fix-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--freq-card);
        border-radius: var(--freq-radius);
        padding: 16px;
        z-index: 10002;
        width: 320px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        display: none;
    }

    #freq-location-fix-modal.visible,
    #freq-location-fix-overlay.visible {
        display: block;
    }

    .freq-fix-row {
        margin-bottom: 10px;
    }

    .freq-fix-row label {
        display: block;
        font-size: 11px;
        color: var(--freq-muted);
        margin-bottom: 4px;
    }

    .freq-fix-row select,
    .freq-fix-row input {
        width: 100%;
        padding: 7px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(0, 0, 0, 0.4);
        color: white;
        font-size: 11px;
    }

    .freq-fix-dates {
        display: flex;
        gap: 8px;
    }

    .freq-fix-dates > div {
        flex: 1;
    }

    /* Style pour le drag */
    #freqAppMini.dragging {
        opacity: 0.9;
        cursor: grabbing;
        transform: scale(1.02);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    }

    /* Style pour le redimensionnement */
    #freqAppMini::-webkit-resizer {
        background: var(--freq-accent);
        border-radius: 0 0 12px 0;
    }

    #freqAppMini::-webkit-resizer:hover {
        background: #34d399;
    }

    /* Cacher le resizer en mode compact */
    #freqAppMini.compact {
        resize: none;
    }


    #freqAppMini .freq-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    /* ============================================================
       v1.1.0 — ergonomie terrain / design Koha
       ============================================================ */
    #freqAppMini {
        --freq-bg: #ffffff;
        --freq-card: #ffffff;
        --freq-accent: #2f7d5b;
        --freq-accent-strong: #236448;
        --freq-accent-soft: #edf7f1;
        --freq-text: #23313a;
        --freq-muted: #6b7882;
        --freq-border: #d9e2e7;
        --freq-danger: #b42318;
        width: 450px;
        min-width: 430px;
        max-width: min(480px, calc(100vw - 24px));
        min-height: 0;
        padding: 0;
        color: var(--freq-text);
        background: var(--freq-bg);
        border: 1px solid var(--freq-border);
        border-radius: 14px;
        box-shadow: 0 12px 34px rgba(31, 51, 62, .22);
        overflow: hidden;
        resize: none !important;
        height: auto !important;
        max-height: none;
    }

    #freqAppMini:hover {
        border-color: #c5d2d8;
        box-shadow: 0 15px 40px rgba(31, 51, 62, .26);
    }

    #freqAppMini .freq-header {
        margin: 0;
        padding: 8px 10px;
        border: 0;
        border-bottom: 1px solid var(--freq-border);
        background: linear-gradient(180deg, #fbfdfc 0%, #f4f8f6 100%);
        cursor: move;
    }

    #freqAppMini .freq-heading {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
    }

    #freqAppMini .freq-heading-icon {
        width: 27px;
        height: 27px;
        border-radius: 9px;
        display: grid;
        place-items: center;
        background: var(--freq-accent-soft);
        color: var(--freq-accent);
        font-size: 14px;
        font-weight: 800;
    }

    #freqAppMini .freq-title {
        color: var(--freq-text);
        font-size: 13px;
        line-height: 1.15;
        letter-spacing: 0;
        text-transform: none;
    }

    #freqAppMini .freq-subtitle {
        margin-top: 1px;
        color: var(--freq-muted);
        font-size: 9px;
        font-weight: 500;
    }

    #freqAppMini .freq-controls-btn {
        width: 27px;
        height: 27px;
        min-width: 30px;
        padding: 0;
        border: 1px solid var(--freq-border);
        border-radius: 8px;
        background: #fff;
        color: #53636e;
        font-size: 15px;
        display: grid;
        place-items: center;
    }

    #freqAppMini .freq-controls-btn:hover {
        background: var(--freq-accent-soft);
        border-color: #bad3c5;
        color: var(--freq-accent-strong);
    }


    #freqAppMini .freq-content {
        padding: 9px 10px;
        background: #fff;
    }

    #freqAppMini .freq-context {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(120px, .8fr);
        gap: 5px;
        margin-bottom: 11px;
    }

    #freqAppMini .freq-field {
        min-width: 0;
    }

    #freqAppMini .freq-field > span {
        display: block;
        margin: 0 0 3px;
        color: var(--freq-muted);
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .04em;
    }

    #freqAppMini select,
    #freqAppMini input[type=date] {
        width: 100%;
        height: 34px;
        padding: 5px 8px;
        border: 1px solid var(--freq-border);
        border-radius: 8px;
        background: #fff;
        color: var(--freq-text);
        font-size: 11px;
        box-shadow: none;
    }

    #freqAppMini select:focus,
    #freqAppMini input[type=date]:focus {
        border-color: var(--freq-accent);
        box-shadow: 0 0 0 3px rgba(47, 125, 91, .12);
    }

    #freqAppMini .freq-counters {
        gap: 5px;
        margin: 0;
    }

    #freqAppMini .freq-counter-compact {
        padding: 7px 8px;
        border: 1px solid var(--freq-border);
        border-radius: 11px;
        background: #fbfcfc;
    }

    #freqAppMini .freq-counter-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        margin-bottom: 6px;
        color: #53636e;
        font-size: 11px;
        letter-spacing: 0;
        text-transform: none;
    }

    #freqAppMini .freq-counter-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        display: inline-block;
    }

    #freqAppMini .freq-adult-dot { background: #2f73b7; }
    #freqAppMini .freq-kid-dot { background: #b35c87; }

    #freqAppMini .freq-counter-buttons {
        gap: 5px;
    }

    #freqAppMini .freq-counter-btn {
        width: 36px;
        height: 36px;
        border: 1px solid #bfd5c9;
        border-radius: 10px;
        background: var(--freq-accent-soft);
        color: var(--freq-accent-strong);
        font-size: 19px;
        font-weight: 700;
        box-shadow: none;
        touch-action: manipulation;
    }

    #freqAppMini .freq-counter-btn:hover {
        background: #dff1e7;
        border-color: #a9c9b8;
        transform: none;
    }

    #freqAppMini .freq-counter-btn:active {
        background: #d2eadd;
        transform: scale(.96);
    }

    #freqAppMini .freq-counter-btn:disabled {
        background: #f2f4f5;
        border-color: #e0e5e7;
        color: #9aa5ab;
        opacity: 1;
    }

    #freqAppMini .freq-count-display {
        min-width: 58px;
        height: 36px;
        border: 0;
        border-radius: 10px;
        background: #fff;
        color: var(--freq-text);
        font-size: 21px;
        font-variant-numeric: tabular-nums;
        box-shadow: inset 0 0 0 1px var(--freq-border);
    }

    #freqAppMini .freq-total-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 7px;
        padding: 6px 9px;
        border-radius: 9px;
        background: var(--freq-accent-soft);
        color: var(--freq-accent-strong);
        font-size: 11px;
        font-weight: 700;
    }

    #freqAppMini .freq-total-bar strong {
        font-size: 16px;
        font-variant-numeric: tabular-nums;
    }

    #freqAppMini .freq-footer {
        display: block;
        margin: 7px 0 0;
        padding: 7px 0 0;
        border-top: 1px solid var(--freq-border);
    }

    #freqAppMini .freq-status-row {
        min-height: 17px;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
    }

    #freqAppMini .freq-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--freq-accent);
        box-shadow: 0 0 0 3px rgba(47, 125, 91, .10);
    }

    #freqAppMini .freq-status {
        flex: 1;
        color: var(--freq-muted);
        font-size: 10px;
        font-weight: 600;
    }

    #freqAppMini .freq-actions-toggle {
        width: 100%;
        min-height: 28px;
        margin: 0;
        padding: 4px 8px;
        border: 1px solid var(--freq-border);
        border-radius: 8px;
        background: #f7f9f8;
        color: #43535e;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 9px;
        font-weight: 800;
        cursor: pointer;
    }

    #freqAppMini .freq-actions-toggle:hover {
        background: #f0f5f3;
        border-color: #c5d3ce;
        color: var(--freq-accent-strong);
    }

    #freqAppMini .freq-actions-toggle .freq-actions-chevron {
        display: inline-block;
        font-size: 11px;
        line-height: 1;
        transform: rotate(0deg);
        transition: transform .16s ease;
    }

    #freqAppMini .freq-actions-toggle[aria-expanded="true"] .freq-actions-chevron {
        transform: rotate(180deg);
    }

    #freqAppMini .freq-actions-panel {
        display: none;
        padding-top: 6px;
    }

    #freqAppMini .freq-actions-panel.open {
        display: block;
    }

    #freqAppMini .freq-primary-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 5px;
    }

    #freqAppMini .freq-secondary-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 5px;
        margin-top: 7px;
    }

    #freqAppMini .freq-action-btn,
    #freqAppMini .freq-report-btn,
    #freqAppMini .freq-correction-btn {
        min-height: 30px;
        margin: 0;
        padding: 4px 6px;
        border: 1px solid var(--freq-border);
        border-radius: 8px;
        background: #fff;
        color: #43535e;
        font-size: 9px;
        font-weight: 700;
        text-align: center;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        box-shadow: none;
    }

    #freqAppMini .freq-action-btn:hover,
    #freqAppMini .freq-report-btn:hover,
    #freqAppMini .freq-correction-btn:hover {
        background: #f5f8f7;
        border-color: #c5d3ce;
        color: var(--freq-accent-strong);
        transform: none;
        text-decoration: none;
    }

    #freqAppMini .freq-update-btn {
        background: var(--freq-accent);
        border-color: var(--freq-accent);
        color: #fff;
    }

    #freqAppMini .freq-update-btn:hover {
        background: var(--freq-accent-strong);
        border-color: var(--freq-accent-strong);
        color: #fff;
    }

    #freqAppMini .freq-stat-btn {
        background: #eef5fb;
        border-color: #c9ddeb;
        color: #265e87;
    }

    #freqAppMini .freq-reset-btn {
        color: #7a4c4a;
        background: #fff8f7;
        border-color: #edd6d3;
    }

    #freqAppMini .freq-action-btn:disabled {
        background: #f2f4f5;
        border-color: #e0e5e7;
        color: #9aa5ab;
        opacity: 1;
    }

    #freqAppMini .freq-more-actions {
        margin-top: 5px;
    }

    #freqAppMini .freq-more-actions summary {
        cursor: pointer;
        color: var(--freq-muted);
        font-size: 9px;
        font-weight: 700;
        user-select: none;
        list-style: none;
    }

    #freqAppMini .freq-more-actions summary::-webkit-details-marker {
        display: none;
    }

    #freqAppMini .freq-more-actions summary::before {
        content: "›";
        display: inline-block;
        margin-right: 5px;
        transition: transform .15s ease;
    }

    #freqAppMini .freq-more-actions[open] summary::before {
        transform: rotate(90deg);
    }

    #freq-correction-overlay,
    #freq-location-fix-overlay {
        background: rgba(22, 34, 41, .38);
        backdrop-filter: blur(2px);
    }

    #freq-correction-modal,
    #freq-location-fix-modal {
        background: #fff;
        color: var(--freq-text);
        border: 1px solid var(--freq-border);
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(31, 51, 62, .25);
    }

    .freq-correction-title {
        color: var(--freq-text);
        font-size: 14px;
        text-align: left;
        letter-spacing: 0;
    }

    .freq-time-inputs input,
    .freq-fix-row select,
    .freq-fix-row input {
        background: #fff;
        color: var(--freq-text);
        border: 1px solid var(--freq-border);
        border-radius: 8px;
    }

    .freq-time-inputs input:focus,
    .freq-fix-row select:focus,
    .freq-fix-row input:focus {
        outline: none;
        border-color: var(--freq-accent);
        box-shadow: 0 0 0 3px rgba(47, 125, 91, .12);
    }

    .freq-time-inputs span,
    .freq-fix-row label,
    .freq-correction-preview {
        color: var(--freq-muted);
    }

    .freq-correction-counter-btn,
    .freq-modal-validate {
        background: var(--freq-accent);
        border-color: var(--freq-accent);
        color: #fff;
        border-radius: 8px;
        box-shadow: none;
    }

    .freq-correction-counter-btn:hover,
    .freq-modal-validate:hover {
        background: var(--freq-accent-strong);
        border-color: var(--freq-accent-strong);
        transform: none;
    }

    .freq-modal-cancel {
        background: #fff;
        border-color: var(--freq-border);
        color: #53636e;
        border-radius: 8px;
    }

    .freq-modal-cancel:hover {
        background: #f5f8f7;
        color: var(--freq-text);
    }

    #freqAppMini.compact {
        width: 210px !important;
        min-width: 210px;
        height: 48px !important;
        min-height: 48px;
        max-height: 48px;
        padding: 0;
        resize: none;
    }

    #freqAppMini.compact .freq-header {
        height: 48px;
        padding: 8px 9px;
        border-bottom: 0;
    }

    #freqAppMini.compact .freq-subtitle,
    #freqAppMini.compact .freq-heading-icon,
    #freqAppMini.compact #freq-openFullReport {
        display: none !important;
    }

    #freqAppMini.compact .freq-title {
        font-size: 11px;
    }

    @media (max-width: 575.98px) {
        #freqAppMini {
            width: calc(100vw - 16px) !important;
            min-width: 0 !important;
            max-width: none;
            left: 8px !important;
            right: 8px !important;
            top: auto !important;
            bottom: 8px !important;
            resize: none;
            border-radius: 12px;
        }

        #freqAppMini .freq-header {
            cursor: default;
        }

        #freqAppMini .freq-context {
            grid-template-columns: 1fr;
        }

        #freqAppMini .freq-counters {
            gap: 5px;
        }

        #freqAppMini .freq-counter-btn {
            width: 40px;
            height: 40px;
        }

        #freqAppMini .freq-count-display {
            min-width: 56px;
            height: 40px;
        }

        #freqAppMini .freq-primary-actions,
        #freqAppMini .freq-secondary-actions {
            grid-template-columns: 1fr 1fr;
        }
    }

    `;

    const LEGACY_HTML = `
<!-- Module compteur flottant - Caché par défaut -->
<div id="freqAppMini">
    <div class="freq-header">
        <div class="freq-heading">
            <div class="freq-heading-icon" aria-hidden="true">↕</div>
            <div>
                <div class="freq-title">Compteur de fréquentation</div>
                <div class="freq-subtitle">Fréquentation terrain</div>
            </div>
        </div>
        <div class="freq-header-actions">
            <button class="freq-controls-btn" id="freq-openFullReport" title="Ouvrir les statistiques complètes" aria-label="Ouvrir les statistiques complètes" style="display:none">↗</button>
            <button class="freq-controls-btn" id="freq-toggleCompact" title="Réduire/Agrandir" aria-label="Réduire ou agrandir">−</button>
        </div>
    </div>

    <div class="freq-content">
        <div class="freq-context">
            <label class="freq-field freq-location-field">
                <span>Lieu</span>
                <select id="freq-selectLocationMini">
                    <option value="">Sélectionnez un lieu</option>
                </select>
            </label>
            <label class="freq-field freq-date-field">
                <span>Date</span>
                <input type="date" id="freq-inputDateMini" class="freq-date-input" />
            </label>
        </div>

        <div class="freq-counters">
            <div class="freq-counter-compact">
                <div class="freq-counter-label"><span class="freq-counter-dot freq-adult-dot"></span>Adultes</div>
                <div class="freq-counter-buttons">
                    <button class="freq-counter-btn" id="freq-decAdultsMini" title="Décrémenter" disabled>−</button>
                    <div class="freq-count-display" id="freq-countAdultsMini">0</div>
                    <button class="freq-counter-btn" id="freq-incAdultsMini" title="Incrémenter" disabled>+</button>
                </div>
            </div>
            <div class="freq-counter-compact">
                <div class="freq-counter-label"><span class="freq-counter-dot freq-kid-dot"></span>Enfants</div>
                <div class="freq-counter-buttons">
                    <button class="freq-counter-btn" id="freq-decKidsMini" title="Décrémenter" disabled>−</button>
                    <div class="freq-count-display" id="freq-countKidsMini">0</div>
                    <button class="freq-counter-btn" id="freq-incKidsMini" title="Incrémenter" disabled>+</button>
                </div>
            </div>
        </div>

        <div class="freq-total-bar">
            <span>Total du jour</span>
            <strong id="freq-totalMini">0</strong>
        </div>

        <div class="freq-footer">
            <div class="freq-status-row">
                <span class="freq-status-dot" aria-hidden="true"></span>
                <div class="freq-status" id="freq-statusMini">Sélectionnez un lieu</div>
            </div>

            <button type="button"
                    class="freq-actions-toggle"
                    id="freq-actionsToggleMini"
                    aria-expanded="false"
                    aria-controls="freq-actionsPanelMini">
                <span>Actions <span class="freq-muted-count">(6)</span></span>
                <span class="freq-actions-chevron" aria-hidden="true">⌄</span>
            </button>

            <div class="freq-actions-panel" id="freq-actionsPanelMini">
                <div class="freq-primary-actions">
                    <button class="freq-action-btn freq-update-btn"
                            id="freq-btnUpdateMini"
                            title="Synchroniser avec le serveur"
                            disabled>
                        <span aria-hidden="true">↻</span> Actualiser
                    </button>

                    <button class="freq-action-btn freq-correction-btn"
                            id="freq-btnCorrectionMini"
                            title="Ajouter une correction horaire"
                            disabled>
                        <span aria-hidden="true">＋</span> Correction
                    </button>

                    <a href="${REPORT_URL}"
                       target="_blank"
                       rel="noopener"
                       id="freq-statsLinkMini"
                       class="freq-action-btn freq-stat-btn"
                       title="Ouvrir les statistiques Attendance Counter">
                        <span aria-hidden="true">▥</span> Statistiques
                    </a>
                </div>

                <div class="freq-secondary-actions" aria-label="Actions complémentaires">
                        <button class="freq-action-btn freq-reset-btn"
                                id="freq-btnResetMini"
                                title="Remettre les compteurs locaux à zéro"
                                disabled>
                            Reset
                        </button>

                        <button class="freq-action-btn freq-correction-btn"
                                id="freq-btnFixLocationMini"
                                title="Corriger un lieu sur l'historique"
                                disabled>
                            Correction lieu
                        </button>

                        <a href="${REPORT_URL}"
                           target="_blank"
                           rel="noopener"
                           class="freq-action-btn freq-report-btn"
                           title="Ouvrir le rapport SQL configuré">
                            Rapport SQL
                        </a>
                </div>
            </div>
        </div>


    </div>
</div>

<!-- Modal de correction -->
<div id="freq-correction-overlay"></div>
<div id="freq-correction-modal">
    <div class="freq-correction-title">CORRECTION HORAIRE</div>

    <div class="freq-time-inputs">
        <input type="number" id="freq-correction-hours" min="0" max="23" value="12" placeholder="HH">
        <span>h</span>
        <input type="number" id="freq-correction-minutes" min="0" max="59" value="0" placeholder="MM">
    </div>

    <div class="freq-correction-preview" id="freq-correction-preview">
        Heure sélectionnée : 12h00
    </div>

    <label class="freq-correction-reason" for="freq-correction-reason">Justification de la correction
        <textarea id="freq-correction-reason" maxlength="300" rows="2" placeholder="Ex. saisie différée après fermeture"></textarea>
    </label>

    <div class="freq-correction-buttons">
        <button class="freq-correction-counter-btn" id="freq-correction-adult">+1 Adulte</button>
        <button class="freq-correction-counter-btn" id="freq-correction-kid">+1 Enfant</button>
    </div>

    <div class="freq-modal-actions">
        <button class="freq-modal-btn freq-modal-cancel" id="freq-correction-cancel">Annuler</button>
        <button class="freq-modal-btn freq-modal-validate" id="freq-correction-validate" disabled>Valider (0)</button>
    </div>
</div>

<!-- Modal correction de lieu -->
<div id="freq-location-fix-overlay"></div>
<div id="freq-location-fix-modal">
    <div class="freq-correction-title">CORRECTION DE LIEU</div>

    <div class="freq-fix-row">
        <label for="freq-fix-old-location-mini">Lieu source</label>
        <select id="freq-fix-old-location-mini">
            <option value="">Lieu à corriger</option>
        </select>
    </div>

    <div class="freq-fix-row">
        <label for="freq-fix-new-location-mini">Nouveau lieu</label>
        <select id="freq-fix-new-location-mini">
            <option value="">Lieu de destination</option>
        </select>
    </div>

    <div class="freq-fix-row freq-fix-dates">
        <div>
            <label for="freq-fix-from-mini">Du</label>
            <input type="date" id="freq-fix-from-mini" />
        </div>
        <div>
            <label for="freq-fix-to-mini">Au</label>
            <input type="date" id="freq-fix-to-mini" />
        </div>
    </div>

    <div class="freq-modal-actions">
        <button class="freq-modal-btn freq-modal-cancel" id="freq-fix-cancel-mini">Annuler</button>
        <button class="freq-modal-btn freq-modal-validate" id="freq-fix-validate-mini">Corriger</button>
    </div>
</div>
    `;

    function isMediabus() { // Legacy method name retained for saved menu actions.
        const names=String(config.branchNames || '').split(/[\n,;]+/).map(value=>value.trim().toLocaleLowerCase()).filter(Boolean);
        if (!names.length) return true;
        try {
            const branch=document.querySelector(config.branchSelector || DEFAULTS.branchSelector);
            const values=[branch?.textContent,branch?.getAttribute('data-branchcode')].filter(Boolean).map(value=>String(value).trim().toLocaleLowerCase());
            return values.some(value=>names.includes(value));
        } catch (_) {return false}
    }

    function normalizeConfiguration(next) {
        const cfg=Object.assign({},DEFAULTS,next || {});
        cfg.step=Math.max(1,Math.min(100,Math.round(Number(cfg.step) || 1)));
        cfg.miniWidth=Math.max(300,Math.min(520,Number(cfg.miniWidth) || 340));
        cfg.defaultCountedWeeks=Math.max(1,Math.min(53,Math.round(Number(cfg.defaultCountedWeeks) || 8)));
        return cfg;
    }

    function decorate(root) {
        if (!root) return;
        if(root.id==='freqApp'){root.inert=config.enabled===false || config.pageEnabled===false || !isMediabus();}
        const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
        const texts=[];while(walker.nextNode())texts.push(walker.currentNode);
        texts.forEach(node=>{
            if(node.parentElement?.closest('script, style, option, .freq-location-list')) return;
            const original=node.__pmkAttendanceLabel ?? node.nodeValue;
            if(!/Adultes|Enfants/.test(original))return;
            node.__pmkAttendanceLabel=original;
            node.nodeValue=original.replace(/Adultes/g,()=>String(config.adultsLabel)).replace(/Enfants/g,()=>String(config.kidsLabel));
        });
        const title=root.querySelector('.freq-title, header h1');if(title)title.textContent=config.title;
        if(root.id==='freqAppMini')root.style.width=config.miniWidth+'px';
        root.querySelectorAll('[id^="freq-inc"], [id^="freq-dec"]').forEach(button=>{
            const label=button.id.includes('Adults')?config.adultsLabel:config.kidsLabel;
            button.title=(button.id.includes('-inc')?'Ajouter ':'Retirer ')+config.step+' — '+label;
            button.setAttribute('aria-label',button.title);
        });
    }

    // Single transaction engine shared by the floating and full-page views.
    async function mutateSharedCounter(deps, request) {
        if(config.enabled===false || !isMediabus())throw new Error('Compteur désactivé pour ce site');
        const {db,doc,runTransaction,serverTimestamp}=deps;
        const storage=deps.configuration || config;
        if(storage.countsCollection!==config.countsCollection)throw new Error('Rechargez la page après un changement du stockage.');
        const {type,locationId,date,userId,existingId,notes,additions}=request;
        if(!['adults','kids','notes','correction'].includes(type) || !locationId || !/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Saisie de fréquentation invalide');
        const delta=Math.sign(Number(request.delta) || 0)*config.step;
        const id=existingId || (locationId+'__'+date).replace(/[^A-Za-z0-9_.-]/g,'_');
        const ref=doc(db,storage.countsCollection,id);
        const result=await runTransaction(db,async transaction=>{
            const snap=await transaction.get(ref);
            const data=snap.exists()?snap.data():{};
            const count=value=>Math.max(0,Math.floor(Number(value) || 0));
            const payload={locationId,date,adults:count(data.adults),kids:count(data.kids),
                adultTimestamps:Array.isArray(data.adultTimestamps)?data.adultTimestamps.slice():[],
                kidTimestamps:Array.isArray(data.kidTimestamps)?data.kidTimestamps.slice():[],
                userId:userId || 'anonymous',updatedAt:serverTimestamp()};
            function adjust(category,change,timestamp) {
                const before=payload[category];payload[category]=Math.max(0,before+change);
                const times=category==='adults'?payload.adultTimestamps:payload.kidTimestamps;
                const actual=payload[category]-before;
                if(actual>0)for(let i=0;i<actual;i++)times.push(timestamp || new Date().toISOString());
                else times.splice(Math.max(0,times.length+actual),-actual);
            }
            if(type==='adults' || type==='kids')adjust(type,delta);
            if(type==='correction') {
                if(!additions || !Number.isFinite(Date.parse(additions.timestamp)))throw new Error('Heure de correction invalide');
                const reason=String(request.reason || '').trim();
                if(reason.length<3 || reason.length>300)throw new Error('Indiquez une justification de 3 à 300 caractères.');
                for(const category of ['adults','kids']) {
                    const amount=Number(additions[category] || 0);
                    if(!Number.isInteger(amount) || amount<0 || amount>10000)throw new Error('Nombre de personnes invalide');
                    adjust(category,amount,additions.timestamp);
                }
                const log=Array.isArray(data.correctionLog)?data.correctionLog.slice(-49):[];
                log.push({reason,userId:userId || 'anonymous',recordedAt:new Date().toISOString(),eventAt:additions.timestamp,
                    adults:Number(additions.adults || 0),kids:Number(additions.kids || 0)});
                payload.correctionLog=log;
                payload.lastCorrection=log[log.length-1];
            }
            if(notes) {
                if(Object.prototype.hasOwnProperty.call(notes,'adults'))payload.noteAdults=String(notes.adults);
                if(Object.prototype.hasOwnProperty.call(notes,'kids'))payload.noteKids=String(notes.kids);
            }
            if(!snap.exists())payload.createdAt=serverTimestamp();
            transaction.set(ref,payload,{merge:true});
            return payload;
        });
        document.dispatchEvent(new CustomEvent('pmk:attendance-count-changed',{detail:{locationId,date}}));
        return result;
    }

    function isSuperlibrarian() {
        if (window.PMKConfig && typeof window.PMKConfig.isKohaSuperlibrarian === 'function') {
            try { return !!window.PMKConfig.isKohaSuperlibrarian(); } catch (_) {}
        }
        const user = document.querySelector('.loggedinusername[data-is-superlibrarian], .loggedinusername.is_superlibrarian');
        if (!user) return false;
        if (user.classList.contains('is_superlibrarian')) return true;
        return /^(1|true|yes|superlibrarian|is_superlibrarian)$/i.test(String(user.getAttribute('data-is-superlibrarian') || '').trim());
    }

    function dispatchState(reason) {
        try {
            document.dispatchEvent(new CustomEvent('pmk:attendance-mediabus-state', {
                detail: {
                    reason: reason || 'state',
                    available: isMediabus(),
                    enabled: config.enabled !== false,
                    autoOpen: config.autoOpen !== false,
                    started,
                    visible: !!document.getElementById('freqAppMini')?.classList.contains('visible')
                }
            }));
        } catch (_) {}
    }

    function injectShell() {
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = LEGACY_CSS;
            document.head.appendChild(style);
        }
        if (!document.getElementById('freqAppMini')) {
            const holder = document.createElement('div');
            holder.innerHTML = LEGACY_HTML;
            while (holder.firstChild) document.body.appendChild(holder.firstChild);
        }
        const report = document.getElementById('freq-openFullReport');
        const statsLink = document.getElementById('freq-statsLinkMini');
        const canOpenStats = isSuperlibrarian();

        if (statsLink) {
            statsLink.href = REPORT_URL;
            statsLink.style.display = canOpenStats ? '' : 'none';
        }

        if (report && !report.dataset.pmkBound) {
            report.dataset.pmkBound = '1';
            report.style.display = canOpenStats ? '' : 'none';
            report.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                window.open(REPORT_URL, '_blank', 'noopener');
            });
        }

    }

    async function startLegacy() {

    // Configuration Koha — même projet et mêmes collections que Attendance Counter 138.


    const {
        collection,
        addDoc,
        getDocs,
        updateDoc,
        doc,
        serverTimestamp,
        query,
        where,
        runTransaction
    , createDatabase, getSession} = window.PMKNativeData;

    const attendanceConfig=window.PMKAttendance.getConfig();
    const db = createDatabase('attendance');

    function getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function buildTimestampForLocalDateTime(dateString, hourMinute) {
        const [year, month, day] = (dateString || '').split('-').map(Number);
        const [hour, minute] = (hourMinute || '').split(':').map(Number);

        if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
            return new Date().toISOString();
        }

        const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
        return localDate.toISOString();
    }

    function getDocTimestampMillis(docData) {
        const updated = docData && docData.updatedAt && typeof docData.updatedAt.toMillis === 'function'
            ? docData.updatedAt.toMillis()
            : 0;
        const created = docData && docData.createdAt && typeof docData.createdAt.toMillis === 'function'
            ? docData.createdAt.toMillis()
            : 0;
        return Math.max(updated, created);
    }

    let state = {
        user: null,
        locations: [],
        current: {
            adults: 0,
            kids: 0,
            date: getLocalDateString(),
            locationId: null
        },
        timestamps: {
            adults: [],
            kids: []
        },
        isCompact: false,
        correction: {
            adults: 0,
            kids: 0,
            hour: "12:00",
            reason: ""
        }
    };

    const el = id => document.getElementById(id);

    function updateStatus(message) {
        el('freq-statusMini').textContent = message;
    }

    function selectPrimaryCountDoc(docs) {
        if (!docs || docs.length === 0) return null;
        if (docs.length === 1) return docs[0];

        let bestDoc = docs[0];
        let bestScore = getDocTimestampMillis(bestDoc.data());

        for (let i = 1; i < docs.length; i++) {
            const score = getDocTimestampMillis(docs[i].data());
            if (score > bestScore) {
                bestDoc = docs[i];
                bestScore = score;
            }
        }

        return bestDoc;
    }

    function ensureMiniButtonsVisible() {
        if (state.isCompact) return;
        const appElement = el('freqAppMini');
        if (!appElement) return;
        appElement.style.removeProperty('width');
        appElement.style.removeProperty('height');
    }

    // Maintient le compteur dans la zone visible après un changement de taille d'écran.
    function fitMiniToViewport() {
        const appElement = el('freqAppMini');
        if (!appElement || !appElement.classList.contains('visible')) return;

        // En smartphone, le CSS responsive impose volontairement la position.
        if (window.matchMedia('(max-width: 575.98px)').matches) {
            return;
        }

        const margin = 8;
        const rect = appElement.getBoundingClientRect();
        const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
        const maxTop = Math.max(margin, window.innerHeight - Math.min(rect.height, window.innerHeight - (margin * 2)) - margin);

        const nextLeft = Math.min(Math.max(rect.left, margin), maxLeft);
        const nextTop = Math.min(Math.max(rect.top, margin), maxTop);

        if (Math.abs(nextLeft - rect.left) > 0.5 || Math.abs(nextTop - rect.top) > 0.5) {
            appElement.style.left = nextLeft + 'px';
            appElement.style.top = nextTop + 'px';
            appElement.style.right = 'auto';

            localStorage.setItem('freqAppPosition', JSON.stringify({
                x: nextLeft,
                y: nextTop
            }));
        }
    }

    // Activer/désactiver les boutons selon la sélection de commune
    function updateButtonsState() {
        const hasLocation = !!state.current.locationId;

        // Boutons de compteur
        el('freq-incAdultsMini').disabled = !hasLocation;
        el('freq-decAdultsMini').disabled = !hasLocation;
        el('freq-incKidsMini').disabled = !hasLocation;
        el('freq-decKidsMini').disabled = !hasLocation;

        // Boutons d'action
        el('freq-btnResetMini').disabled = !hasLocation;
        el('freq-btnUpdateMini').disabled = !hasLocation;
        el('freq-btnCorrectionMini').disabled = !hasLocation;
        el('freq-btnFixLocationMini').disabled = !hasLocation;

        if (!hasLocation) {
            updateStatus('Sélectionnez un lieu');
        } else {
            updateStatus('Prêt');
        }
    }

    // Gestion du drag & drop
    function initDragAndDrop() {
        const appElement = el('freqAppMini');
        let isDragging = false;
        let startX, startY, initialX, initialY;

        // Charger la position sauvegardée
        const savedPosition = localStorage.getItem('freqAppPosition');
        if (savedPosition) {
            const { x, y } = JSON.parse(savedPosition);
            appElement.style.left = x + 'px';
            appElement.style.top = y + 'px';
            appElement.style.right = 'auto';
        }

        // La taille est désormais imposée par le design pour garantir que tout reste visible.
        localStorage.removeItem('freqAppSize');
        localStorage.removeItem('freqAppNormalSize');
        if (!state.isCompact) ensureMiniButtonsVisible();

        requestAnimationFrame(fitMiniToViewport);

        appElement.addEventListener("mousedown", dragStart);
        appElement.addEventListener("touchstart", dragStart);

        function dragStart(e) {
            const interactiveTarget = e.target.closest(
                'button, a, input, select, option, label, textarea'
            );

            if (interactiveTarget || window.matchMedia('(max-width: 575.98px)').matches) {
                return;
            }

            if (e.type === "touchstart") {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }

            const rect = appElement.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            isDragging = true;
            appElement.classList.add('dragging');

            document.addEventListener("mousemove", drag);
            document.addEventListener("touchmove", drag);
            document.addEventListener("mouseup", dragEnd);
            document.addEventListener("touchend", dragEnd);
        }

        function drag(e) {
            if (!isDragging) return;

            e.preventDefault();

            let currentX, currentY;
            if (e.type === "touchmove") {
                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }

            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            const newX = initialX + deltaX;
            const newY = initialY + deltaY;

            const maxX = window.innerWidth - appElement.offsetWidth;
            const maxY = window.innerHeight - appElement.offsetHeight;

            appElement.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
            appElement.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
            appElement.style.right = 'auto';
        }

        function dragEnd() {
            if (!isDragging) return;

            isDragging = false;
            appElement.classList.remove('dragging');

            const rect = appElement.getBoundingClientRect();
            localStorage.setItem('freqAppPosition', JSON.stringify({
                x: rect.left,
                y: rect.top
            }));

            document.removeEventListener("mousemove", drag);
            document.removeEventListener("touchmove", drag);
            document.removeEventListener("mouseup", dragEnd);
            document.removeEventListener("touchend", dragEnd);
        }
    }

    // Mode accordéon
    function initCompactMode() {
        const toggleBtn = el('freq-toggleCompact');
        const appElement = el('freqAppMini');

        const savedCompact = localStorage.getItem('freqAppCompact');
        if (savedCompact === 'true') {
            state.isCompact = true;
            appElement.classList.add('compact');
            toggleBtn.textContent = '+';
        }

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.isCompact = !state.isCompact;

            if (state.isCompact) {
                appElement.classList.add('compact');
                toggleBtn.textContent = '+';
            } else {
                appElement.classList.remove('compact');
                toggleBtn.textContent = '−';
                ensureMiniButtonsVisible();
            }

            localStorage.setItem('freqAppCompact', state.isCompact.toString());
            requestAnimationFrame(fitMiniToViewport);
        });
    }

    // Gestion de la correction horaire
    function initCorrectionModal() {
        const overlay = el('freq-correction-overlay');
        const modal = el('freq-correction-modal');
        const hoursInput = el('freq-correction-hours');
        const minutesInput = el('freq-correction-minutes');
        const preview = el('freq-correction-preview');
        const cancelBtn = el('freq-correction-cancel');
        const validateBtn = el('freq-correction-validate');
        const adultBtn = el('freq-correction-adult');
        const kidBtn = el('freq-correction-kid');
        const reasonInput = el('freq-correction-reason');

        // Ouvrir la modal
        el('freq-btnCorrectionMini').addEventListener('click', () => {
            // Réinitialiser la correction
            state.correction.adults = 0;
            state.correction.kids = 0;
            state.correction.hour = "12:00";
            state.correction.reason = "";
            reasonInput.value = '';

            // Mettre l'heure actuelle par défaut
            const now = new Date();
            hoursInput.value = now.getHours().toString().padStart(2, '0');
            minutesInput.value = now.getMinutes().toString().padStart(2, '0');

            updateCorrectionPreview();
            updateCorrectionValidateButton();

            overlay.classList.add('visible');
            modal.classList.add('visible');
        });

        // Fermer la modal
        function closeModal() {
            overlay.classList.remove('visible');
            modal.classList.remove('visible');
        }

        overlay.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Mettre à jour l'aperçu quand l'heure change
        function updateCorrectionPreview() {
            const hours = hoursInput.value.padStart(2, '0');
            const minutes = minutesInput.value.padStart(2, '0');
            state.correction.hour = `${hours}:${minutes}`;
            preview.textContent = `Heure sélectionnée : ${hours}h${minutes}`;
        }

        function updateCorrectionValidateButton() {
            const total = state.correction.adults + state.correction.kids;
            state.correction.reason = reasonInput.value.trim();
            validateBtn.disabled = total === 0 || state.correction.reason.length < 3;
            validateBtn.textContent = total === 0 ? 'Valider (0)' : `Valider (${total}) — justification ${state.correction.reason.length < 3 ? 'requise' : 'prête'}`;
        }

        hoursInput.addEventListener('input', updateCorrectionPreview);
        minutesInput.addEventListener('input', updateCorrectionPreview);
        reasonInput.addEventListener('input', updateCorrectionValidateButton);

        // Gestion des boutons de comptage
        adultBtn.addEventListener('click', () => {
            state.correction.adults++;
            updateCorrectionValidateButton();
        });

        kidBtn.addEventListener('click', () => {
            state.correction.kids++;
            updateCorrectionValidateButton();
        });

        // Validation de la correction
        validateBtn.addEventListener('click', async () => {
            if (state.correction.adults + state.correction.kids === 0 || state.correction.reason.length < 3) return;

            try {
                updateStatus('Correction...');

                const date = el('freq-inputDateMini').value || getLocalDateString();
                const baseTimestamp = buildTimestampForLocalDateTime(date, state.correction.hour);
                await saveCountWithTimestamps(state.correction, baseTimestamp);
                updateCountsUI();

                updateStatus(`Correction enregistrée et justifiée : ${state.correction.adults} ${attendanceConfig.adultsLabel}, ${state.correction.kids} ${attendanceConfig.kidsLabel}`);
                setTimeout(() => updateStatus('Prêt'), 2000);

                closeModal();

            } catch (error) {
                updateStatus('Erreur correction');
            }
        });

        // Validation des inputs d'heure
        hoursInput.addEventListener('blur', () => {
            let value = parseInt(hoursInput.value) || 0;
            if (value < 0) value = 0;
            if (value > 23) value = 23;
            hoursInput.value = value.toString().padStart(2, '0');
            updateCorrectionPreview();
        });

        minutesInput.addEventListener('blur', () => {
            let value = parseInt(minutesInput.value) || 0;
            if (value < 0) value = 0;
            if (value > 59) value = 59;
            minutesInput.value = value.toString().padStart(2, '0');
            updateCorrectionPreview();
        });
    }

    function initActionsCollapse() {
        const toggle = el('freq-actionsToggleMini');
        const panel = el('freq-actionsPanelMini');
        if (!toggle || !panel) return;

        const STORAGE_KEY = 'freqMiniActionsExpanded';
        let expanded = localStorage.getItem(STORAGE_KEY) === 'true';

        function apply() {
            panel.classList.toggle('open', expanded);
            toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            localStorage.setItem(STORAGE_KEY, expanded ? 'true' : 'false');
            requestAnimationFrame(fitMiniToViewport);
        }

        // Par défaut : rétracté. Une ouverture volontaire est mémorisée sur ce poste.
        apply();

        toggle.addEventListener('click', function() {
            expanded = !expanded;
            apply();
        });
    }

    function initMiniUI() {
        el('freq-inputDateMini').value = state.current.date;
        el('freq-fix-from-mini').value = state.current.date;
        el('freq-fix-to-mini').value = state.current.date;

        loadLocations();
        initMiniEvents();
        initDragAndDrop();
        initCompactMode();
        initActionsCollapse();
        initCorrectionModal();
        initLocationFixModal();
        initDayRollover();
        setTimeout(function () {
            ensureMiniButtonsVisible();
            fitMiniToViewport();
        }, 0);

        window.addEventListener('resize', function () {
            ensureMiniButtonsVisible();
            fitMiniToViewport();
        });

        updateButtonsState();
        updateStatus('Initialisation...');
    }

    let observedLocalDay = getLocalDateString();
    let dayTimer = null;
    async function reconcileLocalDay() {
        const today = getLocalDateString();
        if (today === observedLocalDay) return false;
        const dateInput = el('freq-inputDateMini');
        const followedToday = !dateInput || !dateInput.value || dateInput.value === observedLocalDay;
        observedLocalDay = today;
        if (!followedToday || !dateInput) return false;
        dateInput.value = today;
        state.current.date = today;
        el('freq-fix-from-mini').value = today;
        el('freq-fix-to-mini').value = today;
        updateStatus('Nouvelle journée : chargement du ' + today);
        await loadCountsForSelectedDate();
        return true;
    }
    function initDayRollover() {
        if (dayTimer) return;
        dayTimer = window.setInterval(reconcileLocalDay, 30000);
        window.addEventListener('focus', reconcileLocalDay);
        document.addEventListener('visibilitychange', function() { if (!document.hidden) reconcileLocalDay(); });
        window.addEventListener('beforeunload', function() { if (dayTimer) window.clearInterval(dayTimer); }, {once:true});
    }

    function initMiniEvents() {
        el('freq-incAdultsMini').addEventListener('click', async () => {
            await handleIncrement('adults');
        });

        el('freq-decAdultsMini').addEventListener('click', async () => {
            await handleDecrement('adults');
        });

        el('freq-incKidsMini').addEventListener('click', async () => {
            await handleIncrement('kids');
        });

        el('freq-decKidsMini').addEventListener('click', async () => {
            await handleDecrement('kids');
        });

        el('freq-btnUpdateMini').addEventListener('click', async () => {
            updateStatus('MAJ...');
            await loadCountsForSelectedDate();
            updateStatus('MAJ OK');
            setTimeout(() => updateStatus('Prêt'), 2000);
        });

        el('freq-btnResetMini').addEventListener('click', () => {
            state.current.adults = 0;
            state.current.kids = 0;
            state.timestamps.adults = [];
            state.timestamps.kids = [];
            updateCountsUI();
            updateStatus('Reset OK');
            setTimeout(() => updateStatus('Prêt'), 2000);
        });

        el('freq-selectLocationMini').addEventListener('change', () => {
            state.current.locationId = el('freq-selectLocationMini').value;

            if (state.current.locationId) {
                localStorage.setItem('freqSelectedLocation', state.current.locationId);
            } else {
                localStorage.removeItem('freqSelectedLocation');
            }

            updateButtonsState();
            updateStatus('Chargement...');
            loadCountsForSelectedDate();
        });

        el('freq-inputDateMini').addEventListener('change', () => {
            state.current.date = el('freq-inputDateMini').value;
            updateStatus('Chargement...');
            loadCountsForSelectedDate();
        });
    }

    function initLocationFixModal() {
        const overlay = el('freq-location-fix-overlay');
        const modal = el('freq-location-fix-modal');

        function openModal() {
            el('freq-fix-from-mini').value = state.current.date || getLocalDateString();
            el('freq-fix-to-mini').value = state.current.date || getLocalDateString();
            overlay.classList.add('visible');
            modal.classList.add('visible');
        }

        function closeModal() {
            overlay.classList.remove('visible');
            modal.classList.remove('visible');
        }

        el('freq-btnFixLocationMini').addEventListener('click', openModal);
        el('freq-fix-cancel-mini').addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        el('freq-fix-validate-mini').addEventListener('click', async () => {
            await applyLocationCorrectionMini();
            closeModal();
        });
    }

    // Authentification Koha : déclenchée sur les sites configurés.
    // On laisse Koha restaurer sa session via onAuthStateChanged, puis on ne
    // tente qu'une seule connexion anonyme si aucune session n'existe.
    let kohaSessionStarted = false;
    let miniUiInitialized = false;

    function initMiniUIOnce() {
        if (miniUiInitialized) return;
        miniUiInitialized = true;
        initMiniUI();
    }

    async function startKohaSession() {
        if(kohaSessionStarted)return;kohaSessionStarted=true;
        try{state.user=await getSession();updateStatus('Session Koha connectée');initMiniUIOnce();}
        catch(error){updateStatus('Session Koha indisponible');kohaSessionStarted=false;}
    }

    async function loadLocations() {
        try {
            updateStatus('Chargement lieux...');
            state.locations = [];
            const locationsSnapshot = await getDocs(collection(db, attendanceConfig.locationsCollection));

            locationsSnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                state.locations.push({
                    id: docSnap.id,
                    name: data.name
                });
            });

            state.locations.sort((a, b) => a.name.localeCompare(b.name));
            renderLocations();

            if (state.locations.length > 0) {
                await loadCountsForSelectedDate();
            }

        } catch (error) {
            updateStatus('Erreur lieux');
        }
    }

    function renderLocations() {
        const selectLocation = el('freq-selectLocationMini');
        const fixOldSelect = el('freq-fix-old-location-mini');
        const fixNewSelect = el('freq-fix-new-location-mini');
        selectLocation.innerHTML = '<option value="">-- Sélectionnez un lieu --</option>';
        fixOldSelect.innerHTML = '<option value="">Lieu à corriger</option>';
        fixNewSelect.innerHTML = '<option value="">Lieu de destination</option>';

        state.locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            selectLocation.appendChild(option);

            const oldOption = document.createElement('option');
            oldOption.value = location.id;
            oldOption.textContent = location.name;
            fixOldSelect.appendChild(oldOption);

            const newOption = document.createElement('option');
            newOption.value = location.id;
            newOption.textContent = location.name;
            fixNewSelect.appendChild(newOption);
        });

        const savedLocation = localStorage.getItem('freqSelectedLocation') || attendanceConfig.defaultLocationId;
        if (savedLocation && state.locations.some(loc => loc.id === savedLocation)) {
            state.current.locationId = savedLocation;
            selectLocation.value = savedLocation;
            updateButtonsState();
            updateStatus('Lieu restauré');
        } else {
            state.current.locationId = null;
            selectLocation.value = '';
            updateButtonsState();
            updateStatus('Sélectionnez un lieu');
        }

        updateStatus(`${state.locations.length} lieux`);
    }

    async function applyLocationCorrectionMini() {
        const oldLocationId = el('freq-fix-old-location-mini').value;
        const newLocationId = el('freq-fix-new-location-mini').value;
        const from = el('freq-fix-from-mini').value;
        const to = el('freq-fix-to-mini').value;

        if (!oldLocationId || !newLocationId) {
            alert('Sélectionnez le lieu source et le nouveau lieu');
            return;
        }

        if (oldLocationId === newLocationId) {
            alert('Le lieu source et le nouveau lieu doivent être différents');
            return;
        }

        if (!from || !to) {
            alert('Sélectionnez une plage de dates');
            return;
        }

        if (from > to) {
            alert('La date de début doit être antérieure ou égale à la date de fin');
            return;
        }

        const oldLocationName = state.locations.find(l => l.id === oldLocationId)?.name || oldLocationId;
        const newLocationName = state.locations.find(l => l.id === newLocationId)?.name || newLocationId;

        if (!confirm(`Corriger les passages de "${oldLocationName}" vers "${newLocationName}" du ${from} au ${to} ?`)) {
            return;
        }

        try {
            updateStatus('Recherche des corrections...');
            const snapshot = await getDocs(collection(db, attendanceConfig.countsCollection));
            const docsToFix = [];

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.locationId === oldLocationId && data.date >= from && data.date <= to) {
                    docsToFix.push({ id: docSnap.id });
                }
            });

            if (docsToFix.length === 0) {
                updateStatus('Aucune entrée à corriger');
                alert('Aucune entrée trouvée pour ces critères');
                return;
            }

            updateStatus(`Correction de ${docsToFix.length} entrée(s)...`);

            for (const entry of docsToFix) {
                await updateDoc(doc(db, attendanceConfig.countsCollection, entry.id), {
                    locationId: newLocationId,
                    correctedFromLocationId: oldLocationId,
                    correctedAt: serverTimestamp(),
                    correctedBy: state.user ? state.user.uid : 'unknown',
                    updatedAt: serverTimestamp()
                });
            }

            if (state.current.locationId === oldLocationId) {
                state.current.locationId = newLocationId;
                el('freq-selectLocationMini').value = newLocationId;
                localStorage.setItem('freqSelectedLocation', newLocationId);
            }

            await loadCountsForSelectedDate();
            updateStatus(`${docsToFix.length} entrée(s) corrigée(s)`);
            alert(`${docsToFix.length} entrée(s) corrigée(s) avec succès`);
            setTimeout(() => updateStatus('Prêt'), 2000);
        } catch (error) {
            updateStatus('Erreur correction lieux');
            alert('Erreur lors de la correction des lieux: ' + error.message);
        }
    }

    function updateCountsUI() {
        el('freq-countAdultsMini').textContent = state.current.adults;
        el('freq-countKidsMini').textContent = state.current.kids;
        const total = el('freq-totalMini');
        if (total) total.textContent = Number(state.current.adults || 0) + Number(state.current.kids || 0);
    }

    async function mutateCounter(type, delta) {
        if (!state.current.locationId) {updateStatus('Sélectionnez un lieu');return false;}
        state.current.date=el('freq-inputDateMini').value || getLocalDateString();
        const currentData=await getCurrentCountFromDB();
        const result=await window.PMKAttendance.mutate({db,doc,runTransaction,serverTimestamp,configuration:attendanceConfig},{
            type,delta,locationId:state.current.locationId,date:state.current.date,
            existingId:currentData?.id,userId:state.user?.uid
        });
        state.current.adults=result.adults;state.current.kids=result.kids;
        state.timestamps.adults=result.adultTimestamps;state.timestamps.kids=result.kidTimestamps;
        updateCountsUI();return true;
    }

    async function handleIncrement(type) {
        try {
            updateStatus('Sync...');
            if (!await mutateCounter(type, 1)) return;
            updateStatus((type==='adults'?attendanceConfig.adultsLabel:attendanceConfig.kidsLabel)+' +'+attendanceConfig.step);
            setTimeout(() => updateStatus('Prêt'), 1500);
        } catch (error) {
            console.error('PMK139 — incrément', error);
            updateStatus('Erreur');
        }
    }

    async function handleDecrement(type) {
        try {
            updateStatus('Sync...');
            if (!await mutateCounter(type, -1)) return;
            updateStatus('Annulation OK');
            setTimeout(() => updateStatus('Prêt'), 1500);
        } catch (error) {
            console.error('PMK139 — décrément', error);
            updateStatus('Erreur');
        }
    }

    async function getCurrentCountFromDB() {
        if (!state.current.locationId || !state.current.date) return null;

        try {
            const countsQuery = query(
                collection(db, attendanceConfig.countsCollection),
                where('locationId', '==', state.current.locationId),
                where('date', '==', state.current.date)
            );

            const countsSnapshot = await getDocs(countsQuery);

            if (!countsSnapshot.empty) {
                const allDocs = countsSnapshot.docs;
                const primaryDoc = selectPrimaryCountDoc(allDocs);
                if (!primaryDoc) return null;
                return {
                    data: primaryDoc.data(),
                    id: primaryDoc.id,
                    duplicateCount: allDocs.length
                };
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    async function loadCountsForSelectedDate() {
        if (!state.current.locationId || !state.current.date) return;

        try {
            updateStatus('Chargement...');
            const currentData = await getCurrentCountFromDB();

            if (currentData) {
                state.current.adults = currentData.data.adults || 0;
                state.current.kids = currentData.data.kids || 0;
                state.timestamps.adults = currentData.data.adultTimestamps || [];
                state.timestamps.kids = currentData.data.kidTimestamps || [];
                updateCountsUI();
                updateStatus('Données OK');
            } else {
                state.current.adults = 0;
                state.current.kids = 0;
                state.timestamps.adults = [];
                state.timestamps.kids = [];
                updateCountsUI();
                updateStatus('Nouveau');
            }

        } catch (error) {
            updateStatus('Erreur chargement');
        }
    }

    async function saveCountWithTimestamps(correction,timestamp) {
        if (!state.current.locationId) return;
        state.current.date=el('freq-inputDateMini').value || getLocalDateString();
        const currentData=await getCurrentCountFromDB();
        const result=await window.PMKAttendance.mutate({db,doc,runTransaction,serverTimestamp,configuration:attendanceConfig},{
            type:'correction',locationId:state.current.locationId,date:state.current.date,existingId:currentData?.id,userId:state.user?.uid,
            additions:{adults:correction.adults,kids:correction.kids,timestamp},reason:correction.reason
        });
        state.current.adults=result.adults;state.current.kids=result.kids;
        state.timestamps.adults=result.adultTimestamps;state.timestamps.kids=result.kidTimestamps;
    }

    // Initialisation pilotée par PMK 139.
    const bridge = window.PMKAttendanceMediabus;
    const module = document.getElementById('freqAppMini');
    if (module && bridge && bridge.enabled !== false && bridge.isMediabus()) {
        if (bridge.autoOpen !== false) module.classList.add('visible');
        requestAnimationFrame(fitMiniToViewport);
        startKohaSession();
        if (typeof bridge._markReady === 'function') bridge._markReady();
    }
    }

    async function ensureStarted() {
        if (started) return true;
        if (starting) return starting;
        if (!isMediabus() || config.enabled === false || config.miniEnabled===false) return false;

        starting = (async function() {
            injectShell();
            decorate(document.getElementById('freqAppMini'));
            await startLegacy();
            started = true;
            dispatchState('started');
            return true;
        })().catch(function(error) {
            console.error('PMK139 — compteur de fréquentation indisponible', error);
            dispatchState('error');
            return false;
        }).finally(function() { starting = null; });
        return starting;
    }

    async function open() {
        if (!isMediabus() || config.enabled === false || config.miniEnabled===false) return false;
        await ensureStarted();
        const node = document.getElementById('freqAppMini');
        if (!node) return false;
        node.classList.add('visible');
        dispatchState('open');
        return true;
    }

    function hideInternally(reason) {
        const node = document.getElementById('freqAppMini');
        if (!node) return false;
        node.classList.remove('visible');
        dispatchState(reason || 'hidden');
        return true;
    }

    function applyConfig(next) {
        config = normalizeConfiguration(next);
        resolveReady(bridge);
        decorate(document.getElementById('freqAppMini'));
        decorate(document.getElementById('freqApp'));
        bridge.enabled = config.enabled !== false;
        bridge.autoOpen = config.autoOpen !== false;
        if (!isMediabus() || config.miniEnabled===false) {hideInternally('outside-scope'); dispatchState('outside-scope'); return;}
        if (config.enabled === false) { hideInternally('disabled'); dispatchState('disabled'); return; }
        if (config.autoOpen !== false && !new URLSearchParams(location.search).has('pmk_page')) open();
        else dispatchState('configured');
    }

    function registerWithPMK() {
        if (!window.PMKConfig || registered) return false;
        registered = true;
        window.PMKConfig.registerModule({
            id: MODULE_ID,
            schemaVersion: 1,
            name: {fr:'Compteur de fréquentation',en:'Attendance counter'},
            description: {fr:'Un compteur commun aux vues flottante et pleine page : mêmes lieux, compteurs, réglages et historique. Les statistiques et exports restent disponibles dans la page dédiée.',en:'One counter shared by floating and full-page views, with the same locations, settings and history.'},
            category:{fr:'Circulation et accueil',en:'Circulation and front desk'},
            defaults:JSON.parse(JSON.stringify(DEFAULTS)),
            normalize:normalizeConfiguration,
            validate:cfg=>{
                try {document.querySelector(cfg.branchSelector || DEFAULTS.branchSelector)} catch(_){return {ok:false,message:'La cible du site de connexion est invalide.'}}
                if(![cfg.countsCollection,cfg.locationsCollection].every(value=>typeof value==='string' && value.trim() && !value.includes('/')))return {ok:false,message:'Chaque collection doit avoir un nom simple, sans barre oblique.'};
                return {ok:true};
            },
            schema:[{type:'section',id:'views',label:{fr:'Vues et périmètre',en:'Views and scope'},fields:[
                {key:'enabled',type:'boolean',label:'Activer le compteur'},
                {key:'miniEnabled',type:'boolean',label:'Proposer le compteur flottant'},
                {key:'pageEnabled',type:'boolean',label:'Activer la page de saisie et de rapports'},
                {key:'autoOpen',type:'boolean',label:'Ouvrir automatiquement le compteur flottant'},
                {key:'branchNames',type:'textarea',label:'Sites autorisés (vide = tous)',help:'Codes ou noms des sites de connexion, séparés par des virgules ou des lignes. Les lieux de comptage se gèrent dans la page du compteur.'},
                {key:'branchSelector',type:'elementPicker',allowManual:true,manualAlways:true,label:'Élément portant le site de connexion',pick:ctx=>{
                    const picker=window.PMKConfig.elementPicker;
                    picker?.register(MODULE_ID,{});
                    return picker?.pickForConfig ? picker.pickForConfig({moduleId:MODULE_ID,targetUrl:location.pathname,rootObject:ctx.rootObject,fieldPath:ctx.fieldPath,persistAfterPick:false}) : Promise.resolve(null);
                }}
            ]},{type:'section',id:'counting',label:'Saisie et présentation',fields:[
                {key:'title',type:'text',label:'Titre du compteur'},
                {key:'adultsLabel',type:'text',label:'Nom de la première catégorie (champ historique adults)'},
                {key:'kidsLabel',type:'text',label:'Nom de la seconde catégorie (champ historique kids)'},
                {key:'step',type:'number',min:1,max:100,label:'Nombre de personnes ajouté ou retiré par clic'},
                {key:'defaultLocationId',type:'text',label:'ID du lieu proposé par défaut',help:'Utilisé en l’absence de choix mémorisé sur ce navigateur. Aucun lieu ni comptage existant n’est renommé.'},
                {key:'miniWidth',type:'number',min:300,max:520,label:'Largeur initiale du compteur flottant (px)'},
                {key:'defaultCountedWeeks',type:'number',min:1,max:53,label:'Semaines comptées par an proposées pour un nouveau lieu'},
            ]},{type:'section',id:'storage',advanced:true,label:'Stockage commun aux deux vues',description:'Les valeurs initiales conservent le stockage historique. Un changement de projet ou de collection prend effet au prochain chargement et ne déplace aucune donnée.',fields:[
                {key:'countsCollection',type:'text',label:'Collection des comptages'},
                {key:'locationsCollection',type:'text',label:'Collection des lieux'}
            ]}]
        });
        window.PMKConfig.getConfig(MODULE_ID).then(applyConfig).catch(function() { applyConfig(DEFAULTS); });
        if (typeof window.PMKConfig.subscribe === 'function') unsubscribe = window.PMKConfig.subscribe(MODULE_ID, applyConfig);
        return true;
    }

    const bridge = window.PMKAttendance = window.PMKAttendanceMediabus = {
        version: VERSION,
        moduleId: MODULE_ID,
        ready,
        getConfig:()=>JSON.parse(JSON.stringify(config)),
        mutate:mutateSharedCounter,
        decorate,
        inScope:isMediabus,
        hide:hideInternally,
        reportUrl: REPORT_URL,
        enabled: true,
        autoOpen: true,
        get available() { return isMediabus(); },
        isMediabus,
        isSuperlibrarian,
        open,
        openReport: function() {
            if (!isSuperlibrarian() || config.enabled===false || config.pageEnabled===false || !isMediabus()) return false;
            window.open(REPORT_URL, '_blank', 'noopener');
            return true;
        },
        _markReady: function() { started = true; dispatchState('legacy-ready'); }
    };

    function bootstrap() {
        if (!registerWithPMK()) {
            window.addEventListener('pmk:config-ready', registerWithPMK, { once: true });
            let tries = 0;
            const timer = window.setInterval(function() {
                tries += 1;
                if (registerWithPMK() || tries >= 100) {
                    window.clearInterval(timer);
                    if (!registered) applyConfig(DEFAULTS);
                }
            }, 50);
        }
        dispatchState('bootstrap');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    else bootstrap();

    window.addEventListener('beforeunload', function() {
        if (typeof unsubscribe === 'function') { try { unsubscribe(); } catch (_) {} }
    }, { once: true });
})(window, document);
