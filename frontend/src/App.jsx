import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import * as api from './services/api'
import { 
  Sparkles, 
  Languages, 
  Activity, 
  MessageSquare, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Send, 
  CheckCircle, 
  AlertCircle,
  User,
  Bot,
  Search,
  BookOpen,
  MousePointer2,
  ChevronRight
} from 'lucide-react'

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
    <div className="context-menu" style={{ position: 'fixed', top: y, left: x, zIndex: 9999 }}>
      <div className="context-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MousePointer2 size={16} />
          <h3>"{word}"</h3>
        </div>
      </div>
      <div className="context-body">
        {loading ? (
          <div className="panel-empty" style={{ padding: '20px' }}>
            <Activity className="animate-spin" size={24} />
            Chargement...
          </div>
        ) : (
          <>
            {translation && (
              <div className="context-section">
                <div className="context-label">Traduction</div>
                <div className="context-content">{translation.translation}</div>
                <div className="context-meta">Source: {translation.source}</div>
              </div>
            )}
            {lemma && (
              <div className="context-section">
                <div className="context-label">Morphologie</div>
                <div className="context-content">
                  Racine: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{lemma.root}</span>
                </div>
                {lemma.prefix && <div className="context-meta">Préfixe: {lemma.prefix}-</div>}
                {lemma.suffix && <div className="context-meta">Suffixe: -{lemma.suffix}</div>}
              </div>
            )}
            {!translation && !lemma && (
              <div className="panel-empty" style={{ padding: '10px' }}>
                Aucune information trouvée
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============ SPELL PANEL ============
function SpellPanel({ errors, onCorrect }) {
  if (!errors || errors.length === 0) {
    return (
      <div className="panel-empty">
        <CheckCircle size={48} color="var(--success)" />
        <p>Hira masina! (Parfait !)<br/>Aucune erreur détectée.</p>
      </div>
    )
  }
  return (
    <div className="spell-panel">
      {errors.map((err, i) => (
        <div key={i} className={`spell-error ${err.type}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="spell-error-word">"{err.word}"</div>
            {err.type === 'phonotactic' ? <AlertCircle size={14} color="var(--warning)" /> : <Trash2 size={14} color="var(--danger)" />}
          </div>
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
  if (!sentiment) return (
    <div className="panel-empty">
      <Activity size={48} />
      <p>Commencez à rédiger pour analyser l'émotion de votre texte.</p>
    </div>
  )

  const config = {
    positif: { emoji: '😊', color: 'var(--success)', label: 'Positif' },
    négatif: { emoji: '😔', color: 'var(--danger)', label: 'Négatif' },
    neutre: { emoji: '😐', color: 'var(--text-muted)', label: 'Neutre' }
  }[sentiment.sentiment] || { emoji: '❓', color: 'var(--text-muted)', label: 'Inconnu' }

  return (
    <div className="sentiment-display">
      <div className="sentiment-card">
        <div className="sentiment-emoji-large">{config.emoji}</div>
        <div className="sentiment-info">
          <div className="sentiment-tag" style={{ color: config.color }}>{config.label}</div>
          <div className="sentiment-score" style={{ marginTop: '4px', fontWeight: 600 }}>
            Confiance: {(sentiment.score * 100).toFixed(0)}%
          </div>
        </div>
        
        <div className="sentiment-bar-container">
          <div className="sentiment-bar-progress" style={{ 
            width: `${sentiment.score * 100}%`, 
            backgroundColor: config.color 
          }} />
        </div>

        <div className="sentiment-stats">
          <div style={{ color: 'var(--success)' }}>+{sentiment.positive_count}</div>
          <div style={{ color: 'var(--danger)' }}>-{sentiment.negative_count}</div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        {sentiment.positive_words.length > 0 && (
          <div className="context-section" style={{ border: 'none' }}>
            <div className="context-label" style={{ color: 'var(--success)' }}>Mots Positifs</div>
            <div className="spell-suggestions">
              {sentiment.positive_words.map((w, i) => (
                <span key={i} className="suggestion-chip" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>{w}</span>
              ))}
            </div>
          </div>
        )}
        {sentiment.negative_words.length > 0 && (
          <div className="context-section" style={{ border: 'none' }}>
            <div className="context-label" style={{ color: 'var(--danger)' }}>Mots Négatifs</div>
            <div className="spell-suggestions">
              {sentiment.negative_words.map((w, i) => (
                <span key={i} className="suggestion-chip" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>{w}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ NER PANEL ============
function NERPanel({ entities }) {
  if (!entities || entities.length === 0)
    return (
      <div className="panel-empty">
        <Languages size={48} />
        <p>Les noms propres, lieux et organisations détectés apparaîtront ici.</p>
      </div>
    )

  const typeConfig = {
    'VILLE': { color: '#3b82f6', icon: <Search size={12} /> },
    'PERSONNE': { color: '#f59e0b', icon: <User size={12} /> },
    'ORGANISATION': { color: '#8b5cf6', icon: <BookOpen size={12} /> },
    'REGION': { color: '#10b981', icon: <Search size={12} /> },
    'ENTITE_INCONNUE': { color: '#6b7280', icon: <AlertCircle size={12} /> }
  }

  return (
    <div className="spell-panel">
      {entities.map((e, i) => (
        <div key={i} className="ner-entity" style={{ padding: '12px' }}>
          <span className="ner-tag" style={{ backgroundColor: typeConfig[e.type]?.color || '#6b7280' }}>
            {e.type}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="ner-text">{e.text}</span>
            {e.canonical && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Forme canonique: {e.canonical}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ CHATBOT PANEL ============
function ChatbotPanel() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Manao ahoana! Je suis votre assistant linguistique. Comment puis-je vous aider aujourd\'hui ?' }
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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolé, une erreur est survenue.' }])
    }
    setLoading(false)
  }

  return (
    <div className="chatbot-container">
      <div className="chat-history">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.role === 'assistant' && <div style={{ fontSize: '0.6rem', marginBottom: '4px', opacity: 0.6 }}>Assistant Malagasy</div>}
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble assistant">
            <Activity className="animate-spin" size={16} />
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>
      <div className="chat-input-area">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Posez une question..."
        />
        <button className="btn-send" onClick={sendMessage} disabled={loading}>
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

// ============ MAIN APP ============
export default function App() {
  const [content, setContent] = useState('')
  const [activePanel, setActivePanel] = useState('spell')
  const [spellErrors, setSpellErrors] = useState([])
  const [sentiment, setSentiment] = useState(null)
  const [entities, setEntities] = useState([])
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([])
  const [autocompletePos, setAutocompletePos] = useState({ top: 0, left: 0 })
  const [contextMenu, setContextMenu] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const quillRef = useRef(null)
  const analysisTimeout = useRef(null)
  const autocompleteTimeout = useRef(null)

  // Use plain text for analysis
  const getPlainText = (html) => {
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const analyzeText = useCallback(async (html) => {
    const t = getPlainText(html)
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

  const handleChange = (value) => {
    setContent(value)
    const text = getPlainText(value)
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)

    // Debounced analysis
    clearTimeout(analysisTimeout.current)
    analysisTimeout.current = setTimeout(() => analyzeText(value), 1200)

    // Autocomplete logic
    clearTimeout(autocompleteTimeout.current)
    autocompleteTimeout.current = setTimeout(async () => {
      if (!quillRef.current) return
      const editor = quillRef.current.getEditor()
      const selection = editor.getSelection()
      
      // If no explicit selection, we can't reliably predict
      if (!selection || selection.length > 0) {
        setAutocompleteSuggestions([])
        return
      }

      const index = selection.index
      const textToCursor = editor.getText(0, index)
      const lastWordMatch = textToCursor.match(/(\w+)$/)
      
      if (lastWordMatch) {
        const lastWord = lastWordMatch[1]
        if (lastWord.length >= 2) {
          try {
            const res = await api.autocomplete(text, lastWord, 5)
            const suggestions = res.data.suggestions || []
            if (suggestions.length > 0) {
              const bounds = editor.getBounds(index)
              setAutocompletePos({ top: bounds.top + 40, left: bounds.left })
              setAutocompleteSuggestions(suggestions)
            } else {
              setAutocompleteSuggestions([])
            }
          } catch {
            setAutocompleteSuggestions([])
          }
          return
        }
      }
      setAutocompleteSuggestions([])
    }, 350)
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    if (!quillRef.current) return
    
    const editor = quillRef.current.getEditor()
    // Convert click coordinates to index
    const range = document.caretRangeFromPoint(e.clientX, e.clientY)
    if (range) {
      const textNode = range.startContainer
      if (textNode.nodeType === Node.TEXT_NODE) {
        const offset = range.startOffset
        const textValue = textNode.textContent
        let start = offset, end = offset
        while (start > 0 && /\w/.test(textValue[start-1])) start--
        while (end < textValue.length && /\w/.test(textValue[end])) end++
        const clickedWord = textValue.slice(start, end)
        
        if (clickedWord) {
          setContextMenu({ x: e.clientX, y: e.clientY, word: clickedWord })
        }
      }
    }
  }

  const handleAutocompleteSelect = (suggestion) => {
    if (!quillRef.current) return
    const editor = quillRef.current.getEditor()
    const selection = editor.getSelection(true) // force focus
    if (!selection) return

    const index = selection.index
    const textToCursor = editor.getText(0, index)
    const lastWordMatch = textToCursor.match(/(\w+)$/)
    
    if (lastWordMatch) {
      const lastWord = lastWordMatch[1]
      const startIndex = index - lastWord.length
      editor.deleteText(startIndex, lastWord.length)
      editor.insertText(startIndex, suggestion + ' ')
      editor.setSelection(startIndex + suggestion.length + 1)
    }
    setAutocompleteSuggestions([])
  }

  const handleCorrect = (wrong, correct) => {
    setContent(prev => prev.replace(new RegExp(`${wrong}`, 'g'), correct))
  }

  const handleTTS = async () => {
    const text = getPlainText(content)
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

  const clearEditor = () => {
    if (window.confirm('Effacer tout le texte ?')) {
      setContent('')
      setSpellErrors([])
      setSentiment(null)
      setEntities([])
    }
  }

  const panels = [
    { id: 'spell', label: 'Correction', icon: <Sparkles />, count: spellErrors.length },
    { id: 'sentiment', label: 'Sentiment', icon: <Activity />, count: null },
    { id: 'ner', label: 'Entités', icon: <Languages />, count: entities.length },
    { id: 'chat', label: 'Assistant', icon: <MessageSquare />, count: null },
  ]

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  }), [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-logo">
          <div className="logo-container">
            <span className="logo-flag">🇲🇬</span>
          </div>
          <div className="header-titles">
            <h1>Éditeur Malagasy IA</h1>
            <p>Intelligence Linguistique pour la Langue Malagasy</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className={`btn-premium ${isSpeaking ? 'active' : ''}`}
            onClick={handleTTS}
            disabled={!content.trim()}
          >
            {isSpeaking ? <VolumeX size={18}/> : <Volume2 size={18}/>}
            <span>{isSpeaking ? 'Arrêter' : 'Lecture'}</span>
          </button>
          <button className="btn-premium" onClick={clearEditor} title="Tout effacer">
            <Trash2 size={18} color="var(--danger)" />
          </button>
          <div className="word-count-pill">{wordCount} mots</div>
        </div>
      </header>

      <div className="app-body">
        <main className="editor-container">
          <div className="editor-wrapper" onContextMenu={handleContextMenu} onClick={() => { setContextMenu(null); setAutocompleteSuggestions([]) }}>
            <ReactQuill 
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={handleChange}
              modules={quillModules}
              placeholder="Atombohy eto ny fanoratana (Commencez à écrire ici...)"
            />
            
            {autocompleteSuggestions.length > 0 && (
              <div className="autocomplete-popup" style={{ top: autocompletePos.top, left: autocompletePos.left }}>
                <div className="autocomplete-label">Suggestions</div>
                {autocompleteSuggestions.map((s, i) => (
                  <div key={i} className="autocomplete-item" onClick={() => handleAutocompleteSelect(s)}>
                    <ChevronRight size={14} opacity={0.5} />
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="editor-stats">
            <div className={`status-pill ${spellErrors.length > 0 ? 'error' : 'success'}`}>
              {spellErrors.length > 0 ? <AlertCircle size={14}/> : <CheckCircle size={14}/>}
              {spellErrors.length > 0 ? `${spellErrors.length} suggestion(s)` : 'Texte valide'}
            </div>
            {isAnalyzing && (
              <div className="status-pill">
                <Activity className="animate-spin" size={14}/>
                Analyse...
              </div>
            )}
          </div>
        </main>

        <aside className="right-panel">
          <div className="panel-tabs">
            {panels.map(p => (
              <button
                key={p.id}
                className={`panel-tab ${activePanel === p.id ? 'active' : ''}`}
                onClick={() => setActivePanel(p.id)}
              >
                {p.icon}
                <span className="tab-label">{p.label}</span>
                {p.count > 0 && <span className="tab-badge">{p.count}</span>}
              </button>
            ))}
          </div>

          <div className="panel-content">
            {activePanel === 'spell' && <SpellPanel errors={spellErrors} onCorrect={handleCorrect} />}
            {activePanel === 'sentiment' && <SentimentPanel sentiment={sentiment} />}
            {activePanel === 'ner' && <NERPanel entities={entities} />}
            {activePanel === 'chat' && <ChatbotPanel />}
          </div>
        </aside>
      </div>

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
