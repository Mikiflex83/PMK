> Archive de l’audit du 18 octobre 2026. Les mentions Firestore décrivent l’état historique. Pour le fonctionnement natif actuel : [MIGRATION-STOCKAGES-NATIFS.md](MIGRATION-STOCKAGES-NATIFS.md) et [REFERENCE-CONFIGURATION-PAGES-PMK.md](REFERENCE-CONFIGURATION-PAGES-PMK.md).

# Pages et outils PimpMyKoha — 0.8.0

État des sources et des vérifications locales au 18 octobre 2026. Dix-neuf pages
subsistent après suppression du Laboratoire des règles. La page des autorités
est conservée strictement à l’identique de la version reçue au début de cette
passe : SHA-256 `4fa8da7046a0724ef6381781f22cf154641350ffbbf3f97e3f5b40b1a7cfaed7`.

## Accès et réglages communs

Accueil : `/cgi-bin/koha/mainpage.pl?pmk_page=hub`. Chaque outil possède la même
route, avec son identifiant ci-dessous. Les liens utilisent le Koha courant.
Le Centre qualité et les menus emploient ce registre commun. Les anciennes URL
`rulelab` reviennent à l’accueil des outils ; leurs anciennes données ne sont pas
effacées. Les décisions locales restent disponibles. Les retours et publications
d’apprentissage sont retirés des sept pages qualité modifiables ; les références
internes de la page Autorités restent préservées conformément à votre exception.

Dans **PMK → Pages & outils internes → Réglages des pages**, choisir une page
pour voir son objectif, ses fonctions, son moteur et ses prérequis. Les réglages
techniques sont repliés. Compteur, XSLT et Bibliographies renvoient à leur module
existant : ils ne possèdent pas une seconde configuration métier concurrente.

La configuration centrale est `internal-pages-tools.pageOptions`. Ordre de
priorité : valeurs par défaut, anciens réglages personnels, puis surcharges PMK
explicitement enregistrées. Ouvrir un formulaire ne sauvegarde rien. Une remise
à la valeur héritée utilise un marqueur explicite et archive la surcharge
précédente. Les imports alimentent un brouillon et conservent les anciennes
options ; cliquer **Enregistrer** reste nécessaire. Les changements prennent
effet à la prochaine ouverture de l’outil.

Un enregistrement depuis une page utilise aussi cette configuration centrale.
Les anciens réglages locaux sont archivés et leur source reste intacte. Pour
l’inventaire, les inventaires et scans IndexedDB ne sont pas réécrits lors d’un
changement de réglages. Les valeurs Dracénie restent les valeurs par défaut.
L’export d’un réglage n’exporte pas les inventaires, projets ou données Firebase.

L’accueil reste réservé aux superlibrarians par défaut. Les trois outils Grilles
par lot, Bibliographies et Retards restent accessibles au personnel. Chaque
accès peut être adapté dans PMK, sauf Autorités dont la restriction est conservée.
L’affichage d’un outil n’accorde pas les permissions de modification Koha ou les
droits Firebase : les serveurs continuent à les contrôler.

## Pages, fonctions et moteurs


### Journal des actions

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=action-journal`.

Partager les interventions et décisions de l’équipe dans un journal consultable.

Moteur : Firestore : entrées, versions, écoute en temps réel et export PDF.

Fonctions :

- Ajouter et modifier une action

- Retirer et restaurer une entrée

- Consulter les versions

- Exporter le journal en PDF


Prérequis : Droits Firestore sur les collections du journal.


Réglages utiles : Types d’action (un par ligne), Auteur proposé par défaut, Afficher initialement les entrées supprimées.


Réglages avancés : Clé publique Firebase, Domaine d’authentification Firebase, Identifiant du projet Firebase, Bucket Firebase, Identifiant de messagerie Firebase, Identifiant d’application Firebase, Langue et format régional (ex. fr-FR), Collection Firestore des entrées, Collection Firestore des versions.


### Rendez-vous réseau

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=appointments`.

Organiser les rendez-vous, créneaux et sondages de votre établissement.

Moteur : Firestore, agenda interne, récurrences, sondages et EmailJS facultatif.

Fonctions :

- Gérer les créneaux et thèmes

- Réserver et annuler

- Importer les participants

- Gérer les sondages et récurrences

- Configurer les notifications et exporter les résultats


Prérequis : Droits Firestore ; EmailJS uniquement pour les notifications.


Réglages utiles : Vue initiale.


