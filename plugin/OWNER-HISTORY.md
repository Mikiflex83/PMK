# PMK — historique des affectations (mode plugin uniquement)
Ce module est exclusivement livré dans le KPZ. Aucun script non-plugin n'est ajouté.

- Installer ou mettre à niveau le plugin : création de deux tables PMK et capture initiale de `items.homebranch`.
- Le hook `after_item_action` compare l'état de référence avec la nouvelle affectation et enregistre les changements `avant → après`. Pas de journalisation des modifications sans changement.
- Consultation sur `moredetail.pl?itemnumber=...` ou `detail.pl?itemnumber=...` : timeline, tableau brut, export CSV.
- Les changements effectués directement en SQL ne passent pas nécessairement par le hook. Les modifications survenues pendant une désactivation du plugin ne peuvent pas être reconstituées exactement.
- L'installation initiale de ce module nécessite une opération SQL `INSERT ... SELECT` sur `items`. Tester sur sandbox et faire valider par l'hébergeur avant production.
- Les événements sont conservés lors de la désinstallation (comme les autres données PMK).
- Le module doit faire l'objet d'une recette sur Koha 25.11 avant de considérer sa couverture exhaustive.

## Contrat module PMK
- ID stable : `pmk-owner-history`, `schemaVersion: 1`, FR/EN, catégorie catalogue, `supportedPages`, `defaults`, `schema`.
- `registerModule()` au démarrage et sur `pmk:config-ready` ; `subscribe()` et `getConfig()` pour les mises à jour de présentation.
- Le paramètre `enabled` masque uniquement la consultation, **pas** l'historisation serveur : une interruption de collecte créerait une lacune irréparable. L'administration doit présenter clairement cette distinction.
- `detail.pl` ne fournit pas nécessairement un `itemnumber` : sans identifiant explicite d'exemplaire, ne jamais confondre `biblionumber` avec `itemnumber`.
- Le module est en **PR brouillon** jusqu'à la recette Koha 25.11 ; les hooks ne garantissent pas les mutations SQL directes.
