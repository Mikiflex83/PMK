# Bilan des demandes — PMK 0.8.0 / plugin 0.2.0

Ce bilan recoupe les notes initiales jointes, la demande de menus d’accueil, les
précisions sur les configurations et les trois listes de modules suivantes.
Il porte sur les fichiers du projet et des vérifications locales avec données
simulées. Il ne constitue pas une validation de votre Koha en production.

## Étape actuelle : plugin sans Firebase

Les dépendances Firebase de tous les modules, y compris les autorités, sont
retirées. Les moteurs utilisent le stockage natif du plugin et la session Koha.
L’import/export des données et configurations permet de préparer la reprise des
anciens fichiers tout en conservant les données déjà présentes et les historiques.
Les tests portent sur une vraie installation locale Koha 25.11, avec Firebase
bloqué et sans émulateur. Le détail actuel figure dans RECETTE-PLUGIN-KOHA.md ;
les sections suivantes conservent le suivi historique des demandes précédentes.

## Ce qui manquait ou était incomplet avant cette dernière passe

1. Certains panneaux communs d’activation et compteurs de pages subsistaient malgré le retrait des sections métier.
2. Z39.50 conservait un interrupteur de page en plus de l’activation principale.
3. Les colonnes d’historique étaient configurables manuellement, mais le clic visuel utilisait un contrat d’adaptateur incorrect.
4. Certains pickers ne reprenaient pas automatiquement après navigation ; le clic sur l’icône d’un bouton pouvait cibler l’icône au lieu du bouton.
5. Le rapport de mouvements 5254 déjà présent dans le projet n’était pas identifié comme rapport compatible pour l’historique des transferts.
6. Le module Mouvements ne chargeait pas réellement l’ID enregistré avant ses requêtes et conservait un ID figé au chargement.
7. Un motif de renouvellement pouvait reprendre le titre « Élément XX » pendant l’édition.
8. Le bloc Fonctionnement des nouveautés et une référence au Médiabus dans la description du menu restaient visibles.

Ces huit écarts ont été corrigés et font l’objet de contrôles dédiés. Aucun ID
personnalisé ni activation enregistrée n’est remplacé automatiquement : la reprise
d’un ID se fait explicitement dans le brouillon ; les états historiques désactivés
restent désactivés après fusion.

## Vérification demande par demande

« Vérifié » signifie relu dans le code et couvert par l’audit de formulaire ou un
scénario local approprié. « Complété pendant cet audit » désigne une correction
apportée dans cette dernière passe. Les références ci-dessous sont des chemins
dans le projet ; les résultats détaillés se trouvent dans `tests/validation/`.

