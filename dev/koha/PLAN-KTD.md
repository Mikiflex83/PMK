# Plan de test KTD — PimpMyKoha 0.4.0

Instance : Koha 25.11.10, UNIMARC, MariaDB 10.11, projet Docker `pmk`.
Professionnel : http://127.0.0.1:18081 — OPAC : http://127.0.0.1:18080 — compte `koha` / `koha`.

Le plan ne modifie pas les modules. Il n'enregistre aucun réglage et ne réactive pas
la correction de statut au prêt, qui est livrée éteinte. Les valeurs de base restent
celles du code tant qu'aucun document n'est sauvegardé.

Lancer depuis Ubuntu, sans réinstaller :

```bash
bash /mnt/c/Users/la_lo/Desktop/PMK/dev/koha/run-ktd-plan.sh
```

Le cycle d'édition décrit dans le billet KTD, seulement après une modification du plugin :

```bash
bash /mnt/c/Users/la_lo/Desktop/PMK/dev/koha/run-ktd-plan.sh --reinstall
```

`--reinstall` exécute `install_plugins.pl` puis `koha-plack --restart`. L'installation
existante ne recrée pas les tables et ne change `runtime_enabled` que s'il est absent.

## Minimum du billet KTD

1. Le répertoire `~/git/koha-plugins/pmk` est monté dans le conteneur sur `/kohadevbox/plugins/pmk`.
2. `prove -v t/` tourne dans `koha-shell`, avec `PERL5LIB` qui inclut le plugin.
   - `t/00-boundaries.t` : pas de `system`/`exec`, pas de client HTTP générique, pas de Firebase, pas de `DROP TABLE`, version et licence déclarées, désinstallation sans suppression des tables.
   - `t/01-metadata.t` : version 0.4.0, licence, aucun script injecté hors session, quatre tables présentes, plugin visible par Koha.
3. Administration > Plugins affiche PimpMyKoha une fois connecté.
4. `.kohaqarc` et `.codespell-ignore` sont à la racine du dépôt, comme pour kitchen-sink.
   `koha-qa.pl -c 2` ne s'exécute que si le répertoire testé est un dépôt git. Le stage construit ne l'est pas.
5. Contrôle de `plugin_data` et du journal Plack : pas d'échec d'installation.
6. Le nombre de documents PMK et `runtime_enabled` sont identiques avant et après le plan.

## Au-delà du billet

7. `node tests/audit.cjs` : syntaxe des scripts et registre des modules.
8. `python3 tests/firebase-free.py` : le paquet livré ne charge pas Firebase.
9. `perlcritic --gentle` si l'outil est dans l'image. Un écart de style est signalé, le code des modules n'est pas réécrit.
10. `node tests/ktd-staff.cjs` une fois Playwright installé dans `tests/` (`npm install --ignore-scripts`, Chrome local via `PMK_CHROMIUM_PATH`).
    Le script ouvre 28 écrans réels de cette base (notice 1, exemplaire 1, adhérent 1, catégorie S)
    et les 87 formulaires, un par un, puis les referme.
    Une écriture de réglage (`/documents` ou `/runtime`) fait échouer le plan.
    Les écritures des modules vers leurs propres espaces (présences, taxonomie) sont relevées, pas annulées :
    elles font partie du comportement livré.
    Les alias `waiting-holds-age`, `loan-duration-detail` et `patron-age-display` ouvrent Dates relatives.
    Abonnements, listes et services externes ne sont pas inventés : ils restent des limites de cette base.
    `PMK_TEST_FILTER` limite un appel direct de `node tests/ktd-staff.cjs`. Le plan complet ignore cette variable et parcourt toujours tous les écrans et tous les modules.
