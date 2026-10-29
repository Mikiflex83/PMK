# Compatibilité et limites qualifiées — plugin PMK 0.4.0

Cette matrice fixe la maturité retenue pour la livraison. Elle distingue les
parcours exécutés sur une vraie installation Koha locale des contrats vérifiés
sur des données simulées. Une intégration facultative non testée avec le compte
réel de l’établissement ne bloque pas les autres modules.

| Domaine | Niveau 0.4.0 | Portée vérifiée | Limite explicite |
|---|---|---|---|
| Koha | Qualifié localement | Koha 25.11, plugin installé et réinstallé par le gestionnaire natif | Faire une recette avant toute autre version majeure de Koha |
| Base de données | Qualifié localement | MariaDB 10.11, tables du plugin, transactions, conflits et conservation lors d’une mise à jour | Sauvegarder la base de production avant la bascule |
| UNIMARC | Qualifié localement | Notices, exemplaires, XSLT, bibliographies, index et rapports sur une installation UNIMARC | Les zones locales restent configurables |
| MARC21 | Compatible par configuration | Contrats de zones, index et grilles sans hypothèse UNIMARC imposée dans les options universalisées | Aucun jeu réel MARC21 complet n’a été qualifié dans cette session |
| Navigateur | Qualifié automatiquement | Chromium, clavier, affichage mobile simulé et erreurs réseau maîtrisées | Safari et Firefox n’ont pas reçu une recette exhaustive |
| Scanner et caméra | Compatible, matériel à qualifier | Flux caméra simulé, trois lectures concordantes, absence de validation automatique du formulaire | Lecture finale à faire sur le téléphone ou scanner réel de l’établissement |
| Impression | Compatible, matériel à qualifier | Mise en page et règles de coupure vérifiées dans le navigateur | Imprimante et pilote réels non testés |
| NEDAP / Libnet | Relais natif prêt | Destination fixe côté serveur, secret non renvoyé au navigateur, droits et erreurs contrôlés avec réponses simulées | Compte Libnet réel non disponible pendant la recette |
| Electre | Repli qualifié | Indisponibilité isolée et poursuite des bibliographies sans couverture Electre | Compte, images et quotas réels non testés |
| France Publications | Contrats qualifiés | SQL, données et états de périodiques vérifiés localement | Compte fournisseur et réclamations réelles non testés |
| EmailJS, catalogues et adresses externes | Facultatif | Échec isolé du reste de PMK et options configurables | Identifiants et services réels non testés |
| Stockage | Qualifié localement | Configurations, données métier, historiques et secrets serveur dans Koha ; aucun SDK ni service Firebase requis | L’import réel dépend du fichier exporté par l’ancienne installation |
| Migration | Qualifiée sur scénarios contrôlés | Export historique simulé, analyse, conflits, import, relecture et conservation après réinstallation | Aucun export de production Dracénie n’a été fourni à cette session |

La maturité finale d’un module signifie ici : configuration compréhensible,
valeurs Dracénie conservées, personnalisations et clés inconnues préservées,
échec circonscrit, et recette ciblée sur ses risques réels. Elle ne signifie pas
une certification de chaque combinaison possible de version, fournisseur et
équipement. Les deux qualifications encore dépendantes du terrain sont le compte
Libnet réel et la caméra ou le scanner physique.
