/*
 * Configuration PRIVÉE du mode non-plugin.
 *
 * Copiez ce fichier sous le nom pmk-firebase-config.js sur votre serveur,
 * renseignez les valeurs de VOTRE propre projet Firebase et ne publiez
 * jamais le fichier rempli dans Git, un ticket ou une archive publique.
 *
 * PMK ne fournit aucun projet Firebase partagé. Consultez
 * FIREBASE-NON-PLUGIN.md avant de créer la base et ses règles de sécurité.
 */
window.PMK_FIREBASE_CONFIG = {
    apiKey: "VOTRE_CLE_WEB",
    authDomain: "VOTRE_DOMAINE_AUTH",
    projectId: "VOTRE_PROJET_CONFIGURATIONS",
    storageBucket: "VOTRE_BUCKET",
    messagingSenderId: "VOTRE_IDENTIFIANT_MESSAGERIE",
    appId: "VOTRE_IDENTIFIANT_APPLICATION"
};

/* Collection Firestore qui recevra les configurations des modules. */
window.PMK_FIREBASE_COLLECTION = "pimpmykoha_modules";

/*
 * Par défaut, toutes les fonctions utilisent le même projet. Vous pouvez
 * remplacer une ligne par la configuration d'un autre projet dont vous êtes
 * propriétaire. internal-share nécessite aussi databaseURL si cette fonction
 * utilise Firebase Realtime Database.
 */
window.PMK_FIREBASE_NAMESPACE_CONFIGS = {
    attendance: { ...window.PMK_FIREBASE_CONFIG },
    appointments: { ...window.PMK_FIREBASE_CONFIG },
    journal: { ...window.PMK_FIREBASE_CONFIG },
    lists: { ...window.PMK_FIREBASE_CONFIG },
    taxonomy: { ...window.PMK_FIREBASE_CONFIG },
    planning: { ...window.PMK_FIREBASE_CONFIG },
    frequency: { ...window.PMK_FIREBASE_CONFIG },
    "internal-share": { ...window.PMK_FIREBASE_CONFIG, databaseURL: "VOTRE_URL_REALTIME_DATABASE" },
    authorities: { ...window.PMK_FIREBASE_CONFIG }
};
