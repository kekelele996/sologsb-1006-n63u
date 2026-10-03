import { writable, get } from 'svelte/store'
import type { Announcement, Cue, CueStatus, DeskState, Reminder, Room, Session, Speaker, Term } from './types'

const STORAGE_KEY = 'conference-cue-desk-v1'
const rooms: Room[] = [
  { id: 'room-main', name: '主会场 A', kind: 'main' },
  { id: 'room-b', name: '分会场 B', kind: 'breakout' },
  { id: 'room-c', name: '分会场 C', kind: 'breakout' }
]
const speakers: Speaker[] = [
  { id: 'sp-1', name: 'Dr. Maya Chen', title: '首席气候科学家', language: '英语 → 中文', color: '#0f766e' },
  { id: 'sp-2', name: '刘启明', title: '城市韧性研究员', language: '中文 → 英语', color: '#b45309' },
  { id: 'sp-3', name: 'Prof. Daniel Ortiz', title: '公共卫生政策顾问', language: '西班牙语 → 中文', color: '#6d28d9' },
  { id: 'sp-4', name: '佐藤 美咲', title: '社区能源设计师', language: '日语 → 中文', color: '#be123c' }
]
const sessions: Session[] = [
  { id: 'se-1', order: 1, time: '09:00', title: '开幕式与议程说明', speakerId: 'sp-2', roomId: 'room-main', status: 'done' },
  { id: 'se-2', order: 2, time: '09:20', title: '城市热岛与适应性基础设施', speakerId: 'sp-1', roomId: 'room-main', status: 'live' },
  { id: 'se-3', order: 3, time: '10:05', title: '社区健康数据的地方行动', speakerId: 'sp-3', roomId: 'room-main', status: 'upcoming' },
  { id: 'se-4', order: 4, time: '10:45', title: '分布式能源与社区共治', speakerId: 'sp-4', roomId: 'room-main', status: 'upcoming' },
  { id: 'se-5', order: 5, time: '09:30', title: '社区能源实践研讨', speakerId: 'sp-4', roomId: 'room-b', status: 'live' },
  { id: 'se-6', order: 6, time: '09:40', title: '健康数据治理圆桌', speakerId: 'sp-3', roomId: 'room-c', status: 'live' }
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
    { id: 'cue-101', roomId: 'room-main', sessionId: 'se-2', speakerId: 'sp-1', text: 'The urban heat island effect is not evenly distributed across a city.', receivedAt: now - 36000, status: 'confirmed', manual: false, offline: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['城市热岛'] },
    { id: 'cue-102', roomId: 'room-main', sessionId: 'se-2', speakerId: 'sp-1', text: 'Neighborhoods with less tree canopy can be several degrees warmer at night.', receivedAt: now - 19000, status: 'confirmed', manual: false, offline: false, delaySeconds: 6, duplicateOf: null, followupText: '补译：“夜间温差可达数摄氏度。”', tags: ['树冠覆盖率'] },
    { id: 'cue-103', roomId: 'room-main', sessionId: 'se-2', speakerId: 'sp-1', text: 'Our resilience strategy links cooling corridors with public health investments.', receivedAt: now - 9000, status: 'pending', manual: false, offline: false, delaySeconds: 11, duplicateOf: null, followupText: '', tags: ['韧性', '协同效益'] },
    { id: 'cue-104', roomId: 'room-main', sessionId: 'se-2', speakerId: 'sp-1', text: 'That data also reveals health equity gaps between districts.', receivedAt: now - 2500, status: 'pending', manual: false, offline: false, delaySeconds: 4, duplicateOf: null, followupText: '', tags: ['健康公平'] }
  ]
}
function demoState(): DeskState {
  return {
    rooms, activeRoomId: 'room-main',
    speakers, sessions, terms, cues: initialCues(), reminders: [], activeCueId: 'cue-103', fontScale: 100,
    announcements: [
      { id: 'ann-1', level: 'info', text: '十点整有消防联动测试，请提醒会场人员保持镇定。', visibleOnStage: false, createdAt: new Date().toISOString() },
      { id: 'ann-2', level: 'urgent', text: '请下一位发言人提前到侧台候场。', visibleOnStage: false, createdAt: new Date().toISOString() }
    ],
    online: true, liveSimulation: true, updatedAt: new Date().toISOString()
  }
}
function clone<T>(value: T): T { return structuredClone(value) }

