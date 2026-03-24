import os
import re
from itertools import islice


class SentimentAnalyzer:
    def __init__(self, pos_path: str, neg_path: str):
        self.positive_words = set()
        self.negative_words = set()

        if os.path.exists(pos_path):
            with open(pos_path, 'r', encoding='utf-8') as f:
                for line in f:
                    w = line.strip().lower()
                    if w:
                        self.positive_words.add(w)

        if os.path.exists(neg_path):
            with open(neg_path, 'r', encoding='utf-8') as f:
                for line in f:
                    w = line.strip().lower()
                    if w:
                        self.negative_words.add(w)

    def analyze(self, text: str) -> dict:
        words = re.findall(r'\b[a-zA-ZÀ-ÿ]+\b', text.lower())

        pos_count = sum(1 for w in words if w in self.positive_words)
        neg_count = sum(1 for w in words if w in self.negative_words)
        total = len(words)

        pos_words_found = [w for w in words if w in self.positive_words]
        neg_words_found = [w for w in words if w in self.negative_words]

        if total == 0:
            sentiment = "neutre"
            score = 0.5
        elif pos_count > neg_count:
            sentiment = "positif"
            score = min(0.5 + (pos_count - neg_count) / max(total, 1), 1.0)
        elif neg_count > pos_count:
            sentiment = "négatif"
            score = max(0.5 - (neg_count - pos_count) / max(total, 1), 0.0)
        else:
            sentiment = "neutre"
            score = 0.5

        return {
            "sentiment": sentiment,
            "score": int(float(score) * 1000) / 1000.0,
            "positive_count": pos_count,
            "negative_count": neg_count,
            "positive_words": list(islice(set(pos_words_found), 10)),
            "negative_words": list(islice(set(neg_words_found), 10)),
            "total_words": total
        }
