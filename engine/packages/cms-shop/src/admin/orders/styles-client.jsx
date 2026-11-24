'use client'

/**
 * The orders screens' stylesheet (TASKS.md 27.3), loaded the way the product editor's is (27.2):
 * from a client component, so Next bundles the CSS with the admin and the server view itself
 * imports none (Node cannot load a `.css` file when a test imports the view's modules). Also the
 * packing slip's Print button — the one thing on these screens that needs the browser.
 */
import './orders.css'

export function OrdersStyles() {
  return null
}

export function PrintButton({ children }) {
  return (
    <button type="button" className="ix-btn ix-btn--primary" onClick={() => globalThis.print()}>
      {children}
    </button>
  )
}
