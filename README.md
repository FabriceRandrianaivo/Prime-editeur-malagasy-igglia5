# Éditeur de Texte Augmenté par l'IA pour le Malagasy

> Projet de Machine Learning — ISPM M2 S1
> Thème : Traitement d'une langue à faibles ressources (*Low Resource Language*)

---

## Membres du groupe & Rôles

| Membre | Rôle |
|--------|------|
| [RANDRIANAIVO Tolotra Lalaina Fabrice ] | Architecture backend, API FastAPI, modules NLP (spell checker, lemmatiseur) |
| [ANDRIAMANRONIRINA Harifitia Nicole] | Frontend React/Vite, design UX, intégration des composants |
| [ANDRIANARISOA Ny Anjara Jemima] | Corpus & données malagasy, scraping, modules sentiment et NER |

---

## Lancement de l'application

### Prérequis
- Python 3.10+
- Node.js 18+
- Une clé API Anthropic (pour le chatbot)

### Backend

```bash
cd backend
pip install -r requirements.txt

# Créer le fichier d'environnement
echo "ANTHROPIC_API_KEY=sk-ant-votre-clé-ici" > .env

# Lancer le serveur (port 8080)
uvicorn main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application est accessible sur **http://localhost:5173**

---

## Fonctionnalités IA

### 1. Correcteur Orthographique
**Technologie :** Distance de Levenshtein via `rapidfuzz`

**Approche :** Comparaison de chaque mot du texte avec le dictionnaire de 600+ mots malagasy. La fonction `process.extract` de rapidfuzz calcule un score de similarité et retourne les 5 meilleures suggestions si le score dépasse 50%.

**Endpoint :** `POST /spell/check`

---

### 2. Validation Phonotactique
**Technologie :** Automates / REGEX

**Approche :** Détection des combinaisons de lettres structurellement impossibles en malagasy par expressions régulières. Patterns vérifiés : `nb`, `mk`, `nk` (en début de mot), `dt`, `bp`, `sz`. Ces suites consonantiques violent la phonologie malagasy.

**Endpoint :** intégré dans `POST /spell/check` (type `phonotactic`)

---

### 3. Lemmatiseur (Fandrasan-teny)
**Technologie :** Règles morphologiques symboliques

**Approche :** Décomposition des mots en **préfixe + racine + suffixe** selon les règles de morphologie malagasy. Le module identifie les préfixes verbaux (`mi-`, `ma-`, `man-`, `mam-`, `maha-`, `mpan-`, `fi-`, `fan-`...) et les suffixes (`-ana`, `-ina`, `-na`, `-ka`, `-tra`). La voix grammaticale (active, objective, locative, nominalization) est déduite du préfixe.

**Endpoint :** `POST /lemma`

---

### 4. Autocomplétion N-gram
**Technologie :** Modèles de Markov (bigrammes + trigrammes)

**Approche :** Entraînement sur le corpus malagasy (Wikipedia MG). Les bigrammes prédisent le mot suivant le plus probable ; les trigrammes affinent la prédiction avec le contexte des deux derniers mots (priorité plus haute). La complétion de mot partiel utilise les unigrammes triés par fréquence. L'interface affiche des suggestions après 2 caractères tapés.

**Endpoint :** `POST /autocomplete`

---

### 5. Traducteur Mot-à-Mot (clic droit)
**Technologie :** Dictionnaire local + scraping en cascade

**Approche en 4 niveaux :**
1. Dictionnaire statique intégré (160 mots courants MG→FR)
2. Dictionnaire scrapé depuis `tenymalagasy.org` (JSON local)
3. Scraping en temps réel sur `tenymalagasy.org`
4. API Wikipedia MG (extraits d'articles comme fallback)

**Endpoint :** `POST /translate` (accessible via clic droit sur n'importe quel mot)

---

### 6. Analyse de Sentiment
**Technologie :** Bag of Words (approche lexicale)

**Approche :** Classification Positif/Négatif/Neutre par comptage des mots-clés dans deux lexiques annotés (mots positifs et négatifs en malagasy). Le score de confiance est calculé comme `|nb_positif - nb_négatif| / nb_total_mots`. L'interface affiche un graphe de confiance et les mots détectés.

**Endpoint :** `POST /sentiment`

---

### 7. Synthèse Vocale (TTS)
**Technologie :** `gTTS` (Google Text-to-Speech)

**Approche :** Conversion du texte en audio MP3 via l'API gTTS avec la langue `mg` (malagasy). L'audio est encodé en base64 et renvoyé au frontend pour lecture directe dans le navigateur (bouton "Écouter").

**Endpoint :** `POST /tts`

---

### 8. Reconnaissance d'Entités Nommées (NER)
**Technologie :** Règles + listes d'entités nommées

**Approche :** Lookup sur des listes de villes, régions, personnalités et organisations malagasy (fichier `entities.json`). La reconnaissance est multi-mots (jusqu'à 3 mots consécutifs pour les noms composés). Les mots capitalisés non identifiés sont signalés comme `ENTITE_INCONNUE`.

**Types détectés :** VILLE, REGION, PERSONNE, ORGANISATION, ENTITE_INCONNUE

**Endpoint :** `POST /ner`

---

### 9. Chatbot Assistant Linguistique
**Technologie :** Claude Haiku 4.5 (Anthropic API)

**Approche :** Modèle LLM avec un prompt système spécialisé en linguistique malagasy. L'assistant répond aux questions sur les conjugaisons, synonymes, règles grammaticales (ordre VSO), préfixes/suffixes, et explications culturelles. L'historique de conversation est maintenu. Un bouton "Demander à l'assistant" sur le clic droit envoie directement un mot pour explication.

**Endpoint :** `POST /chat`

---

### 10. Scraper & Enrichissement du Corpus
**Technologie :** `requests` + `BeautifulSoup4`

**Approche :** Scraping de `tenymalagasy.org` par plages alphabétiques pour enrichir le dictionnaire et les traductions. Récupération d'articles aléatoires de Wikipedia Malagasy via l'API MediaWiki pour enrichir le corpus d'entraînement des N-grams. Le rechargement des modèles est possible à chaud.

**Endpoints :** `POST /scrape/dictionary`, `POST /scrape/wiki`, `POST /reload`

---

## Architecture Technique

```
Prime-editeur-malagasy/
├── backend/
│   ├── main.py                    # API FastAPI — 15 endpoints REST
│   ├── .env                       # Variables d'environnement (ANTHROPIC_API_KEY)
│   ├── requirements.txt           # Dépendances Python
│   ├── modules/
│   │   ├── spell_checker.py       # Correcteur orthographique + phonotactique
│   │   ├── lemmatizer.py          # Lemmatiseur par règles morphologiques
│   │   ├── autocomplete.py        # Autocomplétion N-gram (bi/trigrammes)
│   │   ├── translator.py          # Traducteur MG→FR/EN multi-sources
│   │   ├── sentiment.py           # Analyse de sentiment Bag of Words
│   │   ├── tts.py                 # Synthèse vocale gTTS
│   │   ├── ner.py                 # Reconnaissance d'entités nommées
│   │   ├── chatbot.py             # Chatbot Claude Haiku
│   │   └── scraper.py             # Scraper tenymalagasy.org + Wikipedia MG
│   └── data/
│       ├── dictionary.txt         # Dictionnaire malagasy (600+ mots)
│       ├── corpus.txt             # Corpus malagasy (articles Wikipedia MG)
│       ├── translations.json      # Traductions scrapées MG→FR/EN
│       ├── sentiment_positive.txt # Lexique de mots positifs
│       ├── sentiment_negative.txt # Lexique de mots négatifs
│       └── entities.json          # Entités nommées (villes, régions, personnes)
└── frontend/
    ├── src/
    │   ├── App.jsx                # Application React principale (9 composants)
    │   ├── App.css                # Feuille de styles
    │   └── services/api.js        # Client Axios — appels API backend
    ├── package.json
    └── vite.config.js
