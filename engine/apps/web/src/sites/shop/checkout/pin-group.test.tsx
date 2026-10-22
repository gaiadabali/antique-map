/**
 * `PinGroup` (6-followup-4 #2): `lat`/`lng` are hidden fields, so `state.fields` naming them alone
 * marks no visible field — the invalid-pin message has to show on the group itself.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PinGroup } from './pin-group'

const labels = {
  useLocation: 'Use my location',
  pasteLink: 'Or paste a Google Maps link',
  latLng: 'Or type latitude and longitude',
  latitude: 'Latitude',
  longitude: 'Longitude',
  search: 'Search',
}

const render = (invalid: boolean) =>
  renderToStaticMarkup(
    <PinGroup
      title="Pin your delivery spot on the map"
      invalidMessage="That pin does not look right — drop it again inside Indonesia."
      invalid={invalid}
      browserKey={null}
      labels={labels}
      pin={null}
      address={null}
      onPin={() => undefined}
    />,
  )

describe('an invalid pin is shown on the pin group', () => {
  it('shows nothing extra when the pin is not refused', () => {
    const html = render(false)
    expect(html).not.toContain('That pin does not look right')
    expect(html).not.toMatch(/aria-invalid="true"/)
  })

  it('marks the group invalid and shows the lexicon message when the pin is refused', () => {
    const html = render(true)
    expect(html).toContain('That pin does not look right — drop it again inside Indonesia.')
    expect(html).toMatch(/role="group"[^>]*aria-invalid="true"/)
    expect(html).toContain('role="alert"')
    // The fallback lat/lng inputs are marked invalid and described by the message too.
    expect(html).toMatch(/aria-label="Latitude"[^>]*aria-invalid="true"/)
    expect(html).toMatch(/aria-label="Longitude"[^>]*aria-invalid="true"/)
  })
})
