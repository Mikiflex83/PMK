# Catalogue de PimpMyKoha

Ce catalogue décrit ce que font les modules et les pages. Il est écrit pour les équipes qui utilisent Koha.

PimpMyKoha s’ouvre depuis le menu de l’utilisateur, en haut à droite. Sur cette page :

- **Ancienne installation** reprend le fichier de sauvegarde si PimpMyKoha était déjà utilisé sans ce plugin. Sans cet import, le plugin est déjà lancé et chaque module reste éteint.
- **Configuration générale** règle l’ensemble du plugin. L’interrupteur mémorise l’état de chaque module : désactiver n’éteint que les modules actifs, rétablir ne rallume pas ceux qui étaient déjà éteints, et tout activer ignore l’état précédent. Les petits boutons de réglage dans les pages Koha restent affichés tant qu’ils ne font pas double emploi et ne gênent pas la page.
- chaque module se retrouve dans le menu de gauche, par son nom.

Une installation neuve laisse chaque module éteint. Allumer un module n’allume pas les autres.

## Modules

### Accueil / interface

- **Widgets et blocs d’accueil.** Active ou éteint les blocs placés sur l’accueil. Chaque bloc garde ses propres réglages, accessibles à un administrateur Koha directement sur le bloc.

### Accueil / widgets

- **Liens utiles — widget.** Configure directement le contenu du widget Liens utiles affiché sur l’accueil Koha.

### Acquisitions / suggestions

- **Suggestions — lecteur obligatoire.** Empêche les suggestions sans lecteur et corrige le préremplissage lors d'une création depuis sa fiche.

### Adhérents

- **Automatismes de saisie adhérent.** Automatise certaines opérations sur la fiche d’inscription/modification d’un adhérent.

- **Contrôle des doublons adhérents.** Contrôle les doublons pendant l’inscription et vérifie automatiquement les fiches déjà existantes sur toutes les pages Koha affichant un encart adhérent.

- **Coordonnées obligatoires.** Contrôle les coordonnées sur la fiche d’inscription. Chaque champ peut être ignoré, exigé seul, ou faire partie d’un groupe dont au moins une valeur doit être remplie. Un jeu de champs courant est proposé au départ.

- **Vérification avant renouvellement lecteur.** Avant de renouveler une adhésion expirée ou proche de son échéance, demande à l’agent de confirmer les coordonnées du lecteur. Choisissez les informations à vérifier ; les actions natives de Koha restent utilisées.

### Adhérents / impression

- **Impression des retards / garant.** Prépare l’impression des retards pour les lecteurs avec garant. Le modèle historique reste disponible, et un constructeur complet permet de composer un modèle personnalisé sans code.

### Adhérents / informations

- **Affichage de l'âge du lecteur.** Personnalise l'âge affiché par Koha depuis la date de naissance, avec choix entre années, années + mois ou années + mois + jours. Le module conserve le span natif Koha afin de rester compatible avec le signe astrologique. Ce réglage n’a pas sa propre entrée dans le menu.

- **Signe astrologique du lecteur.** Affiche sur la fiche lecteur le signe astrologique occidental calculé depuis la date de naissance, sans modifier l'âge natif de Koha.

### Adhérents / saisie

- **Autocomplétion des adresses.** Propose des adresses pendant la saisie d’un adhérent et remplit automatiquement l’adresse, le code postal et la ville. Une ville de référence peut favoriser les résultats proches sans exclure les autres adresses françaises.

### Aide et formation

- **Guides & formation.** Pilote les guides interactifs Koha, les parcours de formation et le mode accompagnement. Le guide de l’écran et les parcours s’ouvrent depuis Outils, en haut de l’écran.

### Catalogage / indexation

- **Aide à l’indexation 6XX.** Guide la saisie des valeurs de notices et d’autorités sans empêcher la création, afin de limiter les erreurs de frappe et d’harmoniser l’indexation.

### Catalogage / interface

- **Confort de recherche Z39.50 / SRU.** Adapte l'espace de travail Z39.50/SRU à la fenêtre et peut normaliser les termes envoyés aux serveurs externes. Le module ne modifie aucune notice ni donnée Koha.

