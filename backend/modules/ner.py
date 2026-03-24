import json
import os
from typing import Dict, List, Optional, cast


class NamedEntityRecognizer:
    def __init__(self, entities_path: str):
        self.entities: Dict[str, List[str]] = {
            "cities": [],
            "people": [],
            "organizations": [],
            "regions": []
        }
        if os.path.exists(entities_path):
            with open(entities_path, 'r', encoding='utf-8') as f:
                self.entities = json.load(f)

        # Build lookup sets (case-insensitive)
        self.city_set: Dict[str, str] = {c.lower(): c for c in self.entities.get("cities", [])}
        self.people_set: Dict[str, str] = {p.lower(): p for p in self.entities.get("people", [])}
        self.org_set: Dict[str, str] = {o.lower(): o for o in self.entities.get("organizations", [])}
        self.region_set: Dict[str, str] = {r.lower(): r for r in self.entities.get("regions", [])}

    def _slice_words(self, words: List[str], start: int, end: int) -> List[str]:
        """Return a sublist without using slice notation (Pyre2 workaround)."""
        result: List[str] = []
        for idx in range(start, min(end, len(words))):
            result.append(words[idx])
        return result

    def recognize(self, text: str) -> List[Dict[str, Optional[str]]]:
        results: List[Dict[str, Optional[str]]] = []
        words: List[str] = text.split()
        n_words: int = len(words)

        i: int = 0
        while i < n_words:
            # Try multi-word entities first (up to 3 words)
            matched: bool = False
            for length in [3, 2, 1]:
                length_int: int = cast(int, length)
                end: int = cast(int, i) + length_int
                if end <= n_words:
                    chunk: List[str] = self._slice_words(words, i, end)
                    phrase: str = ' '.join(chunk)
                    phrase_lower: str = phrase.lower().strip('.,!?;:')

                    entity_type: Optional[str] = None
                    original: Optional[str] = None

                    if phrase_lower in self.city_set:
                        entity_type = "VILLE"
                        original = self.city_set[phrase_lower]
                    elif phrase_lower in self.people_set:
                        entity_type = "PERSONNE"
                        original = self.people_set[phrase_lower]
                    elif phrase_lower in self.org_set:
                        entity_type = "ORGANISATION"
                        original = self.org_set[phrase_lower]
                    elif phrase_lower in self.region_set:
                        entity_type = "REGION"
                        original = self.region_set[phrase_lower]

                    if entity_type is not None:
                        results.append({
                            "text": phrase,
                            "type": entity_type,
                            "canonical": original
                        })
                        i = cast(int, i) + length_int
                        matched = True
                        break

            if not matched:
                # Check for capitalized words (potential unknown entities)
                raw_word: str = words[cast(int, i)]
                word: str = raw_word.strip('.,!?;:')
                if word and word[0].isupper() and len(word) > 2 and not word.isupper():
                    results.append({
                        "text": word,
                        "type": "ENTITE_INCONNUE",
                        "canonical": word
                    })
                i = cast(int, i) + 1

        return results
