SELECT
-- PMK — Transferts / navette, Koha 25.11+ / MariaDB.
-- Créer un rapport privé, conserver les alias, renseigner son ID dans PMK.
-- Un paramètre : « Après identifiant ». Pour une exécution manuelle, commencer à 0.
-- Pagination par identifiant ; aucun exemplaire n'est modifié.
-- « Already_Searched_At » est facultatif : remplacer NULL seulement si vous
-- possédez une colonne réelle correspondante. Le champ API est réglable dans PMK.
    t.branchtransfer_id AS Transfer_ID,
    t.itemnumber AS Item_ID,
    i.biblionumber AS Biblio_ID,
    i.barcode AS Barcode,
    b.title AS Title,
    t.frombranch AS From_Site,
    t.tobranch AS To_Site,
    t.daterequested AS Requested,
    t.datesent AS Sent,
    t.datearrived AS Arrived,
    t.datecancelled AS Cancelled,
    t.reason AS Reason,
    t.cancellation_reason AS Cancellation_reason,
    i.homebranch AS Home_Library,
    i.holdingbranch AS Holding_Library,
    i.location AS Location,
    i.permanent_location AS Permanent_Location,
    i.ccode AS Collection_Code,
    i.itype AS Item_Type,
    i.datelastseen AS Last_Seen,
    NULL AS Already_Searched_At,
    i.itemlost AS Lost_Status,
    i.damaged AS Damaged_Status,
    i.withdrawn AS Withdrawn,
    i.notforloan AS Not_For_Loan,
    EXISTS(SELECT 1 FROM issues c WHERE c.itemnumber = t.itemnumber)
        AS Checkout_Active,
    (SELECT COUNT(*) FROM reserves r WHERE r.biblionumber = i.biblionumber)
        AS Active_Hold_Count
FROM branchtransfers t
LEFT JOIN items i ON i.itemnumber = t.itemnumber
LEFT JOIN biblio b ON b.biblionumber = i.biblionumber
WHERE t.branchtransfer_id > <<Après identifiant>>
  AND t.datearrived IS NULL
  AND t.datecancelled IS NULL
ORDER BY t.branchtransfer_id
LIMIT 1000
