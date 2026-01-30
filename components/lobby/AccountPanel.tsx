import { useState } from 'react';
import type { AccountProfile } from '../../types/game';
import Card from '../ui/Card';
import SectionHeader from '../ui/SectionHeader';
import Field from '../ui/Field';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

type AccountPanelProps = {
  account: AccountProfile;
  onChange: (account: AccountProfile) => void;
  googleProfile?: {
    name: string;
    email: string;
    avatar: string;
  };
};

export default function AccountPanel({
  account,
  onChange,
  googleProfile,
}: AccountPanelProps) {
  const [status, setStatus] = useState<string | null>(null);

  const handleCreate = async () => {
    setStatus('Đang lưu tài khoản...');
    const response = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: account.displayName,
        tagline: account.tagline,
      }),
    });

    if (response.ok) {
      setStatus('✅ Đã lưu tài khoản vào hệ thống.');
    } else {
      setStatus('❌ Không lưu được tài khoản. Hãy kiểm tra đăng nhập.');
    }
  };

  return (
    <Card>
      <SectionHeader
        title="Tài khoản"
        subtitle="Tạo profile để lưu nhân vật, skin, và dữ liệu phòng đấu."
      />
      <div className="stack">
        {googleProfile && (
          <div className="account-row">
            <div className="inline">
              {googleProfile.avatar && (
                <img src={googleProfile.avatar} alt="Google avatar" className="avatar" />
              )}
              <div>
                <strong>{googleProfile.name}</strong>
                <p className="muted">{googleProfile.email}</p>
              </div>
            </div>
            <Tag tone="emerald">Google Linked</Tag>
          </div>
        )}
        <Field label="Tên hiển thị">
          <input
            value={account.displayName}
            onChange={(event) =>
              onChange({ ...account, displayName: event.target.value })
            }
            placeholder="Ví dụ: Kiếm Tôn"
          />
        </Field>
        <Field label="Mô tả ngắn">
          <input
            value={account.tagline}
            onChange={(event) =>
              onChange({ ...account, tagline: event.target.value })
            }
            placeholder="Phong cách chiến đấu"
          />
        </Field>
        <div className="inline">
          <Button onClick={handleCreate}>Khởi tạo tài khoản</Button>
          <Tag tone="violet">Cloud Sync (sắp có)</Tag>
        </div>
        {status && <p className="hint-text">{status}</p>}
      </div>
    </Card>
  );
}
