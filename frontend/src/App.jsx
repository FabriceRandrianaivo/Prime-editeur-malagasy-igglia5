import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as api from './services/api'

// ============ CONTEXT MENU ============
function ContextMenu({ x, y, word, onClose }) {
  const [translation, setTranslation] = useState(null)
  const [lemma, setLemma] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (word) {
      setLoading(true)
      Promise.all([
        api.translate(word).catch(() => null),
        api.lemmatize(word).catch(() => null)
      ]).then(([transRes, lemmaRes]) => {
        if (transRes) setTranslation(transRes.data)
        if (lemmaRes) setLemma(lemmaRes.data)
        setLoading(false)
      })
    }
  }, [word])

  return (
    <div
      className="context-menu"
      style={{ position: 'fixed', top: y, left: x, zIndex: 9999 }}
      onMouseLeave={onClose}
    >
      <div className="context-menu-header">
        <strong>"{word}"</strong>
      </div>
      {loading ? (
        <div className="context-menu-item">Chargement...</div>
      ) : (
        <>
          {translation && (
            <div className="context-menu-section">
              <div className="context-menu-label">Traduction</div>
              <div className="context-menu-value">{translation.translation}</div>
              <div className="context-menu-source">{translation.source}</div>
            </div>
          )}
          {lemma && (
            <div className="context-menu-section">
              <div className="context-menu-label">Lemmatisation</div>
              <div className="context-menu-value">
                Racine: <strong>{lemma.root}</strong>
              </div>
              {lemma.prefix && <div className="context-menu-value">Préfixe: {lemma.prefix}-</div>}
              {lemma.suffix && <div className="context-menu-value">Suffixe: -{lemma.suffix}</div>}
              {lemma.voice && <div className="context-menu-value">Voix: {lemma.voice}</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============ AUTOCOMPLETE DROPDOWN ============
function AutocompleteDropdown({ suggestions, onSelect, position }) {
  if (!suggestions || suggestions.length === 0) return null
  return (
    <div className="autocomplete-dropdown" style={{ top: position?.top, left: position?.left }}>
      {suggestions.map((s, i) => (
        <div key={i} className="autocomplete-item" onClick={() => onSelect(s)}>
          {s}
        </div>
      ))}
    </div>
  )
}

// ============ SPELL PANEL ============
function SpellPanel({ errors, onCorrect }) {
  if (!errors || errors.length === 0) {
    return <div className="panel-empty">Aucune erreur détectée ✓</div>
  }
  return (
    <div className="spell-panel">
      {errors.map((err, i) => (
        <div key={i} className={`spell-error ${err.type}`}>
          <div className="spell-error-word">"{err.word}"</div>
          <div className="spell-error-msg">{err.error}</div>
          {err.suggestions && err.suggestions.length > 0 && (
            <div className="spell-suggestions">
              {err.suggestions.map((s, j) => (
                <span key={j} className="suggestion-chip" onClick={() => onCorrect(err.word, s)}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ============ SENTIMENT PANEL ============
function SentimentPanel({ sentiment }) {
  if (!sentiment) return <div className="panel-empty">Tapez du texte pour analyser...</div>

  const emoji = sentiment.sentiment === 'positif' ? '😊' :
                sentiment.sentiment === 'négatif' ? '😔' : '😐'
  const color = sentiment.sentiment === 'positif' ? '#22c55e' :
                sentiment.sentiment === 'négatif' ? '#ef4444' : '#94a3b8'

  return (
    <div className="sentiment-panel">
      <div className="sentiment-main" style={{ color }}>
        <span className="sentiment-emoji">{emoji}</span>
        <span className="sentiment-label">{sentiment.sentiment.toUpperCase()}</span>
      </div>
      <div className="sentiment-bar">
        <div className="sentiment-bar-fill" style={{
          width: `${sentiment.score * 100}%`,
          backgroundColor: color
        }}/>
      </div>
      <div className="sentiment-score">Score: {(sentiment.score * 100).toFixed(0)}%</div>
      <div className="sentiment-counts">
        <span className="pos-count">+{sentiment.positive_count} positifs</span>
        <span className="neg-count">-{sentiment.negative_count} négatifs</span>
      </div>
      {sentiment.positive_words.length > 0 && (
        <div className="sentiment-words">
          <strong>Mots positifs:</strong> {sentiment.positive_words.join(', ')}
        </div>
      )}
      {sentiment.negative_words.length > 0 && (
        <div className="sentiment-words neg">
          <strong>Mots négatifs:</strong> {sentiment.negative_words.join(', ')}
        </div>
      )}
    </div>
  )
}

// ============ NER PANEL ============
function NERPanel({ entities }) {
  if (!entities || entities.length === 0)
    return <div className="panel-empty">Aucune entité détectée</div>

  const typeColors = {
    'VILLE': '#3b82f6',
    'PERSONNE': '#f59e0b',
    'ORGANISATION': '#8b5cf6',
    'REGION': '#10b981',
    'ENTITE_INCONNUE': '#6b7280'
  }

  return (
    <div className="ner-panel">
      {entities.map((e, i) => (
        <div key={i} className="ner-entity">
          <span className="ner-tag" style={{ backgroundColor: typeColors[e.type] || '#6b7280' }}>
            {e.type}
          </span>
          <span className="ner-text">{e.text}</span>
        </div>
      ))}
    </div>
  )
}

// ============ CHATBOT PANEL ============
function ChatbotPanel() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Manao ahoana! Je suis votre assistant linguistique malagasy. Posez-moi des questions sur les synonymes, conjugaisons, ou règles grammaticales du malagasy.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await api.chat(userMsg, history)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion au chatbot.' }])
    }
    setLoading(false)
  }

  return (
    <div className="chatbot-panel">
      <div className="chatbot-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-message ${m.role}`}>
            <div className="chat-bubble">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="chat-bubble loading">...</div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>
      <div className="chatbot-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Demandez un synonyme, une conjugaison..."
        />
        <button onClick={sendMessage} disabled={loading}>
          Envoyer
        </button>
      </div>
    </div>
  )
}

// ============ MAIN APP ============
export default function App() {
  const [text, setText] = useState('')
  const [activePanel, setActivePanel] = useState('spell')
  const [spellErrors, setSpellErrors] = useState([])
  const [sentiment, setSentiment] = useState(null)
  const [entities, setEntities] = useState([])
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([])
  const [contextMenu, setContextMenu] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const editorRef = useRef(null)
  const analysisTimeout = useRef(null)
  const autocompleteTimeout = useRef(null)

  const analyzeText = useCallback(async (t) => {
    if (!t.trim()) {
      setSpellErrors([])
      setSentiment(null)
      setEntities([])
      return
    }
    setIsAnalyzing(true)
    try {
      const [spellRes, sentRes, nerRes] = await Promise.all([
        api.spellCheck(t).catch(() => null),
        api.analyzeSentiment(t).catch(() => null),
        api.recognizeEntities(t).catch(() => null)
      ])
      if (spellRes) setSpellErrors(spellRes.data.errors || [])
      if (sentRes) setSentiment(sentRes.data)
      if (nerRes) setEntities(nerRes.data.entities || [])
    } catch (e) {}
    setIsAnalyzing(false)
  }, [])

  const handleTextChange = useCallback((e) => {
    const newText = e.target.value
    setText(newText)
    setWordCount(newText.trim() ? newText.trim().split(/\s+/).length : 0)

    // Debounced full analysis
    clearTimeout(analysisTimeout.current)
    analysisTimeout.current = setTimeout(() => analyzeText(newText), 1000)

    // Autocomplete on typing
    clearTimeout(autocompleteTimeout.current)
    autocompleteTimeout.current = setTimeout(async () => {
      const words = newText.split(/\s+/)
      const lastWord = words[words.length - 1]
      if (lastWord && lastWord.length >= 2) {
        try {
          const res = await api.autocomplete(newText, lastWord, 5)
          setAutocompleteSuggestions(res.data.suggestions || [])
        } catch {}
      } else if (!lastWord || lastWord.length < 2) {
        setAutocompleteSuggestions([])
      }
    }, 300)
  }, [analyzeText])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()

    // Get word under cursor from textarea
    const textarea = e.target
    if (textarea.tagName === 'TEXTAREA') {
      const pos = textarea.selectionStart
      const val = textarea.value
      let start = pos, end = pos
      while (start > 0 && /\w/.test(val[start-1])) start--
      while (end < val.length && /\w/.test(val[end])) end++
      const clickedWord = val.slice(start, end)
      if (clickedWord) {
        setContextMenu({ x: e.clientX, y: e.clientY, word: clickedWord })
        return
      }
    }
  }, [])

  const handleAutocompleteSelect = useCallback((suggestion) => {
    const words = text.split(/\s+/)
    words[words.length - 1] = suggestion
    setText(words.join(' ') + ' ')
    setAutocompleteSuggestions([])
  }, [text])

  const handleCorrect = useCallback((wrong, correct) => {
    setText(prev => prev.replace(new RegExp(`\\b${wrong}\\b`, 'g'), correct))
  }, [])

  const handleTTS = async () => {
    if (!text.trim() || isSpeaking) return
    setIsSpeaking(true)
    try {
      const res = await api.textToSpeech(text.slice(0, 500))
      const audio = new Audio(`data:audio/mp3;base64,${res.data.audio}`)
      audio.play()
      audio.onended = () => setIsSpeaking(false)
    } catch (e) {
      setIsSpeaking(false)
    }
  }

  const panels = [
    { id: 'spell', label: 'Orthographe', icon: '✏️', count: spellErrors.length },
    { id: 'sentiment', label: 'Sentiment', icon: '😊', count: null },
    { id: 'ner', label: 'Entités', icon: '🏷️', count: entities.length },
    { id: 'chat', label: 'Assistant', icon: '🤖', count: null },
  ]

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-flag">🇲🇬</span>
          <div>
            <h1>Éditeur Malagasy IA</h1>
            <p>Fanaovana lahatsoratra amin'ny fanampin'ny AI</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`btn-tts ${isSpeaking ? 'active' : ''}`}
            onClick={handleTTS}
            disabled={!text.trim()}
            title="Synthèse vocale"
          >
            {isSpeaking ? '🔊 Lecture...' : '🔈 Lire'}
          </button>
          <div className="word-count">{wordCount} mots</div>
          {isAnalyzing && <div className="analyzing-indicator">Analyse en cours...</div>}
        </div>
      </header>

      <div className="app-body">
        {/* Main Editor */}
        <main className="editor-container">
          <div className="editor-wrapper" style={{ position: 'relative' }}>
            <textarea
              ref={editorRef}
              className="main-editor"
              value={text}
              onChange={handleTextChange}
              onContextMenu={handleContextMenu}
              onClick={() => { setContextMenu(null); setAutocompleteSuggestions([]) }}
              placeholder={"Soraty eto ny lahatsoratra malagasy...\n\nClic droit sur un mot pour le traduire et le lemmatiser.\nLes suggestions d'autocomplétion apparaissent pendant la frappe."}
              spellCheck={false}
            />
            {autocompleteSuggestions.length > 0 && (
              <div className="autocomplete-popup">
                <div className="autocomplete-label">Suggestions :</div>
                {autocompleteSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="autocomplete-item"
                    onClick={() => handleAutocompleteSelect(s)}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick stats bar */}
          <div className="stats-bar">
            <span className={`stat-item ${spellErrors.length > 0 ? 'has-errors' : 'no-errors'}`}>
              {spellErrors.length > 0 ? `⚠️ ${spellErrors.length} erreur(s)` : '✅ Aucune erreur'}
            </span>
            {sentiment && (
              <span className={`stat-item sentiment-${sentiment.sentiment}`}>
                Sentiment: {sentiment.sentiment}
              </span>
            )}
            {entities.length > 0 && (
              <span className="stat-item">
                🏷️ {entities.length} entité(s)
              </span>
            )}
          </div>
        </main>

        {/* Right Panel */}
        <aside className="right-panel">
          {/* Panel tabs */}
          <div className="panel-tabs">
            {panels.map(p => (
              <button
                key={p.id}
                className={`panel-tab ${activePanel === p.id ? 'active' : ''}`}
                onClick={() => setActivePanel(p.id)}
              >
                <span>{p.icon}</span>
                <span className="tab-label">{p.label}</span>
                {p.count !== null && p.count > 0 && (
                  <span className="tab-badge">{p.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="panel-content">
            {activePanel === 'spell' && (
              <SpellPanel errors={spellErrors} onCorrect={handleCorrect} />
            )}
            {activePanel === 'sentiment' && (
              <SentimentPanel sentiment={sentiment} />
            )}
            {activePanel === 'ner' && (
              <NERPanel entities={entities} />
            )}
            {activePanel === 'chat' && (
              <ChatbotPanel />
            )}
          </div>
        </aside>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          word={contextMenu.word}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
