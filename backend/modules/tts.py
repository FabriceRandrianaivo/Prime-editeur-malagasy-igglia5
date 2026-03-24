import io
import base64
from gtts import gTTS


class TextToSpeech:
    def synthesize(self, text: str, lang: str = 'mg') -> str:
        """Returns base64 encoded MP3 audio"""
        try:
            tts = gTTS(text=text, lang=lang, slow=False)
            buffer = io.BytesIO()
            tts.write_to_fp(buffer)
            buffer.seek(0)
            audio_b64 = base64.b64encode(buffer.read()).decode('utf-8')
            return audio_b64
        except Exception as e:
            # Fallback to French TTS
            try:
                tts = gTTS(text=text, lang='fr', slow=False)
                buffer = io.BytesIO()
                tts.write_to_fp(buffer)
                buffer.seek(0)
                return base64.b64encode(buffer.read()).decode('utf-8')
            except Exception:
                raise Exception(f"TTS error: {str(e)}")
