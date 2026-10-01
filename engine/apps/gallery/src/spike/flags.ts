/**
 * The spike is off unless a workstation or CI turns it on (senior-fe #3): `SPIKE_ROUTES=1` serves
 * the fixture item route and accepts its posts; `SPIKE_CONTROLS=1` adds the controls that flip
 * availability and edit a record. Off, the item route is the designed 404 and every spike action
 * refuses. `../boot.ts` refuses to start with either set on any host the boot check does not judge
 * local, so neither can reach staging or production.
 */
export const SPIKE_FLAGS = ['SPIKE_ROUTES', 'SPIKE_CONTROLS'] as const

export function spikeRoutesOn(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return env.SPIKE_ROUTES === '1'
}

export function spikeControlsOn(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return spikeRoutesOn(env) && env.SPIKE_CONTROLS === '1'
}
