# Politique de sécurité

## Versions suivies

La dernière version publiée de la série `0.4.x` reçoit les corrections de sécurité. Les anciennes archives et les installations non-plugin historiques ne reçoivent pas de garantie de maintenance séparée.

## Signaler une vulnérabilité

Utilisez le bouton **Report a vulnerability** dans l’onglet Security du dépôt afin d’ouvrir un avis de sécurité privé. Si ce bouton n’est pas disponible, ouvrez une Issue qui demande un canal privé, sans publier le détail, la preuve de concept, des identifiants ou des données de production.

Indiquez si possible :

- la version PMK et la version Koha ;
- le mode plugin ou non-plugin ;
- les droits Koha nécessaires pour reproduire le problème ;
- les étapes de reproduction avec des données synthétiques ;
- l’impact observé et les mesures temporaires possibles.

Ne joignez jamais un export PMK de production, une base Koha, un cookie, une clé d’API, un mot de passe ou des informations concernant des lecteurs.

Le maintien d’un signalement privé permet d’analyser le problème et de préparer une correction avant sa divulgation. Une date de publication sera convenue selon la gravité et la disponibilité d’un correctif.

## Périmètre

Les défauts des services tiers, de Koha ou de l’hébergement se signalent à leur mainteneur lorsqu’ils ne viennent pas du code PMK. Ils se signalent aussi ici lorsqu’une intégration de PMK en aggrave l’effet ou divulgue une information.

## Secrets

Le dépôt ne contient pas de mot de passe, de clé d’API ni de jeton. Les scripts d’une Koha locale lisent le compte professionnel dans `PMK_KOHA_USER` et `PMK_KOHA_PASSWORD`. Si une valeur a déjà été publiée, elle est retirée du fichier courant. L’historique Git n’est réécrit que sur décision explicite des mainteneurs, parce que cela casse le travail des autres contributeurs.

