# Corrections PimpMyKoha — socle 0.8.0

Les correctifs conservent l’organisation PMK, les identifiants de modules et les
données et paramètres existants. Les données de production n’ont pas été modifiées pendant
ce travail. Les vérifications utilisent des pages locales et un stockage simulé.

## Plugin 0.2.0 — suppression de Firebase

Tous les moteurs métier utilisent désormais la base Koha via une API locale et
la session professionnelle : compteur flottant/page, journal, rendez-vous/widget,
listes, modèles de bibliographies, catalogage/arborescence, plannings,
fréquentation et partage interne. Les fonctions d’apprentissage et leur ancien
chargement dans les autorités sont retirés. Aucun repli externe n’est conservé.

Le gestionnaire de données prépare les imports JSON avant toute écriture,
préserve les documents métier existants et permet de fusionner les réglages en
archivant leur version précédente. Les transactions, conflits, lots, dates,
collections paginées et droits administratifs sont traités côté Koha.

La recette a aussi corrigé les actions rapides du journal, le getter de
disponibilité des listes et l’attente du contexte de modèles de bibliographies.
Le rendu et les modèles graphiques de bibliographie sont conservés.
Voir MIGRATION-STOCKAGES-NATIFS.md et RECETTE-PLUGIN-KOHA.md.

## Configurations concurrentes et conservation

Le registre produit désormais une définition finale par identifiant. Il fusionne
les options et les valeurs par défaut des déclarations du socle et des scripts
métier. La priorité dépend de la version du schéma et de la source, et ne dépend
plus de l’ordre de chargement entre fichiers. Les variantes originales des
valeurs par défaut restent consultables et exportables avec la configuration.
Les pré-déclarations de secours restent dans le socle pour permettre
l’administration depuis les pages où le script métier n’est pas chargé.

L’analyse des déclarations JavaScript repère onze identifiants déclarés
à la fois dans le socle et dans un script : `table-labels`, `detail-fourth-cover`,
`external-links`, `moredetail-layout`,
`patron-message-templates`, `contextual-search-links`, `z3950-workspace`,
`catalogue-search-behavior`, `detail-bibliographic-groups` et
`patron-overdues-print`, ainsi que `relative-dates`. Pour ce dernier, le script
métier utilise la définition du socle quand elle est disponible ; sa déclaration
locale reste un secours autonome. Ces déclarations alimentent le même registre et le même
document, avec une seule commande par chemin de configuration dans le formulaire.

Les propriétés personnalisées inconnues d’un normaliseur sont conservées, y
compris dans les éléments de listes identifiés. Si un normaliseur transforme une valeur ou retire un
élément ancien, sa valeur originale reste dans `__pmkPreservedValues` plutôt que de
disparaître de la configuration. Avant une sauvegarde, le socle relit la valeur
enregistrée ; une lecture impossible empêche l’écriture. Une lecture refusée
bloque aussi la sauvegarde des préférences globales. Les
éléments de listes sont appariés par identifiant : les propriétés d’une ligne
supprimée ne sont jamais transférées à une nouvelle ligne. Une copie antérieure
est également conservée localement lorsque le navigateur permet ce stockage.
L’export JSON est disponible dans les informations techniques du module.

Les conflits particuliers suivants ont été traités :

- L’ancien socle `000-drac-quality-memory-firebase.js` ne crée plus un second
  registre susceptible de masquer le socle récent. Son URL charge désormais
  `000-pmk-config-firestore.js`, avec un seul événement de disponibilité.
- MusicBrainz respecte une recherche sur `search.pl` explicitement désactivée ;
  Liens externes respecte une présentation `inline-grid` enregistrée. Leurs
  anciennes migrations ne réactivent plus ces options et ne sauvegardent plus
  automatiquement au chargement.
- Le fichier `008-issuehistory-timelineold.js` contenait les options SQL les plus
  récentes. Elles sont intégrées au fichier principal, maintenant en 3.1.0.
  L’ancien nom charge le fichier principal et ne crée plus un second moteur.
- L’adaptation KohaTools de l’âge et le module PMK ne peuvent plus écrire
  simultanément dans le même affichage. La configuration KohaTools reste intacte.
- L’ancien interrupteur de contenu de « Liens utiles » est repris une fois dans
  l’état du gestionnaire d’accueil. Un widget précédemment désactivé le reste ;
  ensuite, son activation a une seule source dans le gestionnaire.

## Fusion complète des âges et des dates relatives

