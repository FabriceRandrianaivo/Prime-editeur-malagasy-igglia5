import os
import re
from rapidfuzz import fuzz, process

# Forbidden phonotactic combinations in Malagasy
FORBIDDEN_PATTERNS = [
    (r'\bnb', "La combinaison 'nb' n'existe pas en Malagasy"),
    (r'\bmk', "La combinaison 'mk' n'existe pas en Malagasy"),
    (r'\bnk\b', "La combinaison 'nk' en début de mot est rare en Malagasy"),
    (r'dt', "La combinaison 'dt' n'existe pas en Malagasy"),
    (r'bp', "La combinaison 'bp' n'existe pas en Malagasy"),
    (r'sz', "La combinaison 'sz' n'existe pas en Malagasy"),
]

class SpellChecker:
    def __init__(self, dict_path: str):
        self.dictionary = set()
        self.word_list = []
        if os.path.exists(dict_path):
            with open(dict_path, 'r', encoding='utf-8') as f:
                for line in f:
                    word = line.strip().lower()
                    if word:
                        self.dictionary.add(word)
                        self.word_list.append(word)

    def is_correct(self, word: str) -> bool:
        return word.lower() in self.dictionary

    def suggest(self, word: str, n: int = 5) -> list:
        results = process.extract(word.lower(), self.word_list, scorer=fuzz.ratio, limit=n)
        return [r[0] for r in results if r[1] > 50]

    def check_phonotactics(self, word: str) -> list:
        errors = []
        for pattern, message in FORBIDDEN_PATTERNS:
            if re.search(pattern, word.lower()):
                errors.append({"word": word, "error": message, "type": "phonotactic"})
        return errors

    def check_text(self, text: str) -> list:
        errors = []
        words = re.findall(r'\b[a-zA-ZÀ-ÿ]+\b', text)
        for word in words:
            # Phonotactic check
            phono_errors = self.check_phonotactics(word)
            errors.extend(phono_errors)
            # Spell check
            if len(word) > 2 and not self.is_correct(word):
                suggestions = self.suggest(word)
                errors.append({
                    "word": word,
                    "error": f"Mot inconnu: '{word}'",
                    "type": "spelling",
                    "suggestions": suggestions
                })
        return errors
