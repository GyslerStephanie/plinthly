// Live tweak panel — the prototype's Motion/Style knobs surfaced as real
// on-page controls: pace (speed ×), density (house count), coral-roofs toggle.
export default function Controls({ pace, density, coralRoofs, onChange }) {
  return (
    <div className="hero__controls" role="group" aria-label="Scene controls">
      <div className="hero__controls-title">Tweaks</div>

      <label className="hero__control">
        <span className="hero__control-label">
          Pace
          <span className="hero__control-value">{pace.toFixed(1)}×</span>
        </span>
        <input
          type="range"
          min="0.3"
          max="2.5"
          step="0.1"
          value={pace}
          onChange={(e) => onChange({ pace: Number(e.target.value) })}
        />
      </label>

      <label className="hero__control">
        <span className="hero__control-label">
          Density
          <span className="hero__control-value">{density}</span>
        </span>
        <input
          type="range"
          min="4"
          max="24"
          step="1"
          value={density}
          onChange={(e) => onChange({ density: Number(e.target.value) })}
        />
      </label>

      <label className="hero__control hero__control--row">
        <span className="hero__control-label">Coral roofs</span>
        <input
          type="checkbox"
          checked={coralRoofs}
          onChange={(e) => onChange({ coralRoofs: e.target.checked })}
        />
      </label>
    </div>
  )
}
