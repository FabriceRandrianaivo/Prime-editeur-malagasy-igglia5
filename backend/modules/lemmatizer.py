from typing import Dict, List, Optional, Tuple

PREFIXES: List[Tuple[str, str]] = [
    ('mam', ''), ('man', ''), ('mana', ''), ('mank', ''),
    ('mpam', ''), ('mpan', ''),
    ('fam', ''), ('fan', ''), ('fana', ''),
    ('maha', ''), ('taha', ''),
    ('mi', ''), ('ma', ''), ('me', ''),
    ('fi', ''), ('fa', ''), ('fe', ''),
    ('am', ''), ('an', ''),
    ('i', ''), ('o', ''),
]

SUFFIXES: List[str] = [
    'ana', 'ina', 'na', 'ka', 'tra', 'ra',
]

VOICE_PREFIXES: Dict[str, str] = {
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


def _str_startswith(s: str, prefix: str) -> bool:
    return s.startswith(prefix)


def _str_endswith(s: str, suffix: str) -> bool:
    return s.endswith(suffix)


def _str_slice_from(s: str, start: int) -> str:
    """Return s[start:] without direct slice notation."""
    chars: List[str] = []
    for idx in range(start, len(s)):
        chars.append(s[idx])
    return ''.join(chars)


def _str_slice_to(s: str, end: int) -> str:
    """Return s[:end] (end is negative offset, like -n) without slice notation."""
    # end is the number of chars to strip from the right
    limit: int = len(s) - end
    chars: List[str] = []
    for idx in range(0, limit):
        chars.append(s[idx])
    return ''.join(chars)


class Lemmatizer:
    def lemmatize(self, word: str) -> Dict[str, Optional[str]]:
        word_lower: str = word.lower()
        result: Dict[str, Optional[str]] = {
            "original": word,
            "root": word_lower,
            "prefix": None,
            "suffix": None,
            "voice": None
        }

        # Try removing prefixes (longest first)
        sorted_prefixes: List[Tuple[str, str]] = sorted(
            PREFIXES, key=lambda x: len(x[0]), reverse=True
        )
        current: str = word_lower
        for prefix, _ in sorted_prefixes:
            if _str_startswith(current, prefix) and len(current) > len(prefix) + 2:
                root: str = _str_slice_from(current, len(prefix))
                result["prefix"] = prefix
                result["root"] = root
                result["voice"] = VOICE_PREFIXES.get(prefix, "unknown")
                current = root
                break

        # Try removing suffixes
        for suffix in sorted(SUFFIXES, key=len, reverse=True):
            if _str_endswith(current, suffix) and len(current) > len(suffix) + 2:
                trimmed: str = _str_slice_to(current, len(suffix))
                result["suffix"] = suffix
                result["root"] = trimmed
                break

        return result

    def get_fandrasan_teny(self, word: str) -> str:
        """Get the fandrasan-teny (word form analysis) in Malagasy"""
        analysis = self.lemmatize(word)
        parts: List[str] = []
        if analysis["prefix"]:
            parts.append(f"Tovona aloha (préfixe): {analysis['prefix']}-")
        parts.append(f"Fototeny (racine): {analysis['root']}")
        if analysis["suffix"]:
            parts.append(f"Tovona aoriana (suffixe): -{analysis['suffix']}")
        if analysis["voice"]:
            parts.append(f"Endrika: {analysis['voice']}")
        return " | ".join(parts)
