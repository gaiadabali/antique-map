'use client'
/**
 * Names Payload 3.90's own markup gets wrong, put right in the browser (TASKS.md 27.7, the gate's
 * axe run), since Payload offers no prop or slot for them:
 *
 * - the Live Preview frame (`<iframe id="live-preview-iframe">`) has no title, so a screen reader
 *   announces a bare "frame" (axe `frame-title`): it is named;
 * - a list's file thumbnail (`.file__thumbnail img`, the Media list) takes the file's name as its
 *   alt text, beside the same name in words (`image-redundant-alt`): it is marked decorative;
 * - a chosen picture's edit and remove buttons (`.upload-relationship-details__edit`, `__remove`)
 *   are icons with no name (`button-name`): they are named;
 * - a sections field's heading is an `h3` straight under the page's `h1` (`heading-order`): it is
 *   announced at level 2, as it sits;
 * - a list's sort buttons put a bilingual column label into their name raw — "Sort by [object
 *   Object] Ascending" (the Staff list, and any list with a `{ en, id }` column label): the column's
 *   own words, as its heading shows them, take its place.
 *
 * In the admin's language (Payload's own words around the column's). Rendered with the sidebar
 * (`../language-link.jsx`), which every signed-in screen shows; it watches the page, as they are
 * all drawn after it. `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { useTranslation } from '@payloadcms/ui'
import { useEffect } from 'react'

const WORDS = {
  frame: {
    en: 'Preview of the page as the site shows it',
    id: 'Pratinjau halaman seperti tampil di situs',
  },
  edit: { en: 'Edit the chosen file', id: 'Ubah berkas yang dipilih' },
  remove: { en: 'Remove the chosen file', id: 'Lepas berkas yang dipilih' },
}

/** `selector`'s elements without `attribute`, given `value`. */
function name(document, selector, attribute, value) {
  for (const element of document.querySelectorAll(selector)) {
    if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value)
  }
}

export function PayloadA11yMends() {
  const { i18n } = useTranslation()
  const language = i18n?.language === 'id' ? 'id' : 'en'
  useEffect(() => {
    const document = globalThis.document
    const sortNames = () => {
      for (const button of document.querySelectorAll(
        '.sort-column__button[aria-label*="[object Object]"]',
      )) {
        const label = button.closest('.sort-column')?.querySelector('.sort-column__label')
        const words = label?.textContent?.trim()
        if (words)
          button.setAttribute(
            'aria-label',
            button.getAttribute('aria-label').replace('[object Object]', words),
          )
      }
    }
    const mend = () => {
      sortNames()
      name(document, 'iframe#live-preview-iframe', 'title', WORDS.frame[language])
      name(document, '.file__thumbnail img', 'alt', '')
      name(document, '.upload-relationship-details__edit', 'aria-label', WORDS.edit[language])
      name(document, '.upload-relationship-details__remove', 'aria-label', WORDS.remove[language])
      name(document, '.blocks-field__heading-with-error > h3', 'aria-level', '2')
    }
    mend()
    const watch = new globalThis.MutationObserver(mend)
    watch.observe(document.body, { childList: true, subtree: true })
    return () => watch.disconnect()
  }, [language])
  return null
}
