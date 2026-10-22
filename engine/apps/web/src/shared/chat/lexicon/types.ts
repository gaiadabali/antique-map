/**
 * The panel's copy keys and resolved-text shape, split out from `./index` (which is `server-only`)
 * so a client component can `import type` these without pulling a server-only module into its
 * bundle (Next refuses to build a Client Component that imports `server-only`, even transitively).
 */
import type EN from './en.json'

export type ChatPanelCopyKey = keyof typeof EN
export type ChatPanelText = Readonly<Record<ChatPanelCopyKey, string>>
