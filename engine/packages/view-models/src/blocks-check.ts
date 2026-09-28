/**
 * @contract C4 — type-level tests of the block union · owner: ARC
 *
 * Compiled by `tsc` in `pnpm typecheck`, never run or exported. If any line here stops
 * compiling — or an `@ts-expect-error` stops being an error — the contract has drifted.
 */
import { BLOCK_TYPES, type BlockRenderers, type BlockType, type BlockVM } from './blocks'

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

// The data list and the union name the same fifteen blocks.
const _listMatchesUnion: Equal<(typeof BLOCK_TYPES)[number], BlockType> = true
const _fifteen: (typeof BLOCK_TYPES)['length'] = 15

const render = (block: BlockVM): string => block.type

// A complete map compiles, and each renderer receives its own block's props.
const _complete: BlockRenderers<string> = {
  prose: (block) => `${block.content.length}`,
  figure: (block) => block.width,
  zoomFigure: (block) => `${block.region.x},${block.region.y}`,
  compare: (block) => block.mode,
  shoppableImage: (block) => `${block.hotspots.length}`,
  gallery: (block) => block.layout,
  pullQuote: (block) => block.quote,
  productRail: (block) => block.title ?? '',
  timeline: (block) => `${block.entries.length}`,
  callout: (block) => block.tone,
  faq: (block) => `${block.items.length}`,
  cta: (block) => block.href,
  embed: (block) => block.kind,
  newsletter: (block) => block.sourceKey,
  divider: render,
}

// @ts-expect-error — a map missing a renderer (here `divider`) must not compile.
const _missingOne: BlockRenderers<string> = {
  prose: render,
  figure: render,
  zoomFigure: render,
  compare: render,
  shoppableImage: render,
  gallery: render,
  pullQuote: render,
  productRail: render,
  timeline: render,
  callout: render,
  faq: render,
  cta: render,
  embed: render,
  newsletter: render,
}

// @ts-expect-error — a renderer for another block's props must not compile.
const _wrongProps: BlockRenderers<string>['cta'] = (block: { type: 'cta'; region: object }) =>
  block.type
