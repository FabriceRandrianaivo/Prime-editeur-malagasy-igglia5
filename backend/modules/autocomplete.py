import re
import os
from collections import Counter
from collections import defaultdict
from itertools import islice
from typing import Dict, List, Tuple, cast


class NGramAutocomplete:
    def __init__(self, corpus_path: str):
        self.bigrams: Dict[str, Counter] = cast(
            Dict[str, Counter], defaultdict(Counter)
        )
        self.trigrams: Dict[Tuple[str, str], Counter] = cast(
            Dict[Tuple[str, str], Counter], defaultdict(Counter)
        )
        self.unigrams: Counter = Counter()

        if os.path.exists(corpus_path):
            with open(corpus_path, 'r', encoding='utf-8') as f:
                text = f.read()
            self._train(text)

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b[a-zA-ZÀ-ÿ\']+\b', text.lower())

    def _train(self, text: str):
        tokens = self._tokenize(text)
        self.unigrams.update(tokens)

        for i in range(len(tokens) - 1):
            self.bigrams[tokens[i]][tokens[i+1]] += 1

        for i in range(len(tokens) - 2):
            key = (tokens[i], tokens[i+1])
            self.trigrams[key][tokens[i+2]] += 1

    def predict_next(self, text: str, n: int = 5) -> list:
        tokens = self._tokenize(text)
        if not tokens:
            return []

        candidates = Counter()

        # Trigram prediction (highest priority)
        if len(tokens) >= 2:
            key = (tokens[-2], tokens[-1])
            if key in self.trigrams:
                candidates.update(self.trigrams[key])

        # Bigram prediction
        if tokens[-1] in self.bigrams:
            for word, count in self.bigrams[tokens[-1]].items():
                candidates[word] += int(count * 0.5)

        # Filter out already typed last word
        last_partial = tokens[-1] if tokens else ""

        results: List[Tuple[str, int]] = [
            (word, score) for word, score in candidates.most_common(20)
            if word != last_partial
        ]

        return list(islice((word for word, _ in results), n))

    def complete_word(self, partial: str, n: int = 5) -> List[str]:
        """Complete a partial word"""
        if not partial:
            return []
        partial_lower = partial.lower()
        matches: List[Tuple[str, int]] = [
            (word, count) for word, count in self.unigrams.items()
            if word.startswith(partial_lower) and word != partial_lower
        ]
        matches.sort(key=lambda x: -x[1])
        return list(islice((word for word, _ in matches), n))
