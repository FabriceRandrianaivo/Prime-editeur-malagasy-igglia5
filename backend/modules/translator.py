import requests
import json
import os

# Built-in Malagasy-French dictionary (common words)
BUILTIN_DICT = {
    "mandeha": "aller/marcher",
    "trano": "maison",
    "rano": "eau",
    "afo": "feu",
    "tany": "terre/sol",
    "hazo": "arbre/bois",
    "vato": "pierre",
    "lalana": "chemin/route",
    "firenena": "nation/pays",
    "vahoaka": "peuple",
    "ray": "père",
    "reny": "mère",
    "zanaka": "enfant/fils",
    "rahalahy": "frère",
    "anabavy": "sœur",
    "namana": "ami",
    "tsara": "bon/bien",
    "ratsy": "mauvais",
    "lehibe": "grand",
    "kely": "petit",
    "fotsy": "blanc",
    "mainty": "noir",
    "mena": "rouge",
    "manga": "bleu",
    "mavo": "jaune",
    "maitso": "vert",
    "mafana": "chaud",
    "mangatsiaka": "froid",
    "manoratra": "écrire",
    "mamaky": "lire",
    "mihinana": "manger",
    "misotro": "boire",
    "matory": "dormir",
    "miteny": "parler/dire",
    "mahita": "voir",
    "mandre": "entendre",
    "misaina": "penser",
    "tia": "aimer",
    "halahelo": "tristesse/triste",
    "faly": "content/joyeux",
    "marary": "malade",
    "salama": "en bonne santé/bonjour",
    "manahoana": "bonjour/comment allez-vous",
    "misaotra": "merci",
    "azafady": "s'il vous plaît/pardon",
    "veloma": "au revoir",
    "eny": "oui",
    "tsia": "non",
    "aho": "je/moi",
    "ianao": "tu/toi",
    "izy": "il/elle",
    "isika": "nous (inclusif)",
    "izahay": "nous (exclusif)",
    "izy ireo": "ils/elles",
    "inona": "quoi",
    "aiza": "où",
    "oviana": "quand",
    "isa": "combien",
    "nahoana": "pourquoi",
    "ahoana": "comment",
    "androany": "aujourd'hui",
    "omaly": "hier",
    "rahampitso": "demain",
    "maraina": "matin",
    "tolakandro": "après-midi",
    "hariva": "soir",
    "alina": "nuit",
    "herinandro": "semaine",
    "volana": "mois/lune",
    "taona": "année",
    "ankizy": "enfants",
    "mpianatra": "étudiant/élève",
    "mpampianatra": "professeur/enseignant",
    "sekoly": "école",
    "fanjakana": "gouvernement/état",
    "vola": "argent",
    "sakafo": "nourriture/repas",
    "aretina": "maladie",
    "dokotera": "médecin",
    "hopitaly": "hôpital",
    "fitiavana": "amour",
    "fiadanana": "paix",
    "fahafahana": "liberté",
    "fahamarinana": "vérité/justice",
    "teny": "langue/mot/parole",
    "boky": "livre",
    "gazety": "journal",
    "radio": "radio",
    "televiziona": "télévision",
    "sary": "image/photo",
    "hira": "chanson/chant",
    "mozika": "musique",
    "baolina": "ballon",
    "tongotra": "pied/jambe",
    "tanana": "main/bras/ville",
    "loha": "tête",
    "maso": "œil/yeux",
    "sofina": "oreille",
    "vava": "bouche",
    "fo": "cœur",
    "aina": "vie/souffle",
    "nofo": "chair/viande",
    "roa": "deux",
    "telo": "trois",
    "efatra": "quatre",
    "dimy": "cinq",
    "enina": "six",
    "fito": "sept",
    "valo": "huit",
    "sivy": "neuf",
    "folo": "dix",
    "iray": "un",
    "andriamanitra": "Dieu",
    "tontolo": "monde/univers",
    "lanitra": "ciel",
    "ranomasina": "mer/océan",
    "tendrombohitra": "montagne",
    "ala": "forêt",
    "kianja": "place/terrain",
    "toeram-ponenana": "résidence/lieu de vie",
    "fomba": "coutume/tradition",
    "lova": "héritage",
    "tantara": "histoire",
    "kolotsaina": "culture",
    "fivavahana": "religion/prière",
    "masina": "saint/sacré",
    "tompo": "seigneur/maître",
    "mpanjaka": "roi",
    "miasa": "travailler",
    "mipetraka": "habiter/s'asseoir",
    "mahafinaritra": "agréable/intéressant",
    "miezaka": "faire effort/essayer",
    "manampy": "aider/ajouter",
    "mitomany": "pleurer",
    "ankizy": "enfants",
    "fianakaviana": "famille",
    "fahasalamana": "santé",
    "harena": "richesse",
    "fahalalana": "connaissance/savoir",
    "asa": "travail",
    "finoana": "foi/croyance",
    "firaisana": "union/unité",
    "fandrosoana": "développement/progrès",
    "vary": "riz",
    "akondro": "banane",
    "mango": "mangue",
    "kafe": "café",
    "omby": "bœuf/vache",
    "akoho": "poulet",
    "trondro": "poisson",
    "gidro": "lémur",
    "fosa": "fossa",
    "lambo": "sanglier",
    "vorona": "oiseau",
    "nosy": "île",
    "ala": "forêt",
    "renirano": "fleuve",
    "farihy": "lac",
}


