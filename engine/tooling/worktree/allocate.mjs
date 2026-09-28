// Pure allocation rules for agent worktrees: branch, directory, PORT and
// database suffix, all derived from (phase, lane). No I/O here, so the rules
// are unit-tested on their own (worktree.test.mjs).
//
// PORT is deterministic: BASE_PORT + (phase - 1) * STRIDE + laneSlot. Every
// known lane has a fixed slot, so two worktrees on different (phase, lane)
// pairs never compute the same port. A computed port that is reserved (a
// well-known local service) or already claimed in another worktree's
// .env.local is stepped past (see allocatePort).

/** Lanes from docs/PARALLEL-TRACKS.md §1, in table order. Order is load-bearing: it fixes each lane's port slot. Append, never reorder. */
export const LANES = Object.freeze([
  'ARC',
  'HAR',
  'PLT',
  'SCH',
  'ADM',
  'DOM',
  'PAY',
  'LOG',
  'MED',
  'SRC',
  'WEB',
  'UXG',
  'UXE',
  'NTF',
  'SIS',
  'MIG',
  'SEO',
  'BRD',
  'QA',
  'DOC',
])

export const BASE_PORT = 4100
export const STRIDE = 32
export const MAX_PHASE = 60
/** Slots LANES.length..STRIDE-1 take lane labels outside the table (e.g. ARC-P), by hash. */
const EXTRA_SLOTS = STRIDE - LANES.length

/** Ports a dev server must never take: Postgres, MySQL, Redis, Mailpit, MinIO, Vite, the common Next default, and the production app ports (DEPLOYMENT.md). */
export const RESERVED_PORTS = Object.freeze(
  new Set([1025, 3000, 3306, 4030, 4031, 5173, 5432, 6379, 8025, 8080, 9000, 9001]),
)

const LANE_PATTERN = /^[A-Za-z][A-Za-z0-9-]{0,15}$/

/** Parses and validates a phase argument; throws a user-facing Error. */
export function parsePhase(value) {
  const text = String(value ?? '')
  if (!/^[1-9][0-9]*$/.test(text) || Number(text) > MAX_PHASE) {
    throw new Error(`phase must be an integer from 1 to ${MAX_PHASE}, got "${text}"`)
  }
  return Number(text)
}

/** Parses and validates a lane label (a PARALLEL-TRACKS.md §1 lane, or a split such as ARC-P). Returns it upper-cased. */
export function parseLane(value) {
  const text = String(value ?? '')
  if (!LANE_PATTERN.test(text)) {
    throw new Error(
      `lane must be a letter followed by up to 15 letters, digits or dashes (e.g. HAR, ARC-P), got "${text}"`,
    )
  }
  return text.toUpperCase()
}

/** FNV-1a, 32-bit: a stable hash so an unlisted lane label always lands in the same extra slot. */
function fnv1a(text) {
  let hash = 0x811c9dc5
  for (const char of text) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

/** The lane's slot within a phase's block of STRIDE ports. */
export function laneSlot(lane) {
  const index = LANES.indexOf(lane)
  return index >= 0 ? index : LANES.length + (fnv1a(lane) % EXTRA_SLOTS)
}

/** The deterministic port for (phase, lane), before collision stepping. */
export function basePort(phase, lane) {
  return BASE_PORT + (phase - 1) * STRIDE + laneSlot(lane)
}

/** Size of the primary range; a reserved base port moves up by exactly this, into a spill range no base port reaches. */
export const SPILL_OFFSET = STRIDE * MAX_PHASE

/**
 * The port to write: the deterministic one (a reserved one moved to the spill
 * range, which keeps every (phase, lane) distinct), then stepped past ports
 * other worktrees already use. `usedPorts` holds only OTHER worktrees' ports,
 * so re-running in the same worktree returns the same answer.
 */
export function allocatePort(phase, lane, usedPorts = new Set()) {
  let port = basePort(phase, lane)
  if (RESERVED_PORTS.has(port)) port += SPILL_OFFSET
  while (RESERVED_PORTS.has(port) || usedPorts.has(port)) {
    port += 1
    if (port > 65535) throw new Error('no free port above the computed one')
  }
  return port
}

/** Database suffix: `p<phase>_<lane>`, lower-case, Postgres-identifier safe (e.g. p1_har, p1_arc_p). */
export function dbSuffix(phase, lane) {
  return `p${phase}_${lane.toLowerCase().replace(/-/g, '_')}`
}

/** Branch name: `feat/p<phase>-<lane>` (CONVENTIONS.md §9), lower-case. */
export function branchName(phase, lane) {
  return `feat/p${phase}-${lane.toLowerCase()}`
}

/** Directory name for a sibling worktree of the main checkout, e.g. `antique-map-p1-har`. */
export function worktreeDirName(repoName, phase, lane) {
  return `${repoName}-p${phase}-${lane.toLowerCase()}`
}
