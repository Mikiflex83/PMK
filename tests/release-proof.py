#!/usr/bin/env python3
"""Aggregate successful, recorded checks for the tested release KPZ."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
PROOFS = ROOT / 'tests/validation'
parser = argparse.ArgumentParser()
parser.add_argument('--plugin', type=Path, required=True)
args = parser.parse_args()
package_hash = hashlib.sha256(args.plugin.read_bytes()).hexdigest()


def read(name):
    return json.loads((PROOFS / (name + '.json')).read_text())


execution = read('release-execution')
assert execution['pluginVersion'] == '0.4.0'
assert execution['packageSha256'] == package_hash
assert len(execution['suites']) == 17 and all(r['passed'] for r in execution['suites'])
with ZipFile(args.plugin) as archive:
    assert archive.testzip() is None
    manifest = json.loads(archive.read('Koha/Plugin/PimpMyKoha/manifest.json'))
    assert manifest['version'] == '0.4.0' and len(manifest['files']) >= 157
    for path, digest in manifest['files'].items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == digest, path

counts = {
    'koha-native-data': 15, 'koha-native-engines': 5, 'koha-shared-tools': 2,
    'koha-configuration': 86, 'koha-business': 6, 'koha-circulation': 4,
    'koha-checkout-status': 1, 'koha-lost-checkin': 2, 'koha-restoration': 1,
    'koha-maintenance': 7, 'koha-publications': 2, 'koha-internal-pages': 19,
    'koha-reports': 13, 'koha-migration':13, 'koha-universality':5,
}
suites = []


def record(name, scenarios):
    suites.append({'suite': name, 'passed': True, 'scenarios': scenarios,
                   'proof': 'tests/validation/' + name + '.json',
                   'proofSha256': hashlib.sha256((PROOFS / (name + '.json')).read_bytes()).hexdigest()})


assert set(read('koha-configuration')['rows'][i]['id'] for i in range(len(read('koha-configuration')['rows']))) == set(manifest['moduleIds'])
for name, count in counts.items():
    rows = read(name)['rows']
    assert len(rows) == count and all(r['passed'] for r in rows), name
    record(name, count)
for name, count in [('koha-plugin', 6), ('koha-sql', 13)]:
    assert len(read(name)['passed']) == count, name
    record(name, count)
routes = read('koha-routes')['rows']
assert len(routes) == 30 and all(not r.get('error') and not r.get('pageErrors') and not r.get('httpErrors') for r in routes)
record('koha-routes', 30)
for name in ['koha-installation', 'koha-upgrade-preservation']:
    proof = read(name)
    assert proof['passed'] and proof['packageSha256'] == package_hash
    record(name, 1)
assert len(read('koha-upgrade-preservation')['tables']) == 4
assert read('koha-upgrade-preservation')['serverCredential']['count'] == 1
assert read('firebase-free')['passed']
assert len(read('export-transition')['rows'])==5 and all(r['passed'] for r in read('export-transition')['rows'])
authorities = read('authorities-preservation')
assert authorities['passed'] and authorities['currentSourceSha256'] == hashlib.sha256((ROOT / '138-pages/138-page-authorities.js').read_bytes()).hexdigest()
proof = {
    'kind': 'Recorded real Koha validation of this KPZ; not exhaustive production certification',
    'dateUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'pluginVersion': '0.4.0', 'packageSha256': package_hash,
    'environment': {'koha': '25.11', 'marc': 'UNIMARC', 'database': 'MariaDB 10.11',
                    'dedicatedLocalInstance': True, 'firebaseEmulatorsStopped': True,
                    'externalBrowserHTTPAndWebSocketsBlocked': True},
    'suites': suites,
    'configurationAndDataPreservedOnReinstall': True,
    'authoritiesRemoteLearningRemoved': True,
    'authoritiesOtherNamedFunctionsPreserved': authorities['otherNamedFunctionsPreserved'],
    'legacyExportSyntheticScenarios':5,
    'notValidatedLive': ['Electre provider and images', 'France Publications supplier account and claims',
                         'EmailJS delivery', 'external catalogs and address providers',
                         'physical barcode scanner, camera and printer', 'real Libnet/NEDAP account',
                         'production legacy-storage export import'],
}
(PROOFS / 'koha-final-run.json').write_text(json.dumps(proof, indent=2) + '\n')
print(json.dumps({'passed': True, 'pluginVersion': '0.4.0', 'suites': len(suites), 'packageSha256': package_hash}))
