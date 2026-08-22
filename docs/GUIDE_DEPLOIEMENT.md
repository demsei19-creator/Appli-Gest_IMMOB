# Guide Complet de Déploiement Gratuit (Production Cloud)

Ce guide détaille pas-à-pas la mise en production gratuite de la **Plateforme de Gestion Immobilière** :
- **Base de données** : [Neon.tech](https://neon.tech) *(PostgreSQL managé gratuit à vie)*
- **Backend API** : [Render.com](https://render.com) *(Web Service Python / Django gratuit)*
- **Frontend SPA** : [Vercel.com](https://vercel.com) *(Hébergement React / Vite ultra-rapide gratuit)*

---

## Sommaire
1. [Prérequis & Préparation Git](#1-prérequis--préparation-git)
2. [Étape 1 : Créer la Base de Données PostgreSQL sur Neon](#étape-1--créer-la-base-de-données-postgresql-sur-neon)
3. [Étape 2 : Déployer le Backend Django sur Render](#étape-2--déployer-le-backend-django-sur-render)
4. [Étape 3 : Déployer le Frontend React sur Vercel](#étape-3--déployer-le-frontend-react-sur-vercel)
5. [Étape 4 : Lier le Frontend et le Backend (CORS & API URL)](#étape-4--lier-le-frontend-et-le-backend-cors--api-url)
6. [Comptes de Démonstration Disponibles](#comptes-de-démonstration-disponibles)
7. [Dépannage & Bonnes Pratiques](#dépannage--bonnes-pratiques)

---

## 1. Prérequis & Préparation Git

Vérifiez que vos modifications locales sont committées et poussées vers votre dépôt GitHub :

```bash
git add .
git commit -m "feat: configuration de déploiement cloud (Neon, Render, Vercel)"
git push origin main
```

---

## Étape 1 : Créer la Base de Données PostgreSQL sur Neon

1. Rendez-vous sur **[https://console.neon.tech](https://console.neon.tech)** et connectez-vous (via GitHub).
2. Cliquez sur **New Project** :
   - **Project Name** : `appli-imob-db`
   - **Region** : Choisissez l'Europe (ex: `Frankfurt (eu-central-1)`) ou la plus proche de vous.
   - **Postgres version** : `16` (recommandé).
3. Une fois créé, sur la page **Dashboard**, copiez votre **Connection String** :
   ```text
   postgresql://neondb_owner:VOTRE_MOT_DE_PASSE@ep-xyz-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. *Conservez cette URL pour l'étape suivante.*

---

## Étape 2 : Déployer le Backend Django sur Render

1. Rendez-vous sur **[https://dashboard.render.com](https://dashboard.render.com)** et connectez votre compte GitHub.
2. Cliquez sur **New +** > **Web Service**.
3. Sélectionnez votre dépôt GitHub `Appli-Gest_IMMOB` (ou le nom de votre repo).
4. Remplissez les champs de configuration :
   - **Name** : `appli-imob-backend`
   - **Region** : Même région que Neon (ex: `Frankfurt`).
   - **Branch** : `main`
   - **Root Directory** : `backend`
   - **Runtime** : `Python 3`
   - **Build Command** : `./build.sh`
   - **Start Command** : `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2`
   - **Instance Type** : `Free`
5. Dans la section **Environment Variables**, ajoutez :

| Variable | Valeur | Description |
| :--- | :--- | :--- |
| `DJANGO_ENV` | `production` | Active les réglages de production |
| `DEBUG` | `False` | Sécurité Django en prod |
| `SECRET_KEY` | *(Cliquez sur Generate ou entrez une chaîne aléatoire de 50+ caractères)* | Clé de signature Django |
| `DATABASE_URL` | *(Collez votre chaîne de connexion Neon complète)* | Connexion PostgreSQL Neon |
| `ALLOWED_HOSTS` | `.onrender.com,localhost` | Noms d'hôtes autorisés |
| `CSRF_TRUSTED_ORIGINS` | `https://*.onrender.com,https://*.vercel.app` | Protection CSRF sur requêtes HTTPS |
| `CELERY_TASK_ALWAYS_EAGER` | `True` | Exécution synchrone (évite le besoin de Redis payant) |
| `SEED_DEMO_DATA` | `True` | Peuple automatiquement la base avec les données de démo |
| `CORS_ALLOWED_ORIGINS` | `https://votre-site.vercel.app` *(à mettre à jour à l'Étape 4)* | Origines frontend autorisées |

6. Cliquez sur **Create Web Service**.
7. Render va lancer le script `./build.sh` qui va :
   - Installer les dépendances (dont `dj-database-url`, `whitenoise`, `psycopg2`).
   - Collecter les fichiers statiques.
   - Appliquer toutes les migrations sur votre base Neon.
   - Créer les données de test et les utilisateurs de démo.
8. Une fois le déploiement terminé, copiez l'URL de votre API :
   `https://appli-imob-backend.onrender.com`

---

## Étape 3 : Déployer le Frontend React sur Vercel

1. Rendez-vous sur **[https://vercel.com](https://vercel.com)** et connectez-vous avec GitHub.
2. Cliquez sur **Add New...** > **Project** et sélectionnez votre dépôt.
3. Configurez les paramètres du projet :
   - **Framework Preset** : `Vite` (détecté automatiquement).
   - **Root Directory** : Cliquez sur **Edit** et sélectionnez le dossier `frontend`.
4. Dépliez la section **Environment Variables** et ajoutez :

| Variable | Valeur |
| :--- | :--- |
| `VITE_API_URL` | `https://appli-imob-backend.onrender.com/api/v1` *(remplacez par votre URL Render)* |

5. Cliquez sur **Deploy**.
6. En moins d'une minute, votre application est en ligne à une adresse du type :
   `https://appli-imob-frontend.vercel.app`

---

## Étape 4 : Lier le Frontend et le Backend (CORS & API URL)

1. Retournez sur votre tableau de bord **Render.com** sur le service `appli-imob-backend`.
2. Allez dans **Environment** et mettez à jour :
   - `CORS_ALLOWED_ORIGINS` : `https://appli-imob-frontend.vercel.app` *(l'URL exacte de votre Vercel)*
3. Cliquez sur **Save Changes** (Render redéploiera en quelques secondes).

---

## Comptes de Démonstration Disponibles

Dès que le backend est déployé avec `SEED_DEMO_DATA=True`, vous pouvez vous connecter immédiatement sur votre frontend Vercel avec :

| Rôle | Email | Mot de passe |
| :--- | :--- | :--- |
| **Propriétaire Bailleur** | `demo@appli-imob.com` | `Password123!` |
| **Gestionnaire Opérationnel** | `gestionnaire@appli-imob.com` | `Password123!` |
| **Comptable Dédié** | `comptable@appli-imob.com` | `Password123!` |

---

## Dépannage & Bonnes Pratiques

### 1. Temps de réveil de Render (Plan Gratuit)
Sur le plan gratuit de Render, le serveur s'endort après 15 minutes sans requête. La première requête après une période d'inactivité peut mettre 30 à 45 secondes à répondre (le temps du démarrage du container). Les requêtes suivantes sont instantanées.

### 2. Erreur CORS (`Cross-Origin Request Blocked`)
Vérifiez que la variable `CORS_ALLOWED_ORIGINS` sur Render contient exactement l'URL fournie par Vercel (sans slash `/` à la fin, exemple : `https://mon-app.vercel.app`).

### 3. Rechargement de page 404 sur Vercel
Le fichier `frontend/vercel.json` a été configuré avec une règle de réécriture automatique vers `index.html`, ce qui permet à React Router de gérer les routes profondes (ex: `/properties/1`, `/tenants`) sans erreur 404.
