#!/usr/bin/perl
# Static checks from the KTD plugin toolkit. They do not need a Koha database.
use strict;
use warnings;
use Test::More;
use FindBin;

my $root = "$FindBin::Bin/..";
my $source = -d "$root/plugin/Koha";
my $plugin_root = $source ? "$root/plugin" : $root;

my $qa = slurp("$root/.kohaqarc");
like( $qa, qr/commit_subject_pattern:/,           '.kohaqarc declares a commit pattern' );
like( $qa, qr/\\\[#\\d\+\\\]/,                    'pattern accepts a plugin issue prefix' );
like( $qa, qr/v\?\\d\+\\\.\\d\+\\\.\\d\+/,        'pattern accepts a version tag' );
like( $qa, qr/Automated commit/,                  'pattern accepts an automated commit' );
like( $qa, qr/Merge pull request/,                'pattern accepts a merge commit' );
like( $qa, qr/commit_subject_error_message:/,     '.kohaqarc explains a rejected title' );

my $spell = slurp("$root/.codespell-ignore");
like( $spell, qr/^Koha\r?$/m,   '.codespell-ignore lists Koha' );
like( $spell, qr/^KTD\r?$/m,    '.codespell-ignore lists KTD' );
like( $spell, qr/^plugin\r?$/m, '.codespell-ignore lists plugin' );

my $plugin = slurp("$plugin_root/Koha/Plugin/PimpMyKoha.pm");
like( $plugin, qr/^=head1 NAME/m,        'the plugin has POD' );
like( $plugin, qr/^=head1 DESCRIPTION/m, 'the plugin describes itself' );
like( $plugin, qr/sub configure/,        'configure is implemented' );
like( $plugin, qr/sub tool/,             'tool is implemented' );
like( $plugin, qr/get_template/,         'staff pages use the Koha template API' );
like( $plugin, qr/output_html/,          'staff pages use the Koha HTML output API' );
unlike( $plugin, qr/->header\(-type/,    'configure no longer prints a standalone page' );

foreach my $file (qw(configure.tt tool.tt)) {
    my $template = slurp("$plugin_root/Koha/Plugin/PimpMyKoha/$file");
    like(
        $template,
        qr/\[% WRAPPER "wrapper-staff-tool-plugin\.inc"/,
        "$file uses the staff plugin wrapper"
    );
    like( $template, qr/\[% END %\]/, "$file closes the wrapper" );
    like( $template, qr/PROCESS "\$PLUGIN_DIR\/i18n\/\$\{LANG\}\.inc"/, "$file loads the staff language" );
    like( $template, qr/i18n\/default\.inc/, "$file falls back to the default language" );
    like( $template, qr/\| html %\]/, "$file filters displayed template values" );
    unlike( $template, qr/<script/i, "$file does not embed a script tag" );
}

like( slurp("$plugin_root/Koha/Plugin/PimpMyKoha/configure.tt"), qr/method="configure"/, 'configure stays in the administration column' );
like( slurp("$plugin_root/Koha/Plugin/PimpMyKoha/tool.tt"), qr/method="tool"/, 'the tool uses the tools column' );

like( $plugin, qr/get_qualified_table_name/, 'install uses Koha qualified table names' );
like( $plugin, qr/koha_plugin_pimpmykoha_documents/, 'qualified names stay compatible with existing tables' );
ok( -f "$plugin_root/Koha/Plugin/PimpMyKoha/i18n/default.inc", 'default plugin strings exist' );
ok( -f "$plugin_root/Koha/Plugin/PimpMyKoha/i18n/fr-FR.inc", 'French staff strings exist' );
ok( -f "$plugin_root/Koha/Plugin/PimpMyKoha/i18n/en.inc", 'English staff strings exist' );

if ($source) {
    my $restoration = slurp("$plugin_root/Koha/Plugin/PimpMyKoha/Restoration.pm");
    like( $restoration, qr/die "invalid_table\\n" unless \$keys\{\$table\}/, 'restored table names come from an allowlist' );
    my $packages = slurp("$root/tests/package.json");
    unlike( $packages, qr/"[^"]+"\s*:\s*"[~^]/, 'test dependencies are pinned to exact versions' );
}

ok( -f "$root/README.md" || -f "$plugin_root/Koha/Plugin/PimpMyKoha/README.md", 'README is present' );
ok( -d "$root/t", 'the test directory is present' );
ok( !$source || -f "$root/dev/koha/ktd-pmk.sh", 'the named KTD helper is present in the source tree' );

done_testing();

sub slurp {
    my ($path) = @_;
    open my $fh, '<:encoding(UTF-8)', $path or die "$path: $!";
    local $/;
    my $text = <$fh>;
    close $fh or die "$path: $!";
    return $text;
}
