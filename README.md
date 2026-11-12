# PimpMyKoha

PimpMyKoha (PMK) ajoute des modules à l’interface professionnelle de [Koha](https://koha-community.org/) : ergonomie, circulation, catalogage, menus, pages internes et aides. Koha reste le logiciel métier. Chaque bibliothèque enregistre ses pages, ses sélecteurs, ses statuts, ses rapports, ses catégories, ses sites et ses libellés. Une configuration déjà enregistrée est conservée lors d’une mise à jour. Une installation neuve laisse chaque module éteint.

> [!IMPORTANT]
> PimpMyKoha est développé entièrement à l’aide de l’intelligence artificielle, par Michael Mundet, qui n’est pas développeur. Il est partagé avec la communauté Koha pour que le plus grand nombre puisse en profiter, et pour qu’il soit relu, corrigé, amélioré et rendu plus fiable. Le développement est toujours en cours. Son utilisation reste sous la responsabilité de chaque établissement.

Ce dépôt est la source du plugin Koha. La version 0.5.3 se publie en deux canaux construits depuis le même commit. Le mode non-plugin n’est plus distribué. Le [catalogue](CATALOGUE.md) décrit chaque module et chaque page, sans vocabulaire technique.

## Revue du plugin

Le manifeste déclare la licence GPL-3.0-or-later et une version minimale de Koha. Il ne fixe pas de version maximale, afin de ne pas bloquer une Koha plus récente encore compatible. Les tests Perl sont dans `t/`. Le journal est `CHANGELOG.md`. `README.md` et `CONTRIBUTING.md` sont recopiés dans le paquet KPZ.

Les contrôles automatiques ne remplacent pas une première recette sur une copie de l’installation : parcours métier, droits Koha, et absence d’effet quand un module est éteint. Le canal stable est celui à installer. Le canal aperçu ajoute des pages encore en développement.

## Versions 0.5.3

| Canal | Étiquette | Contenu |
|---|---|---|
| **Stable** | `v0.5.3`, release de référence | Plugin complet, sans les pages encore marquées en développement. |
| **Aperçu** | `v0.5.3-preview`, préversion | Le même plugin, plus ces pages. Elles gardent l’avertissement d’usage. |

Les pages absentes du canal stable sont le désherbage, la qualité des autorités, l’inventaire, la qualité des exemplaires, la qualité des notices, la qualité des comptes lecteurs et l’éditeur XSLT.

Les deux paquets s’installent depuis **Outils → Plugins**. Une mise à jour conserve les tables PMK. Les valeurs d’une installation historique ne sont pas des réglages universels.

## Choisir le mode d’installation

### Plugin Koha

Le plugin est le seul mode publié à partir de la version 0.5.0. Il fournit :

- un seul paquet KPZ à installer et à mettre à jour ;
- un stockage natif dans Koha pour les configurations et les données PMK ;
- 88 modules configurables et les pages internes PMK ;
- l’import global des configurations et données de l’ancienne installation ;
- la conservation des réglages et historiques lors d’une mise à jour ou d’une réinstallation ;
- aucune dépendance à Firebase, y compris pour la page Autorités.

Consultez [l’installation du plugin](INSTALLATION-PLUGIN.md), puis la [procédure de transition](TRANSITION-NON-PLUGIN-VERS-PLUGIN.md).

> [!IMPORTANT]
> Le chargeur non-plugin et le plugin ne doivent jamais être actifs simultanément. Si un ancien chargeur est encore présent dans `IntranetUserJS`, retirez-le avant d’activer le plugin.

## Installation rapide du plugin

1. Sauvegarder Koha, les fichiers personnalisés, `IntranetUserJS` et `IntranetUserCSS`.
2. Si PMK est déjà utilisé, générer l’export complet avec [`dev/migration/export-production.js`](dev/migration/export-production.js).
3. Installer le KPZ `v0.5.3` depuis **Outils → Plugins**. Le canal aperçu se reconnaît à l’étiquette `v0.5.3-preview`.
4. Ouvrir **PimpMyKoha** dans le menu de l’utilisateur. Le plugin est déjà lancé. Chaque module reste éteint tant qu’il n’est pas activé.
5. S’il existait une installation sans plugin, utiliser **Ancienne installation** sur cette page, puis contrôler les données importées.
6. Tester les principaux parcours sur une copie de la production.
7. Retirer l’ancien chargeur PMK de `IntranetUserJS` s’il est encore présent, puis recharger les postes.

L’export ne modifie pas l’ancienne installation. Les configurations inconnues, modules désactivés, valeurs personnalisées et données métier accessibles sont conservés dans la sauvegarde. Le détail se trouve dans [Migration des stockages natifs](MIGRATION-STOCKAGES-NATIFS.md).

## Principales fonctions

Le détail de chaque module et de chaque page est dans le [catalogue](CATALOGUE.md).

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

La version 0.5.3 est construite et contrôlée avec Koha 25.11, UNIMARC et MariaDB 10.11. Le plugin comprend :

- 88 modules déclarés ;
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

# Canal stable, puis canal aperçu
python3 plugin/build.py \
  --channel stable \
  --stage /tmp/pmk-stable \
  --output /tmp/PimpMyKoha-0.5.3.kpz
python3 plugin/build.py \
  --channel preview \
  --stage /tmp/pmk-preview \
  --output /tmp/PimpMyKoha-0.5.3-preview.kpz
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
- [Transition d’une ancienne installation](TRANSITION-NON-PLUGIN-VERS-PLUGIN.md)
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