Le formulaire « Âges et dates relatives » contient directement les réglages de
l’âge natif, ses pages, ses formats, et les règles libres avec sélection visuelle.
Il est disponible depuis le socle, même si les scripts de rendu 070/098 ne sont
pas chargés sur la page d’administration. Il n’ouvre plus un second sous-écran.

Le document `relative-dates` devient l’unique source de configuration. La première
lecture reprend le document historique `patron-age-display`, ses propriétés
personnelles et ses pages, sans écrire ni supprimer ce document. Les états
antérieurs de l’âge et des règles restent indépendants sous l’interrupteur commun :
un calcul précédemment désactivé n’est pas réactivé par la fusion.

Lors d’un enregistrement explicite, les réglages sont enregistrés ensemble. Les
copies originales des deux configurations sont conservées dans
`migrations.ageDatesSources`, et le marqueur `migrations.ageDatesUnified` empêche
une nouvelle importation de préférences anciennes par-dessus les nouveaux choix.
Une lecture refusée du document historique bloque la sauvegarde de la fusion.
Les appels de lecture, sauvegarde, abonnement et administration utilisant l’ancien
identifiant sont adaptés vers la configuration commune ; les deux affichages se
mettent à jour depuis ce seul document.

## Menus 134 et 147

`PMKMenuEngine`, fourni par le socle et enregistré comme service `pmk.menus`,
assure l’édition et le rendu des deux modules. Il remplace les deux éditeurs
conditionnels du 147 et le rendu séparé de ses entrées. Le 147 ne dépend plus du
chargement préalable du script 134 pour afficher le bon éditeur.

Le constructeur commun gère les rubriques, les liens, les groupes, les
séparateurs, les sous-menus, les actions PMK, les niveaux, le déplacement,
la duplication, les intitulés français/anglais, les icônes, les accès et les
ouvertures dans un nouvel onglet. Les présentations latérale, déroulée et
méga-menu restent disponibles. La recherche, la navigation au clavier et le
rendu des favoris utilisent le moteur commun. Les résultats de recherche
s’affichent dans le panneau ; les sous-menus latéraux se déroulent aussi dans le
panneau sur petit écran afin de rester accessibles à 320 pixels de largeur.

Les formats enregistrés existants restent lisibles. L’adaptateur du 147 conserve
les propriétés originales des rubriques et des entrées ; ses propriétés de menu
supplémentaires sont conservées dans `pmkMenu`. La découverte de liens natifs
complète les entrées sans remplacer les intitulés, les catégories, les masquages,
l’ordre et les métadonnées déjà enregistrés. Elle ne supprime pas une ancienne
entrée simplement parce que le compte courant ne peut plus la voir.

Le 134 n’enregistre plus automatiquement ses migrations lors du chargement.
Les accès Koha et le stockage des favoris restent propres à la session et aux
services existants ; les fixtures ne remplacent pas une vérification de ces
services sur le Koha réel.

## Profil d’accueil demandé

« Module 174 » a été interprété comme le module 147, correspondant aux menus
d’accueil de la demande. Le profil Dracénie est intégré à partir des extraits
fournis. Les autres installations continuent d’utiliser la découverte de leurs
pages natives ; les catégories d’adhérents, les grilles et les intitulés ne sont
pas supposés identiques d’un Koha à l’autre.

| Menu | Valeurs par défaut |
| --- | --- |
| Circulation | Intitulés fournis ; prêt secouru exclu. |
| Adhérents | « Nouvel adhérent », puis les neuf catégories fournies. |
| Listes de notices | « Nouvelle liste ». |
| Réserves de cours | Création d’une nouvelle liste ; route standard `add_course.pl`, à confirmer sur le Koha réel. |
| Autorités | Ignoré par défaut, sans effacement d’une configuration existante. |
| Catalogage | « Nouvelle notice », puis chaque grille avec son intitulé ; autres rubriques conservées. |
| Rapports | Intitulés et rubriques fournis, liens externes compris ; formulaire de recherche exclu. |
| Outils | Intitulés et rubriques du fichier fourni. |
| Administration | Intitulés et rubriques fournis ; formulaire des préférences système exclu. |

Les exclusions, menus ignorés, liens externes, limites et délais sont modifiables
au même endroit, dans les réglages avancés du 147. Un sélecteur de liens peut
également être défini pour une rubrique adaptée à une autre installation.

## Autres demandes traitées

