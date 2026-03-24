from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

from modules.spell_checker import SpellChecker
from modules.lemmatizer import Lemmatizer
from modules.autocomplete import NGramAutocomplete
from modules.translator import Translator
from modules.sentiment import SentimentAnalyzer
from modules.tts import TextToSpeech
from modules.ner import NamedEntityRecognizer
from modules.chatbot import ChatbotAssistant

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
translator = Translator()
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


@app.post("/analyze/full")
def full_analysis(req: TextRequest):
    """Run all analyses at once"""
    return {
        "spell": spell_checker.check_text(req.text),
        "sentiment": sentiment_analyzer.analyze(req.text),
        "entities": ner.recognize(req.text),
    }
