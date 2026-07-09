import { useState } from 'react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import Drawer from './Drawer'

/**
 * Manager add/edit desk form in the shared drawer (DESIGN.md §2.12). Desks
 * are always type "Desk" / capacity 1 — those aren't fields; the frontend
 * sends fixed values. Edit mode adds the Active choice-row toggle.
 */
export default function SpaceFormDrawer({ mode, space, offices, onClose, onSaved }) {
  const toast = useToast()
  const editing = mode === 'edit'

  const [name, setName] = useState(space?.name ?? '')
  const [officeId, setOfficeId] = useState(String(space?.officeId ?? offices[0]?.id ?? ''))
  const [amenities, setAmenities] = useState((space?.amenities ?? []).join(', '))
  const [isActive, setIsActive] = useState(space?.isActive !== false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  async function save() {
    const errs = {}
    if (!name.trim()) errs.name = 'Give the desk a name.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload = {
      officeId: Number(officeId),
      name: name.trim(),
      type: 'Desk',
      capacity: 1,
      amenities: amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    }

    setBusy(true)
    try {
      const saved = editing
        ? await api.updateSpace(space.id, { ...payload, isActive })
        : await api.createSpace(payload)
      onSaved(saved, { ...payload, isActive })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      kicker="Inventory"
      title={editing ? 'Edit desk' : 'Add desk'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy ? 'Saving…' : 'Save desk'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="field-label" htmlFor="space-name">
          Name
        </label>
        <input
          className={`input${errors.name ? ' is-invalid' : ''}`}
          id="space-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="space-office">
          Office
        </label>
        <select
          className="select"
          id="space-office"
          value={officeId}
          onChange={(e) => setOfficeId(e.target.value)}
        >
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="space-amenities">
          Amenities
        </label>
        <input
          className="input"
          id="space-amenities"
          value={amenities}
          onChange={(e) => setAmenities(e.target.value)}
        />
        <p className="field-hint">Comma-separated, e.g. Monitor, Window</p>
      </div>

      {editing && (
        <div className="field">
          <span className="field-label">Status</span>
          <div className="choice-row" role="radiogroup" aria-label="Status">
            <label className="choice">
              <input
                type="radio"
                name="space-active"
                value="active"
                checked={isActive}
                onChange={() => setIsActive(true)}
              />
              <span className="choice-body">
                <strong>Active</strong>
                <span>Shows on the board</span>
              </span>
            </label>
            <label className="choice">
              <input
                type="radio"
                name="space-active"
                value="inactive"
                checked={!isActive}
                onChange={() => setIsActive(false)}
              />
              <span className="choice-body">
                <strong>Inactive</strong>
                <span>Hidden, history kept</span>
              </span>
            </label>
          </div>
        </div>
      )}
    </Drawer>
  )
}
