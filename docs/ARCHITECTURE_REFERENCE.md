# DOCUMENT DE RÉFÉRENCE TECHNIQUE
## Architecture Générale & Fondations du Projet

**Projet :** Plateforme de Gestion Immobilière  
**Version :** 1.0  
**Type :** Application Web professionnelle (SaaS)  
**Backend :** Django + Django REST Framework + Services/Selectors  
**Frontend :** React 19 + TypeScript + Vite + Tailwind CSS  
**Base de données :** PostgreSQL  
**Architecture :** API REST + SPA  
**Déploiement :** Docker + Nginx + HTTPS  

---

## 1. Objet du document

Ce document définit l'architecture technique de référence de la plateforme de gestion immobilière.

Il s'adresse principalement :
- aux développeurs backend ;
- aux développeurs frontend ;
- aux développeurs juniors ;
- aux développeurs seniors/lead ;
- au responsable technique ;
- au chef de projet.

Il constitue la règle commune de développement.

Un développeur qui rejoint le projet doit pouvoir lire ce document et comprendre :
> « Comment le projet est organisé et comment dois-je développer une nouvelle fonctionnalité ? »

---

## 2. Présentation du projet

La plateforme permet à un propriétaire immobilier de gérer l'ensemble de son patrimoine depuis une interface unique.

Le système permettra notamment de gérer :
- Immeubles
- Logements
- Locataires
- Contrats
- Loyers
- Paiements
- Cautions
- Réparations
- Fournisseurs
- Dépenses
- Impôts
- Documents
- Rapports
- Utilisateurs

L'application devra être :
- sécurisée ;
- fiable ;
- maintenable ;
- évolutive ;
- performante ;
- responsive ;
- adaptée à une utilisation professionnelle.

---

## 3. Objectif architectural

Notre objectif n'est pas simplement :
> « Faire fonctionner Django et React. »

L'objectif est de construire une plateforme capable d'évoluer :
- Aujourd'hui : 1 propriétaire, 10 immeubles, 100 logements
- Demain : plusieurs propriétaires, centaines d'immeubles, milliers de logements

L'architecture doit donc éviter les choix qui fonctionneraient uniquement pour une petite quantité de données.

---

## 4. Architecture générale

L'application est organisée en quatre grandes couches :

```
┌──────────────────────────────────────────┐
│              UTILISATEURS                │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│                FRONTEND                  │
│          React + TypeScript              │
└────────────────────┬─────────────────────┘
                     │
                 HTTPS / REST
                     │
                     ▼
┌──────────────────────────────────────────┐
│                BACKEND                   │
│       Django + Django REST Framework     │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│               DONNÉES                    │
│              PostgreSQL                  │
└──────────────────────────────────────────┘

Services complémentaires :
                 ┌──────────────┐
                 │    Redis     │
                 └──────┬───────┘
                        │
                     Celery
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
           Email       SMS       Reports
```

---

## 5. Stack technique officielle

### 5.1 Frontend
| Technologie | Utilisation |
|---|---|
| React 19 | Interface utilisateur |
| TypeScript | Typage statique strict |
| Vite | Build et développement rapide |
| React Router | Navigation SPA |
| TanStack Query | Communication avec API / Cache / Optimistic UI |
| React Hook Form | Gestion performante des formulaires |
| Zod | Validation des schémas frontend |
| Tailwind CSS | Styling utilitaire & Design System |
| Lucide React | Iconographie vectorielle moderne |

### 5.2 Backend
| Technologie | Utilisation |
|---|---|
| Python 3.12+ | Langage serveur |
| Django 5.x | Framework web robuste |
| Django REST Framework | API RESTful |
| PostgreSQL | Base de données relationnelle |
| Celery | Tâches asynchrones (PDF, Email, SMS) |
| Redis | Broker Celery & Cache |
| Gunicorn | Serveur applicatif WSGI |
| Nginx | Reverse proxy & serveur de fichiers statiques |

---

## 6. Architecture Frontend

### Structure officielle :
```
frontend/
│
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── config/
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── charts/
│   │   ├── modals/
│   │   └── layout/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── properties/
│   │   ├── units/
│   │   ├── tenants/
│   │   ├── leases/
│   │   ├── billing/
│   │   ├── payments/
│   │   ├── maintenance/
│   │   ├── suppliers/
│   │   ├── expenses/
│   │   ├── taxes/
│   │   ├── documents/
│   │   ├── reports/
│   │   └── administration/
│   │
│   ├── services/
│   │   ├── api/
│   │   └── auth/
│   │
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   │
│   ├── App.tsx
│   └── main.tsx
```

