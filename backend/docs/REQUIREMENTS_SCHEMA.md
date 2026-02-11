# Schématisation du cahier des charges

Document de référence pour aligner le projet sur le cahier des charges (modèle d’habilitations, API, livrables, structure, bonus).

---

## 1. Modèle d’habilitations hiérarchique

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ORGANISATIONS  →  UTILISATEURS  →  RÔLES  →  PERMISSIONS                   │
│  (tenant root)      (1 user = 1 org)   (statique)   (granulaires)            │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │  Organisation A   │
                    │  (tenant)         │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
   ┌──────────┐        ┌──────────┐        ┌──────────┐
   │ User 1   │        │ User 2   │        │ User 3   │
   │ Role:    │        │ Role:    │        │ Role:    │
   │ Owner    │        │ Admin    │        │ Analyst  │
   └────┬─────┘        └────┬─────┘        └────┬─────┘
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────────────────────────────────────────────┐
   │  RÔLES (fixes)  →  PERMISSIONS (map statique)   │
   │  Owner   → tout (+ users, delete org)            │
   │  Admin   → CRUD suppliers, config risk, read audit│
   │  Analyst → read suppliers, update risk, notes   │
   │  Auditor → read-only + audit trail               │
   └─────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │  Organisation B   │  ← isolation complète :
                    │  (autre tenant)   │    aucun accès aux données de A
                    └────────┬─────────┘
                             │
                             ▼
                      Users B (même modèle
                      Org → User → Role → Permissions)
```

**Isolation des données :** toutes les données métier (fournisseurs, audit, etc.) sont scopées par `organization_id` ; un utilisateur de l’org A ne doit jamais voir/modifier les données de l’org B.

---

## 2. Chaîne de traitement d’une requête (API REST)

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    CLIENT (HTTP)                         │
                    └───────────────────────────┬─────────────────────────────┘
                                                │
                                                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  ADONISJS — Route + Middleware + Controller + Validation + Erreurs             │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Route (public)     →  Controller (login, etc.)                            │
│                                                                               │
│   Route (protégée)   →  [Auth]  →  [OrgScope]  →  [RBAC]  →  Controller      │
│                              │           │            │            │          │
│                              │           │            │            │          │
│                              ▼           ▼            ▼            ▼          │
│                         JWT valid   SET app.       hasPermission  Validator   │
│                         user in     current_org_id  (role, perm)  (VineJS)   │
│                         ctx.auth                   sinon 403      puis CRUD   │
│                                                                               │
│   Chaque requête métier : scoping systématique par organization_id            │
│   (WHERE organization_id = ctx.auth.organizationId) + RLS en défense en profondeur│
└───────────────────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │  Réponse : JSON structuré, codes HTTP cohérents,          │
                    │  messages d’erreur exploitables (IApiErrorResponse)      │
                    └─────────────────────────────────────────────────────────┘
```

---

## 3. Livrables demandés vs implémenté

| # | Livrable | Statut / Emplacement |
|---|----------|----------------------|
| 1 | Repo Git (historique propre, commits atomiques, conventional commits) | À faire / à renforcer |
| 2 | Installation et lancement en une commande (`docker-compose up` ou équivalent) | `docker-compose.yml` présent ; doc dans README/RUN.md |
| 3 | **README.md** : installation, choix techniques, “ce qu’on aurait fait avec plus de temps” | À compléter (RUN.md existe) |
| 4 | **ARCHITECTURE.md** : RBAC, multi-tenant, async IA, séparation des responsabilités | Présent et à jour |
| 5 | **SECURITY.md** : XSS/CSRF, rate limiting, secrets, headers | À rédiger ou compléter |

---

## 4. Structure suggérée vs actuelle

```
Structure SUGGÉRÉE                    Structure ACTUELLE / à viser
────────────────────                 ─────────────────────────────

packages/                             packages/
├── frontend/     # React + TS + Vite  ├── frontend/        (à créer ou en cours)
├── backend/      # AdonisJS          ├── backend/         ✅ AdonisJS
├── shared/       # Types, validation, ├── shared/          ✅ Types, permissions, DB
│                 # permissions        │
├── ai-service/   # Module IA          └── ai-service/      (bonus / à créer)
│   (peut être dans backend)           
├── docker-compose.yml  # PG + Redis   ├── docker-compose.yml  ✅ (PG)
├── README.md                         ├── README.md
├── ARCHITECTURE.md                   ├── ARCHITECTURE.md   ✅
└── SECURITY.md                       └── SECURITY.md      (à créer)
```

---

## 5. Bonus (non obligatoires)

| Bonus | Description | Priorité suggérée |
|-------|-------------|-------------------|
| Job queue (BullMQ) | Pipeline IA asynchrone, retry, dead letter | Élevée si IA async |
| SSE / WebSocket | Rafraîchissement temps réel des analyses IA | Si temps réel requis |
| CI (GitHub Actions) | Lint + tests + npm audit + security scan | Élevée pour rigueur |
| Invitation utilisateurs | Owner invite Analyst, flow onboarding | Moyenne |
| Export CSV fournisseurs | Export de la liste fournisseurs | Faible, rapide |
| Dark mode / thème adaptatif | UX | Faible |

---

## 6. Conseils du sujet (rappel)

1. **Modélisation d’abord** : schéma de données, RBAC, isolation tenant → le CRUD en découle.
2. **Commits** : réguliers, descriptifs, conventional commits.
3. **Périmètre** : réduit et bien exécuté plutôt que beaucoup de features inachevées.
4. **Documentation** : ARCHITECTURE.md et SECURITY.md comptent autant que le code.
5. **Si manque de temps** : expliquer dans le README ce qui aurait été fait et pourquoi.

---

## 7. Résumé des choix à valider

- **RBAC** : map statique rôle → permissions (pas de tables `roles` / `permissions` dynamiques).
- **Multi-tenant** : scoping par `organization_id` + RLS PostgreSQL en défense en profondeur.
- **API** : AdonisJS (controllers, validators), pas de “models” Lucid si Kysely est la couche DB (cohérent avec ARCHITECTURE.md).
- **Validation** : VineJS (validators AdonisJS).
- **Erreurs** : handler global → codes HTTP + JSON structuré (IApiErrorResponse).
- **Middleware** : Auth (JWT) → OrgScope (RLS) → RBAC (permission) sur chaque route protégée.

Utiliser ce schéma pour vérifier que chaque livrable et chaque décision technique restent alignés avec le cahier des charges.
