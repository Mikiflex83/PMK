# Fréquentation Nedap : relais du plugin Koha

Le widget propose trois connexions. Les modes Cloudflare et API directe existants restent disponibles et aucun réglage n’est changé automatiquement. Le nouveau mode **Relais du plugin Koha — clé côté serveur** confie les appels Libnet au serveur Koha. Le navigateur reçoit uniquement les compteurs.

## Configuration

1. Avec un compte superlibrarian, ouvrir les paramètres du widget Fréquentation NEDAP.
2. Choisir le relais Koha, renseigner le RCR à neuf chiffres et la clé API Libnet, puis enregistrer. Les intitulés, couleurs, jauges et autres réglages sont conservés.
3. Cliquer sur **Tester l’API**, puis vérifier les compteurs et le graphique. Un test avec une nouvelle clé demande d’abord de l’enregistrer ; le bouton de test ne modifie aucun réglage.

Une clé laissée vide conserve celle déjà enregistrée sur le serveur. Le formulaire indique sa présence et le RCR associé, sans pouvoir relire la clé. Une nouvelle clé remplace l’ancienne. **Effacer la clé serveur** demande confirmation et arrête les nouvelles lectures du relais, sans supprimer les compteurs déjà affichés.

Si une autre personne a modifié la connexion, l’enregistrement est refusé et le brouillon reste affiché. Fermer puis rouvrir les paramètres pour relire l’état enregistré avant de refaire la modification.

## Périmètre et conservation

Le serveur contacte uniquement `https://api.libnet.online/CCinfo.php`. Il vérifie le certificat TLS, refuse les redirections, limite la réponse à 2 Mo et l’attente à 15 secondes. Les dates et le RCR sont validés côté serveur. L’intervalle est limité à 366 jours pour les totaux journaliers et à 7 jours pour les autres granularités. La date de fin est exclusive, comme pour l’API directe. Les résultats identiques sont conservés 60 secondes en cache.

La clé est conservée dans la table native Koha `plugin_data`, sous `nedap_server_credentials`, et ne figure pas dans les exports ordinaires de configuration PMK. Elle n’est pas chiffrée dans la base : la sauvegarde et les droits de la base Koha protègent cette valeur. Pour déplacer le plugin vers un autre serveur avec un simple export PMK, renseigner à nouveau la clé. Une sauvegarde complète de Koha doit inclure `plugin_data`.

En passant explicitement du mode direct au relais, le prochain enregistrement retire la clé du document de configuration actif du widget après son enregistrement sur le serveur. Les anciennes sauvegardes et révisions de configuration sont conservées : elles peuvent encore contenir l’ancienne clé. Cette opération ne prétend pas les effacer rétroactivement.

Le relais utilise un seul couple RCR/clé à la fois, correspondant au compteur configuré. Un compte personnel Koha disposant de l’accès au catalogue peut lire ses compteurs ; seul un superlibrarian peut gérer la clé. Une erreur du fournisseur conserve les dernières valeurs affichées avec un message d’erreur.

## Vérifications réalisées

- Interface : passage explicite au relais, conservation des réglages personnels et historiques, graphique annuel, conflit de modification et retrait de la clé.
- Serveur : destination fixe, cache, validation des intervalles, réponses mal formées, refus fournisseur, limites réseau et filtrage des métadonnées.
- Koha local 25.11 : droits de deux comptes, absence de clé dans les réponses et dans la configuration générale, révisions concurrentes, effacement explicite.

Les données et clés de test sont fictives. La connexion à un compte Libnet réel et les mesures du matériel restent à qualifier sur l’installation concernée. Le serveur Koha doit pouvoir joindre Libnet en HTTPS ; aucun appel fournisseur réel n’a été présenté comme testé.
