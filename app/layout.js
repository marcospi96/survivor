import { Inter, Bebas_Neue } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

export const metadata = {
  title: 'Survivor — World Cup 2026',
  description: 'The ultimate World Cup prediction survival game',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="bg-navy text-slate-bright min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
