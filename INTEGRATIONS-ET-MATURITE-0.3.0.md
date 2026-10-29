# Fin d’universalisation retenue — PMK plugin 0.3.0

La maturité v1 signifie : objectif borné, activation réelle, valeurs locales configurables ou découvertes, fonctionnement prudent quand un prérequis manque, permissions Koha respectées et configurations conservées. Elle porte sur Koha 25.11 professionnel / UNIMARC. Elle n’exige pas de certifier toutes les versions de Koha, tous les formats MARC ni les comptes de services auxquels le développeur n’a pas accès.

Les 80 entrées du registre considérées clôturables par l’audit 0.2.0 restent en maintenance, sans extension fonctionnelle ajoutée. Deux petites enveloppes de réglages portent le registre à 86 entrées ; elles ne représentent pas deux nouveaux moteurs métier.

| Point de l’audit | Décision appliquée | Critère de clôture |
|---|---|---|
| Assistant de catalogage 109 et filtrage 122 | Une seule configuration. Le relais 122 ne démarre que pour le profil historique non personnalisé et actif. Les autres champs et sources utilisent le filtrage du moteur 109. | Changement de zone sans retoucher le script ; arrêt global ou du module respecté. |
| Recherche avancée 075 | Activation des critères locaux, index de série et quatre index d’arborescence réglables ; critères Koha natifs conservés. | Désactiver les index locaux sur un autre Koha ne produit aucune requête vers ces index. |
| Listes 066–067 | Mode historique partagé conservé ; mode privé lié au compte et contrôlé par le serveur ; copie explicite des anciens profils et modèles. | Un agent ne peut lire, lister ni écrire le profil privé d’un autre compte. |
| France Publications | Compagnon généré pour l’origine HTTPS exacte ; préfixe commercial configurable/désactivable ; SQL réutilisable fourni avec actions de copie. | Intégration prête à qualifier avec un véritable compte fournisseur ; écritures désactivées par défaut. |
| Autorités | Trois IDs de rapports et types de personnes configurables ; SQL UNIMARC/A fourni et copiable. Aucun changement de ses moteurs de rapprochement, d’audit ou de fusion. | Rapports créés sur l’instance cible et identifiants renseignés. |
| NEDAP | Périmètre spécialisé conservé, contrat documenté ci-dessous. | Qualification avec une clé et un RCR réels ; ce contrôle ne peut être simulé comme une validation du fournisseur. |
| Documentation historique | Audit du 18 octobre marqué comme archive ; documentation native et procédure de transition référencées. | L’ancien texte Firestore ne décrit plus l’installation actuelle. |

## Scripts historiques

Une seule rubrique **Interface — améliorations historiques** expose les réglages utiles. Les changements prennent effet au prochain chargement, comme les transformations de page existantes.

| Script | Traitement |
|---|---|
| 003 | Action d’impression rattachée au véritable menu Imprimer ; cible et libellés date/genre modifiables. |
| 013 | Tournées jour/période/site, heures limites et semaines exclues configurables ; tournées Dracénie conservées. |
| 019 | URLs relatives au Koha courant ; index et liste des prix réglables ; liste Dracénie conservée. |
| 023 | Déplacement de la commande native, sans recréer un bouton ni perdre son comportement. |
| 091 et 093 | Relais vers des URL non natives retirés de l’exécution ; sources conservées dans `dev/legacy-archive`. Utiliser les commandes natives de Koha pour les annulations et transferts. |
| 092 | Ancienne page personnalisée, cible et fenêtre configurables ; aucune action sur une page inexistante. |
| 095 | Titres activables et suffixe modifiable ; le nombre de lignes d’une page n’est plus annoncé comme un total. |
| 097 | Page et conteneur de l’arborescence modifiables. |
| 108 | Message exceptionnel modifiable, inactif par défaut sur une nouvelle installation ; comportement historique repris pendant la migration. |
| 112 | Caméra activable, champs modifiables et champ supplémentaire choisissable sur la page. HTTPS et autorisation caméra requis ; essai sur téléphone réel à effectuer. |
| 122 | Consomme la configuration 109 ; aucun second formulaire. |
| 126 | Masquage du bouton Nouvelle suggestion activable, sans suppression inconditionnelle hors configuration. |

## NEDAP : contrat de connexion

Le widget reste un lecteur de compteurs NEDAP, pas un connecteur universel à tous les fournisseurs. Ses options choisissent le RCR, la période et le mode de connexion. Le profil Dracénie conserve ses valeurs ; son Worker personnel n’est pas imposé aux autres domaines.

- En direct : `GET https://api.libnet.online/CCinfo.php/<RCR>/<AAAA-MM-JJ>/<lendemain-AAAA-MM-JJ>/<période>?key=<clé>&display=NO`. La fin de l’intervalle est exclusive. Le navigateur doit pouvoir joindre le fournisseur et recevoir son autorisation CORS. Les identifiants Koha ne sont pas transmis.
- Via votre relais : `GET <workerUrl>/CCinfo/<RCR>/<AAAAMMJJhhmmss>/<AAAAMMJJhhmmss>/<période>`. Le relais gère sa clé NEDAP et autorise explicitement l’origine de votre Koha. Il doit renvoyer le JSON natif, sans page HTML ni redirection de connexion.
- Réponse : tableau de sites, chacun contenant `CCINFO`, puis zones `DATA`, entrées `VALUES`, et couples date/compteurs `IN` et `OUT`. Une erreur HTTP, une structure invalide ou un fournisseur inaccessible est signalé ; les données en cache restent identifiables comme telles.

Ne pas publier de clé dans le dépôt. La connexion directe peut garder une clé dans le navigateur ; le fichier de sauvegarde PMK reste donc privé. Le bon RCR et les totaux doivent être comparés avec le portail NEDAP lors de la recette réelle.

## France Publications : limites de clôture

Les modèles `sql/FP-abonnements.sql` et `sql/FP-fascicules.sql` définissent l’ordre des colonnes attendu par le module et passent la vérification du schéma Koha local. Ils ne prétendent pas être une copie des rapports privés 5262/5263. Les champs facultatifs non disponibles nativement sont NULL, notamment le nombre d’événements de réclamation non historisés par Koha.

Le préfixe conserve le format `PRÉFIXE-cycle-numéro` ; un champ vide désactive ce rapprochement. Les exceptions de destinataires et les correspondances explicites restent disponibles. Le compagnon doit être retéléchargé depuis le Koha cible pour conserver une origine stricte, puis installé dans le gestionnaire de scripts de son navigateur.

Le compte fournisseur, les réclamations et les équipements physiques restent des qualifications d’intégration à effectuer avec leurs accès réels. Elles ne justifient pas d’élargir sans fin les moteurs PMK ni de présenter une simulation comme un essai en production.
