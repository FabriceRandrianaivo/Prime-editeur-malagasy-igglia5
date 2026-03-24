import anthropic

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


class ChatbotAssistant:
    def __init__(self):
        self._client = None
        self.history = []

    @property
    def client(self):
        if self._client is None:
            self._client = anthropic.Anthropic()
        return self._client

    def chat(self, message: str, history: list = None) -> str:
        if history is not None:
            self.history = history

        self.history.append({"role": "user", "content": message})

        response = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            system=SYSTEM_PROMPT,
            messages=self.history
        )

        assistant_message = response.content[0].text
        self.history.append({"role": "assistant", "content": assistant_message})

        return assistant_message
