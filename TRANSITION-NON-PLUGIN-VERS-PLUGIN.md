# Transition de PMK non plugin vers le plugin 0.4.0

Le script à exécuter sur la production est **`dev/migration/export-production.js`**. Pour une installation neuve sans PMK antérieur, le même écran propose une activation explicite sans import.

Le plugin contient ensuite un écran **Transition vers le plugin — import global**. L’exportateur lit l’installation réellement chargée ; il ne remplace pas vos paramètres par ceux du ZIP de développement.

L’objectif est de préparer la reprise pendant que l’ancienne installation fonctionne, puis de remplacer son chargeur une seule fois. Aucun accès à votre production n’a été effectué pendant le développement. La fidélité à votre production doit être confirmée par l’export réel et la recette sur sa copie.

## 1. Sauvegarder l’installation actuelle

1. Conserver une sauvegarde Koha complète (base et fichiers), ainsi que le contenu exact de **IntranetUserJS**, **IntranetUserCSS** et les fichiers personnalisés servis par votre hébergement. Le fichier JSON PMK ne remplace pas cette sauvegarde.
2. Se connecter comme administrateur sur le Koha de production, avec l’ancien PMK chargé. Attendre la fin du chargement de ses réglages.
3. Ouvrir le fichier `dev/migration/export-production.js`, copier son contenu entier, le coller dans la console du navigateur puis l’exécuter. Un panneau « Sauvegarder PMK avant le passage au plugin » apparaît.
4. Cliquer sur **Enregistrer la sauvegarde complète**. Conserver le JSON téléchargé dans un emplacement privé : il contient vos données métier. Il ne doit pas être ajouté au dépôt Git.
5. L’écran doit annoncer **Sauvegarde terminée**. Si la sauvegarde est partielle, ne pas basculer : le fichier contient le détail des lectures refusées ou impossibles. Le plugin refuse un fichier incomplet.

L’export ne modifie ni exemplaire, ni configuration distante, ni donnée métier. Il ne charge aucun nouveau SDK. Il peut utiliser les sessions de l’ancien service déjà ouvertes dans ce navigateur pour lire vos données ; il ne met aucun jeton d’authentification dans le JSON. Une session expirée ou des règles d’accès insuffisantes peuvent empêcher une lecture. Ouvrir alors le module concerné avec ses accès habituels, puis relancer l’export. Si vos droits ne permettent pas un export complet, faire effectuer l’export par l’administrateur de l’ancien stockage ; ne pas contourner ces droits.

L’export capture :

- les configurations PMK effectives, leurs anciens défauts disponibles et les documents bruts, y compris les clés inconnues et les configurations de modules désactivés ;
- les données des listes et leurs entrées, modèles de bibliographies, compteur, rendez-vous, journal, arborescence et mémorisations, planning, fréquentation et partage interne ;
- les identifiants, dates, champs supplémentaires et listes dans leur ordre d’origine ;
- les données PMK de ce navigateur : réglages locaux, projets XSLT, brouillons, travaux d’inventaire et de désherbage ;
- les favoris partagés de l’ancien stockage lorsqu’ils sont accessibles. Une correspondance exacte avec un compte Koha est recherchée et sera recontrôlée à l’import. Une identité ambiguë exige une attribution explicite.

Les collections métier usuelles du commit initial `fd7ab32` sont connues. Les noms de collections personnalisés exposés par la configuration sont également recherchés. Pour une installation ayant ajouté d’autres projets ou collections hors de ces réglages, l’exportateur accepte `window.PMK_LEGACY_EXPORT_OPTIONS` avec `projects`, `collections` et, si nécessaire, `rtdbUrl`. `localStorageKeys` et `databaseNames` permettent d’inclure d’autres clés ou bases locales ajoutées hors des conventions PMK. Les exclusions ne sont acceptées qu’avec une raison explicite dans `exclusionReasons`. Un stockage exclu n’est pas présenté comme migré. Le partage RTDB brut est aussi gardé dans l’archive pour conserver les champs historiques qui ne sont plus exploités.

Les cookies, mots de passe, sessions et caches d’authentification sont exclus. Les paramètres nécessaires d’un service facultatif présents dans vos configurations sont conservés : traiter donc toute l’archive comme un document privé.

## 2. Préparer le plugin sans changer l’interface des agents

