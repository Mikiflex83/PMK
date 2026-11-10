#!/usr/bin/perl
# Chargé dans koha-shell : lecture du plugin installé, sans réécriture.
use strict;
use warnings;
use Test::More;

use Koha::Plugin::PimpMyKoha;
use Koha::Plugins;
use C4::Context;

is($Koha::Plugin::PimpMyKoha::VERSION, '0.5.0', 'version 0.5.0');
is($Koha::Plugin::PimpMyKoha::metadata->{version}, '0.5.0', 'version du manifeste');
is($Koha::Plugin::PimpMyKoha::metadata->{license}, 'GPL-3.0-or-later', 'licence déclarée');
ok($Koha::Plugin::PimpMyKoha::metadata->{minimum_version}, 'version minimale déclarée');
is($Koha::Plugin::PimpMyKoha::metadata->{name}, 'PimpMyKoha', 'nom du plugin');

my $plugin = Koha::Plugin::PimpMyKoha->new;
ok($plugin, 'instance déjà installée, sans montée de version');
is($plugin->intranet_js, '', 'aucun script injecté hors session professionnelle');
is($plugin->api_namespace, 'pmk', 'espace API pmk');

my $dbh = C4::Context->dbh;
foreach my $table (qw(
    koha_plugin_pimpmykoha_documents
    koha_plugin_pimpmykoha_history
    koha_plugin_pimpmykoha_data
    koha_plugin_pimpmykoha_data_history
)) {
    my ($found) = $dbh->selectrow_array('SHOW TABLES LIKE ?', undef, $table);
    is($found, $table, "table conservée: $table");
}

my ($runtime) = $dbh->selectrow_array(
    'SELECT plugin_value FROM plugin_data WHERE plugin_class=? AND plugin_key=?',
    undef, 'Koha::Plugin::PimpMyKoha', 'runtime_enabled');
like($runtime // '', qr/\A[01]\z/, 'runtime_enabled reste une valeur du plugin');

my $plugins = Koha::Plugins->new;
my $found = grep { $_->get_metadata->{name} eq 'PimpMyKoha' } $plugins->GetPlugins({all => 1});
ok($found, 'PimpMyKoha est visible par Koha::Plugins');

done_testing();
