/* PimpMyKoha — configuration des pages internes, v1.0.0.
 * Un seul document PMK ; les réglages locaux sont des sources de reprise conservées.
 * La page Autorités est volontairement exclue de ce service.
 */
(function(window,document){
'use strict';
if(window.PMKPagesSettings)return;
const MODULE_ID='internal-pages-tools';
const catalog={
  "action-journal": {
    "title": "Journal des actions",
    "objective": "Partager les interventions et décisions de l’équipe dans un journal consultable.",
    "engine": "stockage Koha : entrées, versions, écoute en temps réel et export PDF.",
    "functions": [
      "Ajouter et modifier une action",
      "Retirer et restaurer une entrée",
      "Consulter les versions",
      "Exporter le journal en PDF"
    ],
    "prerequisites": "Session professionnelle Koha.",
    "runtime": {
      "permissions": {"create":"staff","edit":"staff","remove":"staff","restore":"staff"},
      "locale": "fr-FR",
      "entriesCollection": "entries",
      "logsCollection": "logs",
      "actionTypes": [
        "Création notice",
        "Modification notice",
        "Suppression notice",
        "Fusion notice",
        "Restauration",
        "Conditionnement",
        "Réparation",
        "Information",
        "Autre"
      ],
      "defaultAuthor": "",
      "showDeleted": false
    },
    "settings": {},
    "storageKey": "",
    "fields": [
{"path": "runtime.permissions.create", "label": "Journal — ajouter", "type": "text", "choices": [["staff", "Personnel autorisé à ouvrir la page"], ["superlibrarian", "Administrateur Koha uniquement"]]},
{"path": "runtime.permissions.edit", "label": "Journal — modifier", "type": "text", "choices": [["staff", "Personnel autorisé à ouvrir la page"], ["superlibrarian", "Administrateur Koha uniquement"]]},
{"path": "runtime.permissions.remove", "label": "Journal — retirer", "type": "text", "choices": [["staff", "Personnel autorisé à ouvrir la page"], ["superlibrarian", "Administrateur Koha uniquement"]]},
{"path": "runtime.permissions.restore", "label": "Journal — restaurer", "type": "text", "choices": [["staff", "Personnel autorisé à ouvrir la page"], ["superlibrarian", "Administrateur Koha uniquement"]]},
      {
        "path": "runtime.locale",
        "label": "Langue et format régional (ex. fr-FR)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.entriesCollection",
        "label": "Collection stockage Koha des entrées",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.logsCollection",
        "label": "Collection stockage Koha des versions",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.actionTypes",
        "label": "Types d’action (un par ligne)",
        "type": "list",
        "advanced": false
      },
      {
        "path": "runtime.defaultAuthor",
        "label": "Auteur proposé par défaut",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.showDeleted",
        "label": "Afficher initialement les entrées supprimées",
        "type": "boolean",
        "advanced": false
      }
    ]
  },
  "appointments": {
    "title": "Rendez-vous réseau",
    "objective": "Organiser les rendez-vous, créneaux et sondages de votre établissement.",
    "engine": "stockage Koha, agenda interne, récurrences, sondages et EmailJS facultatif.",
    "functions": [
      "Gérer les créneaux et thèmes",
      "Réserver et annuler",
      "Importer les participants",
      "Gérer les sondages et récurrences",
      "Configurer les notifications et exporter les résultats"
    ],
    "prerequisites": "Droits stockage Koha ; EmailJS uniquement pour les notifications.",
    "runtime": {
      "locale": "fr-FR",
      "collections": {
        "settings": "settings",
        "themes": "themes",
        "slots": "slots",
        "bookings": "bookings",
        "polls": "polls",
        "pollResponses": "pollResponses",
        "participants": "participants",
        "recurrenceRules": "recurrenceRules"
      },
      "adminPassword": "admin",
      "defaultView": "slots"
    },
    "settings": {},
    "storageKey": "",
    "fields": [
      {
        "path": "runtime.locale",
        "label": "Langue et format régional (ex. fr-FR)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.collections.settings",
        "label": "Réglages",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.collections.themes",
        "label": "Thèmes",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.collections.slots",
        "label": "Créneaux",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.collections.bookings",
        "label": "Réservations de rendez-vous",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.collections.polls",
        "label": "Sondages",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.collections.pollResponses",
        "label": "Réponses aux sondages",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.collections.participants",
        "label": "Participants",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.collections.recurrenceRules",
        "label": "Récurrences",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.defaultView",
        "label": "Vue initiale",
        "type": "text",
        "advanced": false,
        "choices": [
          [
            "slots",
            "Créneaux"
          ],
          [
            "polls",
            "Sondages"
          ],
          [
            "mine",
            "Mes demandes"
          ]
        ]
      }
    ]
  },
  "attendance-counter": {
    "title": "Compteur de fréquentation",
    "objective": "Saisir et analyser la fréquentation par lieu et date.",
    "engine": "Moteur commun du compteur flottant et de sa page.",
    "functions": [
      "Compter par catégories",
      "Gérer les lieux",
      "Corriger les comptages",
      "Consulter les statistiques et exporter"
    ],
    "prerequisites": "Koha et configuration commune du module Compteur de fréquentation.",
    "runtime": {},
    "settings": {},
    "storageKey": "",
    "configureModule": "attendance-mediabus-mini",
    "fields": []
  },
  "restore-deleted-items": {
    "title": "Restauration d’exemplaires",
    "objective": "Retrouver et restaurer les exemplaires supprimés, directement dans PimpMyKoha.",
    "engine": "Rapports Koha, restauration transactionnelle PMK, indexation et API Koha natives.",
    "functions": [
      "Rechercher par code-barres ou dates",
      "Restaurer un exemplaire ou un lot",
      "Proposer le prêt ou le retour après restauration"
    ],
    "prerequisites": "Rapports de recherche et droit edit_items ; droit edit_catalogue si la notice doit aussi être restaurée. Lecteur technique uniquement pour le cycle avancé prêt/retour. Aucun autre plugin requis.",
    "runtime": {
      "allowedUsernames": [],
      "patronCardnumber": "",
      "pluginClass": "",
      "runUrl": "/cgi-bin/koha/plugins/run.pl",
      "reportIdBarcode": 0,
      "reportIdDates": 0,
      "reportUrl": "/cgi-bin/koha/reports/guided_reports.pl",
      "reportParamName": "barcode|list",
      "reportDateFromParam": "Du|date",
      "reportDateToParam": "Au|date",
      "reportBatchSize": 100,
      "defaultLookbackDays": 90,
      "restBase": "/api/v1",
      "libraryId": null,
      "timeoutMs": 30000,
      "reportColumns": {}
    },
    "settings": {},
    "storageKey": "",
    "fields": [
      {
        "path": "runtime.allowedUsernames",
        "label": "Comptes Koha autorisés (un par ligne)",
        "type": "list",
        "advanced": false
      },
      {
        "path": "runtime.patronCardnumber",
        "label": "Carte du lecteur technique pour le prêt",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.reportIdBarcode",
        "label": "Rapport de recherche par codes-barres",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.reportIdDates",
        "label": "Rapport de recherche par dates",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.reportUrl",
        "label": "Page des rapports Koha",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.reportParamName",
        "label": "Nom du paramètre de codes-barres du rapport",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.reportDateFromParam",
        "label": "Nom du paramètre de date de début",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.reportDateToParam",
        "label": "Nom du paramètre de date de fin",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.reportBatchSize",
        "label": "Codes-barres par recherche",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.defaultLookbackDays",
        "label": "Période initiale de recherche (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.restBase",
        "label": "Racine de l’API Koha",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.libraryId",
        "label": "Code du site de circulation (vide = session Koha)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.reportColumns",
        "label": "Correspondance des colonnes des rapports",
        "type": "json",
        "advanced": true
      }
    ],
    "sqlFiles": [
      {
        "file": "sql/138-restauration-codes-barres.sql",
        "label": "Copier le SQL de recherche par codes-barres"
      },
      {
        "file": "sql/138-restauration-dates.sql",
        "label": "Copier le SQL de recherche par dates"
      }
    ]
  },
  "weeding": {
    "title": "Désherbage",
    "objective": "Préparer et documenter les décisions de désherbage ou de déplacement.",
    "engine": "API Koha, MARC, critères de rotation, taxonomie facultative et sauvegarde locale.",
    "functions": [
      "Scanner un document",
      "Préparer une sélection multicritère",
      "Évaluer les exemplaires",
      "Déplacer, signaler ou supprimer après confirmation",
      "Sauvegarder et restaurer une session, exporter"
    ],
    "prerequisites": "Permissions Koha pour les traitements ; taxonomie Koha facultative.",
    "runtime": {
      "apiBase": "/api/v1",
      "noticeUrl": "/cgi-bin/koha/catalogue/detail.pl?biblionumber=",
      "notForLoanExcluded": 1,
      "lostPilon": 1,
      "lostReview": 5,
      "reservoirLocations": [
        {
          "value": "reserv_adulte",
          "label": "Réservoir Adulte"
        },
        {
          "value": "reserv_jeune",
          "label": "Réservoir Jeunesse"
        }
      ],
      "floors": [
        {
          "value": "1er etage",
          "label": "1er étage"
        },
        {
          "value": "2eme etage",
          "label": "2ème étage"
        },
        {
          "value": "niv-inf",
          "label": "Niveau inférieur"
        },
        {
          "value": "RDC",
          "label": "RDC"
        },
        {
          "value": "Sous-sol",
          "label": "Sous-sol"
        }
      ],
      "floorRestField": "serial_issue_number",
      "domainMarcTag": "099",
      "domainMarcSubfield": "a",
      "subdomainMarcSubfield": "b",
      "themeMarcSubfield": "e",
      "maxItemsPerPreparation": 5000,
      "itemsPageSize": 250,
      "readGapMs": 75,
      "writeGapMs": 250,
      "biblioMetaCacheKey": "kwd-biblio-meta-v1",
      "biblioMetaCacheTtlMs": 604800000,
      "biblioMetaCacheMaxEntries": 2000,
      "referenceCacheKey": "kwd-reference-v1",
      "referenceCacheTtlMs": 604800000,
      "batchConcurrency": 1,
      "batchDelayMs": 250,
      "barcodeBatchSize": 50,
      "workspaceDbName": "kwd-desherbage-workspace-v1",
      "workspaceStoreName": "workspace",
      "workspaceKey": "current",
      "sessionStorageKey": "kwd-session-v2",
      "reservoirChoiceKey": "kwd-reservoir-choice-v1",
      "taxonomyCacheKey": "kwd-taxonomy-tree-v1",
      "taxonomyCacheTtlMs": 86400000,
      "taxonomyEnabled": true,
      "lowRotationDomains": [
        "Littérature",
        "Les Arts",
        "Arts",
        "Arts du spectacle",
        "Poésie et Théâtre",
        "Musique à lire",
        "Vie pratique",
        "Hommes et Société",
        "Sciences et Techniques",
        "Les civilisations",
        "Le Var",
        "La Région Sud"
      ],
      "normalRotationDomains": [
        "Bande dessinée",
        "Romans Ados",
        "Romans adultes",
        "Romans jeunesse",
        "Albums",
        "Contes",
        "Cinéma",
        "Musique",
        "Vivre ensemble",
        "Découvrir le monde",
        "Mon quotidien",
        "Parents et compagnie",
        "Objets",
        "Grandeur nature",
        "Informatique",
        "Lire autrement",
        "Pop-Up",
        "V.O"
      ],
      "ignoreLocations": [
        "tri",
        "Zone de tri",
        "Magasin",
        "Magasin/reserve",
        "MBA-BIB",
        "Bibliothèque",
        "MBA-J",
        "Espace Jeunesse",
        "MBA-R1",
        "Réserve 1",
        "MBA-R2",
        "Réserve 2",
        "Espace consultation",
        "Collectivités",
        "conservation",
        "Conservation",
        "bureaux",
        "Bureaux",
        "anim",
        "Animations",
        "Service archéologique"
      ],
      "specialLocationKeywords": [
        "Parents et compagnie",
        "parents-enfants",
        "réservoir",
        "reserv_",
        "parents",
        "réserv",
        "Réservoir Jeunesse",
        "Réservoir Adulte"
      ],
      "locationCategory": "LOC",
      "collectionCategory": "CCODE",
      "notLoanCategory": "statut",
      "lostCategory": "LOST",
      "timeoutMs": 30000,
      "taxonomyCollection": "treeData"
    },
    "settings": {},
    "storageKey": "",
    "fields": [
      {
        "path": "runtime.apiBase",
        "label": "Racine de l’API Koha",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.noticeUrl",
        "label": "Adresse des fiches notice (avant le numéro)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.notForLoanExcluded",
        "label": "Code NOT_LOAN pour l’exclusion du prêt",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.lostPilon",
        "label": "Code LOST pour le pilon",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.lostReview",
        "label": "Code LOST pour l’examen des collections",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.reservoirLocations",
        "label": "Localisations de réservoir (codes et libellés)",
        "type": "json",
        "advanced": false
      },
      {
        "path": "runtime.floors",
        "label": "Étages (codes et libellés)",
        "type": "json",
        "advanced": false
      },
      {
        "path": "runtime.floorRestField",
        "label": "Champ API de l’étage",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.domainMarcTag",
        "label": "Zone MARC du classement",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.domainMarcSubfield",
        "label": "Sous-zone du domaine",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.subdomainMarcSubfield",
        "label": "Sous-zone du sous-domaine",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.themeMarcSubfield",
        "label": "Sous-zone du thème",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.maxItemsPerPreparation",
        "label": "Maximum d’exemplaires par préparation",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.itemsPageSize",
        "label": "Exemplaires par lecture",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.readGapMs",
        "label": "Pause entre lectures (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.writeGapMs",
        "label": "Pause entre écritures (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.batchConcurrency",
        "label": "Traitements simultanés",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.batchDelayMs",
        "label": "Pause entre traitements (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.barcodeBatchSize",
        "label": "Codes-barres par lecture",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.taxonomyEnabled",
        "label": "Utiliser une arborescence Koha",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "runtime.lowRotationDomains",
        "label": "Domaines à rotation lente",
        "type": "list",
        "advanced": true
      },
      {
        "path": "runtime.normalRotationDomains",
        "label": "Domaines à rotation courante",
        "type": "list",
        "advanced": true
      },
      {
        "path": "runtime.ignoreLocations",
        "label": "Localisations exclues des propositions",
        "type": "list",
        "advanced": true
      },
      {
        "path": "runtime.specialLocationKeywords",
        "label": "Mots repérant les réservoirs et localisations particulières",
        "type": "list",
        "advanced": true
      },
      {
        "path": "runtime.locationCategory",
        "label": "Catégorie des localisations",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.collectionCategory",
        "label": "Catégorie des collections",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.notLoanCategory",
        "label": "Catégorie des statuts non-prêtables",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.lostCategory",
        "label": "Catégorie des statuts perdu",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.taxonomyCollection",
        "label": "Collection stockage Koha de l’arborescence",
        "type": "text",
        "advanced": true
      }
    ]
  },
  "inventory": {
    "title": "Inventaire",
    "objective": "Contrôler les exemplaires présents, manquants et incohérents par zone.",
    "engine": "IndexedDB, journal des scans, API Koha et formulaires natifs préservant les champs supplémentaires.",
    "functions": [
      "Créer et importer un inventaire",
      "Définir les zones et valeurs attendues",
      "Scanner, annuler un lot et gérer les conflits",
      "Prévisualiser les manquants et corrections",
      "Exporter et sauvegarder les inventaires"
    ],
    "prerequisites": "IndexedDB dans ce navigateur ; permissions et listes de valeurs Koha.",
    "runtime": {
      "apiBase": "/api/v1",
      "timeoutMs": 30000,
      "pageSize": 500
    },
    "settings": {
      "sounds": true,
      "update_last_seen": false,
      "clear_lost_on_find": false,
      "clear_notforloan_on_find": false,
      "consider_loans_default": false,
      "branch_basis": "holdingbranch",
      "check_fields": [
        "homebranch",
        "holdingbranch",
        "location",
        "itemcallnumber",
        "itype",
        "ccode"
      ],
      "floating_ignore_fields": [
        "homebranch",
        "holdingbranch"
      ],
      "floating_itemtypes": [],
      "av_loc_category": "LOC",
      "av_ccode_category": "CCODE",
      "av_public_category": "public",
      "av_sous_loc_category": "sous-local",
      "av_etage_category": "ETAGE",
      "av_notloan_category": "statut",
      "av_lost_category": "LOST",
      "public_marc_tag": "999",
      "public_marc_subfield": "q",
      "item_public_subfield": "q",
      "item_sous_loc_subfield": "y",
      "extra_av_categories": [],
      "error_map_columns": [
        {
          "key": "sous_loc",
          "label": "Sous-localisation",
          "item_field": "sous_loc",
          "optional": true
        },
        {
          "key": "etage",
          "label": "Étage",
          "item_field": "etage",
          "optional": true
        },
        {
          "key": "public",
          "label": "Public",
          "item_field": "public",
          "optional": false
        },
        {
          "key": "type_doc",
          "label": "Type de document",
          "item_field": "itype",
          "optional": false
        },
        {
          "key": "statut",
          "label": "Statut non-prêtable",
          "item_field": "notforloan",
          "optional": false
        }
      ],
      "no_restore_statuses": [],
      "missing_status": "",
      "missing_lost_status": "",
      "weeding_status": "",
      "weeding_lost_status": "",
      "auto_apply_weeding": false,
      "field_map": {
        "public": "public",
        "type_doc": "itype",
        "sous_loc": "sous_loc",
        "etage": "etage",
        "statut": "notforloan"
      }
    },
    "storageKey": "",
    "fields": [
      {
        "path": "settings.sounds",
        "label": "Sons de contrôle",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "settings.consider_loans_default",
        "label": "Prendre les prêts en compte par défaut",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "settings.branch_basis",
        "label": "Site de référence",
        "type": "text",
        "advanced": false,
        "choices": [
          [
            "holdingbranch",
            "Site actuel"
          ],
          [
            "homebranch",
            "Site propriétaire"
          ]
        ]
      },
      {
        "path": "settings.check_fields",
        "label": "Champs contrôlés par défaut",
        "type": "list",
        "advanced": false
      },
      {
        "path": "settings.floating_ignore_fields",
        "label": "Champs ignorés pour les exemplaires flottants",
        "type": "list",
        "advanced": false
      },
      {
        "path": "settings.floating_itemtypes",
        "label": "Types de documents flottants",
        "type": "list",
        "advanced": false
      },
      {
        "path": "settings.av_loc_category",
        "label": "Catégorie des localisations",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.av_ccode_category",
        "label": "Catégorie des collections",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.av_public_category",
        "label": "Catégorie des publics",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.av_sous_loc_category",
        "label": "Catégorie des sous-localisations",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.av_etage_category",
        "label": "Catégorie des étages",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.av_notloan_category",
        "label": "Catégorie des statuts non-prêtables",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.av_lost_category",
        "label": "Catégorie des statuts perdu",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.public_marc_tag",
        "label": "Zone MARC des exemplaires",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.item_public_subfield",
        "label": "Sous-zone MARC du public",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.item_sous_loc_subfield",
        "label": "Sous-zone MARC de la sous-localisation",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.extra_av_categories",
        "label": "Listes de valeurs supplémentaires",
        "type": "list",
        "advanced": false
      },
      {
        "path": "settings.error_map_columns",
        "label": "Champs contrôlés et correspondances",
        "type": "json",
        "advanced": false
      },
      {
        "path": "settings.no_restore_statuses",
        "label": "Statuts à préserver lors du contrôle",
        "type": "list",
        "advanced": false
      },
      {
        "path": "settings.missing_status",
        "label": "NOT_LOAN proposé pour les manquants",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.missing_lost_status",
        "label": "LOST proposé pour les manquants",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.weeding_status",
        "label": "NOT_LOAN proposé pour le désherbage",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.weeding_lost_status",
        "label": "LOST proposé pour le désherbage",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.apiBase",
        "label": "Racine de l’API Koha",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.pageSize",
        "label": "Résultats par lecture",
        "type": "number",
        "advanced": true
      }
    ]
  },
  "reservations": {
    "title": "Maintenance des réservations",
    "objective": "Repérer les réservations qui nécessitent un examen et préparer leur traitement.",
    "engine": "API réservations, notices et exemplaires, règles explicites, simulation et recontrôle natif.",
    "functions": [
      "Charger et filtrer les réservations",
      "Expliquer les blocages et délais",
      "Exclure des catégories ou statuts locaux",
      "Préparer puis confirmer les annulations",
      "Exporter les données et conseils"
    ],
    "prerequisites": "Permissions API Koha ; les seuils sont des repères à adapter au règlement local.",
    "runtime": {
      "API": "/api/v1",
      "ROWS": 50,
      "API_PAGE": 100,
      "MIN_GAP": 250,
      "DEEP_DELAY": 120,
      "timeoutMs": 30000
    },
    "settings": {
      "oldDays": 30,
      "veryOldDays": 60,
      "idleDays": 30,
      "waitingDays": 11,
      "waitingCriticalDays": 30,
      "transitWatchDays": 8,
      "transitDays": 14,
      "transitCriticalDays": 30,
      "pressureHigh": 3,
      "loanDays": 30,
      "renewalDays": 30,
      "maxRenewals": 1,
      "processingDays": 7,
      "cancelRequestDays": 7,
      "suspendIndefiniteDays": 365,
      "suspendOverdueDays": 7,
      "excludedLibraries": "",
      "excludedLocations": "",
      "excludedPermanentLocations": "",
      "excludedCollectionCodes": "",
      "excludedItemTypes": "",
      "excludedLostStatuses": "",
      "excludedDamagedStatuses": "",
      "excludedWithdrawnStatuses": "",
      "excludedNotForLoanStatuses": "",
      "excludedPatronCategories": "PE",
      "autoExplainOnLoad": true,
      "autoDeepAfterLoad": false,
      "autoDeepScope": "priority",
      "autoDeepMax": 200,
      "disabledRuleIds": []
    },
    "storageKey": "drac_quality_reservations_settings_v3",
    "fields": [
      {
        "path": "settings.oldDays",
        "label": "Ancienneté à examiner (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.veryOldDays",
        "label": "Ancienneté prioritaire (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.idleDays",
        "label": "Absence d’activité à examiner (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.waitingDays",
        "label": "Attente de retrait à examiner (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.waitingCriticalDays",
        "label": "Attente de retrait prioritaire (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.transitWatchDays",
        "label": "Transit à surveiller (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.transitDays",
        "label": "Transit à vérifier (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.transitCriticalDays",
        "label": "Transit prioritaire (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.pressureHigh",
        "label": "Demandes en attente signalant une forte pression",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.loanDays",
        "label": "Durée de prêt de référence (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.renewalDays",
        "label": "Durée de renouvellement de référence (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.maxRenewals",
        "label": "Nombre de renouvellements de référence",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.processingDays",
        "label": "Traitement à examiner (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.cancelRequestDays",
        "label": "Demande d’annulation ancienne (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.suspendIndefiniteDays",
        "label": "Suspension sans échéance à examiner (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.suspendOverdueDays",
        "label": "Suspension échue à examiner (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.excludedLibraries",
        "label": "Sites exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedLocations",
        "label": "Localisations exclues",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedPermanentLocations",
        "label": "Localisations permanentes exclues",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedCollectionCodes",
        "label": "Collections exclues",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedItemTypes",
        "label": "Types de documents exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedLostStatuses",
        "label": "Codes LOST exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedDamagedStatuses",
        "label": "Codes DAMAGED exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedWithdrawnStatuses",
        "label": "Codes WITHDRAWN exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedNotForLoanStatuses",
        "label": "Codes NOT_LOAN exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedPatronCategories",
        "label": "Catégories d’adhérents exclues",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.autoExplainOnLoad",
        "label": "Expliquer les dossiers après le chargement demandé",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "settings.autoDeepAfterLoad",
        "label": "Lancer l’analyse approfondie après le chargement demandé",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "settings.autoDeepScope",
        "label": "Périmètre de l’analyse automatique",
        "type": "text",
        "advanced": false,
        "choices": [
          [
            "priority",
            "Dossiers prioritaires"
          ],
          [
            "visible",
            "Dossiers visibles"
          ]
        ]
      },
      {
        "path": "settings.autoDeepMax",
        "label": "Maximum de notices à approfondir",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.API",
        "label": "Racine de l’API Koha",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.ROWS",
        "label": "Lignes par page",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.API_PAGE",
        "label": "Résultats par lecture API",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.MIN_GAP",
        "label": "Pause entre lectures (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.DEEP_DELAY",
        "label": "Pause entre analyses approfondies (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "settings.disabledRuleIds",
        "label": "Contrôles désactivés (identifiants des règles)",
        "type": "list",
        "advanced": true
      }
    ]
  },
  "loans": {
    "title": "Prêts & litiges",
    "objective": "Examiner les prêts anciens, retards et réclamations.",
    "engine": "API prêts, lecteurs, exemplaires et réclamations ; analyse approfondie à la demande.",
    "functions": [
      "Analyser les prêts et retards",
      "Examiner les litiges",
      "Préparer le traitement de réclamations",
      "Exporter les dossiers"
    ],
    "prerequisites": "Permissions API et droits Koha de circulation/réclamations.",
    "runtime": {
      "API": "/api/v1",
      "ROWS": 50,
      "API_PAGE": 100,
      "MIN_GAP": 250,
      "DEEP_LIMIT": 300,
      "timeoutMs": 30000,
      "resolutionCategory": "RETURN_CLAIM_RESOLUTION"
    },
    "settings": {
      "oldDays": 365,
      "veryOldDays": 730,
      "overdueDays": 180,
      "criticalOverdueDays": 730,
      "idleDays": 365,
      "claimDays": 90,
      "claimCriticalDays": 365,
      "unseenRenewals": 3,
      "disabledRuleIds": []
    },
    "storageKey": "drac_quality_loans_settings_v1",
    "fields": [
      {
        "path": "settings.oldDays",
        "label": "Ancienneté à examiner (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.veryOldDays",
        "label": "Ancienneté prioritaire (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.overdueDays",
        "label": "Retard important (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.criticalOverdueDays",
        "label": "Retard prioritaire (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.idleDays",
        "label": "Absence d’activité à examiner (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.claimDays",
        "label": "Réclamation ancienne (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.claimCriticalDays",
        "label": "Réclamation prioritaire (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.unseenRenewals",
        "label": "Renouvellements sans présentation à examiner",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.API",
        "label": "Racine de l’API Koha",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.ROWS",
        "label": "Lignes par page",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.API_PAGE",
        "label": "Résultats par lecture API",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.MIN_GAP",
        "label": "Pause entre lectures (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.DEEP_LIMIT",
        "label": "Dossiers par analyse approfondie",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.resolutionCategory",
        "label": "Catégorie des motifs de résolution des réclamations",
        "type": "text",
        "advanced": true
      },
      {
        "path": "settings.disabledRuleIds",
        "label": "Contrôles désactivés (identifiants des règles)",
        "type": "list",
        "advanced": true
      }
    ]
  },
  "transfers": {
    "title": "Transferts / navette",
    "objective": "Surveiller les demandes de transfert et les documents en transit entre sites.",
    "engine": "Rapport SQL paginé, API exemplaires, règles de délai et traitement natif.",
    "functions": [
      "Charger et filtrer les transferts",
      "Distinguer attente et transit",
      "Examiner et marquer les exemplaires recherchés",
      "Simuler une annulation et vérifier son résultat",
      "Exporter CSV ou JSON"
    ],
    "prerequisites": "Créer le rapport SQL Transferts fourni puis renseigner son ID.",
    "runtime": {
      "SVC": "/cgi-bin/koha/svc/report",
      "ITEMS": "/api/v1/items",
      "RETURNS": "/cgi-bin/koha/circ/returns.pl",
      "BATCH_ITEMS": "/cgi-bin/koha/tools/batchMod.pl",
      "PAGE": 50,
      "REPORT_BATCH": 1000,
      "MIN_GAP": 250,
      "timeoutMs": 30000
    },
    "settings": {
      "reportId": 0,
      "requestedWarnDays": 7,
      "requestedReviewDays": 14,
      "requestedCriticalDays": 30,
      "transitWatchDays": 8,
      "transitReviewDays": 14,
      "transitCriticalDays": 30,
      "flagNonLoan": false,
      "routeLongDays": 14,
      "searchedAtApiField": "searched_at",
      "allowNativeCancel": false,
      "excludedLibraries": "",
      "excludedLocations": "",
      "excludedPermanentLocations": "",
      "excludedCollectionCodes": "",
      "excludedItemTypes": "",
      "excludedLostStatuses": "",
      "excludedDamagedStatuses": "",
      "excludedWithdrawnStatuses": "",
      "excludedNotForLoanStatuses": "",
      "disabledRuleIds": []
    },
    "storageKey": "dq_transfers_settings_v2",
    "sqlFile": "sql/138-transferts.sql",
    "fields": [
      {
        "path": "settings.reportId",
        "label": "Identifiant du rapport SQL",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.requestedWarnDays",
        "label": "Demande de transfert à surveiller (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.requestedReviewDays",
        "label": "Demande de transfert à vérifier (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.requestedCriticalDays",
        "label": "Demande de transfert prioritaire (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.transitWatchDays",
        "label": "Transit à surveiller (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.transitReviewDays",
        "label": "Transit à vérifier (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.transitCriticalDays",
        "label": "Transit prioritaire (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.flagNonLoan",
        "label": "Signaler le seul statut non-prêtable",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "settings.routeLongDays",
        "label": "Trajet long de référence (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.searchedAtApiField",
        "label": "Champ API « déjà recherché à »",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.allowNativeCancel",
        "label": "Autoriser l’annulation native expérimentale",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "settings.excludedLibraries",
        "label": "Sites exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedLocations",
        "label": "Localisations exclues",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedPermanentLocations",
        "label": "Localisations permanentes exclues",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedCollectionCodes",
        "label": "Collections exclues",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedItemTypes",
        "label": "Types de documents exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedLostStatuses",
        "label": "Codes LOST exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedDamagedStatuses",
        "label": "Codes DAMAGED exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedWithdrawnStatuses",
        "label": "Codes WITHDRAWN exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.excludedNotForLoanStatuses",
        "label": "Codes NOT_LOAN exclus",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.SVC",
        "label": "Service des rapports SQL",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.ITEMS",
        "label": "API des exemplaires",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.RETURNS",
        "label": "Page native des retours",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.BATCH_ITEMS",
        "label": "Modification native des exemplaires par lot",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.PAGE",
        "label": "Lignes par page",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.REPORT_BATCH",
        "label": "Lignes par lot du rapport",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.MIN_GAP",
        "label": "Pause entre lectures (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "settings.disabledRuleIds",
        "label": "Contrôles désactivés (identifiants des règles)",
        "type": "list",
        "advanced": true
      }
    ]
  },
  "items": {
    "title": "Maintenance des exemplaires",
    "objective": "Repérer les statuts figés et incohérences des exemplaires.",
    "engine": "API Koha, règles de statuts/ancienneté, contrôle des relations et préparation de lots.",
    "functions": [
      "Analyser les statuts et dernières présences",
      "Comparer les exemplaires d’une notice",
      "Vérifier prêts et réservations",
      "Préparer une suppression ou un traitement natif",
      "Exporter les anomalies"
    ],
    "prerequisites": "Permissions API ; les codes de statut sont ceux de votre Koha.",
    "runtime": {
      "ITEMS": "/api/v1/items",
      "PAGE": 50,
      "PER_PAGE": 500,
      "MIN_GAP": 250,
      "DEEP_MAX": 300,
      "timeoutMs": 30000
    },
    "settings": {
      "lastSeenReviewDays": 1825,
      "lastSeenAtypicalDays": 1095,
      "lostReviewDays": 1095,
      "damagedReviewDays": 730,
      "withdrawnReviewDays": 730,
      "minorityMinItems": 5,
      "minorityMajorityPct": 85,
      "terminalLostStatuses": "2,3",
      "terminalWithdrawnStatuses": "1",
      "terminalMinDays": 365,
      "allowApiDelete": false,
      "disabledRuleIds": []
    },
    "storageKey": "dq_items_settings_v1",
    "fields": [
      {
        "path": "settings.lastSeenReviewDays",
        "label": "Dernière présence à vérifier (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.lastSeenAtypicalDays",
        "label": "Dernière présence à surveiller (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.lostReviewDays",
        "label": "Statut perdu ancien (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.damagedReviewDays",
        "label": "Statut endommagé ancien (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.withdrawnReviewDays",
        "label": "Statut retiré ancien (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.minorityMinItems",
        "label": "Minimum d’exemplaires pour comparer une notice",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.minorityMajorityPct",
        "label": "Majorité requise pour comparer les exemplaires (%)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.terminalLostStatuses",
        "label": "Codes LOST de fin de cycle",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.terminalWithdrawnStatuses",
        "label": "Codes WITHDRAWN de fin de cycle",
        "type": "text",
        "advanced": false
      },
      {
        "path": "settings.terminalMinDays",
        "label": "Ancienneté minimale de fin de cycle (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.allowApiDelete",
        "label": "Autoriser la suppression API après simulation",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "runtime.ITEMS",
        "label": "API des exemplaires",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.PAGE",
        "label": "Lignes par page",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.PER_PAGE",
        "label": "Résultats par lecture API",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.MIN_GAP",
        "label": "Pause entre lectures (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.DEEP_MAX",
        "label": "Dossiers par analyse approfondie",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "settings.disabledRuleIds",
        "label": "Contrôles désactivés (identifiants des règles)",
        "type": "list",
        "advanced": true
      }
    ]
  },
  "biblios": {
    "title": "Qualité du catalogue bibliographique",
    "objective": "Examiner la qualité des notices et préparer les corrections de catalogue.",
    "engine": "API bibliographique et MARC, signatures de doublons, fusion native et enrichissement BnF.",
    "functions": [
      "Contrôler le MARC et les identifiants",
      "Repérer les doublons et notices sans exemplaire",
      "Préparer la fusion native",
      "Examiner des propositions d’enrichissement",
      "Exporter les constats"
    ],
    "prerequisites": "UNIMARC ou MARC21 selon le profil configuré ; service externe facultatif.",
    "runtime": {
      "API": "/api/v1/biblios",
      "SVC": "/cgi-bin/koha/svc/report",
      "PAGE": 50,
      "PER_PAGE": 500,
      "MIN_GAP": 250,
      "AUDIT_MAX": 500,
      "BNF_MAX": 50,
      "timeoutMs": 30000,
      "bnfEndpoint": "https://catalogue.bnf.fr/api/SRU"
    },
    "settings": {
      "duplicateTitleThreshold": 100,
      "signatureReportId": 0,
      "allowMerge": false,
      "enableBnf": true,
      "marcFormat": "UNIMARC",
      "disabledRuleIds": [],
      "localMarcTags": [
        "099",
        "999"
      ]
    },
    "storageKey": "dq_biblios_settings_v1",
    "fields": [
      {
        "path": "settings.signatureReportId",
        "label": "Rapport SQL de signatures (0 = API seule)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.allowMerge",
        "label": "Autoriser la fusion après simulation",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "settings.enableBnf",
        "label": "Proposer la comparaison avec la BnF",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "settings.marcFormat",
        "label": "Format MARC des notices",
        "type": "text",
        "advanced": false,
        "choices": [
          [
            "UNIMARC",
            "UNIMARC"
          ],
          [
            "MARC21",
            "MARC21"
          ]
        ]
      },
      {
        "path": "settings.disabledRuleIds",
        "label": "Contrôles d’audit désactivés (codes BIB-…)",
        "type": "list",
        "advanced": false
      },
      {
        "path": "runtime.API",
        "label": "Racine de l’API Koha",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.SVC",
        "label": "Service des rapports SQL",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.PAGE",
        "label": "Lignes par page",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.PER_PAGE",
        "label": "Résultats par lecture API",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.MIN_GAP",
        "label": "Pause entre lectures (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.AUDIT_MAX",
        "label": "Notices par audit approfondi",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.BNF_MAX",
        "label": "Notices par comparaison externe",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.bnfEndpoint",
        "label": "Adresse du service SRU BnF",
        "type": "text",
        "advanced": true
      },
      {
        "path": "settings.localMarcTags",
        "label": "Zones MARC locales protégées lors des comparaisons",
        "type": "list",
        "advanced": true
      }
    ],
    "sqlFile": "sql/138-signatures-notices.sql"
  },
  "serials": {
    "title": "Maintenance des périodiques",
    "objective": "Examiner abonnements échus, fascicules attendus, réclamations et inactivité.",
    "engine": "Rapport SQL paginé et navigation vers les écrans Koha.",
    "functions": [
      "Filtrer les abonnements et sites",
      "Analyser échéances, retards et réclamations",
      "Préparer une liste de traitement",
      "Exporter les constats"
    ],
    "prerequisites": "Créer le rapport SQL Périodiques fourni puis renseigner son ID.",
    "runtime": {
      "SVC": "/cgi-bin/koha/svc/report",
      "PAGE": 50,
      "BATCH": 500,
      "MIN_GAP": 250,
      "timeoutMs": 30000
    },
    "settings": {
      "reportId": 0,
      "endPastReviewDays": 30,
      "endPastCriticalDays": 180,
      "claimReviewDays": 90,
      "inactivityAtypicalDays": 180,
      "inactivityReviewDays": 365,
      "overdueCriticalCount": 3,
      "disabledRuleIds": [],
      "missingReviewCount": 3,
      "lateReviewCount": 5,
      "loadOnOpen": true
    },
    "storageKey": "dq_serials_settings_v1",
    "sqlFile": "sql/138-periodiques.sql",
    "fields": [
      {
        "path": "settings.reportId",
        "label": "Identifiant du rapport SQL",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.endPastReviewDays",
        "label": "Abonnement échu à vérifier (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.endPastCriticalDays",
        "label": "Abonnement échu prioritaire (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.claimReviewDays",
        "label": "Réclamation ancienne (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.inactivityAtypicalDays",
        "label": "Inactivité à surveiller (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.inactivityReviewDays",
        "label": "Inactivité à vérifier (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.overdueCriticalCount",
        "label": "Fascicules attendus en retard : seuil prioritaire",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.SVC",
        "label": "Service des rapports SQL",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.PAGE",
        "label": "Lignes par page",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.BATCH",
        "label": "Lignes par lot du rapport",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.MIN_GAP",
        "label": "Pause entre lectures (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "settings.disabledRuleIds",
        "label": "Contrôles désactivés (identifiants des règles)",
        "type": "list",
        "advanced": true
      },
      {
        "path": "settings.missingReviewCount",
        "label": "Fascicules manquants : seuil de contrôle",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.lateReviewCount",
        "label": "Fascicules en retard : seuil de contrôle",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.loadOnOpen",
        "label": "Charger à l’ouverture quand le rapport est configuré",
        "type": "boolean",
        "advanced": false
      }
    ]
  },
  "patrons": {
    "title": "Qualité des comptes lecteurs",
    "objective": "Contrôler les comptes expirés, contacts et doublons potentiels.",
    "engine": "API lecteurs, normalisation des contacts et contrôle des engagements avant traitement.",
    "functions": [
      "Filtrer par site et catégorie",
      "Repérer les contacts incohérents",
      "Examiner les doublons potentiels",
      "Vérifier prêts/réservations avant traitement",
      "Exporter les dossiers"
    ],
    "prerequisites": "Permissions API lecteurs ; aucune suppression n’est déduite de l’ancienneté seule.",
    "runtime": {
      "API": "/api/v1/patrons",
      "HOLDS": "/api/v1/holds",
      "PAGE": 50,
      "PER_PAGE": 500,
      "FALLBACK_PER_PAGE": 100,
      "MIN_GAP": 250,
      "DEEP_MAX": 200,
      "timeoutMs": 30000
    },
    "settings": {
      "expiredAtypicalDays": 365,
      "expiredReviewDays": 1095,
      "deleteCandidateDays": 1825,
      "disabledRuleIds": []
    },
    "storageKey": "dq_patrons_settings_v1",
    "fields": [
      {
        "path": "settings.expiredAtypicalDays",
        "label": "Compte expiré à surveiller (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.expiredReviewDays",
        "label": "Compte expiré à vérifier (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "settings.deleteCandidateDays",
        "label": "Ancienneté minimale pour examiner la conservation (jours)",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.API",
        "label": "Racine de l’API Koha",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.HOLDS",
        "label": "API des réservations",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.PAGE",
        "label": "Lignes par page",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.PER_PAGE",
        "label": "Résultats par lecture API",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.FALLBACK_PER_PAGE",
        "label": "Taille de lecture de secours",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.MIN_GAP",
        "label": "Pause entre lectures (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.DEEP_MAX",
        "label": "Dossiers par analyse approfondie",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "settings.disabledRuleIds",
        "label": "Contrôles désactivés (identifiants des règles)",
        "type": "list",
        "advanced": true
      }
    ]
  },
  "quality-center": {
    "title": "Centre qualité Koha",
    "objective": "Ouvrir les outils de contrôle et voir leurs prérequis.",
    "engine": "Registre commun des pages ; diagnostic local de configuration.",
    "functions": [
      "Accéder aux huit domaines qualité",
      "Voir les rapports manquants",
      "Ouvrir les réglages de chaque outil"
    ],
    "prerequisites": "Gestionnaire Pages & outils internes actif.",
    "runtime": {
      "showDescriptions": true
    },
    "settings": {},
    "storageKey": "",
    "fields": [
      {
        "path": "runtime.showDescriptions",
        "label": "Afficher les descriptions des outils",
        "type": "boolean",
        "advanced": true
      }
    ]
  },
  "bulk-framework-change": {
    "title": "Modification de grille par lot",
    "objective": "Changer la grille de catalogage d’un ensemble de notices sans remplacer leur MARC.",
    "engine": "API Koha MARCXML, en-tête x-framework-id et vérification après écriture.",
    "functions": [
      "Résoudre notices ou codes-barres",
      "Dédoublonner les entrées",
      "Choisir la grille cible",
      "Prévisualiser, appliquer, arrêter et exporter"
    ],
    "prerequisites": "Permissions de catalogage et API Koha permettant le changement de grille.",
    "runtime": {
      "apiBase": "/api/v1",
      "maxInputs": 5000,
      "concurrency": 2,
      "timeoutMs": 30000,
      "marcFormat": "UNIMARC"
    },
    "settings": {},
    "storageKey": "",
    "fields": [
      {
        "path": "runtime.apiBase",
        "label": "Racine de l’API Koha",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.maxInputs",
        "label": "Nombre maximal d’entrées par lot",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.concurrency",
        "label": "Lectures simultanées",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.marcFormat",
        "label": "Format MARC des notices à modifier",
        "type": "text",
        "choices": [
          [
            "UNIMARC",
            "UNIMARC"
          ],
          [
            "MARC21",
            "MARC21"
          ],
          [
            "NORMARC",
            "NORMARC"
          ]
        ],
        "advanced": false
      }
    ]
  },
  "xslt-assistant": {
    "title": "Éditeur XSLT",
    "objective": "Construire et vérifier une feuille XSLT puis l’exporter pour Koha.",
    "engine": "Projets locaux, analyse XML/XPath et aperçu XSLT du navigateur.",
    "functions": [
      "Importer et organiser les blocs",
      "Choisir les zones MARC",
      "Comparer les aperçus",
      "Vérifier puis exporter",
      "Sauvegarder et restaurer les projets"
    ],
    "prerequisites": "Module Éditeur XSLT actif ; le rendu serveur Koha reste à vérifier.",
    "runtime": {},
    "settings": {},
    "storageKey": "",
    "configureModule": "xslt-assistant",
    "fields": []
  },
  "bibliography-builder": {
    "title": "Bibliographies & publications",
    "objective": "Composer des publications à partir de sélections de notices ou exemplaires.",
    "engine": "Sources PMK/Koha, cache de lectures, résolution de couvertures et moteur de modèles.",
    "functions": [
      "Choisir une source et un modèle",
      "Organiser notices, exemplaires et champs",
      "Prévisualiser le document",
      "Imprimer et exporter",
      "Conserver les modèles personnels"
    ],
    "prerequisites": "Permissions de lecture Koha ; sources et modèles propres au profil actif.",
    "runtime": {},
    "settings": {},
    "storageKey": "",
    "configureModule": "bibliography-builder",
    "fields": []
  },
  "overdue-management": {
    "title": "Gestion des retards",
    "objective": "Suivre les dossiers de retard et leurs étapes avec les messages Koha.",
    "engine": "Rapport SQL de classement, lecture des dossiers et formulaires Koha avec jeton CSRF frais.",
    "functions": [
      "Filtrer par site et étape",
      "Consulter lecteur et prêts",
      "Préparer et enregistrer un message",
      "Vérifier les écritures et reprendre les dossiers"
    ],
    "prerequisites": "Rapport compatible avec le contrat de colonnes ; permissions Koha de rapports et circulation. Le SQL générique fourni ne reproduit pas les règles Dracénie du rapport 5261 ; ce dernier reste la source par défaut.",
    "runtime": {
      "reportId": 5261,
      "defaultBranch": "",
      "pageSize": 500,
      "maxPages": 200,
      "timeoutMs": 45000,
      "reportPath": "/cgi-bin/koha/reports/guided_reports.pl",
      "memberPath": "/cgi-bin/koha/members/moremember.pl",
      "deleteMessagePath": "/cgi-bin/koha/circ/del_message.pl",
      "addMessagePath": "/cgi-bin/koha/circ/add_message.pl",
      "branchParameter": "Site adhérent|branches:all",
      "locale": "fr-FR",
      "currency": "EUR",
      "title": "Gestion des retards TP4",
      "quickMessages": [
        "Appelé pour TP4",
        "Lettre TP4 à la signature",
        "Lettre TP4 envoyée",
        "Transmis au service finances",
        "Documents recherchés pour TP4",
        "Adhérent contacté pour TP4"
      ],
      "columnMap": {},
      "stageRules": [
        {
          "stage": "dnr",
          "pattern": "^DNR",
          "flags": ""
        },
        {
          "stage": "finance",
          "pattern": "^6\\s*[—-]",
          "flags": "i"
        },
        {
          "stage": "cleanup",
          "pattern": "^7\\s*[—-]",
          "flags": "i"
        },
        {
          "stage": "sent",
          "pattern": "^5\\s*[—-]",
          "flags": "i"
        },
        {
          "stage": "signature",
          "pattern": "^4\\s*[—-]",
          "flags": "i"
        },
        {
          "stage": "letter",
          "pattern": "^3\\s*[—-]",
          "flags": "i"
        },
        {
          "stage": "search",
          "pattern": "^2\\s*[—-]",
          "flags": "i"
        },
        {
          "stage": "call",
          "pattern": "^1b?\\s*[—-]",
          "flags": "i"
        }
      ],
      "dnrEnabled": true,
      "dnrCategory": "DNR",
      "dnrLabel": "Dossier DNR",
      "dnrPrepareLabel": "Préparer un dossier DNR",
      "dnrEditLabel": "Modifier le dossier DNR",
      "workflowGuide": [
        "Recherche dans les sites propriétaire et actuel. Lettre à J+8 après appel ; contrôle à J+10 après envoi.",
        "Avant transmission : restitution ou rachat, retours, remise empruntable, annulation auprès de la logistique et catégorie adaptée. Après transmission : retirer les prêts du litige, puis passer les exemplaires en perdu si nécessaire.",
        "DNR : enregistrer les champs avant retour, puis passer les exemplaires en perdu. Sortie de DNR : effacer les champs prescrits et choisir Adulte / Jeune.",
        "Les notifications indiquent un envoi. La logistique et les finances restent à contacter par l’agent. Après transmission au Trésor Public, appliquer la consigne du tutoriel avant toute restitution."
      ],
      "dnrEntryGuide": "Passage en DNR : choisir la catégorie DNR et enregistrer la carte, puis rouvrir « Modifier » pour compléter date du dernier contact signée, année, documents dus, montant et note interne. Vérifier leur présence sur la carte avant de faire les retours.",
      "dnrExitGuide": "Sortie de DNR : effacer dernier contact, année, documents dus et montant, puis choisir Adulte / Jeune. La note interne datée peut rester selon la procédure DNR.",
      "returnGuide": "Scanner uniquement les documents concernés ci-dessous. Pour une restitution / un rachat avant transmission, remettre l’exemplaire empruntable ; pour DNR ou clôture après finances, choisir le statut perdu adapté après le retour.",
      "cardGuide": "Dans la fiche ci-dessous : « Imprimer » → « Imprimer les retards ». Transmettre ensuite la lettre à la logistique et tracer la signature / l’envoi.",
      "attributeGroupPattern": "\\bdnr\\b|document du|annee de dnr|montant du",
      "attributeFieldPattern": "^(date dernier contact|annee de dnr|document du|montant du|note interne)\\s*:",
      "stageLabels": {
        "all": "Tous",
        "call": "À appeler",
        "search": "Recherche documents",
        "letter": "Lettre à préparer",
        "signature": "À signer",
        "sent": "Lettre envoyée",
        "finance": "Finances / clôture",
        "cleanup": "À nettoyer",
        "dnr": "DNR",
        "control": "À contrôler"
      },
      "reportTableSelector": "#report_results",
      "extendedAttributesSelector": "#patron-extended-attributes",
      "memberIdentitySelector": "#borrowernumber, input[name=\"borrowernumber\"]",
      "messageAddAllowedSelector": "#toolbar_addnewmessageLabel",
      "messageContainerSelector": "#messages > ul > li",
      "editMessageLinkSelector": ".edit_message",
      "stageQuickMessages": {}
    },
    "settings": {},
    "storageKey": "",
    "fields": [
      {
        "path": "runtime.reportId",
        "label": "Identifiant du rapport SQL",
        "type": "number",
        "advanced": false
      },
      {
        "path": "runtime.defaultBranch",
        "label": "Site proposé par défaut (code Koha)",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.pageSize",
        "label": "Résultats par lecture",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.maxPages",
        "label": "Nombre maximal de pages du rapport",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.timeoutMs",
        "label": "Délai maximal d’une lecture (ms)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.reportPath",
        "label": "Page des rapports Koha",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.memberPath",
        "label": "Page des fiches lecteurs",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.deleteMessagePath",
        "label": "Suppression native des messages",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.addMessagePath",
        "label": "Ajout natif des messages",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.branchParameter",
        "label": "Nom du paramètre de site du rapport",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.locale",
        "label": "Langue et format régional (ex. fr-FR)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.currency",
        "label": "Devise (ex. EUR)",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.title",
        "label": "Titre de la page",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.quickMessages",
        "label": "Messages proposés (un par ligne)",
        "type": "list",
        "advanced": false
      },
      {
        "path": "runtime.columnMap",
        "label": "Correspondance des colonnes du rapport",
        "type": "json",
        "advanced": true
      },
      {
        "path": "runtime.stageRules",
        "label": "Correspondance des étapes du rapport",
        "type": "json",
        "advanced": true
      },
      {
        "path": "runtime.dnrEnabled",
        "label": "Proposer le parcours spécialisé DNR",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "runtime.dnrCategory",
        "label": "Code de catégorie pour le dossier DNR",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.dnrLabel",
        "label": "Intitulé du dossier spécialisé",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.dnrPrepareLabel",
        "label": "Intitulé de préparation du dossier",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.dnrEditLabel",
        "label": "Intitulé de modification du dossier",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.workflowGuide",
        "label": "Consignes de traitement (un paragraphe par ligne)",
        "type": "list",
        "advanced": false
      },
      {
        "path": "runtime.dnrEntryGuide",
        "label": "Consigne d’entrée dans le parcours spécialisé",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.dnrExitGuide",
        "label": "Consigne de sortie du parcours spécialisé",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.returnGuide",
        "label": "Consigne proposée avant les retours",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.cardGuide",
        "label": "Consigne d’impression et de transmission",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.attributeGroupPattern",
        "label": "Reconnaître les groupes d’attributs du dossier (expression régulière)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.attributeFieldPattern",
        "label": "Reconnaître les attributs du dossier (expression régulière)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.stageLabels",
        "label": "Intitulés des étapes du suivi",
        "type": "json",
        "advanced": true
      },
      {
        "path": "runtime.reportTableSelector",
        "label": "Tableau de résultats du rapport (sélecteur CSS)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.extendedAttributesSelector",
        "label": "Bloc des attributs lecteur (sélecteur CSS)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.memberIdentitySelector",
        "label": "Identité du lecteur (sélecteur CSS)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.messageAddAllowedSelector",
        "label": "Action native d’ajout de message (sélecteur CSS)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.messageContainerSelector",
        "label": "Lignes de messages Koha (sélecteur CSS)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.editMessageLinkSelector",
        "label": "Actions natives de modification de message (sélecteur CSS)",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.stageQuickMessages",
        "label": "Messages proposés en priorité par étape (indices de la liste, à partir de 0)",
        "type": "json",
        "advanced": true
      }
    ],
    "sqlFile": "sql/138-suivi-retards-generique.sql"
  }
};
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
async function importedJson(file){if(window.PMKImportCommon)return window.PMKImportCommon.jsonFile(file,{maxBytes:5*1024*1024});if(!file||file.size>5*1024*1024)throw new Error('Fichier absent ou supérieur à 5 Mo.');try{return JSON.parse(await file.text());}catch(error){throw new Error('JSON malformé : '+error.message+'.');}}
const inherited=value=>object(value)&&value.$inherit===true;
function merge(base,extra){
    if(inherited(extra)||extra===undefined)return clone(base);
    if(!object(base)||!object(extra))return clone(extra);
    const result=clone(base);for(const [key,value]of Object.entries(extra))if(!['__proto__','constructor','prototype'].includes(key))result[key]=merge(base[key],value);return result;
}
function at(root,path){return path.split('.').reduce((v,k)=>v?.[k],root);}
function put(root,path,value){const keys=path.split('.');let node=root;for(const key of keys.slice(0,-1)){if(!object(node[key]))node[key]={};node=node[key];}node[keys.at(-1)]=clone(value);}
let getConfiguration=()=>({}),updateConfiguration=()=>{},selectedPage=null,saveQueue=Promise.resolve();
const ANALYSIS_STATUS_KEY='pmk:page-analysis-status:v1';
function attach(options){getConfiguration=options.get;updateConfiguration=options.update;}
function optionsFor(id){return id==='authorities'?{}:getConfiguration()?.pageOptions?.[id] || {};}
function runtime(id,defaults={}){return merge(merge(catalog[id]?.runtime||{},defaults),optionsFor(id).runtime);}
function settings(id,defaults={}){return merge(merge(catalog[id]?.settings||{},defaults),optionsFor(id).settings);}
function readLocal(id){const key=catalog[id]?.storageKey;if(!key)return {};try{const value=JSON.parse(localStorage.getItem(key)||'{}');return object(value)?value:{};}catch(_){return {};}}
function analysisStatuses(){
    try{const value=JSON.parse(localStorage.getItem(ANALYSIS_STATUS_KEY)||'{}');return object(value)?value:{};}catch(_){return {};}
}
function analysisStatus(id){const value=analysisStatuses()[id];return object(value)?clone(value):null;}
function recordAnalysis(id,status={}){
    if(id==='authorities'||!catalog[id]||!object(status))return null;
    const all=analysisStatuses(),previous=object(all[id])?all[id]:{},now=new Date().toISOString();
    const outcome=['running','success','partial','error'].includes(status.outcome)?status.outcome:'success';
    const next={
        startedAt:String(status.startedAt||previous.startedAt||now),
        finishedAt:outcome==='running'?null:String(status.finishedAt||now),
        outcome,
        count:Number.isFinite(Number(status.count))?Math.max(0,Number(status.count)):null,
        source:String(status.source||previous.source||'Koha').slice(0,120),
        detail:String(status.detail||'').slice(0,240)
    };
    all[id]=next;
    try{localStorage.setItem(ANALYSIS_STATUS_KEY,JSON.stringify(all));}catch(_){}
    window.dispatchEvent(new CustomEvent('pmk:analysis-status',{detail:{id,status:clone(next)}}));
    return clone(next);
}
async function readInventorySettings(){
    if(!window.indexedDB)return {};
    try{
        if(indexedDB.databases && !(await indexedDB.databases()).some(x=>x.name==='koha-inventaire-autonome'))return {};
        return await new Promise(resolve=>{
            const request=indexedDB.open('koha-inventaire-autonome');
            request.onupgradeneeded=()=>request.transaction.abort();request.onerror=()=>resolve({});
            request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('settings')){db.close();resolve({});return;}const tx=db.transaction('settings','readonly'),get=tx.objectStore('settings').get('main');get.onsuccess=()=>{const value=get.result?.value;db.close();resolve(object(value)?value:{});};get.onerror=()=>{db.close();resolve({});};};
        });
    }catch(_){return {};}
}
function contextFor(id){const context=document.querySelector('#pmk138-page-host .pmk138-app-container')?.__pmkPageContext;return context?.id===id?context:null;}
async function request(id,url,options={},context=contextFor(id)){
    if(id==='authorities')return window.fetch(url,options);
    if(context?.signal.aborted)throw new DOMException('Page fermée','AbortError');
    const controller=new AbortController(),method=String(options.method||'GET').toUpperCase(),read=/^(GET|HEAD|OPTIONS)$/.test(method);
    const timeout=Math.max(1000,Math.min(180000,Number(runtime(id,catalog[id]?.runtime).timeoutMs)||30000));
    const timer=setTimeout(()=>controller.abort(),timeout);
    const cancel=()=>controller.abort();
    if(options.signal?.aborted)controller.abort();else options.signal?.addEventListener('abort',cancel,{once:true});
    if(read)context?.signal.addEventListener('abort',cancel,{once:true});
    try{const response=await window.fetch(url,{...options,signal:controller.signal});if(method==='HEAD'||[204,205,304].includes(response.status))return response;const bytes=await response.arrayBuffer();const copy=new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers});Object.defineProperty(copy,'url',{value:response.url});Object.defineProperty(copy,'redirected',{value:response.redirected});return copy;}
    finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);context?.signal.removeEventListener('abort',cancel);}
}
async function saveSettings(id,storageKey,value){
    if(id==='authorities'||!catalog[id])throw new Error('Cette page ne participe pas à la configuration commune.');
    if(!object(value))throw new Error('Réglages de page invalides.');
    if(window.PMKConfig && window.PMKPages && !window.PMKPages.isSuperlibrarian())throw new Error('Le rôle superlibrarian est requis pour modifier les réglages communs.');
    if(!window.PMKConfig?.saveConfig){if(storageKey)localStorage.setItem(storageKey,JSON.stringify(value));return clone(value);}
    const job=saveQueue.catch(()=>{}).then(async()=>{
        const latest=await window.PMKConfig.getConfig(MODULE_ID);
        const next=clone(latest);next.pageOptions ||= {};next.pageOptions[id] ||= {};
        next.pageOptions[id].settings=merge(next.pageOptions[id].settings || {},value);
        if(storageKey){let raw;try{raw=localStorage.getItem(storageKey);}catch(_){}if(raw!=null){next.legacyPageSettings ||= {};next.legacyPageSettings[id] ||= {};if(!(storageKey in next.legacyPageSettings[id]))next.legacyPageSettings[id][storageKey]=raw;}}
        const valid=validate(next);if(!valid.ok)throw new Error(valid.message);
        if(id==='inventory'){const old=await readInventorySettings();if(Object.keys(old).length){next.legacyPageSettings ||= {};next.legacyPageSettings.inventory ||= {};next.legacyPageSettings.inventory.indexedDB ??= clone(old);}}
        await window.PMKConfig.saveConfig(MODULE_ID,next);updateConfiguration(next);
        return clone(value);
    });saveQueue=job;return job;
}
function openSettings(id){selectedPage=id;window.PMKConfig?.openAdmin?.(MODULE_ID);}
function assertType(field,value){
    if(value===undefined||inherited(value))return true;
    if(field.type==='number')return Number.isFinite(value)&&Number.isInteger(value);
    if(field.type==='boolean')return typeof value==='boolean';
    if(field.type==='text')return value===null||typeof value==='string';
    if(field.type==='list')return Array.isArray(value)&&value.every(x=>typeof x==='string');
    return object(value)||Array.isArray(value);
}
function validate(cfg){
    if(cfg.hubAccess && !['superlibrarian','staff'].includes(cfg.hubAccess))return {ok:false,message:'Accès à l’accueil invalide.'};
    for(const [id,definition]of Object.entries(catalog)){
        const stored=cfg.pageOptions?.[id];if(!stored)continue;
        if(stored.access && !['default','superlibrarian','staff'].includes(stored.access))return {ok:false,message:definition.title+' : accès invalide.'};
        for(const field of definition.fields){const value=at(stored,field.path);if(!assertType(field,value))return {ok:false,message:definition.title+' : '+field.label+' est invalide.'};}
        const state=merge(merge(definition.settings,readLocal(id)),stored.settings);
        const pairs=id==='reservations'?[['oldDays','veryOldDays'],['waitingDays','waitingCriticalDays'],['transitWatchDays','transitDays'],['transitDays','transitCriticalDays']]:id==='transfers'?[['requestedWarnDays','requestedReviewDays'],['requestedReviewDays','requestedCriticalDays'],['transitWatchDays','transitReviewDays'],['transitReviewDays','transitCriticalDays']]:id==='loans'?[['oldDays','veryOldDays'],['overdueDays','criticalOverdueDays'],['claimDays','claimCriticalDays']]:id==='serials'?[['endPastReviewDays','endPastCriticalDays'],['inactivityAtypicalDays','inactivityReviewDays']]:[];
        if(pairs.some(([a,b])=>state[a]>state[b]))return {ok:false,message:definition.title+' : les seuils prioritaires doivent être supérieurs ou égaux aux premiers seuils.'};
        const effective=merge(definition.runtime,stored.runtime);
        if(id==='action-journal'&&effective.entriesCollection===effective.logsCollection)return {ok:false,message:'Journal : les entrées et leur historique doivent utiliser des collections différentes.'};
        if(id==='action-journal'&&Object.values(effective.permissions||{}).some(value=>!['staff','superlibrarian'].includes(value)))return {ok:false,message:'Journal : droit par opération invalide.'};
        for(const field of definition.fields.filter(x=>x.type==='number')){const value=at({runtime:effective,settings:state},field.path);if(value<0&&!/notForLoanExcluded|lostPilon|lostReview/.test(field.path))return {ok:false,message:definition.title+' : '+field.label+' doit être positif ou nul.'};}
        if(effective.timeoutMs && (effective.timeoutMs<1000||effective.timeoutMs>180000))return {ok:false,message:definition.title+' : délai de lecture compris entre 1 000 et 180 000 ms.'};
        if(id==='bulk-framework-change' && (effective.concurrency<1||effective.concurrency>5))return {ok:false,message:'La concurrence du changement de grille doit être comprise entre 1 et 5.'};
        if(effective.locale){try{new Intl.DateTimeFormat(effective.locale);}catch(_){return {ok:false,message:definition.title+' : format régional invalide.'};}}
        if(effective.currency){try{new Intl.NumberFormat(effective.locale||'fr-FR',{style:'currency',currency:effective.currency});}catch(_){return {ok:false,message:'Code de devise invalide.'};}}
        if(id==='bulk-framework-change' && !['UNIMARC','MARC21','NORMARC'].includes(effective.marcFormat))return {ok:false,message:'Format MARC du changement de grille invalide.'};
        for(const path of ['attributeGroupPattern','attributeFieldPattern'])if(effective[path])try{new RegExp(effective[path],'i');}catch(_){return {ok:false,message:'Expression de reconnaissance des attributs invalide.'};}
        for(const field of definition.fields.filter(x=>/Selector$/.test(x.path))){const selector=at({runtime:effective,settings:state},field.path);if(selector)try{document.createDocumentFragment().querySelector(selector);}catch(_){return {ok:false,message:field.label+' : sélecteur invalide.'};}}
        if(id==='biblios'&&!['UNIMARC','MARC21'].includes(state.marcFormat))return {ok:false,message:'Choisissez UNIMARC ou MARC21.'};
        if(id==='overdue-management' && effective.stageRules){if(!Array.isArray(effective.stageRules))return {ok:false,message:'Les étapes doivent former une liste.'};for(const rule of effective.stageRules){try{if(!['dnr','finance','cleanup','sent','signature','letter','search','call','control'].includes(rule.stage))throw new Error();new RegExp(rule.pattern,rule.flags||'i');}catch(_){return {ok:false,message:'Correspondance des étapes invalide.'};}}}
        if(id==='overdue-management' && effective.stageQuickMessages){for(const indices of Object.values(effective.stageQuickMessages))if(!Array.isArray(indices)||indices.some(index=>!Number.isInteger(index)||index<0||index>=effective.quickMessages.length))return {ok:false,message:'Indices de messages prioritaires invalides.'};}
        for(const key of ['PAGE','ROWS','API_PAGE','PER_PAGE','FALLBACK_PER_PAGE','REPORT_BATCH','BATCH','pageSize','maxPages','maxInputs','maxItemsPerPreparation','itemsPageSize','barcodeBatchSize','reportBatchSize','batchConcurrency','concurrency'])if(effective[key]!==undefined && (!Number.isInteger(effective[key])||effective[key]<1))return {ok:false,message:definition.title+' : '+key+' doit être un entier supérieur à zéro.'};
        if(id==='inventory' && !/^\d{3}$/.test(state.public_marc_tag||'999'))return {ok:false,message:'La zone MARC des exemplaires doit comporter trois chiffres.'};
        for(const path of ['API','ITEMS','HOLDS','SVC','RETURNS','BATCH_ITEMS','apiBase','restBase','reportPath','memberPath','deleteMessagePath','addMessagePath','reportUrl','runUrl']){
            if(!effective[path])continue;try{const url=new URL(effective[path],location.origin);if(url.origin!==location.origin||!/^https?:$/.test(url.protocol))throw new Error();}catch(_){return {ok:false,message:definition.title+' : '+path+' doit désigner une adresse de ce Koha.'};}
        }
    }
    return {ok:true};
}
function create(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function hint(field){
    const key=field.path.split('.').at(-1);
    if(/Collection$|^collections\./.test(field.path)||/Collection$/.test(key))return 'Nom exact de la collection de ce projet Koha. Les données existantes ne sont pas déplacées.';
    if(/excluded|Statuses|Category|av_/.test(key))return 'Utilisez les codes réels de votre Koha. Les valeurs Dracénie restent proposées par défaut.';
    if(/reportId|signatureReportId/.test(key))return 'Créez le rapport dans ce Koha, puis indiquez son numéro. 0 laisse la source non configurée.';
    if(key==='allowedUsernames')return 'Identifiants de connexion Koha, un par ligne. Vide : aucun filtre nominatif supplémentaire ; le niveau d’accès de la page reste requis.';
    if(field.type==='list')return 'Une valeur par ligne. Une liste vide n’impose aucune valeur.';
    if(field.type==='json')return 'Structure JSON complète ; les propriétés personnalisées sont conservées. Exportez les réglages avant une modification importante.';
    if(key==='adminPassword')return 'Contrôle du mode d’administration dans l’interface uniquement. Les règles stockage Koha restent responsables des droits réels.';
    if(key==='allowedUsernames')return 'Identifiants de connexion Koha. Vide : tous les comptes autorisés par le niveau d’accès de la page.';
    if(/concurrency|Concurrent/i.test(key))return 'Conservez une concurrence faible ; testez la charge de votre Koha avant toute augmentation.';
    return field.path.startsWith('runtime.')?'Pris en compte à la prochaine ouverture de la page.':'Les décisions et traitements utilisent ces valeurs ; adaptez-les à votre règlement local.';
}
async function copySql(id,button,file=catalog[id]?.sqlFile){
    if(!file)return;
    try{const base=window.PMKPages?.assetUrl?.(file)||file;const response=await request(id,base,{},null);if(!response.ok)throw new Error('SQL indisponible (HTTP '+response.status+')');const sql=await response.text();
        try{if(!navigator.clipboard?.writeText)throw new Error('Presse-papiers indisponible');await navigator.clipboard.writeText(sql);button.textContent='SQL copié';}
        catch(_){let preview=button.__pmkSqlPreview;if(!preview){preview=create('textarea');preview.rows=12;preview.readOnly=true;preview.className='form-control';preview.setAttribute('aria-label','SQL à copier manuellement');button.after(preview);button.__pmkSqlPreview=preview;}preview.value=sql;preview.focus();preview.select();button.textContent='SQL affiché : copiez le texte sélectionné';}}
    catch(error){button.textContent='Copie impossible : '+error.message;}
}
function sqlButton(id,file=catalog[id]?.sqlFile,label='Copier le SQL à créer dans Koha'){if(!file)return null;const button=create('button',label,'btn btn-default');button.type='button';button.addEventListener('click',()=>copySql(id,button,file));return button;}
function sqlButtons(id){const files=catalog[id]?.sqlFiles;if(files)return files.map(x=>sqlButton(id,x.file,x.label));const button=sqlButton(id);return button?[button]:[];}
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=create('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderEditor(ctx){
    const wrap=create('div'),intro=create('p','Choisissez une page. Les valeurs existantes du navigateur sont reprises comme base ; seuls vos changements enregistrés dans PMK deviennent communs. Les réglages d’installation prennent effet à la prochaine ouverture.');wrap.appendChild(intro);
    const select=create('select');select.className='form-control';select.setAttribute('aria-label','Page à configurer');
    const manifest=window.PMKPages?.manifest || [];
    for(const page of manifest){const option=create('option',page.title);option.value=page.id;select.appendChild(option);}
    select.value=selectedPage&&manifest.some(x=>x.id===selectedPage)?selectedPage:manifest[0]?.id;
    const panel=create('div');panel.dataset.pmkPageEditor='1';wrap.append(select,panel);
    let revision=0;
    async function show(){
        const version=++revision,id=select.value,definition=catalog[id];selectedPage=id;panel.replaceChildren();
        if(id==='authorities'){panel.appendChild(create('p','La page Autorités est conservée strictement inchangée. Ses moteurs, réglages et accès propres ne sont pas modifiés ici.'));return;}
        if(!definition)return;
        panel.appendChild(create('h5',definition.objective));const info=create('details');info.appendChild(create('summary','Fonctions, moteur et prérequis'));info.appendChild(create('p',definition.engine));const list=create('ul');definition.functions.forEach(text=>list.appendChild(create('li',text)));info.append(list,create('p',definition.prerequisites));panel.appendChild(info);
        const source=create('p','Lecture des réglages existants…');panel.appendChild(source);
        const local=id==='inventory'?await readInventorySettings():readLocal(id);if(version!==revision)return;
        source.textContent=Object.keys(local).length?'Réglages de ce navigateur disponibles et conservés. Les surcharges PMK ont priorité.':'Valeurs Dracénie proposées ; aucune configuration existante n’est effacée.';
        const effective=()=>merge({runtime:definition.runtime,settings:merge(definition.settings,local)},ctx.rootObject.pageOptions?.[id]);
        function store(path,value){ctx.rootObject.pageOptions ||= {};ctx.rootObject.pageOptions[id] ||= {};put(ctx.rootObject.pageOptions[id],path,value);ctx.markDirty?.();}
        const access=create('label','Accès à cette page : '),policy=create('select');policy.setAttribute('aria-label','Accès à '+definition.title);for(const [value,label]of [['default','Conserver l’accès actuel'],['superlibrarian','Superlibrarian Koha'],['staff','Personnel Koha']]){const option=create('option',label);option.value=value;policy.appendChild(option);}policy.value=ctx.rootObject.pageOptions?.[id]?.access||'default';policy.onchange=()=>store('access',policy.value);access.appendChild(policy);panel.appendChild(access);
        panel.appendChild(create('p','Ce choix contrôle l’ouverture de l’interface. Les permissions Koha et les règles Koha restent nécessaires pour agir sur les données.'));
        if(definition.configureModule){const button=create('button','Configurer le module commun','btn btn-default');button.type='button';button.onclick=()=>window.PMKConfig.openAdmin(definition.configureModule);panel.appendChild(button);panel.appendChild(create('p','Cette page réutilise les réglages de son module. Ils ne sont pas dupliqués ici.'));}
        const basic=create('div'),advanced=create('details');advanced.appendChild(create('summary','Réglages avancés de cette page'));panel.appendChild(basic);
        for(const field of definition.fields){
            const row=create('div',undefined,'pmk-field');row.dataset.pageOption=field.path;
            const label=create('label',field.label),input=create(field.choices?'select':field.type==='boolean'?'input':field.type==='list'||field.type==='json'?'textarea':'input');
            if(field.choices)for(const [value,text]of field.choices){const option=create('option',text);option.value=value;input.appendChild(option);}
            input.setAttribute('aria-label',field.label);input.className='form-control';if(field.type==='boolean')input.type='checkbox';else if(field.type==='number')input.type='number';else if(field.path.endsWith('.adminPassword'))input.type='password';
            const value=at(effective(),field.path);if(field.type==='boolean')input.checked=!!value;else input.value=field.type==='json'?JSON.stringify(value??{},null,2):field.type==='list'?(value||[]).join('\n'):value??'';
            const update=()=>{let value;if(field.type==='boolean')value=input.checked;else if(field.type==='number')value=input.value===''?'':Number(input.value);else if(field.type==='list')value=input.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);else if(field.type==='json'){try{value=JSON.parse(input.value);input.setCustomValidity('');}catch(_){value=input.value;input.setCustomValidity('JSON invalide');}}else value=input.value;store(field.path,value);};input.addEventListener('input',update);input.addEventListener('change',update);
            const reset=create('button','Reprendre la valeur héritée','btn btn-link btn-sm');reset.type='button';reset.onclick=()=>{ctx.rootObject.pageOptionHistory ||= [];ctx.rootObject.pageOptionHistory.push({page:id,path:field.path,value:clone(at(ctx.rootObject.pageOptions?.[id],field.path))});store(field.path,{$inherit:true});show();};
            label.appendChild(input);row.append(label,create('small',hint(field),'pmk-field-help'),reset);(field.advanced?advanced:basic).appendChild(row);
        }
        if(advanced.childElementCount>1)panel.appendChild(advanced);
        for(const button of sqlButtons(id))panel.appendChild(button);
        const exportButton=create('button','Exporter les réglages de cette page','btn btn-default');exportButton.type='button';exportButton.onclick=()=>download('pmk-page-'+id+'.json',{format:'pmk-page-settings',version:1,page:id,options:ctx.rootObject.pageOptions?.[id]||{},effective:effective(),local});
        const importLabel=create('label','Importer des réglages de cette page : '),file=create('input');file.type='file';file.accept='.json,application/json';const result=create('p');result.setAttribute('role','status');
        file.onchange=async()=>{try{const value=await importedJson(file.files[0]);if(value.format!=='pmk-page-settings'||value.page!==id||!object(value.options))throw new Error('Fichier de réglages incompatible avec cette page.');const imported=merge(value.effective||{},value.options);const candidate=clone(ctx.rootObject);candidate.pageOptions ||= {};candidate.pageOptions[id]=merge(candidate.pageOptions[id]||{},imported);const validation=validate(candidate);if(!validation.ok)throw new Error(validation.message);ctx.rootObject.pageOptions ||= {};ctx.rootObject.pageOptionsArchives ||= {};ctx.rootObject.pageOptionsArchives[id] ||= [];ctx.rootObject.pageOptionsArchives[id].push(clone(ctx.rootObject.pageOptions[id]||{}));ctx.rootObject.pageOptions[id]=candidate.pageOptions[id];ctx.markDirty?.();await show();const status=panel.querySelector('[role="status"]');if(status)status.textContent='Importé dans le brouillon. Cliquez sur Enregistrer pour appliquer.';}catch(error){result.textContent=error.message;}};
        importLabel.appendChild(file);panel.append(exportButton,importLabel,result);
    }
    select.onchange=show;show();return wrap;
}
function addSqlAction(id,root){const target=root.querySelector('#save-settings,#save');for(const button of sqlButtons(id))target?.parentElement?.appendChild(button);}
window.PMKPagesSettings={version:'1.1.0',attach,catalog,merge,runtime,settings,readLocal,saveSettings,request,contextFor,openSettings,validate,renderEditor,optionsFor,sqlButton,addSqlAction,analysisStatus,analysisStatuses,recordAnalysis};
})(window,document);
