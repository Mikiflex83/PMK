Tests de régression PimpMyKoha

Depuis ce dossier : `npm install`, puis `npm test`.

Node.js et Chromium sont nécessaires. Les dépendances de test incluent Playwright,
jQuery et Acorn. Le navigateur utilisé par défaut est
`/usr/bin/chromium`. Définir `PMK_CHROMIUM_PATH` pour un autre emplacement.
`PMK_JQUERY_PATH` permet d’utiliser un autre fichier jQuery local.
`PMK_TEST_FILTER` permet de sélectionner un groupe par son intitulé.
`PMK_TEST_REPORT` permet d’enregistrer le résultat dans un fichier JSON.

Les tests interceptent toutes les requêtes. Ils utilisent un faux stockage
Koha et des pages Koha simulées ; ils ne lisent ni ne modifient la
production. Les fixtures Circulation, Catalogage, Outils et Administration
reprennent les quatre fichiers fournis. Les autres fixtures reproduisent les
extraits de la demande ; le lien de création des réserves de cours utilise
la route Koha standard `add_course.pl`, à confirmer sur l’installation réelle.

La suite couvre la conservation des valeurs personnalisées, les définitions
concurrentes, les deux générations de l’âge, l’alias de l’historique, les menus
134 et 147, les intitulés et exclusions demandés, les favoris, les droits,
les cibles, les facettes, les widgets, les doublons et les guides.

La suite comprend 79 groupes de scénarios, dont l’ouverture de 39 formulaires et
la fusion des réglages âge/dates/réservations/échéances. Les scénarios couvrent
aussi les cibles personnalisées de 011/033, les rapports SQL, les toasts de copie,
les règles LOST/NOT_LOAN et le compteur flottant/page avec un stockage natif simulé. Elle ne remplace pas une recette sur Koha réel.
Les résultats enregistrés de la dernière validation sont dans `validation/`.

Audit statique, sans exécuter les scripts métier : `npm run audit`.
Rapport détaillé : `node audit.cjs --report declarations.json`.
Cet audit vérifie la syntaxe des scripts, liste les déclarations identifiables et
vérifie qu’une seule implémentation affecte `window.PMKConfig`.

L’audit complémentaire ouvre les 43 formulaires directement concernés par les
notes initiales et les demandes suivantes. `validation/request-forms.json` conserve
ce relevé. Les nouveaux tests vérifient les clics réels des pickers, leur reprise
après navigation sans sauvegarde automatique, les activations Z39.50 et les IDs
SQL envoyés par le module Mouvements. Le bilan complet est `../BILAN-DEMANDES-PMK.md`.

La dernière liste ajoute les sélecteurs QR/compteurs, les vérifications de lecteur
sur un gabarit personnalisé, les attributs natifs de renouvellement, les icônes
et les pages internes : recherche, accès, chargements réessayables et conservation
du brouillon de bibliographie lors du remontage de l’interface.

La passe 0.7.0 ajoute six groupes : chargements progressifs et cache Bibliographies,
réponses tardives, délais/reprise, puis import/édition/annulation/export XSLT,
sauvegarde/restauration des projets et transformation MARC réelle dans Chromium.
Les contrôles vérifient que les modèles et la mise en page ne sont pas réinitialisés.

La passe 0.7.1 ajoute quatre groupes sur les scripts intégrés, les erreurs et
reprises, les changements de route pendant le chargement, les dépendances
facultatives et le diagnostic PMK. `npm run pages` ouvre et rouvre les vingt pages,
puis vérifie leurs accès personnel/superlibrarian avec un stockage natif simulé.
Son rapport est `validation/pages-access.json`. Il ne valide pas les traitements
métier ni les droits de production. Voir `../AUDIT-PAGES-PMK.md`.


La passe 0.8.0 retire le laboratoire : `npm run pages` ouvre les dix-neuf pages
restantes, dont Autorités inchangée. `npm run pages:universal` vérifie les réglages,
les anciennes valeurs conservées, les erreurs d’écriture, les profils MARC et
les appels simulés. `npm run sql:pages` vérifie six contrats SQL sur des données
synthétiques avec adaptation explicite de syntaxe SQLite ; une recette MariaDB
reste distincte. Les premiers tests réels Koha/plugin sont documentés dans
`../PLUGIN-KOHA-PMK.md` lorsqu’ils ont effectivement été exécutés.


