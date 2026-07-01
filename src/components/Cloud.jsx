// Blocky voxel cloud. `tint` fills the underside shadow so far clouds read
// against the sky and near clouds against the cream horizon.
export default function Cloud({ tint = '#dbe9e8', style }) {
  return (
    <div className="cloud-layer" style={style}>
      <svg viewBox="0 0 180 80" width="100%" height="100%">
        <rect x="24" y="50" width="132" height="22" rx="8" fill="#ffffff" />
        <rect x="40" y="38" width="100" height="28" rx="10" fill="#ffffff" />
        <rect x="60" y="24" width="60" height="24" rx="9" fill="#ffffff" />
        <rect x="94" y="32" width="54" height="24" rx="9" fill="#ffffff" />
        <rect x="24" y="64" width="132" height="10" rx="5" fill={tint} />
      </svg>
    </div>
  )
}
