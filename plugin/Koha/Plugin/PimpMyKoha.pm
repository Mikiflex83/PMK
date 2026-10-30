package Koha::Plugin::PimpMyKoha;

use Modern::Perl;
use base qw(Koha::Plugins::Base);
use JSON qw(decode_json);
use C4::Context;
use Koha::Plugin::PimpMyKoha::OwnerHistory;

our $VERSION = '0.4.0';
our $metadata = {
    name => 'PimpMyKoha', author => 'PimpMyKoha',
    description => 'Modules et pages PMK, avec ressources embarquées et configuration native dans Koha.',
    date_authored => '2026-10-18', date_updated => '2026-10-28',
    minimum_version => '25.11.00.000', version => $VERSION,
};

sub new {
    my ($class, $args) = @_;
    $args->{metadata} = $metadata;
    return $class->SUPER::new($args);
}

sub install {
    my ($self) = @_;
    my $dbh = C4::Context->dbh;
    $dbh->do(q{CREATE TABLE IF NOT EXISTS koha_plugin_pimpmykoha_documents (
        document_key VARCHAR(190) NOT NULL PRIMARY KEY,
        body LONGTEXT NOT NULL,
        revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
        updated_by INT DEFAULT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin});
    $dbh->do(q{CREATE TABLE IF NOT EXISTS koha_plugin_pimpmykoha_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        document_key VARCHAR(190) NOT NULL,
        body LONGTEXT NOT NULL,
        revision BIGINT UNSIGNED NOT NULL,
        saved_by INT DEFAULT NULL,
        saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX document_revision(document_key, revision)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin});
    $dbh->do(q{CREATE TABLE IF NOT EXISTS koha_plugin_pimpmykoha_data (
        namespace VARCHAR(64) NOT NULL,
        path VARCHAR(512) NOT NULL,
        parent VARCHAR(512) NOT NULL,
        body LONGTEXT DEFAULT NULL,
        revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
        updated_by INT DEFAULT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(namespace, path), INDEX collection_path(namespace, parent)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin});
    $dbh->do(q{CREATE TABLE IF NOT EXISTS koha_plugin_pimpmykoha_data_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        namespace VARCHAR(64) NOT NULL, path VARCHAR(512) NOT NULL,
        body LONGTEXT DEFAULT NULL, revision BIGINT UNSIGNED NOT NULL,
        saved_by INT DEFAULT NULL,
        saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX namespace_history(namespace, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin});
    if (!defined $self->retrieve_data('runtime_enabled')) {
        my $count = $dbh->selectrow_array('SELECT COUNT(*) FROM koha_plugin_pimpmykoha_documents');
        $self->store_data({runtime_enabled => $count ? '1' : '0'});
    }
    Koha::Plugin::PimpMyKoha::OwnerHistory->install;
    return 1;
}

sub upgrade { return shift->install; }
# La désinstallation ne supprime pas les réglages ni leur historique.
sub uninstall { return 1; }

sub after_item_action {
    my ($self, $args) = @_;
    Koha::Plugin::PimpMyKoha::OwnerHistory->record($args);
}

sub intranet_js {
    my ($self) = @_;
    return '' if ($self->retrieve_data('runtime_enabled') // '1') eq '0';
    return '' unless C4::Context->userenv && C4::Context->userenv->{number};
    my $base = '/api/v1/contrib/pmk/static';
    return qq{<script src="$base/bootstrap.js?v=$VERSION" data-pmk-plugin="1"></script>};
}

sub configure {
    my ($self) = @_;
    print $self->{cgi}->header(-type => 'text/html', -charset => 'utf-8', -cache_control => 'no-store');
    print qq{<!doctype html><html lang="fr"><meta charset="utf-8"><title>Installation PimpMyKoha</title><body><main><h1>Installation PimpMyKoha</h1><p><a href="/cgi-bin/koha/plugins/plugins-home.pl">Retour aux plugins Koha</a> · <a href="/cgi-bin/koha/mainpage.pl?pmk_admin=1">Configuration PMK après activation</a></p></main><script src="/api/v1/contrib/pmk/static/bootstrap.js?v=$VERSION" data-pmk-setup="1"></script></body></html>};
}

sub tool {
    my ($self) = @_;
    print $self->{cgi}->redirect('/cgi-bin/koha/mainpage.pl?pmk_page=hub');
}

sub api_namespace { return 'pmk'; }
sub static_routes {
    my ($self) = @_;
    open my $file, '<:raw', $self->mbf_path('manifest.json') or die "PMK manifest: $!";
    local $/;
    my $manifest = decode_json(<$file>);
    my @files = ('owner-history.js', 'bootstrap.js', 'storage.js', 'native-data.js', 'migration.js', 'manifest.json', $manifest->{autoloadBundle}, map { 'assets/' . $_ } sort keys %{$manifest->{files}});
    my %routes;
    for my $index (0..$#files) {
        $routes{'/' . $files[$index]} = {get => {
            'x-mojo-to' => 'PimpMyKoha::Controller#asset',
            operationId => 'pmk_asset_' . $index, tags => ['pmk'],
            parameters => [map { {name => $_, in => 'query', required => JSON::false, type => 'string'} } ('v', 'rel')],
            responses => {200 => {description => 'Bundled PMK resource'}, 404 => {description => 'Not found'}},
            'x-koha-authorization' => {permissions => {catalogue => '1'}},
        }};
    }
    return \%routes;
}
sub api_routes {
    my ($self) = @_;
    open my $file, '<:raw', $self->mbf_path('api.json') or die "PMK API: $!";
    local $/;
    return decode_json(<$file>);
}

1;