### Règle `components/` vs `features/`
- `components/` : composants génériques et réutilisables (`Button`, `Input`, `Select`, `Modal`, `Table`, `Badge`, `Card`, `Pagination`, `Toast`). Un composant générique **ne doit pas** connaître le métier.
- `features/` : modules métier autonomes contenant leurs propres `api/`, `components/`, `hooks/`, `pages/`, `types.ts` et `validation.ts`.

---

## 7. Architecture Backend

### Structure officielle :
```
backend/
│
├── manage.py
│
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   ├── production.py
│   │   └── testing.py
│   │
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
│   └── celery.py
│
├── apps/
│   ├── accounts/
│   ├── properties/
│   ├── tenants/
│   ├── leases/
│   ├── billing/
│   ├── payments/
│   ├── maintenance/
│   ├── expenses/
│   ├── taxes/
│   ├── documents/
│   ├── notifications/
│   ├── reports/
│   └── audit/
│
├── common/
│   ├── models.py
│   ├── exceptions.py
│   ├── exception_handler.py
│   ├── permissions.py
│   ├── pagination.py
│   └── utils/
│
└── tests/
```

### Règle fondamentale Backend
Chaque application Django représente un domaine métier.
- `models.py` : Décrit les données.
- `serializers.py` : Valide et transforme les données API.
- `views.py` : Reçoit les requêtes HTTP, orchestre avec les services, reste très légère.
- `services/` : Contient la logique métier complexe et les opérations transactionnelles.
- `selectors/` : Contient les requêtes complexes de lecture et agrégations.

Flux canonique :
```
View  ──►  Serializer  ──►  Service  ──►  Models  ──►  Task (Celery)
```

---

## 8. Architecture de la Base de Données & Relations

```
OWNER
 │
 ├──────── PROPERTY
 │             │
 │             └──── UNIT
 │                    │
 │                    └──── LEASE
 │                           │
 │                           └──── TENANT
 │
 ├──────── EXPENSE
 │
 ├──────── TAX
 │
 └──────── DOCUMENT

Finance :
LEASE ──► RENT INVOICE ──► PAYMENT ──► PAYMENT ALLOCATION
```

### Pourquoi `PaymentAllocation` ?
Pour tracer précisément l'affectation de chaque montant perçu à chaque échéance mensuelle et fiabiliser les rapports financiers et quittances.

---

## 9. Les 12 Règles Obligatoires pour les Développeurs

1. **Règle 1 :** Ne jamais mettre de mot de passe ou clé secrète dans Git.
2. **Règle 2 :** Ne jamais faire confiance aux données du frontend (validation backend systématique).
3. **Règle 3 :** Toute permission doit être vérifiée côté backend.
4. **Règle 4 :** Ne jamais mettre une grosse logique métier dans une View (utiliser les Services).
5. **Règle 5 :** Les montants financiers utilisent impérativement `Decimal` (jamais de `float`).
6. **Règle 6 :** Les opérations financières importantes utilisent des transactions atomiques (`transaction.atomic`).
7. **Règle 7 :** Ne pas supprimer aveuglément les données historiques (préférer les statuts `CANCELLED`, `ARCHIVED`, `is_active=False`).
8. **Règle 8 :** Les requêtes doivent respecter l'isolation du propriétaire (`owner`).
9. **Règle 9 :** Les fichiers sensibles doivent être protégés avec accès contrôlé.
10. **Règle 10 :** Toute fonctionnalité importante doit avoir des tests automatisés.
11. **Règle 11 :** Le frontend et le backend doivent respecter le contrat d'API normalisé.
12. **Règle 12 :** Aucun développeur ne déploie directement en production sans validation CI/CD.

---

## 10. Ordre Officiel de Développement

- **PHASE 0 :** Architecture + environnement (Socle complet)
- **PHASE 1 :** Authentication + utilisateurs + rôles
- **PHASE 2 :** Immeubles + logements
- **PHASE 3 :** Locataires
- **PHASE 4 :** Contrats + cautions
- **PHASE 5 :** Loyers + échéances
- **PHASE 6 :** Paiements + quittances
- **PHASE 7 :** Maintenance + fournisseurs
- **PHASE 8 :** Dépenses
- **PHASE 9 :** Impôts
- **PHASE 10 :** Documents
- **PHASE 11 :** Dashboard

---

## 11. Format Standard des Réponses d'Erreur API

```json
{
  "success": false,
  "error": {
    "code": "LEASE_ALREADY_ACTIVE",
    "message": "Ce logement possède déjà un contrat actif.",
    "details": {}
  }
}
```

Format de succès :
```json
{
  "success": true,
  "data": { ... },
  "message": "Opération effectuée avec succès"
}
```
