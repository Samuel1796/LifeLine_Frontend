import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, reverseGeocode } from '../api'
import { useToast } from '../ToastContext'
import BloodTypePicker from '../components/BloodTypePicker'

const URGENCIES = ['Low', 'Medium', 'High', 'Critical']

export default function NewRequest() {
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // Arriving via "Ask this donor" pre-targets the request at one person.
  const targetDonorId = params.get('donorId')
  const targetDonorName = params.get('name')

  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [form, setForm] = useState({
    bloodType: params.get('bloodType') || '',
    patientName: '',
    hospitalName: '',
    urgency: 'High',
    latitude: '',
    longitude: '',
    city: '',
    unitsNeeded: 1,
    notes: '',
  })

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by this browser.', 'error')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        set('latitude', pos.coords.latitude.toFixed(6))
        set('longitude', pos.coords.longitude.toFixed(6))
        const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        if (city) set('city', city)
        setLocating(false)
        toast(city ? `Location captured — ${city}.` : 'Location captured.', 'success')
      },
      () => {
        setLocating(false)
        toast('Could not get your location. Enter coordinates manually.', 'error')
      }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.bloodType) {
      toast('Please select the blood type needed.', 'error')
      return
    }
    setBusy(true)
    try {
      const { request, notifiedDonors } = await api.createRequest({
        bloodType: form.bloodType,
        patientName: form.patientName,
        hospitalName: form.hospitalName || null,
        urgency: form.urgency,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        city: form.city || null,
        unitsNeeded: Number(form.unitsNeeded),
        notes: form.notes || null,
        targetDonorUserId: targetDonorId ? Number(targetDonorId) : null,
      })
      if (targetDonorId) {
        toast(`Your request was sent directly to ${targetDonorName || 'the donor'}.`, 'success')
      } else if (notifiedDonors > 0) {
        toast(`${notifiedDonors} nearby donor${notifiedDonors > 1 ? 's were' : ' was'} alerted.`, 'success')
      } else {
        toast('Request created, but no compatible donors are within 50 km right now. Try asking a donor directly from the map.', 'info')
      }
      navigate(`/requests/${request.id}`)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="glass form-card wide">
        <h2 style={{ marginBottom: 6 }}>Request blood</h2>
        <p className="muted small" style={{ marginBottom: targetDonorId ? 14 : 22 }}>
          {targetDonorId
            ? 'This request goes straight to one donor.'
            : 'Compatible donors within 50 km will be notified instantly.'}
        </p>

        {targetDonorId && (
          <div className="target-banner">
            Sending directly to <strong>{targetDonorName || 'selected donor'}</strong>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/requests/new', { replace: true })}
            >
              Send to everyone instead
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Blood type needed</label>
            <BloodTypePicker value={form.bloodType} onChange={(v) => set('bloodType', v)} />
          </div>

          <div className="form-row">
            <div className="field">
              <label>Patient name</label>
              <input
                value={form.patientName}
                onChange={(e) => set('patientName', e.target.value)}
                placeholder="Patient or family name"
                required
                minLength={2}
              />
            </div>
            <div className="field">
              <label>Hospital (optional)</label>
              <input
                value={form.hospitalName}
                onChange={(e) => set('hospitalName', e.target.value)}
                placeholder="Korle Bu Teaching Hospital"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>Urgency</label>
              <select value={form.urgency} onChange={(e) => set('urgency', e.target.value)}>
                {URGENCIES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Units needed</label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.unitsNeeded}
                onChange={(e) => set('unitsNeeded', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Location of need</label>
            <button type="button" className="btn btn-ghost" onClick={useMyLocation} disabled={locating}>
              {locating ? 'Finding you…' : 'Use my current location'}
            </button>
          </div>

          <div className="form-row">
            <div className="field">
              <label>Latitude</label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => set('latitude', e.target.value)}
                placeholder="5.6037"
                required
              />
            </div>
            <div className="field">
              <label>Longitude</label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => set('longitude', e.target.value)}
                placeholder="-0.1870"
                required
              />
            </div>
          </div>

          <div className="field">
            <label>City / area (optional)</label>
            <input
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Accra Central"
            />
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any extra details donors should know…"
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Sending alert…' : 'Send request to nearby donors'}
          </button>
        </form>
      </div>
    </div>
  )
}
