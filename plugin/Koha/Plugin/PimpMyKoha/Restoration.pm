package Koha::Plugin::PimpMyKoha::Restoration;

use Modern::Perl;
use JSON ();
use Digest::SHA qw(sha256_hex);
use Try::Tiny;
use C4::Context;
use C4::Auth qw(haspermission);
use C4::Log qw(logaction);
use Koha::Biblios;
use Koha::SearchEngine::Indexer;

my $json = JSON->new->canonical;
my $fingerprint_json = JSON->new->canonical->utf8;
# Fixed table names only. No SQL identifier comes from a request.
my %keys = (items=>'itemnumber',biblio=>'biblionumber',biblioitems=>'biblioitemnumber',biblio_metadata=>'biblionumber');

sub _authorize {
    my ($c) = @_;
    my $p = $c->stash('koha.user');
    die "forbidden\n" unless $p && haspermission($p->userid,{editcatalogue=>'edit_items'});
    my $raw = C4::Context->dbh->selectrow_array('SELECT body FROM koha_plugin_pimpmykoha_documents WHERE document_key=?',undef,'internal-pages-tools');
    my $cfg = $raw ? $json->decode($raw)->{config} || {} : {};
    my $options = $cfg->{pageOptions}{'restore-deleted-items'} || {};
    die "forbidden\n" if exists($cfg->{enabled}) && !$cfg->{enabled};
    die "forbidden\n" if exists($options->{enabled}) && !$options->{enabled};
    die "forbidden\n" if ($options->{access} || 'default') ne 'staff' && !(($p->flags // 0)&1);
    my $names = $options->{runtime}{allowedUsernames};
    $names = [] unless ref($names) eq 'ARRAY';
    die "forbidden\n" if @$names && !grep { lc($_) eq lc($p->userid // '') } @$names;
    return $p;
}

sub _row {
    my ($table,$id,$lock) = @_;
    my $base = $table; $base =~ s/^deleted//;
    die "invalid_table\n" unless $keys{$base};
    return C4::Context->dbh->selectrow_hashref("SELECT * FROM `$table` WHERE `$keys{$base}`=?".($lock?' FOR UPDATE':''),undef,$id);
}

sub _plan {
    my ($id,$p,$lock) = @_;
    my $dbh = C4::Context->dbh;
    my $item = _row('deleteditems',$id,$lock);
    die "deleted_item_missing\n" unless $item;
    die "item_id_in_use\n" if _row('items',$id,$lock);
    die "branch_forbidden\n" unless $p->can_edit_items_from($item->{homebranch});
    die "deleted_item_on_loan\n" if $item->{onloan};
    for my $branch (qw(homebranch holdingbranch)) {
        die "library_missing\n" unless $dbh->selectrow_array('SELECT branchcode FROM branches WHERE branchcode=?',undef,$item->{$branch});
    }
    my $bid = $item->{biblionumber};
    my $live = _row('biblio',$bid,$lock);
    my $biblio = $live || _row('deletedbiblio',$bid,$lock);
    die "biblio_missing\n" unless $biblio;
    die "cataloguing_permission_required\n" unless $live || haspermission($p->userid,{editcatalogue=>'edit_catalogue'});
    my $bi = _row('biblioitems',$item->{biblioitemnumber},$lock);
    my $old_bi = $bi ? undef : _row('deletedbiblioitems',$item->{biblioitemnumber},$lock);
    die "biblioitem_missing\n" unless $bi || $old_bi;
    die "biblioitem_mismatch\n" unless ($bi || $old_bi)->{biblionumber} == $bid;
    my $meta = $dbh->selectall_arrayref('SELECT * FROM biblio_metadata WHERE biblionumber=? ORDER BY id'.($lock?' FOR UPDATE':''),{Slice=>{}},$bid);
    my $old_meta = @$meta ? [] : $dbh->selectall_arrayref('SELECT * FROM deletedbiblio_metadata WHERE biblionumber=? ORDER BY id'.($lock?' FOR UPDATE':''),{Slice=>{}},$bid);
    die "metadata_missing\n" unless @$meta || @$old_meta;
    my $barcode = $item->{barcode}; my $conflict=0;
    if (defined($barcode) && length($barcode)) {
        my $original=$barcode; my $suffix=0;
        while ($dbh->selectrow_array('SELECT itemnumber FROM items WHERE barcode=?',undef,$barcode)) {
            $conflict=1; die "barcode_conflict\n" if ++$suffix>1000;
            $barcode=$original.'_'.$suffix;
        }
        die "barcode_too_long\n" if length($barcode)>20; # native Koha barcode column
    }
    my $source = {item=>$item,biblio=>$biblio,biblioitem=>$bi||$old_bi,metadata=>@$meta?$meta:$old_meta,
                  restore_biblio=>$live?0:1,restore_biblioitem=>$bi?0:1,restore_metadata=>@$meta?0:1,barcode=>$barcode};
    return {fingerprint=>sha256_hex($fingerprint_json->encode($source)),item_id=>0+$id,biblio_id=>0+$bid,
            title=>$biblio->{title},barcode_before=>$item->{barcode},barcode_after=>$barcode,
            barcode_conflict=>$conflict?JSON::true:JSON::false,restore_biblio=>$live?JSON::false:JSON::true,
            fields=>$item,source=>$source};
}

sub _insert {
    my ($table,$data) = @_;
    die "invalid_table\n" unless $keys{$table};
    my %copy=%$data;
    delete $copy{id} if $table eq 'biblio_metadata'; # regenerated PK; MARC and schema preserved
    my $dbh=C4::Context->dbh;
    my $columns=$dbh->selectall_arrayref("SHOW COLUMNS FROM `$table`",{Slice=>{}});
    my %allowed=map {$_->{Field}=>1} @$columns;
    die "schema_mismatch\n" if grep {!$allowed{$_}} keys %copy;
    my @names=sort keys %copy;
    $dbh->do('INSERT INTO `'.$table.'` ('.join(',',map {'`'.$_.'`'} @names).') VALUES ('.join(',',('?')x@names).')',undef,@copy{@names});
}

sub exchange {
    my $c=shift->openapi->valid_input or return;
    $c->res->headers->cache_control('no-store');
    my $dbh=C4::Context->dbh;my $transaction=0;
    return try {
        my $p=_authorize($c);my $id=$c->validation->param('item_id');
        if ($c->req->method eq 'GET') {
            my $plan=_plan($id,$p,0);delete $plan->{source};
            return $c->render(status=>200,openapi=>$plan);
        }
        die "request_header_required\n" unless ($c->req->headers->header('X-PMK-Request')//'') eq '1';
        my $in=$c->req->json;
        die "invalid_confirmation\n" unless ref($in) eq 'HASH' && ($in->{fingerprint}//'') =~ /\A[a-f0-9]{64}\z/ && $in->{confirmed};
        $dbh->begin_work;$transaction=1;
        # A response lost after commit can be retried without a second restoration.
        my $previous=$dbh->selectrow_array('SELECT body FROM koha_plugin_pimpmykoha_data_history WHERE namespace=? AND path=? ORDER BY id DESC LIMIT 1',undef,'restoration',"items/$id");
        if (!_row('deleteditems',$id,1) && $previous) {
            my $receipt=$json->decode($previous);my $current=_row('items',$id,1);
            die "item_changed\n" unless $current && $receipt->{fingerprint} eq $in->{fingerprint} && $json->encode($current) eq $json->encode($receipt->{item});
            die "branch_forbidden\n" unless $p->can_edit_items_from($current->{homebranch});
            $dbh->commit;$transaction=0;
            return $c->render(status=>200,openapi=>{restored=>JSON::true,replayed=>JSON::true,item_id=>0+$id,biblio_id=>0+$current->{biblionumber},barcode=>$current->{barcode}});
        }
        my $plan=_plan($id,$p,1);
        die "preview_changed\n" unless $plan->{fingerprint} eq $in->{fingerprint};
        my $source=$plan->{source};my $bid=$plan->{biblio_id};
        _insert('biblio',$source->{biblio}) if $source->{restore_biblio};
        _insert('biblioitems',$source->{biblioitem}) if $source->{restore_biblioitem};
        _insert('biblio_metadata',$_) for @{$source->{restore_metadata}?$source->{metadata}:[]};
        # Validate the restored/native MARC before any commit, without transforming it.
        my $record=try { Koha::Biblios->find($bid)->metadata->record } catch { die "metadata_invalid\n"; };
        die "metadata_invalid\n" unless $record;
        my %item=(%{$source->{item}},barcode=>$plan->{barcode_after});
        $item{deleted_on}=undef if exists $item{deleted_on};
        _insert('items',\%item);
        my $restored=_row('items',$id,1);
        die "verification_failed\n" unless $json->encode($restored) eq $json->encode(\%item);
        $dbh->do('DELETE FROM deleteditems WHERE itemnumber=?',undef,$id);
        if ($source->{restore_metadata}) {$dbh->do('DELETE FROM deletedbiblio_metadata WHERE biblionumber=?',undef,$bid);}
        if ($source->{restore_biblioitem}) {$dbh->do('DELETE FROM deletedbiblioitems WHERE biblioitemnumber=?',undef,$item{biblioitemnumber});}
        if ($source->{restore_biblio}) {$dbh->do('DELETE FROM deletedbiblio WHERE biblionumber=?',undef,$bid);}
        # Indexer queues the native Zebra/Elasticsearch update; no supplier plugin.
        Koha::SearchEngine::Indexer->new({index=>$Koha::SearchEngine::BIBLIOS_INDEX})->index_records($bid,'specialUpdate','biblioserver');
        logaction('CATALOGUING','ADD',$id,'PMK RESTORE '.$plan->{fingerprint});
        $dbh->do('INSERT INTO koha_plugin_pimpmykoha_data_history(namespace,path,body,revision,saved_by) VALUES (?,?,?,?,?)',undef,'restoration',"items/$id",$json->encode({fingerprint=>$plan->{fingerprint},item=>$restored,source=>$source}),1,$p->borrowernumber);
        $dbh->commit;$transaction=0;
        return $c->render(status=>200,openapi=>{restored=>JSON::true,item_id=>0+$id,biblio_id=>0+$bid,barcode=>$restored->{barcode},index_queued=>JSON::true});
    } catch {
        my $error="$_";try {$dbh->rollback if $transaction;} catch {};
        if ($error =~ /\A([a-z_]+)\n/) {
            my $code=$1;my $status=$code =~ /forbidden|permission|header/ ? 403 : $code eq 'deleted_item_missing' ? 404 : $code =~ /^invalid_/ ? 400 : 409;
            return $c->render(status=>$status,openapi=>{error=>$code});
        }
        return $c->render(status=>409,openapi=>{error=>'restore_conflict'}) if $error =~ /Duplicate entry|foreign key constraint|Deadlock|Lock wait timeout/;
        $c->unhandled_exception($error);
    };
}
1;
