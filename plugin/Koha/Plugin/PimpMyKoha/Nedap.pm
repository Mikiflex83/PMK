package Koha::Plugin::PimpMyKoha::Nedap;

use Modern::Perl;
use JSON ();
use Try::Tiny;
use Time::Local qw(timegm);
use Digest::SHA qw(sha256_hex);
use Mojo::UserAgent;
use C4::Context;
use Koha::Caches;

my $json = JSON->new->canonical;
my $class = 'Koha::Plugin::PimpMyKoha';
my $key = 'nedap_server_credentials';

sub _read {
    my ($lock) = @_;
    my $raw = C4::Context->dbh->selectrow_array(
        'SELECT plugin_value FROM plugin_data WHERE plugin_class=? AND plugin_key=?'.($lock?' FOR UPDATE':''),
        undef,$class,$key);
    return $raw ? $json->decode($raw) : {revision=>0,rcr=>'',apiKey=>''};
}

sub settings {
    my $c=shift->openapi->valid_input or return;
    $c->res->headers->cache_control('no-store');
    my $patron=$c->stash('koha.user');
    return $c->render(status=>403,openapi=>{error=>'superlibrarian_required'}) unless $patron && (($patron->flags // 0)&1);
    my $dbh=C4::Context->dbh;my $transaction=0;
    return try {
        my $saved;
        if ($c->req->method eq 'PUT') {
            return $c->render(status=>403,openapi=>{error=>'pmk_request_required'}) unless ($c->req->headers->header('X-PMK-Request') // '') eq '1';
            my $in=$c->req->json;
            die "invalid_request\n" unless ref($in) eq 'HASH' && !grep { !/\A(?:revision|rcr|apiKey|clearKey)\z/ } keys %$in;
            die "invalid_request\n" unless !ref($in->{revision}) && ($in->{revision}//'') =~ /\A\d{1,10}\z/;
            die "invalid_request\n" unless !ref($in->{rcr}) && ($in->{rcr}//'') =~ /\A\d{9}\z/;
            die "invalid_request\n" if exists($in->{apiKey}) && (ref($in->{apiKey}) || !defined($in->{apiKey}) || length($in->{apiKey})>512 || $in->{apiKey}=~/[\x00-\x20\x7f]/);
            die "invalid_request\n" if exists($in->{clearKey}) && !JSON::is_bool($in->{clearKey});
            die "invalid_request\n" if $in->{clearKey} && length($in->{apiKey}//'');
            $dbh->begin_work;$transaction=1;
            $dbh->do(q{INSERT IGNORE INTO plugin_data(plugin_class,plugin_key,plugin_value) VALUES (?,?,'{"revision":0,"rcr":"","apiKey":""}')},undef,$class,$key);
            $saved=_read(1);
            die "configuration_changed\n" unless $saved->{revision}==$in->{revision};
            my $secret=$in->{clearKey}?'':length($in->{apiKey}//'')?$in->{apiKey}:$saved->{apiKey};
            die "key_required\n" unless length($secret) || $in->{clearKey};
            $saved={revision=>$saved->{revision}+1,rcr=>$in->{rcr},apiKey=>$secret};
            $dbh->do('UPDATE plugin_data SET plugin_value=? WHERE plugin_class=? AND plugin_key=?',undef,$json->encode($saved),$class,$key);
            $dbh->commit;$transaction=0;
        } else { $saved=_read(0); }
        # The secret is deliberately absent from browser configuration, exports and replies.
        return $c->render(status=>200,openapi=>{revision=>0+$saved->{revision},rcr=>$saved->{rcr},hasKey=>length($saved->{apiKey}//'')?JSON::true:JSON::false});
    } catch {
        my $error=$_;try {$dbh->rollback if $transaction;} catch {};
        return $c->render(status=>409,openapi=>{error=>'configuration_changed'}) if $error =~ /configuration_changed|Deadlock found|Lock wait timeout/;
        return $c->render(status=>400,openapi=>{error=>$1}) if $error =~ /\A(invalid_request|key_required)\n/;
        # Never log a request, credential or provider URL on this path.
        return $c->render(status=>500,openapi=>{error=>'nedap_settings_unavailable'});
    };
}

sub _day {
    my ($value)=@_;
    die "invalid_interval\n" unless defined($value) && $value =~ /\A(\d{4})-(\d{2})-(\d{2})\z/;
    my ($year,$month,$day)=($1+0,$2+0,$3+0);
    die "invalid_interval\n" unless $year>=1900 && $year<=2200 && $month>=1 && $month<=12 && $day>=1 && $day<=31;
    my $time=eval {timegm(0,0,0,$day,$month-1,$year)};
    die "invalid_interval\n" if $@;
    my @date=gmtime($time);
    die "invalid_interval\n" unless $date[3]==$day && $date[4]==$month-1 && $date[5]+1900==$year;
    return $time;
}

sub _user_agent {
    my $ua=Mojo::UserAgent->new;
    $ua->max_redirects(0)->connect_timeout(5)->request_timeout(15)->max_response_size(2_000_000);
    $ua->insecure(0);$ua->proxy->detect;
    return $ua;
}

sub _counts {
    my ($raw)=@_;
    die "provider_invalid_response\n" unless ref($raw) eq 'ARRAY';
    my @values;
    for my $site (@$raw) {
        die "provider_invalid_response\n" unless ref($site) eq 'HASH' && ref($site->{CCINFO}) eq 'ARRAY';
        for my $zone (@{$site->{CCINFO}}) {
            die "provider_invalid_response\n" unless ref($zone) eq 'HASH' && ref($zone->{DATA}) eq 'ARRAY';
            for my $entrance (@{$zone->{DATA}}) {
                die "provider_invalid_response\n" unless ref($entrance) eq 'HASH' && ref($entrance->{VALUES}) eq 'ARRAY';
                for my $point (@{$entrance->{VALUES}}) {
                    die "provider_invalid_response\n" unless ref($point) eq 'HASH';
                    for my $date (sort keys %$point) {
                        die "provider_invalid_response\n" unless $date =~ /\A[0-9:T .+\-]{8,40}\z/ && ref($point->{$date}) eq 'HASH';
                        my %count;
                        for my $field (qw(IN OUT)) {
                            my $n=$point->{$date}{$field};next unless defined $n;
                            die "provider_invalid_response\n" if ref($n) || $n !~ /\A-?\d+(?:\.\d+)?\z/ || abs($n)>1e12;
                            $count{$field}=0+$n;
                        }
                        die "provider_invalid_response\n" unless keys %count;
                        push @values,{$date=>\%count};
                        die "provider_invalid_response\n" if @values>100_000;
                    }
                }
            }
        }
    }
    # Only the counters used by the widget are forwarded, never provider metadata.
    return [{CCINFO=>[{DATA=>[{VALUES=>\@values}]}]}];
}

sub counts {
    my $c=shift->openapi->valid_input or return;
    $c->res->headers->cache_control('no-store');
    return $c->render(status=>403,openapi=>{error=>'staff_required'}) unless $c->stash('koha.user');
    return try {
        my ($rcr,$from,$to,$period,$display)=map {$c->validation->param($_)} qw(rcr from to period display);
        $display //='NO';
        die "invalid_request\n" unless ($rcr//'') =~ /\A\d{9}\z/ && ($period//'') =~ /\A(?:1|5|10|15|30|HOUR|DAY)\z/ && $display =~ /\A(?:YES|NO)\z/;
        my $days=(_day($to)-_day($from))/86400;
        die "invalid_interval\n" unless $days>0 && $days<=($period eq 'DAY'?366:7);
        my $saved=_read(0);
        die "relay_not_configured\n" unless length($saved->{apiKey}//'');
        die "rcr_not_configured\n" unless $saved->{rcr} eq $rcr;
        my $cache=Koha::Caches->get_instance;
        my $cache_key='pmk:nedap:'.sha256_hex(join('|',$saved->{revision},$saved->{apiKey},$rcr,$from,$to,$period,$display));
        my $result=$cache->get_from_cache($cache_key);
        unless (defined $result) {
            # Fixed HTTPS host/path, validated path segments, no browser-selected destination.
            my $url=Mojo::URL->new("https://api.libnet.online/CCinfo.php/$rcr/$from/$to/$period");
            $url->query(key=>$saved->{apiKey},display=>$display);
            my $tx=eval {_user_agent()->get($url)};
            die "provider_unavailable\n" unless $tx;
            my $response=$tx->res;
            die "provider_authentication_failed\n" if ($response->code//0)==401 || ($response->code//0)==402;
            die "provider_unavailable\n" if $tx->error || !$response->is_success;
            my $raw=eval {$response->json};
            $result=_counts($raw);
            $cache->set_in_cache($cache_key,$result,{expiry=>60});
        }
        return $c->render(status=>200,openapi=>$result);
    } catch {
        my $error=$_;
        my ($code)=$error =~ /\A(invalid_request|invalid_interval|relay_not_configured|rcr_not_configured|provider_unavailable|provider_authentication_failed|provider_invalid_response)\n/;
        $code //='provider_unavailable';
        my $status=$code =~ /^invalid_/ ? 400 : $code =~ /^(?:relay_not|rcr_not)/ ? 409 : 502;
        return $c->render(status=>$status,openapi=>{error=>$code});
    };
}

1;
