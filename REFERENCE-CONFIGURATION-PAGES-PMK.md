# Référence des réglages des pages PMK

Les chemins ci-dessous sont relatifs à `internal-pages-tools.pageOptions.<identifiant>`. Les valeurs historiques sont conservées ; la référence omet les valeurs de connexion et mots de passe.


## Journal des actions — `action-journal`

| Option | Chemin | Présentation |
|---|---|---|
| Clé publique Firebase | `runtime.firebase.apiKey` | Avancé |
| Domaine d’authentification Firebase | `runtime.firebase.authDomain` | Avancé |
| Identifiant du projet Firebase | `runtime.firebase.projectId` | Avancé |
| Bucket Firebase | `runtime.firebase.storageBucket` | Avancé |
| Identifiant de messagerie Firebase | `runtime.firebase.messagingSenderId` | Avancé |
| Identifiant d’application Firebase | `runtime.firebase.appId` | Avancé |
| Langue et format régional (ex. fr-FR) | `runtime.locale` | Avancé |
| Collection Firestore des entrées | `runtime.entriesCollection` | Avancé |
| Collection Firestore des versions | `runtime.logsCollection` | Avancé |
| Types d’action (un par ligne) | `runtime.actionTypes` | Courant |
| Auteur proposé par défaut | `runtime.defaultAuthor` | Courant |
| Afficher initialement les entrées supprimées | `runtime.showDeleted` | Courant |

## Rendez-vous réseau — `appointments`

| Option | Chemin | Présentation |
|---|---|---|
| Clé publique Firebase | `runtime.firebase.apiKey` | Avancé |
| Domaine d’authentification Firebase | `runtime.firebase.authDomain` | Avancé |
| Identifiant du projet Firebase | `runtime.firebase.projectId` | Avancé |
| Bucket Firebase | `runtime.firebase.storageBucket` | Avancé |
| Identifiant de messagerie Firebase | `runtime.firebase.messagingSenderId` | Avancé |
| Identifiant d’application Firebase | `runtime.firebase.appId` | Avancé |
| Langue et format régional (ex. fr-FR) | `runtime.locale` | Avancé |
| Réglages | `runtime.collections.settings` | Avancé |
| Thèmes | `runtime.collections.themes` | Avancé |
| Créneaux | `runtime.collections.slots` | Avancé |
| Réservations de rendez-vous | `runtime.collections.bookings` | Avancé |
| Sondages | `runtime.collections.polls` | Avancé |
| Réponses aux sondages | `runtime.collections.pollResponses` | Avancé |
| Participants | `runtime.collections.participants` | Avancé |
| Récurrences | `runtime.collections.recurrenceRules` | Avancé |
| Mot de passe du mode administration | `runtime.adminPassword` | Avancé |
| Vue initiale | `runtime.defaultView` | Courant |

## Compteur de fréquentation — `attendance-counter`

| Option | Chemin | Présentation |
|---|---|---|

Réglages métier : module `attendance-mediabus-mini`.

## Restauration d’exemplaires — `restore-deleted-items`

| Option | Chemin | Présentation |
|---|---|---|
| Comptes Koha autorisés (un par ligne) | `runtime.allowedUsernames` | Courant |
| Carte du lecteur technique pour le prêt | `runtime.patronCardnumber` | Courant |
| Classe du plugin de restauration | `runtime.pluginClass` | Avancé |
| Page d’exécution des plugins Koha | `runtime.runUrl` | Avancé |
| Rapport de recherche par codes-barres | `runtime.reportIdBarcode` | Courant |
| Rapport de recherche par dates | `runtime.reportIdDates` | Courant |
| Page des rapports Koha | `runtime.reportUrl` | Avancé |
| Nom du paramètre de codes-barres du rapport | `runtime.reportParamName` | Avancé |
| Nom du paramètre de date de début | `runtime.reportDateFromParam` | Avancé |
| Nom du paramètre de date de fin | `runtime.reportDateToParam` | Avancé |
| Codes-barres par recherche | `runtime.reportBatchSize` | Avancé |
| Période initiale de recherche (jours) | `runtime.defaultLookbackDays` | Courant |
| Racine de l’API Koha | `runtime.restBase` | Avancé |
| Code du site de circulation (vide = session Koha) | `runtime.libraryId` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Correspondance des colonnes des rapports | `runtime.reportColumns` | Avancé |

