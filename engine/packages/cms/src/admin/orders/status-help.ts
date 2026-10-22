/**
 * The store panel's one big button (TASKS.md 7.2.a): which status is next along the forward line,
 * and whether this actor may make that move right now — `judgeMove` (`../../shop/fulfilment/
 * transitions`) still decides; this only picks which single transition to ask it about, so the UI
 * never invents a move the core would refuse anyway (AGENTS.md: the UI hides buttons, it never
 * decides).
 */
import { FORWARD_LINE } from '../../collections/orders/status-moves'
import type { OrderStatus } from '../../collections/orders/statuses'
import { judgeMove, type MoveJudgement } from '../../shop/fulfilment/transitions'
import type { UserRole } from '../../collections/users/roles'

const line: readonly OrderStatus[] = FORWARD_LINE

/** The next status along `paid → … → delivered`, or `null` once there is none. */
export function nextForward(status: OrderStatus): OrderStatus | null {
  const at = line.indexOf(status)
  if (at === -1 || at === line.length - 1) return null
  return line[at + 1] ?? null
}

/** One step back, for the owner and editors correcting a mistake. */
export function nextBackward(status: OrderStatus): OrderStatus | null {
  const at = line.indexOf(status)
  if (at <= 0) return null
  return line[at - 1] ?? null
}

export type NextStepQuestion = {
  readonly role: UserRole | null
  readonly actorStore: number | null
  readonly orderStore: number
  readonly status: OrderStatus
  readonly hasDriverImage: boolean
}

export type NextStep = {
  readonly to: OrderStatus
  readonly judgement: MoveJudgement
}

/** The forward move this actor would make next, and whether it is theirs to make right now. */
export function nextStep(question: NextStepQuestion): NextStep | null {
  const to = nextForward(question.status)
  if (to === null) return null
  const judgement = judgeMove({
    role: question.role,
    actorStore: question.actorStore,
    orderStore: question.orderStore,
    from: question.status,
    to,
    hasDriverImage: question.hasDriverImage,
  })
  return { to, judgement }
}