| N° | Module / sujet | Demande | État final | Résultat | Fichiers / preuve |
|---:|---|---|---|---|---|
| 1 | Socle — design et philosophie | Conserver le projet, ses interfaces et son fonctionnement général. | Vérifié | Aucune refonte globale ; moteurs communs et cibles configurables dans les interfaces PMK existantes. | `000-pmk-config-firestore.js` |
| 2 | Socle — configurations | Repérer et fusionner les configurations concurrentes. | Vérifié | Une définition active et un stockage actif par module ; priorité déterministe et fusion des options, sources de secours conservées. | `000-pmk-config-firestore.js` |
| 3 | Socle — conservation | Ne perdre ni les valeurs par défaut, ni les configurations ajoutées. | Vérifié | Données et métadonnées conservées ; archives des valeurs transformées, instantanés des anciennes configurations, export ; lectures refusées bloquant la sauvegarde. | `000-pmk-config-firestore.js` |
| 4 | Socle — introductions | Retirer « Réglages du module » et le paragraphe générique. | Vérifié | Retrait commun ; 43 formulaires demandés ouverts et contrôlés sans ces textes. | `000-pmk-config-firestore.js` |
| 5 | Socle — activation | Retirer les blocs d’activation et compteurs de pages inutiles demandés. | Complété pendant cet audit | Commande principale compacte, sans le panneau explicatif ni le compteur sur les modules concernés ; réglages fonctionnels conservés. | `000-pmk-config-firestore.js` |
| 6 | Menus 134 / 147 | Même moteur, même éditeur et design, ergonomie complète. | Vérifié | PMKMenuEngine commun : recherche, clavier, sous-menus, types, icônes, audiences, favoris et trois présentations. | `000-pmk-config-firestore.js ; 134-intranetnav-menu.js ; 147-accueil-sous-menus-pmk.js` |
| 7 | Accueil 147 — circulation | Conserver les intitulés fournis, sans le prêt secouru. | Vérifié | Profil des liens fourni ; exclusion des quatre liens et de la rubrique de prêt secouru. | `tests/fixtures/home-menus/circulation.html` |
| 8 | Accueil 147 — adhérents | Nouvel adhérent avec les neuf catégories fournies. | Vérifié | Catégories et intitulés Dracénie conservés dans le profil ; découverte native pour les autres sites. | `000-pmk-config-firestore.js` |
| 9 | Accueil 147 — listes | Créer une nouvelle liste. | Vérifié | Lien « Nouvelle liste » vers op=add_form, referer=list. | `000-pmk-config-firestore.js` |
| 10 | Accueil 147 — réserves de cours | Ajouter l’action de création. | Vérifié localement | Lien natif standard course_reserves/add_course.pl ; route à confirmer sur votre Koha. | `000-pmk-config-firestore.js` |
| 11 | Accueil 147 — autorités | Ignorer ce menu. | Vérifié | Ignoré par défaut sans supprimer une personnalisation enregistrée. | `000-pmk-config-firestore.js` |
| 12 | Accueil 147 — catalogage | Sous-sous-menu de création pour chaque type de notice. | Vérifié | Nouvelle notice puis grilles avec leurs intitulés, dont la grille par défaut. | `tests/fixtures/home-menus/cataloguing.html` |
| 13 | Accueil 147 — rapports | Liens et rubriques fournis, sans recherche. | Vérifié | Rapports, dictionnaire, statistiques, palmarès, autres et liens externes ; formulaire exclu. | `000-pmk-config-firestore.js` |
| 14 | Accueil 147 — outils | Reprendre le fichier fourni. | Vérifié | Rubriques et liens repris des extraits utilisateur. | `tests/fixtures/home-menus/tools.html` |
| 15 | Accueil 147 — administration | Reprendre le fichier fourni sans zone syspref. | Vérifié | Rubriques et liens conservés ; recherche des préférences exclue. | `tests/fixtures/home-menus/administration.html` |
| 16 | Liens utiles — widget | Déplacer le contenu de configuration sur le widget, accès superlibrarian. | Vérifié | Éditeur sur le widget, annulation, sauvegarde et conservation du document ; entrée PMK dédiée masquée. | `137-widgets/137-widget-liens-utiles.js` |
| 17 | Widgets & blocs d’accueil | PMK ne gère que l’activation ; contenu configuré sur les widgets. | Vérifié | Listes d’activation uniquement dans PMK ; contenus, dont rapports, sur leurs widgets. | `137-home-widgets.js` |
| 18 | Âge du lecteur / dates relatives | Fusionner les réglages, proposer âge/durée et tous les formats avec ciblage. | Vérifié | Configuration relative-dates, âge natif et règles libres ; reprise des paramètres personnalisés et API historiques. | `070-date-utils.js ; 098-age-calculation-member-detail.js` |
| 19 | Autocomplétion des adresses | Supprimer la double activation et ajouter les pickers de champs. | Vérifié | Une activation principale, six cibles sélectionnables ; liste fermée après choix. | `070-address-autocomplete-memberentry.js` |
| 20 | Automatismes adhérent — SMS | Vérifier les interrupteurs et conserver les options utiles. | Vérifié | Pas de seconde activation globale ; activation de l’automatisme, événements, conversion, copie et remplacement distincts. | `057-member-pages-utils.js` |
| 21 | Contrôle des doublons | Cibler les champs à comparer et universaliser. | Vérifié | Propriétés API et champs configurables ; comparaison exacte, approchante ou date ; critères candidats et qualification. | `144-controle-doublons-adherents.js` |
| 22 | Signe astrologique | Ajouter des pages et choisir les sources et emplacements. | Vérifié | Liste de pages, sélecteurs de naissance et destination ; recalcul après saisie. | `049-astrological-sign.js` |
| 23 | Guides & formation | Modifier texte, titre et cible des étapes, sauf les imports MARC. | Vérifié | Étapes par page, copie du guide existant, champs éditables et picker ; pages d’import protégées. | `135-guides-training-pmk-loader.js` |
| 24 | Aide à l’indexation 6XX | Épurer sans perdre d’option et retirer le bouton avancé. | Vérifié | Options rassemblées ; pas de bouton avancé pour ce module. | `000-pmk-config-firestore.js` |
| 25 | Confort Z39.50 / SRU | Supprimer la double activation et le bloc Compatibilité. | Complété pendant cet audit | Ancien état de page absorbé dans l’activation principale, ancien état désactivé conservé ; carte répétée et bloc de compatibilité retirés. | `000-pmk-config-firestore.js ; 035-resize-z3950.js` |
| 26 | Alerte avant vidage | Retirer le bloc Sécurité et son explication de PMK. | Vérifié | Bloc de configuration retiré, confirmation native inchangée. | `000-pmk-config-firestore.js` |
| 27 | Assistant de saisie des exemplaires | Retirer les textes techniques et permettre de changer les URL. | Vérifié | Chemins configurables et pris en compte après chargement des réglages ; contenu technique retiré, options conservées. | `110-exemplaire-helper.js` |
| 28 | Assistant domaine / arborescence | Configuration analogue à l’assistant exemplaires, sans choix de moteur. | Vérifié | Choix de moteur masqué, personnalisation directement utilisable ; profil historique préservé. | `109-helper-domaine.js` |
| 29 | Assistant XSLT | Le laisser pour un développement ultérieur. | Repris à votre demande suivante | Initialement différé, puis repris dans la version 0.7.0 : parcours d’édition, aperçu et export vérifiés ; projets conservés. | `000-pmk-config-firestore.js ; 136-xslt-assistant.js` |
| 30 | Autocomplétion Recherche catalogue | Renommer et retirer les intitulés performance/cache/classement. | Vérifié | Nom demandé ; titres superflus retirés, valeurs utiles conservées. | `113-autocomplete-elestic.js` |
| 31 | Barre de recherche catalogue | Retirer l’introduction générique. | Vérifié | Formulaire vérifié sans introduction générique. | `036-clear-search-when-barcode.js ; 000-pmk-config-firestore.js` |
| 32 | Boutons modèles exemplaires | Retirer l’introduction générique. | Vérifié | Formulaire vérifié ; modèles existants inchangés. | `102-batchmod-mediabus-buttons.js ; 000-pmk-config-firestore.js` |
| 33 | Facettes de recherche | Retirer les explications et n’ouvrir que les familles avec un filtre actif. | Vérifié | Ouverture limitée aux familles concernées ; choix manuels conservés pendant les recalculs. | `055-facets-drawer.js` |
| 34 | Icônes et badges bibliographiques | Choisir le bloc à analyser et la destination des icônes. | Vérifié | Deux cibles et règles de correspondance configurables ; reprise du picker après navigation complétée dans le socle. | `027-genre-icons-detail.js` |
| 35 | Indicateurs de nouveauté | Choisir l’emplacement et retirer les textes Fonctionnement/Compatibilité. | Complété pendant cet audit | Sources et destination sélectionnables ; le bloc Fonctionnement restant a été retiré, sans toucher à la règle de dernière acquisition valide. | `079-new-release-logos.js ; 000-pmk-config-firestore.js` |
| 36 | Jaquettes musicales — MusicBrainz | Retirer l’introduction et le paragraphe de présentation technique. | Vérifié | Formulaire épuré ; une recherche explicitement désactivée le reste. | `088-musicbrainz-coverart.js` |
| 37 | Liens externes | Retirer les textes d’aperçu et le faux libellé à l’intérieur de l’aperçu. | Vérifié | Aperçu fidèle à l’option de texte du bouton ; présentation enregistrée conservée. | `010-boutons-recherche-externe.js` |
| 38 | Mouvements des documents | Retirer l’introduction et vérifier la cohérence de configuration. | Complété pendant cet audit | Introduction retirée ; ID enregistré désormais chargé avant requête et actualisé par abonnement, 0 respecté. Valeur historique 5254 conservée. | `130-mouvements-documents.js` |
| 39 | Organisation des informations de la notice | Clarifier quoi/comment cibler ; retirer Page configurée et son explication. | Vérifié et présentation complétée | Aides distinctes déplacement / style ; exemples et filtres ; carte et compteur de page supprimés. | `063-mis-en-page-catalogue.js ; 000-pmk-config-firestore.js` |
| 40 | Présentation des détails des exemplaires | Retirer le superflu, analyser Dracénie et rendre universel en gardant les valeurs initiales. | Vérifié et présentation complétée | Pages et structure configurables, blocs et champs, picker commun ; nœuds et événements natifs conservés. | `011-moredetail-layout.js` |
| 41 | Présentation du tableau des exemplaires | Même principe d’universalisation et de conservation. | Vérifié et présentation complétée | Pages, tableaux, cellules, statuts locaux et sources de site configurables ; contrôles de tri et liens préservés. | `033-mod-table-exemplaires.js` |
| 42 | Recherche progressive par cote | Retirer introduction et Activation. | Complété pendant cet audit | Introduction et section retirées ; bandeau commun remplacé par la commande compacte sans compteur. | `065-gen-callnum-links.js ; 000-pmk-config-firestore.js` |
| 43 | Repérage des codes-barres | Retirer introduction et Activation. | Complété pendant cet audit | Introduction et section retirées ; bandeau commun remplacé par la commande compacte sans compteur. | `068-blinking-barcode.js ; 000-pmk-config-firestore.js` |
| 44 | Résultats catalogue — présentation | Retirer introduction, activation et prose V8.1 ; renommer les commandes approuvées. | Vérifié et présentation complétée | Présentation enrichie ; Modifier l’exemplaire, Statistiques de prêt, Mouvements de l’exemplaire ; bandeau compact. | `129-mise-en-forme-exemplaire.js` |
| 45 | Résultats catalogue — SQL | ID configurable et rapport SQL à copier pour une autre installation. | Vérifié | SQL standard fourni, ID et contrat configurables ; mode Dracénie 4537 et ses paramètres inchangés. | `sql/129-statistiques-prets-exemplaire.sql` |
| 46 | Résultats catalogue — performances | Retirer API et performances et le paragraphe fourni. | Vérifié | Titres et paragraphe retirés ; limites et concurrence utiles conservées en avancé. | `129-mise-en-forme-exemplaire.js` |
| 47 | Résumé enrichi / 4e de couverture | Choisir où placer l’élément. | Vérifié | Destination choisie avec le picker et quatre positions ; absence de cible = placement historique, source native restaurée si cible introuvable. | `009-4eme-de-couv.js` |
| 48 | Transfert rapide d’un exemplaire | Retirer Fonctionnement, Suite du workflow et les explications données. | Vérifié | Blocs retirés du formulaire ; aucune exécution automatique du transfert. | `028-transfer-buttons-holdings.js ; 000-pmk-config-firestore.js` |
| 49 | Correction du statut au prêt | Retirer l’introduction et le numéro 145 du nom. | Vérifié | Nom approuvé « Correction du statut au prêt » ; identifiant technique historique conservé. | `146-checkout-status-correction-pmk.js` |
| 50 | Ancienneté des réservations | Fusionner avec dates relatives si pertinent. | Vérifié | Règles des trois onglets et dates dans relative-dates ; seuil, visibilité et paramètres antérieurs repris. | `014-calcule-dates-reservations.js ; 070-date-utils.js` |
| 51 | Contrôle du statut au retour d’un document perdu | Épurer, contrôler la synchronisation et universaliser les réglages. | Vérifié et présentation complétée | Synchronisation conservée car nécessaire aux codes locaux ; règles et métadonnées préservées ; signaux ciblables et carte de page retirée. | `051-alert-doc-retour-perdu.js ; 000-pmk-config-firestore.js` |
| 52 | Date limite de retrait | Retirer l’introduction générique. | Vérifié | Formulaire vérifié sans introduction. | `120-date-retrait-reservations.js` |
| 53 | Échéance de prêt des exemplaires | Fusionner avec dates relatives. | Vérifié | Préréglages sur les deux tableaux ; données checkout.due_date, affichage et langue antérieurs conservés. | `004-calcul-duree-pret-detail.js ; 070-date-utils.js` |
| 54 | Repères de l’historique des prêts | Renommer, épurer et universaliser. | Complété pendant cet audit | Pages/tableaux/colonnes réglables ; clic sur libellé imbriqué ou cellule sélectionnant désormais le bon en-tête. | `007-highlight-readingrec.js ; 000-pmk-config-firestore.js` |
| 55 | Historique des prêts et des retours | Renommer et retrouver le rapport compatible dans la bibliothèque. | Complété pendant cet audit | Rapport de mouvements 5254 identifié dans le code ; aide et action de reprise explicite de l’ID configuré, uniquement dans le brouillon. | `008-issuehistory-timeline.js ; sql/008-historique-transferts.sql` |
| 56 | Protection double validation — réservations | Choisir l’objet protégé en cas de mise à jour. | Complété pendant cet audit | Picker du bouton corrigé pour les clics sur son icône ; vraie reprise après navigation, sélecteur manuel conservé. | `125-double_clic_resrvation.js ; 000-pmk-config-firestore.js` |
| 57 | Disponibilité et motifs de renouvellement | Revoir nom/description et nommer les éléments plutôt qu’Élément XX. | Complété pendant cet audit | Nom et description clarifiés ; libellé ou code de motif maintenu même pendant l’édition et après effacement du libellé. | `114-renew-modif.js ; 000-pmk-config-firestore.js` |
| 58 | Compteur de fréquentation | Retirer les références visibles au Médiabus et unir le compteur à sa page. | Vérifié et description complétée | Module, stockage et transactions communs ; catégories, pas, sites, lieu et présentation configurables. Référence restante dans la description de 134 retirée. | `138-pages/138-page-attendance-counter.js ; 139-attendance-mediabus.js ; 134-intranetnav-menu.js` |
| 59 | Indicateurs d’efficacité | Évaluer l’utilité des contrôles d’activation/pages/langue. | Vérifié | Explication redondante retirée ; choix utiles de pages et langue conservés sous Pages et langue. | `099-efficiency-indicators.js ; 000-pmk-config-firestore.js` |
| 60 | Actions de copie | Toast en bas à droite avec la valeur copiée, sans badge accolé ; retirer Chargement dynamique. | Vérifié | Toast commun aux copies individuelles/groupées, valeur rendue en texte ; ancien placement retiré de l’interface mais réglage archivé. | `006-copy-patron-identifiers.js` |
| 61 | Listes de valeurs prédéfinies | Retirer l’introduction générique. | Vérifié | Formulaire vérifié sans introduction, listes existantes conservées. | `017-gestion-litiges-select.js` |
| 62 | Sélection visuelle commune | Les cibles configurables doivent fonctionner depuis les autres pages. | Complété pendant cet audit | Reprise automatique des pickers déclarés, même sans adaptateur spécialisé ; brouillon complet et propriétés personnalisées conservés, sans sauvegarde automatique. | `000-pmk-config-firestore.js` |

