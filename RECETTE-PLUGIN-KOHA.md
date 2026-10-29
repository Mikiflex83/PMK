# Recette locale du plugin PimpMyKoha 0.4.0

Vérifications effectuées du 18 au 28 octobre 2026 sur une vraie installation
Koha 25.11 UNIMARC / MariaDB 10.11, dédiée à la recette, avec Chromium et le plugin
installé. Sources Koha : commit `5ac93102a123496ae0561cd217d4d7e3a8518e0a`.
Aucune donnée Dracénie ni aucun service de production n’a été modifié.

## Parcours réellement exécutés

| Périmètre | Vérification | Preuve dans tests/validation |
|---|---|---|
| Installation | Téléversement du KPZ exact dans le gestionnaire natif Koha, installation et rechargement effectifs | koha-installation.json |
| Chargement et permissions | Tous les scripts déclarés dans le manifeste ; stockage natif ; accents ; conflits 409 ; refus d’écriture du personnel ; favoris isolés par session | koha-plugin.json |
| Configurations | 86 formulaires ouverts dans PMK, sans sauvegarde automatique | koha-configuration.json |
| Écrans natifs | 30 écrans Koha parcourus, sans erreur JavaScript ni HTTP inattendue | koha-routes.json |
| Pages internes | 19 ouvertures effectives, API et stockage Koha natifs ; aucune mutation métier Koha à l’ouverture | koha-internal-pages.json |
| Exemplaires et copie | Cote modifiée puis restaurée ; autres champs conservés ; catégorie NOT_LOAN configurée ; statut 1 puis 0 ; blocage en prêt ; presse-papiers et toast avec valeur copiée | koha-business.json |
| Circulation | Prêt natif, renouvellement réel, retour, transfert prérempli sans soumission automatique | koha-circulation.json |
| Statut au prêt | Vrai prêt forcé Koha, prêt persisté puis statut configuré remis à 0 et relu ; préférence de test restaurée | koha-checkout-status.json |
| Retour perdu | Koha traite LOST ; PMK attend le choix de l’agent ; conservation du statut puis remise en circulation vérifiées | koha-lost-checkin.json |
| Restauration | Suppression d’un exemplaire fictif, recherche SQL, vraie restauration inLibro et confirmation de son identité par l’API | koha-restoration.json |
| Analyses | Réservations, prêts, transfert, périodiques, 60 lecteurs, 6 210 exemplaires et 4 857 notices lus et analysés | koha-maintenance.json |
| Stockages natifs | Neuf espaces ; Unicode ; dates ; conflits ; transactions et lots atomiques ; réservation concurrente ; collections de plus de 1 000 documents ; import métier et configurations ; permissions réelles | koha-native-data.json |
| Moteurs métier | Listes et modèles de bibliographies ; demande puis validation d’un rendez-vous ; trois widgets natifs ; partage interne | koha-native-engines.json |
| Absence de Firebase | 152 scripts contrôlés ; aucun chargement de SDK ou appel Firebase ; émulateurs arrêtés et accès externes bloqués pendant les tests | firebase-free.json |
| Journal | Création, modification, suppression logique, restauration et quatre traces d’historique dans des collections personnalisées | koha-shared-tools.json |
| Fréquentation | Ajout depuis la page puis depuis le compteur flottant ; un même document et ses horodatages ; relecture dans la page | koha-shared-tools.json |
| XSLT | Import d’un XSLT, transformation du MARC réellement fourni par Koha, aperçu avec accents et sauvegarde du projet | koha-publications.json |
| Bibliographie | Deux notices d’une vraie liste Koha affichées, titre modifiable pendant le travail, chargement borné et repli sans Electre | koha-publications.json |
| Rapports SQL | Treize rapports validés, paramètres préparés et requêtes exécutées par le moteur natif Koha ; treize EXPLAIN MariaDB | koha-reports.json ; koha-sql.json |
| Transition globale | Export historique en lecture seule ; isolation des listes par compte ; préparation sans démarrer les modules ; empreinte et complétude ; import contrôlé et relu ; refus des conflits ; IndexedDB et fichiers binaires | export-transition.json ; koha-migration.json |
| Universalisation ciblée | Index locaux désactivables ou remappés ; zone MARC différente ; paramètres Autorités et SQL copiable ; arrêt global réel des anciens scripts | koha-universality.json |
| Mise à jour | Empreintes identiques des quatre tables de configuration, données et historiques avant/après réinstallation du plugin | koha-upgrade-preservation.json |

