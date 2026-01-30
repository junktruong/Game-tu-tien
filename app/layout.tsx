import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import AuthProvider from '../components/providers/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tu Tiên Fight',
  description: 'Lobby và hệ thống điều khiển cho Tu Tiên Fight',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
