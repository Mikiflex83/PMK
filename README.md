# PimpMyKoha

PimpMyKoha (PMK) est un ensemble de modules qui améliore l’interface professionnelle de [Koha](https://koha-community.org/) sans remplacer ses fonctions métier. Il ajoute des réglages d’ergonomie, des outils de circulation et de catalogage, des menus, des pages internes et des aides configurables.

Le projet conserve la philosophie de l’installation historique de la Dracénie tout en permettant à chaque bibliothèque d’adapter les pages, les sélecteurs, les statuts, les rapports SQL, les catégories, les sites et les libellés à son propre Koha. Les valeurs historiques restent les valeurs par défaut et les configurations personnalisées sont conservées lors des mises à jour.

## État actuel du projet

| Mode | Maturité actuelle |
|---|---|
| **Non-plugin** | Mode historique éprouvé en situation réelle. La distribution 0.4.0 doit malgré tout être sauvegardée et vérifiée avant remplacement des scripts existants. |
| **Plugin Koha** | **Version expérimentale en cours de test.** Le paquet passe des tests automatiques et des essais techniques sur une instance Koha dédiée, mais il ne bénéficie pas encore d’un retour d’utilisation en établissement ni d’une transition réelle validée. |

> [!WARNING]
> Le plugin 0.4.0 est fourni pour évaluation et recette. Ne l’activez pas directement en production : commencez sur une copie de l’installation et conservez le mode non-plugin tant que la reprise complète n’a pas été validée.

## Télécharger la version 0.4.0

| Distribution | Usage | Téléchargement |
|---|---|---|
| Livraison complète | Plugin, mode non-plugin, migration, documentation et sources | [ZIP complet](releases/0.4.0/PimpMyKoha-livraison-complete-2026-10-29.zip) |
| Mode non-plugin | Installation actuelle par transfert de fichiers | [ZIP non-plugin](releases/0.4.0/PimpMyKoha-non-plugin-0.4.0-transition.3.zip) |
| Plugin Koha | Paquet expérimental pour test depuis **Outils → Plugins** | [KPZ de test](releases/0.4.0/PimpMyKoha-plugin-0.4.0.kpz) |

Les empreintes SHA-256 sont publiées dans le [dossier de la version](releases/0.4.0/README.md).

## Choisir le mode d’installation

### Plugin Koha

Le plugin est le mode cible, actuellement en phase de test. Il fournit :

- un seul paquet KPZ à installer et à mettre à jour ;
- un stockage natif dans Koha pour les configurations et les données PMK ;
- 87 modules configurables et les pages internes PMK ;
- l’import global des configurations et données de l’ancienne installation ;
- la conservation des réglages et historiques lors d’une mise à jour ou d’une réinstallation ;
- aucune dépendance à Firebase, y compris pour la page Autorités.

Consultez [l’installation du plugin](INSTALLATION-PLUGIN.md), puis la [procédure de transition](TRANSITION-NON-PLUGIN-VERS-PLUGIN.md).

### Mode non-plugin

Cette distribution permet de profiter des modules à jour lorsque l’installation des plugins Koha n’est pas encore autorisée. Elle se copie dans le dossier web qui sert actuellement les scripts PMK et utilise un petit chargeur dans `IntranetUserJS`.

Elle garde volontairement l’accès aux anciens stockages Firebase de l’installation historique afin de retrouver les configurations existantes et de produire une sauvegarde importable dans le plugin. Le plugin, lui, n’utilise pas Firebase.

Les identifiants de ces anciens projets ne sont pas publiés. Ils doivent être placés uniquement sur le serveur dans `pmk-legacy-private-config.js`, créé depuis le modèle fourni et exclu de Git.

Consultez [l’installation non-plugin](INSTALLATION-NON-PLUGIN-TRANSITION.md).

> [!IMPORTANT]
> Le chargeur non-plugin et le plugin ne doivent jamais être actifs simultanément. Deux chargements exécuteraient chaque module deux fois.

## Installation rapide du plugin

1. Sauvegarder Koha, les fichiers personnalisés, `IntranetUserJS` et `IntranetUserCSS`.
2. Si PMK est déjà utilisé, générer l’export complet avec [`dev/migration/export-production.js`](dev/migration/export-production.js).
3. Installer [`PimpMyKoha-plugin-0.4.0.kpz`](releases/0.4.0/PimpMyKoha-plugin-0.4.0.kpz) depuis **Outils → Plugins**.
4. Ouvrir **PimpMyKoha → Configurer** et laisser le plugin en attente pendant la reprise.
5. Analyser le fichier exporté, télécharger la sauvegarde du plugin, puis importer et contrôler les données.
6. Tester les principaux parcours sur une copie de la production.
7. Retirer l’ancien chargeur PMK de `IntranetUserJS`, puis activer le plugin et recharger les postes.

L’export ne modifie pas l’ancienne installation. Les configurations inconnues, modules désactivés, valeurs personnalisées et données métier accessibles sont conservés dans la sauvegarde. Le détail se trouve dans [Migration des stockages natifs](MIGRATION-STOCKAGES-NATIFS.md).

## Installation rapide sans plugin

1. Sauvegarder le dossier de scripts actuel et les personnalisations Koha.
2. Décompresser le [ZIP non-plugin](releases/0.4.0/PimpMyKoha-non-plugin-0.4.0-transition.3.zip).
3. Copier le contenu de `PimpMyKoha-non-plugin` dans le dossier servi, par exemple `/public/koha-scripts/`.
4. Remplacer les anciens chargements PMK individuels par le contenu de `IntranetUserJS-Dracenie.js` fourni.
5. Vider le cache du navigateur et contrôler les configurations dans PMK avant tout enregistrement.

Les 113 sources sont regroupées en neuf ressources de démarrage pour réduire les requêtes HTTP. Les fichiers individuels restent séparés dans les sources afin de conserver une maintenance lisible.

## Principales fonctions

PMK couvre notamment :

- la circulation, les retours, renouvellements, réservations et transferts ;
- la présentation du catalogue, des notices et des exemplaires ;
- le catalogage, les contrôles de saisie et les assistants de champs ;
- les adhérents, catégories, coordonnées et contrôles avant renouvellement ;
- les menus de l’accueil et de la navigation professionnelle ;
- les listes, bibliographies, rapports SQL et exports ;
- l’éditeur XSLT et les guides intégrés ;
- les compteurs, widgets et pages internes ;
- la gestion des périodiques et l’intégration facultative France Publications ;
- la restauration contrôlée d’exemplaires supprimés dans le plugin ;
- la page Autorités avancée, conservée lors de la transformation en plugin.

Les fonctions propres à une installation disposent autant que possible de sélecteurs visuels, de rapports SQL copiables et de paramètres explicites. Certaines intégrations facultatives comme NEDAP, France Publications, Electre ou EmailJS gardent leurs propres prérequis.

## Compatibilité et validation

La version 0.4.0 a été développée et contrôlée techniquement principalement avec Koha 25.11, UNIMARC et MariaDB 10.11. Seul le mode non-plugin bénéficie à ce jour d’un recul d’utilisation en situation réelle. Le plugin comprend :

- 87 modules déclarés ;
- 79 groupes de tests de régression avec des données locales simulées ;
- des contrôles de syntaxe et d’intégrité des archives ;
- des tests du stockage natif, des migrations et des principaux parcours du plugin ;
- un contrôle interdisant les appels aux services Firebase dans le plugin.

Ces contrôles prouvent la construction et certains comportements attendus, mais ne constituent pas une validation du plugin en production. Une recette sur une copie de l’installation cible reste obligatoire, en particulier pour les permissions, rapports locaux, valeurs autorisées, matériels et services fournisseurs. Consultez la [recette plugin](RECETTE-PLUGIN-KOHA.md) et la [matrice de compatibilité](COMPATIBILITE-PLUGIN-0.4.0.md).

## Organisation du dépôt

- Les fichiers JavaScript numérotés à la racine correspondent aux modules PMK.
- [`plugin/`](plugin/) contient le serveur et le constructeur du plugin Koha.
- [`legacy/`](legacy/) contient le chargeur et le constructeur non-plugin.
- [`138-pages/`](138-pages/) contient les pages internes.
- [`137-widgets/`](137-widgets/) contient les widgets de l’accueil.
- [`sql/`](sql/) contient les rapports SQL à créer sur les autres installations.
- [`tests/`](tests/) contient les tests et leurs résultats de validation.
- [`dev/migration/`](dev/migration/) contient les outils de transition depuis l’installation historique.
- [`releases/`](releases/) contient les paquets prêts à télécharger.

## Développement

Les scripts restent séparés pour faciliter la maintenance. Les constructeurs génèrent ensuite les distributions optimisées sans fusionner définitivement les sources.

```bash
# Audit statique
node tests/audit.cjs

# Régression principale
node tests/regression.cjs

# Construire le mode non-plugin
python3 legacy/build.py \
  --stage /tmp/pmk-non-plugin \
  --output /tmp/PimpMyKoha-non-plugin.zip

# Construire le KPZ
python3 plugin/build.py \
  --stage /tmp/pmk-plugin \
  --output /tmp/PimpMyKoha-plugin.kpz
```

Les tests Chromium nécessitent Playwright et Chromium. Les tests Koha complets nécessitent l’environnement local décrit dans [PLUGIN-KOHA-PMK.md](PLUGIN-KOHA-PMK.md).

## Sécurité des données

- Ne publiez jamais un export de production : il peut contenir des configurations et des données métier privées.
- Le dépôt et les paquets fournis ne contiennent aucune configuration de production.
- Sauvegardez Koha avant toute installation ou migration.
- Analysez et sauvegardez l’état du plugin avant un import global.
- Testez la transition sur une copie de la production avant la bascule finale.

## Documentation

- [Installer le plugin](INSTALLATION-PLUGIN.md)
- [Installer le mode non-plugin](INSTALLATION-NON-PLUGIN-TRANSITION.md)
- [Transition non-plugin vers plugin](TRANSITION-NON-PLUGIN-VERS-PLUGIN.md)
- [Migration des stockages](MIGRATION-STOCKAGES-NATIFS.md)
- [Recette du plugin](RECETTE-PLUGIN-KOHA.md)
- [Compatibilité de la version 0.4.0](COMPATIBILITE-PLUGIN-0.4.0.md)
- [Suivi des améliorations](SUIVI-AMELIORATIONS-0.4.0.md)

## Communauté

- [Contribuer au projet](CONTRIBUTING.md)
- [Obtenir de l’aide](SUPPORT.md)
- [Signaler une vulnérabilité](SECURITY.md)
- [Code de conduite](CODE_OF_CONDUCT.md)
- [Journal des versions](CHANGELOG.md)

## Licence

Le code de PimpMyKoha est distribué sous la licence [GNU GPL version 3 ou ultérieure](LICENSE), en cohérence avec Koha. Vous pouvez l’utiliser, l’étudier, le modifier et le redistribuer en respectant les conditions de cette licence, notamment la mise à disposition du code source des versions redistribuées.

Les composants tiers conservent leur propre licence. Consultez [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), notamment pour Intro.js 6.0.0 distribué sous AGPL-3.0.
