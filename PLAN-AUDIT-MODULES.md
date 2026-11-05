# Plan — modules éteints à l’installation, puis audit un par un

Objectif : une installation neuve, en plugin comme en mode non-plugin, ne fait agir aucun module et ne contacte aucun serveur de la Dracénie. Les seuils, libellés et règles de chaque module restent les valeurs de base. Les images, sons et liens qui pointent aujourd’hui vers la Dracénie n’en font plus partie : une bibliothèque les ajoute elle-même si elle le souhaite. Une configuration déjà enregistrée n’est pas effacée. Ensuite chaque module est contrôlé seul, avec les critères de sécurité et de fiabilité attendus pour l’audit BibLibre.

Ce plan ne réécrit pas le rôle d’un module. Il ne remet pas à zéro une configuration déjà enregistrée.

## 1. Règle d’installation

Les deux modes passent par `getConfig` dans `000-pmk-config-firestore.js`. Tant qu’aucun document n’existe pour un module, la configuration lue est celle du code. Aujourd’hui ce code laisse `enabled: true` sur presque tous les modules. Seule la correction de statut au prêt part désactivée.

Décision :

- S’il n’y a pas de document enregistré, l’interrupteur du module vaut `false`.
- S’il y a un document, son interrupteur est conservé. Une bibliothèque déjà configurée, y compris l’installation historique, ne perd rien à la mise à jour.
- Les options internes restent les valeurs de base : seuils, libellés, colonnes, et les cibles publiques déjà prévues (Electre, Babelio, Google, Wikipedia). Les adresses hébergées par la Dracénie sont une exception, traitée au chapitre 2.
- L’interrupteur global de PimpMyKoha reste disponible, pour que l’écran de configuration s’ouvre. Ce sont les modules qui partent éteints, pas l’outil qui permet de les allumer.
- Le plugin continue de ne rien injecter tant que l’installation neuve n’a pas été activée. Après cette activation, les scripts se chargent mais chaque module s’arrête tout de suite.
- Le chargeur non-plugin continue d’injecter les scripts. Avec un stockage vide, le même `getConfig` les laisse inactifs. Les deux modes ne doivent toujours pas tourner ensemble.

Point d’application unique, après la fusion des valeurs par défaut et avant la mise en cache : pas de document enregistré, alors `enabled = false`. Les alias `waiting-holds-age`, `loan-duration-detail` et `patron-age-display` suivent Dates relatives. Ils n’ont pas d’interrupteur séparé à inventer.

Preuve sur le Koha local actuel : la table des documents est vide. Après reconstruction du stage et redémarrage de Plack, les 85 formulaires doivent afficher `enabled: false`, et les écritures automatiques vers `attendance` et `taxonomy` doivent disparaître. Aucune base n’est réinitialisée.

Le test `tests/ktd-staff.cjs` doit alors attendre `enabled: false` partout, et `true` seulement si un document de test a été enregistré puis restauré.

## 2. Aucun serveur de la Dracénie par défaut

Le Koha local, modules encore allumés par le code actuel, a déjà demandé des fichiers à `mediatheques.dracenie.com` et le passage a aussi une cible `billetterieculture.dracenie.com`. Ce n’est pas limité aux mascottes. Une installation neuve ne doit plus contenir ces hôtes dans ses valeurs de base, et ne doit plus les appeler.

Relevé des adresses par défaut, à vider dans le fichier du module et dans la copie du socle `000-pmk-config-firestore.js`. Si une seule des deux copies reste, la fusion des déclarations réinjecte l’adresse.

| Module | Fichiers | Ce qui part aujourd’hui vers la Dracénie |
| --- | --- | --- |
| Socle, logo de l’écran de configuration | `000-pmk-config-firestore.js` | `Pimp-my-koha.png` sur `mediatheques.dracenie.com` |
| mascot-frogs et mascot-agents | `060-grenouille.js` | Images `grenouille*.png`, `grenouilles*.png` et sons `SFB-frogs*.mp3` |
| bibliographic-markers | `027-genre-icons-detail.js` et le socle | Icônes `genres_cine/*.png` |
| external-links | `010-boutons-recherche-externe.js` et le socle | Logos Electre, Babelio et Google servis par la Dracénie. Les adresses de recherche publiques, elles, ne sont pas des serveurs Dracénie. |
| Liens utiles, widget d’accueil | `137-widgets/137-widget-liens-utiles.js` | Site, agenda, infos pratiques et `billetterieculture.dracenie.com` |
| Planning navette | `137-widgets/137-widget-planning-services.js` | GIF `icons8-camion.gif` |

