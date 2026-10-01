/**
 * Reads what a product page and a listing card show, as shown. Nothing is
 * normalised here — "Year: Leiden", "40 b7 22 cm." and "On Request" come out
 * exactly as the page printed them, labelled, for the normalisers (TASKS.md
 * 7.2) to parse or send to review. The selectors are the brand's data
 * (`pages` in its public-read config); this file only knows the shape of a
 * label/value panel and a card.
 */
import { parse, type HTMLElement } from 'node-html-parser'

import type { CardSelectors, ProductPageSelectors } from './config.ts'

export type LabelledValue = { label: string; value: string }
export type LinkRef = { name: string; href: string }

export type ProductPage = {
  /** The panel's heading — the maker line on the old pages. */
  heading: string | null
  fields: LabelledValue[]
  longTitle: string | null
  descriptionHtml: string | null
  sold: boolean
}

export type ListingCard = {
  href: string
  title: string | null
  maker: LinkRef | null
  categories: LinkRef[]
  fields: LabelledValue[]
  price: string | null
  sold: boolean
}

export function cleanText(value: string): string {
  // \s covers the non-breaking space the old pages pad values with.
  return value.replace(/\s+/g, ' ').trim()
}

function textOf(element: HTMLElement | null): string | null {
  if (element === null) return null
  const text = cleanText(element.text)
  return text === '' ? null : text
}

function elementChildren(element: HTMLElement): HTMLElement[] {
  return element.childNodes.filter((node): node is HTMLElement => node.nodeType === 1)
}

function isInside(element: HTMLElement, ancestor: HTMLElement): boolean {
  for (let node: HTMLElement | null = element; node !== null; node = node.parentNode) {
    if (node === ancestor) return true
  }
  return false
}

function matches(element: HTMLElement, selector: string): boolean {
  const parent = element.parentNode
  return parent !== null && parent.querySelectorAll(selector).includes(element)
}

/** One panel row: its label cells and value cells, paired in document order. */
function rowFields(row: HTMLElement, labelSelector: string): LabelledValue[] {
  const cells = elementChildren(row)
  const labels = cells.filter((cell) => matches(cell, labelSelector))
  const values = cells.filter((cell) => !matches(cell, labelSelector))
  return labels.map((label, index) => ({
    label: textOf(label) ?? '',
    // An empty value is kept as '' — "Color" left blank is a fact the normaliser needs.
    value: textOf(values[index] ?? null) ?? '',
  }))
}

export function parseProductPage(html: string, selectors: ProductPageSelectors): ProductPage {
  const root = parse(html, { comment: false })
  const panel = root.querySelector(selectors.panel)
  const fields: LabelledValue[] = []
  if (panel !== null) {
    for (const row of panel.querySelectorAll(selectors.panelRow)) {
      fields.push(...rowFields(row, selectors.panelLabel))
    }
  }
  const longTitleElement = root.querySelector(selectors.longTitle)
  let descriptionHtml: string | null = null
  const box = root
    .querySelectorAll(selectors.description)
    .find((candidate) => longTitleElement !== null && isInside(longTitleElement, candidate))
  if (box !== undefined && longTitleElement !== null) {
    // The box holds the long title and then the essay; the essay is everything but the title.
    const inner = box.innerHTML.replace(longTitleElement.outerHTML, '').trim()
    descriptionHtml = inner === '' ? null : inner
  }
  return {
    heading: textOf(root.querySelector(selectors.panelHeading)),
    fields,
    longTitle: textOf(longTitleElement),
    descriptionHtml,
    sold: root.querySelector(selectors.soldMarker) !== null,
  }
}

function link(element: HTMLElement): LinkRef | null {
  const href = element.getAttribute('href')
  const name = textOf(element)
  return href && name ? { name, href } : null
}

function cardFields(card: HTMLElement, selectors: CardSelectors): LabelledValue[] {
  const fields: LabelledValue[] = []
  for (const block of card.querySelectorAll(selectors.field)) {
    const label = block.querySelector(selectors.fieldLabel)
    if (label === null) continue
    const labelText = (textOf(label) ?? '').replace(/:$/, '').trim()
    const value = elementChildren(block).find((child) => child !== label)
    fields.push({ label: labelText, value: textOf(value ?? null) ?? '' })
  }
  return fields
}

/** Every product card on a listing page, keyed by the product link it carries. */
export function parseListingCards(html: string, selectors: CardSelectors): ListingCard[] {
  const root = parse(html, { comment: false })
  const cards: ListingCard[] = []
  for (const card of root.querySelectorAll(selectors.item)) {
    const titleLink = card.querySelector(selectors.title)
    const href = titleLink?.getAttribute('href')
    if (!titleLink || !href) continue
    const makerElement = card.querySelector(selectors.maker)
    cards.push({
      href,
      title: textOf(titleLink),
      maker: makerElement === null ? null : link(makerElement),
      categories: card
        .querySelectorAll(selectors.categories)
        .map(link)
        .filter((ref): ref is LinkRef => ref !== null),
      fields: cardFields(card, selectors),
      price: textOf(card.querySelector(selectors.price)),
      sold: card.querySelector(selectors.soldMarker) !== null,
    })
  }
  return cards
}
