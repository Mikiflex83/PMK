# PMK 0.4.0 transitoire sans plugin

Cette distribution permet d’utiliser les scripts 0.4.0 par transfert de fichiers
tant que l’installation des plugins Koha n’est pas autorisée. Elle conserve les
projets Firebase historiques et ne modifie pas le paquet plugin, qui reste sans
Firebase.

## Installation

1. Sauvegarder le dossier de scripts actuel, `IntranetUserJS`, `IntranetUserCSS`
   et la base Koha.
2. Décompresser le ZIP puis copier le contenu de `PimpMyKoha-non-plugin` dans le
   dossier servi sous `/public/koha-scripts/`.
3. Copier `pmk-legacy-private-config.example.js` sous le nom `pmk-legacy-private-config.js`, puis y reporter localement les configurations Firebase de l’ancienne installation. Le fichier rempli reste privé et ne doit jamais être ajouté à Git ou à une archive publique. Le charger avant PMK si les anciennes applications ne sont pas déjà initialisées.
4. Remplacer le bloc qui charge individuellement les fichiers PMK par ce
   JavaScript brut :

```javascript
(function () {
    'use strict';
    if (window.__PMK_NON_PLUGIN_BOOTSTRAP__) return;
    window.__PMK_NON_PLUGIN_BOOTSTRAP__ = true;

    function loadPmk() {
        const script = document.createElement('script');
        script.src = '/public/koha-scripts/pmk-non-plugin-loader.js?v=0.4.0-transition.3';
        script.async = false;
        script.onerror = function () {
            console.error('PimpMyKoha : chargeur non-plugin inaccessible');
        };
        document.head.appendChild(script);
    }

    const privateConfig = document.createElement('script');
    privateConfig.src = '/public/koha-scripts/pmk-legacy-private-config.js';
    privateConfig.async = false;
    privateConfig.onload = loadPmk;
    privateConfig.onerror = function () {
        console.error('PimpMyKoha : configuration historique privée absente. Copiez et renseignez pmk-legacy-private-config.example.js avant de charger PMK.');
    };
    document.head.appendChild(privateConfig);
})();
```

Le fichier `IntranetUserJS-Dracenie.js` fourni dans l’archive reprend exactement ce bloc. Conservez séparément vos autres personnalisations `IntranetUserJS`.

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
et les projets Firebase historiques. Tester d’abord sur une copie de production.

Ne jamais activer simultanément cette distribution et le plugin.
