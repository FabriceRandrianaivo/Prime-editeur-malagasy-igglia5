import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 })

export const spellCheck = (text) => api.post('/spell/check', { text })
export const spellSuggest = (word) => api.post('/spell/suggest', { word })
export const lemmatize = (word) => api.post('/lemma', { word })
export const autocomplete = (text, partial = null, n = 5) =>
  api.post('/autocomplete', { text, partial, n })
export const translate = (word) => api.post('/translate', { word })
export const analyzeSentiment = (text) => api.post('/sentiment', { text })
export const textToSpeech = (text, lang = 'mg') => api.post('/tts', { text, lang })
export const recognizeEntities = (text) => api.post('/ner', { text })
export const chat = (message, history = []) => api.post('/chat', { message, history })
export const fullAnalysis = (text) => api.post('/analyze/full', { text })
export const scrapeDictionary = (maxRanges = null) => api.post('/scrape/dictionary', { max_ranges: maxRanges })
export const scrapeWiki = (limit = 10) => api.post('/scrape/wiki', { limit })
export const reloadModels = () => api.post('/reload')
