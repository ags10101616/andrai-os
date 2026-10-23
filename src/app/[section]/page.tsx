import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Overview } from '@/components/Overview';
import { findModule, modules } from '@/lib/modules';

export function generateStaticParams() {return modules.map(m=>({section:m.slug}));}
export async function generateMetadata({params}:{params:Promise<{section:string}>}):Promise<Metadata> {const {section}=await params;return {title:findModule(section)?.label??'No encontrada'};}
export default async function SectionPage({params}:{params:Promise<{section:string}>}) {
  const {section}=await params;
  const m=findModule(section);
  if(!m) notFound();
  return <AppShell active={section}>{section==='resumen'?<Overview/>:<>
    <section className="page-intro"><div><div className="eyebrow">{m.kicker}</div><h1>{m.title}</h1><p>{m.description}</p></div><span className="action-disabled">Disponible en {m.spec}</span></section>
    <section className="panel module-detail"><div className="module-top"><span>ESTADO DEL MÓDULO</span><span className="state">Integración pendiente</span></div><div className="module-empty"><div className="module-symbol">{m.icon}</div><h2>{m.label} aún no está conectado</h2><p>La implementación y validación de este módulo se realizará en {m.spec}. Esta vista no contiene datos reales ni simulados.</p><span className="dash-note">Sin acceso a información de clientes</span></div></section>
    <section className="panel module-hint"><h2>Diseñado para una operación real.</h2><p>La identidad de Andrai ya está aplicada. A continuación conectaremos autenticación, datos persistentes y pruebas independientes por cada spec.</p></section>
  </>}</AppShell>;
}
