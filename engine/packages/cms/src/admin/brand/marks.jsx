/**
 * The admin's two marks (TASKS.md 16), Payload's `admin.components.graphics`: the sign-in page's
 * wordmark (`Logo`) and the small one in the sidebar and breadcrumbs (`Icon`). Type set in the
 * brand's faces by the admin's stylesheets (`app/(payload)/admin/theme-shell.css`, `.ix-mark*`);
 * no image, so it is sharp at every size and needs no asset. `.jsx`: see `../leads/shared.jsx`.
 */

/** The sign-in wordmark: the house name over the two sites it keeps. */
export function AdminLogo() {
  return (
    <div className="ix-mark ix-mark--logo">
      <span className="ix-mark__name">Indies</span>
      <span className="ix-mark__rule" aria-hidden="true" />
      <span className="ix-mark__sites">Indies Gallery · Old East Indies</span>
    </div>
  )
}

/** The small mark: the house name alone, for the sidebar's head and the breadcrumbs' home. */
export function AdminIcon() {
  return (
    <span className="ix-mark ix-mark--icon" aria-label="Indies">
      Indies
    </span>
  )
}
