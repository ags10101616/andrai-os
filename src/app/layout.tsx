import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-manrope' });

export const metadata: Metadata = {
  title: {default: 'ANDRAI OS', template: '%s · ANDRAI OS'},
  description: 'Preview privada del sistema operativo interno de Andrai. OS-01.',
  robots: {index:false, follow:false, nocache:true}
};

export default function RootLayout({children}: {children:ReactNode}) {
  return <html lang="es-MX" className={manrope.variable}><body>{children}</body></html>;
}
