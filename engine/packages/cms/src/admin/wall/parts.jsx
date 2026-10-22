/**
 * The Catalogue Wall's pieces (TASKS.md 16.2): the strip of today's work, the filter row, a matted
 * card, the pager and the empty state. Plain server markup, styled by `wall.css` through classes
 * (tokens only); every control is a link or a GET form, so nothing needs script. `.jsx`: the cms
 * package does not type-check React (see `../leads/shared.jsx`'s header).
 */
import { STATE_TAG_WORDS, fill, t } from './copy'
import { isFiltered, wallHref } from './filter'

const SITE_CHIPS = [
  ['all', 'siteAll'],
  ['gallery', 'siteGallery'],
  ['shop', 'siteShop'],
]
const STATE_CHIPS = [
  ['all', 'stateAll'],
  ['attention', 'stateAttention'],
  ['drafts', 'stateDrafts'],
  ['published', 'statePublished'],
  ['sold', 'stateSold'],
]

/** One paper strip: a count and a link each; the owner also gets a quiet link to the numbers. */
export function Strip({ counts, filter, isOwner, language }) {
  const items = [
    { href: '/admin/orders', n: counts.orders, label: t('ordersToAct', language) },
    ...(isOwner ? [{ href: '/admin/leads', n: counts.leads, label: t('newLeads', language) }] : []),
    {
      href: wallHref(filter, { site: 'gallery', state: 'ai', q: '' }),
      n: counts.aiDrafts,
      label: t('aiDrafts', language),
    },
    {
      href: wallHref(filter, { site: 'all', state: 'drafts', q: '' }),
      n: counts.drafts,
      label: t('drafts', language),
    },
  ]
  return (
    <nav className="wall-strip" aria-label={t('today', language)}>
      {items.map((item) => (
        <a key={item.href} className="wall-strip__item" href={item.href}>
          <span className="wall-strip__count">{item.n}</span>
          <span className="wall-strip__label">{item.label}</span>
        </a>
      ))}
      {isOwner ? (
        <a className="wall-strip__quiet" href="/admin/dashboard">
          {t('numbers', language)}
        </a>
      ) : null}
    </nav>
  )
}

function Chips({ chips, current, hrefOf, label, language }) {
  return (
    <div className="wall-chips" role="group" aria-label={label}>
      {chips.map(([value, key]) => (
        <a
          key={value}
          className="wall-chip"
          href={hrefOf(value)}
          aria-current={current === value ? 'true' : undefined}
        >
          {t(key, language)}
        </a>
      ))}
    </div>
  )
}

export function Filters({ filter, language }) {
  return (
    <div className="wall-filters">
      <Chips
        chips={SITE_CHIPS}
        current={filter.site}
        hrefOf={(site) => wallHref(filter, { site })}
        label={t('site', language)}
        language={language}
      />
      <Chips
        chips={STATE_CHIPS}
        current={filter.state}
        hrefOf={(state) => wallHref(filter, { state })}
        label={t('state', language)}
        language={language}
      />
    </div>
  )
}

/** The search, beside the title: a filter row of chips alone fits beside the open sidebar. */
export function Search({ filter, language }) {
  return (
    <form className="wall-search" method="get" action="/admin" role="search">
      {filter.site !== 'all' ? <input type="hidden" name="site" value={filter.site} /> : null}
      {filter.state !== 'all' ? <input type="hidden" name="state" value={filter.state} /> : null}
      <label className="wall-search__label" htmlFor="wall-q">
        {t('searchLabel', language)}
      </label>
      <input
        id="wall-q"
        className="wall-search__input"
        type="search"
        name="q"
        defaultValue={filter.q}
        placeholder={t('searchHint', language)}
        maxLength={80}
        autoComplete="off"
      />
      <button className="wall-search__button" type="submit">
        {t('search', language)}
      </button>
    </form>
  )
}

/** The mat: the picture whole (never cropped) on the mat ground, or the words "No photo". */
export function Card({ card, language }) {
  const site = card.kind === 'work' ? t('gallery', language) : t('shop', language)
  return (
    <li className="wall-cell">
      <a className="wall-card" href={card.href}>
        <span className="wall-mat">
          {card.image ? (
            <img
              className="wall-mat__img"
              src={card.image}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="wall-mat__empty">{t('noPhoto', language)}</span>
          )}
        </span>
        <span className="wall-card__title">{card.title || t('untitled', language)}</span>
        <span className="wall-card__meta">
          {site}
          {card.reference ? ` · ${card.reference}` : ''}
        </span>
        <span className={`wall-tag wall-tag--${card.tag}`}>
          {STATE_TAG_WORDS[card.tag][language]}
        </span>
      </a>
    </li>
  )
}

export function Pager({ filter, pages, total, language }) {
  const summary =
    total === 1
      ? t('summaryOne', language)
      : fill(t('summary', language), { n: total, page: filter.page, pages })
  return (
    <nav className="wall-pager" aria-label={t('wall', language)}>
      <p className="wall-pager__summary">{summary}</p>
      {filter.page > 1 ? (
        <a
          className="wall-pager__link"
          href={wallHref(filter, { page: filter.page - 1 })}
          rel="prev"
        >
          {t('prev', language)}
        </a>
      ) : null}
      {filter.page < pages ? (
        <a
          className="wall-pager__link"
          href={wallHref(filter, { page: filter.page + 1 })}
          rel="next"
        >
          {t('next', language)}
        </a>
      ) : null}
    </nav>
  )
}

const EMPTY_KEY = {
  attention: 'emptyAttention',
  drafts: 'emptyDrafts',
  published: 'emptyPublished',
  sold: 'emptySold',
  ai: 'emptyAi',
}

/** An empty wall says why and the way on: add a record, or widen the filter. */
export function Empty({ filter, language }) {
  const filtered = isFiltered(filter)
  const message =
    filter.q !== ''
      ? fill(t('emptySearch', language), { q: filter.q })
      : filtered
        ? t(EMPTY_KEY[filter.state] ?? 'emptyAll', language)
        : t('emptyAll', language)
  return (
    <div className="wall-empty">
      <p className="wall-empty__text">{message}</p>
      <p className="wall-empty__ways">
        {filtered ? (
          <a className="wall-empty__link" href="/admin">
            {t('clear', language)}
          </a>
        ) : null}
        <a className="wall-empty__link" href="/admin/collections/works/create">
          {t('addWork', language)}
        </a>
        <a className="wall-empty__link" href="/admin/collections/products/create">
          {t('addProduct', language)}
        </a>
      </p>
    </div>
  )
}
