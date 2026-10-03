import { writable, get } from 'svelte/store'
import type { Announcement, Cue, CueStatus, DeskState, Reminder, Session, Speaker, Term, Venue, VenueTransfer } from './types'

const STORAGE_KEY = 'conference-cue-desk-v1'
const STATE_VERSION = 2
const MAIN_VENUE_ID = 'venue-main'

export const venues: Venue[] = [
  { id: 'venue-main', name: '主会场', kind: 'main' },
  { id: 'venue-b', name: '分会场 B', kind: 'breakout' },
  { id: 'venue-c', name: '分会场 C', kind: 'breakout' }
]

const speakers: Speaker[] = [
  { id: 'sp-1', name: 'Dr. Maya Chen', title: '首席气候科学家', language: '英语 → 中文', color: '#0f766e' },
  { id: 'sp-2', name: '刘启明', title: '城市韧性研究员', language: '中文 → 英语', color: '#b45309' },
  { id: 'sp-3', name: 'Prof. Daniel Ortiz', title: '公共卫生政策顾问', language: '西班牙语 → 中文', color: '#6d28d9' },
  { id: 'sp-4', name: '佐藤 美咲', title: '社区能源设计师', language: '日语 → 中文', color: '#be123c' }
]
const sessions: Session[] = [
  { id: 'se-1', order: 1, time: '09:00', title: '开幕式与议程说明', speakerId: 'sp-2', venueId: 'venue-main', status: 'done' },
  { id: 'se-2', order: 2, time: '09:20', title: '城市热岛与适应性基础设施', speakerId: 'sp-1', venueId: 'venue-main', status: 'live' },
  { id: 'se-3', order: 3, time: '09:30', title: '社区健康数据的地方行动', speakerId: 'sp-3', venueId: 'venue-b', status: 'live' },
  { id: 'se-4', order: 4, time: '09:40', title: '分布式能源与社区共治', speakerId: 'sp-4', venueId: 'venue-c', status: 'live' },
  { id: 'se-5', order: 5, time: '10:45', title: '圆桌：跨会场问答与总结', speakerId: 'sp-2', venueId: 'venue-main', status: 'upcoming' }
]
const terms: Term[] = [
  { id: 'term-1', source: 'urban heat island', target: '城市热岛', note: '首次出现完整译出，后可简称热岛', speakerId: 'sp-1', priority: 'high' },
  { id: 'term-2', source: 'resilience', target: '韧性', note: '不使用“恢复力”', speakerId: 'sp-1', priority: 'high' },
  { id: 'term-3', source: 'co-benefit', target: '协同效益', note: '环境与健康共同收益', speakerId: 'sp-1', priority: 'normal' },
  { id: 'term-4', source: 'distributed energy resource', target: '分布式能源资源', note: '缩写 DER', speakerId: 'sp-4', priority: 'high' },
  { id: 'term-5', source: 'health equity', target: '健康公平', note: '不译为健康平等', speakerId: 'sp-3', priority: 'high' }
]
function initialCues(): Cue[] {
  const now = Date.now()
  return [
    { id: 'cue-101', sessionId: 'se-2', venueId: 'venue-main', speakerId: 'sp-1', text: 'The urban heat island effect is not evenly distributed across a city.', receivedAt: now - 36000, status: 'confirmed', manual: false, offline: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['城市热岛'] },
    { id: 'cue-102', sessionId: 'se-2', venueId: 'venue-main', speakerId: 'sp-1', text: 'Neighborhoods with less tree canopy can be several degrees warmer at night.', receivedAt: now - 19000, status: 'confirmed', manual: false, offline: false, delaySeconds: 6, duplicateOf: null, followupText: '补译：“夜间温差可达数摄氏度。”', tags: ['树冠覆盖率'] },
    { id: 'cue-103', sessionId: 'se-2', venueId: 'venue-main', speakerId: 'sp-1', text: 'Our resilience strategy links cooling corridors with public health investments.', receivedAt: now - 9000, status: 'pending', manual: false, offline: false, delaySeconds: 11, duplicateOf: null, followupText: '', tags: ['韧性', '协同效益'] },
    { id: 'cue-104', sessionId: 'se-2', venueId: 'venue-main', speakerId: 'sp-1', text: 'That data also reveals health equity gaps between districts.', receivedAt: now - 2500, status: 'pending', manual: false, offline: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['健康公平'] },
    { id: 'cue-201', sessionId: 'se-3', venueId: 'venue-b', speakerId: 'sp-3', text: 'Los trabajadores de salud comunitaria recopilan datos de temperatura y salud respiratoria.', receivedAt: now - 15000, status: 'confirmed', manual: false, offline: false, delaySeconds: 5, duplicateOf: null, followupText: '', tags: [] },
    { id: 'cue-202', sessionId: 'se-3', venueId: 'venue-b', speakerId: 'sp-3', text: 'La equidad en salud debe guiar la asignación de recursos locales.', receivedAt: now - 4000, status: 'pending', manual: false, offline: false, delaySeconds: 3, duplicateOf: null, followupText: '', tags: [] },
    { id: 'cue-301', sessionId: 'se-4', venueId: 'venue-c', speakerId: 'sp-4', text: '地域エネルギーの共治には、住民参加の仕組みが不可欠です。', receivedAt: now - 12000, status: 'confirmed', manual: false, offline: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['分布式能源资源'] }
  ]
}
function demoState(): DeskState {
  return {
    version: STATE_VERSION,
    speakers, sessions, terms, cues: initialCues(), reminders: [], transfers: [],
    currentVenueId: MAIN_VENUE_ID, activeCueId: 'cue-103', fontScale: 100,
    announcements: [
      { id: 'ann-1', level: 'info', text: '十点整有消防联动测试，请提醒会场人员保持镇定。', visibleOnStage: false, createdAt: new Date().toISOString() },
      { id: 'ann-2', level: 'urgent', text: '请下一位发言人提前到侧台候场。', visibleOnStage: false, createdAt: new Date().toISOString() }
    ],
    online: true, liveSimulation: true, updatedAt: new Date().toISOString()
  }
}
function clone<T>(value: T): T { return structuredClone(value) }

