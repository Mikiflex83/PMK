# PimpMyKoha : instance de test et plugin natif

Version du plugin : 0.4.0. Socle PMK embarqué : 0.8.0.
Ce paquet est destiné à la recette. La couverture métier complète des scripts
reste limitée aux parcours décrits dans la recette. Les anciens stockages Firebase sont remplacés par la base Koha.
Les étapes d’installation dans votre Koha figurent dans [INSTALLATION-PLUGIN.md](INSTALLATION-PLUGIN.md).

## Architecture livrée

Le plugin `Koha::Plugin::PimpMyKoha` fournit le point d’entrée `intranet_js`,
les accès Configurer et Outil du gestionnaire de plugins Koha, les ressources
JavaScript et les SQL embarqués, servis par les routes natives de l’API Koha
(`/api/v1/contrib/pmk/static/…`), sans ajout d’Alias Apache. Aucun hébergement externe de scripts PMK
n’est nécessaire pour ces fichiers. Les bibliothèques et services externes
utilisés par certains moteurs restent nécessaires à ces fonctions.

Le manifeste conserve l’ordre des scripts, avec le socle en premier. Le nombre exact est inscrit dans le manifeste du paquet. Un fichier généré les charge en une seule requête authentifiée ; les fichiers sources individuels restent disponibles et inchangés dans le paquet.
Les pages, widgets et guides sont chargés à la demande. Les runtimes de listes,
historique récent et recherche avancée restent pilotés par leur interrupteur PMK.
L’ancienne copie du module 008 n’est pas exécutée ; son fichier est conservé.

Les réglages utilisent `storage.js` et les moteurs métier utilisent `native-data.js`. Les lectures, abonnements, transactions et lots sont servis par Koha. Aucun SDK Firebase, compte Firebase ou émulateur ne sert de repli. Le chargeur historique seul ne suffit plus : le plugin doit être installé.

La lecture initiale des réglages est regroupée par `/api/v1/contrib/pmk/configuration`, sans inclure les favoris personnels. Cette lecture n’est utilisée qu’une fois par document ; les lectures forcées et contrôles de sauvegarde interrogent Koha. La révision de chaque sauvegarde est celle de sa propre lecture, même si une autre lecture intervient entre-temps.

Les routes `/api/v1/contrib/pmk/documents/<identifiant>` utilisent la session
Koha. La lecture nécessite un compte personnel disposant de l’accès catalogue.
La modification des configurations partagées exige le rôle superlibrarian côté
serveur. Les favoris sont rattachés au compte de la session, indépendamment de
l’identifiant envoyé par le navigateur. Les écritures portent une révision :
un conflit renvoie 409 et ne remplace pas la nouvelle version d’un autre agent.

Les tables `koha_plugin_pimpmykoha_documents` et
`koha_plugin_pimpmykoha_history` conservent les documents et versions antérieures.
Une mise à jour ne les réinitialise pas. Le code de désinstallation n’efface pas
ces tables. Sauvegarder la base Koha reste nécessaire pour une sauvegarde
complète : le paquet KPZ contient le code, pas les données de l’établissement.

## Préparer et lancer l’instance isolée

Prérequis : Docker et Compose, Python 3, Git ; espace disque suffisant pour Koha
et sa base de test. Depuis le dossier du projet :

```sh
python3 dev/koha/prepare.py --work /chemin/vers/travail-pmk
export PMK_KOHA_SOURCE=/chemin/vers/travail-pmk/koha-src
export PMK_PLUGIN_STAGE=/chemin/vers/travail-pmk/pmk-plugin
docker compose -f dev/koha/compose.yml up -d
```

Le fichier `.env` est créé à partir de `.env.example` seulement s’il n’existe
pas. Le profil de démonstration est Koha 25.11, UNIMARC, interface en anglais,
avec les données et comptes de démonstration Koha Testing Docker. Il ne copie
aucune donnée Dracénie. Les ports sont limités à la machine locale :

- interface professionnelle : `http://127.0.0.1:18081` ;
- OPAC : `http://127.0.0.1:18080`.

Le compte de démonstration configuré par KTD est `koha` / `koha`. Ces identifiants
concernent exclusivement l’instance locale de démonstration.

Attendre la création de `/ktd_ready` et vérifier les journaux :

```sh
docker compose -f dev/koha/compose.yml logs --tail 80 koha
docker compose -f dev/koha/compose.yml exec koha test -f /ktd_ready
```

Installer le plugin depuis le paquet KPZ dans le gestionnaire Koha, ou depuis
le dossier de développement déjà monté dans le conteneur :

```sh
docker compose -f dev/koha/compose.yml exec -T koha bash < dev/koha/install-plugin.sh
```

L’accueil des outils reste
`/cgi-bin/koha/mainpage.pl?pmk_page=hub`. La configuration PMK est accessible
depuis le menu utilisateur ou **Configurer** dans le gestionnaire de plugins.
Le volume MariaDB conserve la base lors d’un arrêt normal. Utiliser `down`
sans `--volumes` pour arrêter l’environnement sans effacer sa base.

Dans l’environnement de développement actuel, le pilote Docker VFS duplique
les couches et l’image d’origine dépassait l’espace disponible. Une image
aplatie a été produite à partir de l’image officielle, digest source
`sha256:2654ba03739be9b35a697d84f59ea8a8121ba3c7969113741c627847c732bff1`.
Son nom local est `pmk/koha-testing:25.11-flat` ; elle s’utilise en définissant
`PMK_KOHA_IMAGE` à cette valeur. Ce problème n’impose pas de modifier le pilote
Docker ni la configuration de votre Koha.

