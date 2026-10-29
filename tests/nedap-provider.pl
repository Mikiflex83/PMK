#!/usr/bin/perl
# Run inside the dedicated Koha test instance. All provider responses are mocked.
use Modern::Perl;
use Test::More;
use Mojo::Transaction::HTTP;
use Koha::Plugin::PimpMyKoha::Nedap;
{
 package PMKTest::Context;
 sub new {bless {params=>$_[1],user=>1},$_[0]}
 sub openapi {shift} sub valid_input {shift} sub res {shift} sub headers {shift} sub cache_control {shift} sub validation {shift}
 sub stash {$_[0]{user}} sub param {$_[0]{params}{$_[1]}}
 sub render {my ($self,%args)=@_;return \%args;}
 package PMKTest::Cache;
 sub get_from_cache {$_[0]{$_[1]}} sub set_in_cache {$_[0]{$_[1]}=$_[2]}
 package PMKTest::UA;
 our ($tx,@calls);
 sub get {push @calls,$_[1]->clone;return $tx;}
}
my $saved={revision=>71,rcr=>'900000001',apiKey=>'PMKTEST-NOT-REAL-KEY'};
my $cache=bless {},'PMKTest::Cache';
my $params={rcr=>'900000001',from=>'2026-01-01',to=>'2026-01-02',period=>'DAY',display=>'NO'};
my $provider=[{key=>'PMKTEST-NOT-REAL-KEY',CCINFO=>[{DATA=>[{VALUES=>[{'2026-01-01 00:00:00'=>{IN=>'10',OUT=>3,key=>'do not return'}}]}]}]}];
sub response {my ($status,$json)=@_;my $tx=Mojo::Transaction::HTTP->new;$tx->res->code($status);$tx->res->headers->content_type("application/json");$tx->res->body(JSON->new->utf8->encode($json));$PMKTest::UA::tx=$tx;}
sub call {Koha::Plugin::PimpMyKoha::Nedap::counts(PMKTest::Context->new({%$params,@_}));}
{
 no warnings 'redefine';
 local *Koha::Plugin::PimpMyKoha::Nedap::_read=sub {return $saved;};
 local *Koha::Plugin::PimpMyKoha::Nedap::_user_agent=sub {bless {},'PMKTest::UA'};
 local *Koha::Caches::get_instance=sub {$cache};
 response(200,$provider);
 my $result=call();is($result->{status},200,'Provider data accepted');
 is_deeply($result->{openapi},[{CCINFO=>[{DATA=>[{VALUES=>[{'2026-01-01 00:00:00'=>{IN=>10,OUT=>3}}]}]}]}],'Only required numerical counters forwarded');
 is($PMKTest::UA::calls[0]->host,'api.libnet.online','Fixed provider host');
 is($PMKTest::UA::calls[0]->scheme,'https','HTTPS only');
 is($PMKTest::UA::calls[0]->path->to_string,'/CCinfo.php/900000001/2026-01-01/2026-01-02/DAY','Bounded native provider path');
 is($PMKTest::UA::calls[0]->query->param('key'),'PMKTEST-NOT-REAL-KEY','Server credential sent only to provider');
 call();is(scalar @PMKTest::UA::calls,1,'Repeated read uses cache');
 for my $bad ({from=>'2026-02-30'},{to=>'2025-12-31'},{to=>'2028-01-01'},{period=>'HOUR',to=>'2026-02-01'},{rcr=>'../../other'},{period=>'DAY?url=https://other'},{display=>'URL'}) {
  is(call(%$bad)->{status},400,'Reject invalid interval or path segment before provider access');
 }
 is(call(rcr=>'900000002')->{status},409,'Different RCR cannot use configured credential');
 is(scalar @PMKTest::UA::calls,1,'Rejected inputs make no provider calls');
 $saved->{revision}++;response(302,{});my $redirect=call();is($redirect->{status},502,'Redirect refused');
 $saved->{revision}++;response(401,{error=>'PMKTEST-NOT-REAL-KEY'});my $auth=call();is($auth->{openapi}{error},'provider_authentication_failed','Provider authentication failure distinct and sanitized');
 $saved->{revision}++;response(200,{error=>'key echoed by provider'});is(call()->{openapi}{error},'provider_invalid_response','Malformed provider payload refused');
 $saved->{revision}++;response(200,[{CCINFO=>[{DATA=>[{VALUES=>[{'2026-01-01'=>{IN=>'NaN'}}]}]}]}]);is(call()->{status},502,'Nonnumeric counts refused');
 $saved->{apiKey}='';is(call()->{status},409,'Missing credential distinct');
}
my $ua=Koha::Plugin::PimpMyKoha::Nedap::_user_agent();
is($ua->max_redirects,0,'Redirects disabled in actual client');is($ua->insecure,0,'TLS certificate verification on');is($ua->request_timeout,15,'Provider request timeout bounded');is($ua->max_response_size,2_000_000,'Provider response size bounded');
done_testing;
