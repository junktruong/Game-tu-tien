import type { GameData } from '../types/game';

export const seedData: GameData = {
  account: {
    displayName: 'Tu Tiên Sư',
    tagline: 'Tân thủ nhập môn • Huyết mạch tiên gia',
  },
  characters: [
    {
      id: 'stick-fighter',
      name: 'Kiếm Khách Tre',
      role: 'Cận chiến tốc độ',
      level: 1,
      skills: [
        'Liên Hoa Trận',
        'Hộ Thân Kiếm Cầu',
        'Phá Thiên Kích',
        'Thiên La Địa Võng',
        'Spin',
        'AIM',
        'Fan',
        'ULT / Hồi Kiếm',
        'Giant',
      ],
      description:
        'Nhân vật mặc định giữ nguyên bộ skill hiện tại để đồng bộ với combat engine.',
    },
  ],
  skins: [
    {
      id: 'jade-core',
      name: 'Ngọc Bích',
      tone: '#00fff0',
      effect: 'Vệt kiếm xanh lam + hạt sáng',
      textureUrl: '/img/stick_fighter_sheet.png',
    },
    {
      id: 'crimson-moon',
      name: 'Huyết Nguyệt',
      tone: '#ff4fd8',
      effect: 'Tàn ảnh tím hồng + tia sét',
      textureUrl: '/img/stick_fighter_sheet123.png',
    },
    {
      id: 'ember-gold',
      name: 'Hỏa Kim',
      tone: '#ffb347',
      effect: 'Bụi lửa + đốm tro',
      textureUrl: '/img/stick_fighter_sheet_chuan.png',
    },
  ],
  arenas: [
    {
      id: 'sky-temple',
      name: 'Thiên Cung',
      description: 'Nền trời xoáy + cột đá phát quang, phù hợp combat tốc độ.',
    },
    {
      id: 'bamboo-forest',
      name: 'Trúc Lâm',
      description: 'Sương mỏng, gió thổi qua rừng tre để tăng độ nổi bật chiêu thức.',
    },
    {
      id: 'lava-rift',
      name: 'Vực Hỏa',
      description: 'Dung nham phát sáng, ánh phản chiếu mạnh cho VFX.',
    },
  ],
  rooms: [
    {
      id: 'demo',
      title: 'Demo Room',
      arenaId: 'sky-temple',
      mode: '1v1',
      occupancy: 1,
      capacity: 2,
      isPublic: true,
    },
    {
      id: 'forest-duo',
      title: 'Rừng Trúc - Quick Match',
      arenaId: 'bamboo-forest',
      mode: '1v1',
      occupancy: 2,
      capacity: 2,
      isPublic: true,
    },
    {
      id: 'private-lab',
      title: 'Phòng test nội bộ',
      arenaId: 'lava-rift',
      mode: 'custom',
      occupancy: 1,
      capacity: 4,
      isPublic: false,
    },
  ],
};
