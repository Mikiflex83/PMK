#!/usr/bin/env python3
"""Refuse production identifiers, personal data and credentials in public PMK artifacts."""
from pathlib import Path
from zipfile import ZipFile
import re, subprocess, sys

ROOT=Path(__file__).resolve().parent.parent
BINARY={'.png','.jpg','.jpeg','.gif','.ico','.woff','.woff2','.pdf'}
FORBIDDEN={
    'google_api_key':re.compile(rb'AIza[0-9A-Za-z_-]{20,}'),
    'private_key':re.compile(rb'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
    'github_token':re.compile(rb'(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})'),
    'personal_identity':re.compile(rb'(?i)(?:mickael|michael)[-_ .]?mundet|emily[._ -]?gilotin|mikiflex83'),
    'personal_email':re.compile(rb'(?i)(?:mickael[._-]?mundet|emily[._-]?gilotin)@[A-Z0-9.-]+'),
    'historic_firebase':re.compile(rb'(?i)(?:configpmk|comptage-b23b7|doodle-8cc1d|journal-2-5b969|listesperso-64318|arborescence-427ef|planningmediabusnavette|nedapfreq|internal-share-5360d)'),
    'private_worker':re.compile(rb'(?i)polished-scene-9336|michael-mundet\.workers\.dev'),
    'private_patron_card':re.compile(rb'90405001226200'),
    'private_koha_host':re.compile(rb'(?i)(?:koha\.dracenie\.com|pro-dracenie-koha\.test\.biblibre\.eu)'),
    'internal_links':re.compile(rb'(?i)(?:fiches-mediachabran\.dracenie\.com|mediachabran\.dracenie\.com|genius2dracenie-draguignan\.ingenie\.fr)'),
}

def check(name,data,errors):
    for kind,pattern in FORBIDDEN.items():
        if pattern.search(data): errors.append(f'{kind}: {name}')

def main(paths):
    errors=[]
    tracked=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).split(b'\0')
    for raw in tracked:
        if not raw: continue
        rel=raw.decode();p=ROOT/rel
        if rel == 'tests/publication-safety.py': continue
        if not p.is_file() or p.suffix.lower() in BINARY or p.suffix.lower() in {'.zip','.kpz'}: continue
        check(rel,p.read_bytes(),errors)
    for value in paths:
        archive=Path(value)
        with ZipFile(archive) as z:
            for info in z.infolist():
                if info.is_dir() or Path(info.filename).suffix.lower() in BINARY: continue
                if info.filename.endswith('/tests/publication-safety.py') or info.filename == 'tests/publication-safety.py': continue
                check(f'{archive.name}:{info.filename}',z.read(info),errors)
    if errors:
        print('\n'.join(sorted(set(errors))),file=sys.stderr);return 1
    print(f'PASS publication safety: {len(tracked)-1} tracked paths, {len(paths)} archive(s), no private identifiers or known credentials')
    return 0

if __name__=='__main__':raise SystemExit(main(sys.argv[1:]))