```

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Statut de l'API |
| POST | `/spell/check` | Correction orthographique + phonotactique |
| POST | `/spell/suggest` | Suggestions pour un mot |
| POST | `/lemma` | Lemmatisation + fandrasan-teny |
| POST | `/autocomplete` | Autocomplétion N-gram |
| POST | `/translate` | Traduction mot-à-mot |
| POST | `/sentiment` | Analyse de sentiment |
| POST | `/tts` | Synthèse vocale (base64 MP3) |
| POST | `/ner` | Reconnaissance d'entités |
| POST | `/chat` | Chatbot linguistique |
| POST | `/scrape/dictionary` | Enrichissement dictionnaire (tenymalagasy.org) |
| POST | `/scrape/wiki` | Enrichissement corpus (Wikipedia MG) |
| GET | `/scrape/status` | Statistiques dictionnaire/traductions |
| POST | `/reload` | Rechargement de tous les modules |
| POST | `/analyze/full` | Analyse complète en une requête |

### Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend | Python, FastAPI, Uvicorn | 3.10 / 0.110 / 0.29 |
| NLP | rapidfuzz, nltk, BeautifulSoup4 | 3.6 / 3.8 / 4.12 |
| IA générative | Anthropic SDK (Claude Haiku 4.5) | >=0.40 |
| TTS | gTTS | 2.5 |
| Frontend | React, Vite, ReactQuill | 18 / 5 / 2.0 |
| UI | lucide-react, CSS custom | — |
| HTTP | Axios | — |

---

## Sources de Données

### Corpus linguistique

| Source | URL | Intérêt |
|--------|-----|---------|
| Wikipedia Malagasy | `mg.wikipedia.org` | ~90 000 articles, langue moderne. API MediaWiki pour corpus N-gram et traductions. |
| tenymalagasy.org | `tenymalagasy.org` | Dictionnaire malagasy avec traductions FR/EN. Scrapé par plages alphabétiques. |
| Bible malagasy | Domaine public | Corpus de phrases longues et cohérentes pour l'entraînement des N-grams. |

### Données intégrées et annotées manuellement
- **Dictionnaire statique** : 160 mots malagasy courants avec traductions FR
- **Lexique de sentiment positif** : liste de mots malagasy à connotation positive
- **Lexique de sentiment négatif** : liste de mots malagasy à connotation négative
- **Entités nommées** : villes, régions, personnalités et organisations de Madagascar

---

## Bibliographie

### Articles scientifiques
- Kelley, A., Bender, E. M. et al. (2018). *Low Resource Language Technology: The Case of Malagasy*. LREC.
- Adelani, D. I. et al. (2021). *MasakhaNER: Named Entity Recognition for African Languages*. EMNLP.
- Magueresse, A., Viguier, M., Valverde, T. (2020). *Unsupervised Cross-lingual Representation Learning for Low-Resource Languages*. ACL.

### Ressources linguistiques malagasy
- Rasolofoson, C. (2015). *Grammaire malagasy — Structure VSO et fandrasan-teny*. Université d'Antananarivo.
- Paul, L. M., Simons, G. F. & Fennig, C. D. (Eds.). (2023). *Ethnologue: Languages of the World* — fiche Malagasy.
- `tenymalagasy.org` — Dictionnaire malagasy-français-anglais en ligne
- Wikipedia Malagasy Foundation. API MediaWiki — `mg.wikipedia.org/w/api.php`

### Documentation technique
- FastAPI Documentation — `https://fastapi.tiangolo.com`
- RapidFuzz — *Levenshtein distance & fuzzy matching* — `https://github.com/maxbachmann/RapidFuzz`
- NLTK Book, Ch. 2 — *N-gram Language Models* — `https://www.nltk.org/book/`
- Anthropic API Documentation — `https://docs.anthropic.com`
- gTTS Documentation — *Google Text-to-Speech* — `https://gtts.readthedocs.io`
- ReactQuill — *Rich text editor for React* — `https://zenoamaro.github.io/react-quill`
- BeautifulSoup4 — *Web scraping library* — `https://www.crummy.com/software/BeautifulSoup/`

