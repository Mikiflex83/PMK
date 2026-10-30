# Contribuer à PimpMyKoha

Merci de contribuer à PimpMyKoha. Le projet améliore l’interface professionnelle de Koha tout en conservant les comportements natifs, les réglages existants et la possibilité de revenir en arrière.

## Avant de commencer

- Utilisez une Issue pour décrire un défaut, une proposition ou une incompatibilité Koha.
- Ne publiez jamais d’export de production, de donnée lecteur, de configuration Firebase, de secret fournisseur ou d’adresse interne.
- Pour une vulnérabilité, suivez plutôt [la procédure de sécurité](SECURITY.md).
- Gardez les valeurs historiques utiles comme valeurs par défaut, mais rendez les nouvelles options configurables pour les autres installations.

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
npm install
npm run audit
PMK_CHROMIUM_PATH=/chemin/vers/chromium npm test
cd ..
python3 tests/firebase-free.py
python3 tests/publication-safety.py
```

Construire les deux distributions dans un dossier temporaire :

```bash
python3 legacy/build.py \
  --stage /tmp/pmk-non-plugin \
  --output /tmp/PimpMyKoha-non-plugin.zip

python3 plugin/build.py \
  --stage /tmp/pmk-plugin \
  --output /tmp/PimpMyKoha-plugin.kpz

python3 tests/publication-safety.py \
  /tmp/PimpMyKoha-non-plugin.zip \
  /tmp/PimpMyKoha-plugin.kpz
```

Les scénarios nécessitant une vraie installation Koha, un matériel ou un compte fournisseur restent distincts. Décrivez clairement ce qui a été testé sur une installation réelle et ce qui a été simulé.

## Principes de compatibilité

- N’écrasez pas une configuration inconnue ou une clé ajoutée par une installation.
- Ne chargez jamais simultanément le chargeur non-plugin et le plugin.
- Ne réintroduisez aucune dépendance Firebase dans le plugin.
- Isolez les échecs des services facultatifs du reste de PMK.
- Préservez les fonctions natives Koha, les droits, la navigation clavier et les contenus accessibles.
- Documentez toute hypothèse propre à une version Koha, un format MARC, un rapport ou une valeur autorisée.

## Style des changements

Les intitulés visibles doivent être compréhensibles pour un agent Koha. Préférez une option métier à un réglage technique exposé sans explication. Une configuration avancée doit rester disponible lorsqu’elle est nécessaire à l’universalisation.

