# Installer PimpMyKoha 0.4.0

Le paquet installable est **`plugin/PimpMyKoha-plugin-0.4.0.kpz`** dans le ZIP complet. Le code est qualifié sur Koha 25.11 professionnel / UNIMARC et MariaDB 10.11. Les preuves et limites figurent dans [la recette](RECETTE-PLUGIN-KOHA.md).

1. Sauvegarder Koha, les fichiers personnalisés et le contenu exact d’IntranetUserJS/IntranetUserCSS. Commencer sur une copie de la production.
2. Si PMK fonctionne déjà sans plugin, exécuter d’abord `dev/migration/export-production.js` comme décrit dans [la procédure de transition](TRANSITION-NON-PLUGIN-VERS-PLUGIN.md). Conserver le JSON privé et vérifier qu’il est complet.
3. Vérifier que les plugins sont autorisés (`enable_plugins`), puis téléverser le KPZ dans **Outils → Plugins** avec les permissions nécessaires. Koha peut nécessiter un rechargement des routes par redémarrage de Plack.
4. Ouvrir **PimpMyKoha → Configurer**. Une nouvelle installation garde ses modules en attente ; l’écran de préparation fonctionne indépendamment du chargeur historique. Une mise à jour conserve l’état du plugin déjà utilisé.
5. Pour une transition, analyser le JSON, télécharger la sauvegarde du plugin, importer puis vérifier la relecture. Le plugin reste en attente. Pour une installation entièrement neuve, choisir explicitement l’activation sans reprise.
6. Après recette et import final, retirer uniquement l’ancien chargeur PMK d’IntranetUserJS, puis activer le plugin depuis son écran de préparation. Recharger les postes. Les deux chargeurs ne doivent pas exécuter PMK simultanément.
7. La configuration courante est accessible depuis l’interface PMK et `/cgi-bin/koha/mainpage.pl?pmk_admin=1`. L’accueil des pages internes est `/cgi-bin/koha/mainpage.pl?pmk_page=hub`.

Le stockage des configurations, listes, rendez-vous, journal, compteurs et anciens référentiels Firebase est natif Koha. Aucun compte, SDK ni service Firebase n’est requis par le plugin, y compris pour les Autorités. Le script d’export historique, séparé et manuel, lit les anciens services uniquement pour préparer leur reprise.

Le gestionnaire **Données des modules — import / export** reste disponible pour les reprises individuelles. La transition globale suit une procédure distincte qui conserve l’ordre et les valeurs effectives de l’ancienne installation. Voir [Stockages natifs](MIGRATION-STOCKAGES-NATIFS.md) et [Transition complète](TRANSITION-NON-PLUGIN-VERS-PLUGIN.md).

Une réinstallation, une mise à jour ou la désinstallation ne supprime pas les tables PMK ni leurs historiques. Le JSON de migration ne remplace pas une sauvegarde complète de Koha.

Les intégrations facultatives, notamment NEDAP, Electre, EmailJS et France Publications, conservent leurs prérequis. Leur qualification avec des accès réels et les équipements physiques reste distincte des essais locaux. Leurs limites sont documentées dans [la matrice de compatibilité](COMPATIBILITE-PLUGIN-0.4.0.md).
