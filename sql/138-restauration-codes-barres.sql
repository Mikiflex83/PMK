SELECT
-- PMK Restauration — rapport privé Koha 25.11+, lecture seule.
-- Paramètre unique : barcode|list. Coller des codes séparés par des retours ligne.
-- Le plugin UndeleteRecords effectue la restauration ; ce SQL ne restaure rien.
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
WHERE FIND_IN_SET(d.barcode, REPLACE(REPLACE(REPLACE(<<barcode|list>>, CHAR(13), ''), CHAR(10), ','), ';', ',')) > 0
ORDER BY d.itemnumber