class Translator:
    def __init__(self, data_dir: str = None):
        self.local_dict = BUILTIN_DICT
        self.scraped_dict = {}
        if data_dir:
            trans_path = os.path.join(data_dir, "translations.json")
            if os.path.exists(trans_path):
                with open(trans_path, "r", encoding="utf-8") as f:
                    self.scraped_dict = json.load(f)

    def reload_scraped(self, data_dir: str):
        """Recharge le dictionnaire scrapé depuis le fichier."""
        trans_path = os.path.join(data_dir, "translations.json")
        if os.path.exists(trans_path):
            with open(trans_path, "r", encoding="utf-8") as f:
                self.scraped_dict = json.load(f)

    def translate_word(self, word: str) -> dict:
        word_lower = word.lower()

        # 1. Dictionnaire local statique
        if word_lower in self.local_dict:
            return {
                "word": word,
                "translation": self.local_dict[word_lower],
                "source": "dictionnaire local"
            }

        # 2. Dictionnaire scrapé depuis tenymalagasy.org
        if word_lower in self.scraped_dict:
            entry = self.scraped_dict[word_lower]
            translation = entry.get("fr") or entry.get("en") or ""
            if translation:
                return {
                    "word": word,
                    "translation": translation,
                    "source": "tenymalagasy.org"
                }

        # 3. Scraping en temps réel sur tenymalagasy.org
        try:
            result = self._tenymalagasy_lookup(word)
            if result:
                return result
        except Exception:
            pass

        # 4. Wikipedia MG API
        try:
            result = self._wikipedia_lookup(word)
            if result:
                return result
        except Exception:
            pass

        return {
            "word": word,
            "translation": "Traduction non trouvée",
            "source": "non trouvé"
        }

    def _tenymalagasy_lookup(self, word: str) -> dict:
        from modules.scraper import scrape_word_definition
        entry = scrape_word_definition(word)
        translation = entry.get("fr") or entry.get("en") or ""
        if translation:
            return {
                "word": word,
                "translation": translation,
                "source": "tenymalagasy.org (live)"
            }
        return None

    def _wikipedia_lookup(self, word: str) -> dict:
        url = "https://mg.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "titles": word,
            "prop": "extracts",
            "exintro": True,
            "exchars": 200,
            "format": "json"
        }
        resp = requests.get(url, params=params, timeout=3)
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for page_id, page in pages.items():
            if page_id != "-1" and "extract" in page:
                return {
                    "word": word,
                    "translation": page["extract"][:200],
                    "source": "Wikipedia MG"
                }
        return None