| Module | Correction |
| --- | --- |
| Configuration commune | Suppression de l’introduction générique ; une activation globale ; bouton avancé uniquement s’il mène à des options. |
| Liens utiles | Éditeur sur le widget, réservé aux superlibrarians ; conservation du document et des liens existants. |
| Widgets d’accueil | Activation dans PMK ; configuration des contenus sur les widgets ; réglages des rapports conservés sur leur widget. |
| Âges et dates relatives | Un seul formulaire et document ; reprise des deux configurations historiques, interrupteurs préservés et formats âge/durée avec sélection visuelle. |
| Adresses | Sélection visuelle des six champs ; reprise de l’ancien état d’activation dans l’interrupteur principal ; les suggestions restent fermées après un choix. |
| Automatismes adhérent | Suppression des répétitions de l’activation globale. Les interrupteurs propres à chaque automatisme et événement restent distincts et utiles. |
| Doublons | Choix des propriétés API et champs du formulaire ; comparaison exacte, approchante ou par date ; recherche et qualification paramétrables. |
| Astrologie | Pages, source de naissance et destination configurables ; mise à jour lors de la saisie. |
| Guides | Étapes par page, titre/texte/cible éditables ; copie des étapes courantes ; imports MARC exclus de la personnalisation. |
| Indexation 6XX | Options rassemblées sans bouton avancé ni perte de champ. |
| Z39.50 / SRU | Activation répétée et bloc de compatibilité retirés de l’interface. |
| Alerte avant vidage | Texte technique de sécurité retiré du formulaire. |
| Assistant exemplaires | URL modifiables et prises en compte ; textes techniques retirés ; options de stockage conservées. |
| Assistant domaine | Configuration sans choix manuel de moteur ; profil historique inchangé, personnalisation prise en charge automatiquement. |
| Assistant XSLT | Repris à la demande suivante en 0.7.0 : éditeur clarifié, aperçu et export testés, projets existants conservés. |
| Autocomplétion catalogue | Renommée « Autocomplétion Recherche catalogue » ; titres superflus retirés, options conservées. |
| Recherche, modèles exemplaires, mouvements | Introduction générique retirée par le socle. |
| Facettes | Ouverture limitée aux familles actives ; choix manuel conservé lors du recalcul ; texte de principe retiré. |
| Icônes bibliographiques | Sélection de la source et de la destination disponible même sans le script métier sur la page d’administration. |
| Nouveautés | Sélection visuelle des sources et emplacements ; descriptions techniques retirées. |
| MusicBrainz | Texte de présentation technique retiré ; options existantes conservées. |
| Liens externes | Texte d’aperçu retiré ; un bouton sans texte ne reçoit plus le libellé artificiel « Aperçu de l’élément ». |

## Révision des modules catalogue et exemplaires

| Module | Réglages et comportement livrés |
|---|---|
| Organisation des informations de la notice (063) | Aide distincte pour déplacer une ligne complète et pour mettre en forme un élément. Exemples de cibles, alias et filtre de texte ; carte « Page configurée » retirée. |
| Détails des exemplaires (011) | Chemin et structure DOM configurables avec le picker commun ; blocs personnalisés et destinations de déplacement. Les champs restent dans la carte de leur propre exemplaire. Réapplication et désactivation conservent les nœuds, valeurs de champs et événements natifs. |
| Tableau des exemplaires (033) | Pages, tableaux, cellules, noms/codes de site et chemins des données Koha configurables. Statuts locaux reconnus par données, sélecteur ou texte. Renommage des en-têtes et localisations sans remplacer leurs contrôles ni liens. |
| Recherche progressive par cote (065), codes-barres (068) | Titres et explications d’activation superflus retirés ; fonctions et options conservées. |
| Résultats catalogue (129) | Présentation et actions renommées ; « Modifier l’exemplaire », « Statistiques de prêt », « Mouvements de l’exemplaire ». Rapport standard à copier et mode historique conservé. Options de performance conservées en avancé sans le bloc d’explications demandé au retrait. |
| Résumé / 4e de couverture (009) | Picker commun pour la destination, quatre positions ; cible vide = emplacement historique. Une cible absente laisse la source native à sa place. |
| Transfert rapide (028) | Blocs « Fonctionnement » et « Suite du workflow » retirés de la configuration. Le transfert reste explicitement déclenché par l’agent. |
| Correction du statut au prêt (146) | Intitulé confirmé, sans numéro 145. |