### Catalogue / affichage

- **Indicateurs de nouveauté.** Affiche un badge de nouveauté calculé à partir de la date d’acquisition de l’exemplaire le plus récent, sur les résultats de recherche et la notice détaillée.

### Catalogue / catalogage

- **Saisie de l'arborescence au catalogage.** Panneau sur la page de catalogage. Il propose les valeurs de l'arborescence de l'établissement, niveau par niveau, puis les champs d'indexation associés, et conserve les combinaisons mémorisées.

### Catalogue / circulation

- **Repérage des codes-barres.** Repère visuellement le dernier code-barres recherché et les codes-barres mémorisés. Les formats proposés peuvent être activés ou désactivés, et d'autres formats peuvent être ajoutés.

### Catalogue / couvertures

- **Jaquettes musicales.** Cherche la pochette d’un disque à partir de sa notice, sans changer la notice Koha.

### Catalogue / détail de notice

- **Résumé enrichi / 4ème de couverture.** Présente dans un bloc repliable le résumé Electre déjà injecté dans la page détail. Le module ne contacte pas Electre lui-même.

### Catalogue / exemplaires

- **Alerte avant vidage d'un champ.** Demande une confirmation avant d'activer dans Koha la suppression d'un sous-champ exemplaire. Le module n'enregistre rien lui-même et laisse Koha appliquer l'action native après confirmation.

- **Assistant de saisie des exemplaires.** Aide à préparer les champs d’un exemplaire, à mémoriser des valeurs et à reprendre celles qui reviennent le plus souvent. Rien n’est enregistré tant que Koha ne le fait pas.

- **Boutons modèles exemplaires.** Ajoute, sur la saisie et la modification d’exemplaires, des boutons qui remplissent un ensemble de champs. L’enregistrement reste celui de Koha. Deux modèles de départ sont proposés.

- **Dernier emprunteur anonymisé.** Retrouve le dernier emprunteur que Koha a choisi de conserver, même lorsque l’historique des prêts a été anonymisé. Il ne reconstitue pas les données supprimées. Un rapport privé de l’établissement et les droits Koha adaptés sont nécessaires.

- **Édition rapide des exemplaires.** Modifie certains champs d’exemplaire depuis la notice ou les résultats de recherche. Les champs sensibles, comme le statut, le type de document ou le site propriétaire, restent bloqués pendant un prêt ou un retour.

- **Mouvements des documents.** Mouvements, transferts et lieux de prêt, chargés à la demande.

- **Présentation des détails des exemplaires.** Réorganise la page de détail d’un exemplaire. On choisit ce qui s’affiche, se masque, se renomme ou se déplace, sans changer les données Koha.

- **Présentation du tableau des exemplaires.** Gère la présentation des tableaux d'exemplaires : libellés de colonnes, localisation courante, couleurs et styles de statuts, repérage du site de connexion et présentation des réserves de cours.

- **Transfert rapide d'un exemplaire.** Ajoute sur la page détail d'une notice un bouton Transférer dans la ligne d'un exemplaire disponible. Le code-barres est ensuite transmis à l'écran Koha des transferts et prérempli sans lancer automatiquement l'opération.

### Catalogue / liens externes

- **Liens externes.** Regroupe les liens proposés depuis une notice, et le bloc « Rechercher ailleurs ». Les deux restent à des emplacements différents.

### Catalogue / présentation

- **Icônes et badges bibliographiques.** Affiche une icône lorsque le texte configuré est trouvé dans un bloc bibliographique choisi. Le bloc à analyser et la destination des icônes peuvent être sélectionnés directement sur la page Koha. Un ensemble de genres prédéfinis est préchargé.

- **Organisation des informations de la notice.** Regroupe les informations de la notice et permet de mettre en forme les éléments de sa page. Des présentations courantes sont déjà proposées.

### Catalogue / recherche

- **Autocomplétion Recherche catalogue.** Suggestions rapides issues du catalogue Koha avec classement local, disponibilité, cote, couverture et recherche par code-barres exemplaire. La recherche classique Koha reste la référence exhaustive.

