# Cahier des charges - Application de gestion de tournoi et de scores

## Vision du projet

### Contexte

L'application permet de gérer des tournois, les joueurs, les matchs et les scores. L'objectif est d'avoir une bonne expérience utilisateur, une fiabilité des données, et des fonctionnalités de gestion efficaces (classements, historiques, exports).

### Objectifs principaux

- Simplifier la création et la configuration des tournois.
- Améliorer la saisie, la validation et la traçabilité des scores.
- Offrir des classements clairs et paramétrés selon différents formats.
- Permettre l'export et l'import des données.
- Renforcer la robustesse, les tests et la maintenance.

## Périmètre

### Inclus

- Gestion des droits d'accès et des rôles utilisateurs par URL.
- Gestion des tournois (création, édition, archivage).
- Gestion des joueurs et des équipes (si applicable).
- Gestion des matchs (planification, scores, état).
- Classements et statistiques.
- Export/import de données au format YAML.
- Bonne UX/UI et accessibilité.
- Journalisation et audit des modifications.

### Hors périmètre

- Authentification classique (compte utilisateur).
- Paiements, inscriptions publiques en ligne.
- Système de messagerie interne.
- Gestion de billetterie.

## Utilisateurs et rôles

- Administrateur : création et configuration des tournois, gestion des droits.
- Organisateur : gestion des matchs et scores.
- Observateur : consultation des classements et résultats.

## Exigences fonctionnelles

### Tournois

- Créer un tournoi avec : nom, description, type (poules, phase finale, poules + phase finale), nb de joueurs/équipes, règles.
- Définir explicitement le type de tournoi et les phases actives associées.
- Archiver un tournoi et le rendre consultable en lecture seule.

#### Types de tournois

- Poules : joueurs répartis en poules, matchs au sein des poules, classement par poule. Possibilité d'avoir plusieurs séries de poules.
- Phase finale : tournoi à élimination directe, avec possibilité de consolante.
- Poules + phase finale : combinaison des deux, avec qualification des meilleurs joueurs de chaque groupe pour la phase finale.

### Joueurs et équipes

- Ajout, ajout multiple, édition, suppression (avec contrôle d'impact sur matchs existants).

### Matchs et scores

- Planifier les matchs (auto et manuel).
- État des matchs : à venir, en cours, terminé, annulé.
- Saisie des scores avec validation : format numérique simple, bornes, cohérences.
- Historique des modifications de scores (qui, quand, avant/après).
- Possibilité d'annulation et de correction, avec commentaire obligatoire.

### Classements

- Classements par groupe, général, et final.
- Règles de départage configurables : base générique (points, différence, confrontations directes) tant que les règles définitives ne sont pas fixées.
- Affichage clair des critères utilisés.

### Statistiques

- Statistiques par joueur : matchs joués, gagnés, perdus, points.
- Statistiques par tournoi : progression, moyenne de points, top 3.

### Import et export

- Export PDF des classements et résultats (si possible).
- Export complet YAML pour sauvegarde.
- Import YAML pour restauration.

### Journalisation et audit

- Journal des actions critiques (création, suppression, modification scores).
- Consultation filtrable par date, type d'action, utilisateur.

## Exigences non fonctionnelles

- Performance : réponse < 300 ms pour actions courantes (hors gros exports).
- Fiabilité : transactions lors des écritures critiques.
- UX : navigation rapide, raccourcis clavier pour saisie des scores.
- Accessibilité : contrastes suffisants, navigation clavier.
- Internationalisation : structure permettant FR/EU/EN/ES.
- Sécurité : contrôle des accès par rôle.

## Expérience utilisateur

- Assistant de création de tournoi (wizard en 3-4 étapes).
- Tableaux de matchs avec filtres rapides (groupe, état, joueur).
- Dialogue de score simplifié avec validation en temps réel.
- Vues de classement claires, triables, et exportables.
- Indicateurs visuels pour matchs en retard.
- Écran public dédié pour suivi live de l'avancement du tournoi (scores, classements, état des matchs).

## Données et architecture

### Modèle de données

- Schéma clarifie pour : Tournament, Group, Match, Score, Player.
- Identifiants stables pour exports/imports.
- Champs d'audit : createdAt, updatedAt, updatedBy.

### Architecture technique cible

- Frontend : application Angular (version actuelle à confirmer), modularisée par domaine (tournoi, matchs, scores).
- Librairie de composants UI : PrimeNG pour accélérer le développement d'interfaces homogènes et accessibles.
- Backend : Firebase (BaaS) avec :
  - Hosting pour le déploiement.
  - Base de données en temps réel pour les données de tournoi.
- Synchronisation temps réel pour l'affichage live des scores et classements.
- Règles de sécurité Firebase basées sur les rôles (admin, organisateur, observateur).
- Accès admin via URL avec jeton complexe (sans inscription).
- Environnements : dev/prod, avec configuration par environment Angular.
- Journalisation des actions critiques stockée dans la base (collection ou nœud dédié).

## Tests et qualité

- Tests unitaires pour règles de classement et validation des scores.
- Tests d'intégration pour création tournoi et sauvegarde.
- Jeux de données de test (petit, moyen, grand).

## Conventions UI PrimeNG

- Éviter les API dépréciées PrimeNG lors des développements et refactors.
- Ne pas utiliser l'attribut `styleClass` sur les composants PrimeNG (déprécié) ; utiliser `class` ou des bindings de classe Angular (`[class]`, `[class.nom]`) à la place.
- Lors d'une montée de version PrimeNG, vérifier systématiquement les notes de migration et remplacer les usages dépréciés dans les templates.
- Tous les boutons icône-seule (sans texte visible) doivent avoir un `ariaLabel` et un `pTooltip` traduits.
- Cette règle s'applique aussi aux boutons responsives qui deviennent icône-seule sur mobile.

## Traductions et internationalisation

- Les variables typescript doivent être en anglais, mais les textes affichés à l'utilisateur doivent être traduits.
- Les langues supportées sont le français (fr), le basque (eu), l'anglais (en) et l'espagnol (es).
- Les traductions doivent être gérées via des fichiers JSON dans le dossier `public/i18n/` avec une structure claire et cohérente.

## Identité et naming

- Le nom de l'application doit rester générique, simple, et compréhensible pour tous les publics.
- Le nom ne doit pas être trop orienté "pro" ni trop lié à un seul sport.
- Préférer un nom court (1 à 2 mots), facile à retenir et à prononcer.

### Pistes de noms

- Txapelketa Live
- Txapelketa Libre
- Txapelketa Denontzat
- Emaitza Now
- Partida Hub
