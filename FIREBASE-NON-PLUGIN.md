# Créer et connecter Firebase au mode non-plugin

Le mode non-plugin ne contient aucun identifiant Firebase Dracénie et ne se
connecte à aucune base PMK partagée. Chaque établissement utilise des projets
Firebase dont il est propriétaire et reste responsable de leur facturation, de
leurs sauvegardes, de leurs droits et de leur disponibilité.

## 1. Préparer le projet

1. Créer un projet dans la [console Firebase](https://console.firebase.google.com/)
   avec un compte institutionnel.
2. Ajouter une application **Web** au projet.
3. Activer **Cloud Firestore** dans la région choisie par l’établissement.
4. Activer **Realtime Database** uniquement si la fonction de partage interne
   est utilisée.
5. Dans les paramètres du projet, relever la configuration Web : `apiKey`,
   `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` et `appId`.
   Relever aussi `databaseURL` si Realtime Database est activée.

Un seul projet peut recevoir toutes les données PMK. Les établissements qui
veulent isoler certaines fonctions peuvent renseigner un projet différent pour
chaque espace dans `PMK_FIREBASE_NAMESPACE_CONFIGS`.

| Clé | Fonctions concernées | Service |
|---|---|---|
| `PMK_FIREBASE_CONFIG` | Configurations de tous les modules | Firestore |
| `attendance` | Compteur de fréquentation | Firestore |
| `appointments` | Rendez-vous et sondages | Firestore |
| `journal` | Journal des actions | Firestore |
| `lists` | Listes et modèles partagés | Firestore |
| `taxonomy` | Référentiels et arborescences | Firestore |
| `planning` | Planning | Firestore |
| `frequency` | Statistiques de fréquentation | Firestore |
| `internal-share` | Partage interne | Realtime Database |
| `authorities` | Données de la page Autorités utilisées hors plugin | Firestore |

Une clé d’espace peut reprendre `PMK_FIREBASE_CONFIG`, pointer vers un autre
projet de l’établissement ou être retirée lorsque la fonction n’est pas utilisée.
PMK ne cherche alors aucune base de remplacement et n’utilise jamais un projet
Dracénie par défaut.

## 2. Configurer PMK

### Droits nécessaires

La configuration ne peut pas être réalisée uniquement depuis PMK :

- un administrateur Firebase crée les projets, active les services et définit
  les règles d’accès ;
- un administrateur du serveur remplit puis dépose
  `pmk-firebase-config.js` dans `/public/koha-scripts/` ;
- le diagnostic PMK utilise ensuite les règles Firebase du navigateur. Un refus
  est affiché comme un échec et n’entraîne aucune modification des droits.

Si la même personne ne possède pas ces rôles, le modèle doit être transmis de
manière privée aux administrateurs concernés. Le fichier rempli ne doit pas être
joint à une Issue GitHub ni envoyé sur un canal public.

1. Copier `pmk-firebase-config.example.js` sous le nom
   `pmk-firebase-config.js`.
2. Remplacer uniquement les valeurs `VOTRE_...` par celles des projets de
   l’établissement.
3. Garder `PMK_FIREBASE_COLLECTION` à `pimpmykoha_modules` pour une nouvelle
   installation. Une installation PMK existante peut y indiquer le nom de sa
   collection actuelle afin de conserver ses configurations.
4. Copier le fichier rempli sur le serveur avec les autres fichiers PMK, sans
   l’ajouter à Git ni à une archive publique.
5. Charger ce fichier avant `pmk-non-plugin-loader.js`, comme le fait
   `IntranetUserJS-PMK.js`.

Une fois PMK chargé, ouvrir **Données des modules — import / export**, puis
utiliser **Tester les projets configurés**. Le diagnostic affiche le projet de
chaque espace et indique `OK`, `Non configuré` ou `Échec`, sans afficher les
clés. Ce test est en lecture seule et ne modifie ni les règles ni les données.

La configuration Web Firebase est transmise au navigateur par conception. Une
clé Web Firebase n’est donc pas un mot de passe et ne remplace jamais les règles
de sécurité.

## 3. Sécuriser les données

Ne laissez jamais Firestore ou Realtime Database en mode test avec une règle
publique permanente telle que `allow read, write: if true`. Avant l’ouverture :

- définir une méthode d’authentification adaptée à l’établissement ;
- limiter les lectures et écritures aux comptes et chemins nécessaires ;
- activer App Check lorsque l’architecture retenue le permet ;
- tester les refus avec un navigateur non authentifié ;
- organiser les sauvegardes et la suppression des comptes ayant quitté
  l’établissement.

PMK ne publie pas de règle universelle : une règle sûre dépend du système
d’authentification, des modules activés et du partage attendu entre agents.
Faites valider les règles par l’administrateur Firebase avant de stocker des
données réelles. Le mode non-plugin ne doit pas servir de mécanisme de stockage
de secrets.

## 4. Vérifier la connexion

Après installation, ouvrir PMK avec un compte de test et vérifier :

1. qu’une configuration de module peut être enregistrée puis relue après
   rechargement de la page ;
2. que les fonctions activées écrivent seulement dans le projet attendu ;
3. qu’aucun projet inconnu n’apparaît dans l’onglet Réseau du navigateur ;
4. qu’un utilisateur non autorisé reçoit bien un refus Firebase ;
5. qu’un export complet PMK peut être téléchargé et conservé hors de Firebase.

Une erreur « projet Firebase local non configuré » indique que l’espace demandé
est absent de `PMK_FIREBASE_NAMESPACE_CONFIGS`. Une erreur `permission-denied`
indique que la connexion atteint le bon projet mais que ses règles refusent
l’opération.

## 5. Passer ultérieurement au plugin

Le plugin PMK n’utilise pas Firebase. Avant la transition, produire l’export
complet depuis le mode non-plugin, l’analyser dans le plugin sur une copie de
Koha, puis contrôler la relecture de toutes les configurations et données. Les
projets Firebase restent sous le contrôle de l’établissement et ne doivent être
supprimés qu’après validation et sauvegarde de la migration.
