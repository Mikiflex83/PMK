-- PMK — transferts arrivés au site et pas encore réceptionnés.
-- Créer un rapport guidé privé, puis indiquer son numéro dans la règle de menu.
SELECT
    bt.branchtransfer_id,
    i.barcode,
    b.title,
    bt.frombranch,
    bt.tobranch,
    bt.datesent
FROM branchtransfers bt
JOIN items i ON i.itemnumber = bt.itemnumber
JOIN biblio b ON b.biblionumber = i.biblionumber
WHERE bt.datearrived IS NULL
  AND bt.datecancelled IS NULL
  AND bt.datesent IS NOT NULL
ORDER BY bt.datesent