## Dernière liste : navigation, saisie et outils internes

| N° | Module | Demande | Résultat | Fichiers principaux |
|---|---|---|---|---|
| 63 | Menus de l’accueil | Renommer le module 147. | Fait : « Menus de l’accueil », sans numéro dans le nom affiché ; identifiant enregistré inchangé. | `000-pmk-config-firestore.js` |
| 64 | Placement d’éléments | Expliquer les préréglages. | Fait : description des déplacements et couvertures, sans références aux anciens numéros de scripts. | `025-deplacer-grille-technique.js` |
| 65 | QR mobile de la page | Choisir l’emplacement. | Fait : vrai champ de sélection commun, choix avant/après/début/fin, nouvelles pages, reprise du brouillon après navigation et enregistrement explicite. Les quatre placements par défaut sont conservés. | `page-qr-code.js` |
| 66 | Règles de saisie | Revoir la description. | Fait : explication des caractères, de la casse, du format des prix et du choix d’un champ par page. Règles et cibles par défaut conservées. | `048-forbid-accents-batchmod.js` |
| 67 | Historique récent | Vérifier le comportement et corriger le nom incohérent. | Fait : dernier accès aux adhérents, notices et recherches, jusqu’à 50 entrées par liste dans le navigateur. Correction du nettoyage qui remplaçait abusivement « historique » par « par défaut ». | `071-history-system-pmk-loader.js`, `000-pmk-config-firestore.js` |
| 68 | Valeurs par défaut selon la catégorie d’adhérent | Clarifier la description. | Fait : catégorie d’inscription, catégorie statistique à préremplir et conservation de la valeur existante ; règle C → sort1 = 12 inchangée. | `124-csp-enfant.js` |
| 69 | Vérification avant renouvellement lecteur | Vérifier l’universalisation. | Fait : aucun code de site Dracénie ; pages, avertissements, bloc lecteur, action native et emplacement de la checklist configurables. Informations supplémentaires et sélection de leurs valeurs. Préconfigurations natives conservées ; clic et soumission restent bloqués jusqu’à confirmation. | `002-verification-coordonnees.js` |
| 70 | Icônes des menus | Répétitions et descriptions. | Fait : distinction entre bibliothèque des menus latéraux et personnalisations prioritaires, bibliothèque complète en avancé, vrais pickers communs, une seule icône sur une cible remplacée. Métadonnées personnelles conservées. | `117-icons-menus.js` |
| 71 | Pages & outils internes | Examiner, unifier et simplifier. | Fait : catalogue commun de 20 outils avec recherche ; routage et chargement à la demande des quatre outils auparavant autonomes via le même registre. Activation prise en compte, nouvelle tentative après échec de chargement, retour au contenu natif. Droits d’accès existants conservés. Le travail XSLT est repris dans la demande suivante. | `138-pages-manager.js`, `136-xslt-assistant.js`, `141-modif-grille-par-lot.js`, `142-bibliography-builder.js`, `143-gestion-retards.js` |
| 72 | Compteur de listes | Ajouter des compteurs par sélection, retirer « Comportement ». | Fait : ajout de pages Koha, plusieurs zones par page et choix distinct du lieu du compteur. Sélection de la source limitée à une zone multiligne ; valeurs natives inchangées. Section « Comportement » retirée. | `000-pmk-config-firestore.js`, `050-line-counter.js` |
| 73 | Journal Koha | Renommer et retirer la double activation. | Fait : « Journal des modifications Koha » ; l’ancien état de page est repris une seule fois dans l’interrupteur principal, son ancienne valeur est conservée et le module peut ensuite être réactivé normalement. | `101-koha-log.js` |

