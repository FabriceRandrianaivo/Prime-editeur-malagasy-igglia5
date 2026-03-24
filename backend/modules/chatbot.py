import os
import requests
from typing import List, Optional

SYSTEM_PROMPT = """Tu es un assistant linguistique spécialisé dans la langue malagasy.
Tu aides les rédacteurs malagasy avec:
- Les synonymes en malagasy
- Les conjugaisons et formes verbales
- Les règles grammaticales du malagasy (ordre VSO)
- Les préfixes (mi-, ma-, man-, mam-, maha-, fi-, fan-, fam-) et suffixes (-ana, -ina, -na)
- La lemmatisation et la racine des mots
- Les explications culturelles liées à la langue

Réponds toujours de façon concise et pratique.
Si tu donnes des exemples, utilise du malagasy authentique.
Tu peux répondre en français ou en malagasy selon la question."""


def _try_anthropic(message: str, history: list) -> Optional[str]:
    """Tente d'utiliser Claude (Anthropic). Retourne None si indisponible."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            system=SYSTEM_PROMPT,
            messages=history + [{"role": "user", "content": message}]
        )
        return response.content[0].text
    except Exception:
        return None


def _try_groq(message: str, history: list) -> Optional[str]:
    """Tente d'utiliser Groq (Llama 3.3 — gratuit). Retourne None si indisponible."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return None
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(history)
        messages.append({"role": "user", "content": message})
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "max_tokens": 500,
                "temperature": 0.7
            },
            timeout=15
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return None


class ChatbotAssistant:
    def __init__(self):
        self.history = []

    def chat(self, message: str, history: Optional[List[dict]] = None) -> str:
        if history is not None:
            self.history = history

        # Essai 1 : Anthropic Claude
        result = _try_anthropic(message, self.history)

        # Essai 2 : Groq (Llama 3.3 — gratuit)
        if result is None:
            result = _try_groq(message, self.history)

        # Fallback : message d'erreur clair
        if result is None:
            groq_key = os.environ.get("GROQ_API_KEY", "")
            anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
            if not anthropic_key and not groq_key:
                result = (
                    "Aucune clé API configurée. Ajoutez GROQ_API_KEY (gratuit sur console.groq.com) "
                    "ou ANTHROPIC_API_KEY dans le fichier backend/.env puis redémarrez le serveur."
                )
            else:
                result = (
                    "Le service IA est temporairement indisponible "
                    "(crédits épuisés ou erreur réseau). "
                    "Ajoutez GROQ_API_KEY (gratuit) dans backend/.env pour activer le fallback."
                )

        self.history.append({"role": "user", "content": message})
        self.history.append({"role": "assistant", "content": result})
        return result
