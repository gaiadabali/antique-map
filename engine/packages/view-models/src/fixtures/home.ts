/**
 * @contract C2 — fixture `home` · owner: ARC
 * Two compositions of the same band kinds: the gallery's (one object, new arrivals, places,
 * trust, newsletter) and the shop's (hero line, format ladder, occasions, visit, Instagram).
 */
import type { HomeVM } from '../surfaces/editorial'
import { card, image, money, price, seo, streamed } from './_shared'

export const homeGallery: HomeVM = {
  surface: 'home',
  bands: [
    {
      kind: 'feature',
      title: 'The Isle of Contoh, 1718',
      lede: 'The first map to give the island its whole coastline.',
      image: image('feature-1001', 2400, 1920, 'The Isle of Contoh, recto'),
      link: { label: 'See the map', href: '/product/1001-isle-of-contoh-voorbeeld-1718' },
    },
    {
      kind: 'rail',
      rail: streamed({
        kind: 'newArrivals',
        title: 'New arrivals',
        items: [card('1008', 'View of the Harbour', { badge: 'new' })],
        more: { label: 'All new arrivals', href: '/browse?availability=new30' },
      }),
    },
    {
      kind: 'places',
      title: 'Browse by place',
      places: [{ label: 'Pulau Contoh', href: '/places/contoh', count: 24 }],
    },
    {
      kind: 'trust',
      title: 'Buying here',
      items: [
        { title: 'The certificate', body: 'Every original ships with one.', href: '/certificate' },
      ],
    },
    { kind: 'newsletter', title: 'New arrivals, fortnightly', body: null, sourceKey: 'home' },
  ],
  seo: seo('Fixture Gallery', '/'),
}

export const homeShop: HomeVM = {
  surface: 'home',
  bands: [
    {
      kind: 'feature',
      title: 'Harbour of Contoh',
      lede: 'From the archive, printed in the showroom.',
      image: image('hero-a0042', 2400, 1350, 'The harbour print in a sunlit room'),
      link: { label: 'Shop the line', href: '/collections/harbour' },
    },
    {
      kind: 'formatLadder',
      title: 'One artwork, every format',
      steps: streamed([
        {
          label: 'Postcard',
          image: image('ladder-card', 640, 427, 'Postcard'),
          price: price(money(25000, 'IDR')),
          href: '/product/7003-harbour-postcard',
        },
      ]),
    },
    {
      kind: 'visit',
      location: {
        name: 'The Showroom',
        href: '/visit/showroom',
        address: ['Jl. Contoh No. 1', 'Denpasar'],
        hours: {
          timeZone: 'Asia/Makassar',
          weekly: [{ days: 'Mon–Sat', opens: '10:00', closes: '18:00' }],
          byAppointment: false,
          closure: null,
        },
        map: { lat: -8.65, lng: 115.21, href: 'https://maps.example.test/?q=showroom' },
        whatsapp: 'https://wa.me/6281200000001',
      },
    },
    {
      kind: 'welcomeOffer',
      title: 'A welcome gift',
      body: '10% off your first order.',
      channels: ['email', 'whatsapp'],
    },
  ],
  seo: seo('Sample Emporium', '/'),
}
