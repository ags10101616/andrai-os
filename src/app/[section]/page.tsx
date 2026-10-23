import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Overview } from '@/components/Overview';
import { findModule } from '@/lib/modules';
import { requireMembership } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  return { title: findModule(section)?.label ?? 'No encontrada' };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const sectionModule = findModule(section);
  if (!sectionModule) notFound();
  const member = await requireMembership(section);

  return <AppShell active={section} role={member.role} displayName={member.displayName}>
    {section === 'resumen' ? <Overview /> : <>
      <section className="page-intro"><div><div className="eyebrow">{sectionModule.kicker}</div><h1>{sectionModule.title}</h1><p>{sectionModule.description}</p></div><span className="action-disabled">Disponible en {sectionModule.spec}</span></section>
      <section className="panel module-detail"><div className="module-top"><span>ESTADO DEL MÓDULO</span><span className="state">Integración pendiente</span></div><div className="module-empty"><div className="module-symbol">{sectionModule.icon}</div><h2>{sectionModule.label} aún no está conectado</h2><p>La implementación de este módulo corresponde a {sectionModule.spec}. El acceso y la membresía sí están verificados.</p><span className="dash-note">Sin datos operativos cargados</span></div></section>
      <section className="panel module-hint"><h2>Diseñado para una operación real.</h2><p>OS-02 agrega acceso privado y permisos seguros. Las operaciones comerciales se conectarán después, con auditoría y validación transaccional.</p></section>
    </>}
  </AppShell>;
}