## Désherbage — `weeding`

| Option | Chemin | Présentation |
|---|---|---|
| Racine de l’API Koha | `runtime.apiBase` | Avancé |
| Adresse des fiches notice (avant le numéro) | `runtime.noticeUrl` | Avancé |
| Code NOT_LOAN pour l’exclusion du prêt | `runtime.notForLoanExcluded` | Courant |
| Code LOST pour le pilon | `runtime.lostPilon` | Courant |
| Code LOST pour l’examen des collections | `runtime.lostReview` | Courant |
| Localisations de réservoir (codes et libellés) | `runtime.reservoirLocations` | Courant |
| Étages (codes et libellés) | `runtime.floors` | Courant |
| Champ API de l’étage | `runtime.floorRestField` | Avancé |
| Zone MARC du classement | `runtime.domainMarcTag` | Avancé |
| Sous-zone du domaine | `runtime.domainMarcSubfield` | Avancé |
| Sous-zone du sous-domaine | `runtime.subdomainMarcSubfield` | Avancé |
| Sous-zone du thème | `runtime.themeMarcSubfield` | Avancé |
| Maximum d’exemplaires par préparation | `runtime.maxItemsPerPreparation` | Avancé |
| Exemplaires par lecture | `runtime.itemsPageSize` | Avancé |
| Pause entre lectures (ms) | `runtime.readGapMs` | Avancé |
| Pause entre écritures (ms) | `runtime.writeGapMs` | Avancé |
| Traitements simultanés | `runtime.batchConcurrency` | Avancé |
| Pause entre traitements (ms) | `runtime.batchDelayMs` | Avancé |
| Codes-barres par lecture | `runtime.barcodeBatchSize` | Avancé |
| Utiliser une arborescence Firebase | `runtime.taxonomyEnabled` | Courant |
| Clé publique Firebase | `runtime.taxonomyFirebase.apiKey` | Avancé |
| Domaine d’authentification Firebase | `runtime.taxonomyFirebase.authDomain` | Avancé |
| Identifiant du projet Firebase | `runtime.taxonomyFirebase.projectId` | Avancé |
| Bucket Firebase | `runtime.taxonomyFirebase.storageBucket` | Avancé |
| Identifiant de messagerie Firebase | `runtime.taxonomyFirebase.messagingSenderId` | Avancé |
| Identifiant d’application Firebase | `runtime.taxonomyFirebase.appId` | Avancé |
| Domaines à rotation lente | `runtime.lowRotationDomains` | Avancé |
| Domaines à rotation courante | `runtime.normalRotationDomains` | Avancé |
| Localisations exclues des propositions | `runtime.ignoreLocations` | Avancé |
| Mots repérant les réservoirs et localisations particulières | `runtime.specialLocationKeywords` | Avancé |
| Catégorie des localisations | `runtime.locationCategory` | Avancé |
| Catégorie des collections | `runtime.collectionCategory` | Avancé |
| Catégorie des statuts non-prêtables | `runtime.notLoanCategory` | Avancé |
| Catégorie des statuts perdu | `runtime.lostCategory` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Collection Firestore de l’arborescence | `runtime.taxonomyCollection` | Avancé |

## Inventaire — `inventory`

| Option | Chemin | Présentation |
|---|---|---|
| Sons de contrôle | `settings.sounds` | Courant |
| Prendre les prêts en compte par défaut | `settings.consider_loans_default` | Courant |
| Site de référence | `settings.branch_basis` | Courant |
| Champs contrôlés par défaut | `settings.check_fields` | Courant |
| Champs ignorés pour les exemplaires flottants | `settings.floating_ignore_fields` | Courant |
| Types de documents flottants | `settings.floating_itemtypes` | Courant |
| Catégorie des localisations | `settings.av_loc_category` | Courant |
| Catégorie des collections | `settings.av_ccode_category` | Courant |
| Catégorie des publics | `settings.av_public_category` | Courant |
| Catégorie des sous-localisations | `settings.av_sous_loc_category` | Courant |
| Catégorie des étages | `settings.av_etage_category` | Courant |
| Catégorie des statuts non-prêtables | `settings.av_notloan_category` | Courant |
| Catégorie des statuts perdu | `settings.av_lost_category` | Courant |
| Zone MARC des exemplaires | `settings.public_marc_tag` | Courant |
| Sous-zone MARC du public | `settings.item_public_subfield` | Courant |
| Sous-zone MARC de la sous-localisation | `settings.item_sous_loc_subfield` | Courant |
| Listes de valeurs supplémentaires | `settings.extra_av_categories` | Courant |
| Champs contrôlés et correspondances | `settings.error_map_columns` | Courant |
| Statuts à préserver lors du contrôle | `settings.no_restore_statuses` | Courant |
| NOT_LOAN proposé pour les manquants | `settings.missing_status` | Courant |
| LOST proposé pour les manquants | `settings.missing_lost_status` | Courant |
| NOT_LOAN proposé pour le désherbage | `settings.weeding_status` | Courant |
| LOST proposé pour le désherbage | `settings.weeding_lost_status` | Courant |
| Racine de l’API Koha | `runtime.apiBase` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Résultats par lecture | `runtime.pageSize` | Avancé |

