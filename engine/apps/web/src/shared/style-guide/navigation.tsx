import { Breadcrumbs, Pagination } from '../ui'

import { Section } from './section'

const sampleItems = [
  { label: 'Home', href: '/' },
  { label: 'Browse', href: '/browse' },
  { label: 'Item', href: undefined },
]

export function Navigation(): React.ReactElement {
  return (
    <>
      <Section id="sg-breadcrumbs" title="Breadcrumbs">
        <Breadcrumbs items={sampleItems} />
      </Section>

      {/* One section per shared component folder (phase-4.spec.ts 4.2.c): the quiet variant sits
          inside Pagination's section, not in a section of its own. */}
      <Section
        id="sg-pagination"
        title="Pagination"
        note="Default, then the quiet variant for long lists."
      >
        <Pagination currentPage={3} totalPages={10} getHref={(p: number) => `/?page=${p}`} />
        <Pagination
          variant="quiet"
          ariaLabel="Pagination, quiet"
          currentPage={5}
          totalPages={64}
          getHref={(p: number) => `/?page=${p}`}
        />
      </Section>
    </>
  )
}
