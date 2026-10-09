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

      <Section id="sg-pagination" title="Pagination">
        <Pagination currentPage={3} totalPages={10} getHref={(p: number) => `/?page=${p}`} />
      </Section>

      <Section id="sg-pagination-quiet" title="Pagination — quiet">
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
