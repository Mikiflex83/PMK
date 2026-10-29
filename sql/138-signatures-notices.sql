SELECT
-- PMK Qualité bibliographique — rapport privé Koha 25.11+, lecture seule.
-- Un paramètre Après identifiant, commencer manuellement à 0.
-- Signatures de notices ; l'audit détaillé continue à relire le MARC par l'API.
    b.biblionumber AS Biblio_ID,
    b.title AS Title,
    b.author AS Author,
    GROUP_CONCAT(DISTINCT NULLIF(bi.isbn, '') SEPARATOR ';') AS ISBN,
    GROUP_CONCAT(DISTINCT NULLIF(bi.issn, '') SEPARATOR ';') AS ISSN,
    b.copyrightdate AS Publication_Year,
    b.frameworkcode AS Framework,
    b.timestamp AS Modified
FROM biblio b
LEFT JOIN biblioitems bi ON bi.biblionumber = b.biblionumber
WHERE b.biblionumber > <<Après identifiant>>
GROUP BY b.biblionumber, b.title, b.author, b.copyrightdate, b.frameworkcode, b.timestamp
ORDER BY b.biblionumber
LIMIT 500
