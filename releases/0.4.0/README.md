# PimpMyKoha 0.4.0 — livraison complète assainie

- `PimpMyKoha-livraison-complete-2026-10-29.zip` : mode non-plugin, plugin, migration, documentation et sources.
- `PimpMyKoha-non-plugin-0.4.0-transition.3.zip` : installation par transfert de fichiers.
- `PimpMyKoha-plugin-0.4.0.kpz` : plugin prêt à téléverser dans Koha, avec stockage natif et sans dépendance Firebase.

La distribution publique ne contient aucune configuration Firebase historique, aucun nom ou courriel personnel, aucun compte Koha privé, aucune carte lecteur technique et aucune URL Worker personnelle. Le mode non-plugin fournit seulement `pmk-legacy-private-config.example.js`. Chaque établissement crée localement `pmk-legacy-private-config.js`, qui reste exclu de Git et des archives publiques.

Le code PMK est sous GPL-3.0-or-later. Intro.js conserve sa licence AGPL-3.0. Ne pas activer simultanément le chargeur non-plugin et le plugin.

## Empreintes SHA-256

```text
c3f6d37051c6498ebec9398d18c7810ecf7112ac622b5131790f9421dfa20fb9  PimpMyKoha-livraison-complete-2026-10-29.zip
52cf3e463c40440cb5b57e2177a5d69bd7f5b538aa8e0698b2259949189797be  PimpMyKoha-non-plugin-0.4.0-transition.3.zip
e906095ca342224854a0eccc5848c1dc5baa96fb174fee15fdf844114ba7b0d7  PimpMyKoha-plugin-0.4.0.kpz
```
