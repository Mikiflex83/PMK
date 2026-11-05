-- PMK — transferts demandés et pas encore envoyés.
-- Créer un rapport guidé privé, puis indiquer son numéro dans la règle de menu.
SELECT
    bt.branchtransfer_id,
    i.barcode,
    b.title,
    bt.frombranch,
    bt.tobranch,
    bt.daterequested
FROM branchtransfers bt
JOIN items i ON i.itemnumber = bt.itemnumber
JOIN biblio b ON b.biblionumber = i.biblionumber
WHERE bt.datesent IS NULL
  AND bt.datecancelled IS NULL
ORDER BY bt.daterequested