- **Barre de recherche catalogue.** Pilote la barre de recherche catalogue : reconnaissance des codes-barres, nettoyage automatique sécurisé et bouton d'effacement manuel intégré. La dernière recherche Koha reste conservée pour les autres modules.

- **Facettes de recherche.** Transforme les facettes de recherche en tiroirs compacts et permet de préparer plusieurs filtres avant de les appliquer en une seule fois.

- **Recherche avancée.** Ouvre la recherche avancée depuis le bouton Outils, en haut de l’écran. Le menu de navigation peut ajouter un raccourci, mais il n’est pas nécessaire.

- **Recherche progressive par cote.** Ajoute, près des cotes, une recherche en plusieurs niveaux. Deux emplacements sont proposés au départ. D’autres peuvent être choisis directement sur la page.

### Catalogue / résultats

- **Résultats catalogue — présentation et exemplaires.** Améliore et organise l’affichage des résultats du catalogue : présentation des notices, exemplaires, disponibilités, actions, tri et chargement des données, tout en conservant le rendu configuré par défaut.

### Catalogue / XSLT

- **Éditeur XSLT.** Ouvrez une feuille XSLT, organisez ses blocs et vérifiez le résultat sur une notice Koha. Téléchargez ensuite le fichier modifié et une sauvegarde de votre projet.

### Circulation

- **Correction du statut au prêt.** Lors d’un prêt forcé, permet de rendre empruntable un exemplaire pour les seuls motifs autorisés. Le prêt reste géré par Koha.

### Circulation / assistance

- **Assistance réseau.** Demandes d’assistance entre les sites choisis. Les alertes restent dans Koha et se mettent à jour sans service externe. Un site non configuré ne voit rien.

### Circulation / historique

- **Repères de l’historique des prêts.** Ajoute des indicateurs de durée, de retard et de cohérence dans les historiques de prêt d’un lecteur et d’une notice.

### Circulation / historiques

- **Historique des prêts et des retours.** Ajoute une timeline des prêts et de la vie des exemplaires sur les historiques notice et lecteur, sans remplacer les tableaux Koha.

### Circulation / réservations

- **Ancienneté des réservations.** Affiche depuis combien de jours une réservation est en attente de retrait, sans modifier les règles d'expiration de Koha. Ce réglage n’a pas sa propre entrée dans le menu.

- **Date limite de retrait des réservations.** Contrôle uniforme du calendrier pour les dates officielles et estimées. Calcule les estimations en jours ouverts, sans modifier les réservations Koha.

- **Protection double validation — réservations.** Empêche un double clic ou une double soumission lors de la validation d’une réservation.

### Circulation / retours

- **Contrôle du statut au retour d’un document perdu.** Après le retour d’un document précédemment perdu, contrôle son statut « non prêtable » final et permet de le conserver, de demander à l’agent ou de remettre l’exemplaire en circulation.

### Circulation & historique

- **Disponibilité et motifs de renouvellement.** Améliore l’affichage des renouvellements sans remplacer les contrôles de Koha, et présente l’historique des renouvellements et des retours.

### Circulation et accueil

- **Compteur de fréquentation.** Un compteur commun aux vues flottante et pleine page : mêmes lieux, compteurs, réglages et historique. Les statistiques et exports restent disponibles dans la page dédiée.

### Collections / évaluation

- **Indicateurs d’efficacité.** Calcule un score de rotation pour chaque exemplaire et une moyenne pour la notice, sur la notice détaillée et dans les résultats de recherche.

### Interface

- **Compléments d’interface.** Regroupe plusieurs ajouts d’interface, chacun réglable dans sa section : impression de la date de naissance et du genre, estimation de la prochaine navette, recherches par prix littéraire, déplacement du bouton Signaler un problème, information de site sur la page de transfert, suffixe des titres d’onglets, arborescence repliable, message exceptionnel sur les réservations, lecture de code-barres par caméra, et masquage du bouton Nouvelle suggestion. Les changements prennent effet au prochain chargement. Koha conserve ses propres confirmations et ses droits.

