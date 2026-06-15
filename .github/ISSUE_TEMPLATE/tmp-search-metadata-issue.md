# Ajouter un index de métadonnées Font Awesome et un moteur de recherche tolérant

## Contexte
Le projet charge aujourd’hui les icônes Font Awesome et reconstruit essentiellement une correspondance technique entre classes CSS et glyphes. Cela permet l’affichage, mais pas une recherche ergonomique comparable à celle du site officiel Font Awesome.

Pour améliorer l’exploration des icônes, il faut enrichir chaque icône avec des métadonnées de recherche (nom, alias, catégories, mots-clés disponibles) puis brancher un moteur de recherche côté interface.

## Objectif
Mettre en place une recherche d’icônes plus intelligente, capable de répondre :
- au nom exact d’une icône ;
- à des mots-clés ou associations sémantiques ;
- à des fautes de frappe ou recherches approximatives.

## Travaux attendus

### 1. Compiler une base de métadonnées
Créer une étape de génération ou un fichier d’index à partir des métadonnées disponibles dans Font Awesome.

À minima, chaque entrée devrait pouvoir contenir :
- identifiant canonique de l’icône ;
- classe CSS (`fa-*`) ;
- unicode / glyphe ;
- style / famille (`solid`, `regular`, `brands`, etc.) ;
- alias éventuels ;
- catégories ;
- termes de recherche / mots-clés quand disponibles.

Livrable attendu :
- un index exploitable dans l’application, par exemple `icons-index.json`.

### 2. Ajouter un moteur de recherche dans l’interface
Permettre de filtrer la liste/grille des icônes avec un champ de recherche.

Le moteur doit permettre de rechercher sur plusieurs dimensions :
- nom de l’icône ;
- classe CSS ;
- alias ;
- catégories ;
- mots-clés.

### 3. Utiliser Fuse.js pour une recherche tolérante
Intégrer Fuse.js pour obtenir :
- tolérance aux fautes de frappe ;
- recherche approximative ;
- classement pertinent des résultats.

Exemples de comportements attendus :
- `home` doit retrouver `house` si les métadonnées le permettent ;
- `profil` doit retrouver des icônes de type `user` si l’index contient les mots-clés associés ;
- une faute légère ou un terme incomplet ne doit pas bloquer la recherche.

## Pistes d’implémentation
- Générer l’index de métadonnées à build-time ou via un script dédié.
- Fusionner cet index avec la map existante des glyphes déjà extraite depuis les stylesheets.
- Construire un index Fuse.js basé sur les champs les plus pertinents avec pondération.
- Prévoir une normalisation des termes (minuscules, accents, etc.).

## Critères d’acceptation
- Un index de métadonnées des icônes existe et est exploitable par l’application.
- L’interface propose un champ de recherche pour filtrer les icônes.
- La recherche fonctionne sur autre chose que le seul nom CSS des icônes.
- Fuse.js est utilisé pour supporter les fautes de frappe et recherches approximatives.
- Les résultats sont classés de manière cohérente.

## Remarques
Les métadonnées Font Awesome disponibles doivent être exploitées autant que possible afin d’éviter la reconstruction manuelle complète d’un dictionnaire de mots-clés.
