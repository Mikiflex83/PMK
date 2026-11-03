#!/usr/bin/perl
use Modern::Perl;
use Test::More;
use Test::NoWarnings 'had_no_warnings';

use_ok('Koha::Plugin::PimpMyKoha');
use_ok('Koha::Plugin::PimpMyKoha::Controller');
use_ok('Koha::Plugin::PimpMyKoha::NativeData');
use_ok('Koha::Plugin::PimpMyKoha::Nedap');
use_ok('Koha::Plugin::PimpMyKoha::Restoration');

is($Koha::Plugin::PimpMyKoha::metadata->{name}, 'PimpMyKoha', 'plugin name');
is($Koha::Plugin::PimpMyKoha::metadata->{version}, '0.4.0', 'plugin version');
like(
    $Koha::Plugin::PimpMyKoha::metadata->{minimum_version},
    qr/^25\.11/,
    'minimum Koha version is explicit'
);

had_no_warnings;
done_testing;
