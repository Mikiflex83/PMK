SELECT
    i.itemnumber AS "Numero exemplaire",
    i.barcode AS "Code-barres",
    b.title AS "Titre",
    COALESCE(i.issues, 0) AS "Compteur Koha de prets",
    (SELECT COUNT(*) FROM issues c WHERE c.itemnumber = i.itemnumber)
      AS "Prets en cours",
    (SELECT COUNT(*) FROM old_issues h WHERE h.itemnumber = i.itemnumber)
      AS "Prets termines conserves",
    (SELECT COUNT(*) FROM issues c WHERE c.itemnumber = i.itemnumber)
      + (SELECT COUNT(*) FROM old_issues h WHERE h.itemnumber = i.itemnumber)
      AS "Total des prets conserves",
    COALESCE((SELECT SUM(c.renewals_count) FROM issues c WHERE c.itemnumber = i.itemnumber), 0)
      + COALESCE((SELECT SUM(h.renewals_count) FROM old_issues h WHERE h.itemnumber = i.itemnumber), 0)
      AS "Renouvellements conserves",
    (SELECT MIN(h.issuedate) FROM old_issues h WHERE h.itemnumber = i.itemnumber)
      AS "Premier pret termine conserve",
    (SELECT MAX(h.issuedate) FROM old_issues h WHERE h.itemnumber = i.itemnumber)
      AS "Dernier pret termine conserve",
    (SELECT MAX(c.issuedate) FROM issues c WHERE c.itemnumber = i.itemnumber)
      AS "Pret en cours depuis",
    (SELECT MAX(h.returndate) FROM old_issues h WHERE h.itemnumber = i.itemnumber)
      AS "Dernier retour conserve"
FROM items i
LEFT JOIN biblio b ON b.biblionumber = i.biblionumber
WHERE i.itemnumber = <<Numéro exemplaire>>