**Audit des dépendances Dracénie de 011/033.** Les anciens conteneurs et blocs de
`moredetail.pl`, leurs intitulés français, les regroupements et champs masqués,
les noms d’en-tête, les couleurs, les libellés de disponibilité ainsi que le
rapprochement avec le site de connexion sont conservés comme valeurs initiales.
Les cibles de ces éléments, les destinations des champs, les règles de statut,
les sources de site et les propriétés des lignes DataTables sont maintenant
réglables. Le nom du site vient du Koha connecté ; aucune bibliothèque locale
n’est imposée au traitement. Les données natives de Koha restent nécessaires :
un sélecteur ne peut pas créer une information que la page ne fournit pas.

## Révision des modules circulation, dates et copie

- **Ancienneté des réservations (014)** et **Échéance de prêt des exemplaires
  (004)** rejoignent **Âges et dates relatives (070)**. Un seul moteur rend les
  durées ; les anciens fichiers deviennent des points d’entrée compatibles.
  Les règles préremplies couvrent les trois onglets des réservations, leurs
  trois dates et les deux tableaux d’exemplaires. Les colonnes auparavant
  désactivées le restent. Les échéances utilisent `checkout.due_date`.
- Les anciens documents `waiting-holds-age` et `loan-duration-detail` sont lus
  avant fusion, conservés sans réécriture et archivés dans
  `migrations.dateRuleSources`, avec l’état précédent des dates relatives. Le
  précédent interrupteur commun est reporté sur les fonctions qu’il pilotait,
  avant d’ajouter les fonctions indépendantes 004/014. Le marqueur `dateRuleSourcesUnified` empêche de
  réimporter par-dessus les règles modifiées. Les propriétés locales des anciens
  réglages restent dans `dateLegacyOptions`. Une lecture refusée bloque la
  sauvegarde. Les API historiques renvoient vers le document `relative-dates`.
- Le **contrôle du statut au retour d’un document perdu (051)** conserve la
  synchronisation LOST / NOT_LOAN, nécessaire aux codes de chaque Koha. Elle ne
  modifie que le brouillon et conserve les codes absents de la réponse, les choix
  et métadonnées locales. Les nouvelles règles demandent confirmation. Les longs
  blocs explicatifs et la carte de page fixe sont retirés ; les signaux et zones
  de messages sont ciblables en avancé. L’ancien interrupteur de page est absorbé
  dans l’activation principale. Relecture avant/après modification et recours à
  l’éditeur natif restent en place.
- **Repères de l’historique des prêts (007)** : nouveau nom, pages/tableaux et
  colonnes sélectionnables, index de secours réglables, formats FR/EN et couleurs
  conservés. Les anciennes activations de page sont reprises dans les commandes
  visibles.
- **Historique des prêts et des retours (008)** : nouveau nom ; SQL des transferts
  visible et copiable en mode simple, ID propre à l’installation.
- **Protection double validation (125)** : le bouton protégé se choisit avec le
  picker commun ou un sélecteur saisi ; une cible CSS invalide est refusée.
- **Disponibilité et motifs de renouvellement (114)** : nom et description
  clarifiés ; les motifs portent leur libellé ou code, au lieu de « Élément XX ».
- **Indicateurs d’efficacité (099)** : explications d’activation retirées. Les
  choix utiles de page et de langue restent sous « Pages et langue » ; le calcul
  reste indépendant de la présentation enrichie des résultats.
- **Actions de copie (006)** : confirmation en bas à droite avec la valeur
  réellement copiée, affichée comme texte. Plus de badge accolé au bouton. Les
  copies groupées utilisent la même notification. Durée, textes et couleurs
  restent réglables ; les anciennes préférences de position sont conservées dans
  les données mais ne pilotent plus l’affichage.
- Les introductions génériques et le titre « Chargement dynamique » demandés
  au retrait sont supprimés de l’interface. La date limite de retrait (120) et
  les listes de valeurs prédéfinies (017) gardent leurs options fonctionnelles.

## Compteur de fréquentation : un module pour les deux vues

Le nom et les menus ne mentionnent plus le Médiabus. L’identifiant interne
`attendance-mediabus-mini` et l’API `PMKAttendanceMediabus` restent des alias de
compatibilité ; l’API commune est `PMKAttendance`. Aucun document de configuration,
lieu, compteur ni identifiant historique n’est renommé ou supprimé.

Le flottant 139 et la page 138 partagent configuration, application Firebase et
moteur transactionnel. Les deux vues gardent leur présentation et leurs rapports.
Les incréments, décréments, corrections à heure choisie et modifications de notes
relisent les compteurs dans la transaction. Une note ne remplace plus des
compteurs périmés provenant d’une autre vue. Les champs inconnus et notes non
modifiées sont conservés avec une écriture fusionnée.

