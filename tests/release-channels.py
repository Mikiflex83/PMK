#!/usr/bin/env python3
"""Stable KPZ omits in-development pages. Preview KPZ keeps them."""
from pathlib import Path
from zipfile import ZipFile
import json
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
EXPECTED = {
    'weeding',
    'authorities',
    'inventory',
    'items',
    'biblios',
    'patrons',
    'xslt-assistant',
}
ASSETS = {
    'weeding': 'Koha/Plugin/PimpMyKoha/assets/138-pages/138-page-weeding.js',
    'authorities': 'Koha/Plugin/PimpMyKoha/assets/138-pages/138-page-authorities.js',
    'inventory': 'Koha/Plugin/PimpMyKoha/assets/138-pages/138-page-inventory.js',
    'items': 'Koha/Plugin/PimpMyKoha/assets/138-pages/138-page-items.js',
    'biblios': 'Koha/Plugin/PimpMyKoha/assets/138-pages/138-page-biblios.js',
    'patrons': 'Koha/Plugin/PimpMyKoha/assets/138-pages/138-page-patrons.js',
    'xslt-assistant': 'Koha/Plugin/PimpMyKoha/assets/136-xslt-assistant.js',
}


def caution_ids():
    text = (ROOT / '138-pages-manager.js').read_text(encoding='utf-8')
    found = set()
    for match in re.finditer(r'"id": "([^"]+)"([\s\S]*?)\n    \}', text):
        if '"caution": true' in match.group(2):
            found.add(match.group(1))
    return found


def read_manifest(archive):
    with ZipFile(archive) as package:
        if package.testzip() is not None:
            raise SystemExit(f'archive invalide: {archive}')
        names = set(package.namelist())
        manifest = json.loads(package.read('Koha/Plugin/PimpMyKoha/manifest.json'))
        configure = package.read('Koha/Plugin/PimpMyKoha/configure.tt').decode('utf-8')
        tool = package.read('Koha/Plugin/PimpMyKoha/tool.tt').decode('utf-8')
    return names, manifest, configure, tool


def check(stable, preview):
    errors = []
    ids = caution_ids()
    if ids != EXPECTED:
        errors.append('pages marquées en développement: ' + ', '.join(sorted(ids)))
    for label, archive, channel in (('stable', stable, 'stable'), ('preview', preview, 'preview')):
        names, manifest, configure, tool = read_manifest(archive)
        if manifest.get('channel') != channel:
            errors.append(f'{label}: canal {manifest.get("channel")}')
        if manifest.get('version') != '0.5.0':
            errors.append(f'{label}: version {manifest.get("version")}')
        if 'wrapper-staff-tool-plugin.inc' not in configure or 'wrapper-staff-tool-plugin.inc' not in tool:
            errors.append(f'{label}: gabarit staff absent')
        if any('non-plugin' in name or name.endswith('IntranetUserJS-PMK.js') for name in names):
            errors.append(f'{label}: reste un paquet non-plugin')
        present = {page for page, path in ASSETS.items() if path in names}
        if channel == 'stable' and present:
            errors.append('stable contient ' + ', '.join(sorted(present)))
        if channel == 'preview' and present != EXPECTED:
            errors.append('aperçu manque ' + ', '.join(sorted(EXPECTED - present)))
        excluded = set(manifest.get('excludedPageIds') or [])
        if channel == 'stable' and excluded != EXPECTED:
            errors.append('stable: excludedPageIds incomplet')
        if channel == 'preview' and excluded:
            errors.append('aperçu exclut des pages')
        scripts = set(manifest.get('scripts') or [])
        if channel == 'stable' and '136-xslt-assistant.js' in scripts:
            errors.append('stable charge encore l’éditeur XSLT')
        if channel == 'preview' and '136-xslt-assistant.js' not in scripts:
            errors.append('aperçu ne charge pas l’éditeur XSLT')
    return errors


def build_pair():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stable = root / 'stable.kpz'
        preview = root / 'preview.kpz'
        for channel, output in (('stable', stable), ('preview', preview)):
            subprocess.check_call([
                sys.executable, str(ROOT / 'plugin' / 'build.py'),
                '--channel', channel,
                '--stage', str(root / channel),
                '--output', str(output),
            ])
        return check(stable, preview)


def main():
    if len(sys.argv) == 3:
        errors = check(Path(sys.argv[1]), Path(sys.argv[2]))
    elif len(sys.argv) == 1:
        errors = build_pair()
    else:
        print('usage: release-channels.py [stable.kpz preview.kpz]', file=sys.stderr)
        return 2
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print('PASS release channels: stable without in-development pages, preview with all pages')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
