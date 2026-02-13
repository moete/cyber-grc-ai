# SECURITY.md — Cyber GRC Platform

> Ce document décrit les mesures de sécurité **en place** et celles **prévues** pour la plateforme.

---

## 1. Authentification & sessions JWT

| Aspect | État | Détail |
|--------|------|--------|
| Login / Logout | ✅ Implémenté | `POST /api/auth/login` → JWT signé (HS256). Logout stateless (le client supprime le token). |
| Transport du token | ✅ Implémenté | Le JWT est renvoyé dans le **corps JSON**. Le frontend le stocke en mémoire (Zustand + `localStorage`) et l'envoie via l'en-tête `Authorization: Bearer`. |
| Durée de vie | ✅ Implémenté | Configurable via `JWT_EXPIRES_IN` (défaut : 2 h). |
| Refresh token (cookie httpOnly) | 📋 Prévu | Ajout d'un refresh token stocké dans un **cookie `httpOnly`, `secure`, `sameSite=lax`** via `response.encryptedCookie()` d'AdonisJS. Un endpoint `POST /api/auth/refresh` émettra un nouveau access token. Cela réduit l'exposition du JWT principal. |

---

## 2. RBAC multi-tenant

### Modèle hiérarchique

```
Organisation → Utilisateur → Rôle → Permissions
```

Les rôles et permissions sont définis dans `shared/src/constants/permissions.ts` :

| Rôle | Permissions |
|------|-------------|
| **Owner** | Tout : CRUD fournisseurs, gestion utilisateurs, suppression org, risk policies, audit trail |
| **Admin** | CRUD fournisseurs, configuration risk policies, lecture audit trail |
| **Analyst** | Lecture fournisseurs, modification risk level, ajout notes |
| **Auditor** | Lecture seule sur tout, accès complet audit trail |

### Middleware d'autorisation granulaire

- **`auth_middleware.ts`** : vérifie le JWT, charge l'utilisateur, rejette si inactif.
- **`rbac_middleware.ts`** : vérifie que le rôle possède la permission requise pour la route.
- **`requireAccess` / `hasAccess`** (`helpers/access.ts`) : contrôle **permission + appartenance à l'organisation** (pas juste "est connecté", mais "a le droit sur cette ressource de cette organisation").

---

## 3. Isolation multi-tenant / Row-Level Security

L'isolation est assurée par **deux couches complémentaires** :

### Couche applicative (défense primaire)

- Toutes les requêtes SQL passent par des helpers (`scoped_query.ts`) qui ajoutent systématiquement `WHERE organization_id = :orgId`.
- Les contrôleurs appellent `requireAccess(auth, resourceOrgId, permission)` avant toute opération.
- La fonction `canAccessResource()` (shared) vérifie à la fois la permission et l'appartenance à l'organisation.

### Couche PostgreSQL — Row-Level Security (défense en profondeur)

- La migration `005_enable_rls.ts` active RLS sur les tables `suppliers`, `audit_logs`, `users`.
- Politique : `organization_id::text = current_setting('app.current_org_id', true)`.
- Le middleware `org_scope_middleware.ts` exécute `SET LOCAL app.current_org_id = '<org_id>'` à chaque requête HTTP.

**Pourquoi les deux ?**
- Le scoping applicatif est la **garantie principale** et fonctionne indépendamment du rôle PostgreSQL (y compris en dev avec le superuser `postgres`).
- Les policies RLS constituent un **filet de sécurité** supplémentaire en production (avec un rôle DB non-superuser), empêchant toute fuite même en cas de bug applicatif.
- En développement, le superuser PostgreSQL **bypass** les policies RLS ; l'isolation repose alors uniquement sur la couche applicative.

---

## 4. CSRF / XSS

### CSRF

