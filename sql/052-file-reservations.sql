-- PMK — file de réservations de cette installation.
-- Créer un rapport guidé privé, puis indiquer son numéro dans la règle de menu.
SELECT
    r.reserve_id,
    r.biblionumber,
    b.title,
    r.borrowernumber,
    r.branchcode,
    r.reservedate,
    r.priority
FROM reserves r
JOIN biblio b ON b.biblionumber = r.biblionumber
ORDER BY r.branchcode, r.priority, r.reservedate
