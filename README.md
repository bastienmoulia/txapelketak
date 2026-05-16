# Txapelketak

Application web de gestion de tournois et de scores, pensée pour des organisateurs, administrateurs et observateurs, avec synchronisation temps réel via Firebase.

## Objectif

Txapelketak permet de :

- créer et configurer des tournois ;
- gérer joueurs/équipes, matchs, créneaux horaires et scores ;
- visualiser classements et résultats en temps réel ;
- administrer les tournois via un accès par jeton URL (sans inscription) ;
- exporter/importer les données au format YAML ;
- proposer une interface multilingue (fr, eu, en, es) avec thème clair/sombre.

## Fonctionnalités

- **3 types de tournois** : poules (groupes), phase finale (élimination directe), poules + phase finale
- **Accès par rôle via URL** : administrateur, organisateur, observateur — sans authentification classique
- **Temps réel** : synchronisation instantanée des scores et classements via Firestore
- **Wizard de création** : assistant multi-étapes pour créer un tournoi
- **Gestion complète** : équipes, séries, poules, matchs, scores, créneaux horaires
- **Import/export YAML** : sauvegarde et restauration des données de tournoi
- **Descriptions Markdown** : les descriptions de tournoi supportent le format Markdown
- **PWA** : installable sur mobile et desktop via service worker
- **4 langues** : français, basque (euskara), anglais, espagnol
- **Thème** : clair, sombre ou automatique

## Stack technique

| Catégorie       | Technologie                                      |
| --------------- | ------------------------------------------------ |
| Framework       | Angular 21 (standalone components, lazy loading) |
| UI              | PrimeNG 21 + PrimeIcons 7                        |
| CSS             | Tailwind CSS 4 + tailwindcss-primeui             |
| État            | NgRx Signals                                     |
| i18n            | Transloco                                        |
| Backend         | Firebase Hosting + Firestore                     |
| Markdown        | marked                                           |
| Import/Export   | js-yaml                                          |
| Utilitaires     | ngxtension                                       |
| Tests unitaires | Vitest + @analogjs/vitest-angular                |
| Tests E2E       | Playwright                                       |
| Qualité         | ESLint (TypeScript + CSS + HTML)                 |
| CI/CD           | GitHub Actions                                   |

## Structure du projet

```
src/app/
├── home/                    # Page d'accueil (features, tournois récents)
├── tournaments/
│   ├── list/                # Liste des tournois
│   ├── new/                 # Création (wizard multi-étapes)
│   ├── detail/              # Détail public d'un tournoi
│   └── types/               # Composants par type de tournoi
│       ├── poules/          #   Format poules (groupes)
│       ├── finale/          #   Format phase finale
│       ├── poules-finale/   #   Format combiné
│       └── shared/          #   Composants partagés (dashboard, games, poules-tab, teams)
├── admin/                   # Espace administration (accès par jeton)
│   └── types/
│       ├── admin-poules/    #   Admin poules
│       ├── admin-finale/    #   Admin phase finale
│       ├── admin-poules-finale/ # Admin combiné
│       └── shared/          #   Paramètres, utilisateurs, créneaux, import/export, suppression
├── shared/
│   ├── header/              # En-tête de l'application
│   ├── header-actions/      # Actions de l'en-tête
│   ├── role-badge/          # Badge de rôle utilisateur
│   ├── tournament-header/   # En-tête de tournoi
│   ├── tournaments-table/   # Tableau de tournois réutilisable
│   ├── pipes/               # Pipes (statut tournoi)
│   ├── router/              # Stratégie de titre dynamique
│   └── services/            # Firebase, Markdown, Transloco, Datepicker
├── store/                   # État applicatif (NgRx Signals)
│   ├── tournaments.store    #   Liste des tournois
│   ├── tournament-detail.store # Détail d'un tournoi
│   └── poules.store         #   Équipes, séries, créneaux, matchs
├── testing/                 # Utilitaires de test (providers Transloco)
├── app.config.ts            # Configuration de l'application
├── app.routes.ts            # Routes principales
└── app.ts                   # Composant racine

public/i18n/                 # Traductions (fr, eu, en, es)
e2e/                         # Tests end-to-end Playwright
```

### Routes

