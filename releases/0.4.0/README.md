# PimpMyKoha 0.4.0 — livraison complète assainie

- `PimpMyKoha-livraison-complete-2026-10-30.zip` : livraison courante avec configuration Firebase générique, mode non-plugin, plugin expérimental, migration, documentation et sources.
- `PimpMyKoha-non-plugin-0.4.0-transition.4.zip` : installation courante par transfert de fichiers avec projets Firebase propres à l’établissement et diagnostic de connexion.
- `PimpMyKoha-plugin-0.4.0.kpz` : paquet plugin expérimental à téléverser sur une instance de test Koha, avec stockage natif et sans dépendance Firebase.

> **État de maturité :** le mode non-plugin est le seul mode éprouvé en situation réelle. Le plugin 0.4.0 est expérimental, en cours de test, et doit être installé uniquement sur une instance de recette ou une copie de la production avant toute décision de bascule.

> **Dépendance Firebase :** le mode non-plugin se connecte uniquement aux projets Firebase créés et administrés par chaque établissement. Aucun projet Firebase préconfiguré ni base partagée n’est fourni. Le plugin n’utilise aucun service Firebase après la migration.

La distribution publique ne contient aucune configuration Firebase privée, aucun nom ou courriel personnel, aucun compte Koha privé, aucune carte lecteur technique et aucune URL Worker personnelle. Chaque établissement crée localement `pmk-firebase-config.js` depuis le modèle générique ; ce fichier reste exclu de Git et des archives publiques.

Le code PMK est sous GPL-3.0-or-later. Intro.js conserve sa licence AGPL-3.0. Ne pas activer simultanément le chargeur non-plugin et le plugin.

## Empreintes SHA-256

```text
83f7c689a6f0756cc6ee870e1cae28ed4f77371fd60c92c05db869ae8d50bc90  PimpMyKoha-livraison-complete-2026-10-30.zip
fcfdbbc61d5d3931429422cdca63e4b0bf267d10e975a80d1ef86993b63db715  PimpMyKoha-non-plugin-0.4.0-transition.4.zip
9fad9e368ac957869fc81bacbfb87ee13caad566d4ba6f53e52d46b05d0a92e3  PimpMyKoha-plugin-0.4.0.kpz
```
