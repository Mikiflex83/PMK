# État de livraison — 28 octobre 2026

Le plugin PimpMyKoha 0.4.0 est qualifié sur l’instance locale dédiée Koha 25.11
UNIMARC et MariaDB 10.11. Le KPZ exact contient 110 scripts, 163 ressources,
86 configurations et 19 pages. Son empreinte SHA-256 est
`a31e436d814330e1a4064e8e8f6f9e445fe385cfc5b39e76f4bd825949c44846`.

Les 17 suites séquentielles, les 20 groupes de preuve de livraison, les 79 groupes
de régression et la réinstallation native passent. Les quatre tables PMK et un
secret serveur synthétique restent identiques avant et après la réinstallation.
Le contrôle de 152 scripts trouve zéro appel Firebase et zéro import de SDK
Firebase. La restauration d’exemplaires utilise le moteur natif du plugin sans
dépendre de l’autre plugin de restauration.

Le registre `dev/requirements-0.4.0.json` compte 110 demandes validées sur leur
périmètre et deux demandes partielles. Ces deux limites exigent une ressource qui
n’est pas disponible dans la session : un téléphone ou scanner physique pour la
lecture finale, et le compte Libnet réel de l’établissement. Les réponses NEDAP
simulées, le relais Koha, les droits et la conservation du secret sont vérifiés.

La page Autorités conserve ses moteurs métier protégés. Seuls son ancien accès
d’apprentissage distant et ses contrôles devenus sans effet ont été retirés.
Les valeurs Dracénie, les personnalisations et les clés inconnues sont conservées
par les formulaires, les migrations et les tests de réinstallation.

Les fichiers de référence sont :

- `RECETTE-PLUGIN-KOHA.md` pour les parcours réellement exécutés ;
- `COMPATIBILITE-PLUGIN-0.4.0.md` pour les limites de compatibilité ;
- `TRANSITION-NON-PLUGIN-VERS-PLUGIN.md` pour la bascule invisible ;
- `SUIVI-AMELIORATIONS-0.4.0.md` pour la maturité de chaque demande ;
- `tests/validation/koha-final-run.json` pour l’empreinte et les preuves.

Aucune donnée de production ni aucun identifiant fournisseur n’est intégré au
KPZ ou au ZIP complet. L’établissement doit produire son export depuis l’ancienne
installation, le conserver, puis l’analyser et l’importer depuis le plugin.