Réglages avancés : Clé publique Firebase, Domaine d’authentification Firebase, Identifiant du projet Firebase, Bucket Firebase, Identifiant de messagerie Firebase, Identifiant d’application Firebase, Langue et format régional (ex. fr-FR), Réglages, Thèmes, Créneaux, Réservations de rendez-vous, Sondages, Réponses aux sondages, Participants, Récurrences, Mot de passe du mode administration.


### Compteur de fréquentation

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=attendance-counter`.

Saisir et analyser la fréquentation par lieu et date.

Moteur : Moteur commun du compteur flottant et de sa page.

Fonctions :

- Compter par catégories

- Gérer les lieux

- Corriger les comptages

- Consulter les statistiques et exporter


Prérequis : Firebase et configuration commune du module Compteur de fréquentation.


Configuration : module existant `attendance-mediabus-mini`, accessible depuis ce formulaire.


### Restauration d’exemplaires

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=restore-deleted-items`.

Retrouver des exemplaires supprimés et les restaurer avec le plugin Koha.

Moteur : Rapports Koha, plugin UndeleteRecords, API de prêt et retour natif.

Fonctions :

- Rechercher par code-barres ou dates

- Restaurer un exemplaire ou un lot

- Proposer le prêt ou le retour après restauration


Prérequis : Plugin UndeleteRecords, rapports de recherche, permissions Koha et lecteur technique configurés.


Réglages utiles : Comptes Koha autorisés (un par ligne), Carte du lecteur technique pour le prêt, Rapport de recherche par codes-barres, Rapport de recherche par dates, Période initiale de recherche (jours).


Réglages avancés : Classe du plugin de restauration, Page d’exécution des plugins Koha, Page des rapports Koha, Nom du paramètre de codes-barres du rapport, Nom du paramètre de date de début, Nom du paramètre de date de fin, Codes-barres par recherche, Racine de l’API Koha, Code du site de circulation (vide = session Koha), Délai maximal d’une lecture (ms), Correspondance des colonnes des rapports.


SQL à créer dans votre Koha puis ID à renseigner : `sql/138-restauration-codes-barres.sql`, `sql/138-restauration-dates.sql`. Le formulaire permet de copier le SQL.


### Désherbage

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=weeding`.

Préparer et documenter les décisions de désherbage ou de déplacement.

Moteur : API Koha, MARC, critères de rotation, taxonomie facultative et sauvegarde locale.

Fonctions :

- Scanner un document

- Préparer une sélection multicritère

- Évaluer les exemplaires

- Déplacer, signaler ou supprimer après confirmation

- Sauvegarder et restaurer une session, exporter


Prérequis : Permissions Koha pour les traitements ; taxonomie Firebase facultative.


Réglages utiles : Code NOT_LOAN pour l’exclusion du prêt, Code LOST pour le pilon, Code LOST pour l’examen des collections, Localisations de réservoir (codes et libellés), Étages (codes et libellés), Utiliser une arborescence Firebase.


Réglages avancés : Racine de l’API Koha, Adresse des fiches notice (avant le numéro), Champ API de l’étage, Zone MARC du classement, Sous-zone du domaine, Sous-zone du sous-domaine, Sous-zone du thème, Maximum d’exemplaires par préparation, Exemplaires par lecture, Pause entre lectures (ms), Pause entre écritures (ms), Traitements simultanés, Pause entre traitements (ms), Codes-barres par lecture, Clé publique Firebase, Domaine d’authentification Firebase, Identifiant du projet Firebase, Bucket Firebase, Identifiant de messagerie Firebase, Identifiant d’application Firebase, Domaines à rotation lente, Domaines à rotation courante, Localisations exclues des propositions, Mots repérant les réservoirs et localisations particulières, Catégorie des localisations, Catégorie des collections, Catégorie des statuts non-prêtables, Catégorie des statuts perdu, Délai maximal d’une lecture (ms), Collection Firestore de l’arborescence.


### Inventaire

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=inventory`.

Contrôler les exemplaires présents, manquants et incohérents par zone.

Moteur : IndexedDB, journal des scans, API Koha et formulaires natifs préservant les champs supplémentaires.

Fonctions :

- Créer et importer un inventaire

- Définir les zones et valeurs attendues

- Scanner, annuler un lot et gérer les conflits

- Prévisualiser les manquants et corrections

- Exporter et sauvegarder les inventaires


Prérequis : IndexedDB dans ce navigateur ; permissions et listes de valeurs Koha.


