# Cahier des charges - Application de gestion de tournoi et de scores

## 1. Contexte et objectifs

L'application permet de gérer des tournois, les joueurs, les matchs et les scores. L'objectif est d'avoir une bonne expérience utilisateur, une fiabilité des données, et des fonctionnalités de gestion efficaces (classements, historiques, exports).

Objectifs principaux :

- Simplifier la création et la configuration des tournois.
- Améliorer la saisie, la validation et la traçabilité des scores.
- Offrir des classements clairs et paramétrés selon différents formats.
- Permettre l'export et l'import des données.
- Renforcer la robustesse, les tests et la maintenance.

## 2. Périmètre

Inclus :

- Gestion des droits d'accès et des rôles utilisateurs.
- Gestion des tournois (création, édition, archivage).
- Gestion des joueurs et des équipes (si applicable).
- Gestion des matchs (planification, scores, état).
- Classements et statistiques.
- Export/import de données.
- Améliorations UX/UI et accessibilité.
- Journalisation et audit des modifications.

Exclus :

- Paiements, inscriptions publiques en ligne.
- Système de messagerie interne.
- Gestion de billetterie.

## 3. Utilisateurs et rôles

- Administrateur : création et configuration des tournois, gestion des droits.
- Organisateur : gestion des matchs et scores.
- Observateur : consultation des classements et résultats.

## 4. Exigences fonctionnelles

### 4.1 Tournois

- Créer un tournoi avec : nom, description, type (poules, phase finale, poules + phase finale), nb de joueurs/équipes, règles.
- Définir explicitement le type de tournoi et les phases actives associées.
- Dupliquer un tournoi existant comme modèle.
- Archiver un tournoi et le rendre consultable en lecture seule.
- Gestion des phases (groupes, quart/demi/finale).

### 4.2 Joueurs / équipes

- Ajout, édition, suppression (avec contrôle d'impact sur matchs existants).
- Importer une liste de joueurs depuis CSV.
- Attribuer des seeds (têtes de série) et des groupes.
- Gestion des absences/forfaits.

### 4.3 Matchs et scores

- Planifier les matchs (auto et manuel).
- État des matchs : à venir, en cours, terminé, annulé.
- Saisie des scores avec validation : format numérique simple, bornes, cohérences.
- Historique des modifications de scores (qui, quand, avant/après).
- Possibilité d'annulation et de correction, avec commentaire obligatoire.

### 4.4 Classements

- Classements par groupe, général, et final.
- Règles de départage configurables : base générique (points, différence, confrontations directes) tant que les règles définitives ne sont pas fixées.
- Affichage clair des critères utilisés.

### 4.5 Statistiques

- Statistiques par joueur : matchs joués, gagnés, perdus, points.
- Statistiques par tournoi : progression, moyenne de points, top 3.

### 4.6 Import / Export

- Export PDF des classements et résultats (si possible).
- Export complet JSON pour sauvegarde.
- Import JSON pour restauration.

### 4.7 Journalisation et audit

- Journal des actions critiques (création, suppression, modification scores).
- Consultation filtrable par date, type d'action, utilisateur.

## 5. Exigences non fonctionnelles

- Performance : réponse < 300 ms pour actions courantes (hors gros exports).
- Fiabilité : transactions lors des écritures critiques.
- UX : navigation rapide, raccourcis clavier pour saisie des scores.
- Accessibilité : contrastes suffisants, navigation clavier.
- Internationalisation : structure permettant FR/EU.
- Sécurité : contrôle des accès par rôle.

## 6. Interface et expérience utilisateur

- Assistant de création de tournoi (wizard en 3-4 étapes).
- Tableaux de matchs avec filtres rapides (groupe, état, joueur).
- Dialogue de score simplifié avec validation en temps réel.
- Vues de classement claires, triables, et exportables.
- Indicateurs visuels pour matchs en retard.
- Écran public dédié pour suivi live de l'avancement du tournoi (scores, classements, état des matchs).

## 7. Données et modèle

- Schéma clarifie pour : Tournament, Group, Match, Score, Player.
- Identifiants stables pour exports/imports.
- Champs d'audit : createdAt, updatedAt, updatedBy.

## 7.1 Architecture technique cible

- Frontend : application Angular (version actuelle à confirmer), modularisée par domaine (tournoi, matchs, scores).
- Backend : Firebase (BaaS) avec :
  - Hosting pour le déploiement.
  - Base de données en temps réel pour les données de tournoi.
  - Authentification (email/mot de passe + éventuels providers).
- Synchronisation temps réel pour l'affichage live des scores et classements.
- Règles de sécurité Firebase basées sur les rôles (admin, organisateur, observateur).
- Accès organisateurs via URL avec jeton complexe (sans inscription), avec expiration configurable.
- Accès admins via compte (email/mdp) ou providers externes (Google, autre à définir).
- Environnements : dev/prod, avec configuration par environment Angular.
- Journalisation des actions critiques stockée dans la base (collection ou nœud dédié).

## 8. Tests et qualité

- Tests unitaires pour règles de classement et validation des scores.
- Tests d'intégration pour création tournoi et sauvegarde.
- Jeux de données de test (petit, moyen, grand).

## 9. Naming et identité

- Le nom de l'application doit rester générique, simple, et compréhensible pour tous les publics.
- Le nom ne doit pas être trop orienté "pro" ni trop lié à un seul sport.
- Préférer un nom court (1 à 2 mots), facile à retenir et à prononcer.

Exemples de noms génériques à étudier :

- Txapelketa Live
- Txapelketa Libre
- Txapelketa Denontzat
- Emaitza Now
- Partida Hub
