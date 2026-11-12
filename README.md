# PimpMyKoha

PimpMyKoha (PMK) ajoute des modules à l’interface professionnelle de [Koha](https://koha-community.org/) : circulation, catalogue, catalogage, adhérents, menus, pages et aides. Koha reste le logiciel métier. Chaque établissement enregistre ses pages, ses libellés, ses rapports et ses sites. Une configuration déjà enregistrée est conservée lors d’une mise à jour. Une installation neuve laisse chaque module éteint.

> [!IMPORTANT]
> PimpMyKoha est développé entièrement à l’aide de l’intelligence artificielle, par Michael Mundet, qui n’est pas développeur. Il est partagé avec la communauté Koha pour être utilisé, relu, corrigé et amélioré. Le développement est en cours. Son utilisation reste sous la responsabilité de chaque établissement.

## Catalogue

Le **[catalogue des modules et des pages](CATALOGUE.md)** décrit, pour les équipes, les 88 modules, les pages du plugin et les blocs de l’accueil.

C’est la liste à ouvrir pour savoir ce que PimpMyKoha propose. Les pages encore en vérification y sont indiquées : elles ne sont pas dans le paquet stable.

## Version actuelle

La version publiée est la **0.5.3**. Deux paquets sont construits depuis le même commit. Installez le canal stable. Le canal aperçu ajoute les pages encore en vérification.

Les deux fichiers sont sur la page **Releases** du dépôt.

| Canal | Fichier | Étiquette | Contenu |
|---|---|---|---|
| **Stable** | `PimpMyKoha-v0.5.3.kpz` | `v0.5.3` | Plugin sans les pages encore en vérification. |
| **Aperçu** | `PimpMyKoha-v0.5.3-preview.kpz` | `v0.5.3-preview` | Le même plugin, plus ces pages. Elles affichent un avertissement. |

Les pages réservées à l’aperçu sont le désherbage, la qualité des autorités, l’inventaire, la qualité des exemplaires, la qualité des notices, la qualité des comptes lecteurs et l’éditeur XSLT.

Les paquets s’installent depuis **Outils → Plugins**. Une mise à jour conserve les tables et les réglages déjà enregistrés. Les valeurs d’une ancienne installation ne sont pas des réglages imposés à tout le monde.

Depuis la version 0.5.0, seul le plugin est publié. Le dossier `releases/0.4.0/` conserve d’anciens paquets, y compris le mode non-plugin : ce ne sont pas les fichiers à installer.

## Installation

Le détail est dans [Installer le plugin](INSTALLATION-PLUGIN.md). Pour reprendre une installation qui n’utilisait pas le plugin : [Transition](TRANSITION-NON-PLUGIN-VERS-PLUGIN.md).

> [!IMPORTANT]
> Si un ancien chargeur PMK est encore dans `IntranetUserJS`, retirez-le. Le chargeur et le plugin ne doivent pas fonctionner en même temps.

1. Sauvegarder Koha, les fichiers personnalisés, `IntranetUserJS` et `IntranetUserCSS`. Commencer sur une copie de la production.
2. Si PMK est déjà utilisé sans plugin, préparer l’export avec [`dev/migration/export-production.js`](dev/migration/export-production.js). Ce script ne modifie pas l’ancienne installation.
3. Téléverser le KPZ stable depuis **Outils → Plugins**.
4. Ouvrir **PimpMyKoha** dans le menu de l’utilisateur. Le plugin est déjà lancé. Chaque module reste éteint tant qu’il n’est pas activé.
5. S’il existe une sauvegarde de l’ancienne installation, utiliser **Ancienne installation** sur cette page, puis contrôler les données importées.
6. Vérifier les parcours utiles, retirer l’ancien chargeur s’il reste, puis recharger les postes.

L’import global et les reprises module par module sont décrits dans [Migration des stockages natifs](MIGRATION-STOCKAGES-NATIFS.md).

## Limites

Le plugin demande Koha **25.11.00** ou plus récent. Il ne fixe pas de version maximale, pour ne pas bloquer une Koha plus récente encore compatible.

Les contrôles automatiques construisent les deux paquets, exécutent 79 groupes de régression, vérifient l’absence de Firebase et contrôlent le point d’entrée Perl. Ils ne remplacent pas une recette sur une copie de l’installation : droits Koha, rapports, valeurs autorisées, matériel et services extérieurs restent à vérifier. La [recette](RECETTE-PLUGIN-KOHA.md) sert de guide.

NEDAP, France Publications, Electre et EmailJS sont facultatifs. Chacun demande les accès de l’établissement. Aucun compte fournisseur n’est fourni avec le plugin.

Aucune configuration de production ne doit être publiée. Un export peut contenir des données métier.

## Dépôt

- [CATALOGUE.md](CATALOGUE.md) : modules, pages et blocs de l’accueil.
- Les fichiers JavaScript numérotés à la racine sont les modules.
- [`plugin/`](plugin/) contient le plugin Koha et son constructeur.
- [`138-pages/`](138-pages/) contient les pages internes.
- [`137-widgets/`](137-widgets/) contient les blocs de l’accueil.
- [`sql/`](sql/) contient des rapports SQL à créer sur l’installation.
- [`tests/`](tests/) et [`t/`](t/) contiennent les contrôles.
- [`dev/migration/`](dev/migration/) contient l’export d’une ancienne installation.
- [`legacy/`](legacy/) est l’ancien chargeur. Il ne s’installe plus.
- [`releases/0.4.0/`](releases/0.4.0/) est une archive. Le paquet actuel est celui de la release 0.5.3.

## Développement

Les sources restent séparées. Le constructeur prépare les deux canaux sans modifier ces sources. `README.md` et `CONTRIBUTING.md` sont recopiés dans le paquet.

```bash
node tests/audit.cjs
node tests/regression.cjs
python3 plugin/build.py --channel stable --stage /tmp/pmk-stable --output /tmp/PimpMyKoha-stable.kpz
python3 plugin/build.py --channel preview --stage /tmp/pmk-preview --output /tmp/PimpMyKoha-preview.kpz
```

Les tests Chromium demandent Playwright. Les essais dans un Koha complet sont décrits dans [PLUGIN-KOHA-PMK.md](PLUGIN-KOHA-PMK.md). Le journal des versions est [CHANGELOG.md](CHANGELOG.md).

## Documentation

- [Catalogue](CATALOGUE.md)
- [Installer le plugin](INSTALLATION-PLUGIN.md)
- [Transition d’une ancienne installation](TRANSITION-NON-PLUGIN-VERS-PLUGIN.md)
- [Migration des stockages](MIGRATION-STOCKAGES-NATIFS.md)
- [Recette](RECETTE-PLUGIN-KOHA.md)
- [Contribuer](CONTRIBUTING.md)
- [Aide](SUPPORT.md)
- [Signaler une vulnérabilité](SECURITY.md)
- [Code de conduite](CODE_OF_CONDUCT.md)

Les notes [compatibilité 0.4.0](COMPATIBILITE-PLUGIN-0.4.0.md) et [suivi 0.4.0](SUIVI-AMELIORATIONS-0.4.0.md) décrivent l’ancienne version. Elles ne décrivent pas la 0.5.3.

## Licence

Le code de PimpMyKoha est distribué sous la [GNU GPL version 3 ou ultérieure](LICENSE), comme Koha. Les composants tiers gardent leur licence. Intro.js 6.0.0 est sous AGPL-3.0 : voir [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
