SELECT
-- PMK Restauration — rapport privé Koha 25.11+, lecture seule.
-- Paramètres, dans cet ordre : Du|date puis Au|date.
-- Le filtre utilise la date de suppression deleted_on, pas la dernière modification.
-- Conserver les noms et l'ordre des colonnes. Renseigner l'ID obtenu dans PMK.
    d.itemnumber,
    d.barcode,
    COALESCE(b.title, db.title) AS title,
    COALESCE(b.author, db.author) AS author,
    COALESCE(bi.isbn, dbi.isbn) AS isbn,
    COALESCE(bi.issn, dbi.issn) AS issn,
    d.biblionumber,
    d.deleted_on AS timestamp,
    EXISTS(SELECT 1 FROM items current_item WHERE current_item.barcode = d.barcode)
        AS conflict,
    d.notforloan AS statut,
    d.itemlost AS statut_perdu
FROM deleteditems d
LEFT JOIN biblio b ON b.biblionumber = d.biblionumber
LEFT JOIN deletedbiblio db ON db.biblionumber = d.biblionumber
LEFT JOIN biblioitems bi ON bi.biblioitemnumber = d.biblioitemnumber
LEFT JOIN deletedbiblioitems dbi ON dbi.biblioitemnumber = d.biblioitemnumber
WHERE d.deleted_on >= <<Du|date>>
  AND d.deleted_on < DATE_ADD(<<Au|date>>, INTERVAL 1 DAY)
ORDER BY d.deleted_on DESC, d.itemnumber
