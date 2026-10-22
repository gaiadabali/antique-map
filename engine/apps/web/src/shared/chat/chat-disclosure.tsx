/**
 * The "AI assistant" disclosure (AI.md §3.5): always visible while the panel is open, in the
 * site's copy, never model output. A plain function component (no hooks) so it can be verified
 * with `renderToStaticMarkup`, the same pattern `variant-picker.test.tsx` uses.
 */
import type { ChatPanelText } from './lexicon/types'

export function ChatDisclosure({
  text,
  privacyHref,
}: {
  readonly text: ChatPanelText
  readonly privacyHref: string
}): React.ReactElement {
  return (
    <p>
      {text.disclosure} <a href={privacyHref}>{text.disclosurePrivacy}</a>
    </p>
  )
}
