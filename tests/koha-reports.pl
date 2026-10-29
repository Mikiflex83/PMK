#!/usr/bin/perl
# Execute fixture SQL using Koha's report validator and parameter preparation.
use Modern::Perl;use utf8;use JSON;use Koha::Reports;use C4::Context;use C4::Reports::Guided qw(execute_query);
die 'Dedicated database required' unless C4::Context->config('database') eq 'koha_kohadev';
C4::Context->dbh->do('SET SESSION max_statement_time=60');
my @results;
my $reports=Koha::Reports->search({report_name=>{-like=>'PMKTEST %.sql'}});
while(my $report=$reports->next){
 my $raw=$report->savedsql;my @names=$raw=~/<<([^>]+)>>/g;
 my @params=map { /date/ ? (/^Du/?'2026-01-01':'2026-12-31') : /branches/?'%' : /barcode|barres/i?'PMKTEST-DELETED': /Biblionumber/?'21652': /exemplaire/i?'23148':'0' } @names;
 my ($sql)=$report->prep_report(\@names,\@params);
 my ($sth,$errors)=execute_query({sql=>$sql,offset=>0,limit=>10,report_id=>$report->id});
 die $report->report_name.': '.encode_json($errors) if $errors;
 my $rows=$sth->fetchall_arrayref({});
 push @results,{name=>$report->report_name,passed=>JSON::true,rows=>scalar @$rows,columns=>$sth->{NAME}};
}
die 'Thirteen fixture reports required' unless @results==13;
print encode_json({kind=>'Native Koha report validation, parameters and execution on the dedicated database',rows=>\@results})."\n";
