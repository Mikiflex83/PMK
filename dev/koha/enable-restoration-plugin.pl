#!/usr/bin/perl
# Optional integration-test dependency, installed separately from the PMK KPZ.
use Modern::Perl;use C4::Context;use lib '/var/lib/koha/kohadev/plugins';
die 'Dedicated database required' unless C4::Context->config('database') eq 'koha_kohadev';
require Koha::Plugin::UndeleteRecords;
my $plugin=Koha::Plugin::UndeleteRecords->new;
$plugin->enable unless $plugin->is_enabled;
die 'Restoration plugin is not enabled' unless $plugin->is_enabled;
say 'Local restoration test dependency enabled.';