- **Risque actuel faible** : le token JWT est transmis via l'en-tête `Authorization`, **pas** via un cookie. Les requêtes CSRF classiques (formulaire tiers) n'incluent pas cet en-tête.
- **Si refresh token cookie ajouté** : le cookie sera configuré avec `sameSite: 'lax'` (ou `'strict'`), ce qui bloque les requêtes cross-site. L'endpoint `/api/auth/refresh` ne sera utilisé que pour émettre un nouveau access token, sans effet de bord critique.

### XSS

- **React** échappe par défaut tout contenu injecté dans le DOM (pas d'utilisation de `dangerouslySetInnerHTML`).
- **Inputs** : toutes les entrées utilisateur sont validées côté backend via les validateurs AdonisJS (Vine).
- **Notes fournisseurs** : actuellement en **texte brut**. Si du Markdown est introduit à l'avenir, le rendu côté front utilisera une bibliothèque de sanitisation (ex. `DOMPurify` ou `rehype-sanitize`) pour éliminer les balises dangereuses avant injection dans le DOM.

---

## 5. Rate limiting

| Endpoint | État | Plan |
|----------|------|------|
| `POST /api/auth/login` | 📋 Prévu | Limiter à **5 tentatives / minute / IP** via le package `@adonisjs/limiter` ou un middleware custom. |
| Endpoints IA (si ajoutés) | 📋 Prévu | Limiter à **10 requêtes / minute / utilisateur** pour éviter l'abus de coûts API. |
| API générale | 📋 Prévu | Rate limit global de **100 requêtes / minute / utilisateur** comme filet de sécurité. |

> **Implémentation prévue** : utiliser le module `@adonisjs/limiter` avec Redis (les variables `REDIS_HOST` / `REDIS_PORT` sont déjà définies dans `start/env.ts`) ou un store en mémoire pour le développement.

---

## 6. Headers de sécurité

Les headers suivants doivent être configurés sur le backend ou le reverse proxy (Nginx, Caddy, etc.) :

| Header | Valeur recommandée | État |
|--------|-------------------|------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` | 📋 À configurer |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | 📋 À configurer (reverse proxy) |
| `X-Frame-Options` | `DENY` | 📋 À configurer |
| `X-Content-Type-Options` | `nosniff` | 📋 À configurer |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 📋 À configurer |

> **Plan** : ajouter un middleware AdonisJS global qui positionne ces headers sur chaque réponse, ou les configurer au niveau du reverse proxy en production.

---

## 7. Gestion des secrets

- **Variables d'environnement** : toutes les valeurs sensibles (`JWT_SECRET`, `DB_PASSWORD`, `APP_KEY`, futures clés API LLM) sont dans `.env` (**exclu de git** via `.gitignore`).
- **Validation au boot** : `backend/start/env.ts` utilise `Env.create()` avec un schéma strict. Si une variable obligatoire manque ou a un format invalide, **l'application refuse de démarrer** (fail-fast).
- **Aucun secret en dur** dans le code source.
- **En production** : les secrets doivent être injectés via les variables d'environnement du service d'hébergement (Docker secrets, Vault, variables CI/CD), jamais copiés dans l'image.

---

## 8. Audit des dépendances

| Mesure | État |
|--------|------|
| `npm audit` local | ✅ Disponible (`pnpm audit`) |
| `npm audit` dans la CI | ✅ `pnpm audit --audit-level=high --prod` en étape bloquante. L'option `--prod` limite l'audit aux dépendances de production
| Politique de mise à jour | 📋 Les dépendances critiques (framework, auth) sont mises à jour en priorité. Les vulnérabilités `high` / `critical` sont traitées sous 48 h. |
| Dependabot / Renovate | 📋 Prévu : activer les alertes automatiques de mise à jour des dépendances sur le dépôt GitHub. |

---

## 9. Risk policies (état actuel)

La permission `RISK_POLICY_CONFIGURE` existe dans le modèle RBAC (attribuée à Owner et Admin), mais **aucune API de configuration de risk policies n'est encore exposée** (pas de route `/api/risk-policies`). Cette fonctionnalité est prévue pour une itération future. Les permissions sont en place pour que l'ajout de cette feature ne nécessite aucun changement au modèle d'autorisation.