Décision pour une installation neuve :

- Le logo utilise l’image déjà livrée avec PMK, `pimp-my-koha.png`, servie par le plugin ou copiée avec le mode non-plugin. Plus d’URL distante.
- Mascottes : listes d’images et de sons vides. Le module reste capable d’afficher une image le jour où la bibliothèque colle sa propre adresse.
- Marqueurs de genre : les libellés et les recherches catalogue restent. Les `iconUrl` Dracénie deviennent vides.
- Boutons de recherche externe : les destinations publiques restent. Les icônes hébergées à la Dracénie sont retirées ; le bouton garde son icône locale déjà prévue.
- Liens utiles : aucun lien prérempli.
- GIF de planning : adresse vide.
- Les commentaires qui racontent l’origine Dracénie peuvent rester. Seules les adresses et les requêtes comptent.
- Une bibliothèque qui a déjà enregistré ces URL les conserve. On ne réécrit pas son document.

Contrôle, sur chaque module, pas seulement sur les six fichiers ci-dessus :

1. Recherche des hôtes `dracenie.com` et `dracenie.fr` dans les valeurs par défaut livrées. Le test échoue si une URL y figure. Les rapports de validation et l’archive historique Firebase ne font pas partie de cette livraison.
2. Sur le Koha local, modules éteints : aucune requête vers ces hôtes, sur les 28 écrans et à l’ouverture de l’écran de configuration.
3. Pour chacun des modules du tableau, allumé seul avec les nouvelles valeurs de base : toujours aucune requête vers ces hôtes.
4. Les autres modules, au moment de leur fiche, subissent le même contrôle réseau. Un module absent du tableau n’est pas dispensé.

## 3. Retrait du suivi de migration

L’écran de configuration affiche, pour chaque module, une liste « À contrôler », « À universaliser », « À expérimenter », « À transformer en plugin », « À tester en plugin », « Validé ». C’est le suivi de migration vers le plugin. Il est indépendant de l’interrupteur : il ne décide pas si le module agit. Il est devenu inutile, en mode script comme en mode plugin.

Il vit dans `000-pmk-config-firestore.js` : `WORKFLOW_STEPS`, le champ `pmkWorkflowStatuses` du document `table-labels`, la clé locale `pmk:workflow:pending:`, le menu `.pmk-workflow-select`, et l’API `PMKConfig.workflow`. Ouvrir la configuration charge ce champ. Changer la liste l’enregistre. Les deux modes partagent ce fichier, donc un seul retrait les couvre.

Décision :

- Retirer la liste, sa lecture, son enregistrement et son secours dans le navigateur.
- Ne plus exposer `PMKConfig.workflow`.
- Ne pas réécrire les documents déjà enregistrés pour effacer d’anciens statuts. Le champ oublié ne s’affiche plus et n’est plus mis à jour.
- Ne pas confondre ce suivi avec les niveaux « à revoir » des pages internes (périodiques, transferts, etc.). Ces niveaux décrivent un diagnostic métier. Ils restent.

Contrôle : l’écran de configuration n’a plus cette liste. L’ouvrir ne crée pas et ne modifie pas `pmkWorkflowStatuses`. Allumer ou éteindre un module ne dépend d’aucune de ces étapes.

## 4. « Éteint » doit vouloir dire inerte

Plusieurs modules ne regardent pas l’interrupteur, ou le traitent comme allumé tant qu’il n’est pas explicitement `false`. Avant d’en allumer un seul, un relevé statique liste les scripts qui modifient la page, appellent l’API ou ouvrent une adresse externe sans passer par `enabled === true`.

Pour chacun de ces scripts, ajouter le garde-fou au début de l’action, sans changer ce que le module fait une fois allumé. Tant que ce relevé n’est pas clos, un module peut rester actif malgré la règle du chapitre 1.

Contrôle de non-régression, modules encore tous éteints :

- 111 scripts chargés, aucune erreur PMK ;
- aucun `PUT` ni `POST` vers `/api/v1/contrib/pmk/documents` ou `/runtime` ;
- aucun `POST` vers `/api/v1/contrib/pmk/data/` ;
- aucune requête Firebase ;
- aucune requête vers `dracenie.com` ou `dracenie.fr` ;
- la page Koha reste celle d’origine sur les 28 écrans déjà parcourus.

## 5. Grille commune, appliquée à un seul module à la fois

On allume un module sur le Koha local, on le juge, on le rééteint. On n’en laisse pas deux allumés. On n’enregistre pas les autres.

