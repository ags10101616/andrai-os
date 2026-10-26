import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Manrope } from 'next/font/google';
import './globals.css';
import '@/styles/liquid-precision.css';
import '@/styles/private-pilot.css';

const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-manrope' });

export const metadata: Metadata = {
  title: {default: 'ANDRAI OS', template: '%s · ANDRAI OS'},
  description: 'ANDRAI OS, sistema operativo privado con el lenguaje visual Spectral Ember Liquid Precision.',
  robots: {index:false, follow:false, nocache:true}
};

export default function RootLayout({children}: {children:ReactNode}) {
  return <html lang="es-MX" className={manrope.variable}><body>{children}</body></html>;
}
