import type { AccountProfile } from '../../types/game';
import Card from '../ui/Card';
import SectionHeader from '../ui/SectionHeader';
import Field from '../ui/Field';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

type AccountPanelProps = {
  account: AccountProfile;
  onChange: (account: AccountProfile) => void;
};

export default function AccountPanel({ account, onChange }: AccountPanelProps) {
  return (
    <Card>
      <SectionHeader
        title="Tài khoản"
        subtitle="Tạo profile để lưu nhân vật, skin, và dữ liệu phòng đấu."
      />
      <div className="stack">
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
          <Button>Khởi tạo tài khoản</Button>
          <Tag tone="violet">Cloud Sync (sắp có)</Tag>
        </div>
      </div>
    </Card>
  );
}
