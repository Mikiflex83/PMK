#!/usr/bin/perl
use Modern::Perl;
use C4::Context;
use Koha::Patrons;
use Koha::Libraries;
use Koha::Patron::Categories;

die "Only the isolated kohadev test database is supported\n"
    unless C4::Context->config('database') eq 'koha_kohadev';
my $library = Koha::Libraries->search({})->next or die 'No test library';
my $category = Koha::Patron::Categories->search({})->next or die 'No test category';
for my $userid ('pmk-test-staff', 'pmk-test-staff-2') {
    next if Koha::Patrons->find({userid => $userid});
    my $patron = Koha::Patron->new({
        userid=>$userid, cardnumber=>$userid, surname=>'PMK synthetic test',
        categorycode=>$category->categorycode, branchcode=>$library->branchcode,
        flags=>4,
    })->store;
    $patron->set_password({password=>'pmk-test-only',skip_validation=>1});
}
say 'Two synthetic staff accounts prepared; catalogue permission only.';
