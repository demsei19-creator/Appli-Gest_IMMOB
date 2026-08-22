# 📘 Manuel & Guide Utilisateur Complet - ImmoGestion Pro

Bienvenue dans le guide d'utilisation officiel d'**ImmoGestion Pro**, la plateforme SaaS professionnelle de référence pour le pilotage et la gestion intégrale de patrimoine immobilier.

---

## 📑 Sommaire
1. [Prise en Main & Authentification](#1-prise-en-main--authentification)
2. [Tableau de Bord Exécutif (Pilotage 360°)](#2-tableau-de-bord-exécutif-pilotage-360)
3. [Gestion du Patrimoine (Immeubles & Logements)](#3-gestion-du-patrimoine-immeubles--logements)
4. [Gestion Locative (Locataires & Baux)](#4-gestion-locative-locataires--baux)
5. [Finances (Avis d'Échéance, Encaissements & Quittances)](#5-finances-avis-déchéance-encaissements--quittances)
6. [Dépenses & Simulateur Fiscal (Déclaration 2044)](#6-dépenses--simulateur-fiscal-déclaration-2044)
7. [Maintenance, Fournisseurs & Coffre-fort GED](#7-maintenance-fournisseurs--coffre-fort-ged)
8. [Administration, Gestion d'Équipe & Piste d'Audit](#8-administration-gestion-déquipe--piste-daudit)
9. [FAQ & Astuces au Quotidien](#9-faq--astuces-au-quotidien)

---

## 1. Prise en Main & Authentification

### A. Connexion à la Plateforme
1. Rendez-vous sur l'adresse de votre application (ex: `https://appli-gest-immob.vercel.app`).
2. **Méthode 1 - Connexion avec Google** : Cliquez sur le bouton **Continuer avec Google** pour vous authentifier en un clic avec votre compte Google.
3. **Méthode 2 - Connexion avec Email & Mot de passe** : Saisissez votre adresse email et votre mot de passe.
4. 👁️ **Afficher/Masquer le mot de passe** : Cliquez sur l'icône en forme d'œil à droite du champ pour vérifier votre saisie sans erreur.
5. Cliquez sur **Se Connecter**.

### B. Mot de Passe Oublié & Réinitialisation
1. Si vous avez égaré votre mot de passe, cliquez sur le lien **Mot de passe oublié ?** sur la page de connexion.
2. Entrez l'adresse email associée à votre compte et cliquez sur **Envoyer le lien de réinitialisation**.
3. Cliquez sur le lien sécurisé reçu par email (ou affiché à l'écran) pour accéder à la page **Nouveau mot de passe** (`/reset-password`).
4. Saisissez votre nouveau mot de passe (au moins 8 caractères) avec confirmation, puis validez. Vous pouvez alors vous reconnecter immédiatement.

### C. Navigation sur Ordinateur & Smartphone
- **Sur Ordinateur (Desktop)** : La barre latérale à gauche vous donne accès direct à tous les modules métiers.
- **Sur Smartphone & Tablette (Mobile)** : Cliquez sur le bouton **Menu (☰)** en haut à gauche pour faire apparaître le tiroir de navigation fluide. Cliquez sur n'importe quel lien pour naviguer, le menu se referme automatiquement.

### D. Comptes de Démonstration Disponibles
| Rôle | Email | Mot de passe | Périmètre |
| :--- | :--- | :--- | :--- |
| **Propriétaire Bailleur** | `demo@appli-imob.com` | `Password123!` | Accès total 360°, finances, fiscalité, gestion d'équipe et audit |
| **Gestionnaire Opérationnel** | `gestionnaire@appli-imob.com` | `Password123!` | Gestion des logements, des locataires, des baux et des dépannages |
| **Comptable Dédié** | `comptable@appli-imob.com` | `Password123!` | Émission des avis, encaissement des loyers, quittances et fiscalité |

---

## 2. Tableau de Bord Exécutif (Pilotage 360°)

Le tableau de bord (`/dashboard`) est votre cockpit de pilotage quotidien. Il synthétise l'état de santé de votre patrimoine en temps réel :

```
┌───────────────────────────┬───────────────────────────┬───────────────────────────┬───────────────────────────┐
│     LOYERS ENCAISSÉS      │     IMPAYÉS & RETARDS     │    TAUX D'OCCUPATION      │    RÉSULTAT NET (NOI)     │
│       3 450 000 FCFA      │        450 000 FCFA       │          91.7%            │       2 890 000 FCFA      │
│     (88.5% recouvrement)  │    (Sur factures émises)  │    (11 occupés / 1 libre) │     (Loyers - Charges)    │
└───────────────────────────┴───────────────────────────┴───────────────────────────┴───────────────────────────┘
```

### 1. Les 4 Indicateurs Stratégiques :
- **Loyers Encaissés** : Montant total net effectivement perçu sur le mois en cours, accompagné du taux de recouvrement.
- **Impayés & Retards** : Somme des loyers échus non encore réglés (apparaît en rouge d'alerte).
- **Taux d'Occupation** : Pourcentage de logements actuellement sous bail actif (occupés vs vacants).
- **Résultat Net d'Exploitation (NOI)** : Trésorerie nette générée après déduction des charges d'exploitation décaissées.

### 2. Graphique d'Évolution Mensuelle :
Le diagramme comparatif sur 6 mois met en regard les **Loyers perçus** (barres vertes) et les **Dépenses d'exploitation** (barres rouges) pour visualiser la trajectoire de votre cashflow.

---

## 3. Gestion du Patrimoine (Immeubles & Logements)

### A. Ajouter un Ensemble Immobilier / Immeuble (`/properties`)
1. Cliquez sur **Ajouter un Immeuble**.
2. Renseignez :
   - **Nom de l'immeuble** (ex: *Résidence Les Jardins d'Angré*)
   - **Type de bien** (*Immeuble, Résidence, Local commercial, Villa*)
   - **Adresse, Ville & Pays** (ex: *Abidjan, Côte d'Ivoire*)
   - **Valeur d'acquisition & Valeur estimée actuelle** (pour le calcul de rentabilité).
3. Cliquez sur **Enregistrer**.

### B. Ajouter et Ventiler les Logements (Lots) (`/units`)
1. Rendez-vous sur la fiche d'un immeuble ou dans le menu **Logements & Lots**.
2. Cliquez sur **Nouveau Logement / Lot** :
   - **Numéro / Référence du lot** (ex: *Appartement A12 - 2ème étage*)
   - **Type de lot** (*Studio, 2 Pièces, 3 Pièces, Duplex, Bureau*)
   - **Surface habitable ($m^2$)** et nombre de pièces.
   - **Loyer mensuel hors charges** et **Provisions pour charges**.
3. Le lot est initialement créé au statut **`VACANT` (Libre)**.

---

## 4. Gestion Locative (Locataires & Baux)

### A. Créer un Dossier Locataire (`/tenants`)
1. Allez dans le menu **Locataires** et cliquez sur **Nouveau Locataire**.
2. Renseignez :
   - **Identité** : Nom, Prénom, Email, Téléphone, Profession.
   - **Pièce d'identité** : Numéro CNI/Passeport.
   - **Évaluation de Solvabilité** : *Excellent, Bon, Moyen, Risque Élevé* (selon dossier).
   - **Garant / Cautionnaire** : Coordonnées de la personne garante.
3. Cliquez sur **Créer le Locataire**.

### B. Rédiger et Activer un Contrat de Bail (`/leases`)
1. Allez dans **Contrats de bail** > **Créer un Contrat de Bail**.
2. Sélectionnez :
   - Le **Logement** (choisi parmi les lots vacants).
   - Le **Locataire principal**.
   - La **Date de début** et la **Date de fin** du bail (ex: bail de 1 an renouvelable).
   - Le **Dépôt de garantie** (caution versée à l'entrée).
   - Le **Jour d'échéance mensuel** (ex: le 5 de chaque mois).
3. Cliquez sur **Valider le Bail** :
   - 👉 Le logement passe automatiquement au statut **`OCCUPIED` (Occupé)**.
   - 👉 Le bail génère automatiquement les échéances mensuelles.

---

## 5. Finances (Avis d'Échéance, Encaissements & Quittances)

### A. Suivi des Avis d'Échéance (`/billing`)
Chaque mois, la plateforme génère automatiquement les avis de loyer :
- **Statut `PENDING` (En attente)** : Avis émis, loyer en attente de paiement avant la date limite.
- **Statut `PAID` (Payé)** : Loyer entièrement réglé.
- **Statut `OVERDUE` (En retard)** : Date limite dépassée sans règlement complet.

### B. Enregistrer un Encaissement (`/payments`)
1. Cliquez sur **Encaisser Loyer** (depuis le Dashboard, la page Factures ou Paiements).
2. Sélectionnez la facture de loyer concernée.
3. Renseignez :
   - **Montant encaissé** (règlement total ou partiel).
   - **Date d'encaissement**.
   - **Moyen de paiement** (*Virement bancaire, Espèces, Chèque, Mobile Money*).
   - **Référence de transaction** (ex: *VIR-2026-08-9921*).
4. Cliquez sur **Valider l'Encaissement**.

### C. Imprimer / Télécharger la Quittance Officielle
1. Dès le paiement validé, cliquez sur **Voir la Quittance** (`/payments/{id}/receipt`).
2. Une quittance officielle conforme et numérotée s'affiche avec le récapitulatif loyer/charges.
3. Cliquez sur le bouton **Imprimer la Quittance** pour la remettre au locataire ou l'exporter en PDF.

---

## 6. Dépenses & Simulateur Fiscal (Déclaration 2044)

### A. Saisie des Dépenses Déductibles (`/expenses`)
1. Dans le menu **Dépenses & Charges**, cliquez sur **Nouvelle Dépense**.
2. Renseignez :
   - **Immeuble / Logement concerné**.
   - **Catégorie Fiscale** (*Travaux d'entretien, Prime d'assurance, Taxe foncière, Charges de copropriété, Honoraires de gestion*).
   - **Montant TTC** et **Date de décaissement**.
   - **Fournisseur / Artisan** ayant réalisé la prestation.
3. Cliquez sur **Enregistrer**.

### B. Simulateur Fiscal & Déclaration 2044 (`/taxes`)
1. Rendez-vous dans **Impôts & Fiscalité**.
2. Choisissez l'**Année Fiscale** souhaitée (ex: `2026`).
3. Le simulateur compare instantanément :
   - **Régime Réel (Déclaration 2044)** : `Total Revenus Bruts - 100% Charges Déductibles Réelles = Revenu Foncier Net Imposable`.
   - **Régime Micro-Foncier** : `Total Revenus Bruts - Abattement Forfaitaire de 30%`.
4. Visualisez le régime le plus avantageux et exportez le récapitulatif pour votre déclaration d'impôts.

---

## 7. Maintenance, Fournisseurs & Coffre-fort GED

### A. Suivi des Tickets de Maintenance (`/maintenance`)
1. Cliquez sur **Nouveau Ticket**.
2. Décrivez le problème constaté (*Fuite d'eau, Panne de disjoncteur, Serrure défectueuse*).
3. Définissez le niveau d'urgence (*Faible, Moyenne, Haute, Urgence Absolue*).
4. Assignez le ticket à un prestataire de votre carnet **Fournisseurs**.
5. Suivez l'évolution du statut : `SUBMITTED` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `RESOLVED`.

### B. Coffre-fort GED (`/documents`)
Stockez et classez en toute sécurité les documents de votre patrimoine :
- Contrats de bail signés, états des lieux d'entrée/sortie.
- Titres de propriété, diagnostics techniques (DPE, amiante, électricité).
- Factures d'artisans et justificatifs fiscaux.

---

## 8. Administration, Gestion d'Équipe & Piste d'Audit

*(Accessible exclusivement au rôle Propriétaire Bailleur)*

### A. Inviter un Collaborateur (`/admin/team`)
1. Allez dans **Équipe & Collaborateurs** > **Inviter un Collaborateur**.
2. Renseignez le Nom, Prénom, Email et définissez son rôle :
   - **Gestionnaire** : Pour gérer les baux, logements, locataires et tickets.
   - **Comptable** : Pour gérer les encaissements, factures, dépenses et fiscalité.
3. Définissez un mot de passe provisoire.
4. Cliquez sur **Créer le compte**. Le collaborateur peut se connecter immédiatement.

### B. Suspendre ou Réactiver un Accès
- Dans la liste des membres d'équipe, cliquez sur le bouton d'action pour **Désactiver** un compte en cas de départ. L'accès est révoqué instantanément.

### C. Piste d'Audit & Journal de Sécurité (`/admin/audit`)
- Consultez l'historique complet et inaltérable de chaque événement survenu sur la plateforme : qui s'est connecté, quelle facture a été modifiée, quel encaissement a été saisi, avec horodatage et adresse IP.

---

## 9. FAQ & Astuces au Quotidien

### ❓ Que faire si un locataire paie son loyer en plusieurs fois ?
> Vous pouvez enregistrer plusieurs encaissements partiels successifs sur la même facture. Le système calcule automatiquement le solde restant dû et passera la facture en `PAID` uniquement lorsque la totalité aura été versée.

### ❓ Comment résilier un bail lorsqu'un locataire quitte son logement ?
> Allez sur la fiche du contrat de bail (`/leases/{id}`) et cliquez sur **Résilier le bail**. Renseignez la date de fin effective et l'état des lieux. Le logement redevient immédiatement `VACANT` pour être proposé à un nouveau locataire.

### ❓ Comment modifier mon mot de passe personnel ?
> Cliquez sur votre avatar en haut à droite > **Mon Profil** (`/profile`). Dans la section *Sécurité & Mot de passe*, saisissez votre mot de passe actuel et votre nouveau mot de passe (avec le bouton pour afficher/masquer la saisie).

---

✨ *Pour toute question technique supplémentaire ou évolution de fonctionnalités, contactez l'administrateur de votre plateforme.*
