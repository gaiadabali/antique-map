/** The spike's flags run on a workstation or in CI only (senior-fe #3): the boot refuses them elsewhere. */
import type { BootReport } from '@engine/config/boot-check'
import { describe, expect, it } from 'vitest'

import { withSpikeRule } from '../src/boot'
import { spikeControlsOn, spikeRoutesOn } from '../src/spike/flags'

const report = (environment: BootReport['environment']): BootReport => ({
  ok: true,
  environment,
  loadersSource: 'payload',
  problems: [],
  warnings: [],
})

describe('withSpikeRule()', () => {
  it.each(['production', 'staging'] as const)(
    'refuses SPIKE_ROUTES on a %s host',
    (environment) => {
      const checked = withSpikeRule(report(environment), { SPIKE_ROUTES: '1', SPIKE_CONTROLS: '1' })
      expect(checked.ok).toBe(false)
      expect(checked.problems.map((problem) => problem.subject)).toEqual([
        'SPIKE_ROUTES',
        'SPIKE_CONTROLS',
      ])
    },
  )

  it('lets a workstation run the spike', () => {
    expect(withSpikeRule(report('local'), { SPIKE_ROUTES: '1' }).ok).toBe(true)
  })

  it('changes nothing with the spike off', () => {
    expect(withSpikeRule(report('production'), {})).toEqual(report('production'))
  })
})

describe('the flags', () => {
  it('are off unless set to 1, and the controls need the routes', () => {
    expect(spikeRoutesOn({})).toBe(false)
    expect(spikeRoutesOn({ SPIKE_ROUTES: 'true' })).toBe(false)
    expect(spikeControlsOn({ SPIKE_CONTROLS: '1' })).toBe(false)
    expect(spikeControlsOn({ SPIKE_ROUTES: '1', SPIKE_CONTROLS: '1' })).toBe(true)
  })
})
