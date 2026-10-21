// Responsive photo from the image registry. Keeps aspect ratio by default; when `fill` is set it covers
// its parent (object-fit: cover) using the image's own focal point so important parts are not cropped away.
// Photos fade in once decoded instead of popping in line by line.
import { useCallback } from 'react';
import { IMAGES } from '../assets/images';
import { useStore } from '../store';

export default function Photo({ name, fill = false, className = '', sizes = '(min-width: 1024px) 50vw, 100vw', priority = false, focus, decorative = false }) {
  const { L } = useStore();
  const img = IMAGES[name];
  // A photo already in the browser cache is complete before React attaches onLoad, so check on mount too.
  const ref = useCallback((el) => { if (el?.complete && el.naturalWidth) el.classList.add('is-loaded'); }, []);
  if (!img) return null;
  return (
    <img
      ref={ref}
      src={img.src}
      srcSet={img.srcSet}
      sizes={sizes}
      width={img.width}
      height={img.height}
      alt={decorative ? '' : L(img.alt)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
      style={{ objectPosition: focus ?? img.focus }}
      className={`fade-img bg-primary-100/70 ${fill ? 'absolute inset-0 h-full w-full object-cover' : 'h-auto w-full'} ${className}`}
    />
  );
}
