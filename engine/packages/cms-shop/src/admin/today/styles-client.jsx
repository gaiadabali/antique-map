'use client'

/**
 * The "Today" home's stylesheet (TASKS.md 27.6.a), loaded the way the orders screens' is: from a
 * client component, so Next bundles the CSS with the admin and the server view imports none (Node
 * cannot load a `.css` file when a test imports the view's modules).
 */
import './today.css'

export function TodayStyles() {
  return null
}
