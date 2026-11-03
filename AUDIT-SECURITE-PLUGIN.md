# Préparer l’audit de sécurité du plugin

Le billet KTD explique comment développer et tester un plugin sur une installation Koha isolée. Il ne définit pas la procédure d’audit de sécurité d’un hébergeur et ne délivre aucun certificat.

Pour demander l’autorisation d’installation, transmettre à l’auditeur un dossier stable comprenant :

1. l’URL du dépôt public et le tag exact à auditer ;
2. le KPZ construit depuis ce tag et son empreinte SHA-256 ;
3. la version minimale et les versions Koha testées ;
4. [l’architecture du plugin](PLUGIN-KOHA-PMK.md), ses tables, ses routes API et ses permissions Koha ;
5. la liste des services externes facultatifs et des données qui peuvent leur être envoyées ;
6. les dépendances et licences recensées dans `THIRD_PARTY_NOTICES.md` ;
7. les résultats KTD, Perl, QA, navigateur et régression ;
8. les comportements d’installation, mise à jour et désinstallation, notamment la conservation volontaire des tables PMK ;
9. les limites connues et les fonctions qui nécessitent encore une qualification locale ;
10. la procédure privée de signalement décrite dans `SECURITY.md`.

Les éléments à mettre particulièrement en évidence pour PMK sont :

- toutes les routes déclarent une autorisation Koha ;
- les écritures partagées sont vérifiées côté serveur et ne reposent pas sur l’interface JavaScript ;
- le plugin utilise la session Koha et ne stocke pas de mot de passe Koha ;
- Firebase n’est pas utilisé par le plugin ;
- les clés de services facultatifs ne doivent jamais apparaître dans le dépôt, le KPZ ou un rapport public ;
- les imports et restaurations doivent être testés avec des données synthétiques ;
- la désinstallation conserve les tables et historiques afin d’éviter une perte de données, ce qui doit être accepté explicitement par l’exploitant.

Le rapport de recette actuel est dans `RECETTE-PLUGIN-KOHA.md` et la procédure reproductible dans `KTD-PLUGIN-VALIDATION.md`. Ces documents constituent des pièces d’entrée pour l’audit. Seul l’auditeur peut prononcer l’acceptation du plugin sur l’installation hébergée.
