/**
 * The server's own reading of a turn, beside the classifier (AI.md §2.1 steps 3 and 6). The
 * classifier is a model and can label a "hold it till Friday" as `item_question`; the model can
 * offer WhatsApp in prose and never call `handoff_link`. Neither may leave a visitor who asked for
 * a deal, a promise or a person without the contact buttons, so these plain patterns decide it as
 * well — in English and Indonesian, over the masked text. A false positive costs two extra buttons;
 * a false negative leaves the visitor with an offer and nothing to press.
 */
import 'server-only'

import type { HandoffTopic } from '../tools/schemas'
import type { SiteKey } from '../types'

type Ask = { readonly topic: HandoffTopic; readonly pattern: RegExp }

/** Asks either site answers with a person: deals, holds, promises, dates, bulk, a visit. */
const BOTH: readonly Ask[] = [
  {
    topic: 'price',
    pattern:
      /\b(discount|best price|better price|special price|deal|part.?exchange|trade.?in|instal(l)?ments?|pay (later|next week|tomorrow)|diskon|potongan|harga (terbaik|khusus|spesial|grosir)|nego|tawar|cicil(an)?|bayar (nanti|besok|minggu depan))\b/i,
  },
  {
    topic: 'general',
    pattern:
      /\b(hold|reserve|set aside|keep (it|this|them|one)( \w+)? for me|tahan|simpan(kan)? (untuk|buat) saya|jangan dijual|tidak dijual ke orang lain|promise|guarantee|janji|dijamin|pastikan)\b/i,
  },
  {
    topic: 'delivery',
    pattern:
      /\b((reach|arrive|deliver(ed)?|ship(ped)?|get (it|there)|send it)\b.{0,40}\b(by|before|until|tomorrow|today|tonight|next (week|month)|in time)|(sampai|tiba|dikirim|kirim|antar)\b.{0,30}\b(besok|lusa|hari ini|nanti malam|minggu depan|sebelum))\b/i,
  },
  {
    topic: 'general',
    pattern:
      /\b(bulk|wholesale|grosir|(order|buy|beli|pesan)\b.{0,20}\b(\d{2,}|ten|twenty|thirty|fifty|hundred|sepuluh|dua puluh|lima puluh|seratus)\b)/i,
  },
  {
    topic: 'general',
    pattern:
      /\b(in person|viewing|appointment|visit (the|your) (gallery|showroom|store)|(lihat|melihat)\b.{0,25}\blangsung|janji temu|berkunjung)\b/i,
  },
]

/** On the gallery every price, value or currency question is "price on request" and a handoff. */
const GALLERY: readonly Ask[] = [
  {
    topic: 'price',
    pattern:
      /\b(price[ds]?|pricing|cost|how much|worth|value|valuation|apprais\w*|insur\w*|list it for|euros?|dollars?|usd|sgd|rupiah|idr|(owner|he|she|they) (said|told|quoted)|harga\w*|berapa|nilai\w*|taksiran|perkiraan)\b/i,
  },
]

/** The handoff topic a visitor's message asks for on its own words, or `null`. */
export function askedHandoff(text: string, site: SiteKey): HandoffTopic | null {
  const asks = site === 'gallery' ? [...GALLERY, ...BOTH] : BOTH
  return asks.find((ask) => ask.pattern.test(text))?.topic ?? null
}

const OFFERS_CONTACT =
  /\b(whats\s?app|e-?mail|contact (the|our) team|get in touch|reach (the|our) team|our team (can|will)|hubungi (tim|kami|galeri|toko)|lewat (whatsapp|email|surel)|tim kami (bisa|akan|dapat))\b/i

/** The reply itself points the visitor at WhatsApp, email or the team. */
export function replyOffersHandoff(reply: string): boolean {
  return OFFERS_CONTACT.test(reply)
}
