// Logo: a rice leaf with a satellite on its orbit — the field seen from space.
// The name comes from src/config/brand.js; nothing here hardcodes it.
import { PROJECT_NAME, PROJECT_NAME_PARTS } from '../../config/brand';

export function LogoGlyph({ size = 40, inverse = false }) {
  const bg = inverse ? '#f0f6ec' : '#153a1d';
  const leaf = inverse ? '#2f6e2f' : '#8dbe78';
  const vein = inverse ? '#f0f6ec' : '#153a1d';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0 transition-transform duration-300 ease-[cubic-bezier(.34,1.4,.64,1)] group-hover:scale-105 group-hover:rotate-1">
      <rect width="40" height="40" rx="11" fill={bg} />
      <path d="M8.5 27.5C10.5 17 18.5 10 31 9.5C30 21.5 22.5 29.5 12 30.5Z" fill={leaf} />
      <path d="M10.5 29C15 23 20.5 17.5 27 13" stroke={vein} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <ellipse cx="20" cy="20" rx="16.5" ry="7" transform="rotate(-28 20 20)" fill="none" stroke="#edc067" strokeWidth="1.3" strokeDasharray="2.2 2.4" opacity=".9" />
      <circle cx="33.2" cy="11.2" r="2.3" fill="#edc067" />
    </svg>
  );
}

export default function BrandMark({ compact = false, inverse = false, sub, size = 40 }) {
  return (
    <span className="group flex items-center gap-2.5 transition-transform duration-200 active:scale-95" aria-label={PROJECT_NAME}>
      <LogoGlyph inverse={inverse} size={size} />
      {!compact && (
        <span className="leading-none">
          <span className={`font-display block text-[21px] font-bold tracking-[-0.015em] transition-colors duration-200 ${inverse ? 'text-white' : 'text-ink group-hover:text-primary-900'}`}>
            {PROJECT_NAME_PARTS.main}{PROJECT_NAME_PARTS.accent && <span className={inverse ? 'text-paddy-300' : 'text-primary-600'}> {PROJECT_NAME_PARTS.accent}</span>}
          </span>
          {sub && <span className={`mt-1 block text-[12px] font-medium ${inverse ? 'text-primary-200' : 'text-muted'}`}>{sub}</span>}
        </span>
      )}
    </span>
  );
}
