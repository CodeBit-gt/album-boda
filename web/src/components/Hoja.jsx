// Hoja de otoño en SVG (se reutiliza como adorno del botón principal)
export default function Hoja({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M32 6c10 8 18 17 18 28 0 9-6 16-14 18v6h-8v-6c-8-2-14-9-14-18C14 23 22 14 32 6Z"
        fill="currentColor"
        opacity=".92"
      />
      <path d="M32 18v36M32 30l-8-6M32 38l9-7M32 46l-7-5" stroke="#2b1b16" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