| Route                     | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `/`                       | Page d'accueil                                 |
| `/tournaments`            | Liste des tournois                             |
| `/tournaments/new`        | Création de tournoi                            |
| `/tournaments/:id`        | Vue publique d'un tournoi                      |
| `/tournaments/:id/:token` | Interface admin/organisateur (accès par jeton) |

## Prérequis

- Node.js (version LTS recommandée)
- npm
- Firebase CLI (optionnel, recommandé pour l'émulation locale)

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
- l'émulateur Firestore sur le port `8080` avec import/export local de données

## Scripts

| Commande                  | Description                         |
| ------------------------- | ----------------------------------- |
| `npm start`               | App Angular + Firestore Emulator    |
| `npm run serve`           | App Angular seule                   |
| `npm run serve:test`      | App avec configuration test         |
| `npm run serve:prod`      | App avec configuration production   |
| `npm run build`           | Build de production                 |
| `npm run build:test`      | Build avec configuration test       |
| `npm run watch`           | Build en mode watch                 |
| `npm run test`            | Tests unitaires (Vitest)            |
| `npm run test:coverage`   | Tests avec couverture de code       |
| `npm run lint`            | Linting (ESLint)                    |
| `npm run e2e`             | Tests end-to-end (Playwright)       |
| `npm run e2e:ui`          | Tests E2E avec interface Playwright |
| `npm run emulators`       | Démarre Firestore Emulator          |
| `npm run emulators:stop`  | Stoppe les émulateurs               |
| `npm run emulators:reset` | Redémarre les émulateurs            |

## Tests

### Tests unitaires

- **Runner** : Vitest avec `@analogjs/vitest-angular`
- **Environnement** : navigateur Playwright (Chromium)
- **Couverture** : Istanbul (formats text, html, lcov)
- **Lancement** : `npm run test` ou `npm run test:coverage`

### Tests end-to-end

- **Framework** : Playwright
- **Navigateur** : Chromium (Firefox et WebKit disponibles en CI merge)
- **Parallélisation** : activée (`fullyParallel: true`)
- **Rapports** : HTML + captures d'écran et vidéos en cas d'échec
- **Lancement** : `npm run e2e` ou `npm run e2e:ui`

## Qualité & CI/CD

### Pull Requests

- **`pr-lint-test.yml`** : lint + tests unitaires + tests E2E + rapport Playwright (artifact 30 jours)
- **`firebase-hosting-pull-request.yml`** : build + déploiement preview Firebase

### Merge sur `main`

- **`firebase-hosting-merge.yml`** : lint + tests unitaires + E2E (multi-navigateurs) + build + déploiement live Firebase

## Internationalisation

Les textes UI sont traduits via Transloco et les fichiers JSON dans `public/i18n` :

- `fr.json` — Français
- `eu.json` — Euskara (Basque)
- `en.json` — English
- `es.json` — Español

Convention projet : variables TypeScript en anglais, textes utilisateur traduits.

## Données & Firebase

- **Hébergement** : Firebase Hosting (région `europe-west1`)
- **Base de données** : Firestore (émulé en local, base `test` séparée en CI)
- **Configuration** : `firebase.json`

### Modèle de données

```
Tournament
├── Teams[]
├── Series[]
│   └── Poules[]
│       └── Games[]
├── Users[] (admin/organizer avec token)
└── TimeSlots[]
```

### Environnements

| Environnement | Firestore                   | Utilisation   |
| ------------- | --------------------------- | ------------- |
| `development` | Émulateur local (port 8080) | Développement |
| `test`        | Base Firestore `test`       | CI / E2E      |
| `production`  | Base Firestore par défaut   | Production    |

### Règles Firestore

- Définies dans `firestore.rules` et chargées via `firebase.json`.
- Lectures publiques sur les tournois et collections enfants.
- Écritures contrôlées par validation de schéma (types, statuts, champs requis).
- Tokens utilisateur avec minimum 20 caractères.
- Rôles : `admin` et `organizer`.

Déploiement des règles :

```bash
firebase deploy --only firestore:rules
```

## Ressources

- Angular : https://angular.dev
- PrimeNG : https://primeng.org
- Tailwind CSS : https://tailwindcss.com
- NgRx Signals : https://ngrx.io/guide/signals
- Transloco : https://jsverse.gitbook.io/transloco
- Firebase : https://firebase.google.com/docs
- Playwright : https://playwright.dev
- Vitest : https://vitest.dev