## Maintenance des réservations — `reservations`

| Option | Chemin | Présentation |
|---|---|---|
| Ancienneté à examiner (jours) | `settings.oldDays` | Courant |
| Ancienneté prioritaire (jours) | `settings.veryOldDays` | Courant |
| Absence d’activité à examiner (jours) | `settings.idleDays` | Courant |
| Attente de retrait à examiner (jours) | `settings.waitingDays` | Courant |
| Attente de retrait prioritaire (jours) | `settings.waitingCriticalDays` | Courant |
| Transit à surveiller (jours) | `settings.transitWatchDays` | Courant |
| Transit à vérifier (jours) | `settings.transitDays` | Courant |
| Transit prioritaire (jours) | `settings.transitCriticalDays` | Courant |
| Demandes en attente signalant une forte pression | `settings.pressureHigh` | Courant |
| Durée de prêt de référence (jours) | `settings.loanDays` | Courant |
| Durée de renouvellement de référence (jours) | `settings.renewalDays` | Courant |
| Nombre de renouvellements de référence | `settings.maxRenewals` | Courant |
| Traitement à examiner (jours) | `settings.processingDays` | Courant |
| Demande d’annulation ancienne (jours) | `settings.cancelRequestDays` | Courant |
| Suspension sans échéance à examiner (jours) | `settings.suspendIndefiniteDays` | Courant |
| Suspension échue à examiner (jours) | `settings.suspendOverdueDays` | Courant |
| Sites exclus | `settings.excludedLibraries` | Courant |
| Localisations exclues | `settings.excludedLocations` | Courant |
| Localisations permanentes exclues | `settings.excludedPermanentLocations` | Courant |
| Collections exclues | `settings.excludedCollectionCodes` | Courant |
| Types de documents exclus | `settings.excludedItemTypes` | Courant |
| Codes LOST exclus | `settings.excludedLostStatuses` | Courant |
| Codes DAMAGED exclus | `settings.excludedDamagedStatuses` | Courant |
| Codes WITHDRAWN exclus | `settings.excludedWithdrawnStatuses` | Courant |
| Codes NOT_LOAN exclus | `settings.excludedNotForLoanStatuses` | Courant |
| Catégories d’adhérents exclues | `settings.excludedPatronCategories` | Courant |
| Expliquer les dossiers après le chargement demandé | `settings.autoExplainOnLoad` | Courant |
| Lancer l’analyse approfondie après le chargement demandé | `settings.autoDeepAfterLoad` | Courant |
| Périmètre de l’analyse automatique | `settings.autoDeepScope` | Courant |
| Maximum de notices à approfondir | `settings.autoDeepMax` | Courant |
| Racine de l’API Koha | `runtime.API` | Avancé |
| Lignes par page | `runtime.ROWS` | Avancé |
| Résultats par lecture API | `runtime.API_PAGE` | Avancé |
| Pause entre lectures (ms) | `runtime.MIN_GAP` | Avancé |
| Pause entre analyses approfondies (ms) | `runtime.DEEP_DELAY` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Contrôles désactivés (identifiants des règles) | `settings.disabledRuleIds` | Avancé |

## Prêts & litiges — `loans`

