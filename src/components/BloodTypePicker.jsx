const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']

export default function BloodTypePicker({ value, onChange }) {
  return (
    <div className="blood-grid">
      {BLOOD_TYPES.map((type) => (
        <button
          type="button"
          key={type}
          className={`blood-option ${value === type ? 'selected' : ''}`}
          onClick={() => onChange(type)}
        >
          {type}
        </button>
      ))}
    </div>
  )
}
