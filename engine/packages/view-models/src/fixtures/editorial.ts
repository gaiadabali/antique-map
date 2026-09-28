/**
 * @contract C2 — fixtures `story`, `page`, `exhibition`, `location`, `ig`, `newsletter-archive` · owner: ARC
 * Fictional editorial pages, using the scholarly blocks where a story would.
 */
import type {
  ExhibitionVM,
  IgVM,
  LocationVM,
  NewsletterArchiveVM,
  PageVM,
  StoryVM,
} from '../surfaces/editorial'
import { card, image, seo, streamed } from './_shared'

const cartouche = image('cartouche-1001', 2400, 1800, 'Detail of the title cartouche', 'detail')

export const story: StoryVM = {
  surface: 'story',
  title: 'The survey that never was',
  excerpt: 'How an imagined island got a coastline.',
  hero: image('story-hero', 2400, 1350, 'The Isle of Contoh across a desk'),
  authors: [{ name: 'A. Fictus', href: null }],
  publishedAt: '2026-09-01',
  body: [
    {
      type: 'zoomFigure',
      id: 'z1',
      image: cartouche,
      caption: 'See the cartouche: the surveyor signs his own invention.',
      region: { x: 0.05, y: 0.04, w: 0.375, h: 0.33 },
      work: {
        title: 'The Isle of Contoh, 1718',
        href: '/product/1001-isle-of-contoh-voorbeeld-1718',
        manifest: 'https://gallery.example.test/api/x/media/manifest/FIX-000001',
      },
    },
    {
      type: 'compare',
      id: 'c1',
      mode: 'slider',
      before: { image: cartouche, label: 'First state' },
      after: { image: cartouche, label: 'Second state' },
      caption: 'Two states of one plate.',
    },
    { type: 'divider', id: 'd1', title: null },
  ],
  related: streamed([
    {
      kind: 'originals',
      title: 'Originals in this story',
      items: [card(1001, 'The Isle of Contoh')],
      more: null,
    },
  ]),
  makers: [{ label: 'Hendrik Voorbeeld', href: '/makers/voorbeeld' }],
  places: [{ label: 'Pulau Contoh', href: '/places/contoh' }],
  seo: seo('The survey that never was', '/stories/survey'),
  breadcrumbs: [{ label: 'Stories', href: '/stories' }],
}

export const page: PageVM = {
  surface: 'page',
  title: 'Condition grades',
  template: 'trust',
  body: [
    {
      type: 'faq',
      id: 'f1',
      items: [
        {
          question: 'What does VG mean?',
          answer: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Very good: light toning.', marks: [], lang: null }],
            },
          ],
        },
      ],
    },
  ],
  updatedAt: '2026-09-20',
  seo: seo('Condition grades', '/condition-grades'),
  breadcrumbs: [],
}

export const exhibition: ExhibitionVM = {
  surface: 'exhibition',
  kind: 'fair',
  title: 'The Example Fair',
  hero: null,
  dates: { start: '2026-11-12', end: '2026-11-15' },
  venue: { name: 'Hall 1', address: ['1 Fair Street', 'Exampletown'], mapHref: null },
  description: [],
  curations: [],
  ics: '/api/x/forms/ics/example-fair',
  seo: seo('The Example Fair', '/exhibitions/example-fair'),
  breadcrumbs: [{ label: 'Exhibitions', href: '/exhibitions' }],
}

export const location: LocationVM = {
  surface: 'location',
  kind: 'showroom',
  name: 'The Showroom',
  href: '/visit/showroom',
  address: ['Jl. Contoh No. 1', 'Denpasar'],
  hours: {
    timeZone: 'Asia/Makassar',
    weekly: [{ days: 'Mon–Sat', opens: '10:00', closes: '18:00' }],
    byAppointment: false,
    closure: { from: '2027-03-08', to: '2027-03-09', reason: 'Nyepi' },
  },
  map: { lat: -8.65, lng: 115.21, href: 'https://maps.example.test/?q=showroom' },
  whatsapp: 'https://wa.me/6281200000001',
  images: [],
  body: [],
  booking: { href: '/book-a-visit' },
  pickup: true,
  inStock: streamed([card(7002, 'Harbour of Contoh — Tote', { badge: 'in-showroom' })]),
  seo: seo('The Showroom', '/visit/showroom'),
  breadcrumbs: [{ label: 'Visit', href: '/visit' }],
}

export const ig: IgVM = {
  surface: 'ig',
  profile: { handle: '@fixture.emporium', href: 'https://instagram.example/fixture' },
  posts: [
    {
      image: image('ig-post-1', 1080, 1350, 'The tote on a café table'),
      caption: 'New in the showroom.',
      postedAt: '2026-09-20',
      products: streamed([card(7002, 'Harbour of Contoh — Tote')]),
    },
  ],
  seo: seo('Sample Emporium on Instagram', '/ig'),
}

export const newsletterArchive: NewsletterArchiveVM = {
  surface: 'newsletterArchive',
  subject: 'New arrivals: the Example Islands',
  sentAt: '2026-09-15T08:00:00+07:00',
  html: '<h1>New arrivals</h1><p>Three charts of imagined islands.</p>',
  previous: null,
  next: null,
  signup: { sourceKey: 'archive' },
  seo: seo('New arrivals: the Example Islands', '/newsletter/2026-09-15'),
  breadcrumbs: [{ label: 'Newsletter', href: '/newsletter' }],
}
