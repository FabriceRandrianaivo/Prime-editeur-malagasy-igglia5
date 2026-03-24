"""
Scraper pour tenymalagasy.org
Enrichit le dictionnaire local avec les mots et traductions du site.
"""
import requests
import re
import os
import json
import time
from typing import Optional
from bs4 import BeautifulSoup

BASE_URL = "http://tenymalagasy.org"
WIKI_API_URL = "https://mg.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "MalagasyNLPBot/1.0 (Educational research; mg.wikipedia.org)"}

def get_all_ranges() -> list[str]:
    """Récupère toutes les plages de lettres disponibles sur le site."""
    resp = requests.get(f"{BASE_URL}/bins/alphaLists?lang=mg&range=man", headers=HEADERS, timeout=10)
    soup = BeautifulSoup(resp.text, "html.parser")
    ranges = []
    seen = set()
    for link in soup.find_all("a", href=True):
        href = link["href"]
        # Seulement les liens internes (commencent par /bins/)
        if href.startswith("/bins/alphaLists?lang=mg&range=") and href not in seen:
            seen.add(href)
            range_val = href.split("range=")[-1]
            ranges.append(range_val)
    return ranges


def scrape_range(range_val: str) -> list[dict]:
    """
    Scrape une plage alphabétique et retourne une liste de
    {"word": ..., "fr": ..., "en": ...}
    """
    url = f"{BASE_URL}/bins/alphaLists?lang=mg&range={range_val}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.encoding = "utf-8"
    except Exception as e:
        print(f"  Erreur réseau pour range={range_val}: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    # Le vrai tableau des mots a exactement 3 colonnes : "Teny malagasy", "Anglisy", "Frantsay"
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        first_row_cells = rows[0].find_all("td")
        if len(first_row_cells) != 3:
            continue
        col_texts = [c.get_text(strip=True) for c in first_row_cells]
        if col_texts[0] != "Teny malagasy":
            continue

        # C'est le bon tableau — extraire les mots
        for row in rows[1:]:
            cells = row.find_all("td")
            if len(cells) < 1:
                continue
            word = cells[0].get_text(strip=True)
            en = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            fr = cells[2].get_text(strip=True) if len(cells) > 2 else ""
            # Garder seulement les vrais mots malagasy
            if word and re.match(r"^[a-zA-ZÀ-ÿ''\-]+$", word) and len(word) >= 2:
                results.append({
                    "word": word.lower(),
                    "fr": fr[:200] if fr else "",
                    "en": en[:200] if en else "",
                })
        break  # On a trouvé le bon tableau

    return results


def scrape_word_definition(word: str) -> dict:
    """
    Scrape la définition et la traduction d'un mot spécifique depuis tenymalagasy.org.
    Retourne {"word": ..., "fr": ..., "en": ..., "definition": ...}
    """
    url = f"{BASE_URL}/bins/teny2/{word}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=8)
        resp.encoding = "utf-8"
    except Exception as e:
        return {"word": word, "fr": "", "en": "", "definition": "", "error": str(e)}

    soup = BeautifulSoup(resp.text, "html.parser")

    result = {"word": word, "fr": "", "en": "", "definition": "", "source": "tenymalagasy.org"}

    # Cherche les traductions dans les tableaux
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True).lower()
                val = cells[1].get_text(strip=True)
                if "français" in label or "frantsay" in label or "fr" == label:
                    result["fr"] = val[:300]
                elif "anglais" in label or "anglisy" in label or "en" == label:
                    result["en"] = val[:300]

    # Cherche la définition en malagasy (texte principal)
    definition_parts = []
    for td in soup.find_all("td"):
        text = td.get_text(strip=True)
        if text and len(text) > 30 and word.lower() in text.lower():
            cls = td.get("class", [])
            if not cls or "menu" not in str(cls).lower():
                definition_parts.append(text[:300])
                if len(definition_parts) >= 2:
                    break
    if definition_parts:
        result["definition"] = definition_parts[0]

    # Fallback: cherche traductions dans le texte brut
    if not result["fr"] and not result["en"]:
        text = soup.get_text()
        fr_match = re.search(r"Frantsay[:\s]+([^\n]{5,100})", text)
        en_match = re.search(r"Anglisy[:\s]+([^\n]{5,100})", text)
        if fr_match:
            result["fr"] = fr_match.group(1).strip()
        if en_match:
            result["en"] = en_match.group(1).strip()

    return result


