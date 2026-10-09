/**
 * The stock import screen at `/admin/stock-import` (TASKS.md 10.8.a): owner only. The server part
 * checks the role and hands the language to the upload form (`./client.jsx`), which posts the file
 * to the stock-levels import endpoint (`../../collections/stock-levels/import-endpoint.ts`) twice:
 * Preview (a dry run), then Apply. `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { roleOf } from '../../collections/users/roles'
import { Notice } from '../leads/shared'
import { StockImportClient } from './client'
import { L } from './copy'
import { AdminPage } from '../page'

/** The view inside Payload's page frame (`../page.jsx`): the sidebar stays on every screen. */
export async function StockImportView(props) {
  return <AdminPage view={props}>{await StockImportViewBody(props)}</AdminPage>
}

async function StockImportViewBody(props) {
  const req = props.initPageResult?.req
  const language = props.i18n?.language === 'id' ? 'id' : 'en'
  if (roleOf(req?.user) !== 'owner') {
    return <Notice tone="error">{L('refusalNotOwner', language)}</Notice>
  }
  return (
    <div>
      <h1>{L('title', language)}</h1>
      <p>{L('intro', language)}</p>
      <StockImportClient language={language} />
    </div>
  )
}