Réglages utiles : Sons de contrôle, Prendre les prêts en compte par défaut, Site de référence, Champs contrôlés par défaut, Champs ignorés pour les exemplaires flottants, Types de documents flottants, Catégorie des localisations, Catégorie des collections, Catégorie des publics, Catégorie des sous-localisations, Catégorie des étages, Catégorie des statuts non-prêtables, Catégorie des statuts perdu, Zone MARC des exemplaires, Sous-zone MARC du public, Sous-zone MARC de la sous-localisation, Listes de valeurs supplémentaires, Champs contrôlés et correspondances, Statuts à préserver lors du contrôle, NOT_LOAN proposé pour les manquants, LOST proposé pour les manquants, NOT_LOAN proposé pour le désherbage, LOST proposé pour le désherbage.


Réglages avancés : Racine de l’API Koha, Délai maximal d’une lecture (ms), Résultats par lecture.


### Maintenance des réservations

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=reservations`.

Repérer les réservations qui nécessitent un examen et préparer leur traitement.

Moteur : API réservations, notices et exemplaires, règles explicites, simulation et recontrôle natif.

Fonctions :

- Charger et filtrer les réservations

- Expliquer les blocages et délais

- Exclure des catégories ou statuts locaux

- Préparer puis confirmer les annulations

- Exporter les données et conseils


Prérequis : Permissions API Koha ; les seuils sont des repères à adapter au règlement local.


Réglages utiles : Ancienneté à examiner (jours), Ancienneté prioritaire (jours), Absence d’activité à examiner (jours), Attente de retrait à examiner (jours), Attente de retrait prioritaire (jours), Transit à surveiller (jours), Transit à vérifier (jours), Transit prioritaire (jours), Demandes en attente signalant une forte pression, Durée de prêt de référence (jours), Durée de renouvellement de référence (jours), Nombre de renouvellements de référence, Traitement à examiner (jours), Demande d’annulation ancienne (jours), Suspension sans échéance à examiner (jours), Suspension échue à examiner (jours), Sites exclus, Localisations exclues, Localisations permanentes exclues, Collections exclues, Types de documents exclus, Codes LOST exclus, Codes DAMAGED exclus, Codes WITHDRAWN exclus, Codes NOT_LOAN exclus, Catégories d’adhérents exclues, Expliquer les dossiers après le chargement demandé, Lancer l’analyse approfondie après le chargement demandé, Périmètre de l’analyse automatique, Maximum de notices à approfondir.


Réglages avancés : Racine de l’API Koha, Lignes par page, Résultats par lecture API, Pause entre lectures (ms), Pause entre analyses approfondies (ms), Délai maximal d’une lecture (ms), Contrôles désactivés (identifiants des règles).


### Prêts & litiges

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=loans`.

Examiner les prêts anciens, retards et réclamations.

Moteur : API prêts, lecteurs, exemplaires et réclamations ; analyse approfondie à la demande.

Fonctions :

- Analyser les prêts et retards

- Examiner les litiges

- Préparer le traitement de réclamations

- Exporter les dossiers


Prérequis : Permissions API et droits Koha de circulation/réclamations.


Réglages utiles : Ancienneté à examiner (jours), Ancienneté prioritaire (jours), Retard important (jours), Retard prioritaire (jours), Absence d’activité à examiner (jours), Réclamation ancienne (jours), Réclamation prioritaire (jours), Renouvellements sans présentation à examiner.


Réglages avancés : Racine de l’API Koha, Lignes par page, Résultats par lecture API, Pause entre lectures (ms), Dossiers par analyse approfondie, Délai maximal d’une lecture (ms), Catégorie des motifs de résolution des réclamations, Contrôles désactivés (identifiants des règles).


