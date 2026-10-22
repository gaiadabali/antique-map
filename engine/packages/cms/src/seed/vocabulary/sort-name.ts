/**
 * The maker line as a collector's sort reads it (the field is required, and the old site never
 * stated one): surname first, letters upper — "BLAEU, Willem Janszoon"; a particle rides with
 * the surname ("DE L' ISLE, Guillaume"); a trailing parenthetical ("(Ptolemy)", "(1588 – 1664)")
 * stays with the given name; a name that is already a sort line or an office's name sorts as it
 * is. Deterministic over the name, so the same seed always writes the same line.
 */
const ORGANISATION = /&|\b(Office|Society|Club|Association|Company|Press|Bureau|Survey|Admiralty)\b/
const PARTICLE = /\s(van|von|de|der|den|del|della|du|di|ten|ter|tot|zu)\b/i

export function sortNameOf(name: string): string {
  if (name.includes(',') || ORGANISATION.test(name)) return name
  const note = name.match(/\s*\([^)]*\)\s*$/)
  const base = (note?.index !== undefined ? name.slice(0, note.index) : name).trim()
  const suffix = note ? ` ${name.slice(note.index ?? 0).trim()}` : ''
  const particle = base.match(PARTICLE)
  const surnameStart =
    particle?.index !== undefined ? particle.index + 1 : base.lastIndexOf(' ') + 1
  const surname = base.slice(surnameStart).trim()
  const given = base.slice(0, surnameStart).trim()
  if (surname === '') return `${base.toUpperCase()}${suffix}`
  return `${surname.toUpperCase()}, ${given}${suffix}`
}