### Interface / aide contextuelle

- **Info-bulles contextuelles.** Affiche des aides élégantes au survol ou au focus de n’importe quel élément Koha. Plusieurs règles prêtes à l’emploi sont fournies par défaut et peuvent être complétées librement.

### Interface / ambiance

- **Mascotte — Agents.** Affiche aléatoirement une mascotte agent dans la barre de recherche Koha. Les 25 images, les 25 noms et la hauteur historique de 45 px sont conservés par défaut.

- **Mascotte — Grenouilles.** Affiche une grenouille au hasard dans Koha et peut jouer un son au clic. Les images et les sons d’origine sont proposés au départ.

### Interface / mise en page

- **Placement d'éléments.** Déplace visuellement des éléments Koha et centralise les placements historiques de couvertures. Les préréglages 856/Electre évitent les doublons et utilisent le 856 uniquement comme secours lorsqu'aucune autre couverture valide n'est disponible.

### Interface / navigation

- **Liens dynamiques.** Rend des éléments de Koha cliquables et construit leur destination à partir d'une URL dynamique utilisant la valeur détectée sur la page.

- **Menus de l’accueil.** Ajoute un sous-menu sur chaque icône de l’accueil Koha, à partir des liens enregistrés ici. Chaque agent peut seulement marquer ses favoris.

- **Navigation personnalisée.** Ajoute des éléments dans la navigation Koha ou remplace uniquement l'URL cible d'un élément existant. Les emplacements, destinations et apparences peuvent être choisis directement sur les pages Koha. Chaque règle peut être limitée à certaines pages ou appliquée à toutes les pages.

- **QR mobile de la page.** Ajoute un bouton discret qui ouvre un code QR de la page en cours, pour l’ouvrir sur un téléphone. Koha produit ce code lui-même.

### Interface / outils

- **Actions de copie.** Regroupe les copies utiles dans Koha : ISBN, EAN, titre, plusieurs cellules d’un tableau, ou le code-barres d’un exemplaire sur la notice.

### Interface / présentation

- **Âges et dates relatives.** Affiche une durée à la place d’une date, par exemple « il y a 3 mois ». L’élément se choisit sur la page. Les dates du tableau des exemplaires sont déjà prévues.

- **Formatage des dates affichées.** Reformate des dates visibles dans Koha sans modifier les données. Chaque règle choisit une page, un élément, un format de date et le comportement de l'heure lorsqu'elle est présente.

- **Formatage des numéros de téléphone.** Uniformise l’affichage des numéros, sans modifier les données Koha. D’autres emplacements peuvent être ajoutés en les choisissant sur la page.

- **Libellés et éléments d’interface.** Personnalise dans une liste unique les libellés de tableaux et n’importe quel autre élément Koha : texte, icône, apparence, lien ou visibilité.

- **Mise en forme des éléments.** Cible n’importe quel élément d’une page Koha et applique une mise en forme à tout ou partie de son texte. Une configuration prête à l’emploi est fournie par défaut.

### Interface / responsive

- **Tableaux d’exemplaires sur mobile.** Rend les tableaux d’exemplaires plus lisibles sur les petits écrans, sans modifier les données Koha.

### Interface / saisie

- **Ajouter des listes de valeurs prédéfinies pour le remplissage automatique d’un champ.** Ajoute à côté des champs Koha des listes de valeurs prédéfinies permettant de remplir automatiquement le champ sélectionné.

- **Règles de saisie.** Aide à saisir des valeurs conformes dans les champs que vous choisissez : caractères acceptés, majuscules ou minuscules et format des prix. Chaque règle s’applique à une page et à un champ précis ; les prix d’achat et de remplacement des exemplaires sont préconfigurés.

### Interface & outils

- **Historique récent.** Retrouvez les derniers adhérents, notices et recherches consultés dans ce navigateur, avec recherche et suppression des entrées. Chaque liste conserve jusqu’à 50 visites dans le stockage local de ce navigateur, partagé entre ses onglets. Aucun historique n’est transmis à PMK côté serveur. Le bouton est dans Outils, en haut de l’écran.

