-- PMK 120 — calendrier des fermetures Koha
-- Créer ce rapport comme rapport guidé privé, puis reporter son ID dans PMK.
SELECT
  'weekly' AS rule_type, branchcode, weekday,
  NULL AS day, NULL AS month, NULL AS year, 0 AS isexception
FROM repeatable_holidays
WHERE weekday IS NOT NULL
UNION ALL
SELECT
  'yearly' AS rule_type, branchcode, NULL AS weekday,
  day, month, NULL AS year, 0 AS isexception
FROM repeatable_holidays
WHERE weekday IS NULL
UNION ALL
SELECT
  'special' AS rule_type, branchcode, NULL AS weekday,
  day, month, year, isexception
FROM special_holidays
ORDER BY branchcode, rule_type, year, month, day, weekday;
