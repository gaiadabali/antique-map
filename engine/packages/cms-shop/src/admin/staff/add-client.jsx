'use client'
/**
 * The quick add-staff form (TASKS.md 27.6.c): what the person does first — store staff, the
 * account the owner adds most, already chosen — then their store, name, email and the password the
 * owner chooses, all on one short screen. It posts to Payload's own `POST /api/users`, so every
 * rule of the collection runs (the owner alone adds staff, a store user has one store, the email is
 * unique, the password policy); a refusal is shown field by field. Styled by the admin's `ix-*`
 * classes, as the orders and import screens are.
 */
import { useState } from 'react'

import { S } from './copy'
import { StorePicker } from './store-picker'
import './staff.css'

const ROLES = ['store', 'editor', 'owner']

/** Payload's REST refusal as `{ message, fields: { path: message } }`. */
function refusalOf(json, fallback) {
  const first = Array.isArray(json?.errors) ? json.errors[0] : null
  const fields = {}
  for (const each of first?.data?.errors ?? []) {
    if (each?.path && each?.message) fields[each.path] = each.message
  }
  return { message: first?.message || json?.message || fallback, fields }
}

function Field({ id, label, error, children }) {
  return (
    <>
      <label className="ix-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="ix-notice ix-notice--error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </>
  )
}

function Added({ added, language, onAgain }) {
  return (
    <div className="ix-card">
      <div role="status" className="ix-notice ix-notice--ok">
        {S('added', language, { name: added.name, email: added.email })}
      </div>
      <div className="ix-actions">
        <button type="button" className="ix-btn ix-btn--primary" onClick={onAgain}>
          {S('another', language)}
        </button>
        <a className="ix-link" href={`/admin/collections/users/${added.id}`}>
          {S('open', language)}
        </a>
      </div>
    </div>
  )
}

export function AddStaffClient({ language, stores, initialStore = '' }) {
  const [role, setRole] = useState('store')
  const [working, setWorking] = useState(false)
  const [problem, setProblem] = useState(null)
  const [added, setAdded] = useState(null)

  async function submit(event) {
    event.preventDefault()
    const form = new globalThis.FormData(event.currentTarget)
    const value = (name) => String(form.get(name) ?? '').trim()
    const body = {
      name: value('name'),
      email: value('email'),
      password: String(form.get('password') ?? ''),
      role,
      ...(role === 'store' && value('store') ? { store: Number(value('store')) } : {}),
    }
    setWorking(true)
    setProblem(null)
    try {
      const response = await globalThis.fetch('/api/users?depth=0', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await response.json().catch(() => ({}))
      if (response.ok && json?.doc?.id)
        setAdded({ id: json.doc.id, name: body.name, email: body.email })
      else setProblem(refusalOf(json, S('failed', language)))
    } catch {
      setProblem({ message: S('network', language), fields: {} })
    } finally {
      setWorking(false)
    }
  }

  if (added) return <Added added={added} language={language} onAgain={() => setAdded(null)} />
  const fields = problem?.fields ?? {}
  return (
    <form className="ix-card" onSubmit={submit} noValidate>
      {problem ? (
        <div role="alert" className="ix-notice ix-notice--error">
          {problem.message}
        </div>
      ) : null}
      <fieldset className="ix-staff-roles">
        <legend className="ix-label">{S('role', language)}</legend>
        {ROLES.map((value) => (
          <label key={value} className="ix-pick__line">
            <input
              type="radio"
              name="role"
              value={value}
              className="ix-check"
              checked={role === value}
              onChange={() => setRole(value)}
            />
            {S(`role_${value}`, language)}
          </label>
        ))}
      </fieldset>
      {role === 'store' ? (
        stores.length === 0 ? (
          <p className="ix-notice ix-notice--error">{S('noStores', language)}</p>
        ) : (
          <Field id="staff-store" label={S('store', language)} error={fields.store}>
            <StorePicker
              id="staff-store"
              language={language}
              stores={stores}
              initial={initialStore}
            />
          </Field>
        )
      ) : null}
      <Field id="staff-name" label={S('name', language)} error={fields.name}>
        <input id="staff-name" name="name" className="ix-input" autoComplete="off" />
      </Field>
      <Field id="staff-email" label={S('email', language)} error={fields.email}>
        <input
          id="staff-email"
          name="email"
          type="email"
          className="ix-input"
          autoComplete="off"
          inputMode="email"
        />
      </Field>
      {/* Shown as typed: the owner reads it back to the person, who changes it later. */}
      <Field id="staff-password" label={S('password', language)} error={fields.password}>
        <input
          id="staff-password"
          name="password"
          type="text"
          className="ix-input"
          autoComplete="new-password"
          spellCheck={false}
        />
      </Field>
      <div className="ix-actions">
        <button type="submit" className="ix-btn ix-btn--primary" disabled={working}>
          {working ? S('saving', language) : S('save', language)}
        </button>
      </div>
    </form>
  )
}