// 旧数据没有记录会场归属：打开时先按 发言人 → 场次 → 会场 回填，再启用
function migrateState(raw: DeskState): DeskState {
  const state: DeskState = { ...demoState(), ...raw }
  state.sessions = state.sessions.map(session => {
    if (session.venueId) return session
    const room = String((session as unknown as { room?: string }).room || '')
    const venueId = room.includes('分会场 C') ? 'venue-c' : room.includes('分会场') ? 'venue-b' : MAIN_VENUE_ID
    const rest = { ...session } as Session & { room?: string }
    delete rest.room
    return { ...rest, venueId }
  })
  state.cues = state.cues.map(cue => {
    if (cue.venueId && typeof cue.sessionId === 'string') return cue
    const session = state.sessions.find(item => item.speakerId === cue.speakerId)
    return { ...cue, sessionId: cue.sessionId || session?.id || '', venueId: cue.venueId || session?.venueId || MAIN_VENUE_ID }
  })
  state.transfers = state.transfers || []
  state.currentVenueId = state.currentVenueId || MAIN_VENUE_ID
  if (!state.cues.some(cue => cue.id === state.activeCueId)) state.activeCueId = state.cues.at(-1)?.id || ''
  state.version = STATE_VERSION
  return state
}
function loadState(): DeskState {
  if (typeof localStorage === 'undefined') return demoState()
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return demoState()
    const state = migrateState({ ...JSON.parse(saved), online: navigator.onLine })
    persist(state)
    return state
  } catch { return demoState() }
}
const history: DeskState[] = []
const future: DeskState[] = []
export const desk = writable<DeskState>(loadState())

