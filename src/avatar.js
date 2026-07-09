// Deterministic identity marker (DESIGN.md §2.6 / §4.6) — no photos exist,
// so every person gets initials + one of four muted tones, always the same
// tone for the same name.
//
// initials: first letters of first + last name, e.g. "Kwame Mensah" -> "KM".
// tone: simpleHash(fullName) % 4 -> .avatar-tone-{0..3}. DESIGN.md names the
// hash "simpleHash" but doesn't specify its body; this is the classic djb2
// string hash — deterministic and stable across renders/sessions, which is
// the only real requirement here.

export function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function simpleHash(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return Math.abs(hash)
}

export function avatarTone(name) {
  return simpleHash(name || '') % 4
}

export function avatarToneClass(name) {
  return `avatar-tone-${avatarTone(name)}`
}
