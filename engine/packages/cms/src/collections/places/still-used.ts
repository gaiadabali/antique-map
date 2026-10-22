/**
 * A place a work still references cannot be deleted: "still used by N works" (TASKS.md 8.2.g).
 * Payload would otherwise drop the work's reference to it silently (`hooks/work-references`).
 */
import { refuseDeleteWhileWorksUse } from '../../hooks/work-references'

export const refuseDeleteWhileUsed = refuseDeleteWhileWorksUse('places')
