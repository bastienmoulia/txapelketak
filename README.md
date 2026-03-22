# Txapelketak

Application web de gestion de tournois et de scores, pensée pour des organisateurs, administrateurs et observateurs, avec synchronisation temps réel via Firebase.

## Objectif

Txapelketak permet de :

- créer et configurer des tournois ;
- gérer joueurs, matchs, états et scores ;
- visualiser classements et résultats ;
- préparer un affichage live des informations tournoi ;
- structurer les données pour export/import et audit.

## Stack technique

- Angular 21 (standalone + routing lazy load)
- PrimeNG 21 (UI)
- Transloco (i18n)
- Firebase Hosting + Firestore (émulateur local en dev)
- ESLint + Vitest (qualité)
- GitHub Actions (CI lint/test/build + déploiement preview/live)

## Structure fonctionnelle (actuelle)

- `src/app/home` : page d'accueil
- `src/app/tournaments` : liste, création et détail de tournoi
- `src/app/admin` : espace admin via route à jeton `/:tournamentId/:token`
- `src/app/shared` : composants partagés (header, tableaux, pipes, services)
- `public/i18n` : traductions `fr`, `eu`, `en`, `es`

## Prérequis

- Node.js (version LTS recommandée)
- npm
- Firebase CLI (optionnel mais conseillé pour l'émulation locale)

## Installation

```bash
npm ci
```

## Lancement en local

### Frontend seul

```bash
npm run serve
```

### Frontend + Firestore Emulator

```bash
npm start
```

Cela lance :

- l'application Angular sur `http://localhost:4200`
- l'émulateur Firestore avec import/export local de données

## Scripts utiles

- `npm run serve` : démarre l'app Angular
- `npm run build` : build de production
- `npm run test` : tests unitaires
- `npm run lint` : linting
- `npm run watch` : build en mode watch
- `npm run emulators` : démarre Firestore Emulator
- `npm run emulators:stop` : stoppe les émulateurs
- `npm run emulators:reset` : redémarre les émulateurs

## Qualité & CI/CD

### Pull Requests

- `.github/workflows/pr-lint-test.yml` : exécute `lint` + `test`
- `.github/workflows/firebase-hosting-pull-request.yml` : build + déploiement preview Firebase

### Merge sur `main`

- `.github/workflows/firebase-hosting-merge.yml` : lint + test + build + déploiement live Firebase

## Internationalisation

Les textes UI sont traduits via les fichiers JSON dans `public/i18n` :

- `fr.json`
- `eu.json`
- `en.json`
- `es.json`

Convention projet : variables TypeScript en anglais, textes utilisateur traduits.

## Données & Firebase

- Hébergement : Firebase Hosting
- Données : Firestore (émulé en local)
- Configuration principale : `firebase.json`

### Règles Firestore

- Les règles sont définies dans `firestore.rules` et chargées via `firebase.json`.
- Le modèle de sécurité repose sur Firebase Auth + claims custom : `role` (`admin`/`organizer`) et `tournamentId`.
- Sans utilisateur authentifié avec ces claims, les écritures sont refusées et l'accès aux documents sensibles (`users`, `mail`) est bloqué.

Déploiement des règles :

```bash
firebase deploy --only firestore:rules
```

## Ressources

- Angular CLI : https://angular.dev/tools/cli
- Firebase : https://firebase.google.com/docs
- Transloco : https://jsverse.gitbook.io/transloco
- PrimeNG : https://www.primefaces.org/primeng
