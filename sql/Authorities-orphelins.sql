SELECT
-- UNIMARC/A. Candidats sans lien $9 dans biblio_metadata ; recontrôle natif obligatoire avant suppression.
 a.authid AS AuthID,a.authtypecode AS Type,COALESCE(NULLIF(a.heading,''),TRIM(CONCAT_WS(' ',NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="200"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="210"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="215"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="216"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="220"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="230"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="235"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="240"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="250"]/subfield'),' ')))) AS Vedette,a.datecreated AS datecreated,a.modification_time AS modification_time FROM auth_header a LEFT JOIN (
 SELECT DISTINCT links.authid
 FROM biblio_metadata bm
 JOIN JSON_TABLE(
   CONCAT('[',REPLACE(JSON_QUOTE(TRIM(ExtractValue(bm.metadata,'//datafield/subfield[@code="9"]'))),' ','","'),']'),
   '$[*]' COLUMNS (authid BIGINT UNSIGNED PATH '$' NULL ON ERROR)
 ) links ON 1=1
 WHERE links.authid IS NOT NULL
) used_authorities ON used_authorities.authid=a.authid
WHERE used_authorities.authid IS NULL ORDER BY a.authid
