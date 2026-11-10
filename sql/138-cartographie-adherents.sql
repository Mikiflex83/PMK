SELECT
    'patron' AS row_type,
    b.address AS address,
    b.zipcode AS zipcode,
    b.city AS city,
    NULLIF(b.branchcode, '') AS site_inscription,
    COALESCE(tx.site_transaction, open_loan.branchcode, NULLIF(b.branchcode, '')) AS site_transaction,
    NULL AS source_bib,
    NULL AS dest_bib,
    NULL AS volume_circulation
FROM borrowers b
JOIN (
    SELECT borrowernumber
    FROM (
        SELECT statistics.borrowernumber
        FROM statistics
        WHERE statistics.borrowernumber IS NOT NULL
          AND statistics.datetime > DATE_SUB(NOW(), INTERVAL 2 YEAR)
          AND statistics.type IN ('issue', 'renew', 'onsite_checkout')
        UNION
        SELECT issues.borrowernumber
        FROM issues
        WHERE issues.borrowernumber IS NOT NULL
          AND issues.issuedate > DATE_SUB(NOW(), INTERVAL 2 YEAR)
        UNION
        SELECT old_issues.borrowernumber
        FROM old_issues
        WHERE old_issues.borrowernumber IS NOT NULL
          AND old_issues.issuedate > DATE_SUB(NOW(), INTERVAL 2 YEAR)
    ) AS active_ids
    GROUP BY borrowernumber
) AS active ON active.borrowernumber = b.borrowernumber
LEFT JOIN (
    SELECT borrowernumber, branch AS site_transaction
    FROM (
        SELECT
            borrowernumber,
            branch,
            ROW_NUMBER() OVER (
                PARTITION BY borrowernumber
                ORDER BY cnt DESC, branch
            ) AS rn
        FROM (
            SELECT borrowernumber, branch, SUM(cnt) AS cnt
            FROM (
                SELECT statistics.borrowernumber, statistics.branch, COUNT(*) AS cnt
                FROM statistics
                WHERE statistics.borrowernumber IS NOT NULL
                  AND statistics.datetime > DATE_SUB(NOW(), INTERVAL 2 YEAR)
                  AND statistics.type IN ('issue', 'renew', 'onsite_checkout')
                  AND statistics.branch IS NOT NULL
                  AND statistics.branch <> ''
                GROUP BY statistics.borrowernumber, statistics.branch
                UNION ALL
                SELECT issues.borrowernumber, issues.branchcode, COUNT(*) AS cnt
                FROM issues
                WHERE issues.borrowernumber IS NOT NULL
                  AND issues.issuedate > DATE_SUB(NOW(), INTERVAL 2 YEAR)
                  AND issues.branchcode IS NOT NULL
                  AND issues.branchcode <> ''
                GROUP BY issues.borrowernumber, issues.branchcode
            ) AS branch_sources
            GROUP BY borrowernumber, branch
        ) AS branch_counts
    ) AS ranked_branch
    WHERE rn = 1
) AS tx ON tx.borrowernumber = b.borrowernumber
LEFT JOIN (
    SELECT borrowernumber, MIN(branchcode) AS branchcode
    FROM issues
    WHERE branchcode IS NOT NULL
      AND branchcode <> ''
    GROUP BY borrowernumber
) AS open_loan ON open_loan.borrowernumber = b.borrowernumber
WHERE b.address IS NOT NULL
  AND b.address <> ''
  AND b.zipcode IS NOT NULL
  AND b.zipcode <> ''
  AND COALESCE(tx.site_transaction, open_loan.branchcode, NULLIF(b.branchcode, '')) IS NOT NULL

UNION ALL

SELECT
    'patron' AS row_type,
    NULL AS address,
    loc.zipcode AS zipcode,
    loc.city AS city,
    NULLIF(loc.branchcode, '') AS site_inscription,
    COALESCE(act.site_transaction, NULLIF(loc.branchcode, '')) AS site_transaction,
    NULL AS source_bib,
    NULL AS dest_bib,
    NULL AS volume_circulation
