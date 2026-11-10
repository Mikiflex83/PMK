package Koha::Plugin::PimpMyKoha::Authorities;

# Fixed read of authorities when no saved report id is configured.
# The statement is not taken from the request. SELECT only.

use Modern::Perl;
use C4::Context;
use C4::Auth qw(haspermission);

my $BATCH = 1000;

my %SQL = (
    referential => <<'PMK_AUTH_SQL',
SELECT
 a.authid AS AuthID,a.authtypecode AS Type,COALESCE(NULLIF(a.heading,''),TRIM(CONCAT_WS(' ',NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="200"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="210"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="215"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="216"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="220"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="230"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="235"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="240"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="250"]/subfield'),' ')))) AS Vedette,a.datecreated AS datecreated,a.modification_time AS modification_time FROM auth_header a WHERE a.authid > ? ORDER BY a.authid ASC LIMIT ?
PMK_AUTH_SQL
    duplicates => <<'PMK_AUTH_SQL',
SELECT h.AuthID,h.Type,h.Vedette,h.datecreated,h.modification_time
FROM (SELECT headings.*,TRIM(REGEXP_REPLACE(LOWER(Vedette),'[^\\p{L}\\p{N}]+',' ')) AS norm FROM (SELECT a.authid AS AuthID,a.authtypecode AS Type,COALESCE(NULLIF(a.heading,''),TRIM(CONCAT_WS(' ',NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="200"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="210"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="215"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="216"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="220"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="230"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="235"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="240"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="250"]/subfield'),' ')))) AS Vedette,a.datecreated AS datecreated,a.modification_time AS modification_time FROM auth_header a) headings) h
JOIN (SELECT Type,norm FROM (SELECT headings.*,TRIM(REGEXP_REPLACE(LOWER(Vedette),'[^\\p{L}\\p{N}]+',' ')) AS norm FROM (SELECT a.authid AS AuthID,a.authtypecode AS Type,COALESCE(NULLIF(a.heading,''),TRIM(CONCAT_WS(' ',NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="200"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="210"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="215"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="216"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="220"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="230"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="235"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="240"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="250"]/subfield'),' ')))) AS Vedette,a.datecreated AS datecreated,a.modification_time AS modification_time FROM auth_header a) headings) grouped_headings GROUP BY Type,norm HAVING COUNT(*)>1) duplicates ON duplicates.Type=h.Type AND duplicates.norm=h.norm
WHERE h.norm<>'' AND h.AuthID > ? ORDER BY h.AuthID LIMIT ?
PMK_AUTH_SQL
    orphans => <<'PMK_AUTH_SQL',
SELECT
 a.authid AS AuthID,a.authtypecode AS Type,COALESCE(NULLIF(a.heading,''),TRIM(CONCAT_WS(' ',NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="200"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="210"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="215"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="216"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="220"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="230"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="235"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="240"]/subfield'),' '),NULLIF(ExtractValue(a.marcxml,'//datafield[@tag="250"]/subfield'),' ')))) AS Vedette,a.datecreated AS datecreated,a.modification_time AS modification_time FROM auth_header a LEFT JOIN (
 SELECT DISTINCT links.authid
 FROM biblio_metadata bm
 JOIN JSON_TABLE(
   CONCAT('[',REPLACE(JSON_QUOTE(TRIM(ExtractValue(bm.metadata,'//datafield/subfield[@code="9"]'))),' ','","'),']'),
   '$[*]' COLUMNS (authid BIGINT UNSIGNED PATH '$' NULL ON ERROR)
 ) links ON 1=1
 WHERE links.authid IS NOT NULL
) used_authorities ON used_authorities.authid=a.authid
WHERE used_authorities.authid IS NULL AND a.authid > ? ORDER BY a.authid LIMIT ?
PMK_AUTH_SQL
);

sub search {
    my ($c) = @_;
    $c = $c->openapi->valid_input or return;
    my $patron = $c->stash('koha.user');
    my $allowed = $patron && (
        (($patron->flags // 0) & 1)
        || haspermission($patron->userid, {reports => 'execute_reports'})
    );
    return $c->render(status => 403, openapi => {error => 'reports_permission_required'}) unless $allowed;

    my $list = $c->validation->param('list') // '';
    return $c->render(status => 400, openapi => {error => 'invalid_list'})
        unless $list eq 'referential' || $list eq 'duplicates' || $list eq 'orphans';
    my $after = $c->validation->param('after') // 0;
    $after = "$after";
    return $c->render(status => 400, openapi => {error => 'invalid_after'})
        unless $after =~ /\A[0-9]{1,20}\z/;

    my $sql = $SQL{$list};
    my $rows = eval { C4::Context->dbh->selectall_arrayref($sql, {Slice => {}}, $after, $BATCH + 1) };
    if ($@ || ref($rows) ne 'ARRAY') {
        warn 'PMK authorities read failed';
        return $c->render(status => 500, openapi => {error => 'authority_read_failed'});
    }
    my $truncated = @$rows > $BATCH ? 1 : 0;
    pop @$rows if $truncated;
    $c->res->headers->cache_control('no-store');
    return $c->render(status => 200, openapi => {
        rows => $rows,
        truncated => $truncated,
        source => 'koha',
        list => $list,
    });
}

1;
