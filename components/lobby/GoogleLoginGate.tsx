'use client';

import { signIn } from 'next-auth/react';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default function GoogleLoginGate() {
  return (
    <main>
      <header className="header">
        <div className="brand">
          <h1>⚔️ Tu Tiên Fight - Next Arena</h1>
          <p>Đăng nhập bằng Google để khởi tạo tài khoản trước khi chọn thông số.</p>
        </div>
      </header>

      <div className="wrap">
        <Card>
          <div className="stack">
            <h2>Đăng nhập Google</h2>
           
            <Button onClick={() => signIn('google')}>Đăng nhập Google</Button>
            
          </div>
        </Card>
      </div>
    </main>
  );
}