Les onze nouveaux scénarios de régression couvrent notamment les vrais clics de
sélection, les brouillons non enregistrés, la restitution des attributs Koha,
les surcharges d’icônes, les droits d’accès et les chargements de pages en échec.
Le total de cette version est de 71 groupes de tests locaux.

## Reprise de l’éditeur XSLT et du chargement Bibliographies — 0.7.0

| N° | Module | Demande | Résultat | Fichiers principaux |
|---|---|---|---|---|
| 74 | Éditeur XSLT | Reprendre le module et clarifier son ergonomie, sa logique et ses intitulés. | Fait : trois étapes, projets identifiés, ajout/import, réglages de blocs, déplacement sans glisser, aperçu avant/après, vérification, copie et téléchargement XSLT. Sauvegarde/restauration complète des projets sans écraser les originaux. Correction du changement de zone MARC qui perdait le chemin XPath importé. Activation respectée. | `136-xslt-assistant.js`, `000-pmk-config-firestore.js`, `138-pages-manager.js` |
| 75 | Bibliographies & publications | Analyser les lenteurs, les corriger et ajouter une animation sans changer le design ni la philosophie. | Fait : suppression des attentes répétées, cache des lectures, affichage immédiat des données transmises puis enrichissement, couvertures non bloquantes, lectures bornées et réessayables. Indicateur animé discret, suivi des notices/couvertures et actualisation explicite. Modèles, disposition des panneaux, publication et données personnelles conservés. | `142-bibliography-builder.js`, `000-pmk-cover-resolver.js` |

