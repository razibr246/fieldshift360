// Vercel sets VERCEL/VERCEL_ENV in hosted functions; NODE_ENV also catches production builds run outside Vercel.
export function isHostedRuntime(env = process.env) {
  return env.VERCEL === '1' || !!env.VERCEL_ENV || env.NODE_ENV === 'production';
}