### Transferts / navette

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=transfers`.

Surveiller les demandes de transfert et les documents en transit entre sites.

Moteur : Rapport SQL paginé, API exemplaires, règles de délai et traitement natif.

Fonctions :

- Charger et filtrer les transferts

- Distinguer attente et transit

- Examiner et marquer les exemplaires recherchés

- Simuler une annulation et vérifier son résultat

- Exporter CSV ou JSON


Prérequis : Créer le rapport SQL Transferts fourni puis renseigner son ID.


Réglages utiles : Identifiant du rapport SQL, Demande de transfert à surveiller (jours), Demande de transfert à vérifier (jours), Demande de transfert prioritaire (jours), Transit à surveiller (jours), Transit à vérifier (jours), Transit prioritaire (jours), Signaler le seul statut non-prêtable, Trajet long de référence (jours), Champ API « déjà recherché à », Autoriser l’annulation native expérimentale, Sites exclus, Localisations exclues, Localisations permanentes exclues, Collections exclues, Types de documents exclus, Codes LOST exclus, Codes DAMAGED exclus, Codes WITHDRAWN exclus, Codes NOT_LOAN exclus.


Réglages avancés : Service des rapports SQL, API des exemplaires, Page native des retours, Modification native des exemplaires par lot, Lignes par page, Lignes par lot du rapport, Pause entre lectures (ms), Délai maximal d’une lecture (ms), Contrôles désactivés (identifiants des règles).


SQL à créer dans votre Koha puis ID à renseigner : `sql/138-transferts.sql`. Le formulaire permet de copier le SQL.


### Maintenance des exemplaires

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=items`.

Repérer les statuts figés et incohérences des exemplaires.

Moteur : API Koha, règles de statuts/ancienneté, contrôle des relations et préparation de lots.

Fonctions :

- Analyser les statuts et dernières présences

- Comparer les exemplaires d’une notice

- Vérifier prêts et réservations

- Préparer une suppression ou un traitement natif

- Exporter les anomalies


Prérequis : Permissions API ; les codes de statut sont ceux de votre Koha.


Réglages utiles : Dernière présence à vérifier (jours), Dernière présence à surveiller (jours), Statut perdu ancien (jours), Statut endommagé ancien (jours), Statut retiré ancien (jours), Minimum d’exemplaires pour comparer une notice, Majorité requise pour comparer les exemplaires (%), Codes LOST de fin de cycle, Codes WITHDRAWN de fin de cycle, Ancienneté minimale de fin de cycle (jours), Autoriser la suppression API après simulation.


Réglages avancés : API des exemplaires, Lignes par page, Résultats par lecture API, Pause entre lectures (ms), Dossiers par analyse approfondie, Délai maximal d’une lecture (ms), Contrôles désactivés (identifiants des règles).


### Qualité du catalogue bibliographique

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=biblios`.

Examiner la qualité des notices et préparer les corrections de catalogue.

Moteur : API bibliographique et MARC, signatures de doublons, fusion native et enrichissement BnF.

Fonctions :

- Contrôler le MARC et les identifiants

- Repérer les doublons et notices sans exemplaire

- Préparer la fusion native

- Examiner des propositions d’enrichissement

- Exporter les constats


Prérequis : UNIMARC ou MARC21 selon le profil configuré ; service externe facultatif.


Réglages utiles : Rapport SQL de signatures (0 = API seule), Autoriser la fusion après simulation, Proposer la comparaison avec la BnF, Format MARC des notices, Contrôles d’audit désactivés (codes BIB-…).


Réglages avancés : Racine de l’API Koha, Service des rapports SQL, Lignes par page, Résultats par lecture API, Pause entre lectures (ms), Notices par audit approfondi, Notices par comparaison externe, Délai maximal d’une lecture (ms), Adresse du service SRU BnF, Zones MARC locales protégées lors des comparaisons.


SQL à créer dans votre Koha puis ID à renseigner : `sql/138-signatures-notices.sql`. Le formulaire permet de copier le SQL.


### Maintenance des périodiques

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=serials`.

Examiner abonnements échus, fascicules attendus, réclamations et inactivité.

Moteur : Rapport SQL paginé et navigation vers les écrans Koha.

Fonctions :

- Filtrer les abonnements et sites

- Analyser échéances, retards et réclamations

- Préparer une liste de traitement

- Exporter les constats


Prérequis : Créer le rapport SQL Périodiques fourni puis renseigner son ID.


Réglages utiles : Identifiant du rapport SQL, Abonnement échu à vérifier (jours), Abonnement échu prioritaire (jours), Réclamation ancienne (jours), Inactivité à surveiller (jours), Inactivité à vérifier (jours), Fascicules attendus en retard : seuil prioritaire, Fascicules manquants : seuil de contrôle, Fascicules en retard : seuil de contrôle, Charger à l’ouverture quand le rapport est configuré.


Réglages avancés : Service des rapports SQL, Lignes par page, Lignes par lot du rapport, Pause entre lectures (ms), Délai maximal d’une lecture (ms), Contrôles désactivés (identifiants des règles).


SQL à créer dans votre Koha puis ID à renseigner : `sql/138-periodiques.sql`. Le formulaire permet de copier le SQL.


