import json
import os


class NamedEntityRecognizer:
    def __init__(self, entities_path: str):
        self.entities = {
            "cities": [],
            "people": [],
            "organizations": [],
            "regions": []
        }
        if os.path.exists(entities_path):
            with open(entities_path, 'r', encoding='utf-8') as f:
                self.entities = json.load(f)

        # Build lookup sets (case-insensitive)
        self.city_set = {c.lower(): c for c in self.entities.get("cities", [])}
        self.people_set = {p.lower(): p for p in self.entities.get("people", [])}
        self.org_set = {o.lower(): o for o in self.entities.get("organizations", [])}
        self.region_set = {r.lower(): r for r in self.entities.get("regions", [])}

    def recognize(self, text: str) -> list:
        results = []
        words = text.split()

        i = 0
        while i < len(words):
            # Try multi-word entities first (up to 3 words)
            matched = False
            for length in [3, 2, 1]:
                if i + length <= len(words):
                    phrase = ' '.join(words[i:i+length])
                    phrase_lower = phrase.lower().strip('.,!?;:')

                    entity_type = None
                    original = None

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

                    if entity_type:
                        results.append({
                            "text": phrase,
                            "type": entity_type,
                            "canonical": original
                        })
                        i += length
                        matched = True
                        break

            if not matched:
                # Check for capitalized words (potential unknown entities)
                word = words[i].strip('.,!?;:')
                if word and word[0].isupper() and len(word) > 2 and not word.isupper():
                    results.append({
                        "text": word,
                        "type": "ENTITE_INCONNUE",
                        "canonical": word
                    })
                i += 1

        return results
