import Link from 'next/link';
export default function NotFound() {
  return <main className="notfound"><span className="brand-large">ANDRAI<span>.</span></span><h1>Página no encontrada.</h1><p>Esta sección no forma parte de OS-01.</p><Link href="/resumen">Volver al resumen →</Link></main>;
}