function persist(state: DeskState) {
  state.updatedAt = new Date().toISOString()
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
function commit(recipe: (state: DeskState) => void) {
  const current = clone(get(desk))
  const next = clone(current)
  recipe(next)
  history.push(current)
  if (history.length > 60) history.shift()
  future.length = 0
  persist(next)
  desk.set(next)
}
export function undoDesk() {
  const previous = history.pop()
  if (!previous) return
  future.push(clone(get(desk)))
  desk.set(previous); persist(previous)
}
export function redoDesk() {
  const next = future.pop()
  if (!next) return
  history.push(clone(get(desk)))
  desk.set(next); persist(next)
}
export const canUndo = () => history.length > 0
export const canRedo = () => future.length > 0

export function addSpeaker() {
  commit(state => state.speakers.push({ id: `sp-${Date.now()}`, name: '新发言人', title: '待填写机构与职务', language: '待设置语言方向', color: '#475569' }))
}
export function updateSpeaker(id: string, patch: Partial<Speaker>) { commit(state => { const item = state.speakers.find(row => row.id === id); if (item) Object.assign(item, patch) }) }
export function addSession() {
  commit(state => state.sessions.push({ id: `se-${Date.now()}`, order: Math.max(0, ...state.sessions.map(item => item.order)) + 1, time: '11:30', title: '新演讲', speakerId: state.speakers[0]?.id || '', venueId: MAIN_VENUE_ID, status: 'upcoming' }))
}
export function updateSession(id: string, patch: Partial<Session>) {
  commit(state => {
    const item = state.sessions.find(row => row.id === id)
    if (!item) return
    const fromVenueId = item.venueId
    Object.assign(item, patch)
    // 主控调整场次归属：未确认条目跟到新会场，已上屏段落留在原会场
    if (patch.venueId && patch.venueId !== fromVenueId) {
      state.cues.forEach(cue => {
        if (cue.sessionId === id && cue.venueId === fromVenueId && cue.status !== 'confirmed') cue.venueId = patch.venueId as string
      })
    }
  })
}
export function addTerm() { commit(state => state.terms.push({ id: `term-${Date.now()}`, source: 'new term', target: '新术语', note: '', speakerId: state.speakers[0]?.id || '', priority: 'normal' })) }
export function updateTerm(id: string, patch: Partial<Term>) { commit(state => { const item = state.terms.find(row => row.id === id); if (item) Object.assign(item, patch) }) }
export function addAnnouncement(text: string, level: Announcement['level']) {
  if (!text.trim()) return
  commit(state => state.announcements.unshift({ id: `ann-${Date.now()}`, level, text: text.trim(), visibleOnStage: false, createdAt: new Date().toISOString() }))
}
export function publishAnnouncement(id: string, visible: boolean) { commit(state => { const item = state.announcements.find(row => row.id === id); if (item) item.visibleOnStage = visible }) }

export function setOnline(online: boolean) {
  commit(state => {
    state.online = online
    if (online) {
      state.cues.forEach(cue => {
        if (cue.offline) {
          cue.offline = false
          const duplicate = findDuplicate(cue.text, state.cues.filter(item => item.id !== cue.id && !item.offline && item.venueId === cue.venueId))
          cue.duplicateOf = duplicate?.id || null
        }
      })
    }
  })
}
export function setLiveSimulation(enabled: boolean) { commit(state => { state.liveSimulation = enabled }) }
export function setActiveCue(id: string) { commit(state => { state.activeCueId = id }) }
export function moveCue(direction: 1 | -1) {
  const state = get(desk)
  const queue = state.cues.filter(item => item.venueId === state.currentVenueId)
  const index = queue.findIndex(item => item.id === state.activeCueId)
  const next = queue[index + direction]
  if (next) setActiveCue(next.id)
}
export function setFontScale(scale: number) { commit(state => { state.fontScale = Math.min(150, Math.max(85, scale)) }) }

function recordTransfer(state: DeskState, transfer: VenueTransfer) {
  state.transfers.unshift(transfer)
  if (state.transfers.length > 20) state.transfers.length = 20
}
function applyTransfer(state: DeskState, fromVenueId: string, toVenueId: string) {
  const activeMoves = state.cues.some(cue => cue.id === state.activeCueId && cue.venueId === fromVenueId && cue.status !== 'confirmed')
  state.cues.forEach(cue => {
    if (cue.venueId === fromVenueId && cue.status !== 'confirmed') cue.venueId = toVenueId
  })
  if (state.currentVenueId === fromVenueId) {
    state.currentVenueId = toVenueId
    if (!activeMoves) {
      const queue = state.cues.filter(cue => cue.venueId === toVenueId)
      state.activeCueId = (queue.find(cue => cue.status !== 'confirmed') || queue.at(-1))?.id || ''
    }
  }
}
// 译员转场：未确认条目跟着走，已上屏段落留在原会场；离线时记录失败，可事后重试
export function transferToVenue(targetVenueId: string): { ok: boolean; moved: number; kept: number } {
  const state = get(desk)
  const fromVenueId = state.currentVenueId
  if (targetVenueId === fromVenueId) return { ok: true, moved: 0, kept: 0 }
  const movable = state.cues.filter(cue => cue.venueId === fromVenueId && cue.status !== 'confirmed').length
  const kept = state.cues.filter(cue => cue.venueId === fromVenueId && cue.status === 'confirmed').length
  const id = `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  if (!state.online) {
    commit(draft => recordTransfer(draft, { id, fromVenueId, toVenueId: targetVenueId, status: 'failed', movedCount: 0, createdAt: Date.now(), completedAt: null }))
    return { ok: false, moved: 0, kept }
  }
  commit(draft => {
    recordTransfer(draft, { id, fromVenueId, toVenueId: targetVenueId, status: 'done', movedCount: movable, createdAt: Date.now(), completedAt: Date.now() })
    applyTransfer(draft, fromVenueId, targetVenueId)
  })
  return { ok: true, moved: movable, kept }
}
// 转场失败后按原会场重试：重新收集原会场当前的未确认条目（含失败期间新到的）
export function retryTransfer(transferId: string): { ok: boolean; moved: number } {
  const state = get(desk)
  const transfer = state.transfers.find(item => item.id === transferId)
  if (!transfer || transfer.status !== 'failed' || !state.online) return { ok: false, moved: 0 }
  const movable = state.cues.filter(cue => cue.venueId === transfer.fromVenueId && cue.status !== 'confirmed').length
  commit(draft => {
    const record = draft.transfers.find(item => item.id === transferId)
    if (record) { record.status = 'done'; record.movedCount = movable; record.completedAt = Date.now() }
    applyTransfer(draft, transfer.fromVenueId, transfer.toVenueId)
  })
  return { ok: true, moved: movable }
}

export function ingestCue(text: string, options: { manual?: boolean; speakerId?: string; receivedAt?: number } = {}) {
  const trimmed = text.trim()
  if (!trimmed) return
  commit(state => {
    const venueId = state.currentVenueId
    const liveSession = state.sessions.find(item => item.venueId === venueId && item.status === 'live')
    const speakerId = options.speakerId || liveSession?.speakerId || state.speakers[0]?.id || ''
    const session = liveSession || state.sessions.find(item => item.venueId === venueId && item.speakerId === speakerId) || state.sessions.find(item => item.speakerId === speakerId)
    const receivedAt = options.receivedAt || Date.now()
    const duplicate = findDuplicate(trimmed, state.cues.filter(item => item.venueId === venueId && item.text !== trimmed))
    const cue: Cue = {
      id: `cue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, sessionId: session?.id || '', venueId, speakerId, text: trimmed, receivedAt,
      status: 'pending', manual: Boolean(options.manual), offline: !state.online, delaySeconds: Math.max(0, Math.round((Date.now() - receivedAt) / 1000)),
      duplicateOf: duplicate?.id || null, followupText: '', tags: detectTerms(trimmed, state.terms)
    }
    state.cues.push(cue); state.activeCueId = cue.id
  })
}
export function updateCue(id: string, patch: Partial<Cue>) { commit(state => { const cue = state.cues.find(item => item.id === id); if (cue) Object.assign(cue, patch) }) }
export function setCueStatus(id: string, status: CueStatus) { commit(state => { const cue = state.cues.find(item => item.id === id); if (cue) cue.status = status }) }
export function deleteCue(id: string) {
  commit(state => {
    state.cues = state.cues.filter(item => item.id !== id)
    if (state.activeCueId === id) state.activeCueId = state.cues.filter(item => item.venueId === state.currentVenueId).at(-1)?.id || ''
  })
}
export function clearDuplicate(id: string) { commit(state => { const cue = state.cues.find(item => item.id === id); if (cue) cue.duplicateOf = null }) }
export function sendReminder(termId: string, cueId: string) {
  commit(state => {
    const exists = state.reminders.some(item => item.termId === termId && item.cueId === cueId)
    if (exists) return
    state.reminders.unshift({ id: `rem-${Date.now()}`, termId, cueId, target: state.terms.find(item => item.id === termId)?.target || '', createdAt: Date.now(), acknowledged: false })
  })
}
export function acknowledgeReminder(id: string) { commit(state => { const item = state.reminders.find(row => row.id === id); if (item) item.acknowledged = true }) }