| Option | Chemin | Présentation |
|---|---|---|
| Ancienneté à examiner (jours) | `settings.oldDays` | Courant |
| Ancienneté prioritaire (jours) | `settings.veryOldDays` | Courant |
| Retard important (jours) | `settings.overdueDays` | Courant |
| Retard prioritaire (jours) | `settings.criticalOverdueDays` | Courant |
| Absence d’activité à examiner (jours) | `settings.idleDays` | Courant |
| Réclamation ancienne (jours) | `settings.claimDays` | Courant |
| Réclamation prioritaire (jours) | `settings.claimCriticalDays` | Courant |
| Renouvellements sans présentation à examiner | `settings.unseenRenewals` | Courant |
| Racine de l’API Koha | `runtime.API` | Avancé |
| Lignes par page | `runtime.ROWS` | Avancé |
| Résultats par lecture API | `runtime.API_PAGE` | Avancé |
| Pause entre lectures (ms) | `runtime.MIN_GAP` | Avancé |
| Dossiers par analyse approfondie | `runtime.DEEP_LIMIT` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Catégorie des motifs de résolution des réclamations | `runtime.resolutionCategory` | Avancé |
| Contrôles désactivés (identifiants des règles) | `settings.disabledRuleIds` | Avancé |

## Transferts / navette — `transfers`

| Option | Chemin | Présentation |
|---|---|---|
| Identifiant du rapport SQL | `settings.reportId` | Courant |
| Demande de transfert à surveiller (jours) | `settings.requestedWarnDays` | Courant |
| Demande de transfert à vérifier (jours) | `settings.requestedReviewDays` | Courant |
| Demande de transfert prioritaire (jours) | `settings.requestedCriticalDays` | Courant |
| Transit à surveiller (jours) | `settings.transitWatchDays` | Courant |
| Transit à vérifier (jours) | `settings.transitReviewDays` | Courant |
| Transit prioritaire (jours) | `settings.transitCriticalDays` | Courant |
| Signaler le seul statut non-prêtable | `settings.flagNonLoan` | Courant |
| Trajet long de référence (jours) | `settings.routeLongDays` | Courant |
| Champ API « déjà recherché à » | `settings.searchedAtApiField` | Courant |
| Autoriser l’annulation native expérimentale | `settings.allowNativeCancel` | Courant |
| Sites exclus | `settings.excludedLibraries` | Courant |
| Localisations exclues | `settings.excludedLocations` | Courant |
| Localisations permanentes exclues | `settings.excludedPermanentLocations` | Courant |
| Collections exclues | `settings.excludedCollectionCodes` | Courant |
| Types de documents exclus | `settings.excludedItemTypes` | Courant |
| Codes LOST exclus | `settings.excludedLostStatuses` | Courant |
| Codes DAMAGED exclus | `settings.excludedDamagedStatuses` | Courant |
| Codes WITHDRAWN exclus | `settings.excludedWithdrawnStatuses` | Courant |
| Codes NOT_LOAN exclus | `settings.excludedNotForLoanStatuses` | Courant |
| Service des rapports SQL | `runtime.SVC` | Avancé |
| API des exemplaires | `runtime.ITEMS` | Avancé |
| Page native des retours | `runtime.RETURNS` | Avancé |
| Modification native des exemplaires par lot | `runtime.BATCH_ITEMS` | Avancé |
| Lignes par page | `runtime.PAGE` | Avancé |
| Lignes par lot du rapport | `runtime.REPORT_BATCH` | Avancé |
| Pause entre lectures (ms) | `runtime.MIN_GAP` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Contrôles désactivés (identifiants des règles) | `settings.disabledRuleIds` | Avancé |

## Maintenance des exemplaires — `items`

| Option | Chemin | Présentation |
|---|---|---|
| Dernière présence à vérifier (jours) | `settings.lastSeenReviewDays` | Courant |
| Dernière présence à surveiller (jours) | `settings.lastSeenAtypicalDays` | Courant |
| Statut perdu ancien (jours) | `settings.lostReviewDays` | Courant |
| Statut endommagé ancien (jours) | `settings.damagedReviewDays` | Courant |
| Statut retiré ancien (jours) | `settings.withdrawnReviewDays` | Courant |
| Minimum d’exemplaires pour comparer une notice | `settings.minorityMinItems` | Courant |
| Majorité requise pour comparer les exemplaires (%) | `settings.minorityMajorityPct` | Courant |
| Codes LOST de fin de cycle | `settings.terminalLostStatuses` | Courant |
| Codes WITHDRAWN de fin de cycle | `settings.terminalWithdrawnStatuses` | Courant |
| Ancienneté minimale de fin de cycle (jours) | `settings.terminalMinDays` | Courant |
| Autoriser la suppression API après simulation | `settings.allowApiDelete` | Courant |
| API des exemplaires | `runtime.ITEMS` | Avancé |
| Lignes par page | `runtime.PAGE` | Avancé |
| Résultats par lecture API | `runtime.PER_PAGE` | Avancé |
| Pause entre lectures (ms) | `runtime.MIN_GAP` | Avancé |
| Dossiers par analyse approfondie | `runtime.DEEP_MAX` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Contrôles désactivés (identifiants des règles) | `settings.disabledRuleIds` | Avancé |

