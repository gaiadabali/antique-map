import { Button, Footer, Header, TextLink } from '../ui'

import { Section } from './section'
import styles from './style-guide.module.css'

export function LayoutShells(): React.ReactElement {
  return (
    <>
      <Section id="sg-header" title="Header">
        <div className={styles.ground} style={{ width: '100%' }}>
          <Header
            logo={<span className={styles.logoPlaceholder}>Logo</span>}
            nav={
              <ul>
                <li>
                  <TextLink href="/">Home</TextLink>
                </li>
                <li>
                  <TextLink href="/browse">Browse</TextLink>
                </li>
              </ul>
            }
            actions={<Button size="small">Ask us</Button>}
          />
        </div>
      </Section>

      <Section id="sg-footer" title="Footer">
        <Footer
          logo={<span>Logo</span>}
          nav={
            <>
              <TextLink href="/about">About</TextLink>
              <TextLink href="/contact">Contact</TextLink>
            </>
          }
          legal={<p>© 2026</p>}
          social={<TextLink href="https://wa.me/">WhatsApp</TextLink>}
        />
      </Section>
    </>
  )
}
