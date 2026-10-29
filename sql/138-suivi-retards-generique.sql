SELECT
-- PMK Gestion des retards — SOURCE GENERIQUE, Koha 25.11+ / MariaDB.
-- Ce rapport NE REPRODUIT PAS le règlement Dracénie du rapport historique 5261.
-- Il fournit un dossier par lecteur ayant un prêt en retard, classé « À contrôler ».
-- Le rapport 5261 existant reste la source par défaut ; aucun remplacement automatique.
-- Pour une autre installation : créer ce rapport privé, indiquer son ID dans PMK,
-- adapter les messages proposés, les colonnes et les règles d'étape à vos procédures.
-- Le seuil 35 jours ci-dessous sert uniquement aux colonnes de comptage/valeur.
-- Il est à adapter dans le SQL ; garder les alias ou configurer leur correspondance.
-- Un seul paramètre : Site adhérent|branches:all.
    bo.borrowernumber,
    bo.cardnumber AS `Carte lecteur`,
    bo.surname AS `Nom`,
    bo.firstname AS `Prénom`,
    bo.branchcode AS `Site lecteur`,
    bo.phone AS `Téléphone`,
    bo.email AS `Mail`,
    MIN(CASE WHEN c.date_due < CURDATE() THEN c.date_due END) AS `Plus ancien retour prévu`,
    MAX(GREATEST(0, DATEDIFF(CURDATE(), c.date_due))) AS `Retard max`,
    SUM(CASE WHEN DATEDIFF(CURDATE(), c.date_due) >= 35 THEN 1 ELSE 0 END) AS `Docs >= 35 j`,
    COUNT(c.issue_id) AS `Prêts actifs`,
    SUM(CASE WHEN DATEDIFF(CURDATE(), c.date_due) >= 35 THEN COALESCE(i.replacementprice, 0) ELSE 0 END)
        AS `Valeur docs >= 35 j`,
    'À contrôler' AS `Étape`,
    'Examiner les prêts et les messages Koha avant de choisir une action' AS `Action maintenant`,
    MAX(GREATEST(0, DATEDIFF(CURDATE(), c.date_due))) AS `Ancienneté`,
    bo.categorycode AS `Catégorie`,
    (SELECT GROUP_CONCAT(m.message ORDER BY m.message_date SEPARATOR ' | ')
        FROM messages m WHERE m.borrowernumber = bo.borrowernumber) AS `Suivi procédure`
FROM borrowers bo
JOIN issues c ON c.borrowernumber = bo.borrowernumber
LEFT JOIN items i ON i.itemnumber = c.itemnumber
CROSS JOIN (SELECT <<Site adhérent|branches:all>> AS code) selected_site
WHERE selected_site.code IN ('', '*', '__ALL__', '%') OR bo.branchcode = selected_site.code
GROUP BY bo.borrowernumber, bo.cardnumber, bo.surname, bo.firstname, bo.branchcode,
         bo.phone, bo.email, bo.categorycode
HAVING MAX(GREATEST(0, DATEDIFF(CURDATE(), c.date_due))) > 0
ORDER BY `Retard max` DESC, bo.surname, bo.firstname
