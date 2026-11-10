#!/usr/bin/perl
# Static checks from the KTD plugin toolkit. They do not need a Koha database.
use strict;
use warnings;
use Test::More;
use FindBin;

my $root = "$FindBin::Bin/..";
my $source = -d "$root/plugin/Koha";
my $plugin_root = $source ? "$root/plugin" : $root;

my $qa = do {
    open my $fh, '<:encoding(UTF-8)', "$root/.kohaqarc" or die $!;
    local $/;
    <$fh>;
};
like( $qa, qr/commit_subject_pattern:/,           '.kohaqarc declares a commit pattern' );
like( $qa, qr/\\\[#\\d\+\\\]/,                    'pattern accepts a plugin issue prefix' );
like( $qa, qr/v\?\\d\+\\\.\\d\+\\\.\\d\+/,        'pattern accepts a version tag' );
like( $qa, qr/Automated commit/,                  'pattern accepts an automated commit' );
like( $qa, qr/Merge pull request/,                'pattern accepts a merge commit' );
like( $qa, qr/commit_subject_error_message:/,     '.kohaqarc explains a rejected title' );

my $spell = do {
    open my $fh, '<:encoding(UTF-8)', "$root/.codespell-ignore" or die $!;
    local $/;
    <$fh>;
};
like( $spell, qr/^Koha\r?$/m,   '.codespell-ignore lists Koha' );
like( $spell, qr/^KTD\r?$/m,    '.codespell-ignore lists KTD' );
like( $spell, qr/^plugin\r?$/m, '.codespell-ignore lists plugin' );

my $plugin = do {
    open my $fh, '<:encoding(UTF-8)', "$plugin_root/Koha/Plugin/PimpMyKoha.pm" or die $!;
    local $/;
    <$fh>;
};
like( $plugin, qr/^=head1 NAME/m,        'the plugin has POD' );
like( $plugin, qr/^=head1 DESCRIPTION/m, 'the plugin describes itself' );
like( $plugin, qr/sub configure/,        'configure is implemented' );
like( $plugin, qr/sub tool/,             'tool is implemented' );
like( $plugin, qr/get_template/,         'staff pages use the Koha template API' );
like( $plugin, qr/output_html/,          'staff pages use the Koha HTML output API' );
unlike( $plugin, qr/->header\(-type/,    'configure no longer prints a standalone page' );

foreach my $file (qw(configure.tt tool.tt)) {
    my $template = do {
        open my $fh, '<:encoding(UTF-8)', "$plugin_root/Koha/Plugin/PimpMyKoha/$file" or die $!;
        local $/;
        <$fh>;
    };
    like(
        $template,
        qr/\[% WRAPPER "wrapper-staff-tool-plugin\.inc"/,
        "$file uses the staff plugin wrapper"
    );
    like( $template, qr/\[% END %\]/, "$file closes the wrapper" );
}

like(
    do {
        open my $fh, '<:encoding(UTF-8)', "$plugin_root/Koha/Plugin/PimpMyKoha/configure.tt" or die $!;
        local $/;
        <$fh>;
    },
    qr/method="configure"/,
    'configure stays in the administration column'
);
like(
    do {
        open my $fh, '<:encoding(UTF-8)', "$plugin_root/Koha/Plugin/PimpMyKoha/tool.tt" or die $!;
        local $/;
        <$fh>;
    },
    qr/method="tool"/,
    'the tool uses the tools column'
);

ok( -f "$root/README.md" || -f "$plugin_root/Koha/Plugin/PimpMyKoha/README.md", 'README is present' );
ok( -d "$root/t", 'the test directory is present' );
ok( !$source || -f "$root/dev/koha/ktd-pmk.sh", 'the named KTD helper is present in the source tree' );

done_testing();