Réglages communs : vues flottante/page, ouverture automatique, sites autorisés
(vide = tous), cible du site connecté, catégories, titre, pas de saisie, lieu par
défaut, largeur, semaines proposées par an, code de gestion historique et stockage
Firebase/collections en avancé. Projet historique configuré localement, collections `counts` et
`locations`, catégories Adultes/Enfants et préférences locales de position/lieu
restent les valeurs historiques. Un changement de stockage nécessite de recharger
les vues et ne migre aucune donnée. Les permissions Koha de la page et les règles
Firebase restent les contrôles d’accès existants.

## Rapports SQL fournis

| Fichier | Installation et contrat |
|---|---|
| `sql/008-historique-transferts.sql` | Historique des transferts d’une notice : paramètres `Biblionumber` et `Après ID`, tri par `Transfer_ID`, lots de 500. Créer le rapport dans Koha puis renseigner son ID dans 008. La valeur 0 conserve la fonction désactivée. |
| `sql/129-statistiques-prets-exemplaire.sql` | Statistiques d’un exemplaire : paramètre `Numéro exemplaire`. Créer le rapport, renseigner son ID dans 129 et choisir le mode standard. |

Les deux requêtes sont aussi enregistrées dans le service commun `sql-reports`.
Le rapport Dracénie 4537 et ses treize paramètres restent le mode initial de 129.
Le SQL standard distingue le compteur historique Koha et les prêts encore
conservés en base, qui peuvent différer après anonymisation ou purge. Le rapport
utilise des agrégations séparées pour ne pas multiplier les prêts par jointure.
Les ID de rapport sont propres à chaque Koha ; aucun ID externe n’est inventé.

## Validation et mise en place

Les 71 groupes de tests ont réussi dans Chromium, avec toutes les requêtes
interceptées. Ils incluent l’ouverture des 39 formulaires disponibles dans le
socle avec les modules de la demande chargés, sans écriture automatique. La suite
reproductible est dans `tests/`. L’audit complémentaire ouvre les 43 formulaires
visés par toutes les demandes et vérifie aussi les sélections visuelles réelles,
les reprises de brouillons et les ID de rapport. Le bilan demande par demande est
dans `BILAN-DEMANDES-PMK.md`.

L’audit statique reproductible (`node tests/audit.cjs`) vérifie la syntaxe des
141 scripts JavaScript et repère 95 déclarations pour 84 identifiants de modules.
Il confirme une seule implémentation du socle PMK. Les déclarations de secours et
métier identifiées sont listées par l’audit ; leur coexistence ne crée pas un
second document de configuration. Cet audit statique et les 71 scénarios ciblés
ne constituent pas une recette fonctionnelle exhaustive de tous les scripts.
Les quatre fichiers HTML fournis
sont conservés dans `tests/fixtures/home-menus/` ; les autres fixtures reprennent
les extraits inclus dans le message.

Les résultats de cette exécution et la liste statique des déclarations sont
conservés dans `tests/validation/`.

Le socle et les fichiers modifiés doivent être remplacés ensemble, notamment
004/014/070 pour les dates, 138-page-attendance-counter/139 pour la fréquentation
et 134/147 pour les menus. Actualiser le cache des scripts après remplacement. Les
comptes, droits, réponses API et règles Firestore de production n’ont pas été
testés ici : ces points doivent être vérifiés sur l’installation Koha avant une
mise en production. Aucun déploiement n’a été effectué pendant ces corrections.

## Ce qui reste à vérifier sur le Koha réel

Les écarts identifiés dans le code ont été traités. Les points suivants nécessitent
l’installation et les configurations réelles, auxquelles ces tests n’accèdent pas :

- Relire/exporter les configurations enregistrées avant remplacement des scripts,
  puis vérifier leur reprise et l’enregistrement de la configuration âge/dates.
- Vérifier les accès avec les comptes et droits réels, les réponses API et les
  règles Firestore, notamment les favoris et les configurations fusionnées.
- Vérifier les catégories d’adhérents, les grilles de catalogage et la création de
  réserves de cours ; l’URL `add_course.pl` vient de Koha standard, sans extrait
  fourni pour cette page.
- Vérifier le rendu avec le thème, les personnalisations et le chargement réel des
  scripts ; les cas locaux n’incluent pas toutes les extensions de votre Koha.

