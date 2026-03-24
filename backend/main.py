from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

from modules.spell_checker import SpellChecker
from modules.lemmatizer import Lemmatizer
from modules.autocomplete import NGramAutocomplete
from modules.translator import Translator
from modules.sentiment import SentimentAnalyzer
from modules.tts import TextToSpeech
from modules.ner import NamedEntityRecognizer
from modules.chatbot import ChatbotAssistant
from modules.scraper import build_dictionary, build_corpus

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

app = FastAPI(title="Éditeur Malagasy IA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize modules
spell_checker = SpellChecker(os.path.join(DATA_DIR, "dictionary.txt"))
lemmatizer = Lemmatizer()
autocomplete = NGramAutocomplete(os.path.join(DATA_DIR, "corpus.txt"))
translator = Translator(data_dir=DATA_DIR)
sentiment_analyzer = SentimentAnalyzer(
    os.path.join(DATA_DIR, "sentiment_positive.txt"),
    os.path.join(DATA_DIR, "sentiment_negative.txt")
)
tts = TextToSpeech()
ner = NamedEntityRecognizer(os.path.join(DATA_DIR, "entities.json"))
chatbot = ChatbotAssistant()


# Pydantic models
class TextRequest(BaseModel):
    text: str


class WordRequest(BaseModel):
    word: str


class AutocompleteRequest(BaseModel):
    text: str
    partial: Optional[str] = None
    n: int = 5


class TTSRequest(BaseModel):
    text: str
    lang: str = "mg"


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []

class ScrapeRequest(BaseModel):
    max_ranges: Optional[int] = None

class WikiScrapeRequest(BaseModel):
    limit: int = 10


# Routes
@app.get("/")
def root():
    return {"message": "Éditeur Malagasy IA API", "status": "running"}


@app.post("/spell/check")
def spell_check(req: TextRequest):
    errors = spell_checker.check_text(req.text)
    return {"errors": errors, "error_count": len(errors)}


@app.post("/spell/suggest")
def spell_suggest(req: WordRequest):
    suggestions = spell_checker.suggest(req.word)
    is_correct = spell_checker.is_correct(req.word)
    return {"word": req.word, "is_correct": is_correct, "suggestions": suggestions}


@app.post("/lemma")
def lemmatize(req: WordRequest):
    result = lemmatizer.lemmatize(req.word)
    fandrasan = lemmatizer.get_fandrasan_teny(req.word)
    return {**result, "fandrasan_teny": fandrasan}


@app.post("/autocomplete")
def get_autocomplete(req: AutocompleteRequest):
    suggestions = []
    if req.partial:
        word_completions = autocomplete.complete_word(req.partial, req.n)
        suggestions = word_completions
    else:
        next_words = autocomplete.predict_next(req.text, req.n)
        suggestions = next_words
    return {"suggestions": suggestions}


@app.post("/translate")
def translate(req: WordRequest):
    result = translator.translate_word(req.word)
    return result


@app.post("/sentiment")
def analyze_sentiment(req: TextRequest):
    result = sentiment_analyzer.analyze(req.text)
    return result


@app.post("/tts")
def text_to_speech(req: TTSRequest):
    try:
        audio_b64 = tts.synthesize(req.text, req.lang)
        return {"audio": audio_b64, "format": "mp3"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ner")
def named_entity_recognition(req: TextRequest):
    entities = ner.recognize(req.text)
    return {"entities": entities, "count": len(entities)}


@app.post("/chat")
def chat(req: ChatRequest):
    try:
        response = chatbot.chat(req.message, req.history)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scrape/dictionary")
def scrape_dictionary(req: ScrapeRequest):
    """
    Lance le scraping de tenymalagasy.org pour enrichir le dictionnaire.
    max_ranges: nombre de plages à scraper (None = toutes).
    Attention: peut prendre plusieurs minutes si max_ranges est grand.
    """
    try:
        stats = build_dictionary(DATA_DIR, max_ranges=req.max_ranges)
        # Recharger le spell checker et le translator avec les nouvelles données
        spell_checker.dictionary = set()
        spell_checker.word_list = []
        dict_path = os.path.join(DATA_DIR, "dictionary.txt")
        with open(dict_path, "r", encoding="utf-8") as f:
            for line in f:
                w = line.strip().lower()
                if w:
                    spell_checker.dictionary.add(w)
                    spell_checker.word_list.append(w)
        translator.reload_scraped(DATA_DIR)
        return {"status": "ok", **stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/scrape/status")
def scrape_status():
    """Retourne le nombre de mots et traductions disponibles."""
    dict_path = os.path.join(DATA_DIR, "dictionary.txt")
    word_count = 0
    if os.path.exists(dict_path):
        with open(dict_path, "r", encoding="utf-8") as f:
            word_count = sum(1 for l in f if l.strip())
    trans_count = len(translator.scraped_dict)
    return {
        "dictionary_words": word_count,
        "scraped_translations": trans_count,
    }


@app.post("/scrape/wiki")
def scrape_wiki(req: WikiScrapeRequest):
    """Enrichit le corpus avec des articles Wikipedia."""
    try:
        build_corpus(DATA_DIR, limit=req.limit)
        return {"status": "ok", "message": f"{req.limit} articles ajoutés au corpus"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reload")
def reload_models():
    """Recharge tous les modèles avec les données à jour du dossier /data."""
    global spell_checker, autocomplete, translator, sentiment_analyzer, ner
    try:
        spell_checker = SpellChecker(os.path.join(DATA_DIR, "dictionary.txt"))
        autocomplete = NGramAutocomplete(os.path.join(DATA_DIR, "corpus.txt"))
        translator = Translator(data_dir=DATA_DIR)
        sentiment_analyzer = SentimentAnalyzer(
            os.path.join(DATA_DIR, "sentiment_positive.txt"),
            os.path.join(DATA_DIR, "sentiment_negative.txt")
        )
        ner = NamedEntityRecognizer(os.path.join(DATA_DIR, "entities.json"))
        return {"status": "ok", "message": "Tous les modèles ont été rechargés"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/full")
def full_analysis(req: TextRequest):
    """Run all analyses at once"""
    return {
        "spell": spell_checker.check_text(req.text),
        "sentiment": sentiment_analyzer.analyze(req.text),
        "entities": ner.recognize(req.text),
    }
