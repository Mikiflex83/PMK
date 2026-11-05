#!/usr/bin/env python3
"""Règles durables du dépôt, indépendantes de la personne qui contribue.

Le contrôle échoue si une adresse d'un hôte dracenie.com ou dracenie.fr
revient dans les sources livrées, si le suivi de migration réapparaît,
ou si l'installation neuve ne force plus les modules éteints.
Les rapports de tests/validation ne font pas partie de la livraison.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
SOURCE_SUFFIXES = {'.js', '.cjs', '.mjs', '.pm', '.css', '.html', '.yml', '.yaml'}
SKIP_DIRS = {'.git', 'node_modules', 'validation'}
HOST = re.compile(rb'(?i)(?<![\\w.-])(?:[a-z0-9-]+\.)?dracenie\.(?:com|fr)\b')
CORE = ROOT / '000-pmk-config-firestore.js'


def source_files():
    for path in ROOT.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in SOURCE_SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.name in {'repo-policy.py', 'publication-safety.py'}:
            continue
        yield path


def main():
    errors = []
    for path in source_files():
        data = path.read_bytes()
        if HOST.search(data):
            errors.append('hôte Dracénie livré: ' + path.relative_to(ROOT).as_posix())

    core = CORE.read_text(encoding='utf-8')
    for marker in (
        'WORKFLOW_STEPS',
        'pmkWorkflowStatuses',
        'pmk-workflow-select',
        'PMKConfig.workflow',
        'pmk:workflow:pending:',
    ):
        if marker in core:
            errors.append('suivi de migration encore présent: ' + marker)
    if 'if (!stored && !savedDateSource) merged.enabled = false;' not in core:
        errors.append('installation neuve: interrupteur non forcé quand aucun document n’est enregistré')
    if 'normalizedDefaults.enabled = false;' not in core:
        errors.append('lecture impossible: le module ne retombe pas éteint')

    staff = (ROOT / 'tests' / 'ktd-staff.cjs').read_text(encoding='utf-8')
    if 'modules actifs sur une installation neuve' not in staff:
        errors.append('le parcours Koha ne vérifie plus que les modules partent éteints')
    workflow = (ROOT / '.github' / 'workflows' / 'validate.yml').read_text(encoding='utf-8')
    if 'tests/repo-policy.py' not in workflow:
        errors.append('la validation GitHub n’exécute plus tests/repo-policy.py')
    contributing = (ROOT / 'CONTRIBUTING.md').read_text(encoding='utf-8')
    if 'Une installation neuve laisse chaque module éteint' not in contributing:
        errors.append('CONTRIBUTING.md ne rappelle plus l’installation neuve')
    template = (ROOT / '.github' / 'pull_request_template.md').read_text(encoding='utf-8')
    if 'Aucun hôte dracenie.com ou dracenie.fr' not in template:
        errors.append('le modèle de pull request ne rappelle plus les hôtes interdits')

    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(f'PASS repo policy: {sum(1 for _ in source_files())} sources, installation neuve, suivi retiré, validation GitHub')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