Sécurité :

1. Éteint, il ne change pas le DOM, n’écrit rien et ne contacte aucun service.
2. Allumé, il améliore l’écran prévu. Il ne remplace pas une règle de prêt, de catalogue, d’adhérent ou de finances, sauf si c’est exactement son rôle documenté et que l’action est confirmée.
3. Les textes venant d’un champ, d’une notice ou d’un adhérent passent par un échappement avant d’entrer dans du HTML.
4. Les adresses externes sont celles déjà déclarées par le module, et aucune n’est un serveur de la Dracénie dans les valeurs de base. Pas de nouvelle destination, pas de clé dans la page, pas de Firebase en mode plugin.
5. Une écriture vers Koha ou vers l’API PMK exige la session professionnelle, le droit déjà prévu et l’en-tête `X-PMK-Request`. Rien ne part au simple affichage de la page.
6. Le SQL éventuel garde des paramètres liés. Aucun nom de table ou de colonne ne vient de la saisie.
7. Les données d’adhérent ne sortent pas du Koha, sauf pour un module dont c’est le but explicite, et seulement une fois ce module allumé et configuré.

Fiabilité :

1. Le formulaire s’ouvre, sans alerte d’erreur, et se ferme sans enregistrement.
2. Allumé, l’effet annoncé apparaît sur la page Koha 25.11 UNIMARC qui existe dans la base de démonstration.
3. Rééteint, la page redevient l’écran Koha natif.
4. La console ne reçoit aucune erreur PMK.
5. Le document des autres modules n’est pas modifié.
6. Si deux modules touchent le même élément, le conflit est noté. On ne fusionne pas leurs rôles pour le faire disparaître.

Chaque ligne du registre tient sur une fiche : identifiant, fichier, lot, écriture Koha oui/non, service externe oui/non, respecte l’interrupteur oui/non, résultat, réserve. Une réserve de sécurité bloque l’envoi à BibLibre. Une réserve d’écran manquant dans la base de démonstration est notée, pas transformée en donnée inventée.

Écrans absents de cette base, donc non concluants tant qu’on n’a pas créé de jeu dédié : abonnement, réclamations de périodiques, liste. Services laissés facultatifs et non contactés : France Publications en conditions réelles, Electre, EmailJS, NEDAP / Libnet. Le test de ces modules s’arrête à la porte : éteint ils se taisent, allumés ils n’envoient rien sans identifiant de test clairement faux.

## 6. Ordre des lots

Le lot A est celui que l’audit lira en premier, parce qu’il peut écrire dans Koha ou dehors. On ne passe au lot suivant que lorsque le lot en cours est soit accepté, soit réservé avec une correction décrite.

### Lot A — effets de bord

| Module | Raison de le prendre en premier |
| --- | --- |
| restauration des exemplaires supprimés | Réécrit biblio, biblioitems, biblio_metadata et items. C’est le point le plus sensible pour BibLibre. |
| checkout-status-correction | Change un statut d’exemplaire. Déjà éteint, sans motif autorisé. Le rester. |
| item-quick-edit | Modifie des exemplaires depuis l’interface. |
| france-publications-subscriptions | Peut écrire dans Koha et parler à un fournisseur. |
| lost-found-checkin-status | Agit au retour. |
| multi-transfer | Agit sur les transferts. |
| transfer-button-holdings | Agit sur les transferts depuis les exemplaires. |
| hold-submit-guard | Intercepte la validation d’une réservation. |
| hold-pickup-expiration | Touche l’échéance de réservation. |
| batchmod-empty-field-warning | Se place sur une modification d’exemplaires en lot. |
| patron-required-contact | Bloque une fiche adhérent. |
| patron-renewal-verification | Intervient sur le renouvellement d’adhésion. |
| patron-category-defaults | Propose des valeurs à la création d’adhérent. |
| suggestion-required-suggester | Intervient sur une suggestion. |
| 144 | Contrôle de doublons d’adhérents. |
| attendance-mediabus-mini | Écrit déjà dans l’espace présences dès que les scripts tournent. |
| cataloguing-tree-assistant | Lié aux écritures taxonomie observées au chargement. |
| internal-share | Partage de données PMK entre professionnels. |
| item-entry-assistant | Se place sur la saisie d’exemplaire. |
| document-movements | S’appuie sur des rapports et des identifiants. |

Le relais NEDAP et le widget de fréquentation restent dans ce lot pour la gestion de la clé : la clé ne revient pas au navigateur, aucune clé réelle n’est utilisée, le module éteint ne contacte pas Libnet.