1. Commencer sur une **copie de la production**, avec les mêmes rapports, grilles, valeurs autorisées, permissions et préférences Koha. Le périmètre qualifié est Koha 25.11 / UNIMARC.
2. Installer `PimpMyKoha-plugin-0.4.0.kpz`. Sur une nouvelle installation, son exécution est en attente. Une mise à jour d’un plugin déjà utilisé conserve son état.
3. Dans Koha, ouvrir **Plugins → PimpMyKoha → Configurer**. Cet écran de préparation charge uniquement les outils de reprise, même quand les modules PMK sont en attente. Il reste utilisable sans remplacer l’ancien chargeur.
4. Si nécessaire cliquer **Mettre le plugin en attente**. Cela concerne les prochains chargements : les anciens scripts et leurs données continuent à fonctionner. Les onglets déjà ouverts doivent être rechargés lors de la bascule finale.
5. Choisir le JSON, puis **Analyser sans modifier**. Les données déjà identiques sont reconnues ; les documents métier différents déjà présents bloquent l’import. Les identités de favoris non résolues doivent être attribuées dans le champ prévu, à un numéro interne de compte Koha.
6. Cliquer **Télécharger la sauvegarde du plugin**, puis **Importer et contrôler**. Les configurations sont appliquées dans une transaction SQL avec contrôle de révision. Les données métier sont importées par lots, relus ensuite. Le plugin reste en attente après succès.

Une concurrence ou une interruption ne doit pas produire un faux message de réussite. Après un arrêt, résoudre la cause et refaire l’analyse du même fichier : les documents métier déjà repris et identiques sont conservés. Aucun remplacement silencieux de données métier différentes n’est proposé. Les anciennes configurations du plugin sont également archivées dans son historique SQL.

La sauvegarde « avant reprise » est un état de secours et de comparaison contenant aussi les favoris, réservé à l’administrateur. Ce fichier n’est pas une commande d’annulation automatique. Pour revenir à l’installation antérieure, laisser le plugin en attente et rétablir son ancien chargeur conservé ; les anciens stockages n’ont pas été modifiés par l’export ou l’import. Une restauration intégrale de Koha relève de la sauvegarde de base et de fichiers.

## 3. Conserver les données de chaque navigateur

Sur le même domaine et le même profil de navigateur, les clés locales restent présentes : laisser **Restaurer aussi les données de ce navigateur** décoché évite de les réimporter inutilement. Les réglages partagés sont, eux, repris une seule fois dans Koha.

Pour un nouveau poste/profil, exporter aussi l’ancien navigateur et cocher cette option à l’import. Les bases locales identiques sont conservées, celles qui diffèrent bloquent l’opération. Dates, clés IndexedDB et données binaires sont restaurées. Un changement de domaine doit être confirmé explicitement.

Un navigateur ne peut pas lire les brouillons privés des autres navigateurs. Les récupérer exige donc un export depuis chacun des profils concernés. Le script ne peut pas restaurer un brouillon jamais sauvegardé, ni les données d’un poste auquel vous n’avez pas accès. L’archive d’un poste conservée telle quelle permet de préparer sa reprise ultérieure.

## 4. Listes et favoris : préserver la propriété

Le mode par défaut reste **Profils nommés partagés (historique)** : les anciens noms, listes et modèles restent accessibles de la même façon. Ce mode ne prétend pas que le nom choisi est une preuve d’identité.

Le mode **Compte Koha connecté — privé** est une option distincte. Le serveur impose alors la propriété du profil `koha_<numéro interne>` : changer un nom dans le navigateur ne donne pas accès aux listes d’un autre compte. Le panneau de transition propose d’analyser puis de copier explicitement un profil historique vers un compte réel Koha. L’ancien profil n’est jamais supprimé ; une cible déjà remplie bloque la copie. Les modèles de bibliographies sont copiés avec les listes.

Les favoris de menus sont des données personnelles séparées des réglages globaux. Leurs correspondances historiques sont vérifiées avec les comptes de l’installation cible. Un simple nom affiché n’est jamais utilisé comme preuve d’identité.

## 5. Recette puis bascule

Vérifier sur la copie de production, avec un compte administrateur et un compte agent : accueil, menus et favoris, fiche adhérent, prêts/retours, réservations, recherche et détail catalogue, catalogage et arborescence, listes et bibliographies, projets XSLT, pages internes utilisées, compteurs et modules facultatifs. Comparer les règles et valeurs effectives avant/après, pas seulement les intitulés des formulaires.

Avant l’import final de production, arrêter brièvement les modifications de réglages et les saisies dans les outils PMK partagés, faire un **dernier export**, puis importer et relire ce même fichier. Cela évite que l’ancien stockage évolue entre sauvegarde et bascule. Les opérations Koha natives ne sont pas réimportées par PMK.

Après confirmation de la recette et de la reprise finale, retirer uniquement l’ancien chargeur PMK de IntranetUserJS, conserver les autres personnalisations, puis activer le plugin depuis l’écran de préparation. Recharger les postes. Ne jamais laisser les deux chargeurs exécuter PMK en parallèle.

Le script ne modifie pas automatiquement les préférences système de votre production et n’active pas le plugin à votre place. Il ne peut donc pas garantir à distance une bascule invisible avant cette recette. Les corrections prévues par l’audit (dont le retrait des anciens relais 091/093 vers des URL non natives) constituent des différences documentées, pas une perte de configuration.

France Publications, NEDAP, EmailJS, Electre et les équipements physiques gardent leurs prérequis propres. Aucun de ces services n’est requis pour stocker les configurations PMK dans le plugin ; Firebase ne fait plus partie de son exécution.