def build_dictionary(
    data_dir: str,
    max_ranges: Optional[int] = None,
    delay: float = 0.5
) -> dict:
    """
    Scrape tenymalagasy.org et enrichit :
    - data/dictionary.txt  (mots pour le correcteur orthographique)
    - data/translations.json (mot → traduction FR/EN)

    Retourne des statistiques: {"new_words": N, "total_words": N}
    """
    dict_path = os.path.join(data_dir, "dictionary.txt")
    trans_path = os.path.join(data_dir, "translations.json")

    # Charger l'existant
    existing_words = set()
    if os.path.exists(dict_path):
        with open(dict_path, "r", encoding="utf-8") as f:
            existing_words = {line.strip().lower() for line in f if line.strip()}

    existing_trans = {}
    if os.path.exists(trans_path):
        with open(trans_path, "r", encoding="utf-8") as f:
            existing_trans = json.load(f)

    print(f"Dictionnaire actuel: {len(existing_words)} mots")
    print("Récupération des plages alphabétiques...")

    ranges = get_all_ranges()
    print(f"{len(ranges)} plages trouvées")

    if max_ranges is not None:
        limited: list = []
        for _r in ranges:
            if len(limited) >= max_ranges:
                break
            limited.append(_r)
        ranges = limited

    new_words = []
    new_trans = {}
    total_scraped = 0

    for i, range_val in enumerate(ranges):
        print(f"  [{i+1}/{len(ranges)}] Scraping range: {range_val} ...", end=" ", flush=True)
        entries = scrape_range(range_val)
        print(f"{len(entries)} mots")

        for entry in entries:
            w = entry["word"]
            total_scraped += 1
            if w not in existing_words:
                new_words.append(w)
                existing_words.add(w)
            if (entry["fr"] or entry["en"]) and w not in existing_trans:
                new_trans[w] = {"fr": entry["fr"], "en": entry["en"]}

        time.sleep(delay)

    # Écrire le dictionnaire enrichi
    all_words = sorted(existing_words)
    with open(dict_path, "w", encoding="utf-8") as f:
        f.write("\n".join(all_words))

    # Mettre à jour translations.json
    existing_trans.update(new_trans)
    with open(trans_path, "w", encoding="utf-8") as f:
        json.dump(existing_trans, f, ensure_ascii=False, indent=2)

    stats = {
        "new_words": len(new_words),
        "total_words": len(all_words),
        "scraped_entries": total_scraped,
        "new_translations": len(new_trans),
        "total_translations": len(existing_trans),
    }
    print(f"\nRésultat: +{stats['new_words']} nouveaux mots, total={stats['total_words']}")
    return stats


def scrape_wikipedia(limit: int = 10) -> list[str]:
    """
    Récupère le texte de 'limit' articles aléatoires de Wikipedia Malagasy.
    Retourne une liste de chaînes de caractères (contenu des articles).
    """
    texts = []
    print(f"Récupération de {limit} articles Wikipedia MG...")
    
    # 1. Obtenir des IDs d'articles aléatoires
    params_random = {
        "action": "query",
        "format": "json",
        "list": "random",
        "rnnamespace": 0,
        "rnlimit": limit
    }
    
    try:
        r = requests.get(WIKI_API_URL, params=params_random, headers=HEADERS, timeout=10)
        random_pages = r.json().get("query", {}).get("random", [])
        page_ids = [p["id"] for p in random_pages]
        
        # 2. Récupérer le contenu textuel pour chaque ID
        for pid in page_ids:
            params_content = {
                "action": "query",
                "format": "json",
                "prop": "extracts",
                "explaintext": True,
                "pageids": pid
            }
            res = requests.get(WIKI_API_URL, params=params_content, headers=HEADERS, timeout=10)
            pages = res.json().get("query", {}).get("pages", {})
            page_data = pages.get(str(pid), {})
            extract = page_data.get("extract", "")
            
            if extract and len(extract) > 100:
                # Nettoyage basique
                clean_text = re.sub(r'={2,}', '', extract) # Enlever les titres == Titre ==
                texts.append(clean_text)
                print(f"  - Article '{page_data.get('title')}' récupéré ({len(clean_text)} chars)")
            
            time.sleep(0.5) # Politesse
            
    except Exception as e:
        print(f"Erreur lors du scraping Wikipedia: {e}")
        
    return texts


def build_corpus(data_dir: str, limit: int = 20):
    """Enrichit data/corpus.txt avec du texte Wikipedia."""
    corpus_path = os.path.join(data_dir, "corpus.txt")
    texts = scrape_wikipedia(limit)
    
    if not texts:
        return
        
    new_content = "\n\n".join(texts)
    
    mode = "a" if os.path.exists(corpus_path) else "w"
    with open(corpus_path, mode, encoding="utf-8") as f:
        if mode == "a":
            f.write("\n\n")
        f.write(new_content)
    
    print(f"Corpus enrichi : {len(texts)} nouveaux articles ajoutés à {corpus_path}")


if __name__ == "__main__":
    import sys
    # Go up one level from 'modules' to the backend root, then into 'data'
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(backend_root, "data")
    if len(sys.argv) > 1 and sys.argv[1] == "wiki":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        build_corpus(data_dir, limit=limit)
    else:
        max_r: Optional[int] = int(sys.argv[1]) if len(sys.argv) > 1 else None
        build_dictionary(data_dir, max_ranges=max_r)
