import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, reverseGeocode } from '../api'
import { useToast } from '../ToastContext'
import BloodTypePicker from '../components/BloodTypePicker'
import { ProfileSkeleton } from '../components/Skeletons'

export default function DonorProfile() {
  const toast = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [form, setForm] = useState({
    bloodType: '',
    latitude: '',
    longitude: '',
    city: '',
    isAvailable: true,
    isAnonymous: false,
  })

  useEffect(() => {
    api
      .getMyDonorProfile()
      .then((p) =>
        setForm({
          bloodType: p.bloodType,
          latitude: p.latitude,
          longitude: p.longitude,
          city: p.city || '',
          isAvailable: p.isAvailable,
          isAnonymous: p.isAnonymous,
        })
      )
      .catch(() => {
        /* no profile yet — keep defaults */
      })
      .finally(() => setLoading(false))
  }, [])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast('Your browser does not support location.', 'error')
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
        toast("We couldn't read your location. You can type the coordinates instead.", 'error')
      }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.bloodType) {
      toast('Please pick your blood type first.', 'error')
      return
    }
    setBusy(true)
    try {
      await api.saveDonorProfile({
        bloodType: form.bloodType,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        city: form.city || null,
        isAvailable: form.isAvailable,
        isAnonymous: form.isAnonymous,
        lastDonationDate: null,
      })
      toast('Profile saved.', 'success')
      navigate('/donor')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page"><ProfileSkeleton /></div>

  return (
    <div className="page">
      <div className="glass form-card">
        <h2 style={{ marginBottom: 6 }}>Your donor profile</h2>
        <p className="muted small" style={{ marginBottom: 22 }}>
          A few details so the right person can find you when it matters.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Blood type</label>
            <BloodTypePicker value={form.bloodType} onChange={(v) => set('bloodType', v)} />
          </div>

          <div className="field">
            <label>Where are you based?</label>
            <span className="hint">We only use this to match you with nearby requests.</span>
            <button type="button" className="btn btn-ghost" onClick={useMyLocation} disabled={locating}>
              {locating ? 'Finding you…' : 'Use my current location'}
            </button>
          </div>

          <div className="field">
            <label>Latitude</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              placeholder="5.6037"
              required
            />
          </div>
          <div className="field">
            <label>Longitude</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              placeholder="-0.1870"
              required
            />
          </div>

          <div className="field">
            <label>City or area</label>
            <input
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Accra, Kumasi, Takoradi…"
            />
          </div>

          <div className="field">
            <div className="availability-row">
              <div>
                <label style={{ margin: 0 }}>Available to donate</label>
                <div className="hint">Turn this off any time — you'll stay on the map, marked unavailable.</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => set('isAvailable', e.target.checked)}
                />
                <span className="track" />
                <span className="thumb" />
              </label>
            </div>
          </div>

          <div className="field">
            <div className="availability-row">
              <div>
                <label style={{ margin: 0 }}>Stay anonymous</label>
                <div className="hint">Your name is hidden from requesters; your blood type and contact stay visible.</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={(e) => set('isAnonymous', e.target.checked)}
                />
                <span className="track" />
                <span className="thumb" />
              </label>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
