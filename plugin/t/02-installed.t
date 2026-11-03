#!/usr/bin/perl
use Modern::Perl;
use Test::More;
use Test::NoWarnings 'had_no_warnings';
use C4::Context;
use Koha::Plugins;

my @plugins = Koha::Plugins->new({ enable_plugins => 1 })->GetPlugins();
my ($pmk) = grep { ($_ ->get_metadata->{name} // '') eq 'PimpMyKoha' } @plugins;
ok($pmk, 'PimpMyKoha is installed and discoverable by Koha');

if ($pmk) {
    is($pmk->get_metadata->{version}, '0.4.0', 'installed plugin version');
}

my $dbh = C4::Context->dbh;
for my $table (
    qw(
      koha_plugin_pimpmykoha_documents
      koha_plugin_pimpmykoha_history
      koha_plugin_pimpmykoha_data
      koha_plugin_pimpmykoha_data_history
    )
) {
    my ($found) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?},
        undef,
        $table
    );
    is($found, 1, "$table exists");
}

had_no_warnings;
done_testing;
