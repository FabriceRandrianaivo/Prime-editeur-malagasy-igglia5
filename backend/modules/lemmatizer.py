import re

PREFIXES = [
    ('mam', ''), ('man', ''), ('mana', ''), ('mank', ''),
    ('mpam', ''), ('mpan', ''),
    ('fam', ''), ('fan', ''), ('fana', ''),
    ('maha', ''), ('taha', ''),
    ('mi', ''), ('ma', ''), ('me', ''),
    ('fi', ''), ('fa', ''), ('fe', ''),
    ('am', ''), ('an', ''),
    ('i', ''), ('o', ''),
]

SUFFIXES = [
    'ana', 'ina', 'na', 'ka', 'tra', 'ra',
]

VOICE_PREFIXES = {
    'mi': 'active',
    'ma': 'active_stative',
    'man': 'active_nasal',
    'mam': 'active_nasal_bilabial',
    'mana': 'active',
    'an': 'objective',
    'i': 'objective',
    'o': 'locative',
    'fi': 'nominalization',
    'fan': 'nominalization',
}

class Lemmatizer:
    def lemmatize(self, word: str) -> dict:
        word_lower = word.lower()
        result = {
            "original": word,
            "root": word_lower,
            "prefix": None,
            "suffix": None,
            "voice": None
        }

        # Try removing prefixes (longest first)
        sorted_prefixes = sorted(PREFIXES, key=lambda x: len(x[0]), reverse=True)
        for prefix, _ in sorted_prefixes:
            if word_lower.startswith(prefix) and len(word_lower) > len(prefix) + 2:
                root = word_lower[len(prefix):]
                result["prefix"] = prefix
                result["root"] = root
                result["voice"] = VOICE_PREFIXES.get(prefix, "unknown")
                word_lower = root
                break

        # Try removing suffixes
        for suffix in sorted(SUFFIXES, key=len, reverse=True):
            if word_lower.endswith(suffix) and len(word_lower) > len(suffix) + 2:
                root = word_lower[:-len(suffix)]
                result["suffix"] = suffix
                result["root"] = root
                break

        return result

    def get_fandrasan_teny(self, word: str) -> str:
        """Get the fandrasan-teny (word form analysis) in Malagasy"""
        analysis = self.lemmatize(word)
        parts = []
        if analysis["prefix"]:
            parts.append(f"Tovona aloha (préfixe): {analysis['prefix']}-")
        parts.append(f"Fototeny (racine): {analysis['root']}")
        if analysis["suffix"]:
            parts.append(f"Tovona aoriana (suffixe): -{analysis['suffix']}")
        if analysis["voice"]:
            parts.append(f"Endrika: {analysis['voice']}")
        return " | ".join(parts)