- **Navigation rapide — haut / bas de page.** Ajoute des boutons pour rejoindre le haut ou le bas des longues pages. L’affichage sur téléphone peut être différent.

### Lecteurs / communication

- **Chronologie des messages lecteur.** Classe les messages lecteur et suit les ajouts de Koha. Les dates identifiées servent au tri ; sans date exploitable, l’ordre Koha historique est conservé ou inversé selon votre choix. À date identique, l’ordre reste stable.

### Lecteurs / saisie

- **Valeurs par défaut selon la catégorie d’adhérent.** Renseigne automatiquement un champ de la fiche lors de la création ou de la modification d’un adhérent, selon sa catégorie d’inscription. Le champ se choisit dans la liste, ou par son identifiant. La valeur vient soit d’une catégorie de valeurs autorisées, soit d’une saisie libre. Par défaut, une valeur déjà présente est conservée.

### Navigation et interface

- **Icônes des menus.** Choisissez l’icône ou le logo d’un menu Koha. Les icônes préconfigurées des menus latéraux sont conservées ; vos personnalisations s’appliquent ensuite aux éléments choisis.

- **Menus de navigation.** Compose les menus Koha dans un éditeur qui ressemble au menu réel : liens, groupes, séparateurs, sous-menus et icônes. L’accès à cet éditeur est réservé aux administrateurs Koha. Les listes, l’historique, la recherche avancée, les guides et le compteur de fréquentation peuvent y apparaître.

- **Pages & outils internes.** Le menu Outils, en haut de l’écran, affiche les pages cochées ici et les outils dont le module est actif. L’accès de chaque page se règle sur la page.

### Outils

- **Bibliographies & publications.** Crée des bibliographies et publications personnalisées à partir des listes PMK, listes Koha, paniers, paquets et réserves de cours, par notices ou exemplaires. Les modèles personnels sont stockés sous le profil logique PMK actif, sans authentification supplémentaire.

- **Listes de travail.** Un tiroir pour mettre de côté les notices et les exemplaires sur lesquels vous travaillez. Ce n’est pas une liste Koha visible des lecteurs. Ouvrez-le avec Outils, en haut de l’écran, puis Listes personnelles. Donnez un nom de profil que plusieurs agents ouvrent ensemble, ou gardez les listes pour vous seul, liées à votre compte Koha.

### Outils / administration

- **Journal des modifications Koha.** Rend le journal des modifications plus lisible, sans remplacer les fonctions de Koha.

### Outils / contrôle de saisie

- **Compteur de listes.** Affiche près des zones de saisie multi-lignes le nombre de valeurs, de valeurs uniques et de doublons. Les doublons sont signalés mais jamais supprimés automatiquement.

### Pages et outils internes

- **Autorités — paramètres de l’installation.** Indique comment cette installation lit la liste des autorités, les doublons et les notices orphelines. Aucune autorité n’est modifiée depuis cette page. Ce réglage n’a pas sa propre entrée dans le menu.

### Périodiques

- **Filtres des réclamations de périodiques.** Ajoute, sur la page des réclamations, les filtres « retards » et « réclamés », dans un affichage plus compact.

- **Gestion des périodiques.** Module complet des périodiques : présentation de l’abonnement, suivi des fascicules, réclamations, calendrier, calcul de durée, tri de la collection, accès au bulletinage, prix et assistant de bulletinage.

- **Périodiques — enrichissement natif Koha / FP.** Enrichit les pages Koha et prépare les listes de renouvellement par site, sans tableau de bord autonome.

### Rapports

- **Impression des résultats de rapports.** Ajoute une action d'impression directement sur les résultats d'un rapport Koha. L'impression reprend le tableau actuellement affiché et peut respecter les lignes et colonnes masquées par les autres outils de la page.

- **Outils des rapports guidés.** Kit d'outils pour les résultats de rapports Koha : recherche, filtres, tri, colonnes visibles, en-tête fixe, mise en évidence, statistiques et déplacement de colonnes. Chaque fonction peut être activée séparément.

