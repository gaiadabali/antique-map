import { ChatShell, Input, MapPinShell, ZoomShell } from '../ui'

import { Section } from './section'
import styles from './style-guide.module.css'

export function DomainShell(): React.ReactElement {
  return (
    <>
      <Section id="sg-chat-shell" title="Chat shell">
        <div className={styles.ground} style={{ maxWidth: 400 }}>
          <ChatShell
            title="AI assistant"
            disclosure={<p>AI can make mistakes.</p>}
            composer={<Input id="sg-chat-input" label="Message" placeholder="Ask something" />}
          >
            <p>Hello! How can I help?</p>
          </ChatShell>
        </div>
      </Section>

      <Section id="sg-map-pin-shell" title="Map pin shell">
        <div className={styles.ground} style={{ maxWidth: 400 }}>
          <MapPinShell
            address="Jl. Raya Ubud, Bali"
            onUseLocation={() => undefined}
            onPasteLink={() => undefined}
          />
        </div>
      </Section>

      <Section id="sg-zoom-shell" title="Zoom shell">
        <div className={styles.darkGround} style={{ maxWidth: 400 }}>
          <ZoomShell lowResolutionNotice={<p>Legacy image: detail is limited.</p>}>
            <div
              style={{
                width: '100%',
                aspectRatio: '4 / 3',
                background: 'var(--color-surface-deep)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <span>Viewport placeholder</span>
            </div>
          </ZoomShell>
        </div>
      </Section>
    </>
  )
}
