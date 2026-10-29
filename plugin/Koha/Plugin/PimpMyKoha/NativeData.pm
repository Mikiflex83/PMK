package Koha::Plugin::PimpMyKoha::NativeData;

use Modern::Perl;
use utf8;
use C4::Context;
use JSON ();
use Try::Tiny;
use Time::HiRes qw(time);
my $json = JSON->new->canonical;
my %namespaces = map { $_ => 1 } qw(attendance appointments journal lists taxonomy planning frequency internal-share authorities);

sub _path {
    my ($path, $collection) = @_;
    die "invalid_path\n" unless defined $path && !ref($path) && length($path) <= 512
        && $path !~ /[\x00-\x1f\x7f]/ && $path !~ m{(?:\A/|/\z|//)};
    my @parts = split '/', $path;
    die "invalid_path\n" unless @parts && (@parts % 2 == ($collection ? 1 : 0))
        && !grep { $_ eq '.' || $_ eq '..' || length($_) > 190 } @parts;
    return $path;
}
sub _parent { my $path = shift; $path =~ s{/[^/]+\z}{}; return $path; }
sub _resolve {
    my ($value, $millis) = @_;
    if (ref($value) eq 'HASH') {
        if (($value->{__pmkType} // '') eq 'serverTimestamp') {
            return {__pmkType => 'timestamp', seconds => int($millis / 1000), nanoseconds => int($millis % 1000) * 1_000_000};
        }
        return { map { $_ => _resolve($value->{$_}, $millis) } keys %$value };
    }
    return [map { _resolve($_, $millis) } @$value] if ref($value) eq 'ARRAY';
    return $value;
}
sub _merge {
    my ($old, $new) = @_;
    my %out = %$old;
    for my $key (keys %$new) {
        $out{$key} = ref($new->{$key}) eq 'HASH' && ref($out{$key}) eq 'HASH'
            && !exists $new->{$key}{__pmkType} ? _merge($out{$key}, $new->{$key}) : $new->{$key};
    }
    return \%out;
}

sub exchange {
    my $c = shift->openapi->valid_input or return;
    my $patron = $c->stash('koha.user');
    return $c->render(status => 403, openapi => {error => 'staff_required'}) unless $patron;
    return $c->render(status => 403, openapi => {error => 'pmk_request_required'})
        unless ($c->req->headers->header('X-PMK-Request') // '') eq '1';
    my $ns = $c->param('store_name');
    return $c->render(status => 400, openapi => {error => 'invalid_namespace'}) unless $namespaces{$ns // ''};
    my $in = $c->req->json;
    return $c->render(status => 400, openapi => {error => 'invalid_request'}) unless ref($in) eq 'HASH';
    return $c->render(status => 413, openapi => {error => 'request_too_large'}) if length($json->encode($in)) > 10_000_000;
    my $dbh = C4::Context->dbh;
    my $transaction = 0;
    $c->res->headers->cache_control('no-store');
    return try {
        my $action = $in->{action} // '';
        # Reserved account profiles can never be selected by another browser identity.
        # Admin access supports an explicit export or migration, not client-side ownership.
        my $admin_identity = (($patron->flags // 0) & 1);
        # Page access and operation grants are read afresh for every request.
        my $journal_runtime = {};
        if ($ns eq 'journal') {
            my $body = $dbh->selectrow_array('SELECT body FROM koha_plugin_pimpmykoha_documents WHERE document_key=?', undef, 'internal-pages-tools');
            my $cfg = $body ? $json->decode($body)->{config} // {} : {};
            my $page = $cfg->{pageOptions}{'action-journal'} // {};
            $journal_runtime = $page->{runtime} // {};
            die "journal_operation_forbidden\n" unless $admin_identity ||
                (($page->{access} // '') eq 'staff' && (!exists $cfg->{enabled} || $cfg->{enabled}) && (!exists $page->{enabled} || $page->{enabled}));
        }
        my $check_owner = sub {
            my ($path) = @_;
            if ($ns eq 'lists' && defined $path && $path =~ m{\Aprofiles/koha_([^/]+)(?:/|\z)}) {
                die "private_profile_forbidden\n" unless $admin_identity || $1 eq '' . $patron->borrowernumber;
            }
        };
        $check_owner->($in->{path}); $check_owner->($in->{parent});
        for my $part (qw(reads writes)) {
            if (ref($in->{$part}) eq 'ARRAY') { $check_owner->($_->{path}) for grep { ref($_) eq 'HASH' } @{$in->{$part}}; }
        }

        if ($action eq 'get') {
            my $path = _path($in->{path});
            my $row = $dbh->selectrow_hashref('SELECT path, body, revision, updated_by, updated_at FROM koha_plugin_pimpmykoha_data WHERE namespace=? AND path=?', undef, $ns, $path);
            return $c->render(status => 200, openapi => {path => $path, exists => $row && defined $row->{body} ? JSON::true : JSON::false,
                data => $row && defined $row->{body} ? $json->decode($row->{body}) : undef, revision => $row ? 0 + $row->{revision} : 0, audit => $row ? {savedBy => $row->{updated_by}, savedAt => $row->{updated_at}} : undef});
        }
        if ($action eq 'list') {
            my $parent = _path($in->{parent}, 1);
            my $after = $in->{after} // '';
            die "invalid_cursor\n" if ref($after) || length($after) > 512;
            my $private_filter = $ns eq 'lists' && $parent eq 'profiles' ? q{ AND (path NOT LIKE 'profiles/koha\_%' OR path=?)} : '';
            my @bind = ($ns, $parent, $after); push @bind, 'profiles/koha_' . $patron->borrowernumber if $private_filter;
            my $rows = $dbh->selectall_arrayref('SELECT path, body, revision, updated_by, updated_at FROM koha_plugin_pimpmykoha_data WHERE namespace=? AND parent=? AND body IS NOT NULL AND path>?' . $private_filter . ' ORDER BY path LIMIT 1001', {Slice => {}}, @bind);
            my $more = @$rows > 1000; pop @$rows if $more;
            return $c->render(status => 200, openapi => {documents => [map { {path => $_->{path}, data => $json->decode($_->{body}), revision => 0 + $_->{revision}, audit => {savedBy => $_->{updated_by}, savedAt => $_->{updated_at}}} } @$rows],
                next => $more ? $rows->[-1]{path} : undef});
        }
        if ($action eq 'export') {
            return $c->render(status => 403, openapi => {error => 'superlibrarian_required'}) unless (($patron->flags // 0) & 1);
            my $after = $in->{after} // '';
            die "invalid_cursor\n" if ref($after) || length($after) > 512;
            my $rows = $dbh->selectall_arrayref('SELECT path, body, revision, updated_by, updated_at FROM koha_plugin_pimpmykoha_data WHERE namespace=? AND body IS NOT NULL AND path>? ORDER BY path LIMIT 1001', {Slice => {}}, $ns, $after);
            my $more = @$rows > 1000; pop @$rows if $more;
            return $c->render(status => 200, openapi => {documents => [map { {path => $_->{path}, data => $json->decode($_->{body}), revision => 0 + $_->{revision}, audit => {savedBy => $_->{updated_by}, savedAt => $_->{updated_at}}} } @$rows], next => $more ? $rows->[-1]{path} : undef});
        }
        die "invalid_action\n" unless $action eq 'commit';
        my $reads = $in->{reads} // []; my $writes = $in->{writes};
        die "invalid_commit\n" unless ref($reads) eq 'ARRAY' && ref($writes) eq 'ARRAY' && @$reads <= 1000 && @$writes <= 500;
        # These referentials are managed by Koha administrators, never by a PIN in JS.
        my $admin = (($patron->flags // 0) & 1);
        return $c->render(status => 403, openapi => {error => 'superlibrarian_required'})
            if @$writes && $ns =~ /\A(?:planning|frequency)\z/ && !$admin;
        my %paths;
        for my $r (@$reads) {
            die "invalid_revision\n" unless ref($r) eq 'HASH' && defined $r->{revision} && $r->{revision} =~ /^\d+$/;
            $paths{_path($r->{path})} = 1;
        }
        for my $w (@$writes) {
            die "invalid_write\n" unless ref($w) eq 'HASH' && ($w->{op} // '') =~ /\A(?:set|update|delete)\z/;
            $paths{_path($w->{path})} = 1;
            die "invalid_data\n" if $w->{op} ne 'delete' && ref($w->{data}) ne 'HASH';
        }
        if (!$admin && @$writes) {
            my $settings = $dbh->selectrow_array('SELECT body FROM koha_plugin_pimpmykoha_documents WHERE document_key=?', undef, 'internal-pages-tools');
            my $config = $settings ? $json->decode($settings)->{config} // {} : {};
            my $appointment = $config->{pageOptions}{appointments}{runtime}{collections} // {};
            my %managed = map { ($_ => 1, ($appointment->{$_} // $_) => 1) } qw(settings themes slots polls recurrenceRules);
            my $att = $dbh->selectrow_array('SELECT body FROM koha_plugin_pimpmykoha_documents WHERE document_key=?', undef, 'attendance-mediabus-mini');
            my $locations = $att ? $json->decode($att)->{config}{locationsCollection} // 'locations' : 'locations';
            my $taxonomy = $config->{pageOptions}{weeding}{runtime}{taxonomyCollection} // 'treeData';
            for my $w (@$writes) {
                my ($root) = split '/', $w->{path};
                my $booking_admin = $ns eq 'appointments' && exists $w->{data} && (exists $w->{data}{approvedAt} || exists $w->{data}{rejectedAt} || ($w->{data}{status} // '') eq 'approved');
                return $c->render(status => 403, openapi => {error => 'superlibrarian_required'})
                    if ($ns eq 'taxonomy' && ($root eq $taxonomy || $root eq 'treeData'))
                    || ($ns eq 'attendance' && ($root eq $locations || $root eq 'locations'))
                    || ($ns eq 'appointments' && ($managed{$root} || $booking_admin));
            }
        }
        $dbh->begin_work; $transaction = 1;
        my %rows;
        # Stable order also serializes missing documents, preventing first-write races.
        for my $path (sort keys %paths) {
            $dbh->do('INSERT IGNORE INTO koha_plugin_pimpmykoha_data (namespace,path,parent) VALUES (?,?,?)', undef, $ns, $path, _parent($path));
            $rows{$path} = $dbh->selectrow_hashref('SELECT body, revision FROM koha_plugin_pimpmykoha_data WHERE namespace=? AND path=? FOR UPDATE', undef, $ns, $path);
        }
        for my $r (@$reads) {
            if ($rows{$r->{path}}{revision} != $r->{revision}) {
                $dbh->rollback; $transaction = 0;
                return $c->render(status => 409, openapi => {error => 'data_changed', path => $r->{path}});
            }
        }
        # A staff journal correction requires an entry and its append-only reason in
        # the same transaction. Imports remain available to administrators.
        if ($ns eq 'journal' && !$admin_identity && @$writes) {
            my $entries = $journal_runtime->{entriesCollection} // 'entries';
            my $logs = $journal_runtime->{logsCollection} // 'logs';
            my (%entries_written, %entry_writes, %seen_paths);
            for my $w (@$writes) { die "journal_operation_forbidden\n" if $seen_paths{$w->{path}}++; }
            for my $w (@$writes) {
                next unless _parent($w->{path}) eq $entries;
                my $old = defined $rows{$w->{path}}{body} ? $json->decode($rows{$w->{path}}{body}) : undef;
                # Hard deletion bypasses the reversible journal workflow.
                die "journal_operation_forbidden\n" unless $w->{op} eq 'set' && !$w->{merge};
                my $deleted = exists $w->{data}{deleted} ? $w->{data}{deleted} : $old ? $old->{deleted} : 0;
                my $operation = !$old ? 'create' : !$old->{deleted} && $deleted ? 'remove' : $old->{deleted} && !$deleted ? 'restore' : 'edit';
                die "journal_operation_forbidden\n" unless ($journal_runtime->{permissions}{$operation} // 'staff') eq 'staff';
                die "journal_operation_forbidden\n" unless grep { $_->{path} eq $w->{path} } @$reads;
                my ($id) = $w->{path} =~ m{/([^/]+)\z};
                $entries_written{$id} = $operation;
                $entry_writes{$id} = $w;
            }
            my %logged;
            for my $w (@$writes) {
                next if _parent($w->{path}) eq $entries;
                die "journal_operation_forbidden\n" unless _parent($w->{path}) eq $logs && $w->{op} eq 'set' && !defined $rows{$w->{path}}{body};
                my $id = $w->{data}{entryId} // '';
                die "journal_operation_forbidden\n" unless exists $entries_written{$id};
                die "journal_operation_forbidden\n" if $entries_written{$id} ne 'create' && ($w->{data}{reason} // '') !~ /\S/;
                my $entry = $entry_writes{$id};
                my $old_body = $rows{$entry->{path}}{body};
                $w->{data}{details} = { before => defined $old_body ? $json->decode($old_body) : undef, after => $entry->{data} };
                $w->{data}{user} = $patron->userid;
                $w->{data}{timestamp} = {__pmkType => 'serverTimestamp'};
                $w->{data}{action} = {create=>'Création',edit=>'Modification',remove=>'SoftDeletion',restore=>'Restore'}->{$entries_written{$id}};
                $logged{$id} = 1;
            }
            die "journal_operation_forbidden\n" if grep { !$logged{$_} } keys %entries_written;
        }
        my $millis = int(time() * 1000); my %revisions;
        for my $w (@$writes) {
            my $row = $rows{$w->{path}};
            die "document_missing\n" if $w->{op} eq 'update' && !defined $row->{body};
            my $data = $w->{op} eq 'delete' ? undef : _resolve($w->{data}, $millis);
            if (defined $data && ($w->{merge} || $w->{op} eq 'update')) {
                my $old = defined $row->{body} ? $json->decode($row->{body}) : {};
                if ($w->{op} eq 'update') {
                    for my $key (keys %$data) {
                        my @parts = split /\./, $key; my $target = $old;
                        for my $part (@parts[0..$#parts-1]) { $target->{$part} = {} unless ref($target->{$part}) eq 'HASH'; $target = $target->{$part}; }
                        $target->{$parts[-1]} = $data->{$key};
                    }
                    $data = $old;
                } else { $data = _merge($old, $data); }
            }
            $dbh->do('INSERT INTO koha_plugin_pimpmykoha_data_history (namespace,path,body,revision,saved_by) VALUES (?,?,?,?,?)', undef, $ns, $w->{path}, $row->{body}, $row->{revision}, $patron->borrowernumber);
            my $body = defined $data ? $json->encode($data) : undef;
            $dbh->do('UPDATE koha_plugin_pimpmykoha_data SET body=?, revision=revision+1, updated_by=? WHERE namespace=? AND path=?', undef, $body, $patron->borrowernumber, $ns, $w->{path});
            $row->{body} = $body; $row->{revision}++;
            $revisions{$w->{path}} = 0 + $row->{revision};
        }
        $dbh->commit; $transaction = 0;
        return $c->render(status => 200, openapi => {revisions => \%revisions});
    } catch {
        my $error = $_;
        try { $dbh->rollback if $transaction; } catch { };
        # InnoDB can choose a deadlock victim even with ordered row locks (gap
        # locks for new IDs). A rejected transaction is safe to retry in full.
        if ("$error" =~ /Deadlock found|Lock wait timeout|\b1213\b|\b1205\b/) {
            return $c->render(status => 409, openapi => {error => 'data_changed'});
        }
        return $c->render(status => 403, openapi => {error => 'journal_operation_forbidden'}) if $error =~ /\Ajournal_operation_forbidden/;
        return $c->render(status => 403, openapi => {error => 'private_profile_forbidden'}) if $error =~ /\Aprivate_profile_forbidden/;
        if ($error =~ /\A(invalid_\w+|document_missing)\n/) {
            return $c->render(status => $1 eq 'document_missing' ? 404 : 400, openapi => {error => $1});
        }
        $c->unhandled_exception($error);
    };
}
1;
