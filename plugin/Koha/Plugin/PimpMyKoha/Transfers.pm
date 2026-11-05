package Koha::Plugin::PimpMyKoha::Transfers;

# Read-only list of transfers that have not arrived. Used when the page has
# no saved report id. Arrived transfers stay on the optional SQL report.
# The statement is fixed. The only request value is an optional library code.

use Modern::Perl;
use C4::Context;
use C4::Auth qw(haspermission);

sub search {
    my ($c) = @_;
    $c = $c->openapi->valid_input or return;
    my $patron = $c->stash('koha.user');
    my $allowed = $patron && (
        (($patron->flags // 0) & 1)
        || haspermission($patron->userid, {circulate => 'circulate_remaining_permissions'})
    );
    return $c->render(status => 403, openapi => {error => 'forbidden'}) unless $allowed;

    my $library = $c->validation->param('library') // '';
    return $c->render(status => 400, openapi => {error => 'invalid_library'})
        if length($library) && $library !~ /^[A-Za-z0-9_-]{1,10}$/;

    my $sql = q{
        SELECT bt.branchtransfer_id AS transfer_id,
               bt.itemnumber AS item_id,
               i.biblionumber AS biblio_id,
               i.barcode AS barcode,
               b.title AS title,
               bt.frombranch AS from_library,
               bt.tobranch AS to_library,
               bt.datesent AS datesent,
               bt.datearrived AS datearrived,
               bt.reason AS reason,
               i.homebranch AS home_library,
               i.holdingbranch AS holding_library
          FROM branchtransfers bt
          LEFT JOIN items i ON i.itemnumber = bt.itemnumber
          LEFT JOIN biblio b ON b.biblionumber = i.biblionumber
         WHERE bt.datearrived IS NULL
    };
    my @bind;
    if (length $library) {
        $sql .= ' AND (bt.frombranch = ? OR bt.tobranch = ?)';
        push @bind, $library, $library;
    }
    $sql .= ' ORDER BY bt.branchtransfer_id LIMIT 501';
    my $rows = C4::Context->dbh->selectall_arrayref($sql, {Slice => {}}, @bind);
    $rows = [] unless ref($rows) eq 'ARRAY';
    my $truncated = @$rows > 500 ? 1 : 0;
    pop @$rows if $truncated;
    $c->res->headers->cache_control('no-store');
    return $c->render(status => 200, openapi => {rows => $rows, truncated => $truncated});
}

1;
