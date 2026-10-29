#!/usr/bin/perl
# Synthetic records for the dedicated PMK/Koha integration environment only.
use Modern::Perl;
use utf8;
use JSON ();
use MARC::Record;
use MARC::Field;
use C4::Context;
use C4::Biblio qw(AddBiblio);
use C4::Circulation qw(AddIssue);
use C4::Reserves qw(AddReserve);
use Koha::DateUtils qw(dt_from_string);
use Koha::Libraries;
use Koha::Patrons;
use Koha::Patron::Categories;
use Koha::ItemTypes;
use Koha::Items;
use Koha::Biblios;
use Koha::Reports;
use Koha::CirculationRules;
use Koha::Virtualshelves;

die "This seed is restricted to the dedicated kohadev database\n"
    unless C4::Context->config('database') eq 'koha_kohadev';
my $dbh=C4::Context->dbh;
my $admin=Koha::Patrons->find({userid=>'koha'}) or die 'Demo administrator missing';
my %result=(version=>1,patrons=>{},biblios=>{},items=>{},reports=>{},libraries=>['PMK_A','PMK_B']);
for my $code (@{$result{libraries}}) {
    Koha::Library->new({branchcode=>$code,branchname=>"PMK Test $code"})->store
        unless Koha::Libraries->find($code);
}
for my $category (['PMK_ADULT','A'],['PMK_CHILD','C']) {
    Koha::Patron::Category->new({categorycode=>$category->[0],description=>"PMK Test $category->[0]",
        category_type=>$category->[1],enrolmentperiod=>12,upperagelimit=>999,enrolmentfee=>0,reservefee=>0})->store
        unless Koha::Patron::Categories->find($category->[0]);
}
Koha::ItemType->new({itemtype=>'PMKT',description=>'PMK Test book',notforloan=>0,rentalcharge=>0})->store
    unless Koha::ItemTypes->find('PMKT');
Koha::CirculationRules->set_rules({branchcode=>undef,categorycode=>undef,itemtype=>'PMKT',rules=>{
    maxissueqty=>20,issuelength=>21,lengthunit=>'days',renewalperiod=>21,renewalsallowed=>2,
    reservesallowed=>10,holds_per_record=>1,onshelfholds=>1,
}});
C4::Context->set_userenv($admin->borrowernumber,$admin->userid,$admin->cardnumber,'PMK','Test',
    'PMK_A','PMK Test PMK_A',1);
