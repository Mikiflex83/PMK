SELECT
-- PMK — Maintenance des périodiques, Koha 25.11+ / MariaDB.
-- Rapport privé ; un paramètre « Après identifiant », valeur initiale manuelle 0.
-- Conserver les alias et renseigner l'ID du rapport dans PMK.
-- Lecture seule. Une ligne par abonnement ; aucun regroupement ne multiplie
-- les fascicules. Les codes de statut sont les codes natifs Koha.
-- Last_Arrived est la DATE DE PUBLICATION du dernier fascicule au statut reçu.
-- Ce champ est un repère d'inactivité, pas une preuve de la date de réception.
    s.subscriptionid AS Subscription_ID,
    s.biblionumber AS Biblio_ID,
    b.title AS Title,
    s.branchcode AS Library,
    s.startdate AS Start_Date,
    s.enddate AS End_Date,
    CASE WHEN s.closed = 1 THEN 'clos' ELSE 'actif' END AS Subscription_Status,
    s.closed AS Closed,
    s.graceperiod AS Grace_Days,
    NULL AS Renewed_Date,
    s.itemtype AS Item_Type,
    s.ccode AS Collection_Code,
    (SELECT COUNT(*) FROM serial x WHERE x.subscriptionid = s.subscriptionid)
        AS Serial_Count,
    (SELECT COUNT(*) FROM serial x WHERE x.subscriptionid = s.subscriptionid AND x.status = 1)
        AS Expected_Count,
    (SELECT COUNT(*) FROM serial x WHERE x.subscriptionid = s.subscriptionid AND x.status = 1
        AND x.planneddate < DATE_SUB(CURDATE(), INTERVAL COALESCE(s.graceperiod, 0) DAY))
        AS Overdue_Expected_Count,
    (SELECT COUNT(*) FROM serial x WHERE x.subscriptionid = s.subscriptionid AND x.status = 3)
        AS Late_Count,
    (SELECT COUNT(*) FROM serial x WHERE x.subscriptionid = s.subscriptionid AND x.status = 7)
        AS Claimed_Count,
    (SELECT COUNT(*) FROM serial x WHERE x.subscriptionid = s.subscriptionid AND x.status IN (4, 41, 42, 43, 44))
        AS Missing_Count,
    (SELECT MAX(x.publisheddate) FROM serial x WHERE x.subscriptionid = s.subscriptionid AND x.status = 2)
        AS Last_Arrived,
    (SELECT MIN(x.planneddate) FROM serial x WHERE x.subscriptionid = s.subscriptionid AND x.status = 1)
        AS Oldest_Expected,
    (SELECT MIN(x.claimdate) FROM serial x WHERE x.subscriptionid = s.subscriptionid AND x.status = 7)
        AS Oldest_Claimed,
    (SELECT MAX(x.planneddate) FROM serial x WHERE x.subscriptionid = s.subscriptionid)
        AS Last_Planned
FROM subscription s
LEFT JOIN biblio b ON b.biblionumber = s.biblionumber
WHERE s.subscriptionid > <<Après identifiant>>
ORDER BY s.subscriptionid
LIMIT 500
