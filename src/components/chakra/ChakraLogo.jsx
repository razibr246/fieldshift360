// The চক্র এজেন্ট mark: a wheel (চক্র) of eight leaf spokes, the seasons turning, around a satellite eye, ringed in the
// paddy-gold to river-teal of the app. `spin` turns the wheel while the agent works.
import { useId } from 'react';

export default function ChakraLogo({ size = 32, spin = false, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4c64e" /><stop offset=".5" stopColor="#43863a" /><stop offset="1" stopColor="#1d9a9a" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9e39a" /><stop offset="1" stopColor="#2f6e2f" />
        </linearGradient>
        <radialGradient id={`${id}c`} cx=".35" cy=".35" r=".8">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".35" stopColor="#8fe3e0" /><stop offset="1" stopColor="#0d5560" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="#0d2614" />
      <circle cx="24" cy="24" r="20.5" fill="none" stroke={`url(#${id}r)`} strokeWidth="2.4" />
      <g className={spin ? 'chakra-spin' : ''} style={{ transformOrigin: '24px 24px' }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M24 23 C21.2 18.5 21.6 12.4 24 7.6 C26.4 12.4 26.8 18.5 24 23 Z" fill={`url(#${id}l)`} opacity={a % 90 ? 0.72 : 1} transform={`rotate(${a} 24 24)`} />
        ))}
      </g>
      <circle cx="24" cy="24" r="5.4" fill={`url(#${id}c)`} stroke="#f4c64e" strokeWidth="1" />
      <path d="M20.6 21.4 l6.8 5.2" stroke="#f4c64e" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="24" cy="24" r="1.3" fill="#0d2614" />
    </svg>
  );
}
