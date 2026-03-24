# Éditeur de Texte Augmenté par l'IA pour le Malagasy

Application web d'édition de texte intelligente spécialisée pour la langue malagasy.

## Membres du groupe & Rôles
- [Nom 1] - Architecture backend & modules NLP
- [Nom 2] - Frontend React & UX
- [Nom 3] - Corpus & données malagasy

## Lancer l'application

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

L'application sera accessible sur http://localhost:5173

## Fonctionnalités IA

| Module | Technologie | Description |
|--------|-------------|-------------|
| Correcteur orthographique | Levenshtein (rapidfuzz) + dictionnaire | Détecte les fautes et propose des corrections |
| Validation phonotactique | REGEX | Détecte les combinaisons interdites en malagasy (nb, mk, dt...) |
| Lemmatiseur | Règles préfixes/suffixes | Retrouve la racine des mots, analyse le fandrasan-teny |
| Autocomplétion N-gram | bigrams/trigrams | Prédit le mot suivant entraîné sur corpus malagasy |
| Traducteur | Dictionnaire local + Wikipedia MG API | Traduction au clic droit |
| Analyse de sentiment | Bag of Words | Classification Positif/Négatif/Neutre |
| Synthèse vocale | gTTS | Lecture du texte en malagasy |
| NER | Règles + listes d'entités | Détecte villes, personnes, organisations |
| Chatbot | Claude API (Haiku) | Assistant pour synonymes et conjugaisons |

## Sources de données
- Corpus: Wikipedia Malagasy, Bible malagasy
- Dictionnaire: tenymalagasy.org + données collectées manuellement
- Entités: Wikipedia, données géographiques Madagascar

## Structure du projet
```
.
├── backend/
│   ├── main.py                    # API FastAPI principale
│   ├── modules/
│   │   ├── spell_checker.py       # Correcteur orthographique
│   │   ├── lemmatizer.py          # Lemmatiseur malagasy
│   │   ├── autocomplete.py        # Autocomplétion N-gram
│   │   ├── translator.py          # Traducteur MG-FR
│   │   ├── sentiment.py           # Analyse de sentiment
│   │   ├── tts.py                 # Synthèse vocale
│   │   ├── ner.py                 # Reconnaissance d'entités
│   │   └── chatbot.py             # Chatbot Claude
│   ├── data/
│   │   ├── dictionary.txt         # Dictionnaire malagasy (600+ mots)
│   │   ├── corpus.txt             # Corpus malagasy (300+ phrases)
│   │   ├── sentiment_positive.txt # Mots positifs
│   │   ├── sentiment_negative.txt # Mots négatifs
│   │   └── entities.json          # Entités nommées
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx                # Application principale
    │   ├── App.css                # Styles (couleurs Madagascar)
    │   └── services/api.js        # Client API
    ├── package.json
    └── vite.config.js
```

## Variables d'environnement requises
- `ANTHROPIC_API_KEY` : Clé API Anthropic pour le chatbot Claude