// 旧数据没有会场归属：打开时先回填 rooms / session.roomId / cue.roomId / activeRoomId，再启用。
function migrateState(saved: Record<string, unknown>): DeskState {
  const base = demoState()
  const state = { ...base, ...saved } as DeskState
  if (!Array.isArray(state.rooms) || !state.rooms.length) state.rooms = clone(base.rooms)
  const fallbackRoomId = state.rooms.find(room => room.kind === 'main')?.id || state.rooms[0].id
  state.sessions = state.sessions.map(session => {
    const legacy = session as Session & { room?: string }
    if (legacy.roomId && state.rooms.some(room => room.id === legacy.roomId)) return session
    const match = state.rooms.find(room => room.name === legacy.room)
    return { ...session, roomId: match?.id || fallbackRoomId }
  })
  state.cues = state.cues.map(cue => {
    if (cue.roomId && state.rooms.some(room => room.id === cue.roomId)) return cue
    const session = state.sessions.find(item => item.speakerId === cue.speakerId && item.status === 'live')
      || state.sessions.find(item => item.speakerId === cue.speakerId)
    return { ...cue, sessionId: cue.sessionId || session?.id || '', roomId: session?.roomId || fallbackRoomId }
  })
  if (!state.activeRoomId || !state.rooms.some(room => room.id === state.activeRoomId)) {
    state.activeRoomId = state.sessions.find(item => item.status === 'live')?.roomId || fallbackRoomId
  }
  return state
}
function loadState(): DeskState {
  if (typeof localStorage === 'undefined') return demoState()
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return demoState()
    const migrated = migrateState(JSON.parse(saved))
    migrated.online = navigator.onLine
    migrated.updatedAt = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    return migrated
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
  commit(state => state.sessions.push({ id: `se-${Date.now()}`, order: Math.max(0, ...state.sessions.map(item => item.order)) + 1, time: '11:30', title: '新演讲', speakerId: state.speakers[0]?.id || '', roomId: state.rooms.find(room => room.kind === 'main')?.id || state.rooms[0]?.id || '', status: 'upcoming' }))
}
// 主控调整场次的会场归属：该场次未确认的条目跟到新会场，已上屏（已确认）的留在原会场。
export function updateSession(id: string, patch: Partial<Session>): number {
  let moved = 0
  commit(state => {
    const item = state.sessions.find(row => row.id === id)
    if (!item) return
    const previousRoomId = item.roomId
    Object.assign(item, patch)
    if (patch.roomId && patch.roomId !== previousRoomId) {
      state.cues.forEach(cue => {
        if (cue.sessionId === id && cue.status !== 'confirmed') { cue.roomId = patch.roomId as string; moved++ }
      })
    }
  })
  return moved
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
          const duplicate = findDuplicate(cue.text, state.cues.filter(item => item.id !== cue.id && !item.offline && item.roomId === cue.roomId))
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
  const roomCues = state.cues.filter(item => item.roomId === state.activeRoomId)
  const index = roomCues.findIndex(item => item.id === state.activeCueId)
  const next = roomCues[index + direction]
  if (next) setActiveCue(next.id)
}
export function setFontScale(scale: number) { commit(state => { state.fontScale = Math.min(150, Math.max(85, scale)) }) }

// 译员转场：未确认条目跟着走，已上屏段落留在原会场。
// 整体一次提交，任一步失败都不落盘，归属保持原会场，可按原会场安全重试。
export function transferRoom(targetRoomId: string): { ok: boolean; moved: number; reason?: string } {
  const state = get(desk)
  const fromRoomId = state.activeRoomId
  if (!state.rooms.some(room => room.id === targetRoomId)) return { ok: false, moved: 0, reason: '目标会场不存在，未确认条目仍留在原会场。' }
  if (targetRoomId === fromRoomId) return { ok: false, moved: 0, reason: '已在该会场值守，无需转场。' }
  let moved = 0
  try {
    commit(next => {
      next.cues.forEach(cue => {
        if (cue.roomId === fromRoomId && cue.status !== 'confirmed') { cue.roomId = targetRoomId; moved++ }
      })
      next.activeRoomId = targetRoomId
      next.activeCueId = next.cues.filter(cue => cue.roomId === targetRoomId).at(-1)?.id || ''
    })
  } catch {
    return { ok: false, moved: 0, reason: '转场未完成，未确认条目仍按原会场保留，可重试。' }
  }
  return { ok: true, moved }
}

export function ingestCue(text: string, options: { manual?: boolean; speakerId?: string; receivedAt?: number } = {}) {
  const trimmed = text.trim()
  if (!trimmed) return
  commit(state => {
    const roomId = state.activeRoomId
    const session = state.sessions.find(item => item.roomId === roomId && item.status === 'live')
      || state.sessions.find(item => item.roomId === roomId)
    const duplicate = findDuplicate(trimmed, state.cues.filter(item => item.roomId === roomId))
    const speakerId = options.speakerId || session?.speakerId || state.speakers[0]?.id || ''
    const receivedAt = options.receivedAt || Date.now()
    const cue: Cue = {
      id: `cue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, roomId, sessionId: session?.id || '', speakerId, text: trimmed, receivedAt,
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
    const roomId = state.cues.find(item => item.id === id)?.roomId || state.activeRoomId
    state.cues = state.cues.filter(item => item.id !== id)
    if (state.activeCueId === id) state.activeCueId = state.cues.filter(item => item.roomId === roomId).at(-1)?.id || ''
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
export function roomName(state: DeskState, id: string): string { return state.rooms.find(item => item.id === id)?.name || '未分配会场' }
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
