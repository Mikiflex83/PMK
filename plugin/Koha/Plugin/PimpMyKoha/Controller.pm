package Koha::Plugin::PimpMyKoha::Controller;

use Modern::Perl;
use Mojo::Base 'Mojolicious::Controller';
use JSON ();
use Try::Tiny;
use C4::Context;
use Koha::Plugin::PimpMyKoha;
use Koha::Plugin::PimpMyKoha::NativeData;
use Koha::Plugin::PimpMyKoha::Restoration;
use Koha::Reports;
use Koha::Plugin::PimpMyKoha::Nedap;
my $document_json = JSON->new->canonical;

sub nedap_settings { return Koha::Plugin::PimpMyKoha::Nedap::settings(shift); }
sub nedap_counts { return Koha::Plugin::PimpMyKoha::Nedap::counts(shift); }

sub report_diagnostic {
    my $c=shift->openapi->valid_input or return;
    my $p=$c->stash('koha.user');
    $c->res->headers->cache_control('no-store');
    return $c->render(status=>403,openapi=>{error=>'configuration_permission_required'}) unless $p && (($p->flags // 0)&1);
    my $report=Koha::Reports->find($c->validation->param('report_id'));
    return $c->render(status=>404,openapi=>{error=>'report_missing'}) unless $report;
    # Metadata only: no saved SQL is executed or returned by this diagnostic.
    my @parameters=($report->savedsql // '') =~ /<<([^<>]+)>>/g;
    return $c->render(status=>200,openapi=>{report_id=>0+$report->id,name=>$report->report_name // '',parameters=>\@parameters,executed=>JSON::false});
}
sub restoration { return Koha::Plugin::PimpMyKoha::Restoration::exchange(shift); }
sub data { return Koha::Plugin::PimpMyKoha::NativeData::exchange(shift); }
sub get_native_session {
    my $c = shift->openapi->valid_input or return;
    my $p = $c->stash('koha.user');
    return $c->render(status => 403, openapi => {error => 'staff_required'}) unless $p;
    $c->res->headers->cache_control('no-store');
    return $c->render(status => 200, openapi => {
        uid => '' . $p->borrowernumber, userid => $p->userid,
        displayName => join(' ', grep { defined && length } ($p->firstname, $p->surname)),
        isAdmin => (($p->flags // 0) & 1) ? JSON::true : JSON::false,
    });
}

# Explicit administrator-only migration snapshot, including assigned personal favorites.
# Ordinary configuration exports continue to exclude favorites.
sub migration_configuration {
    my $c = shift->openapi->valid_input or return;
    my $p = $c->stash('koha.user');
    return $c->render(status => 403, openapi => {error => 'superlibrarian_required'}) unless $p && (($p->flags // 0) & 1);
    my $dbh = C4::Context->dbh;
    $c->res->headers->cache_control('no-store');
    if ($c->req->method eq 'GET') {
        my $rows = $dbh->selectall_arrayref('SELECT document_key,body,revision FROM koha_plugin_pimpmykoha_documents ORDER BY document_key', {Slice=>{}});
        return $c->render(status=>200,openapi=>{documents=>[map {{path=>$_->{document_key},data=>$document_json->decode($_->{body}),revision=>0+$_->{revision}}} @$rows]});
    }
    return $c->render(status=>403,openapi=>{error=>'pmk_request_required'}) unless ($c->req->headers->header('X-PMK-Request') // '') eq '1';
    my $plugin = Koha::Plugin::PimpMyKoha->new;
    return $c->render(status=>409,openapi=>{error=>'runtime_must_be_paused'}) if ($plugin->retrieve_data('runtime_enabled') // '1') ne '0';
    my $in=$c->req->json;
    return $c->render(status=>400,openapi=>{error=>'invalid_request'}) unless ref($in) eq 'HASH' && ref($in->{documents}) eq 'ARRAY' && @{$in->{documents}} <= 2000;
    return $c->render(status=>413,openapi=>{error=>'request_too_large'}) if length($document_json->encode($in))>25_000_000;
    my %seen; my $transaction=0;
    return try {
        for my $row (@{$in->{documents}}) {
            die "invalid_document\n" unless ref($row) eq 'HASH' && ($row->{path}//'') =~ /\A[a-zA-Z0-9_-]{1,190}\z/ && !$seen{$row->{path}}++ && ref($row->{data}) eq 'HASH' && ($row->{revision}//'') =~ /\A\d+\z/;
            if ($row->{path} =~ /\A147-favorites-(.+)\z/) {
                my $uid=$1;
                die "invalid_owner\n" unless $uid =~ /\A\d+\z/ && $dbh->selectrow_array('SELECT borrowernumber FROM borrowers WHERE borrowernumber=?',undef,$uid);
                my $favorites=$row->{data}{favorites};
                die "invalid_favorites\n" unless ref($favorites) eq 'ARRAY' && @$favorites<=300 && !grep { ref($_)||!defined($_)||length($_)>300 } @$favorites;
                $row->{data}{ownerKohaId}=$uid;
            }
        }
        $dbh->begin_work;$transaction=1;
        for my $row (sort {$a->{path} cmp $b->{path}} @{$in->{documents}}) {
            $dbh->do(q{INSERT IGNORE INTO koha_plugin_pimpmykoha_documents(document_key,body,revision) VALUES (?,'{}',0)},undef,$row->{path});
            my $old=$dbh->selectrow_hashref('SELECT body,revision FROM koha_plugin_pimpmykoha_documents WHERE document_key=? FOR UPDATE',undef,$row->{path});
            die "configuration_changed\n" unless $old->{revision}==$row->{revision};
            $dbh->do('INSERT INTO koha_plugin_pimpmykoha_history(document_key,body,revision,saved_by) VALUES (?,?,?,?)',undef,$row->{path},$old->{body},$old->{revision},$p->borrowernumber);
            $dbh->do('UPDATE koha_plugin_pimpmykoha_documents SET body=?,revision=revision+1,updated_by=? WHERE document_key=?',undef,$document_json->encode($row->{data}),$p->borrowernumber,$row->{path});
        }
        $dbh->commit;$transaction=0;
        return $c->render(status=>200,openapi=>{applied=>scalar @{$in->{documents}}});
    } catch {
        my $error=$_;try {$dbh->rollback if $transaction;} catch {};
        return $c->render(status=>409,openapi=>{error=>'configuration_changed'}) if $error =~ /configuration_changed|Deadlock found|Lock wait timeout/;
        return $c->render(status=>400,openapi=>{error=>$1}) if $error =~ /\A(invalid_\w+)\n/;
        $c->unhandled_exception($error);
    };
}

sub runtime_control {
    my $c = shift->openapi->valid_input or return;
    my $p = $c->stash('koha.user');
    return $c->render(status => 403, openapi => {error => 'superlibrarian_required'}) unless $p && (($p->flags // 0) & 1);
    my $plugin = Koha::Plugin::PimpMyKoha->new;
    if ($c->req->method eq 'PUT') {
        return $c->render(status => 403, openapi => {error => 'pmk_request_required'}) unless ($c->req->headers->header('X-PMK-Request') // '') eq '1';
        my $in = $c->req->json;
        return $c->render(status => 400, openapi => {error => 'invalid_request'}) unless ref($in) eq 'HASH' && JSON::is_bool($in->{enabled});
        $plugin->store_data({runtime_enabled => $in->{enabled} ? '1' : '0'});
    }
    $c->res->headers->cache_control('no-store');
    return $c->render(status => 200, openapi => {enabled => ($plugin->retrieve_data('runtime_enabled') // '1') eq '1' ? JSON::true : JSON::false});
}

sub asset {
    my $c = shift->openapi->valid_input or return;
    my $path = $c->req->url->path->to_string;
    $path =~ s{\A/?(?:api/v1/)?contrib/pmk/static/}{};
    return $c->render(status => 404, text => 'Not found') if $path =~ /(?:\.\.|%|\\)/;
    my $plugin = Koha::Plugin::PimpMyKoha->new;
    my $file;
    try { $file = $plugin->mbf_path($path); } catch { };
    unless ($file && -f $file) {
        warn "PMK bundled resource not found: $path\n";
        return $c->render(status => 404, text => 'Not found');
    }
    # Only the literal resource routes declared from the manifest reach here.
    $c->res->headers->cache_control($c->param('v') ? 'private, max-age=31536000, immutable' : 'private, no-cache');
    $c->res->headers->content_type('application/javascript; charset=utf-8') if $path =~ /\.js\z/;
    $c->res->headers->content_type('application/json; charset=utf-8') if $path =~ /\.json\z/;
    $c->res->headers->content_type('text/plain; charset=utf-8') if $path =~ /\.sql\z/;
    return $c->reply->file($file);
}

sub _identity {
    my ($c, $write) = @_;
    my $patron = $c->stash('koha.user');
    return $c->render(status => 403, openapi => {error => 'staff_required'}) unless $patron;
    my $key = $c->param('document_key');
    unless (defined $key && $key =~ /\A[a-zA-Z0-9_-]{1,190}\z/) {
        return $c->render(status => 400, openapi => {error => 'invalid_document_key'});
    }
    if ($key =~ /^147-favorites-/) {
        # L'identité est déterminée par la session Koha, jamais par un ID envoyé.
        $key = '147-favorites-' . $patron->borrowernumber;
    } elsif ($write && !(($patron->flags // 0) & 1)) {
        return $c->render(status => 403, openapi => {error => 'superlibrarian_required'});
    }
    return [$patron, $key];
}

sub get_configuration {
    my $c = shift->openapi->valid_input or return;
    return $c->render(status => 403, openapi => {error => 'staff_required'})
        unless $c->stash('koha.user');
    return try {
        # Same read permissions as get_document. Personal favorites are never
        # included: their identity must continue to come from the session.
        my $rows = C4::Context->dbh->selectall_arrayref(
            q{SELECT document_key, body, revision FROM koha_plugin_pimpmykoha_documents
              WHERE document_key NOT LIKE '147-favorites-%'}, {Slice => {}});
        my %documents;
        for my $row (@$rows) {
            $documents{$row->{document_key}} = {
                exists => JSON::true, data => $document_json->decode($row->{body}),
                revision => 0 + $row->{revision},
            };
        }
        $c->res->headers->cache_control('no-store');
        return $c->render(status => 200, openapi => {documents => \%documents});
    } catch { $c->unhandled_exception($_); };
}

sub get_document {
    my $c = shift->openapi->valid_input or return;
    my $identity = _identity($c, 0);
    return unless ref($identity) eq 'ARRAY';
    my ($patron, $key) = @$identity;
    return try {
        my $row = C4::Context->dbh->selectrow_hashref(
            'SELECT body, revision FROM koha_plugin_pimpmykoha_documents WHERE document_key = ?', undef, $key);
        $c->res->headers->cache_control('no-store');
        return $c->render(status => 200, openapi => {
            exists => $row ? JSON::true : JSON::false,
            data => $row ? $document_json->decode($row->{body}) : undef,
            revision => $row ? 0 + $row->{revision} : 0,
        });
    } catch { $c->unhandled_exception($_); };
}

sub put_document {
    my $c = shift->openapi->valid_input or return;
    my $identity = _identity($c, 1);
    return unless ref($identity) eq 'ARRAY';
    my ($patron, $key) = @$identity;
    # En plus de l'authentification Koha : en-tête non simple, impossible à envoyer
    # par un formulaire intersite. Aucun CORS n'est ouvert par ce plugin.
    return $c->render(status => 403, openapi => {error => 'pmk_request_required'})
        unless ($c->req->headers->header('X-PMK-Request') // '') eq '1';
    my $input = $c->req->json;
    return $c->render(status => 400, openapi => {error => 'invalid_document'})
        unless ref($input) eq 'HASH' && ref($input->{data}) eq 'HASH'
            && defined $input->{revision} && $input->{revision} =~ /^\d+$/;
    my $body = $document_json->encode($input->{data});
    return $c->render(status => 413, openapi => {error => 'document_too_large'}) if length($body) > 5_000_000;
    if ($key =~ /^147-favorites-/) {
        my $favorites = $input->{data}{favorites};
        return $c->render(status => 400, openapi => {error => 'invalid_favorites'})
            unless ref($favorites) eq 'ARRAY' && @$favorites <= 300
                && !grep { ref($_) || !defined($_) || length($_) > 300 } @$favorites;
        $body = $document_json->encode({favorites => $favorites, ownerKohaId => '' . $patron->borrowernumber});
    }
    my $dbh = C4::Context->dbh;
    my $revision;
    return try {
        $dbh->begin_work;
        # INSERT IGNORE matérialise aussi le verrou du tout premier enregistrement.
        $dbh->do(q{INSERT IGNORE INTO koha_plugin_pimpmykoha_documents (document_key, body, revision) VALUES (?, '{}', 0)}, undef, $key);
        my $row = $dbh->selectrow_hashref(
            'SELECT body, revision FROM koha_plugin_pimpmykoha_documents WHERE document_key = ? FOR UPDATE', undef, $key);
        if ($row->{revision} != $input->{revision}) {
            $dbh->rollback;
            return $c->render(status => 409, openapi => {error => 'configuration_changed', revision => 0 + $row->{revision}});
        }
        if ($row->{revision} > 0) {
            $dbh->do('INSERT INTO koha_plugin_pimpmykoha_history (document_key, body, revision, saved_by) VALUES (?, ?, ?, ?)',
                undef, $key, $row->{body}, $row->{revision}, $patron->borrowernumber);
        }
        $revision = $row->{revision} + 1;
        $dbh->do('UPDATE koha_plugin_pimpmykoha_documents SET body = ?, revision = ?, updated_by = ? WHERE document_key = ?',
            undef, $body, $revision, $patron->borrowernumber, $key);
        $dbh->commit;
        return $c->render(status => 200, openapi => {revision => $revision});
    } catch {
        try { $dbh->rollback; } catch { };
        $c->unhandled_exception($_);
    };
}

1;
