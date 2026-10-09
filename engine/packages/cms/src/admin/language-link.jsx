/**
 * A link at the bottom of the sidebar to the Language setting on the account page, where Payload keeps each user's admin
 * language: a server component for `admin.components.afterNavLinks`. The admin's default language
 * stays English (ARCHITECTURE.md §11); this only makes the switch easy to find. The text names
 * both languages whichever one is showing, so a reader of either finds it. `.jsx`: see
 * `./leads/shared.jsx`'s header.
 */
const HINT = {
  en: 'Change the admin language on your account page',
  id: 'Ganti bahasa admin di halaman akun Anda',
}

export async function LanguageLink({ user, i18n }) {
  if (!user) return null
  const language = i18n?.language === 'id' ? 'id' : 'en'
  return (
    <a className="nav__link" href="/admin/account#language-select" title={HINT[language]}>
      Bahasa Indonesia / English
    </a>
  )
}
