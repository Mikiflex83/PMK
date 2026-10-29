-- PMK — Dernier emprunteur conservé par StoreLastBorrower
-- Créer ce rapport comme rapport guidé privé dans Koha.
-- Conserver exactement le paramètre <<itemnumber>>.
SELECT
  i.itemnumber,
  b.borrowernumber,
  b.cardnumber,
  b.firstname,
  b.surname,
  (
    SELECT MAX(oi.returndate)
    FROM old_issues oi
    WHERE oi.itemnumber = i.itemnumber
  ) AS created_on
FROM items i
LEFT JOIN borrowers b ON b.borrowernumber = i.last_returned_by
WHERE i.itemnumber = <<itemnumber>>;