Les six nouveaux groupes de tests vérifient l’affichage initial avant les réponses
réseau, l’arrivée des informations avant les couvertures, l’absence de lectures
redondantes lors d’un changement de présentation, les réponses tardives, un timeout
puis une reprise, et les parcours XSLT avec une vraie transformation navigateur.

## Ce qui n’est pas exécuté sur votre installation

- Le rendu XSLT final doit être vérifié dans votre Koha : le navigateur ne reproduit pas tous les paramètres et extensions du serveur. Aucun fichier ou préférence Koha n’a été publié automatiquement.
- Aucun remplacement de scripts, changement de règles Firebase, création de rapport ou enregistrement de configuration n’a été effectué sur le Koha réel.
- Les IDs SQL réels doivent être vérifiés dans votre Koha : 5254 et 4537 sont les valeurs historiques trouvées dans les sources du projet, pas des constats sur la base actuelle.
- Les comptes, permissions, réponses API, thèmes, catégories, grilles et accès aux données de production nécessitent une recette sur cette installation. La route de création de réserve de cours provient du Koha standard.

Les demandes précédentes ont été traitées dans le périmètre décrit. Le nouvel
audit des pages relève les dépendances et les travaux métier encore nécessaires,
explicités ci-dessous et dans `AUDIT-PAGES-PMK.md`.