## Construire le paquet

```sh
python3 plugin/build.py --stage /chemin/travail/pmk-plugin \
  --output /chemin/travail/PimpMyKoha-plugin-0.4.0.kpz
```

Le dossier de préparation doit être extérieur au projet. La construction copie
les ressources et conserve leurs fichiers sources, dont Autorités avec son ancien
accès Firebase retiré.
La structure du KPZ suit `Koha/Plugin/PimpMyKoha.pm` et son dossier de ressources.

## Conservation et migration

La mise à jour conserve les tables de configuration, les données métier et leurs
historiques. La nouvelle interface **Données des modules — import / export**
permet de reprendre les exports existants sans connexion à Firebase.
[MIGRATION-STOCKAGES-NATIFS.md](MIGRATION-STOCKAGES-NATIFS.md) détaille les espaces,
formats, droits et règles de fusion. Les données de votre établissement ne sont
pas incluses dans le KPZ. Conserver les exports d’origine avant la bascule.

Remplacer le chargement historique dans IntranetUserJS par le plugin lors d’une bascule validée,
pour éviter deux copies de PMK. Le plugin interrompt son chargement si un socle
PMK est déjà présent. Aucun ancien chargeur n’est supprimé automatiquement.
La page Autorités conserve ses fonctions ; son ancien accès à la mémoire
Firebase est retiré, conformément à la nouvelle demande.

## Recette et limites

Le bilan détaillé et les preuves courantes sont dans `RECETTE-PLUGIN-KOHA.md`
et `tests/validation/`. Ils distinguent les parcours réellement exécutés dans
Koha, les contrats avec données simulées et les services externes non connectés.
Les essais locaux ne constituent pas une validation sur votre production.

Pour préparer les dossiers fictifs et vérifier les rapports avec le moteur natif :

```sh
docker compose -f dev/koha/compose.yml exec -T koha koha-shell kohadev -c perl < dev/koha/seed-smoke.pl
docker compose -f dev/koha/compose.yml exec -T koha koha-shell kohadev -c perl < dev/koha/seed-business.pl
```

La seconde commande émet une ligne `PMK_FIXTURES_JSON` : conserver son objet JSON
seul dans un fichier et définir `PMK_FIXTURES` vers ce fichier pour les tests.
Les créations portent toutes le préfixe `PMKTEST` ; les rapports de recette sont
les seuls rapports existants que ce script met à jour. Il refuse une autre base
que `koha_kohadev`.

### Bibliothèques facultatives pour les tests hors réseau

Aucun serveur ou émulateur Firebase n’est nécessaire. Les tests bloquent tous
les accès externes. Les bibliothèques facultatives PDF, EmailJS et QR peuvent
être fournies depuis des fichiers locaux au harnais, sans remplacer les API Koha :

```sh
mkdir -p /chemin/travail/local-services
cp dev/koha/local-services.package.json /chemin/travail/local-services/package.json
npm install --prefix /chemin/travail/local-services
node dev/koha/prepare-services.cjs /chemin/travail/local-services
```

Définir `PMK_LOCAL_SERVICES=/chemin/travail/local-services` pour les tests.
Aucun serveur supplémentaire n’est requis pour ces fichiers : le harnais les lit
sur disque. Le journal et les compteurs utilisent exclusivement la vraie base Koha.

### Lancer les scénarios

Installer les dépendances indiquées dans `tests/package.json`. Définir
`PMK_CHROMIUM_PATH` si Chromium n’est pas à `/usr/bin/chromium` et
`PMK_KOHA_TEST_URL` si le port local diffère. Le harnais refuse une machine
distante et bloque les services HTTP et WebSocket externes.

```sh
node tests/koha-plugin.cjs
node tests/koha-configuration.cjs
node tests/koha-business.cjs
node tests/koha-circulation.cjs
node tests/koha-publications.cjs
node tests/koha-maintenance.cjs
node tests/koha-shared-tools.cjs
node tests/koha-native-data.cjs
node tests/koha-native-engines.cjs
node tests/koha-lost-checkin.cjs
node tests/koha-internal-pages.cjs
node tests/koha-routes.cjs
python3 tests/koha-sql.py
docker compose -f dev/koha/compose.yml exec -T koha koha-shell kohadev -c perl < tests/koha-reports.pl
```

Les tests modifiant les réglages doivent être lancés en séquence. Ils conservent
les documents d’origine et les restaurent après leurs changements temporaires.
Le test des statuts au prêt (`tests/koha-checkout-status.cjs`) utilise aussi
Docker ; il active temporairement une préférence de l’instance fictive puis la
restaure. Les tests contenant Docker supposent le nom de conteneur fourni par
le Compose livré.

### Dépendance de restauration

La restauration utilise le vrai plugin libre
[inLibro/koha-plugin-undelete-records](https://github.com/inLibro/koha-plugin-undelete-records),
version 1.1, commit `93fc0729b412a00ddad3fa1b2c8181739e50ae3c`, installé et activé
séparément dans Koha. Il n’est pas incorporé au KPZ PMK. Vérifier son activation
dans le gestionnaire de plugins avant `node tests/koha-restoration.cjs`.
`dev/koha/enable-restoration-plugin.pl` permet cette activation dans la seule
base dédiée `koha_kohadev` après installation.

L’instance fonctionne localement dans cet environnement cloud ; ses URL
`127.0.0.1` ne sont pas accessibles depuis votre ordinateur. Le Compose permet
de créer une instance équivalente sur votre poste.
