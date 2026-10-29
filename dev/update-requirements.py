from pathlib import Path
import json,collections,datetime
root=Path(__file__).resolve().parent.parent;p=root/'dev/requirements-0.4.0.json';j=json.loads(p.read_text())
proofs={
 'patron-category-defaults':(['completion-configurations','koha-completion'],'Simulation sans remplissage, valeurs manuelles conservées, conflits et valeurs absentes des listes signalés ; lecture du formulaire réel Koha sans soumission.'),
 'holdings-table-presentation':(['completion-configurations','layout-previews'],'Priorité commune et déterministe des libellés, indépendante du chargement ; aperçu immédiat et réversible, couleurs personnalisées et repères textuels natifs conservés.'),
 'guided-reports-tools':(['completion-configurations'],'Identifiant du préréglage configurable, valeur historique 5191 conservée ; filtres et colonnes repris après changement de page, portée limitée aux lignes chargées affichée.'),
 'z3950-workspace':(['completion-configurations'],'Redimensionnement facultatif ; saisies, messages natifs sans résultat et erreurs des serveurs conservés sans interception.'),
 'home-widgets':(['completion-configurations','planning-refresh','koha-completion'],'Erreurs isolées, reprise ciblée, chargement à l’approche de l’affichage et actualisation ; nettoyage des minuteurs et conservation des brouillons du planning, vérifiés aussi sur Koha local.'),
 'catalogue-search-behavior':(['search-claims'],'Test des profils concurrents avec explication des actions différentes ; priorité Dracénie conservée par défaut et désactivable pour appliquer strictement les profils locaux.'),
 'serials-claims-filtering':(['search-claims'],'Diagnostic de colonne absente ou repérée par sa position ; suspension sûre du filtrage et reprise après remplacement des lignes, des colonnes ou du tableau, sans doublon DataTables.'),
 'search-autocomplete-performance':(['autocomplete-responses','koha-completion'],'Réponses obsolètes ignorées, compteur de chargement libéré, provenance catalogue/code-barres visible et enrichissement accessible au clavier ; lecture de l’API Koha réelle vérifiée.'),
 'suggestion-required-suggester':(['suggester-dynamic'],'Retour du focus vers l’attribution du lecteur, avertissement décrit aux aides techniques ; changements de lecteur et remplacement du formulaire suivis sans boucle ni perte de saisie.'),
 'search-facets':(['facets-navigation'],'Les changements en attente s’annulent avec Échap, le retour navigateur reconstruit l’état depuis l’URL, la restauration de page réapplique le filtre local et les commandes restent contenues sur mobile.'),
 'serials-tracking':(['koha-serials-preview'],'Aperçu en lecture seule des automatismes, des champs protégés et de leur effet ; cibles absentes signalées et bilan partiel, vérifiés sur la page de bulletinage Koha locale sans modifier ses champs.'),
 'history-row-highlights':(['history-boundaries'],'Légende des règles actives et règle déclenchée sur chaque repère ; dates limites exactes, retard d’un jour, prêt en cours et chronologie impossible vérifiés à date et fuseau fixes.'),
 'lost-found-checkin-status':(['koha-lost-checkin','lost-found-concurrency'],'Retour natif Koha vérifié avant le choix agent ; trace lisible de la décision, retours identiques successifs et verrou contre deux corrections simultanées du même exemplaire.'),
 'checkout-status-correction':(['koha-checkout-status','checkout-decision-trace'],'Prêt natif confirmé avant correction du seul statut autorisé ; règle exacte expliquée, rafales DOM sans doublon et proposition retirée devant une réservation ou un autre avertissement Koha.'),
 'responsive-tables':(['responsive-table-priorities'],'Colonnes communes prioritaires et colonnes d’actions configurables ; actions accessibles dans les fiches mobiles, colonnes masquées respectées et tableau natif restauré sur écran large.'),
 'patron-page-utils':(['patron-automation-preview'],'Aperçu en lecture seule des cibles et effets ; priorité des valeurs manuelles expliquée, aucun champ Koha modifié et proposition de mot de passe masquée.'),
 'barcode-highlights':(['barcode-memory'],'Provenance et durée de la mémoire locale visibles, effacement depuis PMK, anciennes entrées expirées et codes inclus dans un identifiant plus long ignorés.'),
 'advanced-search-sidebar':(['advanced-search-query'],'Index supplémentaires configurables et invalides refusés ; résumé ET/OU lisible et aperçu exact des paramètres envoyés à search.pl.'),
 'menu-icons':(['menu-icon-priorities'],'Catalogue historique conservé, priorités explicites pour les personnalisations, conflits de cible et règle gagnante affichés ; DOM natif restauré à la désactivation.'),
 'multi-transfer':(['final-universality','multi-transfer-interruption'],'Reprise préparée avec les seuls échecs distincts ; après interruption, seuls les codes restants sont restaurés avec bilan réussis/ignorés/erreurs et relance explicite.'),
 'hold-pickup-expiration':(['hold-expiration-sources'],'Date native Koha distinguée de l’estimation ; base, nombre de jours et exclusion des dimanches affichés lorsque le repli est calculé.'),
 'guides-training':(['guides-offline-diagnostics'],'Intro.js embarqué dans le plugin sans requête externe ; versions du chargeur, du moteur et des guides affichées, reprise signalée et cibles d’étapes introuvables listées.'),
 '070':(['address-provider'],'Paramètres réellement envoyés documentés et limités à la saisie d’adresse ; fournisseur et latence visibles, communes ambiguës signalées et relais compatible configurable.'),
 'patron-renewal-verification':(['patron-renewal-levels'],'Synthèse explicite des contrôles ; informations en lecture seule, avertissements conseillés et blocages obligatoires distingués avant l’action native Koha.'),
 '144':(['patron-duplicate-explanations'],'Chaque candidat explique les champs identiques, différents ou approchants et le nombre d’écarts tolérés ; degrés de suspicion forte/très forte sans fusion automatique.'),
 'item-quick-edit':(['item-quick-edit-concurrency'],'Aperçu avant/après pour chaque champ, mention des champs sensibles et détail dans le toast de confirmation ; relecture juste avant écriture et refus sans PUT lorsqu’un autre agent a modifié la valeur.'),
 'attendance-mediabus-mini':(['attendance-counter-integrity'],'Transactions sérialisées sans perte lors de clics concurrents ; toute correction horaire exige une justification conservée dans le journal, et la vue qui suivait la date du jour bascule automatiquement après minuit.'),
 'home-widget-useful-links':(['useful-links-control'],'Contrôle manuel daté par lien, diagnostic des destinations en double ou invalides et avertissement sur les libellés longs ; les libellés restent affichés intégralement et les liens Dracénie historiques sont conservés.'),
 'item-template-buttons':(['item-template-preview'],'Aperçu avant application de chaque champ avec valeur actuelle et valeur proposée ; champs absents et valeurs indisponibles dans les listes Koha signalés avant toute modification, annulation sans altérer le formulaire.'),
 'log-viewer':(['log-diff-summary'],'La différence native Koha reste intacte ; un résumé nomme les champs réellement modifiés et une mention explicite indique les entrées de modification pour lesquelles Koha ne fournit aucune donnée avant/après.'),
 'internal-share':(['internal-share-states'],'Destinataire et durée restante visibles ; états envoyé, disponible et consulté distincts, accusé de consultation enregistré au premier clic du destinataire. La configuration indique le stockage exclusif dans l’API native Koha.'),
 'renewal-enhancements':(['renewal-cumulative-reasons'],'Les codes de blocage natifs Koha sont reliés à des libellés compréhensibles et configurables ; plusieurs restrictions simultanées restent toutes visibles, avec les codes sources disponibles dans l’infobulle.'),
 'document-movements':(['document-movements-contract'],'Provenance SQL/API et contrat des onze colonnes du rapport visibles dans la configuration ; contrat vérifié à l’exécution et chargement borné par lots de 500, à 10 000 transferts par défaut.'),
 'musicbrainz-coverart':(['musicbrainz-provenance'],'Provenance Cover Art Archive, critère de correspondance, score et identifiant release visibles ; nouvelle tentative après absence ou erreur, et rejet local persistant empêchant de reproposer la correspondance.'),
 'patron-overdues-print':(['overdues-print-privacy'],'Le destinataire et les catégories de données personnelles imprimées sont explicités dans la configuration et dans l’aperçu WYSIWYG ; le numéro interne n’est annoncé que si le modèle l’utilise.'),
 'cataloguing-tree-assistant':(['cataloguing-tree-diagnostics'],'Les relations incohérentes, sources vides et valeurs orphelines sont diagnostiquées sans modifier le référentiel. Lorsqu’un choix ne produit aucun enfant, l’assistant indique la relation manquante qui motive le filtrage.'),
 '147-home-submenus':(['menu-common-engine'],'Le module 147 utilise le moteur partagé pmk.menus : navigation clavier et toucher vérifiée, actions indisponibles et favoris dont la destination a disparu affichés sans lien actif.'),
 'intranet-nav-menu':(['menu-common-engine'],'Le module 134 utilise le même moteur pmk.menus que le 147 ; sous-menus clavier/toucher et fonctions PMK indisponibles sont présentés de façon accessible.'),
 'personal-lists-manager':(['personal-lists-ownership'],'Le panneau affiche explicitement le mode partagé par profil historique ou le mode privé lié au compte Koha ; l’état public expose la propriété et l’outil de migration attribue une copie sans supprimer le profil historique.'),
 'cataloging-6xx-suggestions':(['cataloging-6xx-provenance'],'Chaque suggestion conserve ses sources Koha/manuelles et toutes ses variantes. Les doublons sont comptés et expliqués sans modifier ni fusionner les listes sources ; la priorité manuelle historique reste appliquée à l’affichage.'),
 'detail-reservations-summary-style':(['detail-reservations-simulation'],'La configuration simule en lecture seule chaque condition et signale les règles concurrentes. Un repère textuel configurable accompagne la couleur ; les éléments Koha et leur ordre natif sont restaurés à la désactivation.'),
 'item-entry-assistant':(['item-entry-mappings'],'Les dépendances entre champs sont configurables et appliquées dans le panneau. Un diagnostic en lecture seule relie chaque cible à son mapping MARC, sa source et sa catégorie de valeurs autorisées, et signale cibles, VA ou dépendances invalides.'),
 'france-publications-subscriptions':(['france-publications-qualification'],'Le moteur distingue association certaine, comparaison partielle et rapprochement ambigu. Le bilan expose les motifs et les abonnements Koha concurrents sans créer d’association ni écrire dans Koha ; une lecture FP interrompue reste explicitement incomplète.'),
 'authority-installation-options':(['authority-installation-diagnostics','koha-report-diagnostics'],'Les identifiants dupliqués ou absents et les codes de types invalides sont signalés avant enregistrement. Le diagnostic commun vérifie dans Koha le nom et les paramètres des rapports sans exécuter ni divulguer leur SQL ; le moteur métier de la page Autorités n’est pas appelé.'),
 'search-filter-badges':(['search-badge-accessibility'],'Filtres aux intitulés identiques conservés séparément, libellés longs accessibles sur mobile et suppression au clavier avec retour du focus ; recherche et autres critères inchangés.'),
 'internal-pages-tools':(['koha-internal-pages','koha-report-diagnostics'],'Fiche objectif, fonctions, moteur, accès, prérequis et lien direct ; vérification manuelle datée dans la session. Aide accessible jusque dans l’éditeur plein écran ; page Autorités conservée.'),
 'detail-bibliographic-groups':(['layout-previews'],'Aperçu réversible avec ordre natif exact, champs saisis et événements conservés ; cibles absentes, invalides ou imbriquées diagnostiquées sans écriture.'),
 'moredetail-layout':(['layout-previews','regression-040'],'Aperçu sur structure personnalisée, champs absents diagnostiqués, lecture et parcours clavier alignés sur le DOM ; saisies et événements conservés à l’annulation.'),
 'mascot-frogs':(['mascot-accessibility'],'Images différées, son uniquement sur action explicite au clic ou au clavier ; une seule lecture et arrêt/masquage selon la préférence de réduction des animations, réglage dérogeable.'),
 'mascot-agents':(['mascot-accessibility'],'Noms masquables aussi dans le texte accessible, désactivation individuelle des images et chargement différé ; médias personnels conservés.'),
 ('page','action-journal'):(['koha-journal-permissions','koha-shared-tools'],'Droits par opération réévalués côté serveur, auteur Koha authentifié, justification obligatoire et historique avant/après atomique ; refus des révisions périmées.'),
 ('page','weeding'):(['weeding-decision-flow'],'Chaque critère affiche sa valeur, sa règle et son résultat, avec la logique ET/OU. La proposition, la sélection de travail et la décision de l’agent sont nommées séparément ; les actions sont confirmées, enregistrées et réversibles tant que l’exemplaire n’est pas supprimé.'),
 ('page','appointments'):(['appointments-consistency','koha-shared-tools'],'Création, validation et annulation relisent les documents dans une transaction Koha avec contrôle de capacité. Les occurrences récurrentes ont un identifiant déterministe, respectent exclusions et occurrences existantes ; le succès métier reste distinct de la notification facultative.'),
 ('widget','appointments'):(['appointments-consistency','koha-shared-tools'],'Le widget utilise le même stockage natif et le même contrôle de capacité transactionnel que la page. Chargement, absence réelle de créneau et erreur de chaque source sont trois états distincts ; un échec de notification n’annule pas la réservation enregistrée.'),
 ('page','inventory'):(['inventory-local-recovery'],'État du stockage IndexedDB et reprise visibles dans la page. Les codes inconnus, rescannés dans la même zone ou déjà vus dans une autre zone sont conservés avec un état explicite ; les imports interrompus restent reprenables sans appliquer silencieusement de modification Koha.'),
 ('page','reservations'):(['reservations-diagnostic-certainty'],'La date et la couverture de l’analyse sont affichées. Chaque dossier distingue constat vérifié, hypothèse forte, hypothèse sur données partielles ou absence d’écart démontré ; la cause et l’action proposée restent dans des colonnes séparées.'),
 ('page','loans'):(['loans-resolution-trace'],'Le parcours distingue le constat relu dans Koha, la proposition simulée avec son motif autorisé, puis l’action réellement effectuée. Chaque écriture relit le litige avant et après la résolution et conserve un bilan de session avec succès, dossiers ignorés et échecs.'),
 ('page','transfers'):(['planning-transfer-common'],'La page lit le même document natif Koha et le même moteur d’occurrences que le widget Planning. Les alias relient les codes de sites aux étapes ; l’estimation du prochain passage reste affichée séparément des événements de demande, d’envoi et d’arrivée enregistrés par Koha.'),
 ('widget','planning'):(['planning-transfer-common'],'Occurrences ponctuelles ou hebdomadaires et exceptions utilisent le moteur commun. Ce même moteur alimente les estimations de la page Transferts, avec les réglages et valeurs historiques conservés.'),
 ('page','items'):(['items-batch-readiness'],'Le chargement paginé expose sa progression et son achèvement. Le préfiltrage actif est récapitulé avec la sélection conservée ; avant les commandes, la page compte exemplaires, codes-barres, dossiers approfondis et statuts terminaux. La suppression reste simulée et relue avant chaque écriture.'),
 ('page','biblios'):(['biblios-diagnostic-states'],'Les rapprochements indiquent leur critère : ISBN valide identique ou, à défaut, titre et auteur normalisés avec la même année. Un groupe reste une proposition. La page distingue donnée manquante, anomalie métier, erreur technique et notice non encore contrôlée.'),
 ('page','serials'):(['serials-publication-freshness'],'Le seuil d’interruption possible est configurable et ne s’applique qu’à un abonnement actif non arrivé à échéance. La page affiche la fraîcheur selon la date produite par le rapport ou, à défaut, l’heure de lecture dans Koha, avec un seuil explicite.'),
 ('page','patrons'):(['patrons-privacy-matching'],'Les coordonnées sont masquées par défaut et révélées temporairement par dossier. L’export omet nom et coordonnées sauf option explicite. Les rapprochements indiquent si le critère est strict ou faible, signalent les cas familiaux possibles et permettent de qualifier un faux positif sans supprimer de compte.'),
 ('socle','permissions'):(['koha-journal-permissions','koha-migration','koha-plugin'],'Retrait de droits pendant la session, propriété des profils et modifications concurrentes contrôlés côté Koha ; les écritures périmées et les lots en conflit sont refusés.'),
 'table-labels':(['final-universality','workbench'],'Aperçu avant/après réversible ; diagnostic des cibles absentes et des sélecteurs différents visant un même élément.'),
 'external-links':(['final-universality'],'Destination et paramètres réels décrits sur les liens ; paramètres sensibles masqués et source native conservée.'),
 'patron-message-templates':(['final-universality'],'Recherche sans accents dans les listes longues, doublons signalés sans suppression et effet ajout/remplacement expliqué.'),
 'element-formatting':(['final-universality','workbench'],'Contrastes et chevauchements signalés ; annulation sans recréer le HTML ni perdre les événements et contenus natifs.'),
 'contextual-search-links':(['final-universality'],'Encodage des recherches mutualisé ; accents, caractères mixtes et paramètres répétés conservés.'),
 'element-placement':(['final-universality'],'Déplacement des nœuds originaux, aperçu annulable et refus des cycles parent/enfant ; cibles absentes diagnostiquées.'),
 'custom-navigation':(['final-universality'],'Destinations actives et adresses avec identifiants refusées ; paramètres visibles et description native restaurable. Le module remplace des liens, sans redirection automatique.'),
 'guided-report-print':(['final-universality'],'En-têtes répétés et lignes non coupées ; portée limitée aux lignes chargées explicitée ; contenu actif retiré de la copie imprimable.'),
 'efficiency-indicators':(['final-universality'],'Formule et sources expliquées ; pagination sans total corrigée, calcul partiel indiqué et données disponibles conservées après erreur.'),
 'input-rules':(['final-universality'],'Composition respectée jusqu’à validation, collage filtré avec explication, accents valides conservés et position du curseur corrigée après un emoji.'),
 'patron-required-contact':(['final-universality'],'Combinaisons de contacts, focus sur la première erreur, nouveaux champs dynamiques et aide native contrôlés.'),
 'contextual-tooltips':(['tooltips'],'Lecture longue défilante hors du champ ciblé, clavier et toucher, retour du focus, descriptions natives et saisie conservées.'),
 'multiline-list-counter':(['module-improvements'],'Comparaison des doublons limitée à 100 valeurs affichées, comptage complet sur 24 004 lignes et saisie intacte.'),
 'callnumber-progressive-search':(['module-improvements'],'Cote source et requêtes Koha visibles ; accents, caractères mixtes, clavier et lien natif conservés.'),
 'batchmod-empty-field-warning':(['module-improvements'],'Confirmation récapitulant les champs à vider, y compris les lignes ajoutées ; annulation sans modification de saisie.'),
 'search-results-master':(['catalogue-partial','koha-presentation'],'Pagination partielle réessayable par notice ; 100 notices et 199 cartes avec une requête simultanée ; présentation vérifiée sur Koha local.'),
 'loan-history-timeline':(['module-improvements','koha-presentation'],'Périmètre du tableau et sources explicites, API partielle conservée, intitulés natifs Koha reconnus et dates communes.'),
 'bibliographic-markers':(['module-improvements'],'Texte déclencheur expliqué et alternative accessible ; libellé visible si l’image échoue.'),
 'new-release-indicators':(['module-improvements'],'Date d’acquisition source visible ; dates absentes, futures, invalides ou anciennes sans faux badge.'),
 'patron-message-chronology':(['module-improvements'],'Dates structurées communes, dates identiques stables, ajouts suivis et ordre natif restaurable.'),
 'hold-submit-guard':(['module-improvements','koha-hold-validation'],'Double soumission bloquée même après attente ; validation native annulée et échec AJAX explicitement signalé débloquent la garde.'),
 'detail-fourth-cover':(['summary-source'], 'États explicites du fournisseur, source configurable, contenu long mobile et restauration du DOM à la désactivation.'),
 'waiting-holds-age':(['regression-040'], 'Réglages historiques fusionnés dans les dates relatives, sans second moteur et sans écriture des anciens documents.'),
 'transfer-button-holdings':(['transfer-isolation'],'Préremplissage par onglet, consommation unique, expiration et saisie manuelle conservée.'),
 'phone-number-formatting':(['module-improvements'],'Numéros atypiques et internationaux conservés ; les champs de saisie et liens tel: restent intacts.'),
 'patron-astrological-sign':(['module-improvements'],'Limites des douze signes, année bissextile et dates impossibles vérifiées ; périmètre inchangé.'),
 'patron-age-display':(['regression-040','dates-common'],'Anciennes options conservées dans les âges et dates relatives ; analyse de date commune.'),
 'relative-dates':(['dates-common','regression-040'],'Ordre Koha, dates impossibles, ambiguïtés, fuseaux et changements d’heure testés.'),
 'scroll-buttons':(['module-improvements'],'Clavier, variante mobile configurée, libellés accessibles et réduction des animations vérifiés.'),
 'copy-actions':(['module-improvements','regression-040'],'Refus annoncé, absence de faux succès, retour du focus après le secours, toast accessible sans HTML exécuté.'),
 'date-display-formatting':(['dates-common'],'Conversion commune avec les dates relatives ; ambiguïtés signalées et dates impossibles refusées.'),
 'recent-history':(['module-improvements'],'Exclusion de pages, effacement sélectif et stockage local explicite ; entrées personnelles préservées.'),
 'page-qr-code':(['module-improvements'],'URL et paramètres visibles, besoin de session mobile expliqué, générateur limité au Koha courant.'),
 'bibliography-builder':(['editor-improvements','koha-publications'],'Sources et indisponibilités visibles, actualisation par notice, choix conservés, règles de coupure d’impression maintenues.'),
 'xslt-assistant':(['editor-improvements','koha-publications'],'Échantillon de cinq notices, compatibilité libxslt expliquée, erreurs XML natives et projets préservés.'),
 'restore-deleted-items':(['koha-native-restoration','koha-restoration','restoration-batch'],'Restauration native transactionnelle, droits serveur, aperçu, collisions, notice supprimée, réindexation, reprise des échecs et réponse perdue ; autre plugin désactivé pendant la recette.'),
 ('page','quality-center'):(['quality-center-analysis-registry'],'Dates, résultats et prérequis synthétisés depuis un registre commun limité aux métadonnées ; aucun second moteur métier et page Autorités inchangée.'),
 ('page','bulk-framework-change'):(['bulk-framework-marc-recovery'],'Différence de grille et structure MARC détaillées, relecture avant/après écriture, export d’audit et reprise limitée aux échecs techniques ; les écarts MARC imposent une vérification manuelle.'),
 ('page','overdue-management'):(['overdue-action-preview-recovery'],'Dossier destinataire, destination et contenu exact contrôlés avant écriture ; étapes et exceptions visibles, reprises après réponse incertaine ou nettoyage partiel, avec relecture Koha.'),
 ('widget','circulation'):(['circulation-widget-scope-refresh'],'Période transmise aux deux rapports Koha, actualisation manuelle ou périodique, périmètre et dernière lecture visibles ; zéro activité est distingué d’un rapport indisponible.'),
 ('socle','imports'):(['import-validation-common'],'Validation commune des fichiers texte/JSON, limites de taille et profondeur, URL limitées au Koha courant et HTML actif refusé ; les champs inconnus valides restent conservés.'),
 ('socle','diagnostics'):(['workbench','koha-report-diagnostics','quality-center-analysis-registry'],'Diagnostics communs des cibles, rapports et prérequis, avec résultats datés et sans exécution SQL implicite. Les pages et fournisseurs conservent leurs contrôles métier spécialisés.'),
 ('socle','services'):(['workbench','dates-common','planning-transfer-common','import-validation-common'],'Dates, confirmations, imports, revue des réglages, occurrences de planning et reprise des lots reposent sur des services communs documentés ; les moteurs métier restent propres à leur domaine.'),
 ('socle','compatibility'):(['compatibility-matrix','koha-publications','koha-native-restoration'],'Matrice 0.4.0 publiée : Koha 25.11, MariaDB 10.11 et UNIMARC qualifiés localement ; MARC21, navigateurs, fournisseurs et matériels portent des limites explicites sans bloquer les autres modules.'),
 ('socle','migration'):(['export-transition','import-validation-common','koha-migration','koha-installation','koha-upgrade-preservation'],'Le paquet final est lié par empreinte à son installation, son import global et sa réinstallation. Configurations, champs inconnus, données, historiques et secret serveur de test sont conservés ; l’export réel de production reste à fournir par l’établissement.'),
 'configuration':(['workbench'],'Différences, valeurs sensibles masquées, reset scalaire ciblé du brouillon et annulation ; tableaux personnalisés et champs inconnus conservés.'),
}
partials={
 'nedap':(['nedap-widget','nedap-provider','koha-nedap'],'Relais Koha à destination fixe, clé serveur non retournée, droits et révisions contrôlés ; modes historiques et réglages personnels conservés.','Qualifier une connexion avec le compte Libnet de l’installation. Aucun compte fournisseur n’est disponible ici ; les réponses fournisseur ont été simulées.'),
 'legacy-interface-options':(['legacy-interface-diagnostics'],'Aperçu tabulaire des tournées, validation du JSON, sélecteurs visuels et diagnostic des cibles ajoutés. Le parcours mobile ouvre la caméra arrière, confirme trois lectures identiques, renseigne le champ et ne valide pas le formulaire.','Effectuer une lecture finale sur un téléphone physique autorisé à utiliser la caméra ; la session a exercé l’API caméra avec un flux simulé.'),
 'search-results-master':(['catalogue-partial'],'Pagination sans total et reprise par notice réalisées.','Compléter la recette locale et le contrôle de longues listes.'),
 'loan-history-timeline':(['module-improvements'],'Périmètre du tableau et des sources indiqué, chargements partiels conservés, dates communes.','Compléter la recette sur une page d’historique Koha réelle.'),
}
id_counts=collections.Counter(r['id'] for r in j['rows'])
for r in j['rows']:
 key=(r['kind'],r['id']) if (r['kind'],r['id']) in proofs or (r['kind'],r['id']) in partials else r['id']
 if key in proofs or key in partials:
  assert isinstance(key,tuple) or id_counts[r['id']]==1, 'Qualification ambiguë : utiliser le couple type/id pour '+r['id']
 r['maturityCriterion']=r['requested']+' Les valeurs par défaut et les personnalisations sont conservées. Une recette ciblée couvre les risques réels, sans exigence de perfection universelle.'
 if key in proofs:
  files,note=proofs[key]
  for name in files:
   evidence=json.loads((root/'tests/validation'/f'{name}.json').read_text())
   if 'rows' in evidence: assert evidence['rows'] and all(row.get('passed') for row in evidence['rows']),name
   elif 'passed' in evidence: assert evidence['passed'],name
   else: raise AssertionError('Preuve non reconnue : '+name)
  r.update(status='validé sur le périmètre demandé',evidence=['tests/validation/'+f+'.json' for f in files],result=note,remaining=[])
 elif key in partials:
  files,note,left=partials[key];r.update(status='partiel',evidence=['tests/validation/'+f+'.json' for f in files],result=note,remaining=[left])
 else:
  r['remaining']=[r['requested']];r['result']='Cette demande reste à réaliser ou à vérifier explicitement dans le cycle 0.4.0 ; le statut ne signifie pas que le module de base ne fonctionne pas.'