## Fonctionnement et accès des pages — 0.7.1

| N° | Demande | Résultat |
|---|---|---|
| 76 | Vérifier si tout l’apprentissage se configure dans PMK. | Audit fait : non, réglages répartis entre pages/navigateurs et service partagé attendu. Diagnostic ajouté dans PMK. L’API `DracQualityMemory` n’est définie dans aucun fichier fourni ; sa présence éventuelle sur l’installation reste à vérifier. Constat historique ; la demande suivante remplace cette centralisation par la suppression du laboratoire et des retours d’apprentissage des pages modifiables. |
| 77 | Faire le point sur le fonctionnement et les accès de toutes les pages avant leur contenu. | Inventaire complet des vingt pages et de l’accueil, matrice des accès visible dans PMK, corrections des chargements, réouvertures, fermetures et liens de retour. Restrictions historiques conservées, dont le filtre nominatif de restauration. Détails dans `AUDIT-PAGES-PMK.md`. |

Validation de cette version : 75 groupes de régression, audit séparé des vingt
ouvertures/réouvertures et profils d’accès, syntaxe de 141 scripts vérifiée.
Aucun traitement métier en production n’a été déclenché.


## Pages, configurations et universalisation — 0.8.0

| N° | Demande | Résultat |
|---|---|---|
| 78 | Supprimer le laboratoire des règles. | Page et entrée par défaut retirées ; anciennes URL redirigées ; données et configurations anciennes conservées. |
| 79 | Examiner toutes les pages et développer leurs configurations universelles sans toucher Autorités. | Dix-huit pages documentées et reliées à une configuration centrale ; droits par page, prérequis, paramètres Koha/MARC, sauvegarde et import/export. Six SQL fournis avec copie. Compteur, XSLT et Bibliographies utilisent leur configuration métier existante. Autorités strictement inchangée. Voir AUDIT-PAGES-PMK.md et REFERENCE-CONFIGURATION-PAGES-PMK.md. |
| 80 | Installer Koha pour préparer un plugin et tester en situation. | Instance locale Koha 25.11 opérationnelle, plugin 0.1.0 installé ; six scénarios réels réussis et six SQL vérifiés sur le schéma MariaDB. Sources et lancement dans dev/koha/ et plugin/ ; détails et limites dans PLUGIN-KOHA-PMK.md. La migration complète des données et moteurs externes n’est pas présentée comme terminée. |


## Recette réelle du plugin — 0.1.1, 19 octobre 2026

| N° | Demande | Résultat |
|---|---|---|
| 81 | Continuer les essais sur une vraie instance Koha dédiée en mode plugin. | 104 scripts chargés ; 84 formulaires, 19 pages et 30 écrans vérifiés. Parcours réels de prêt, renouvellement, retour, statuts, édition, restauration, journal, compteur, XSLT, bibliographie et analyses validés. Réinstallation sans modification des configurations ni de leur historique, contrôlée par empreinte. Les services externes réels restent à valider séparément ; aucune migration de données de production n’est annoncée. Voir RECETTE-PLUGIN-KOHA.md. |
