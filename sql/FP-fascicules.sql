SELECT
-- PMK France Publications — Koha 25.11, lecture seule, sans paramètre.
-- Conserver les 19 colonnes dans cet ordre. Les nombres de tentatives de réclamation
-- non historiés par Koha restent NULL ; la dernière date est celle de Koha.
 s.subscriptionid AS subscription_id,s.biblionumber AS biblio_id,
b.title AS title,s.branchcode AS library_id,s.internalnotes AS internal_notes,
s.enddate AS subscription_end_date,s.graceperiod AS grace_period,
x.serialid AS serial_id,x.serialseq AS issue_number,x.planneddate AS planned_date,
x.publisheddate AS publication_date,x.status AS issue_status_code,
CASE x.status WHEN 1 THEN 'Attendu' WHEN 2 THEN 'Reçu' WHEN 3 THEN 'En retard'
WHEN 4 THEN 'Manquant' WHEN 7 THEN 'Réclamé' ELSE CAST(x.status AS CHAR) END AS issue_status_label,
DATE_ADD(x.planneddate,INTERVAL COALESCE(s.graceperiod,0) DAY) AS claim_eligible_from,
(x.status IN (1,3,4,41,42,43,44) AND x.planneddate < DATE_SUB(CURDATE(),INTERVAL COALESCE(s.graceperiod,0) DAY)) AS claimable_now,
DATEDIFF(CURDATE(),x.planneddate) AS days_since_planned,
x.claimdate AS last_claim_date,NULL AS claims_count,x.notes AS issue_notes
FROM serial x JOIN subscription s ON s.subscriptionid=x.subscriptionid
JOIN biblio b ON b.biblionumber=s.biblionumber
ORDER BY s.subscriptionid,x.serialid