FROM (
    SELECT hashed_borrowernumber, zipcode, city, branchcode
    FROM (
        SELECT
            hashed_borrowernumber,
            zipcode,
            city,
            branchcode,
            ROW_NUMBER() OVER (
                PARTITION BY hashed_borrowernumber
                ORDER BY datetime DESC, id DESC
            ) AS rn
        FROM pseudonymized_transactions
        WHERE datetime > DATE_SUB(NOW(), INTERVAL 2 YEAR)
          AND hashed_borrowernumber IS NOT NULL
          AND hashed_borrowernumber <> ''
          AND zipcode IS NOT NULL
          AND zipcode <> ''
    ) AS ranked_location
    WHERE rn = 1
) AS loc
JOIN (
    SELECT pt.hashed_borrowernumber
    FROM pseudonymized_transactions pt
    LEFT JOIN statistics s
        ON s.itemnumber = pt.itemnumber
       AND s.type = pt.transaction_type
       AND s.datetime = pt.datetime
       AND s.borrowernumber IS NOT NULL
    LEFT JOIN borrowers b
        ON b.borrowernumber = s.borrowernumber
       AND b.address IS NOT NULL
       AND b.address <> ''
       AND b.zipcode IS NOT NULL
       AND b.zipcode <> ''
    LEFT JOIN issues i
        ON i.itemnumber = pt.itemnumber
       AND i.borrowernumber IS NOT NULL
       AND pt.transaction_type = 'issue'
       AND i.issuedate = pt.datetime
    LEFT JOIN borrowers bi
        ON bi.borrowernumber = i.borrowernumber
       AND bi.address IS NOT NULL
       AND bi.address <> ''
       AND bi.zipcode IS NOT NULL
       AND bi.zipcode <> ''
    LEFT JOIN old_issues oi
        ON oi.itemnumber = pt.itemnumber
       AND oi.borrowernumber IS NOT NULL
       AND (
            (pt.transaction_type IN ('issue', 'renew', 'onsite_checkout') AND oi.issuedate = pt.datetime)
            OR (pt.transaction_type = 'return' AND oi.returndate = pt.datetime)
       )
    LEFT JOIN borrowers bo
        ON bo.borrowernumber = oi.borrowernumber
       AND bo.address IS NOT NULL
       AND bo.address <> ''
       AND bo.zipcode IS NOT NULL
       AND bo.zipcode <> ''
    WHERE pt.datetime > DATE_SUB(NOW(), INTERVAL 2 YEAR)
      AND pt.hashed_borrowernumber IS NOT NULL
      AND pt.hashed_borrowernumber <> ''
    GROUP BY pt.hashed_borrowernumber
    HAVING SUM(pt.itemnumber IS NOT NULL) > 0
       AND SUM(
            (b.borrowernumber IS NOT NULL)
            OR (bi.borrowernumber IS NOT NULL)
            OR (bo.borrowernumber IS NOT NULL)
       ) = 0
) AS only_commune ON only_commune.hashed_borrowernumber = loc.hashed_borrowernumber
LEFT JOIN (
    SELECT hashed_borrowernumber, transaction_branchcode AS site_transaction
    FROM (
        SELECT
            hashed_borrowernumber,
            transaction_branchcode,
            ROW_NUMBER() OVER (
                PARTITION BY hashed_borrowernumber
                ORDER BY cnt DESC, transaction_branchcode
            ) AS rn
        FROM (
            SELECT
                hashed_borrowernumber,
                transaction_branchcode,
                COUNT(*) AS cnt
            FROM pseudonymized_transactions
            WHERE datetime > DATE_SUB(NOW(), INTERVAL 2 YEAR)
              AND transaction_type IN ('issue', 'renew', 'onsite_checkout')
              AND hashed_borrowernumber IS NOT NULL
              AND hashed_borrowernumber <> ''
              AND transaction_branchcode IS NOT NULL
              AND transaction_branchcode <> ''
            GROUP BY hashed_borrowernumber, transaction_branchcode
        ) AS branch_counts
    ) AS ranked_branch
    WHERE rn = 1
) AS act ON act.hashed_borrowernumber = loc.hashed_borrowernumber
WHERE COALESCE(act.site_transaction, NULLIF(loc.branchcode, '')) IS NOT NULL

UNION ALL

SELECT
    'circulation' AS row_type,
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
  AND items.homebranch <> s.branch
GROUP BY items.homebranch, s.branch
