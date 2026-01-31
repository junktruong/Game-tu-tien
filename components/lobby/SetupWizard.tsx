import { useMemo, useState } from 'react';
import type {
  AccountProfile,
  ArenaProfile,
  CharacterProfile,
  PlayerProfile,
  SkinProfile,
} from '../../types/game';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

type SetupWizardProps = {
  account: AccountProfile;
  characters: CharacterProfile[];
  skins: SkinProfile[];
  arenas: ArenaProfile[];
  initialCharacterId?: string;
  initialSkinId?: string;
  initialArenaId?: string;
  onComplete: (profile: PlayerProfile) => void;
};

export default function SetupWizard({
  account,
  characters,
  skins,
  arenas,
  initialCharacterId,
  initialSkinId,
  initialArenaId,
  onComplete,
}: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PlayerProfile>({
    displayName: account.displayName,
    tagline: account.tagline,
    characterId: initialCharacterId ?? characters[0]?.id ?? '',
    skinId: initialSkinId ?? skins[0]?.id ?? '',
    arenaId: initialArenaId ?? arenas[0]?.id ?? '',
  });

  const totalSteps = 6;
  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;

  const activeCharacter = useMemo(
    () => characters.find((item) => item.id === draft.characterId),
    [characters, draft.characterId],
  );
  const activeSkin = useMemo(
    () => skins.find((item) => item.id === draft.skinId),
    [skins, draft.skinId],
  );
  const activeArena = useMemo(
    () => arenas.find((item) => item.id === draft.arenaId),
    [arenas, draft.arenaId],
  );

  const handleNext = () => {
    if (isLast) {
      onComplete(draft);
      return;
    }
    setStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h2>Khởi tạo hồ sơ chiến đấu</h2>
            <p>Thiết lập từng bước, lưu vào DB rồi chuyển thẳng về trang chủ.</p>
          </div>
          <Tag tone="cyan">
            {step + 1}/{totalSteps}
          </Tag>
        </div>

        {step === 0 && (
          <div className="modal-body">
            <label className="field">
              Tên hiển thị
              <input
                value={draft.displayName}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, displayName: event.target.value }))
                }
                placeholder="Ví dụ: Kiếm Tôn"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="modal-body">
            <label className="field">
              Mô tả ngắn
              <input
                value={draft.tagline}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, tagline: event.target.value }))
                }
                placeholder="Phong cách chiến đấu"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="modal-body">
            <div className="stack">
              {characters.map((character) => (
                <button
                  key={character.id}
                  type="button"
                  className={`list-item ${draft.characterId === character.id ? 'active' : ''}`}
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, characterId: character.id }))
                  }
                >
                  <div>
                    <strong>{character.name}</strong>
                    <p>{character.role}</p>
                  </div>
                  <Tag tone="emerald">Lv.{character.level}</Tag>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="modal-body">
            <div className="stack">
              {skins.map((skin) => (
                <button
                  key={skin.id}
                  type="button"
                  className={`list-item ${draft.skinId === skin.id ? 'active' : ''}`}
                  onClick={() => setDraft((prev) => ({ ...prev, skinId: skin.id }))}
                >
                  <div className="inline">
                    <span className="swatch" style={{ background: skin.tone }} />
                    <div>
                      <strong>{skin.name}</strong>
                      <p>{skin.effect}</p>
                    </div>
                  </div>
                  <Tag tone="violet">Skin</Tag>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="modal-body">
            <div className="stack">
              {arenas.map((arena) => (
                <button
                  key={arena.id}
                  type="button"
                  className={`list-item ${draft.arenaId === arena.id ? 'active' : ''}`}
                  onClick={() => setDraft((prev) => ({ ...prev, arenaId: arena.id }))}
                >
                  <div>
                    <strong>{arena.name}</strong>
                    <p>{arena.description}</p>
                  </div>
                  <Tag tone="cyan">Arena</Tag>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="modal-body">
            <div className="details">
              <h3>Xác nhận hồ sơ</h3>
              <p>
                <strong>Tên:</strong> {draft.displayName || 'Chưa đặt'}
              </p>
              <p>
                <strong>Mô tả:</strong> {draft.tagline || 'Chưa có mô tả'}
              </p>
              <p>
                <strong>Nhân vật:</strong> {activeCharacter?.name}
              </p>
              <p>
                <strong>Skin:</strong> {activeSkin?.name}
              </p>
              <p>
                <strong>Đấu trường:</strong> {activeArena?.name}
              </p>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <Button variant="ghost" onClick={handleBack} disabled={isFirst}>
            Quay lại
          </Button>
          <Button onClick={handleNext}>{isLast ? 'Hoàn tất & Lưu DB' : 'Tiếp tục'}</Button>
        </div>
      </div>
    </div>
  );
}