Aucune donnée de production n’a été lue ni modifiée et aucun déploiement n’a été
réalisé. Les copies conservées et les tests de migration constituent une protection
vérifiée localement ; ils ne permettent pas d’affirmer que les configurations de
production ont déjà été validées.

## Compléments de l’audit de clôture

Le bandeau de certains modules est compacté et leur compteur de pages retiré.
L’ancien état de page de Z39.50 est absorbé dans l’interrupteur principal. Le bloc
Fonctionnement des nouveautés est supprimé. Le titre d’un motif de renouvellement
reste compréhensible même lorsque son libellé est effacé.

Tous les modules déclarant un picker peuvent reprendre une sélection après
navigation. Le sélecteur de colonnes d’historique traite les en-têtes, leurs
éléments imbriqués et les cellules ; la protection de réservation sélectionne le
bouton entier lorsque l’agent clique sur son icône. La sélection reste dans le
brouillon, sans écriture automatique.

Le rapport 5254 est bien présent dans `130-mouvements-documents.js` et son contrat
est compatible avec 008. Les réglages de 008 permettent maintenant de reprendre
explicitement l’ID configuré dans Mouvements, sans changer sa valeur initiale 0.
130 charge l’ID sauvegardé avant les requêtes, respecte 0 et prend en compte les
modifications en direct ; les valeurs personnalisées sont conservées.


## Navigation, saisie et pages internes — 0.6.2

Le module d’accueil s’appelle « Menus de l’accueil ». Les descriptions de
Placement d’éléments, Règles de saisie et Valeurs par défaut selon la catégorie
d’adhérent décrivent les fonctions utiles à l’agent. Leurs règles par défaut
ne changent pas. Le nettoyage des textes conserve désormais le sens du mot
« historique » : « Historique récent » et les historiques de prêts ne deviennent
plus des « par défaut ».

L’historique récent conserve les trois listes du navigateur : adhérents,
notices et recherches, avec un maximum de 50 entrées chacune. Il ne s’agit pas
d’un journal partagé sur le serveur. Les clés locales et la logique de suivi
existantes sont conservées.

QR mobile utilisait un type de champ de sélection non pris en charge et les
mauvaises propriétés de contexte. Il utilise maintenant le picker commun et
reprend son brouillon après navigation, sans écrire avant « Enregistrer ».
La position avant/après/début/fin est directement accessible. Les quatre pages
et leurs emplacements automatiques sont conservés. Les anciennes empreintes de
cible restent lisibles ; une nouvelle sélection conserve les propriétés
personnelles de la cible. Une cible explicite absente ne déplace pas le bouton
vers un autre endroit.

Le compteur de listes accepte des pages Koha supplémentaires. Chaque page peut
contenir plusieurs zones choisies visuellement ; seul un textarea peut devenir
la source du comptage. Un second picker permet de placer le compteur près d’un
autre élément. Sans ce second choix, il reste sous le champ. Les compteurs sont
mis à jour à la saisie sans changer une seule valeur. La section « Comportement »
a été retirée. Les deux usages actifs et les deux usages désactivés restent dans
les valeurs par défaut ; une liste de pages explicitement enregistrée est
respectée, y compris lorsqu’elle omet une page par défaut.

La vérification avant renouvellement lecteur utilise des signaux structurels
Koha et n’exige aucun site ou code Dracénie. L’adresse, le téléphone et l’e-mail
restent actifs par défaut. On peut ajouter une information, choisir sa valeur,
changer les pages et adapter les cibles natives au thème Koha : expiration,
expiration prochaine, informations lecteur, action de renouvellement et zone
d’affichage. Les actions de clic et de soumission du formulaire restent natives.
La désactivation et la fin des vérifications restaurent les attributs d’origine,
y compris un tabindex ou un aria-disabled déjà présent.

Les icônes préconfigurées des menus latéraux restent actives par défaut et leur
bibliothèque complète est modifiable en avancé. Les personnalisations utilisent
le picker commun, y compris lorsque l’on clique sur l’icône du lien. Elles sont
appliquées après la bibliothèque ; l’ordre de priorité est expliqué dans le
formulaire. Le remplacement ne crée pas une deuxième icône. Les propriétés
personnelles des règles et de la configuration sont conservées.

Le gestionnaire des pages internes conserve son manifeste de 20 outils, leurs
URL, leurs données et leurs paramètres. Son catalogue dispose d’une recherche.
La modification de grille par lot, les bibliographies, les retards et l’assistant
XSLT enregistrent désormais une entrée dans le même registre que les autres
pages ; le gestionnaire se charge du routage et du chargement à la demande.
Les entrées autonomes restent compatibles lorsque le gestionnaire est absent.
La page des bibliographies reste dans le conteneur commun et conserve son
brouillon en mémoire lors d’un remontage de l’interface.

