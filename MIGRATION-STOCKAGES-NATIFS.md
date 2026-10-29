> Pour passer d’une installation non plugin au plugin 0.4.0, suivre d’abord [la procédure de transition complète](TRANSITION-NON-PLUGIN-VERS-PLUGIN.md). Le nouvel exportateur est `dev/migration/export-production.js`.

# Stockages natifs PMK — plugin 0.4.0

Le plugin ne charge plus aucun SDK Firebase et n’appelle plus Firestore, Realtime
Database ou Firebase Authentication. Les données sont enregistrées dans la base
MariaDB de votre Koha ; l’identification provient de la session professionnelle.
Les anciens paramètres de connexion présents dans un export restent des données
inertes : ils ne déclenchent aucun accès distant.

## Moteurs remplacés

| Espace local | Fonctions concernées | Chemins conservés |
| --- | --- | --- |
| attendance | Compteur de fréquentation, page et fenêtre flottante | collections de lieux et comptages configurées |
| appointments | Rendez-vous, sondages et widget d’accueil | settings, themes, slots, bookings, polls, pollResponses, participants, recurrenceRules ; noms personnalisables |
| journal | Journal des actions et son historique fonctionnel | collections d’entrées et versions configurées |
| lists | Listes personnelles et modèles de bibliographies | profiles/{profil}/lists/{liste}/entries/{entrée} et profiles/{profil}/bibliographyTemplates/{modèle} |
| taxonomy | Assistants 109/110, filtres 075/122, arborescence du désherbage | treeData et collections de mémorisations existantes |
| planning | Widget Planning des services | planning/config |
| frequency | Configuration du widget de fréquentation | noms de collection et document conservés |
| internal-share | Demandes de partage interne et compteur d’utilisation | shares/{id}, stats/usage_count |
| authorities | Espace réservé aux données d’autorités importées | identifiants conservés lors d’un import |

Les autorités ne chargent plus l’ancien système d’apprentissage. Les règles,
exceptions locales et fonctions de contrôle, fusion et enrichissement restent
présentes. Aucune décision locale n’est envoyée à un service externe.

## Reprendre les données existantes

Une installation du plugin ne peut pas deviner le contenu d’un ancien projet.
Conservez vos exports avant la bascule. Aucun ancien projet, réglage ou fichier
local n’est effacé par ce plugin. Les configurations et données personnelles de
votre établissement ne sont pas incluses dans le paquet de code.

1. Ouvrir **Configurer** dans le gestionnaire de plugins Koha, puis l’accueil de
   la configuration PMK.
2. Cliquer **Données des modules — import / export**.
3. Choisir le module correspondant au fichier exporté.
4. Choisir le JSON, puis **Analyser le fichier**. Cette étape ne modifie aucune
   donnée ; elle annonce les documents absents et ceux déjà présents.
5. Cliquer **Importer les documents absents**. Les identifiants, dates, champs
   inconnus et sous-collections sont conservés. Un document déjà présent reste
   intact. Une création concurrente fait échouer le lot concerné au lieu de
   remplacer son contenu.
6. Exporter à nouveau les données natives, vérifier les résultats puis conserver
   les deux sauvegardes. Si l’import s’interrompt, les lots précédents restent
   enregistrés ; une nouvelle analyse permet de reprendre les documents absents.

Pour un export d’une installation Koha PMK, utiliser le JSON natif produit par
le bouton **Exporter les données**. Le format indépendant des fournisseurs est :

```json
{
  "format": "pmk-native-data-v1",
  "namespace": "journal",
  "documents": [
    {"path": "entries/ancien-identifiant", "data": {"desc": "Texte conservé", "deleted": false}}
  ]
}
```

Sont également acceptés les JSON Firestore REST comportant `documents`, `name`
et `fields`, les exports JSON structurés avec `__collections__`, ainsi que le
JSON RTDB `shares`/`stats.usage_count` du partage interne. Les sous-collections
sont transformées en chemins locaux sans renuméroter les documents. Les dates
REST, les formes `seconds`/`nanoseconds` et `_seconds`/`_nanoseconds` sont prises
en charge. Les nanosecondes et les grands entiers textuels sont conservés.
Un export binaire officiel Firestore nécessite une conversion JSON préalable ;
il ne doit pas être sélectionné directement dans cet outil.

Les noms de collections personnalisés doivent correspondre aux réglages PMK
avant l’ouverture du module. Les listes conservent leurs profils logiques
existants : l’accès aux stockages exige désormais une session professionnelle
Koha, sans compte ou mot de passe supplémentaire.

## Reprendre les configurations

Dans le même outil, choisir **Configurations PMK**. Accepter un export PMK
`{"moduleId":"identifiant","config":{...}}` ou un export regroupé `documents`.
L’analyse ne sauvegarde rien. Le bouton suivant applique les réglages importés :
les champs personnalisés absents de l’import et les lignes supplémentaires
identifiées sont conservés. Les lignes portant le même identifiant sont
fusionnées ; les choix importés sont prioritaires. L’ancienne version complète
est archivée côté serveur avant toute modification. Recharger la page après
l’import. Les favoris personnels ne sont pas importés sous l’identité d’autrui.

Les valeurs par défaut Dracénie concernant le fonctionnement et la présentation
restent dans les définitions des modules. Les anciens identifiants techniques
(`firebase_legacy`, par exemple) restent acceptés dans les configurations pour
leur compatibilité, mais désignent maintenant le référentiel local.

## Droits, transactions et sauvegardes

Les accès nécessitent une session Koha disposant du droit catalogue. Les exports
globaux, imports et configurations partagées sont réservés aux superlibrarians.
Les référentiels d’arborescence, plannings, paramètres de fréquentation, lieux de
comptage et éléments administrables des rendez-vous sont protégés côté serveur.
Les anciens codes de gestion ne donnent aucun droit API.

Les écritures de transaction comparent les révisions relues. Les lots SQL sont
atomiques : en cas d’échec, toutes leurs écritures sont annulées. Les conflits et
interblocages InnoDB peuvent être rejoués par le moteur de transaction. Les
suppressions conservent une révision afin d’éviter qu’une recréation concurrente
soit assimilée à une première création.

Les quatre tables sont `koha_plugin_pimpmykoha_documents`,
`koha_plugin_pimpmykoha_history`, `koha_plugin_pimpmykoha_data` et
`koha_plugin_pimpmykoha_data_history`. Installation, mise à jour et désinstallation
ne vident aucune de ces tables. Les données et historiques doivent être inclus
dans les sauvegardes habituelles de la base Koha ; le KPZ n’en contient pas.

Les mises à jour des autres postes sont relues toutes les quatre secondes et
au retour sur l’onglet. Les abonnements sont arrêtés au démontage des pages.
Les collections sont paginées, sans arrêt silencieux au premier millier de lignes.

Les services Electre, EmailJS facultatif, NEDAP, catalogues et adresses ne sont
pas Firebase. Leurs intégrations existantes restent distinctes de cette migration.