Le nombre d’exemplaires chargés est celui observé pendant la dernière recette,
après la restauration de l’exemplaire fictif.
Les données de travail portent le préfixe PMKTEST. Les essais ne constituent pas
un audit exhaustif de toutes les combinaisons de réglages ou opérations de masse.

## Conservation vérifiée

La mise à jour ne réinitialise pas les tables de configuration. Les tests couvrent
les champs personnels et inconnus, le refus d’une révision obsolète et le cas où
une autre lecture intervient avant une écriture. Le paquet contient le code et
les preuves ; les réglages réels de votre installation ne sont pas dans ce ZIP.
Les exporter avant une bascule reste nécessaire. Le plugin ne migre pas
implicitement vos données métier Firebase vers Koha.

La page Autorités conserve ses moteurs de contrôle, fusion, audit et enrichissement.
L’ancien chargement de la mémoire Firebase, son bouton et l’envoi des
retours partagés sont retirés. Une petite enveloppe expose désormais les trois
rapports et les codes des types de personnes ; les 315 fonctions nommées de la
page sont comparées à la version 0.2.0 et restent identiques. Les décisions et règles locales restent conservées.
Les anciens réglages du laboratoire ne sont pas effacés. Les boutons inactifs de
partage facultatif des pages Exemplaires, Prêts, Lecteurs et Périodiques sont
retirés ; la page Lecteurs n’annonce plus d’envoi à Firebase.

La reprise des anciens exports et ses règles de fusion sont décrites dans
MIGRATION-STOCKAGES-NATIFS.md et TRANSITION-NON-PLUGIN-VERS-PLUGIN.md. Le nouvel
exportateur ne s’exécute que sur votre ancienne installation, à votre initiative.
Aucune donnée métier de production n’a été
récupérée implicitement : la reprise se fait depuis les fichiers de sauvegarde.

## Contrôles complémentaires avec données simulées

79 groupes de régression, 16 groupes sur l’universalisation des pages, 19
ouvertures/réouvertures et règles d’accès simulées, six contrats SQL sur SQLite
avec adaptations MariaDB explicites et cinq contrats de l’adaptateur natif.
Ces tests complètent les parcours Koha ci-dessus ; ils ne sont pas comptés comme
une recette métier sur un serveur réel. L’audit de syntaxe porte sur 155 fichiers et le contrôle d’indépendance Firebase sur les 152 scripts d’exécution concernés.

Plusieurs fichiers peuvent compléter une déclaration de module sous le même
identifiant. Le registre réel ne présente qu’une configuration par identifiant :
les 86 formulaires ont été vérifiés dans ce registre. Les déclarations statiques
complémentaires signalées dans declarations.json ne sont pas 86 configurations
dupliquées dans le stockage.

## Services non validés sur leur installation réelle

Le journal, les compteurs et les autres moteurs auparavant liés à Firebase
utilisent maintenant la vraie base Koha. La recette a été effectuée avec les
émulateurs arrêtés. Aucun SDK ou service Firebase n’est nécessaire au paquet.
Les anciennes données de votre établissement doivent être reprises à partir
d’exports ; les données de test ne les remplacent pas.

L’accès effectif à Electre, au compte France Publications, l’envoi EmailJS, les
catalogues et services d’adresses externes ainsi que le scanner, la caméra et
l’imprimante physiques n’ont pas été testés en conditions réelles. Le module
France Publications a été désactivé temporairement dans le parcours des écrans,
car ses rapports et son compte fournisseur ne sont pas ceux de la base fictive.
Les routes Electre absentes sont traitées comme une source de couverture
facultative indisponible ; le repli bibliographique a été vérifié.

Ces limites ne doivent pas être présentées comme des fonctionnalités validées en
production. Le paquet 0.4.0 est installable et destiné à une recette préalable sur
chaque établissement avant sa mise en production.
Les commandes de reproduction figurent dans PLUGIN-KOHA-PMK.md.
