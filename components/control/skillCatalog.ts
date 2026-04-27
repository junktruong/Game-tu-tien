import { SKILL_GROUPS, SKILLS } from "@/components/display/battlefield/config";

export type ControlSkillOption = {
  skillId: string;
  gesture: string;
  label: string;
  category: string;
};

const SKILL_LABELS: Record<string, string> = {
  BASIC_ATTACK: "Phá Thiên Kích",
  AIM: "AIM",
  SPIN: "Kiếm Vũ",
  GIANT: "Tam Nhẫn Kiếm Chỉ",
  FAN: "Việt Tự Kiếm Tiên",
  LOTUS: "Liên Hoa Trận",
  WALL: "Thiên La Địa Võng",
  SPHERE: "Hộ Thân Kiếm Cầu",
  SHAKA: "Song Long Quá Hải / Hồi Kiếm",
};

const groupedSkillIds = [
  ...SKILL_GROUPS.normal,
  ...SKILL_GROUPS.attack,
  ...SKILL_GROUPS.defense,
];

export const CONTROL_SKILL_OPTIONS: ControlSkillOption[] = groupedSkillIds
  .map((skillId) => {
    const skill = SKILLS[skillId as keyof typeof SKILLS];
    if (!skill?.gesture) return null;
    return {
      skillId,
      gesture: String(skill.gesture).toUpperCase(),
      label: SKILL_LABELS[skillId] || skillId,
      category: String(skill.category || ""),
    };
  })
  .filter((item): item is ControlSkillOption => Boolean(item));

export const GESTURE_TO_SKILL_NAME: Record<string, string> = {
  ...Object.fromEntries(
    CONTROL_SKILL_OPTIONS.map((option) => [option.gesture, option.label]),
  ),
  IDLE: "—",
};

export function findControlSkillOption(
  gesture: string,
): ControlSkillOption | null {
  const normalized = String(gesture || "").trim().toUpperCase();
  return (
    CONTROL_SKILL_OPTIONS.find((option) => option.gesture === normalized) ||
    null
  );
}