export function getDelay(cue: Cue, now = Date.now()): number { return Math.max(cue.delaySeconds, Math.round((now - cue.receivedAt) / 1000)) }
export function speakerName(state: DeskState, id: string): string { return state.speakers.find(item => item.id === id)?.name || '未指定' }
export function venueName(id: string): string { return venues.find(item => item.id === id)?.name || '未分配会场' }
export function termTarget(state: DeskState, id: string): string { return state.terms.find(item => item.id === id)?.target || '' }
function detectTerms(text: string, terms: Term[]): string[] {
  const lower = text.toLowerCase()
  return terms.filter(term => lower.includes(term.source.toLowerCase()) || lower.includes(term.target)).map(term => term.target)
}
function findDuplicate(text: string, cues: Cue[]): Cue | undefined {
  return cues.find(cue => similarity(text, cue.text) >= 0.72)
}
function similarity(a: string, b: string): number {
  const grams = (value: string) => {
    const clean = value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
    return new Set(Array.from({ length: Math.max(0, clean.length - 1) }, (_, index) => clean.slice(index, index + 2)))
  }
  const left = grams(a), right = grams(b)
  if (!left.size || !right.size) return a.trim() === b.trim() ? 1 : 0
  let intersection = 0
  left.forEach(item => { if (right.has(item)) intersection++ })
  return intersection / (left.size + right.size - intersection)
}
