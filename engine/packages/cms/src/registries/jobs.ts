/**
 * The jobs registry (PARALLEL-TRACKS.md §1, ARCHITECTURE.md §10). Each package that has queue
 * work exports its tasks and workflows from its own barrel — `@engine/media/jobs`, say — and this
 * file spreads each barrel in once, its
 * owner in a comment. No package has a job yet; the SCH lead adds a barrel's line when its
 * first job lands.
 *
 * The queue is run by the cron-called route `/api/x/cron/jobs` (4.1.b), never by `autoRun`,
 * which would start on the first `getPayload()` and tile scans inside page renders. Payload adds
 * its jobs collection (`payload_jobs`) with the first task, so that task's wave migration
 * carries the table.
 */
import type { TaskConfig, WorkflowConfig } from 'payload'

import { uniqueEntries, type RegistryEntry } from './entries'

// Barrels, one line each when they exist:
//   ...mediaJobs,   // MED — @engine/media/jobs (derivatives, IIIF tiles, manifests)
export const JOB_TASKS: readonly RegistryEntry<TaskConfig>[] = []

export const JOB_WORKFLOWS: readonly RegistryEntry<WorkflowConfig>[] = []

function slugsMatch<T extends { slug: string }>(
  registry: string,
  entries: readonly RegistryEntry<T>[],
): readonly RegistryEntry<T>[] {
  for (const entry of entries) {
    if (entry.name !== entry.value.slug) {
      throw new Error(
        `${registry}: entry "${entry.name}" registers a job with slug "${entry.value.slug}"`,
      )
    }
  }
  return entries
}

export function jobTasks(entries: readonly RegistryEntry<TaskConfig>[] = JOB_TASKS): TaskConfig[] {
  return uniqueEntries('jobs.tasks', slugsMatch('jobs.tasks', entries))
}

export function jobWorkflows(
  entries: readonly RegistryEntry<WorkflowConfig>[] = JOB_WORKFLOWS,
): WorkflowConfig[] {
  return uniqueEntries('jobs.workflows', slugsMatch('jobs.workflows', entries))
}