L’activation du gestionnaire est effectivement lue et suivie. Sa désactivation
rétablit le contenu natif masqué et ses styles initiaux. Un chargement de script
en échec peut être relancé. Le catalogue et les pages qui exigeaient les droits
superlibrarian les conservent ; les trois outils autonomes auparavant accessibles
au personnel gardent cette politique. Ce contrôle d’affichage ne remplace pas les
droits Koha sur les API. L’éditeur XSLT a ensuite été repris à votre demande dans la version 0.7.0.

Le « Journal des modifications Koha » possède une seule activation. La migration
combine les anciens choix module/page une seule fois, conserve leur trace et
n’écrit rien automatiquement. Un ancien état désactivé est respecté, puis
l’interrupteur commun permet de réactiver normalement le module.


## Éditeur XSLT — 0.7.0

La demande de reprise remplace la mise en attente précédente. Le module s’appelle
« Éditeur XSLT » et propose une navigation unique en trois étapes : ouvrir,
modifier et prévisualiser, vérifier et exporter. Les intitulés des projets,
des blocs et de leurs réglages sont explicités. Les déplacements Monter/Descendre
complètent le glisser-déposer, sans déplacer un bloc au-delà d’une déclaration
XSLT adjacente. Les dialogues sont utilisables au clavier.

L’audit a révélé une erreur fonctionnelle : modifier une zone ou une sous-zone
détectée remplaçait le XPath entier par un chemin relatif court. Dans une feuille
qui utilisait un préfixe de chemin ou une fonction, le rendu pouvait disparaître.
Le nouvel ajustement conserve l’expression importée et ne change que le prédicat
MARC concerné. Les champs ajoutés retrouvent également la notice courante quand
le modèle travaille depuis la racine XML ou depuis un sous-élément MARC. L’aperçu réel, sa sélection au clic, la comparaison avant/après et
les vérifications sont testés avec une notice MARCXML simulée.

Les lectures MARC partagent leur résultat, y compris une requête déjà en cours.
Les réponses lentes sont bornées ; les erreurs restent réessayables. L’option
existante de mise à jour automatique est respectée et peut être désactivée ; le
bouton Actualiser permet alors de calculer l’aperçu à la demande. L’aperçu est
une zone d’édition : ses liens et formulaires ne quittent pas la page. Les
scripts sont exclus du seul rendu d’aperçu, tandis que le fichier exporté
conserve le code XSLT original et ses éléments non modifiés.

Le téléchargement produit le XSLT complet. Une sauvegarde JSON contient tout le
projet, ses sources, dépendances, options et propriétés personnelles. Sa
restauration crée un nouveau projet avec un nouvel identifiant ; les projets
existants restent présents. Les clés locales existantes sont inchangées et le
projet le plus récemment modifié est repris à l’ouverture. Si le navigateur ne
peut pas enregistrer, le travail reste ouvert, un message l’indique et la
sauvegarde complète reste téléchargeable.

Aucune préférence système ni aucun fichier XSLT Koha n’est modifié par l’éditeur.
Le navigateur vérifie la feuille et propose un aperçu ; les extensions,
paramètres et dépendances propres au serveur restent à vérifier dans Koha.

## Lenteurs de Bibliographies & publications — 0.7.0

Plusieurs causes ont été identifiées dans les sources : des attentes de six
secondes répétées lorsque le gestionnaire de listes n’était pas disponible,
plusieurs lectures identiques, l’attente des couvertures avant restitution des
notices, un traitement séquentiel des réserves de cours et un état de chargement
qui recouvrait presque toute l’interface.

Le panneau est maintenant rendu à partir des données déjà disponibles. Une source
transmise par la liste, le panier ou la réserve de cours n’attend pas le service
des listes PMK pour apparaître. La disponibilité de ce service et les choix de
listes sont partagés ; la mise à jour des choix ne reconstruit pas les champs en
cours de saisie. Les lectures JSON, MARC et exemplaires sont réutilisées pendant
la page. Une réponse vide valide d’exemplaires ne déclenche plus une lecture
publique redondante.

