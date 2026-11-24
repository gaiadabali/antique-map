/**
 * The admin's two marks (TASKS.md 16), Payload's `admin.components.graphics`: the sign-in page's
 * wordmark (`Logo`) and the small one in the sidebar and breadcrumbs (`Icon`). Type set in the
 * brand's faces by the admin's stylesheets (`app/(payload)/admin/theme-shell.css`, `.ix-mark*`);
 * no image, so it is sharp at every size and needs no asset. `.jsx`: see `../leads/shared.jsx`.
 */

/**
 * The sign-in mark: the Old East Indies logo (the shop's own file, served from the admin's host,
 * so the admin CSP's `img-src 'self'` holds) — the page's one heading, in a `<header>` so it is
 * the page's banner, not content outside every landmark (axe `region`).
 */
export function AdminLogo() {
  return (
    <header className="ix-mark ix-mark--logo">
      <h1 className="ix-mark__name">
        <img
          className="ix-mark__image"
          src="/shop/logo.svg"
          alt="Old East Indies"
          width="288"
          height="368"
        />
      </h1>
    </header>
  )
}

/**
 * The small mark, for the sidebar's head and the breadcrumbs' home: the Old East Indies logo, as
 * on the sign-in page (the owner's request, 2026-11-16), small.
 */
export function AdminIcon() {
  return (
    <img
      className="ix-mark ix-mark--icon ix-mark__icon-image"
      src="/shop/logo.svg"
      alt="Old East Indies"
      width="288"
      height="368"
    />
  )
}
