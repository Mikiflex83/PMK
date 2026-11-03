# Développer et tester le plugin avec KTD

PMK suit le parcours communautaire décrit dans [Plugin development with KTD — your complete toolkit](https://koha-community.gitlab.io/KohaAdvent/2025-12-08-ktd-plugins/) : montage du plugin, réinstallation avec l’outil Koha, tests Perl, `koha-qa.pl`, contrôle dans le navigateur et lecture des journaux.

## Préparer le plugin

Prérequis : Docker, Git, une copie de `koha-testing-docker`, une source Koha compatible et assez d’espace disque pour les images KTD.

```sh
export KTD_HOME=/chemin/vers/koha-testing-docker
export SYNC_REPO=/chemin/vers/koha

dev/koha/prepare-ktd-plugin-stage.sh \
  /tmp/PimpMyKoha \
  /tmp/PimpMyKoha.kpz
```

La préparation produit le KPZ, copie les trois tests Perl et crée l’historique Git temporaire attendu par `koha-qa.pl`. Elle ne modifie pas le dépôt de travail.

## Lancer KTD

Avec la version actuelle de KTD :

```sh
"$KTD_HOME/bin/ktd" \
  --name pmkdev \
  --single-plugin /tmp/PimpMyKoha \
  up -d

"$KTD_HOME/bin/ktd" --name pmkdev --wait-ready 180
```

Définir ensuite le dossier préparé et lancer la recette recommandée :

```sh
export KTD_NAME=pmkdev
export PMK_KTD_PLUGIN_STAGE=/tmp/PimpMyKoha
dev/koha/run-ktd-plugin-qa.sh
```

Le script :

1. réinstalle `Koha::Plugin::PimpMyKoha` avec `misc/devel/install_plugins.pl` ;
2. redémarre Plack ;
3. exécute `prove -v t/` ;
4. exécute `koha-qa.pl -c 2` avec la configuration PMK.

## Contrôle navigateur

Après création des comptes et données fictives décrits dans [la recette Koha](PLUGIN-KOHA-PMK.md), exécuter :

```sh
PMK_KOHA_TEST_URL=http://127.0.0.1:18081 \
PMK_CHROMIUM_PATH=/usr/bin/chromium \
node tests/koha-plugin.cjs
```

Ce scénario contrôle le chargement des ressources embarquées, le stockage natif, les conflits de révision, les permissions, l’isolation des favoris et l’ouverture des pages PMK. Les requêtes externes du navigateur sont bloquées.

## Résultat du 3 novembre 2026

Environnement : Koha 25.11, MariaDB 10.11, image KTD locale, plugin PMK 0.4.0.

- installation native : réussie ;
- `prove -v t/` : **3 fichiers, 38 tests, succès** ;
- `koha-qa.pl -c 2` : **succès**, après remplacement de trois usages anciens de `$c->validation` par l’accès contrôleur recommandé ;
- navigateur : **6 scénarios réels réussis**, aucune erreur JavaScript ;
- interface professionnelle : HTTP 200 ;
- plugin enregistré et activé dans Koha ;
- journal Plack : aucune erreur PMK pendant ce scénario.

Les contrôles de formatage ignorés par l’image utilisée sont signalés par l’outil QA : son clone Koha ne contient pas `misc/devel/tidy.pl` ni `.prettierrc.js`. Les tests Perl et les règles de sécurité de contrôleur ont bien été exécutés. La version actuelle de `qa-test-tools` a été utilisée, car celle de l’ancienne image locale était incompatible avec `Parallel::ForkManager` 2.02.

Cette recette porte sur la version minimale prise en charge, Koha 25.11. Les comptes fournisseurs, le matériel physique et une migration de données réelles restent à qualifier séparément. KTD fournit un environnement de développement et des preuves reproductibles ; il ne remplace pas l’audit de sécurité de l’hébergeur.