### Qualité des comptes lecteurs

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=patrons`.

Contrôler les comptes expirés, contacts et doublons potentiels.

Moteur : API lecteurs, normalisation des contacts et contrôle des engagements avant traitement.

Fonctions :

- Filtrer par site et catégorie

- Repérer les contacts incohérents

- Examiner les doublons potentiels

- Vérifier prêts/réservations avant traitement

- Exporter les dossiers


Prérequis : Permissions API lecteurs ; aucune suppression n’est déduite de l’ancienneté seule.


Réglages utiles : Compte expiré à surveiller (jours), Compte expiré à vérifier (jours), Ancienneté minimale pour examiner la conservation (jours).


Réglages avancés : Racine de l’API Koha, API des réservations, Lignes par page, Résultats par lecture API, Taille de lecture de secours, Pause entre lectures (ms), Dossiers par analyse approfondie, Délai maximal d’une lecture (ms), Contrôles désactivés (identifiants des règles).


### Centre qualité Koha

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=quality-center`.

Ouvrir les outils de contrôle et voir leurs prérequis.

Moteur : Registre commun des pages ; diagnostic local de configuration.

Fonctions :

- Accéder aux huit domaines qualité

- Voir les rapports manquants

- Ouvrir les réglages de chaque outil


Prérequis : Gestionnaire Pages & outils internes actif.


Réglages avancés : Afficher les descriptions des outils.


### Modification de grille par lot

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=bulk-framework-change`.

Changer la grille de catalogage d’un ensemble de notices sans remplacer leur MARC.

Moteur : API Koha MARCXML, en-tête x-framework-id et vérification après écriture.

Fonctions :

- Résoudre notices ou codes-barres

- Dédoublonner les entrées

- Choisir la grille cible

- Prévisualiser, appliquer, arrêter et exporter


Prérequis : Permissions de catalogage et API Koha permettant le changement de grille.


Réglages utiles : Format MARC des notices à modifier.


Réglages avancés : Racine de l’API Koha, Nombre maximal d’entrées par lot, Lectures simultanées, Délai maximal d’une lecture (ms).


### Éditeur XSLT

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=xslt-assistant`.

Construire et vérifier une feuille XSLT puis l’exporter pour Koha.

Moteur : Projets locaux, analyse XML/XPath et aperçu XSLT du navigateur.

Fonctions :

- Importer et organiser les blocs

- Choisir les zones MARC

- Comparer les aperçus

- Vérifier puis exporter

- Sauvegarder et restaurer les projets


Prérequis : Module Éditeur XSLT actif ; le rendu serveur Koha reste à vérifier.


Configuration : module existant `xslt-assistant`, accessible depuis ce formulaire.


### Bibliographies & publications

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=bibliography-builder`.

Composer des publications à partir de sélections de notices ou exemplaires.

Moteur : Sources PMK/Koha, cache de lectures, résolution de couvertures et moteur de modèles.

Fonctions :

- Choisir une source et un modèle

- Organiser notices, exemplaires et champs

- Prévisualiser le document

- Imprimer et exporter

- Conserver les modèles personnels


Prérequis : Permissions de lecture Koha ; sources et modèles propres au profil actif.


Configuration : module existant `bibliography-builder`, accessible depuis ce formulaire.


### Gestion des retards

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=overdue-management`.

Suivre les dossiers de retard et leurs étapes avec les messages Koha.

Moteur : Rapport SQL de classement, lecture des dossiers et formulaires Koha avec jeton CSRF frais.

Fonctions :

- Filtrer par site et étape

- Consulter lecteur et prêts

- Préparer et enregistrer un message

- Vérifier les écritures et reprendre les dossiers


Prérequis : Rapport compatible avec le contrat de colonnes ; permissions Koha de rapports et circulation. Le SQL générique fourni ne reproduit pas les règles Dracénie du rapport 5261 ; ce dernier reste la source par défaut.


Réglages utiles : Identifiant du rapport SQL, Site proposé par défaut (code Koha), Devise (ex. EUR), Titre de la page, Messages proposés (un par ligne), Proposer le parcours spécialisé DNR, Code de catégorie pour le dossier DNR, Consignes de traitement (un paragraphe par ligne), Consigne proposée avant les retours, Consigne d’impression et de transmission.


