/*
 * Configuration PRIVÉE du mode non-plugin.
 *
 * Copiez ce fichier sous le nom pmk-legacy-private-config.js sur votre serveur,
 * renseignez les valeurs de vos propres applications Firebase et ne publiez
 * jamais le fichier rempli dans Git, un ticket ou une archive publique.
 */
window.PMK_FIREBASE_CONFIG = {
    apiKey: "VOTRE_CLE_WEB",
    authDomain: "VOTRE_DOMAINE_AUTH",
    projectId: "VOTRE_PROJET_CONFIGURATIONS",
    storageBucket: "VOTRE_BUCKET",
    messagingSenderId: "VOTRE_IDENTIFIANT_MESSAGERIE",
    appId: "VOTRE_IDENTIFIANT_APPLICATION"
};

window.PMK_LEGACY_NAMESPACE_CONFIGS = {
    attendance: { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" },
    appointments: { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" },
    journal: { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" },
    lists: { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" },
    taxonomy: { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" },
    planning: { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" },
    frequency: { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" },
    "internal-share": { apiKey: "", authDomain: "", databaseURL: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" },
    authorities: { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" }
};