## Qualité du catalogue bibliographique — `biblios`

| Option | Chemin | Présentation |
|---|---|---|
| Rapport SQL de signatures (0 = API seule) | `settings.signatureReportId` | Courant |
| Autoriser la fusion après simulation | `settings.allowMerge` | Courant |
| Proposer la comparaison avec la BnF | `settings.enableBnf` | Courant |
| Format MARC des notices | `settings.marcFormat` | Courant |
| Contrôles d’audit désactivés (codes BIB-…) | `settings.disabledRuleIds` | Courant |
| Racine de l’API Koha | `runtime.API` | Avancé |
| Service des rapports SQL | `runtime.SVC` | Avancé |
| Lignes par page | `runtime.PAGE` | Avancé |
| Résultats par lecture API | `runtime.PER_PAGE` | Avancé |
| Pause entre lectures (ms) | `runtime.MIN_GAP` | Avancé |
| Notices par audit approfondi | `runtime.AUDIT_MAX` | Avancé |
| Notices par comparaison externe | `runtime.BNF_MAX` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Adresse du service SRU BnF | `runtime.bnfEndpoint` | Avancé |
| Zones MARC locales protégées lors des comparaisons | `settings.localMarcTags` | Avancé |

## Maintenance des périodiques — `serials`

| Option | Chemin | Présentation |
|---|---|---|
| Identifiant du rapport SQL | `settings.reportId` | Courant |
| Abonnement échu à vérifier (jours) | `settings.endPastReviewDays` | Courant |
| Abonnement échu prioritaire (jours) | `settings.endPastCriticalDays` | Courant |
| Réclamation ancienne (jours) | `settings.claimReviewDays` | Courant |
| Inactivité à surveiller (jours) | `settings.inactivityAtypicalDays` | Courant |
| Inactivité à vérifier (jours) | `settings.inactivityReviewDays` | Courant |
| Fascicules attendus en retard : seuil prioritaire | `settings.overdueCriticalCount` | Courant |
| Service des rapports SQL | `runtime.SVC` | Avancé |
| Lignes par page | `runtime.PAGE` | Avancé |
| Lignes par lot du rapport | `runtime.BATCH` | Avancé |
| Pause entre lectures (ms) | `runtime.MIN_GAP` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Contrôles désactivés (identifiants des règles) | `settings.disabledRuleIds` | Avancé |
| Fascicules manquants : seuil de contrôle | `settings.missingReviewCount` | Courant |
| Fascicules en retard : seuil de contrôle | `settings.lateReviewCount` | Courant |
| Charger à l’ouverture quand le rapport est configuré | `settings.loadOnOpen` | Courant |

## Qualité des comptes lecteurs — `patrons`

| Option | Chemin | Présentation |
|---|---|---|
| Compte expiré à surveiller (jours) | `settings.expiredAtypicalDays` | Courant |
| Compte expiré à vérifier (jours) | `settings.expiredReviewDays` | Courant |
| Ancienneté minimale pour examiner la conservation (jours) | `settings.deleteCandidateDays` | Courant |
| Racine de l’API Koha | `runtime.API` | Avancé |
| API des réservations | `runtime.HOLDS` | Avancé |
| Lignes par page | `runtime.PAGE` | Avancé |
| Résultats par lecture API | `runtime.PER_PAGE` | Avancé |
| Taille de lecture de secours | `runtime.FALLBACK_PER_PAGE` | Avancé |
| Pause entre lectures (ms) | `runtime.MIN_GAP` | Avancé |
| Dossiers par analyse approfondie | `runtime.DEEP_MAX` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Contrôles désactivés (identifiants des règles) | `settings.disabledRuleIds` | Avancé |

