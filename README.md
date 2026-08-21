# Plateforme de Gestion Immobilière (SaaS Pro)

Plateforme web SaaS professionnelle de référence permettant aux propriétaires bailleurs et gestionnaires immobiliers de piloter l'intégralité de leur patrimoine : immeubles, logements, locataires, baux, facturation des loyers, encaissements et quittances, tickets d'intervention, charges déductibles, déclarations fiscales foncières, coffre-fort GED et rapports financiers 360°.

---

## Accès Rapide & Serveurs en Cours d'Exécution

Les serveurs de développement sont actuellement **lancés et prêts à l'emploi** :

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Interface utilisateur React 19 / Vite |
| **Backend REST API** | [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/) | API Django REST Framework |
| **Documentation API Swagger** | [http://localhost:8000/api/schema/swagger/](http://localhost:8000/api/schema/swagger/) | Documentation interactive OpenAPI / Swagger |
| **Documentation API Redoc** | [http://localhost:8000/api/schema/redoc/](http://localhost:8000/api/schema/redoc/) | Documentation Redoc |

---

## Comptes de Démonstration Pré-configurés

La base de données locale a été initialisée avec des données réalistes de patrimoine immobilier :

| Rôle | Email de Connexion | Mot de Passe | Périmètre & Droits |
| :--- | :--- | :--- | :--- |
| **Propriétaire Bailleur** | `demo@appli-imob.com` | `Password123!` | Accès total au patrimoine, finances, impôts et équipe |
| **Gestionnaire Opérationnel** | `gestionnaire@appli-imob.com` | `Password123!` | Gestion des baux, locataires, tickets de maintenance |
| **Comptable Dédié** | `comptable@appli-imob.com` | `Password123!` | Encaissements, factures, dépenses et bilans financiers |

---

## Commandes pour Relancer les Serveurs

### 1. Démarrer le Backend (Django)
```powershell
cd backend
.\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

### 2. Démarrer le Frontend (React / Vite)
```powershell
cd frontend
npm run dev
```

### 3. Réinitialiser les Données de Démo
```powershell
cd backend
python manage.py migrate
python manage.py seed_demo_data
```

### 4. Lancer les Tests Automatisés
```powershell
# Backend (65 tests unitaires et d'intégration)
cd backend
.\venv\Scripts\python.exe -m pytest

# Frontend (Build de production et validation TypeScript)
cd frontend
npm run build
```

---

## Architecture & Respect des Règles Fondamentales

- **Règle 4 (Services & Selectors)** : Séparation stricte entre les ViewSets, les Services métier transactionnels et les Selectors de lecture.
- **Règle 5 (Précision Financière)** : Manipulation exclusive en type `Decimal` avec quantification stricte à 2 décimales.
- **Règle 6 (Transactions Atomiques)** : Toutes les écritures financières s'exécutent sous `@transaction.atomic`.
- **Règle 7 (Soft-Delete & Audit)** : Préservation systématique de l'historique et traçabilité complète des actions.
- **Règle 8 (Isolation Multi-Propriétaires)** : Étanchéité totale des données par propriétaire effectif.
