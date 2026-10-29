#!/usr/bin/env python3
"""Verify native upload/lifecycle preserves PMK tables and a synthetic server credential."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
KPZ = Path(os.environ.get('PMK_RELEASE_KPZ', '/workspace/work/PimpMyKoha-plugin-0.4.0.kpz'))
ENV = {k: v for k, v in os.environ.items() if k not in (
    'DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH')}
DOCKER = ['docker', '--host=unix:///var/run/docker.sock', 'exec', '-i',
          'pmk-koha-test-koha-1', 'koha-shell', 'kohadev', '-c', 'perl']
GUARD = b"""use Modern::Perl;use C4::Context;use JSON;
die 'Dedicated database required' unless C4::Context->config('database') eq 'koha_kohadev';
my $dbh=C4::Context->dbh;my $class='Koha::Plugin::PimpMyKoha';my $key='nedap_server_credentials';
"""


def perl(source):
    return subprocess.run(DOCKER, input=source, stdout=subprocess.PIPE,
                          env=ENV, check=True).stdout


def snapshot():
    return json.loads(perl((ROOT / 'dev/koha/check-plugin-state.pl').read_bytes()))


with zipfile.ZipFile(KPZ) as archive:
    metadata = archive.read('Koha/Plugin/PimpMyKoha.pm').decode()
version = re.search(r"our\s+\$VERSION\s*=\s*['\"]([0-9.]+)['\"]", metadata).group(1)
ENV['PMK_EXPECTED_PLUGIN_VERSION'] = version
ENV['PMK_RELEASE_KPZ'] = str(KPZ)
# Refuse a real credential and return only the original empty-key fixture for cleanup.
original = json.loads(perl(GUARD + b"""
my $value=$dbh->selectrow_array('SELECT plugin_value FROM plugin_data WHERE plugin_class=? AND plugin_key=?',undef,$class,$key);
die 'A real provider credential must not be used for this test' if defined($value) && length(decode_json($value)->{apiKey}//'');
say encode_json({value=>$value});
"""))
try:
    perl(GUARD + b"""
my $value=encode_json({revision=>123,rcr=>'900000001',apiKey=>'PMKTEST-UPGRADE-NOT-A-PROVIDER-KEY'});
$dbh->do('INSERT INTO plugin_data(plugin_class,plugin_key,plugin_value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE plugin_value=VALUES(plugin_value)',undef,$class,$key,$value);
""")
    before = snapshot()
    assert len(before) == 5 and all(row['count'] > 0 for row in before.values())
    subprocess.run(['node', 'tests/koha-installation.cjs'], cwd=ROOT, env=ENV, check=True)
    after_upload = snapshot()
    assert after_upload == before, 'Native upload changed PMK data, configuration or server credential'
    perl(GUARD + b"""use Koha::Plugins;use Koha::Plugin::PimpMyKoha;
my $plugin=Koha::Plugin::PimpMyKoha->new;
die 'Unexpected plugin' unless $plugin->get_metadata->{version} eq '""" + version.encode() + b"""';
die 'Upgrade failed' unless $plugin->upgrade;
die 'Uninstall failed' unless $plugin->uninstall;
die 'Install failed' unless $plugin->install;
""")
    after_lifecycle = snapshot()
    assert after_lifecycle == before, 'Lifecycle changed PMK data, configuration or server credential'
    proof = {
        'passed': True,
        'kind': 'Exact native Koha KPZ upload and explicit lifecycle; all four PMK tables and synthetic server credential unchanged',
        'pluginVersion': version,
        'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'packageSha256': hashlib.sha256(KPZ.read_bytes()).hexdigest(),
        'tables': {key: value for key, value in before.items() if key != 'nedap_server_credentials'},
        'serverCredential': before['nedap_server_credentials'],
        'nativeUploadUnchanged': after_upload == before,
        'explicitLifecycleUnchanged': after_lifecycle == before,
    }
    (ROOT / 'tests/validation/koha-upgrade-preservation.json').write_text(json.dumps(proof, indent=2) + '\n')
    print('PASS PMK tables and synthetic server credential unchanged after native upload and lifecycle')
finally:
    # Hex carries data only, with no Perl interpolation and no credential in test output.
    payload = json.dumps(original).encode().hex().encode()
    perl(GUARD + b"my $original=decode_json(pack('H*','" + payload + b"'));\n" + b"""
if (defined $original->{value}) {
 $dbh->do('INSERT INTO plugin_data(plugin_class,plugin_key,plugin_value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE plugin_value=VALUES(plugin_value)',undef,$class,$key,$original->{value});
} else {
 $dbh->do('DELETE FROM plugin_data WHERE plugin_class=? AND plugin_key=?',undef,$class,$key);
}
""")