## Centre qualité Koha — `quality-center`

| Option | Chemin | Présentation |
|---|---|---|
| Afficher les descriptions des outils | `runtime.showDescriptions` | Avancé |

## Modification de grille par lot — `bulk-framework-change`

| Option | Chemin | Présentation |
|---|---|---|
| Racine de l’API Koha | `runtime.apiBase` | Avancé |
| Nombre maximal d’entrées par lot | `runtime.maxInputs` | Avancé |
| Lectures simultanées | `runtime.concurrency` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Format MARC des notices à modifier | `runtime.marcFormat` | Courant |

## Éditeur XSLT — `xslt-assistant`

| Option | Chemin | Présentation |
|---|---|---|

Réglages métier : module `xslt-assistant`.

## Bibliographies & publications — `bibliography-builder`

| Option | Chemin | Présentation |
|---|---|---|

Réglages métier : module `bibliography-builder`.

## Gestion des retards — `overdue-management`

| Option | Chemin | Présentation |
|---|---|---|
| Identifiant du rapport SQL | `runtime.reportId` | Courant |
| Site proposé par défaut (code Koha) | `runtime.defaultBranch` | Courant |
| Résultats par lecture | `runtime.pageSize` | Avancé |
| Nombre maximal de pages du rapport | `runtime.maxPages` | Avancé |
| Délai maximal d’une lecture (ms) | `runtime.timeoutMs` | Avancé |
| Page des rapports Koha | `runtime.reportPath` | Avancé |
| Page des fiches lecteurs | `runtime.memberPath` | Avancé |
| Suppression native des messages | `runtime.deleteMessagePath` | Avancé |
| Ajout natif des messages | `runtime.addMessagePath` | Avancé |
| Nom du paramètre de site du rapport | `runtime.branchParameter` | Avancé |
| Langue et format régional (ex. fr-FR) | `runtime.locale` | Avancé |
| Devise (ex. EUR) | `runtime.currency` | Courant |
| Titre de la page | `runtime.title` | Courant |
| Messages proposés (un par ligne) | `runtime.quickMessages` | Courant |
| Correspondance des colonnes du rapport | `runtime.columnMap` | Avancé |
| Correspondance des étapes du rapport | `runtime.stageRules` | Avancé |
| Proposer le parcours spécialisé DNR | `runtime.dnrEnabled` | Courant |
| Code de catégorie pour le dossier DNR | `runtime.dnrCategory` | Courant |
| Intitulé du dossier spécialisé | `runtime.dnrLabel` | Avancé |
| Intitulé de préparation du dossier | `runtime.dnrPrepareLabel` | Avancé |
| Intitulé de modification du dossier | `runtime.dnrEditLabel` | Avancé |
| Consignes de traitement (un paragraphe par ligne) | `runtime.workflowGuide` | Courant |
| Consigne d’entrée dans le parcours spécialisé | `runtime.dnrEntryGuide` | Avancé |
| Consigne de sortie du parcours spécialisé | `runtime.dnrExitGuide` | Avancé |
| Consigne proposée avant les retours | `runtime.returnGuide` | Courant |
| Consigne d’impression et de transmission | `runtime.cardGuide` | Courant |
| Reconnaître les groupes d’attributs du dossier (expression régulière) | `runtime.attributeGroupPattern` | Avancé |
| Reconnaître les attributs du dossier (expression régulière) | `runtime.attributeFieldPattern` | Avancé |
| Intitulés des étapes du suivi | `runtime.stageLabels` | Avancé |
| Tableau de résultats du rapport (sélecteur CSS) | `runtime.reportTableSelector` | Avancé |
| Bloc des attributs lecteur (sélecteur CSS) | `runtime.extendedAttributesSelector` | Avancé |
| Identité du lecteur (sélecteur CSS) | `runtime.memberIdentitySelector` | Avancé |
| Action native d’ajout de message (sélecteur CSS) | `runtime.messageAddAllowedSelector` | Avancé |
| Lignes de messages Koha (sélecteur CSS) | `runtime.messageContainerSelector` | Avancé |
| Actions natives de modification de message (sélecteur CSS) | `runtime.editMessageLinkSelector` | Avancé |
| Messages proposés en priorité par étape (indices de la liste, à partir de 0) | `runtime.stageQuickMessages` | Avancé |
