# Contribuer à PimpMyKoha

PimpMyKoha améliore l’interface professionnelle de Koha tout en conservant les comportements natifs, les réglages déjà enregistrés et la possibilité d’éteindre un module.

PimpMyKoha est développé entièrement à l’aide de l’intelligence artificielle, par une personne qui n’est pas développeur. Il est partagé avec la communauté Koha pour que le plus grand nombre puisse en profiter, et pour qu’il soit relu, corrigé, amélioré et rendu plus fiable. Le développement est toujours en cours. L’utilisation reste sous la responsabilité de chaque établissement.

Les contributions sont attendues, qu’elles viennent d’une revue du plugin ou d’une bibliothèque qui adapte un parcours. Une modification doit rester utilisable hors de l’installation qui l’a demandée : seuils, libellés, sites, rapports et catégories sont des réglages.

## Avant de commencer

- Utilisez une Issue pour décrire un défaut, une proposition ou une incompatibilité Koha.
- Ne publiez jamais d’export de production, de donnée lecteur, de configuration Firebase, de secret fournisseur ou d’adresse interne.
- Pour une vulnérabilité, suivez plutôt [la procédure de sécurité](SECURITY.md).
- Gardez les seuils, libellés et règles métier utiles comme valeurs de base, mais rendez les nouvelles options configurables pour les autres installations.
- Une installation neuve laisse chaque module éteint tant qu’aucun document de configuration n’est enregistré. Une configuration déjà enregistrée conserve son interrupteur.
- Ne remettez pas d’adresse vers un hôte `dracenie.com` ou `dracenie.fr` dans les valeurs livrées. Une bibliothèque qui a déjà enregistré la sienne la conserve.
- Ne rétablissez pas le suivi de migration de l’écran de configuration.

## Proposer une modification

1. Créez une branche depuis `main`.
2. Limitez la modification à un objectif clairement décrit.
3. Conservez les fichiers JavaScript sources séparés. Les bundles et paquets sont produits par les constructeurs.
4. Ajoutez ou adaptez un test lorsqu’il vérifie un comportement métier, une migration ou un risque de régression réel.
5. Ouvrez une Pull Request avec le problème, le comportement obtenu, les validations effectuées et les limites connues.

Les contributions sont proposées sous la licence GPL-3.0-or-later du dépôt.

## Contrôles locaux

Node.js, Python 3 et Chromium sont nécessaires pour la suite complète sans Koha.

```bash
cd tests
npm ci
npm audit --audit-level=high
npm run audit
PMK_CHROMIUM_PATH=/chemin/vers/chromium npm test
cd ..
python3 tests/firebase-free.py
python3 tests/publication-safety.py
python3 tests/repo-policy.py
```

Construire les deux canaux du plugin dans un dossier temporaire :

```bash
python3 plugin/build.py \
  --channel stable \
  --stage /tmp/pmk-stable \
  --output /tmp/PimpMyKoha-0.5.1.kpz
python3 plugin/build.py \
  --channel preview \
  --stage /tmp/pmk-preview \
  --output /tmp/PimpMyKoha-0.5.1-preview.kpz

python3 tests/release-channels.py \
  /tmp/PimpMyKoha-0.5.1.kpz \
  /tmp/PimpMyKoha-0.5.1-preview.kpz
python3 tests/publication-safety.py \
  /tmp/PimpMyKoha-0.5.1.kpz \
  /tmp/PimpMyKoha-0.5.1-preview.kpz
```

Les scénarios qui demandent une Koha réelle, un matériel ou un compte fournisseur restent distincts. Décrivez ce qui a été testé et ce qui a été simulé. Le compte professionnel d’une Koha locale se passe par `PMK_KOHA_USER` et `PMK_KOHA_PASSWORD`. Il ne s’écrit pas dans le dépôt.

## Principes de compatibilité

- N’écrasez pas une configuration inconnue ou une clé ajoutée par une installation.
- Ne chargez jamais simultanément le chargeur non-plugin et le plugin.
- Ne réintroduisez aucune dépendance Firebase dans le plugin.
- Isolez les échecs des services facultatifs du reste de PMK.
- Préservez les fonctions natives Koha, les droits, la navigation clavier et les contenus accessibles.
- Documentez toute hypothèse propre à une version Koha, un format MARC, un rapport ou une valeur autorisée.

## Pratiques Koha retenues pour le plugin

Les pages professionnelles passent par les gabarits Koha et le chargeur de langue du plugin (`i18n/`). Une valeur affichée dans un gabarit est filtrée. Les requêtes SQL passent les valeurs par des marqueurs ; un nom de table ne vient jamais de la requête. Les ressources statiques passent par `/api/v1/contrib/pmk/static`, pas par un alias Apache du répertoire des plugins. Les dépendances de test sont épinglées, installées avec `npm ci`, et refusées par `npm audit` dès le niveau élevé. Le point d’entrée Perl est relu par Perl::Critic au niveau stern.

## Style des changements

Les intitulés visibles doivent être compréhensibles pour un agent Koha. Préférez une option métier à un réglage technique exposé sans explication. Une configuration avancée doit rester disponible lorsqu’elle est nécessaire à l’universalisation.

