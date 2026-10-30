# PMK 0.4.0 transitoire sans plugin

Cette distribution permet d’utiliser les scripts 0.4.0 par transfert de fichiers
tant que l’installation des plugins Koha n’est pas autorisée. Elle se connecte
uniquement aux projets Firebase créés et administrés par l’établissement. Le
paquet plugin reste sans Firebase.

> [!CAUTION]
> Cette distribution reste dépendante de Firebase. Chaque établissement doit
> créer, sécuriser et maintenir ses propres projets. Aucun identifiant Firebase
> Dracénie ni accès à une base partagée n’est fourni. Le passage au plugin
> supprime cette dépendance après export, import et validation de la reprise.

## Installation

1. Sauvegarder le dossier de scripts actuel, `IntranetUserJS`, `IntranetUserCSS`
   et la base Koha.
2. Décompresser le ZIP puis copier le contenu de `PimpMyKoha-non-plugin` dans le
   dossier servi sous `/public/koha-scripts/`.
3. Suivre [le guide Firebase](FIREBASE-NON-PLUGIN.md), puis copier `pmk-firebase-config.example.js` sous le nom `pmk-firebase-config.js` et y reporter les paramètres des projets appartenant à l’établissement. Le fichier rempli reste privé et ne doit jamais être ajouté à Git ou à une archive publique.

   Un administrateur Firebase reste responsable de la création des projets et
   de leurs règles. Un administrateur du serveur reste nécessaire pour déposer
   le fichier. Le diagnostic PMK affiche ensuite l’état des espaces communs au
   lieu d’enregistrer plusieurs connexions concurrentes dans les modules.
4. Remplacer le bloc qui charge individuellement les fichiers PMK par ce
   JavaScript brut :

```javascript
(function () {
    'use strict';
    if (window.__PMK_NON_PLUGIN_BOOTSTRAP__) return;
    window.__PMK_NON_PLUGIN_BOOTSTRAP__ = true;

    function loadPmk() {
        const script = document.createElement('script');
        script.src = '/public/koha-scripts/pmk-non-plugin-loader.js?v=0.4.0-transition.4';
        script.async = false;
        script.onerror = function () {
            console.error('PimpMyKoha : chargeur non-plugin inaccessible');
        };
        document.head.appendChild(script);
    }

    const privateConfig = document.createElement('script');
    privateConfig.src = '/public/koha-scripts/pmk-firebase-config.js';
    privateConfig.async = false;
    privateConfig.onload = loadPmk;
    privateConfig.onerror = function () {
        console.error('PimpMyKoha : configuration Firebase locale absente. Copiez et renseignez pmk-firebase-config.example.js avant de charger PMK.');
    };
    document.head.appendChild(privateConfig);
})();
```

Le fichier `IntranetUserJS-PMK.js` fourni dans l’archive reprend exactement ce bloc. Conservez séparément vos autres personnalisations `IntranetUserJS`.

5. Vider le cache du navigateur et ouvrir Koha avec un compte administrateur.
6. Vérifier dans PMK que les configurations personnalisées sont présentes avant
   tout enregistrement.

Le chargeur initialise d’abord l’adaptateur des configurations Firebase, puis
l’adaptateur des données métier, puis les scripts dans leur ordre déterministe.
Ces 113 sources sont groupées dans quelques ressources locales au démarrage afin
d’éviter 113 allers-retours HTTP et un fichier unique trop lourd à analyser. Les fichiers individuels restent disponibles
pour les fonctions chargées uniquement lorsqu’elles sont utilisées.
Ne pas conserver parallèlement les anciens appels individuels : un module ne doit
pas être exécuté deux fois.

## Sauvegarde et restauration

Dans PMK, ouvrir **Données des modules — import / export**.

- **Exporter configurations et données** produit la sauvegarde complète signée
  `pmk-transition-v1`, directement importable dans le plugin 0.4.0.
- **Exporter les configurations** produit une sauvegarde plus petite, réimportable
  dans cette distribution non-plugin et dans l’outil de configurations du plugin.
- **Analyser sans modifier** contrôle un fichier avant toute écriture.
- **Restaurer après sauvegarde automatique** télécharge d’abord l’état courant,
  fusionne les champs importés et conserve les clés inconnues déjà présentes.

La restauration non-plugin concerne les configurations. Les données métier
restent dans leurs bases Firebase et sont incluses dans l’export complet destiné
au plugin. Les données locales d’un navigateur doivent être exportées depuis
chaque profil qui contient des projets XSLT, brouillons ou inventaires privés.

## Limites transitoires

Les fonctions exigeant un composant serveur du plugin ne peuvent pas être
reproduites par un simple transfert JavaScript : restauration native
d’exemplaires, relais serveur NEDAP, diagnostics serveur des rapports et stockage
des secrets. Les autres modules continuent d’utiliser les API Koha disponibles
et les projets Firebase propres à l’établissement. Tester d’abord sur une copie de production.

Ne jamais activer simultanément cette distribution et le plugin.