for my $name (qw(adult child expired duplicate other)) {
    my $card='PMKTEST-'.uc($name);
    my $patron=Koha::Patrons->find({cardnumber=>$card});
    if (!$patron) {
        $patron=Koha::Patron->new({cardnumber=>$card,userid=>lc($card),surname=>'PMKTEST '.uc($name),
            firstname=>'Lecteur',categorycode=>$name eq 'child'?'PMK_CHILD':'PMK_ADULT',branchcode=>'PMK_A',
            address=>'1 rue du Test',city=>'Ville de test',zipcode=>'83000',country=>'France',
            email=>($name eq 'duplicate'?'pmktest-adult':lc($card)).'@example.invalid',phone=>'0102030405',
            dateofbirth=>$name eq 'child'?'2017-06-15':'1986-04-12',
            dateenrolled=>dt_from_string->ymd,dateexpiry=>dt_from_string->add(days=>$name eq 'expired'?-5:365)->ymd,
        })->store;
    }
    $result{patrons}{$name}={id=>0+$patron->borrowernumber,card=>$card,category=>$patron->categorycode};
}
my @books=(
    ['available','Disponible — été et forêt','9782070368228'],
    ['loan','Prêt et renouvellement','9782070413119'],
    ['overdue','Retard de circulation','9782070360021'],
    ['waiting','Réservation en attente','9782070360427'],
    ['transit','Transfert et navette','9782070360533'],
    ['lost','Exemplaire perdu retrouvé','9782070360540'],
    ['serial','Périodique de test',''],
    ['deleted','Exemplaire à restaurer','9782070360557'],
);
for my $book (@books) {
    my ($key,$title,$isbn)=@$book;
    my $full='PMKTEST — '.$title;
    my $biblio=Koha::Biblios->search({title=>$full})->next;
    if (!$biblio) {
        my $record=MARC::Record->new; $record->encoding('UTF-8');
        $record->append_fields(MARC::Field->new('200','1',' ',a=>$full),
            MARC::Field->new('210',' ',' ',a=>'Paris',c=>'Éditions Test',d=>'2026'),
            MARC::Field->new('215',' ',' ',a=>'123 p.'),
            MARC::Field->new('330',' ',' ',a=>'Résumé de recette PMK : caractères accentués, é, à et euro €.'),
            MARC::Field->new('700',' ','1',a=>'Test',b=>'Alice'),
            MARC::Field->new('606',' ',' ',a=>'Bibliothèques'),
            MARC::Field->new('101','0',' ',a=>'fre'));
        $record->append_fields(MARC::Field->new('010',' ',' ',a=>$isbn)) if $isbn;
        my ($id)=AddBiblio($record,'');$biblio=Koha::Biblios->find($id);
    }
    $result{biblios}{$key}=0+$biblio->biblionumber;
    my $barcode='PMKTEST-'.uc($key);
    my $item=Koha::Items->find({barcode=>$barcode});
    if (!$item) {
        $item=Koha::Item->new({biblionumber=>$biblio->biblionumber,
            biblioitemnumber=>$biblio->biblioitem->biblioitemnumber,barcode=>$barcode,
            homebranch=>'PMK_A',holdingbranch=>'PMK_A',itype=>'PMKT',itemcallnumber=>'PMK '.uc($key),
            location=>'CART',permanent_location=>'CART',price=>12.50,replacementprice=>18.90,
            dateaccessioned=>dt_from_string->subtract(days=>$key eq 'available'?2:500)->ymd,
            itemlost=>$key eq 'lost'?1:0,notforloan=>$key eq 'lost'?1:0,withdrawn=>0,damaged=>0,
        })->store;
    }
    $result{items}{$key}={id=>0+$item->itemnumber,barcode=>$barcode,biblio=>0+$biblio->biblionumber};
}
for my $key (qw(loan overdue)) {
    my $item=Koha::Items->find($result{items}{$key}{id});
    next if $item->checkout;
    my $patron=Koha::Patrons->find($result{patrons}{adult}{id});
    my $due=dt_from_string->add(days=>$key eq 'overdue'?-40:14);
    AddIssue($patron,$item->barcode,$due,0,dt_from_string->subtract(days=>60),undef,{forced=>1});
}
my $waiting=Koha::Items->find($result{items}{waiting}{id});
my $hold=$waiting->holds->next;
if (!$hold) {
    my $id=AddReserve({branchcode=>'PMK_A',borrowernumber=>$result{patrons}{other}{id},
        biblionumber=>$waiting->biblionumber,itemnumber=>$waiting->itemnumber,priority=>0,found=>'W',
        reservation_date=>dt_from_string->subtract(days=>15),forced=>1});
    require Koha::Holds;$hold=Koha::Holds->find($id);
    $hold->waitingdate(dt_from_string->subtract(days=>10)->ymd)->store;
}
$result{waitingHold}=0+$hold->reserve_id;
my $transit=Koha::Items->find($result{items}{transit}{id});
my $transfer=$transit->get_transfer || $transit->request_transfer({
    to=>Koha::Libraries->find('PMK_B'),reason=>'Manual',ignore_limits=>1,enqueue=>1,
});
$result{transfer}=0+$transfer->branchtransfer_id;
my $subscription=$dbh->selectrow_array('SELECT subscriptionid FROM subscription WHERE biblionumber=?',undef,$result{biblios}{serial});
if (!$subscription) {
    $dbh->do(q{INSERT INTO subscription (biblionumber, branchcode, startdate, enddate, closed, graceperiod)
        VALUES (?, 'PMK_A', DATE_SUB(CURDATE(), INTERVAL 2 YEAR), DATE_SUB(CURDATE(), INTERVAL 30 DAY), 0, 3)},undef,$result{biblios}{serial});
    $subscription=$dbh->{mysql_insertid};
    for my $status (1,2,3,7) {
        $dbh->do(q{INSERT INTO serial (subscriptionid,biblionumber,serialseq,status,publisheddate,planneddate,claimdate)
            VALUES (?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL 90 DAY), DATE_SUB(CURDATE(), INTERVAL 90 DAY), DATE_SUB(CURDATE(), INTERVAL 30 DAY))},
            undef,$subscription,$result{biblios}{serial},"PMKTEST $status",$status);
    }
}
$result{subscription}=0+$subscription;
my $vendor=$dbh->selectrow_array('SELECT id FROM aqbooksellers WHERE name=?',undef,'PMKTEST serials vendor');
unless ($vendor) {
    $dbh->do('INSERT INTO aqbooksellers (name, active) VALUES (?,1)',undef,'PMKTEST serials vendor');
    $vendor=$dbh->{mysql_insertid};
}
$dbh->do('UPDATE subscription SET aqbooksellerid=? WHERE subscriptionid=?',undef,$vendor,$subscription);
$result{vendor}=0+$vendor;
my $shelf=Koha::Virtualshelves->search({shelfname=>'PMKTEST bibliography',owner=>$admin->borrowernumber})->next;
if (!$shelf) {
    $shelf=Koha::Virtualshelf->new({shelfname=>'PMKTEST bibliography',owner=>$admin->borrowernumber,public=>0})->store;
    $shelf->add_biblio($result{biblios}{available},$admin->borrowernumber);
    $shelf->add_biblio($result{biblios}{loan},$admin->borrowernumber);
}
$result{shelf}=0+$shelf->shelfnumber;
my $sql_dir=$ENV{PMK_SQL_DIR} || '/pmk-plugin/Koha/Plugin/PimpMyKoha/assets/sql';
for my $file (glob("$sql_dir/*.sql")) {
    my ($name)=$file=~m{([^/]+)$};my $title="PMKTEST $name";
    my $report=Koha::Reports->search({report_name=>$title})->next;
    open my $fh,'<:encoding(UTF-8)',$file or die $!;local $/;my $sql=<$fh>;
    if (!$report) {
        $report=Koha::Report->new({report_name=>$title,savedsql=>$sql,notes=>'PMK dedicated synthetic recipe',borrowernumber=>$admin->borrowernumber})->store;
    } elsif ($report->savedsql ne $sql) {
        # Only reports bearing our synthetic fixture prefix are updated.
        $report->savedsql($sql)->store;
    }
    $result{reports}{$name}=0+$report->id;
}
binmode STDOUT,':encoding(UTF-8)';
say 'PMK_FIXTURES_JSON '.JSON->new->canonical->encode(\%result);
