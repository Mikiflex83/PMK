#!/usr/bin/perl
# Détection de pmk_migration sans charger Koha.
# Les Koha qui fournissent un CGI restent sur cet objet.
# Les Koha 25.11+ appellent intranet_js sans CGI : la query string prend le relais.
use strict;
use warnings;
use Test::More;
use FindBin;

my $path = "$FindBin::Bin/../plugin/Koha/Plugin/PimpMyKoha.pm";
open my $fh, '<:encoding(UTF-8)', $path or die "$path: $!";
my $source = do { local $/; <$fh> };
close $fh or die "$path: $!";
$source =~ s/\r\n/\n/g;

like($source, qr/\$self->\{cgi\}/, 'le CGI du plugin reste le chemin des Koha anciens');
like($source, qr/QUERY_STRING/, 'la query string couvre les Koha sans CGI');

my ($helpers) = $source =~ m/^(sub _query_unescape\b.*?^sub _migration_requested\b.*?\n\}\n)/ms;
ok($helpers, 'les aides de requête sont présentes dans le plugin');

eval "package PMKMigrationRequest;\nuse strict;\nuse warnings;\n" . $helpers . "\n1;\n";
die $@ if $@;

package FakeCGI;
sub new { bless { value => $_[1] }, $_[0] }
sub param { return $_[0]->{value} }

package main;

my $legacy = bless { cgi => FakeCGI->new('1') }, 'PMKMigrationRequest';
local $ENV{QUERY_STRING} = '';
is($legacy->_migration_requested, 1, 'Koha ancien : pmk_migration=1 vient du CGI');

$legacy = bless { cgi => FakeCGI->new(undef) }, 'PMKMigrationRequest';
local $ENV{QUERY_STRING} = 'pmk_migration=1';
is($legacy->_migration_requested, 0, 'Koha ancien : un CGI sans le paramètre reste prioritaire');

$legacy = bless { cgi => FakeCGI->new('0') }, 'PMKMigrationRequest';
is($legacy->_migration_requested, 0, 'Koha ancien : la valeur 0 reste fausse');

my $recent = bless {}, 'PMKMigrationRequest';
local $ENV{QUERY_STRING} = 'class=Koha%3A%3APlugin%3A%3APimpMyKoha&pmk_migration=1';
local $ENV{REDIRECT_QUERY_STRING} = undef;
local $ENV{REQUEST_URI} = '/cgi-bin/koha/mainpage.pl';
is($recent->_migration_requested, 1, 'Koha 25.11+ : pmk_migration=1 vient de QUERY_STRING');

local $ENV{QUERY_STRING} = 'pmk_migration=0';
is($recent->_migration_requested, 0, 'Koha 25.11+ : la valeur 0 reste fausse');

local $ENV{QUERY_STRING} = 'note=pmk_migration%3D1&other_pmk_migration=1';
is($recent->_migration_requested, 0, 'un autre paramètre ne déclenche pas la transition');

local $ENV{QUERY_STRING} = '';
local $ENV{REDIRECT_QUERY_STRING} = 'pmk_migration=1';
is($recent->_migration_requested, 1, 'REDIRECT_QUERY_STRING sert quand QUERY_STRING est vide');

local $ENV{QUERY_STRING} = 'foo=1';
local $ENV{REDIRECT_QUERY_STRING} = 'pmk_migration=1';
is($recent->_migration_requested, 0, 'une query string déjà renseignée n’est pas complétée par une redirection');

local $ENV{QUERY_STRING} = undef;
local $ENV{REDIRECT_QUERY_STRING} = undef;
local $ENV{REQUEST_URI} = '/cgi-bin/koha/mainpage.pl?pmk_migration=1';
is($recent->_migration_requested, 1, 'REQUEST_URI sert en dernier recours');

local $ENV{REQUEST_URI} = '/cgi-bin/koha/mainpage.pl';
is($recent->_migration_requested, 0, 'une page sans le paramètre ne charge pas la transition');

is($recent->_migration_requested({ page => 'mainpage.pl' }), 0, 'le nom de script transmis par Koha ne suffit pas');
is($recent->_migration_requested({ page => 'mainpage.pl?pmk_migration=1' }), 1, 'une query jointe au nom de script est reconnue');
local $ENV{QUERY_STRING} = '';
is($recent->_migration_requested({ pmk_migration => 1 }), 1, 'un argument explicite du hook est reconnu');

done_testing();
