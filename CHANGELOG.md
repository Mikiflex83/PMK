# Journal des versions

Les changements majeurs de PimpMyKoha sont consignés dans ce fichier.

## [0.4.0] - 2026-10-29

### Ajouté

- Plugin Koha installable contenant 87 modules, les pages internes et les ressources PMK.
- Stockage natif Koha pour les configurations et les données métier du plugin.
- Export contrôlé du mode non-plugin et import global avec analyse, sauvegarde et contrôle des conflits.
- Restauration native et transactionnelle d’exemplaires sans dépendance à un autre plugin.
- Moteurs communs pour les menus, les dates, le planning, les diagnostics et les imports.
- Paquet non-plugin transitoire permettant de conserver les configurations historiques avant migration.

### Modifié

- Universalisation des modules, pages, sélecteurs, rapports, valeurs MARC et options propres aux installations.
- Conservation des valeurs historiques par défaut et des clés de configuration inconnues.
- Amélioration des interfaces de configuration, des diagnostics, de l’accessibilité et des états de chargement.

### Sécurité

- Suppression de toute dépendance Firebase dans le plugin.
- Stockage serveur des secrets et contrôle des droits Koha pour les opérations sensibles.
- Nettoyage des identifiants privés dans les sources et les distributions publiques.
- Ajout d’un contrôle de publication contre les secrets et identifiants connus.

### Limites connues

- Qualification finale à effectuer avec le compte NEDAP/Libnet réel de l’installation.
- Lecture caméra à confirmer sur le matériel mobile utilisé en production.
- Migration exacte à confirmer avec un export réel et une recette sur une copie de la production.