### Lot B — lectures et données affichées

external-links, contextual-search-links, catalogue-search-behavior, search-autocomplete-performance, search-results-master, search-facets, search-filter-badges, callnumber-progressive-search, musicbrainz-coverart, cataloging-6xx-suggestions, last-borrower, loan-history-timeline, history-row-highlights, relative-dates, waiting-holds-age, loan-duration-detail, patron-age-display, patron-message-templates, patron-message-chronology, patron-overdues-print, detail-fourth-cover, detail-bibliographic-groups, detail-reservations-summary-style, moredetail-layout, holdings-table-presentation, bibliographic-markers, new-release-indicators, log-viewer, efficiency-indicators, guided-reports-tools, guided-report-print, serials-tracking, serials-claims-filtering, z3950-workspace, bibliography-builder, xslt-assistant, personal-lists-manager, page-qr-code, recent-history.

Les liens externes et MusicBrainz ne sont pas appelés avec de vraies recherches fournisseur. On vérifie qu’éteints ils ne partent pas, et qu’allumés l’adresse affichée est bien celle du module.

### Lot C — présentation

table-labels, element-formatting, element-placement, date-display-formatting, input-rules, phone-number-formatting, contextual-tooltips, scroll-buttons, copy-actions, responsive-tables, menu-icons, intranet-nav-menu, custom-navigation, 147-home-submenus, mascot-frogs, mascot-agents, barcode-highlights, patron-astrological-sign, patron-page-utils, multiline-list-counter, 070, legacy-interface-options, authority-installation-options, home-widgets, guides-training, advanced-search-sidebar, item-template-buttons, renewal-enhancements.

Les mascottes, les marqueurs, les liens utiles et le planning font partie du chapitre 2 : leurs valeurs de base ne contiennent plus d’adresse Dracénie avant même l’ouverture de leur fiche.

## 7. Suite complète, dans cet ordre

1. Retirer le suivi de migration de la configuration, dans le fichier commun aux deux modes.
2. Retirer les adresses Dracénie des valeurs de base, dans les deux copies quand le socle répète le module.
3. Brancher l’interrupteur : sans document enregistré, chaque module est éteint. Les documents existants restent.
4. Rendre inerte tout script qui agit sans lire cet interrupteur.
5. Reconstruire le stage, redémarrer Plack, relancer `dev/koha/run-ktd-plan.sh`. Attendu : modules éteints, liste de migration absente, aucune écriture PMK, aucune requête Dracénie, Firebase absent.
6. Contrôler le lot A, un module à la fois, avec la grille. Le rééteindre avant le suivant.
7. Contrôler le lot B, puis le lot C, de la même façon.
8. Tenir le registre des fiches. Une réserve de sécurité du lot A bloque la suite vers BibLibre.
9. Publier seulement quand le registre est clos et sur demande explicite.

## 9. Le dépôt garde ces règles, même avec un autre contributeur

Les contrôles vivent dans le dépôt, pas dans une habitude de travail.

- `tests/repo-policy.py` refuse un hôte `dracenie.com` ou `dracenie.fr` dans les sources livrées, le retour du suivi de migration, et la disparition de l’interrupteur d’installation neuve. Il vérifie aussi que `CONTRIBUTING.md`, le modèle de pull request et le workflow GitHub rappellent ces règles.
- `tests/publication-safety.py` refuse les mêmes adresses dans les fichiers suivis et dans les deux paquets construits. Les rapports de `tests/validation` restent des traces locales : ils ne sont pas livrés.
- `.github/workflows/validate.yml` lance ces contrôles à chaque poussée et à chaque pull request vers `main`.
- `.github/CODEOWNERS` désigne le mainteneur. Il ne dispense pas de la validation.

## 8. Sortie de l’audit

Le dossier est prêt à être montré quand :

- une installation neuve des deux modes laisse tous les modules éteints, n’affiche plus le suivi de migration, et n’appelle aucun serveur `dracenie.com` ou `dracenie.fr` ;
- une configuration déjà enregistrée survit à la mise à jour ;
- chaque module du lot A a une fiche sans réserve de sécurité ouverte ;
- les lots B et C ont une fiche, y compris les limites assumées (pas d’abonnement, pas de liste, pas de fournisseur réel) ;
- `dev/koha/run-ktd-plan.sh` passe sur cette base, avec les modules éteints ;
- le code correspondant est publié. Tant qu’il reste seulement sur cette machine, BibLibre ne peut pas l’auditer.

La publication et le commit restent une décision séparée. Ce plan ne les déclenche pas.
