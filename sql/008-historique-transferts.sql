SELECT
    bt.branchtransfer_id AS Transfer_ID,
    bt.itemnumber AS Item_ID,
    bt.frombranch AS From_Site,
    bt.tobranch AS To_Site,
    bt.daterequested AS Demande_le,
    bt.datesent AS Envoye_le,
    bt.datearrived AS Arrive_le,
    bt.datecancelled AS Annule_le,
    bt.reason AS Raison,
    bt.cancellation_reason AS Raison_annulation
FROM branchtransfers bt
INNER JOIN items i ON i.itemnumber = bt.itemnumber
WHERE i.biblionumber = <<Biblionumber>>
  AND bt.branchtransfer_id > <<Après ID>>
ORDER BY bt.branchtransfer_id ASC
LIMIT 500