### Recherche / interface

- **Badges des filtres de recherche.** Montre les filtres actifs du catalogue et de la recherche d’adhérents sous forme de pastilles que l’on peut retirer.

### Réservations & transferts

- **Mise en forme conditionnelle — Réservations et listes.** Sur la fiche d’une notice, regroupe et met en forme les blocs Réservations, Cours et Listes. Vous choisissez comment signaler le nombre de réservations. Le tableau des exemplaires n’est pas modifié.

### Réservations et transferts

- **Transfert en lot.** Sur la page des transferts, envoie l’un après l’autre les codes-barres d’une liste. Trois sécurités peuvent être activées avant de commencer.

### Travail collaboratif

- **Partage interne.** Partage une page Koha ou une demande liée à une réservation avec des collègues. On voit le destinataire, la durée de disponibilité, et si le message est envoyé, disponible ou consulté. Tout reste dans Koha.

## Pages

Les pages s’ouvrent depuis le menu Outils, en haut de l’écran. Chacune a aussi son lien depuis l’accueil Koha.

### Configuration

- **Accueil de PimpMyKoha.** Import d’une ancienne installation, interrupteur général et liste des modules.
- **Fiche d’un module.** Active ce module et conserve ses réglages. Les autres modules ne changent pas.

### Outils du quotidien

- **Compteur de fréquentation.** Saisir et suivre la fréquentation.

- **Journaux de suivis.** Tenir plusieurs journaux d’équipe, distincts du journal de Koha.

- **Restauration d’exemplaires.** Rechercher, restaurer et traiter des exemplaires supprimés.

- **Rendez-vous et sondages.** Organiser des créneaux, des rendez-vous et des sondages.

- **Cartographie des adhérents.** Voir les domiciles, les sites d’inscription et les échanges de documents entre les sites.

- **Modification de grille par lot.** Changer la grille de catalogage de plusieurs notices, à partir de numéros de notice ou de codes-barres.

- **Bibliographies et publications.** Créer et imprimer des bibliographies depuis les listes, les paniers, les paquets et les réserves de cours.

- **Modification par lot de permissions.** Préparer et appliquer des droits sur les comptes d’une catégorie de personnel. Un superadministrateur n’est jamais modifié.

### Qualité des données

- **Qualité des autorités.** Repérer les doublons, les notices orphelines et les liens à reprendre. Cette page est encore en vérification : elle est dans la version aperçu, pas dans la version stable.

- **Inventaire.** Faire l’inventaire des collections. Cette page est encore en vérification : elle est dans la version aperçu, pas dans la version stable.

- **Qualité des exemplaires.** Contrôler et entretenir les exemplaires. Cette page est encore en vérification : elle est dans la version aperçu, pas dans la version stable.

- **Qualité des notices.** Revoir les notices, les doublons et les enrichissements. Cette page est encore en vérification : elle est dans la version aperçu, pas dans la version stable.

- **Qualité des comptes lecteurs.** Repérer les doublons, les comptes expirés et les coordonnées à reprendre. Cette page est encore en vérification : elle est dans la version aperçu, pas dans la version stable.

- **Désherbage.** Préparer le désherbage et lire les collections. Cette page est encore en vérification : elle est dans la version aperçu, pas dans la version stable.

- **Éditeur XSLT.** Ouvrir, modifier et prévisualiser les feuilles qui mettent en forme les notices, puis exporter une copie. Cette page est encore en vérification : elle est dans la version aperçu, pas dans la version stable.

### Blocs de l’accueil Koha

Ces blocs se placent sur la page d’accueil professionnelle. Chacun reste éteint tant qu’il n’est pas activé.

- **Fréquentation.** Affiche la fréquentation du jour sur l’accueil.

- **Rendez-vous.** Affiche les rendez-vous et les sondages sur l’accueil.

- **Circulation et abonnements.** Présente la circulation et les abonnements sous forme de tableau.

- **Liens utiles.** Affiche les liens que l’établissement choisit de mettre en avant.

- **Planning des services.** Affiche les plannings, par exemple la navette ou le médiabus.
