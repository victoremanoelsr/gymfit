import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GYMFIT — Gestão inteligente para academias',
  description: 'Plataforma completa de gestão, treino, vendas, retenção e inteligência para academias.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
