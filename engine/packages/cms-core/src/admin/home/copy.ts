/**
 * The admin home's own words (`./view.jsx`): the card labels come from the sidebar's copy and the
 * collections' configs; the group titles from `../groups.ts`. Both languages for every key.
 */
const HOME_COPY = {
  title: { en: 'Dashboard', id: 'Dasbor' },
  create: { en: 'Create new {label}', id: 'Buat {label} baru' },
  open: { en: 'Open {label}', id: 'Buka {label}' },
} as const

export type HomeCopyKey = keyof typeof HOME_COPY

export function homeText(
  key: HomeCopyKey,
  language: string | undefined,
  params: Readonly<Record<string, string>> = {},
): string {
  const text: string = HOME_COPY[key][language === 'id' ? 'id' : 'en']
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => params[name] ?? whole)
}
