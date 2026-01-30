'use client';

import Button from '../ui/Button';
import Card from '../ui/Card';

export type GoogleProfile = {
  name: string;
  email: string;
  avatar: string;
};

type GoogleLoginGateProps = {
  onLogin: (profile: GoogleProfile) => void;
};

export default function GoogleLoginGate({ onLogin }: GoogleLoginGateProps) {
  const handleLogin = () => {
    onLogin({
      name: 'Tu Tiên Sư',
      email: 'tutien@example.com',
      avatar: 'https://i.pravatar.cc/120?img=68',
    });
  };

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
            <p className="muted">
              Tài khoản sẽ đồng bộ tên hiển thị và tiến trình phòng đấu.
            </p>
            <Button onClick={handleLogin}>Đăng nhập Google</Button>
            <p className="hint-text">
              Lưu ý: Đây là màn hình mẫu, cần nối OAuth thật trong môi trường production.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