Réglages avancés : Résultats par lecture, Nombre maximal de pages du rapport, Délai maximal d’une lecture (ms), Page des rapports Koha, Page des fiches lecteurs, Suppression native des messages, Ajout natif des messages, Nom du paramètre de site du rapport, Langue et format régional (ex. fr-FR), Correspondance des colonnes du rapport, Correspondance des étapes du rapport, Intitulé du dossier spécialisé, Intitulé de préparation du dossier, Intitulé de modification du dossier, Consigne d’entrée dans le parcours spécialisé, Consigne de sortie du parcours spécialisé, Reconnaître les groupes d’attributs du dossier (expression régulière), Reconnaître les attributs du dossier (expression régulière), Intitulés des étapes du suivi, Tableau de résultats du rapport (sélecteur CSS), Bloc des attributs lecteur (sélecteur CSS), Identité du lecteur (sélecteur CSS), Action native d’ajout de message (sélecteur CSS), Lignes de messages Koha (sélecteur CSS), Actions natives de modification de message (sélecteur CSS), Messages proposés en priorité par étape (indices de la liste, à partir de 0).


SQL à créer dans votre Koha puis ID à renseigner : `sql/138-suivi-retards-generique.sql`. Le formulaire permet de copier le SQL.


### Maintenance des autorités — page protégée

URL : `/cgi-bin/koha/mainpage.pl?pmk_page=authorities`.
Audits des autorités, recherche de doublons, files de fusion et relink ; API,
MARC et rapports historiques 5245, 5246 et 5260. Réglages, décisions et caches
existants inchangés. Ni moteur, ni formulaire, ni valeurs par défaut, ni contenu
de cette page ne sont modifiés. Son paramétrage n’est pas remplacé par le nouveau
formulaire des dix-huit autres pages.

## Points de compatibilité à connaître

- Inventaire : zone et sous-zones MARC, catégories de valeurs autorisées et codes
  deviennent réglables ; les auto-tests internes ne supposent plus la zone 999.
  Un profil 952 personnalisé a été vérifié dans les tests simulés.
- Notices : UNIMARC reste le défaut ; un profil MARC21 évite les contrôles
  UNIMARC inadaptés. Les doublons de titres restent fondés sur la normalisation
  et les signatures existantes ; aucun moteur flou nouveau n’est annoncé.
- Transferts, signatures et périodiques : pagination jusqu’à réponse vide,
  contrôle de progression et limites explicites. `Last_Arrived` du SQL périodiques
  utilise la date de publication du dernier fascicule arrivé, pas sa date réelle
  de réception, que la table native ne fournit pas directement.
- Restauration : plugin UndeleteRecords toujours requis. Les rapports 5230/5231,
  le filtre nominatif et le lecteur technique historiques sont conservés par
  défaut mais paramétrables ; ils ne sont pas supposés exister ailleurs.
- Retards : rapport 5261 inchangé par défaut. Le SQL générique fourni ne reproduit
  pas les règles Dracénie de ce rapport : il identifie les lecteurs en retard et
  les place « À contrôler ». Les sites, colonnes, étapes, messages, consignes,
  catégorie DNR et cibles des formulaires deviennent configurables.
- Journal, rendez-vous et compteur : projets et collections Dracénie préservés,
  autres projets configurables. Les règles d’accès du backend restent nécessaires.
  Le mode administrateur du rendez-vous n’est pas une authentification serveur.
- XSLT : l’aperçu navigateur ne reproduit pas toutes les extensions et paramètres
  XSLT du serveur Koha. Aucun déploiement de feuille n’est automatique.
- Bibliographies : modèles, panneaux, publication et stockage des projets conservés.
  Lectures, cache et indicateur de chargement restent ceux de la passe précédente.

## Vérifications et limites

Les rapports de `tests/validation/` distinguent la régression générale, les accès
aux dix-neuf pages, les scénarios d’universalisation et les contrats des six SQL.
Les tests navigateur existants utilisent des pages et API simulées. Les SQL ont
été vérifiés sur des données de test avec adaptation explicite de syntaxe ; les six SQL ont ensuite été
compilés par EXPLAIN sur le vrai schéma Koha 25.11 / MariaDB 10.11. Ce dernier
contrôle valide leur syntaxe et leurs colonnes, pas toutes les situations métier.

Un environnement Koha 25.11 et un premier paquet plugin sont maintenant installés
séparément : `dev/koha/` et `plugin/`. Leur état réel et les tests sur Koha sont
consignés dans `PLUGIN-KOHA-PMK.md`. Aucun traitement n’a été exécuté sur votre
installation de production et aucune configuration personnelle n’a été extraite
ou remplacée sur celle-ci.
