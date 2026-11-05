import { memo } from 'react';

/**
 * FarmerAtmosphere — World-class atmospheric backdrop for the FieldShift 360 farmer portal.
 * Blends living agro-climatic gradients (Aman emerald, sunrise mustard, river mist, Barind clay)
 * with tactile agrarian topography and precision satellite field grid lines.
 */
function FarmerAtmosphere() {
  return (
    <div
      className="farmer-atmosphere pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Dynamic agro-climatic gradient aura orbs */}
      <div className="farmer-aura-orb farmer-aura-emerald" />
      <div className="farmer-aura-orb farmer-aura-gold" />
      <div className="farmer-aura-orb farmer-aura-river" />
      <div className="farmer-aura-orb farmer-aura-silt" />
      <div className="farmer-aura-orb farmer-aura-canopy" />

      {/* Tactile agrarian topography & precision field surveying grid */}
      <svg
        className="farmer-topo-grid absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          {/* 40px cadastral survey micro-grid with center geo-dot */}
          <pattern id="farmer-field-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#245a28" strokeWidth="0.65" strokeOpacity="0.04" />
            <circle cx="20" cy="20" r="0.85" fill="#245a28" fillOpacity="0.065" />
          </pattern>

          {/* Organic topographic contour waves reminiscent of river delta terraces */}
          <pattern id="farmer-field-contours" width="280" height="200" patternUnits="userSpaceOnUse">
            <path
              d="M 0 35 C 70 15, 140 55, 210 35 S 280 15, 350 35"
              fill="none"
              stroke="#245a28"
              strokeWidth="0.9"
              strokeDasharray="4 6"
              strokeOpacity="0.045"
            />
            <path
              d="M 0 95 C 60 115, 150 75, 220 95 S 280 115, 350 95"
              fill="none"
              stroke="#245a28"
              strokeWidth="0.9"
              strokeOpacity="0.035"
            />
            <path
              d="M 0 155 C 80 140, 160 170, 240 155 S 300 140, 360 155"
              fill="none"
              stroke="#245a28"
              strokeWidth="0.8"
              strokeDasharray="3 5"
              strokeOpacity="0.03"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#farmer-field-grid)" />
        <rect width="100%" height="100%" fill="url(#farmer-field-contours)" />
      </svg>

      {/* Atmospheric perimeter vignette for depth & soft focus */}
      <div className="farmer-atmosphere-vignette absolute inset-0" />
    </div>
  );
}

export default memo(FarmerAtmosphere);
