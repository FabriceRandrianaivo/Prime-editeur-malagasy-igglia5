import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import * as api from './services/api'
import {
  Sparkles, Languages, Activity, MessageSquare,
  Volume2, VolumeX, Trash2, Send, CheckCircle, AlertCircle,
  User, ChevronRight, Wand2, X, BookOpen, MapPin,
  Building2, HelpCircle, Zap, ArrowRight, Bot,
  Type, Hash, Lightbulb
} from 'lucide-react'

const TIPS = [
  { text: "Ecrivez en malagasy - la correction orthographique est automatique" },
  { text: "Tapez 2+ lettres pour voir des suggestions d'autocompletion" },
  { text: "Clic droit sur un mot pour obtenir traduction + morphologie" },
  { text: "Bouton Ecouter pour entendre votre texte prononce en malagasy" },
  { text: "L'assistant IA repond a vos questions de grammaire et conjugaison" },
]

function TipsBanner({ onDismiss }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % TIPS.length), 4000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="tips-banner">
      <Lightbulb size={14} className="tips-icon" />
      <span className="tips-text">{TIPS[idx].text}</span>
      <button className="tips-close" onClick={onDismiss}><X size={14} /></button>
    </div>
  )
}

function ContextMenu({ x, y, word, onClose, onAskChatbot }) {
  const [translation, setTranslation] = useState(null)
  const [lemma, setLemma] = useState(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!word) return
    setLoading(true)
    setTranslation(null)
    setLemma(null)
    Promise.all([
      api.translate(word).catch(() => null),
      api.lemmatize(word).catch(() => null)
    ]).then(([transRes, lemmaRes]) => {
      if (transRes) setTranslation(transRes.data)
      if (lemmaRes) setLemma(lemmaRes.data)
      setLoading(false)
    })
  }, [word])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const style = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 320),
    left: Math.min(x, window.innerWidth - 300),
    zIndex: 9999
  }

  return (
    <div className="context-menu" style={style} ref={ref}>
      <div className="context-header">
        <span className="context-word">{word}</span>
        <button className="context-close" onClick={onClose}><X size={14} /></button>
      </div>
      <div className="context-body">
        {loading ? (
          <div className="ctx-loading">
            <Activity size={18} className="spin" /> Recherche...
          </div>
        ) : (
          <>
            {translation && translation.translation !== 'Traduction non trouvee' && (
              <div className="ctx-section">
                <div className="ctx-label"><Languages size={12} /> Traduction</div>
                <div className="ctx-value">{translation.translation}</div>
                <div className="ctx-source">{translation.source}</div>
              </div>
            )}
            {lemma && (
              <div className="ctx-section">
                <div className="ctx-label"><BookOpen size={12} /> Morphologie</div>
                <div className="ctx-morph">
                  {lemma.prefix && <span className="morph-tag prefix">{lemma.prefix}-</span>}
                  <span className="morph-tag root">{lemma.root}</span>
                  {lemma.suffix && <span className="morph-tag suffix">-{lemma.suffix}</span>}
                </div>
                {lemma.voice && <div className="ctx-source">Voix: {lemma.voice}</div>}
              </div>
            )}
            <button
              className="ctx-ask-btn"
              onClick={() => {
                onAskChatbot('Explique le mot malagasy "' + word + '" : sens, usage et exemples.')
                onClose()
              }}
            >
              <MessageSquare size={14} /> Demander a l'assistant
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ErrorCard({ err, onCorrect }) {
  return (
    <div className={'spell-error ' + err.type}>
      <div className="spell-error-top">
        <span className="spell-word">{err.word}</span>
        <span className={'err-badge ' + err.type}>
          {err.type === 'phonotactic' ? 'Phonotactique' : 'Orthographe'}
        </span>
      </div>
      <div className="spell-msg">{err.error}</div>
      {err.suggestions && err.suggestions.length > 0 && (
        <div className="suggestions-row">
          {err.suggestions.slice(0, 4).map((s, j) => (
            <button key={j} className="chip-suggestion" onClick={() => onCorrect(err.word, s)}>
              {s} <ArrowRight size={11} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SpellPanel({ errors, onCorrect, onCorrectAll }) {
  if (!errors || errors.length === 0) {
    return (
      <div className="panel-empty">
        <CheckCircle size={52} color="var(--success)" />
        <strong>Hira masina !</strong>
        <p>Aucune erreur detectee dans votre texte.</p>
      </div>
    )
  }
  const phonotactic = errors.filter(e => e.type === 'phonotactic')
  const spelling = errors.filter(e => e.type === 'spelling')
  return (
    <div className="spell-panel">
      <div className="spell-header">
        <span className="spell-count">{errors.length} probleme{errors.length > 1 ? 's' : ''}</span>
        {spelling.length > 0 && (
          <button className="btn-fix-all" onClick={onCorrectAll}>
            <Wand2 size={14} /> Corriger tout
          </button>
        )}
      </div>
      {phonotactic.length > 0 && (
        <div className="spell-group">
          <div className="spell-group-title">
            <AlertCircle size={13} color="var(--warning)" /> Phonotactique ({phonotactic.length})
          </div>
          {phonotactic.map((err, i) => <ErrorCard key={i} err={err} onCorrect={onCorrect} />)}
        </div>
      )}
      {spelling.length > 0 && (
        <div className="spell-group">
          <div className="spell-group-title">
            <Sparkles size={13} color="var(--danger)" /> Orthographe ({spelling.length})
          </div>
          {spelling.map((err, i) => <ErrorCard key={i} err={err} onCorrect={onCorrect} />)}
        </div>
      )}
    </div>
  )
}

function SentimentPanel({ sentiment }) {
  if (!sentiment) return (
    <div className="panel-empty">
      <Activity size={52} color="var(--text-muted)" />
      <strong>Analyse de sentiment</strong>
      <p>Redigez du texte pour voir l'emotion dominante.</p>
    </div>
  )
  const cfgMap = {
    positif: { emoji: '😊', color: '#10b981', label: 'Positif', bg: '#f0fdf4' },
    negatif: { emoji: '😔', color: '#ef4444', label: 'Negatif', bg: '#fef2f2' },
    neutre:  { emoji: '😐', color: '#64748b', label: 'Neutre',  bg: '#f8fafc' },
  }
  const cfg = cfgMap[sentiment.sentiment] || { emoji: '?', color: '#64748b', label: '?', bg: '#f8fafc' }
  const pct = Math.round(sentiment.score * 100)
  return (
    <div className="sentiment-wrap">
      <div className="sentiment-hero" style={{ background: cfg.bg, borderColor: cfg.color + '40' }}>
        <span className="sent-emoji">{cfg.emoji}</span>
        <div>
          <div className="sent-label" style={{ color: cfg.color }}>{cfg.label}</div>
          <div className="sent-confidence">Confiance {pct}%</div>
        </div>
      </div>
      <div className="sent-bar-wrap">
        <span className="bar-side neg">Negatif</span>
        <div className="sent-bar-track">
          <div className="sent-bar-fill" style={{ width: pct + '%', background: cfg.color }} />
        </div>
        <span className="bar-side pos">Positif</span>
      </div>
      <div className="sent-stats">
        <div className="sent-stat pos"><span>{sentiment.positive_count}</span><small>positifs</small></div>
        <div className="sent-stat neg"><span>{sentiment.negative_count}</span><small>negatifs</small></div>
        <div className="sent-stat neu"><span>{sentiment.total_words}</span><small>total</small></div>
      </div>
      {(sentiment.positive_words.length > 0 || sentiment.negative_words.length > 0) && (
        <div className="sent-words">
          {sentiment.positive_words.length > 0 && (
            <div>
              <div className="sent-words-label pos">Mots positifs</div>
              <div className="chips-row">
                {sentiment.positive_words.map((w, i) => <span key={i} className="chip pos">{w}</span>)}
              </div>
            </div>
          )}
          {sentiment.negative_words.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div className="sent-words-label neg">Mots negatifs</div>
              <div className="chips-row">
                {sentiment.negative_words.map((w, i) => <span key={i} className="chip neg">{w}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const NER_CFG = {
  VILLE:          { label: 'Villes',        color: '#3b82f6', Icon: MapPin },
  REGION:         { label: 'Regions',       color: '#10b981', Icon: MapPin },
  PERSONNE:       { label: 'Personnes',     color: '#f59e0b', Icon: User },
  ORGANISATION:   { label: 'Organisations', color: '#8b5cf6', Icon: Building2 },
  ENTITE_INCONNUE:{ label: 'Entites',       color: '#64748b', Icon: HelpCircle },
}

function NERPanel({ entities }) {
  if (!entities || entities.length === 0) return (
    <div className="panel-empty">
      <Languages size={52} color="var(--text-muted)" />
      <strong>Entites nommees</strong>
      <p>Noms de villes, personnes et organisations detectes ici.</p>
    </div>
  )
  const groups = entities.reduce((acc, e) => {
    if (!acc[e.type]) acc[e.type] = []
    acc[e.type].push(e)
    return acc
  }, {})
  return (
    <div className="ner-wrap">
      {Object.entries(groups).map(([type, items]) => {
        const cfg = NER_CFG[type] || NER_CFG.ENTITE_INCONNUE
        const { Icon } = cfg
        return (
          <div key={type} className="ner-group">
            <div className="ner-group-header" style={{ color: cfg.color }}>
              <Icon size={14} /> {cfg.label} <span className="ner-count">{items.length}</span>
            </div>
            <div className="ner-chips">
              {items.map((e, i) => (
                <span
                  key={i}
                  className="ner-chip"
                  style={{ borderColor: cfg.color + '50', color: cfg.color, background: cfg.color + '0d' }}
                >
                  {e.text}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const QUICK_QUESTIONS = [
  'Conjugue le verbe "mandeha" au passe',
  'Quelle est la regle VSO en malagasy ?',
  'Donne-moi 5 synonymes de "tsara"',
  'Explique les prefixes mi-, ma-, man-',
  'Comment dire merci de differentes facons ?',
]

function ChatbotPanel({ initialMessage }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Manao ahoana ! Je suis votre assistant linguistique malagasy.\nPosez-moi une question sur la grammaire, les conjugaisons, les synonymes ou la culture malagasy.'
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)
  const sentRef = useRef(false)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (initialMessage && !sentRef.current) {
      sentRef.current = true
      sendMsg(initialMessage)
    }
  }, [initialMessage])

  const sendMsg = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await api.chat(msg, history)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erreur de connexion. Verifiez que ANTHROPIC_API_KEY est defini dans backend/.env puis redemarrez le serveur.'
      }])
    }
    setLoading(false)
  }

  return (
    <div className="chat-wrap">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={'chat-row ' + m.role}>
            {m.role === 'assistant' && <div className="chat-avatar"><Bot size={14} /></div>}
            <div className="chat-bubble">
              {m.content.split('\n').map((line, j, arr) => (
                <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-row assistant">
            <div className="chat-avatar"><Bot size={14} /></div>
            <div className="chat-bubble typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="quick-questions">
          <div className="quick-label"><Lightbulb size={12} /> Questions rapides</div>
          {QUICK_QUESTIONS.map((q, i) => (
            <button key={i} className="quick-btn" onClick={() => sendMsg(q)}>
              <ChevronRight size={11} /> {q}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMsg()}
          placeholder="Posez une question sur le malagasy..."
        />
        <button className="btn-send" onClick={() => sendMsg()} disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [content, setContent] = useState('')
  const [activePanel, setActivePanel] = useState('spell')
  const [spellErrors, setSpellErrors] = useState([])
  const [sentiment, setSentiment] = useState(null)
  const [entities, setEntities] = useState([])
  const [autoSuggestions, setAutoSuggestions] = useState([])
  const [autoPos, setAutoPos] = useState({ top: 0, left: 0 })
  const [contextMenu, setContextMenu] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showTips, setShowTips] = useState(true)
  const [chatMsg, setChatMsg] = useState(null)

  const quillRef = useRef(null)
  const analysisTimeout = useRef(null)
  const autocompleteTimeout = useRef(null)

  const getPlainText = (html) => {
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const analyzeText = useCallback(async (html) => {
    const t = getPlainText(html)
    if (!t.trim()) { setSpellErrors([]); setSentiment(null); setEntities([]); return }
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
    } catch {}
    setIsAnalyzing(false)
  }, [])

  const handleChange = (value) => {
    setContent(value)
    const text = getPlainText(value)
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
    setCharCount(text.length)
    clearTimeout(analysisTimeout.current)
    analysisTimeout.current = setTimeout(() => analyzeText(value), 1000)
    clearTimeout(autocompleteTimeout.current)
    autocompleteTimeout.current = setTimeout(async () => {
      if (!quillRef.current) return
      const editor = quillRef.current.getEditor()
      const sel = editor.getSelection()
      if (!sel || sel.length > 0) { setAutoSuggestions([]); return }
      const textToCursor = editor.getText(0, sel.index)
      const match = textToCursor.match(/(\w+)$/)
      if (match && match[1].length >= 2) {
        try {
          const res = await api.autocomplete(text, match[1], 5)
          const suggs = res.data.suggestions || []
          if (suggs.length > 0) {
            const bounds = editor.getBounds(sel.index)
            setAutoPos({ top: bounds.top + 38, left: bounds.left })
            setAutoSuggestions(suggs)
          } else setAutoSuggestions([])
        } catch { setAutoSuggestions([]) }
      } else setAutoSuggestions([])
    }, 350)
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    if (!quillRef.current) return
    const range = document.caretRangeFromPoint(e.clientX, e.clientY)
    if (range && range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
      const tv = range.startContainer.textContent
      let s = range.startOffset
      let en = range.startOffset
      while (s > 0 && /\w/.test(tv[s - 1])) s--
      while (en < tv.length && /\w/.test(tv[en])) en++
      const w = tv.slice(s, en)
      if (w.length > 1) setContextMenu({ x: e.clientX, y: e.clientY, word: w })
    }
  }

  const handleAutoSelect = (sugg) => {
    if (!quillRef.current) return
    const editor = quillRef.current.getEditor()
    const sel = editor.getSelection(true)
    if (!sel) return
    const textToCursor = editor.getText(0, sel.index)
    const match = textToCursor.match(/(\w+)$/)
    if (match) {
      const start = sel.index - match[1].length
      editor.deleteText(start, match[1].length)
      editor.insertText(start, sugg + ' ')
      editor.setSelection(start + sugg.length + 1)
    }
    setAutoSuggestions([])
  }

  const handleCorrect = (wrong, correct) => {
    if (!quillRef.current) return
    const editor = quillRef.current.getEditor()
    const text = editor.getText()
    const idx = text.search(new RegExp('\\b' + wrong + '\\b', 'i'))
    if (idx >= 0) {
      editor.deleteText(idx, wrong.length)
      editor.insertText(idx, correct)
    }
  }

  const handleCorrectAll = () => {
    spellErrors
      .filter(e => e.type === 'spelling' && e.suggestions && e.suggestions.length > 0)
      .forEach(err => handleCorrect(err.word, err.suggestions[0]))
  }

  const handleTTS = async () => {
    const text = getPlainText(content)
    if (!text.trim() || isSpeaking) return
    setIsSpeaking(true)
    try {
      const res = await api.textToSpeech(text.slice(0, 500))
      const audio = new Audio('data:audio/mp3;base64,' + res.data.audio)
      audio.play()
      audio.onended = () => setIsSpeaking(false)
    } catch { setIsSpeaking(false) }
  }

  const clearEditor = () => {
    if (!content.trim() || window.confirm('Effacer tout le texte ?')) {
      setContent('')
      setSpellErrors([])
      setSentiment(null)
      setEntities([])
    }
  }

  const handleAskChatbot = (msg) => {
    setActivePanel('chat')
    setChatMsg(msg)
    setTimeout(() => setChatMsg(null), 500)
  }

  const panels = [
    { id: 'spell',     label: 'Correction', icon: <Sparkles size={17} />,      badge: spellErrors.length },
    { id: 'sentiment', label: 'Sentiment',  icon: <Activity size={17} />,      badge: 0 },
    { id: 'ner',       label: 'Entites',    icon: <Languages size={17} />,     badge: entities.length },
    { id: 'chat',      label: 'Assistant',  icon: <MessageSquare size={17} />, badge: 0 },
  ]

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean']
    ],
  }), [])

  return (
    <div className="app" onClick={() => { setContextMenu(null); setAutoSuggestions([]) }}>

      <header className="app-header">
        <div className="header-left">
          <span className="logo-flag">🇲🇬</span>
          <div>
            <h1 className="app-title">Editeur Malagasy IA</h1>
            <p className="app-subtitle">Intelligence Linguistique</p>
          </div>
        </div>
        {showTips && (
          <div className="header-center">
            <TipsBanner onDismiss={() => setShowTips(false)} />
          </div>
        )}
        <div className="header-right">
          <button
            className={'btn-header' + (isSpeaking ? ' speaking' : '')}
            onClick={handleTTS}
            disabled={!content.trim()}
          >
            {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isSpeaking ? 'Arreter' : 'Ecouter'}</span>
          </button>
          <button className="btn-header ghost" onClick={clearEditor} disabled={!content.trim()} title="Effacer tout">
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      <div className="app-body">
        <main className="editor-area">
          <div className="editor-box" onContextMenu={handleContextMenu} onClick={e => e.stopPropagation()}>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={handleChange}
              modules={quillModules}
              placeholder="Atombohy eto ny fanoratana... (Commencez a ecrire en malagasy)"
            />
            {autoSuggestions.length > 0 && (
              <div
                className="autocomplete-popup"
                style={{ top: autoPos.top, left: autoPos.left }}
                onClick={e => e.stopPropagation()}
              >
                <div className="ac-label"><Zap size={11} /> Suggestions</div>
                {autoSuggestions.map((s, i) => (
                  <div key={i} className="ac-item" onClick={() => handleAutoSelect(s)}>
                    <ChevronRight size={12} opacity={0.4} /> {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="status-bar">
            <div className="status-left">
              <span className={'status-pill ' + (spellErrors.length > 0 ? 'err' : 'ok')}>
                {spellErrors.length > 0
                  ? <><AlertCircle size={12} /> {spellErrors.length} erreur{spellErrors.length > 1 ? 's' : ''}</>
                  : <><CheckCircle size={12} /> Texte valide</>
                }
              </span>
              {isAnalyzing && (
                <span className="status-pill analyzing">
                  <Activity size={12} className="spin" /> Analyse...
                </span>
              )}
            </div>
            <div className="status-right">
              <span><Type size={11} /> {wordCount} mots</span>
              <span><Hash size={11} /> {charCount} car.</span>
              <span className="status-hint"><HelpCircle size={11} /> Clic droit sur un mot</span>
            </div>
          </div>
        </main>

        <aside className="right-panel">
          <div className="panel-tabs">
            {panels.map(p => (
              <button
                key={p.id}
                className={'panel-tab' + (activePanel === p.id ? ' active' : '')}
                onClick={() => setActivePanel(p.id)}
              >
                {p.icon}
                <span>{p.label}</span>
                {p.badge > 0 && <span className="tab-badge">{p.badge}</span>}
              </button>
            ))}
          </div>
          <div className="panel-body">
            {activePanel === 'spell'     && <SpellPanel errors={spellErrors} onCorrect={handleCorrect} onCorrectAll={handleCorrectAll} />}
            {activePanel === 'sentiment' && <SentimentPanel sentiment={sentiment} />}
            {activePanel === 'ner'       && <NERPanel entities={entities} />}
            {activePanel === 'chat'      && <ChatbotPanel initialMessage={chatMsg} />}
          </div>
        </aside>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y} word={contextMenu.word}
          onClose={() => setContextMenu(null)}
          onAskChatbot={handleAskChatbot}
        />
      )}
    </div>
  )
}
