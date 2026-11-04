#!/usr/bin/perl
# Contrôles de certification lisibles sans écrire dans Koha.
use strict;
use warnings;
use Test::More;
use File::Find;
use FindBin;

my $root = "$FindBin::Bin/..";
$root = "$root/plugin" if !-d "$root/Koha" && -d "$root/plugin/Koha";
my @perl;
find(sub { push @perl, $File::Find::name if /\.pm\z/ }, "$root/Koha");
ok(@perl, 'modules Perl du plugin présents');

my $perl_forbidden = qr'(?:^|[^\w:])(?:system|exec)\s*\(|\bqx\b|\buse\s+(?:LWP|HTTP::Tiny|IO::Socket|Net::\S*)|\brequire\s+(?:LWP|HTTP::Tiny|IO::Socket|Net::\S*)';
my $firebase = qr'firebaseio\.com|firebasedatabase\.app|firebaseapp\.com|firebasestorage|gstatic\.com/firebasejs|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|\b(?:initializeApp|getFirestore|getAuth|signInAnonymously)\s*\(';

foreach my $path (@perl) {
    open my $fh, '<:raw', $path or die "$path: $!";
    local $/;
    my $source = <$fh>;
    unlike($source, $perl_forbidden, "limites Perl: $path");
    unlike($source, $firebase, "pas de Firebase: $path");
    unlike($source, qr/\bopen\s+\S+\s*,\s*['"]\s*(?:<|>>?)?\s*['"]\s*,\s*['"]\//,
        "pas d'ouverture absolue: $path");
}

my $uninstall = do {
    open my $fh, '<:encoding(UTF-8)', "$root/Koha/Plugin/PimpMyKoha.pm" or die $!;
    local $/;
    <$fh>;
};
like($uninstall, qr/version\s*=>\s*(?:\$VERSION|'[^']+'|"[^"]+")/, 'le manifeste déclare une version');
like($uninstall, qr/license\s*=>\s*'GPL-3\.0-or-later'/, 'le manifeste déclare la licence GPL-3.0-or-later');
like($uninstall, qr/sub uninstall \{ return 1; \}/,
    'la désinstallation ne supprime pas les tables');
unlike($uninstall, qr/DROP\s+TABLE/i, 'aucun DROP TABLE dans le plugin');

my @js;
find(sub { push @js, $File::Find::name if /\.js\z/ }, "$root/Koha") if -d "$root/Koha";
foreach my $path (@js) {
    open my $fh, '<:raw', $path or die "$path: $!";
    local $/;
    unlike(<$fh>, $firebase, "pas de Firebase livré: $path");
}

done_testing();
