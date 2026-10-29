#!/usr/bin/perl
# Fingerprint configuration and history without printing their contents.
use Modern::Perl;use C4::Context;use JSON;use Digest::SHA qw(sha256_hex);use Encode qw(encode);
die 'Dedicated database required' unless C4::Context->config('database') eq 'koha_kohadev';
my $dbh=C4::Context->dbh;my %result;
for my $table (qw(koha_plugin_pimpmykoha_documents koha_plugin_pimpmykoha_history koha_plugin_pimpmykoha_data koha_plugin_pimpmykoha_data_history)) {
 my $rows=$dbh->selectall_arrayref("SELECT * FROM $table ORDER BY ".($table=~/history/?'id':$table=~/_data$/?'namespace,path':'document_key'),{Slice=>{}});
 $result{$table}={count=>scalar @$rows,sha256=>sha256_hex(encode('UTF-8',JSON->new->canonical->encode($rows)))};
}
my $credentials=$dbh->selectall_arrayref(
 'SELECT plugin_key,plugin_value FROM plugin_data WHERE plugin_class=? AND plugin_key=?',
 {Slice=>{}},'Koha::Plugin::PimpMyKoha','nedap_server_credentials');
$result{nedap_server_credentials}={count=>scalar @$credentials,sha256=>sha256_hex(encode('UTF-8',JSON->new->canonical->encode($credentials)))};
say JSON->new->canonical->encode(\%result);
