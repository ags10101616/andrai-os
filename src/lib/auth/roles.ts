/** Server-verified staff roles. Never derive permission from user_metadata or a UI prop. */
export type TeamRole = 'owner' | 'sales' | 'production';
export type Section =
  | 'resumen' | 'prospectos' | 'proyectos' | 'cotizaciones'
  | 'tareas' | 'finanzas' | 'jose-luis' | 'equipo';

export const allowedBySection: Readonly<Record<Section, readonly TeamRole[]>> = {
  resumen: ['owner', 'sales', 'production'],
  prospectos: ['owner', 'sales'],
  proyectos: ['owner', 'sales', 'production'],
  cotizaciones: ['owner', 'sales'],
  tareas: ['owner', 'sales', 'production'],
  finanzas: ['owner'],
  'jose-luis': ['owner'],
  equipo: ['owner'],
};

export function isTeamRole(value: unknown): value is TeamRole {
  return value === 'owner' || value === 'sales' || value === 'production';
}

export function isSection(value: string): value is Section {
  return Object.hasOwn(allowedBySection, value);
}

export function canVisit(role: TeamRole | null | undefined, section: string): boolean {
  if (!role || !isSection(section)) return false;
  return allowedBySection[section].includes(role);
}

export function isWorkspacePath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 1 && isSection(segments[0]);
}

export const roleLabels: Readonly<Record<TeamRole, string>> = {
  owner: 'Dirección',
  sales: 'Comercial',
  production: 'Producción',
};