---

## Évolution

Les améliorations planifiées pour la **version 2 (avant le 14 avril 2026)** :

### Court terme
- **Enrichissement des données** : Lancer le scraping complet de `tenymalagasy.org` (toutes les plages alphabétiques) pour atteindre 10 000+ mots dans le dictionnaire
- **Amélioration du NER** : Ajouter des listes plus complètes (communes de Madagascar, personnalités historiques, partis politiques)
- **Sentiment enrichi** : Étendre les lexiques positifs/négatifs avec des mots tirés automatiquement du corpus Wikipedia MG

### Moyen terme
- **Correcteur grammatical (VSO)** : Détecter les violations de l'ordre Verbe-Sujet-Objet propre au malagasy
- **Module de conjugaison** : Conjuguer les verbes malagasy selon les temps et les voix (active, passive objective, passive instrumentale, passive circonstancielle)
- **Synonymes locaux** : Dictionnaire de synonymes malagasy construit par co-occurrences dans le corpus

### Long terme
- **Modèle de langue léger** : Fine-tuning de fastText ou d'un petit modèle de langue sur le corpus malagasy pour améliorer l'autocomplétion et la détection d'erreurs
- **Déploiement cloud** : Hébergement sur Railway/Render (backend) et Vercel (frontend)
- **Mode hors-ligne (PWA)** : Export en Progressive Web App pour utilisation sans connexion internet

---

## Variables d'environnement requises

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Clé API Anthropic pour le chatbot Claude Haiku |
| `PORT` | Port du serveur backend (défaut : 8080) |

Créer le fichier `backend/.env` :
```
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=8080
```
