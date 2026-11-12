package Koha::Plugin::PimpMyKoha;

use Modern::Perl;
use base qw(Koha::Plugins::Base);
use JSON qw(decode_json);
use C4::Context;

our $VERSION = '0.5.1';
our $metadata = {
    name => 'PimpMyKoha', author => 'PimpMyKoha',
    description => 'Modules et pages pour l’interface professionnelle de Koha, avec configuration native. Développé entièrement avec l’IA par une personne qui n’est pas développeur, et partagé pour être relu et amélioré. Développement en cours : l’usage reste sous la responsabilité de l’établissement.',
    date_authored => '2026-10-18', date_updated => '2026-11-10',
    minimum_version => '25.11.00.000', version => $VERSION,
    license => 'GPL-3.0-or-later',
};

=head1 METHODS

=head2 new

    my $plugin = Koha::Plugin::PimpMyKoha->new;

Builds the plugin object from the package metadata.

=cut

sub new {
    my ($class, $args) = @_;
    $args->{metadata} = $metadata;
    return $class->SUPER::new($args);
}

sub install {
    my ($self) = @_;
    my $dbh = C4::Context->dbh;
    my %expected = (
        documents    => 'koha_plugin_pimpmykoha_documents',
        history      => 'koha_plugin_pimpmykoha_history',
        data         => 'koha_plugin_pimpmykoha_data',
        data_history => 'koha_plugin_pimpmykoha_data_history',
    );
    my %table;
    for my $suffix ( keys %expected ) {
        my $name = $self->get_qualified_table_name($suffix);
        die "PMK refuse un nom de table inattendu: $name\n" if $name ne $expected{$suffix};
        $table{$suffix} = $name;
    }
    $dbh->do(qq{CREATE TABLE IF NOT EXISTS $table{documents} (
        document_key VARCHAR(190) NOT NULL PRIMARY KEY,
        body LONGTEXT NOT NULL,
        revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
        updated_by INT DEFAULT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin});
    $dbh->do(qq{CREATE TABLE IF NOT EXISTS $table{history} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        document_key VARCHAR(190) NOT NULL,
        body LONGTEXT NOT NULL,
        revision BIGINT UNSIGNED NOT NULL,
        saved_by INT DEFAULT NULL,
        saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX document_revision(document_key, revision)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin});
    $dbh->do(qq{CREATE TABLE IF NOT EXISTS $table{data} (
        namespace VARCHAR(64) NOT NULL,
        path VARCHAR(512) NOT NULL,
        parent VARCHAR(512) NOT NULL,
        body LONGTEXT DEFAULT NULL,
        revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
        updated_by INT DEFAULT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(namespace, path), INDEX collection_path(namespace, parent)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin});
    $dbh->do(qq{CREATE TABLE IF NOT EXISTS $table{data_history} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        namespace VARCHAR(64) NOT NULL, path VARCHAR(512) NOT NULL,
        body LONGTEXT DEFAULT NULL, revision BIGINT UNSIGNED NOT NULL,
        saved_by INT DEFAULT NULL,
        saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX namespace_history(namespace, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin});
    if (!defined $self->retrieve_data('runtime_enabled')) {
        my $count = $dbh->selectrow_array("SELECT COUNT(*) FROM $table{documents}");
        $self->store_data({runtime_enabled => $count ? '1' : '0'});
    }
    return 1;
}

=head2 upgrade

Re-runs install so a newer package keeps the existing tables and settings.

=cut

sub upgrade { return shift->install; }

=head2 uninstall

Leaves the plugin tables and their history in place.

=cut

sub uninstall { return 1; }

=head2 intranet_js

Returns the staff bootstrap tag for a logged-in session. A disabled plugin
stays quiet, except on the migration screen.

Older Koha attaches the current request to C<$self->{cgi}> before calling
this hook. Koha 25.11 and later call it without that object, so the same
C<pmk_migration> parameter is then read from the request query string.

=cut

sub intranet_js {
    my ( $self, $args ) = @_;
    my $migration = $self->_migration_requested($args);
    return '' if ($self->retrieve_data('runtime_enabled') // '1') eq '0' && !$migration;
    return '' unless C4::Context->userenv && C4::Context->userenv->{number};
    my $base = '/api/v1/contrib/pmk/static';
    my $marker = $migration ? 'data-pmk-setup="1"' : 'data-pmk-plugin="1"';
    return qq{<script src="$base/bootstrap.js?v=$VERSION" $marker></script>};
}

sub _query_unescape {
    my ($text) = @_;
    $text =~ tr/+/ /;
    $text =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/eg;
    return $text;
}

sub _query_has_flag {
    my ( $query, $name ) = @_;
    return 0 if !defined $query || $query eq '';
    for my $pair ( split /[&;]/, $query, -1 ) {
        next if $pair eq '';
        my ( $raw_key, $raw_value ) = split /=/, $pair, 2;
        next unless defined $raw_key;
        next if _query_unescape($raw_key) ne $name;
        return 0 unless defined $raw_value;
        return _query_unescape($raw_value) ? 1 : 0;
    }
    return 0;
}

sub _migration_requested {
    my ( $self, $args ) = @_;
    my $cgi = $self->{cgi};
    if ( $cgi && $cgi->can('param') ) {
        return $cgi->param('pmk_migration') ? 1 : 0;
    }
    if ( ref($args) eq 'HASH' ) {
        return 1 if $args->{pmk_migration};
        if ( defined $args->{page} && $args->{page} =~ /\?(.*)\z/s ) {
            return 1 if _query_has_flag( $1, 'pmk_migration' );
        }
    }
    my $query = $ENV{QUERY_STRING};
    $query = $ENV{REDIRECT_QUERY_STRING} if !defined $query || $query eq '';
    return _query_has_flag( $query, 'pmk_migration' ) if defined $query && $query ne '';
    my $uri = $ENV{REQUEST_URI} // '';
    return _query_has_flag( $1, 'pmk_migration' ) if $uri =~ /\?(.*)\z/s;
    return 0;
}

sub configure {
    my ($self) = @_;
    return $self->_render_staff_page('configure.tt');
}

sub tool {
    my ($self) = @_;
    return $self->_render_staff_page('tool.tt');
}

=head2 _render_staff_page

Renders a plugin template inside the Koha staff wrapper, or a short alert
when the template cannot be read.

=cut

sub _render_staff_page {
    my ( $self, $file ) = @_;
    my $template = eval { $self->get_template( { file => $file } ) };
    if ( !$template ) {
        warn "PimpMyKoha $file: " . ( $@ || 'template unavailable' );
        return $self->output_html(
            '<div class="alert alert-danger" role="alert">PimpMyKoha n’a pas pu ouvrir cette page. Consultez le journal Plack.</div>'
        );
    }
    $template->param( version => $VERSION );
    return $self->output_html( $template->output() );
}

=head2 api_namespace

Returns the REST namespace pmk.

=cut

sub api_namespace { return 'pmk'; }

=head2 static_routes

Publishes the bundled staff files under the plugin static API.

=cut

sub static_routes {
    my ($self) = @_;
    open my $file, '<:raw', $self->mbf_path('manifest.json') or die "PMK manifest: $!";
    my $manifest = do { local $/; decode_json(<$file>) };
    close $file or die "PMK manifest: $!";
    my @files = ('bootstrap.js', 'storage.js', 'native-data.js', 'migration.js', 'manifest.json', $manifest->{autoloadBundle}, map { 'assets/' . $_ } sort keys %{$manifest->{files}});
    my %produce = (js => 'application/javascript', json => 'application/json', sql => 'text/plain', png => 'image/png', css => 'text/css', md => 'text/plain');
    my %routes;
    for my $index (0..$#files) {
        my ($ext) = $files[$index] =~ /\.([^.]+)\z/;
        $routes{'/' . $files[$index]} = {get => {
            'x-mojo-to' => 'PimpMyKoha::Controller#asset',
            operationId => 'pmk_asset_' . $index, tags => ['pmk'],
            produces => [$produce{lc($ext // '')} || 'application/octet-stream'],
            parameters => [map { {name => $_, in => 'query', required => JSON::false, type => 'string'} } ('v', 'rel')],
            responses => {200 => {description => 'Bundled PMK resource'}, 404 => {description => 'Not found'}},
            'x-koha-authorization' => {permissions => {catalogue => '1'}},
        }};
    }
    return \%routes;
}

=head2 api_routes

Returns the plugin API description.

=cut

sub api_routes {
    my ($self) = @_;
    open my $file, '<:raw', $self->mbf_path('api.json') or die "PMK API: $!";
    my $spec = do { local $/; decode_json(<$file>) };
    close $file or die "PMK API: $!";
    return $spec;
}

=head1 NAME

Koha::Plugin::PimpMyKoha - Staff interface modules and internal pages for Koha

=head1 SYNOPSIS

Install the KPZ from Administration, then Plugins. The configure screen prepares
the plugin. The tool screen opens the internal pages inside the Koha staff wrapper.

=head1 DESCRIPTION

PimpMyKoha stores its configuration in Koha. A new installation leaves every
module disabled until a document is saved. Uninstall keeps the plugin tables.

The stable package omits internal pages still marked as in development. The
preview package includes those pages.

=head1 METHODS

=head2 configure

Renders the installation screen with the Koha staff plugin wrapper.

=head2 tool

Renders the tool screen with the Koha staff plugin wrapper.

=head2 install

Creates the plugin tables when they are missing and preserves existing rows.

=head1 AUTHOR

PimpMyKoha

=head1 LICENSE

GPL-3.0-or-later

=cut

1;
