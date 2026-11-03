#!/usr/bin/perl
use Modern::Perl;
use Test::More;
use Test::NoWarnings 'had_no_warnings';
use FindBin qw($Bin);
use File::Spec;
use JSON qw(decode_json);

my $plugin_dir = File::Spec->catdir($Bin, '..', 'Koha', 'Plugin', 'PimpMyKoha');

sub read_json {
    my ($name) = @_;
    my $path = File::Spec->catfile($plugin_dir, $name);
    open my $fh, '<:raw', $path or die "Cannot open $path: $!";
    local $/;
    return decode_json(<$fh>);
}

my $manifest = read_json('manifest.json');
is($manifest->{version}, '0.4.0', 'manifest version');
ok(@{$manifest->{scripts}} >= 100, 'complete script manifest');
ok($manifest->{autoloadBundle}, 'autoload bundle declared');
ok(-f File::Spec->catfile($plugin_dir, $manifest->{autoloadBundle}), 'autoload bundle exists');
ok(!-e File::Spec->catfile($plugin_dir, 'assets', '000-drac-quality-memory-firebase.js'), 'retired Firebase learning client is absent');

my $api = read_json('api.json');
my $paths = $api->{paths} || $api;
ok(keys(%{$paths}) >= 10, 'native API exposes the expected route set');
for my $path (sort keys %{$paths}) {
    for my $method (grep { /^(?:get|post|put|patch|delete)$/ } keys %{$paths->{$path}}) {
        my $operation = $paths->{$path}{$method};
        ok($operation->{'x-koha-authorization'}, "$method $path declares Koha authorization");
    }
}

had_no_warnings;
done_testing;
