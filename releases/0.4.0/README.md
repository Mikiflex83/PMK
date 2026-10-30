# PimpMyKoha 0.4.0 — livraison complète assainie

- `PimpMyKoha-livraison-complete-2026-10-30.zip` : livraison courante avec configuration Firebase générique, mode non-plugin, plugin expérimental, migration, documentation et sources.
- `PimpMyKoha-non-plugin-0.4.0-transition.4.zip` : installation courante par transfert de fichiers avec projets Firebase propres à l’établissement et diagnostic de connexion.
- `PimpMyKoha-plugin-0.4.0.kpz` : paquet plugin expérimental à téléverser sur une instance de test Koha, avec stockage natif et sans dépendance Firebase.

Les archives datées du 29 octobre et `transition.3` sont conservées uniquement comme livraisons initiales de la version 0.4.0. Utilisez les archives du 30 octobre et `transition.4` pour une nouvelle installation non-plugin.

> **État de maturité :** le mode non-plugin est le seul mode éprouvé en situation réelle. Le plugin 0.4.0 est expérimental, en cours de test, et doit être installé uniquement sur une instance de recette ou une copie de la production avant toute décision de bascule.

> **Dépendance Firebase :** le mode non-plugin se connecte uniquement aux projets Firebase créés et administrés par chaque établissement. Aucun projet Firebase Dracénie ni base partagée n’est fourni. Le plugin n’utilise aucun service Firebase après la migration.

La distribution publique ne contient aucune configuration Firebase privée, aucun nom ou courriel personnel, aucun compte Koha privé, aucune carte lecteur technique et aucune URL Worker personnelle. Chaque établissement crée localement `pmk-firebase-config.js` depuis le modèle générique ; ce fichier reste exclu de Git et des archives publiques.

Le code PMK est sous GPL-3.0-or-later. Intro.js conserve sa licence AGPL-3.0. Ne pas activer simultanément le chargeur non-plugin et le plugin.

## Empreintes SHA-256

```text
b562807957871d80a008c269de7bb76b53657b81421e983bda741eea6688eecb  PimpMyKoha-livraison-complete-2026-10-30.zip
9a9263290fd21fbc276f8b58a297196c54f11921051e1fe7050f7d38d7ed1b59  PimpMyKoha-non-plugin-0.4.0-transition.4.zip
3879819395b7463d967e36e5cf3f174fd043489a26721ad39cc19bfd0cfed44a  PimpMyKoha-plugin-0.4.0.kpz
```
