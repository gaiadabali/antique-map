/**
 * The shop's general blocks, drawn: text at a reading measure, a picture beside text, questions
 * and answers as native disclosures (they work without JavaScript), and a call to action on a
 * warm band. Every word is the block's; the picture is the public derivative.
 */
import type { CallToActionVM, FaqVM, ImageTextVM, TextVM } from '../../../server/shop/pages/blocks'
import { Button, ResponsiveImage, printAspectOf, printRatioOf } from '../../../shared/ui'
import { Caps, CapsLink } from '../ui/caps-link'
import styles from './content-blocks.module.css'
import { linkProps } from './link-props'

function Paragraphs({ paragraphs }: { readonly paragraphs: readonly string[] }) {
  return (
    <div className={styles.prose}>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  )
}

export function TextSection({ block }: { readonly block: TextVM }) {
  return (
    <section id={block.anchor ?? undefined} className={styles.section}>
      <div className={styles.measure}>
        {block.title ? <h2 className={styles.title}>{block.title}</h2> : null}
        <Paragraphs paragraphs={block.paragraphs} />
      </div>
    </section>
  )
}

export function ImageTextSection({ block }: { readonly block: ImageTextVM }) {
  const ratio = printRatioOf(block.image)
  return (
    <section id={block.anchor ?? undefined} className={styles.section}>
      <div className={styles.split} data-side={block.side}>
        {block.image ? (
          <figure className={styles.picture}>
            <ResponsiveImage
              variant="fill"
              aspectRatio={printAspectOf(ratio)}
              src={block.image.url}
              srcSet={block.image.srcSet}
              sizes="(max-width: 56.25rem) 100vw, 50vw"
              alt={block.image.alt}
              unoptimized
            />
          </figure>
        ) : null}
        <div className={styles.splitText}>
          {block.eyebrow ? <Caps className={styles.eyebrow}>{block.eyebrow}</Caps> : null}
          <h2 className={styles.title}>{block.title}</h2>
          <Paragraphs paragraphs={block.paragraphs} />
          {block.link ? (
            <CapsLink {...linkProps(block.link)} className={styles.link}>
              {block.link.label}
            </CapsLink>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function FaqSection({ block }: { readonly block: FaqVM }) {
  return (
    <section id={block.anchor ?? undefined} className={styles.section}>
      <div className={styles.measure}>
        {block.title ? <h2 className={styles.title}>{block.title}</h2> : null}
        <ul className={styles.faq}>
          {block.items.map((item) => (
            <li key={item.question}>
              <details>
                <summary>{item.question}</summary>
                <Paragraphs paragraphs={item.paragraphs} />
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function CallToActionSection({ block }: { readonly block: CallToActionVM }) {
  return (
    <section className={styles.cta}>
      <h2 className={styles.title}>{block.title}</h2>
      {block.body ? <p className={styles.ctaBody}>{block.body}</p> : null}
      {block.link ? (
        <Button variant="primary" size="small" {...linkProps(block.link)}>
          {block.link.label}
        </Button>
      ) : null}
    </section>
  )
}

/** A page whose first section is no hero: its title as the h1, so the page is never without one. */
export function PageTitle({ title }: { readonly title: string }) {
  return (
    <header className={styles.head}>
      <div className={styles.measure}>
        <h1 className={styles.pageTitle}>{title}</h1>
      </div>
    </header>
  )
}
