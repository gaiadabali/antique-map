/** Types for `./store-home.jsx` — structural; the dashboard hands `beforeDashboard` the signed-in `user`. */
export const STORE_HOME: string

export type StoreHomeRedirectProps = { readonly user?: unknown }

export function StoreHomeRedirect(props: StoreHomeRedirectProps): Promise<null>
