# Compatibilité technique et limites — plugin expérimental PMK 0.4.0

Le plugin 0.4.0 est en cours de test. Cette matrice décrit les contrôles
automatiques et les essais techniques sur une instance Koha dédiée ; elle ne
constitue ni une qualification en production ni un retour d’exploitation en
établissement. Le mode non-plugin est actuellement le seul mode éprouvé en
situation réelle.

| Domaine | Niveau 0.4.0 | Portée vérifiée | Limite explicite |
|---|---|---|---|
| Koha | Essais techniques locaux | Koha 25.11 dédié, installation et réinstallation du paquet | Refaire la recette sur une copie de l’installation de l’établissement |
| Base de données | Essais techniques locaux | MariaDB 10.11, tables du plugin, transactions, conflits et conservation lors des essais | Confirmer sur une copie de la base cible et sauvegarder avant toute bascule |
| UNIMARC | Essais techniques locaux | Notices, exemplaires, XSLT, bibliographies, index et rapports sur le jeu de recette | Confirmer avec les grilles et données réelles de l’établissement |
| MARC21 | Compatible par configuration | Contrats de zones, index et grilles sans hypothèse UNIMARC imposée dans les options universalisées | Aucun jeu réel MARC21 complet n’a été qualifié dans cette session |
| Navigateur | Qualifié automatiquement | Chromium, clavier, affichage mobile simulé et erreurs réseau maîtrisées | Safari et Firefox n’ont pas reçu une recette exhaustive |
| Scanner et caméra | Compatible, matériel à qualifier | Flux caméra simulé, trois lectures concordantes, absence de validation automatique du formulaire | Lecture finale à faire sur le téléphone ou scanner réel de l’établissement |
| Impression | Compatible, matériel à qualifier | Mise en page et règles de coupure vérifiées dans le navigateur | Imprimante et pilote réels non testés |
| NEDAP / Libnet | Relais natif prêt | Destination fixe côté serveur, secret non renvoyé au navigateur, droits et erreurs contrôlés avec réponses simulées | Compte Libnet réel non disponible pendant la recette |
| Electre | Repli qualifié | Indisponibilité isolée et poursuite des bibliographies sans couverture Electre | Compte, images et quotas réels non testés |
| France Publications | Contrats qualifiés | SQL, données et états de périodiques vérifiés localement | Compte fournisseur et réclamations réelles non testés |
| EmailJS, catalogues et adresses externes | Facultatif | Échec isolé du reste de PMK et options configurables | Identifiants et services réels non testés |
| Stockage | Testé automatiquement | Configurations, données métier, historiques et secrets serveur dans Koha ; aucun SDK ni service Firebase requis | Confirmer la persistance sur l’instance de recette cible |
| Migration | Testée sur scénarios contrôlés | Export historique simulé, analyse, conflits, import, relecture et conservation après réinstallation | Aucune transition réelle vers le plugin n’est encore validée |

La maturité finale d’un module signifie ici : configuration compréhensible,
valeurs Dracénie conservées, personnalisations et clés inconnues préservées,
échec circonscrit, et recette ciblée sur ses risques réels. Elle ne signifie pas
une certification de chaque combinaison possible de version, fournisseur et
équipement. La validation terrain du plugin, de la migration, des services
externes et des équipements reste à effectuer avant toute mise en production.
