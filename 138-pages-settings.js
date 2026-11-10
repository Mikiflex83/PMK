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
    "title": "Journaux de suivis",
    "objective": "Tenir plusieurs journaux de suivi pour l’équipe. Chaque journal reste distinct du journal d’actions de Koha.",
    "engine": "stockage Koha : entrées, versions, écoute en temps réel et export CSV.",
    "functions": [
      "Créer, renommer et supprimer un journal vide",
      "Ajouter et modifier une action",
      "Retirer et restaurer une entrée, avec un motif",
      "Filtrer par date, auteur et type",
      "Consulter les versions",
      "Exporter le tableau affiché en CSV"
    ],
    "prerequisites": "Session professionnelle Koha.",
    "runtime": {
      "permissions": {"create":"staff","edit":"staff","remove":"staff","restore":"staff"},
      "locale": "fr-FR",
      "entriesCollection": "entries",
      "logsCollection": "logs",
      "journalsCollection": "journals",
      "actionTypes": [
        "Prêt",
        "Retour",
        "Inscription",
        "Renseignement",
        "Incident",
        "Réservation",
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
        "path": "runtime.journalsCollection",
        "label": "Collection stockage Koha des journaux",
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
  "patron-map": {
    "title": "Cartographie des adhérents",
    "objective": "Voir de quel quartier, ou à défaut de quelle commune, viennent les adhérents, et comment les documents circulent entre les sites. Sans nom ni prénom.",
    "engine": "Rapport SQL de ce Koha. La rue place le quartier quand un prêt est encore relié à la fiche. Les autres usagers restent à la commune. Géocodage IGN et carte OpenStreetMap. Les deux cas restent distincts. Les points détaillés restent dans le navigateur.",
    "functions": [
      "Lire les usagers encore reliés à leur fiche et les transactions pseudonymisées",
      "Compter chaque personne une seule fois",
      "Placer le quartier par la rue, la commune sinon",
      "Distinguer les deux cas sur la carte",
      "Afficher les flux et les communes",
      "Exporter une carte agrégée",
      "Masquer des sites et choisir leurs couleurs"
    ],
    "prerequisites": "Pseudonymisation Koha active, avec ville, code postal et bibliothèque. La rue n’est lue que si un prêt des deux dernières années est encore relié à la fiche. Sans numéro, la page lit Koha directement. Un numéro utilise le rapport SQL affiché ci-dessous. Le géocodage envoie la rue seulement pour ce premier cas, et le code postal et la commune pour les autres.",
    "runtime": {
      "reportId": 0,
      "precision": 4,
      "minCount": 3
    },
    "settings": {},
    "storageKey": "",
    "sqlFile": "sql/138-cartographie-adherents.sql",
    "fields": [
      {
        "path": "runtime.reportId",
        "label": "Numéro du rapport Koha",
        "type": "number"
      },
      {
        "path": "runtime.precision",
        "label": "Décimales de regroupement des adresses (4 ou 5)",
        "type": "number",
        "advanced": true
      },
      {
        "path": "runtime.minCount",
        "label": "Effectif minimal d’une cellule exportée",
        "type": "number",
        "advanced": true
      }
    ]
  },
  "appointments": {
    "title": "Rendez-vous et sondages",
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
      "adminPassword": "",
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
    "prerequisites": "Source des lieux au choix : liste manuelle, sites Koha, ou les deux. Un lieu ajouté à la main reste dans la liste du compteur. Un lieu masqué sort de la saisie sans effacer ses comptages.",
    "runtime": {},
    "settings": {},
    "storageKey": "",
    "configureModule": "attendance-mediabus-mini",
    "fields": []
  },
  "restore-deleted-items": {
    "title": "Restauration d’exemplaires",
    "objective": "Retrouver et restaurer les exemplaires ou les notices supprimés, sans plugin supplémentaire.",
    "engine": "Recherche et restauration par l’API PimpMyKoha : exemplaires ou notices supprimés, puis réindexation. Le parcours s’inspire du plugin UndeleteRecords d’inLibro (David Bourgault, Olivier Vézina, William Lavoie, Hammat Wele, Noah Tremblay), sans l’installer.",
    "functions": [
      "Rechercher par code-barres ou dates",
      "Restaurer un exemplaire ou un lot",
      "Proposer le prêt ou le retour après restauration"
    ],
    "prerequisites": "Aucun plugin UndeleteRecords et aucun rapport SQL. Droit edit_items pour les exemplaires, edit_catalogue pour les notices. Lecteur technique uniquement pour le cycle avancé prêt/retour.",
    "runtime": {
      "allowedUsernames": [],
      "patronCardnumber": "",
      "pluginClass": "",
      "runUrl": "/cgi-bin/koha/plugins/run.pl",
      "defaultLookbackDays": 90,
      "restBase": "/api/v1",
      "libraryId": null,
      "timeoutMs": 30000
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
      "Réaffecter un site ou une localisation",
      "Écrire les champs et les codes propres à cette installation",
      "Sauvegarder et restaurer une session, exporter"
    ],
    "prerequisites": "Droits Koha de l’agent connecté. Les noms de champs API et les catégories de valeurs autorisées sont ceux de cette installation : rien n’est écrit tant qu’ils ne sont pas indiqués.",
    "runtime": {
      "apiBase": "/api/v1",
      "noticeUrl": "/cgi-bin/koha/catalogue/detail.pl?biblionumber=",
      "notForLoanExcluded": null,
      "lostPilon": null,
      "lostReview": null,
      "reservoirLocations": [],
      "floors": [],
      "floorRestField": "",
      "domainMarcTag": "",
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
      "lowRotationDomains": [],
      "normalRotationDomains": [],
      "ignoreLocations": [],
      "specialLocationKeywords": [],
      "locationCategory": "LOC",
      "collectionCategory": "CCODE",
      "notLoanCategory": "NOT_LOAN",
      "lostCategory": "LOST",
      "statusApiField": "",
      "statusCategory": "",
      "lostApiField": "",
      "secondCategory": "",
      "markDateApi": "",
      "noteApi": "",
      "localUseApi": "",
      "itemDeletion": false,
      "deleteEmptyBiblio": false,
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
        "path": "runtime.statusApiField",
        "label": "Champ API du marquage (vide = ne rien écrire)",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.statusCategory",
        "label": "Catégorie de valeurs autorisées de ce champ",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.notForLoanExcluded",
        "label": "Code écrit pour le marquage et la mise à revoir",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.lostApiField",
        "label": "Second champ API, facultatif",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.secondCategory",
        "label": "Catégorie de valeurs du second champ",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.lostPilon",
        "label": "Code du second champ pour le marquage",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.lostReview",
        "label": "Code du second champ pour la mise à revoir",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.markDateApi",
        "label": "Champ date écrit lors du marquage, facultatif",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.noteApi",
        "label": "Champ de note qui reçoit la trace, facultatif",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.localUseApi",
        "label": "Champ des consultations sur place, facultatif",
        "type": "text",
        "advanced": true
      },
      {
        "path": "runtime.itemDeletion",
        "label": "Autoriser la suppression d’un exemplaire déjà marqué",
        "type": "boolean",
        "advanced": false
      },
      {
        "path": "runtime.deleteEmptyBiblio",
        "label": "Supprimer la notice si elle ne contient plus aucun exemplaire",
        "type": "boolean",
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
      "av_public_category": "",
      "av_sous_loc_category": "",
      "av_etage_category": "",
      "av_notloan_category": "NOT_LOAN",
      "av_lost_category": "LOST",
      "public_marc_tag": "",
      "public_marc_subfield": "",
      "item_public_subfield": "",
      "item_sous_loc_subfield": "",
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
  "items": {
    "title": "Qualité des exemplaires",
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
      "terminalLostStatuses": "",
      "terminalWithdrawnStatuses": "",
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
    "title": "Qualité des notices",
    "objective": "Examiner la qualité des notices et préparer les corrections de catalogue.",
    "engine": "API bibliographique et MARC, signatures de doublons, fusion native et enrichissement BnF.",
    "functions": [
      "Contrôler le MARC et les identifiants",
      "Repérer les doublons et notices sans exemplaire",
      "Préparer la fusion native",
      "Examiner des propositions d’enrichissement",
      "Exporter les constats"
    ],
    "prerequisites": "Le format est lu sur les notices de ce Koha. La comparaison avec la BnF reste facultative et désactivée tant qu’elle n’est pas demandée.",
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
      "enableBnf": false,
      "marcFormat": "",
      "disabledRuleIds": [],
      "localMarcTags": []
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
            "",
            "Lu sur les notices"
          ],
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
      "marcFormat": ""
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
        "label": "Format MARC (vide = lu sur chaque notice)",
        "type": "text",
        "choices": [
          [
            "",
            "Lu sur chaque notice"
          ],
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
  "bulk-permissions": {
    "title": "Modification par lot de permissions",
    "objective": "Choisir des comptes d’une catégorie de personnel (type S), préparer un ajout, un retrait ou un remplacement de droits, puis l’appliquer dans Koha après simulation. Un superadministrateur n’est jamais modifié.",
    "engine": "Liste des comptes par l’API Koha, catalogue des droits lu dans le formulaire natif, écriture par ce même formulaire, un compte à la fois.",
    "functions": [
      "Charger les comptes d’une catégorie de personnel",
      "Protéger des comptes et exclure les superadministrateurs",
      "Choisir des droits à ajouter, retirer ou remplacer",
      "Simuler le avant / après",
      "Appliquer puis relire chaque compte"
    ],
    "prerequisites": "Session superlibrarian. Seule une catégorie Koha de type Personnel (S) peut être chargée. Les catégories de lecteurs, y compris Professionnel, restent exclues. Les protections de la page s’ajoutent aux contrôles de Koha, elles ne les remplacent pas.",
    "runtime": {
      "category": "",
      "protectedIds": []
    },
    "settings": {},
    "storageKey": "",
    "fields": [
      {
        "path": "runtime.category",
        "label": "Code de catégorie de personnel (type S)",
        "type": "text",
        "advanced": false
      },
      {
        "path": "runtime.protectedIds",
        "label": "Identifiants internes des comptes protégés (un par ligne)",
        "type": "list",
        "advanced": true
      }
    ]
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
function openSettings(id){
    selectedPage=id;
    const host=document.getElementById('pmk138-page-host');
    if(!host)return;
    const existing=host.querySelector(':scope > .pmk138-inline-settings');
    if(existing && existing.dataset.pageId===id){existing.hidden=!existing.hidden;if(!existing.hidden)existing.scrollIntoView({block:'nearest'});return;}
    existing?.remove();
    const panel=create('section');panel.className='pmk138-inline-settings';panel.dataset.pageId=id;
    panel.style.cssText='margin:0 0 14px;padding:14px 16px;border:1px solid #cedbbd;border-left:5px solid #6f8f32;border-radius:8px;background:#fff';
    const heading=create('h2','Réglages de cette page');heading.style.cssText='margin:0 0 8px;font-size:18px;color:#526d22';panel.appendChild(heading);
    const bar=host.querySelector('.pmk138-toolbar');
    if(bar)bar.after(panel);else host.prepend(panel);
    fillInline(id,panel);
}
async function fillInline(id,host){
    if(id==='authorities'){
        if(!window.PMKAuthorityInstallation?.renderPanel){host.appendChild(create('p','Les réglages des autorités ne sont pas chargés.'));return;}
        window.PMKAuthorityInstallation.renderPanel(host);return;
    }
    if(id==='hub'){await fillHub(host);return;}
    if(!catalog[id]){host.appendChild(create('p','Cette page n’a pas de réglages propres.'));return;}
    if(!window.PMKConfig?.getConfig){host.appendChild(create('p','La configuration PMK n’est pas disponible.'));return;}
    let draft;try{draft=clone(await window.PMKConfig.getConfig(MODULE_ID));}catch(error){host.appendChild(create('p','Lecture impossible : '+error.message));return;}
    if(!object(draft))draft={enabled:true,hubAccess:'superlibrarian',pageOptions:{}};
    const ctx={rootObject:draft,markDirty(){}};
    host.appendChild(create('p','Ces réglages restent sur cette page. Rechargez-la après l’enregistrement pour les appliquer.'));
    host.appendChild(renderEditor(ctx,{pageId:id}));
    const save=create('button','Enregistrer','btn btn-primary btn-sm');save.type='button';
    const result=create('p');result.setAttribute('role','status');
    save.addEventListener('click',async()=>{save.disabled=true;try{const valid=validate(draft);if(!valid.ok)throw new Error(valid.message);await window.PMKConfig.saveConfig(MODULE_ID,draft);updateConfiguration(draft);result.textContent='Enregistré. Rechargez la page pour appliquer ces réglages.';}catch(error){result.textContent=error.message;}finally{save.disabled=false;}});
    host.append(save,result);
}
async function fillHub(host){
    if(!window.PMKConfig?.getConfig){host.appendChild(create('p','La configuration PMK n’est pas disponible.'));return;}
    let draft;try{draft=clone(await window.PMKConfig.getConfig(MODULE_ID));}catch(error){host.appendChild(create('p','Lecture impossible : '+error.message));return;}
    if(!object(draft))draft={enabled:true,hubAccess:'superlibrarian',pageOptions:{}};
    const label=create('label','Qui peut ouvrir cette liste : '),policy=create('select');policy.className='form-control';policy.setAttribute('aria-label','Accès à la liste des pages');
    for(const [value,text] of [['superlibrarian','Superlibrarian Koha'],['staff','Personnel Koha — uniquement les pages ouvertes au personnel']]){const option=create('option',text);option.value=value;policy.appendChild(option);}
    policy.value=draft.hubAccess==='staff'?'staff':'superlibrarian';label.appendChild(policy);
    const note=create('p','Un compte du personnel ne voit que les pages dont l’accès est « Personnel Koha ». Les autres restent réservées au superlibrarian.');
    const save=create('button','Enregistrer','btn btn-primary btn-sm');save.type='button';
    const result=create('p');result.setAttribute('role','status');
    save.addEventListener('click',async()=>{save.disabled=true;try{draft.hubAccess=policy.value;const valid=validate(draft);if(!valid.ok)throw new Error(valid.message);await window.PMKConfig.saveConfig(MODULE_ID,draft);updateConfiguration(draft);result.textContent='Enregistré.';}catch(error){result.textContent=error.message;}finally{save.disabled=false;}});
    host.append(label,note,save,result);
}
function assertType(field,value){
    if(value===undefined||inherited(value))return true;
    if(field.type==='number')return ((value===null||value==='')&&/notForLoanExcluded|lostPilon|lostReview/.test(field.path))||(Number.isFinite(value)&&Number.isInteger(value));
    if(field.type==='boolean')return typeof value==='boolean';
    if(field.type==='text')return value===null||typeof value==='string'||(/notForLoanExcluded|lostPilon|lostReview/.test(field.path)&&typeof value==='number');
    if(field.type==='list')return Array.isArray(value)&&value.every(x=>typeof x==='string');
    return object(value)||Array.isArray(value);
}
function validate(cfg){
    if(cfg.hubAccess && !['superlibrarian','staff'].includes(cfg.hubAccess))return {ok:false,message:'Accès à l’accueil invalide.'};
    for(const [id,definition]of Object.entries(catalog)){
        const stored=cfg.pageOptions?.[id];if(!stored)continue;
        if(stored.enabled !== undefined && typeof stored.enabled !== 'boolean')return {ok:false,message:definition.title+' : activation invalide.'};
        if(stored.access && !['default','superlibrarian','staff'].includes(stored.access))return {ok:false,message:definition.title+' : accès invalide.'};
        for(const field of definition.fields){const value=at(stored,field.path);if(!assertType(field,value))return {ok:false,message:definition.title+' : '+field.label+' est invalide.'};}
        const state=merge(merge(definition.settings,readLocal(id)),stored.settings);
        const pairs=[];
        if(pairs.some(([a,b])=>state[a]>state[b]))return {ok:false,message:definition.title+' : les seuils prioritaires doivent être supérieurs ou égaux aux premiers seuils.'};
        const effective=merge(definition.runtime,stored.runtime);
        if(id==='action-journal'&&new Set([effective.entriesCollection,effective.logsCollection,effective.journalsCollection]).size<3)return {ok:false,message:'Journal : les journaux, les entrées et leur historique doivent utiliser des collections différentes.'};
        if(id==='patron-map'&&![4,5].includes(Number(effective.precision)))return {ok:false,message:'Cartographie : la précision doit être 4 ou 5.'};
        if(id==='patron-map'&&Number(effective.minCount)<2)return {ok:false,message:'Cartographie : le seuil d’export doit être au moins 2.'};
        if(id==='action-journal'&&Object.values(effective.permissions||{}).some(value=>!['staff','superlibrarian'].includes(value)))return {ok:false,message:'Journal : droit par opération invalide.'};
        for(const field of definition.fields.filter(x=>x.type==='number')){const value=at({runtime:effective,settings:state},field.path);if(value<0&&!/notForLoanExcluded|lostPilon|lostReview/.test(field.path))return {ok:false,message:definition.title+' : '+field.label+' doit être positif ou nul.'};}
        if(effective.timeoutMs && (effective.timeoutMs<1000||effective.timeoutMs>180000))return {ok:false,message:definition.title+' : délai de lecture compris entre 1 000 et 180 000 ms.'};
        if(id==='bulk-framework-change' && (effective.concurrency<1||effective.concurrency>5))return {ok:false,message:'La concurrence du changement de grille doit être comprise entre 1 et 5.'};
        if(effective.locale){try{new Intl.DateTimeFormat(effective.locale);}catch(_){return {ok:false,message:definition.title+' : format régional invalide.'};}}
        if(effective.currency){try{new Intl.NumberFormat(effective.locale||'fr-FR',{style:'currency',currency:effective.currency});}catch(_){return {ok:false,message:'Code de devise invalide.'};}}
        if(id==='bulk-framework-change' && effective.marcFormat && !['UNIMARC','MARC21','NORMARC'].includes(effective.marcFormat))return {ok:false,message:'Format MARC du changement de grille invalide.'};
        for(const path of ['attributeGroupPattern','attributeFieldPattern'])if(effective[path])try{new RegExp(effective[path],'i');}catch(_){return {ok:false,message:'Expression de reconnaissance des attributs invalide.'};}
        for(const field of definition.fields.filter(x=>/Selector$/.test(x.path))){const selector=at({runtime:effective,settings:state},field.path);if(selector)try{document.createDocumentFragment().querySelector(selector);}catch(_){return {ok:false,message:field.label+' : sélecteur invalide.'};}}
        if(id==='biblios'&&state.marcFormat&&!['UNIMARC','MARC21'].includes(state.marcFormat))return {ok:false,message:'Choisissez UNIMARC ou MARC21, ou laissez le format se lire sur les notices.'};
        if(id==='bulk-permissions'){
            if(String(effective.category||'')!=='' && !/^[A-Za-z0-9_-]{1,20}$/.test(String(effective.category)))return {ok:false,message:'Modification par lot de permissions : code de catégorie invalide.'};
            if(Array.isArray(effective.protectedIds)&&effective.protectedIds.some(value=>!/^\d+$/.test(String(value))))return {ok:false,message:'Modification par lot de permissions : un compte protégé doit être un numéro interne Koha.'};
        }
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
    if(/excluded|Statuses|Category|av_/.test(key))return 'Utilisez les codes réels de votre Koha.';
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
function renderEditor(ctx,options={}){
    const locked=options.pageId||null;
    const wrap=create('div'),intro=create('p','Choisissez une page. Les valeurs existantes du navigateur sont reprises comme base ; seuls vos changements enregistrés dans PMK deviennent communs. Les réglages d’installation prennent effet à la prochaine ouverture.');wrap.appendChild(intro);
    const select=create('select');select.className='form-control';select.setAttribute('aria-label','Page à configurer');
    const manifest=window.PMKPages?.manifest || [];
    for(const page of manifest){const option=create('option',page.title);option.value=page.id;select.appendChild(option);}
    if(locked){intro.hidden=true;select.hidden=true;if(!manifest.some(x=>x.id===locked)){wrap.appendChild(create('p','Cette page n’a pas de réglages dans la liste commune.'));return wrap;}select.value=locked;}
    else select.value=selectedPage&&manifest.some(x=>x.id===selectedPage)?selectedPage:manifest[0]?.id;
    const panel=create('div');panel.dataset.pmkPageEditor='1';wrap.append(select,panel);
    let revision=0;
    async function show(){
        const version=++revision,id=select.value,definition=catalog[id];selectedPage=id;panel.replaceChildren();
        if(id==='authorities'){panel.appendChild(create('p','La page Autorités est conservée strictement inchangée. Ses moteurs, réglages et accès propres ne sont pas modifiés ici.'));return;}
        if(!definition)return;
        panel.appendChild(create('h5',definition.objective));const info=create('details');info.appendChild(create('summary','Fonctions, moteur et prérequis'));info.appendChild(create('p',definition.engine));const list=create('ul');definition.functions.forEach(text=>list.appendChild(create('li',text)));info.append(list,create('p',definition.prerequisites));panel.appendChild(info);
        const source=create('p','Lecture des réglages existants…');panel.appendChild(source);
        const local=id==='inventory'?await readInventorySettings():readLocal(id);if(version!==revision)return;
        source.textContent=Object.keys(local).length?'Réglages de ce navigateur disponibles et conservés. Les surcharges PMK ont priorité.':'Valeurs proposées par défaut ; aucune configuration existante n’est effacée.';
        const effective=()=>merge({runtime:definition.runtime,settings:merge(definition.settings,local)},ctx.rootObject.pageOptions?.[id]);
        function store(path,value){ctx.rootObject.pageOptions ||= {};ctx.rootObject.pageOptions[id] ||= {};put(ctx.rootObject.pageOptions[id],path,value);ctx.markDirty?.();}
        const active=create('label','Page active dans le menu Outils : '),activeBox=create('input');activeBox.type='checkbox';activeBox.checked=ctx.rootObject.pageOptions?.[id]?.enabled !== false;activeBox.setAttribute('aria-label','Activer '+definition.title);activeBox.onchange=()=>store('enabled',activeBox.checked);active.appendChild(activeBox);panel.appendChild(active);
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
            const update=()=>{let value;if(field.type==='boolean')value=input.checked;else if(field.type==='number')value=input.value===''?(/notForLoanExcluded|lostPilon|lostReview/.test(field.path)?null:''):Number(input.value);else if(field.type==='list')value=input.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);else if(field.type==='json'){try{value=JSON.parse(input.value);input.setCustomValidity('');}catch(_){value=input.value;input.setCustomValidity('JSON invalide');}}else value=input.value;store(field.path,value);};input.addEventListener('input',update);input.addEventListener('change',update);
            const reset=create('button','Reprendre la valeur héritée','btn btn-link btn-sm');reset.type='button';reset.onclick=()=>{ctx.rootObject.pageOptionHistory ||= [];ctx.rootObject.pageOptionHistory.push({page:id,path:field.path,value:clone(at(ctx.rootObject.pageOptions?.[id],field.path))});store(field.path,{$inherit:true});show();};
            label.appendChild(input);row.append(label,create('small',hint(field),'pmk-field-help'),reset);(field.advanced?advanced:basic).appendChild(row);
        }
        if(advanced.childElementCount>1)panel.appendChild(advanced);
        for(const button of sqlButtons(id))panel.appendChild(button);
        if(id==='patron-map' && definition.sqlFile){
            const sqlBox=create('textarea');sqlBox.readOnly=true;sqlBox.rows=18;sqlBox.className='form-control';sqlBox.setAttribute('aria-label','SQL du rapport de cartographie à coller dans Koha');sqlBox.value='Chargement du SQL…';panel.appendChild(sqlBox);
            try{const base=window.PMKPages?.assetUrl?.(definition.sqlFile)||definition.sqlFile;const response=await request(id,base,{},null);if(!response.ok){sqlBox.value='SQL indisponible (HTTP '+response.status+')';}else{const text=await response.text();const selectAt=text.search(/\bSELECT\b/i);sqlBox.value=selectAt>=0?text.slice(selectAt).replace(/\s+$/,''):text;}}catch(error){sqlBox.value=error.message;}
        }
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