Toutes les sources présentent d’abord leurs données transmises, puis les
compléments arrivent progressivement. Les couvertures sont traitées à part et ne
retardent plus les textes. Les réserves de cours utilisent un petit pool borné.
Les priorités des couvertures et les sources Koha restent identiques. Les lectures
sont interrompues après 15 secondes au lieu d’attendre indéfiniment, y compris
dans le moteur commun des couvertures. Les données déjà présentes restent
utilisables après un échec. Une révision empêche les anciennes réponses de
remplacer une sélection plus récente.

L’animation de chargement reste dans les couleurs et les styles existants, sous
forme d’un indicateur discret qui ne bloque pas les panneaux. Elle indique
l’avancement des notices puis l’attente des couvertures, avec une alternative
sans mouvement selon les préférences du navigateur. Le bouton « Actualiser les
données » relance les lectures sans remettre à zéro le titre, le modèle, la mise
en page ou les choix de contenu. Les modèles prédéfinis et personnels, les blocs,
les panneaux, le rendu A4 et le principe d’impression n’ont pas été remaniés.

Les mesures des tests sont des constats sur des réponses simulées : les données
transmises sont affichées sans attendre les requêtes retenues, les informations
arrivent avant une couverture volontairement retardée, et trois changements de
présentation ne relisent pas le même JSON, MARCXML ou jeu d’exemplaires. Aucun gain
en secondes n’est affirmé pour votre serveur Koha, auquel ces tests n’accèdent pas.

## Pages : fonctionnement et accès — 0.7.1

Le rapport `AUDIT-PAGES-PMK.md` détaille les vingt pages, leurs routes, leurs droits
et les dépendances Koha, SQL, Firebase ou locales. PMK présente désormais cette
matrice et un diagnostic d’apprentissage dans Pages & outils internes.

Le gestionnaire 138 version 1.2.0 corrige l’attente des scripts intégrés, les
réouvertures, la fermeture des ressources et les erreurs réessayables. Les outils
facultatifs PDF/EmailJS ne bloquent plus l’ouverture. Les droits historiques,
projets Firebase, stockages, valeurs par défaut et réglages personnels sont conservés.

Ce constat d’audit a été remplacé par la demande de suppression de l’apprentissage :
le laboratoire a été retiré et les anciens points d’entrée des pages modifiables
sont devenus inactifs. Les décisions locales utiles et les données historiques
restent conservées. La page Autorités reste protégée, sans modification de sa source.


## Pages et configurations — 0.8.0

Dix-neuf pages après suppression du laboratoire ; dix-huit configurations
adaptables, regroupées dans le module Pages & outils internes. Champs utiles
et réglages avancés, import/export de brouillons, conservation des anciennes
sources de réglages et de leurs clés inconnues. La page Autorités reste intacte.
Les descriptions page par page, moteurs et limites figurent dans
AUDIT-PAGES-PMK.md ; la liste des champs est dans REFERENCE-CONFIGURATION-PAGES-PMK.md.
Le premier socle plugin ajoute un stockage Koha facultatif au cœur ; l’usage
pré-plugin conserve son stockage Firestore. Aucun transfert de données de
production n’est effectué implicitement.


## Plugin 0.1.1 — recette locale

Correction des initialisations tardives des anciens scripts et accès central
aux réglages de contact obligatoire, transferts par lot et édition rapide.
Chargement regroupé des scripts et des réglages, sans réutiliser une lecture
initiale pour une sauvegarde forcée. Chaque sauvegarde conserve la révision de
sa propre lecture ; une lecture intercalée ne permet pas d’écraser une modification
concurrente. Favoris personnels exclus de la lecture groupée.

L’édition rapide respecte les catégories configurées, prend en compte le statut
natif 0 et propose des codes autorisés, exclus et soumis à confirmation réglables,
avec les valeurs Dracénie conservées par défaut. Le compteur flottant ne recouvre
plus les pages internes. Le journal utilise sa collection personnalisée pour
ajouter, modifier, supprimer et restaurer. Les explications de restauration
suivent les réglages effectifs au lieu d’afficher des noms fixes.

Six rapports SQL ont leurs commentaires placés après SELECT pour le validateur
Koha ; le SQL des statistiques utilise renewals_count sur Koha 25.11. Les huit
rapports ont été exécutés par le moteur natif. Les réponses en erreur des sources
de couvertures sont abandonnées sans télécharger une grande page de diagnostic.
Les notices restent disponibles pendant la recherche de couvertures.

Le bilan des essais réels, des contrats simulés et des limites figure dans
RECETTE-PLUGIN-KOHA.md. Aucune recette de production n’est présentée comme faite.