j['lastReviewedUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
j['qualificationScope']='La validation concerne les scénarios documentés. Aucun compte fournisseur, équipement physique ou export réel de production n’est présenté comme testé.'
p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
counts=collections.Counter(r['status'] for r in j['rows'])
lines=['# Améliorations demandées — suivi de la version 0.4.0','', 'Qualification finale du périmètre demandé. La maturité est bornée aux risques réels documentés et ne prétend pas couvrir chaque combinaison de matériel ou fournisseur.','', 'La liste comprend 112 demandes : 86 modules, 15 pages, 4 widgets et 7 sujets communs. Les deux points partiels exigent un équipement ou un compte fournisseur qui n’est pas disponible dans cette session.','', '## État vérifiable','']
for status,n in counts.items():lines.append(f'- {status} : {n}.')
lines += ['', 'Les critères, résultats, preuves et points restants sont conservés dans [le registre détaillé](dev/requirements-0.4.0.json). Les preuves sur fixtures sont distinguées des tests sur Koha local. Les tests fournisseur, matériels et de production ne sont pas inclus.','', '## Demandes validées','', '| Élément | Résultat | Preuves |','|---|---|---|']
for r in j['rows']:
 if r['status'].startswith('validé'):lines.append('| '+r['name']+' | '+r['result']+' | '+', '.join('['+Path(f).stem+']('+f+')' for f in r['evidence'])+' |')
lines += ['', '## Demandes encore ouvertes','', '| Type | Élément | Reste à faire |','|---|---|---|']
for r in j['rows']:
 if not r['status'].startswith('validé'):lines.append('| '+r['kind']+' | '+r['name']+' | '+' '.join(r['remaining'])+' |')
lines += ['', '## Livraison','', 'Le KPZ 0.4.0 et le ZIP complet sont produits uniquement après la recette séquentielle, la réinstallation et la vérification de migration liées à l’empreinte exacte du paquet. Les réglages de production ne sont jamais intégrés aux archives : ils sont repris par l’exporteur de transition et l’import contrôlé du plugin.','']
(root/'SUIVI-AMELIORATIONS-0.4.0.md').write_text('\n'.join(lines))
print(dict(counts))
