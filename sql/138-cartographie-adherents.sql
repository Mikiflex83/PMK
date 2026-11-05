-- Rapport Koha à coller tel quel, puis indiquer son numéro sur la page.
-- La valeur 0 n’envoie aucune lecture.
-- Colonnes utilisées par la carte : row_type, address, zipcode, city,
-- site_inscription, site_transaction, source_bib, dest_bib, volume_circulation.
-- Les sites MBA et ATP sont exclus, comme dans le rapport d’origine.
-- Adaptez cette liste si ces codes ne sont pas les vôtres.
-- Si le résultat semble coupé, augmenter SvcMaxReportRows.

SELECT
    'patron' AS row_type,
    p.firstname AS firstname,
    p.surname AS surname,
    p.address AS address,
    p.zipcode AS zipcode,
    p.city AS city,
    p.branchcode AS site_inscription,
    COALESCE(
        (
            SELECT statistics.branch
            FROM statistics
            WHERE statistics.borrowernumber = p.borrowernumber
              AND statistics.type IN ('issue', 'renew')
            GROUP BY statistics.branch
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ),
        p.branchcode
    ) AS site_transaction,
    NULL AS source_bib,
    NULL AS dest_bib,
    NULL AS volume_circulation
FROM borrowers p
WHERE p.address IS NOT NULL
  AND p.branchcode NOT IN ('MBA', 'ATP')
  AND EXISTS (
      SELECT 1
      FROM statistics
      WHERE statistics.borrowernumber = p.borrowernumber
        AND statistics.type IN ('issue', 'renew')
        AND statistics.datetime > DATE_SUB(NOW(), INTERVAL 2 YEAR)
  )

UNION ALL

SELECT
    'circulation' AS row_type,
    NULL AS firstname,
    NULL AS surname,
    NULL AS address,
    NULL AS zipcode,
    NULL AS city,
    NULL AS site_inscription,
    NULL AS site_transaction,
    items.homebranch AS source_bib,
    s.branch AS dest_bib,
    CAST(COUNT(*) AS CHAR) AS volume_circulation
FROM statistics s
JOIN items ON (s.itemnumber = items.itemnumber)
WHERE s.type = 'return'
  AND s.datetime > DATE_SUB(NOW(), INTERVAL 1 YEAR)
  AND items.homebranch IS NOT NULL
  AND s.branch IS NOT NULL
  AND items.homebranch != s.branch
  AND items.homebranch NOT IN ('MBA', 'ATP')
  AND s.branch NOT IN ('MBA', 'ATP')
GROUP BY items.homebranch, s.branch