La recette réelle du premier plugin est dans `npm run plugin:koha` (Koha local,
MariaDB et deux comptes synthétiques nécessaires, voir `../PLUGIN-KOHA-PMK.md`).
Elle couvre six scénarios, avec conservation du texte français, droits, conflits,
favoris et ouverture de PMK ; les appels externes du navigateur sont bloqués.
`npm run sql:koha` compile les six rapports via EXPLAIN sur le schéma MariaDB réel.
`npm run plugin:storage` conserve cinq contrats rapides avec API simulée.

Recette des stockages natifs : `node koha-native-data.cjs`, puis
`node koha-native-engines.cjs` et `node koha-shared-tools.cjs` sur le vrai Koha local.
Les émulateurs Firebase ne sont plus utilisés. Les accès externes sont bloqués
et toute tentative de connexion Firebase fait échouer les tests réels.
`python3 firebase-free.py` contrôle les sources livrées.

Après les suites réelles, `python3 koha-upgrade-preservation.py` téléverse le KPZ
exact puis compare les quatre tables et une clé serveur Nedap fictive avant/après
installation et appels du cycle de vie. La clé fictive est retirée ensuite et
les réglages du relais sont rétablis. Le test refuse une clé fournisseur réelle. Définir `PMK_RELEASE_KPZ` pour choisir le fichier. Cette commande est
réservée au conteneur de recette `pmk-koha-test-koha-1` et à sa base `koha_kohadev`.
Ne pas l’exécuter en parallèle des scénarios qui modifient les données.
`python3 release-proof.py --plugin /chemin/vers/le.kpz` agrège les preuves de la
version testée et refuse les résultats incomplets ou associés à un autre KPZ.


Recette 0.4.0 : `run-release.py` exécute séquentiellement les 17 suites Koha réelles et lie leurs résultats à l’empreinte du KPZ installé. `koha-migration.cjs` couvre la reprise globale, ses conflits, les droits de deux comptes et la restauration locale. `koha-universality.cjs` couvre les index, les zones MARC, les paramètres Autorités et l’arrêt global. `export-transition.cjs` exerce l’exportateur avec un ancien stockage simulé, sans contacter la production. `authorities-preservation.cjs` compare toutes les fonctions nommées de la page avancée avec le commit de référence 0.2.0. `compatibility-matrix.cjs` vérifie que la livraison distingue les parcours qualifiés des comptes fournisseurs et matériels restant à essayer sur site.

Le fichier `dev/migration/export-production.js` est un outil manuel réservé à l’installation historique ; il ne fait pas partie du chargement du plugin. La procédure d’exploitation est dans `TRANSITION-NON-PLUGIN-VERS-PLUGIN.md`.


Travail 0.4.0 : les preuves ciblées sont suivies dans `../SUIVI-AMELIORATIONS-0.4.0.md`. `catalogue-partial.cjs` vérifie les lectures partielles et 100 résultats de catalogue. `module-improvements.cjs` couvre les interactions et les limites de plusieurs modules. `nedap-widget.cjs` utilise un fournisseur simulé ; `nedap-provider.pl` se lance dans le conteneur Koha avec les modules du plugin dans `@INC` et simule toutes les réponses HTTP. `koha-nedap.cjs` contrôle les droits sur le vrai Koha local avec une clé fictive, sans appeler Libnet. Le relais nécessite une qualification fournisseur distincte (voir `../NEDAP-RELAIS-KOHA.md`).


Reprise du 27 octobre 2026 : `completion-configurations.cjs` couvre l’aperçu des
catégories, les priorités communes de colonnes, les rapports paginés, Z39.50 et
le cycle des widgets. `search-claims.cjs`, `autocomplete-responses.cjs`,
`suggester-dynamic.cjs` et `planning-refresh.cjs` couvrent les réponses tardives,
le clavier, les formulaires remplacés et la conservation des brouillons.
`koha-completion.cjs` utilise le formulaire natif d’édition d’adhérent, la vraie
API catalogue et le stockage du planning sur Koha 25.11 local. Il restaure les
réglages temporaires et ne soumet aucun adhérent ou document. Ces tests ne
qualifient pas encore la totalité de la version 0.4.0.
