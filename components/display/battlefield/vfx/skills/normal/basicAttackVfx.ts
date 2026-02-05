import { SKILLS } from "../../../config";

export function basicAttackOnHit(ctx, event){
  const col = ctx.core.getColor(event.attacker);
  const from = ctx.fighters[event.attacker].getMuzzlePos();
  const to = ctx.fighters[event.defender].getCorePos(9.2);
  const away = event.attacker === 0 ? 1 : -1;
  const combo = event.info?.combo;

  if (combo === 1) {
    ctx.vfx.spawnSlash(from.clone().add(new window.THREE.Vector3(away * 1.1, 0, 0)), col, away * 0.5);
    ctx.vfx.spawnProjectileToTarget(
      from,
      to,
      col,
      SKILLS.BASIC_ATTACK.meta?.projectileSpeed ?? 58,
      0.9,
      0.8,
      () => {},
    );
    return true;
  }

  if (combo === 2) {
    const k = event.index ?? 0;
    const f = from.clone().add(new window.THREE.Vector3(away * (0.2 + 0.15 * k), 0.12 * k, 0));
    const t = to.clone().add(new window.THREE.Vector3(0, 0.1 * k, 0));
    ctx.vfx.spawnSlash(f.clone(), col, away * (0.55 + 0.15 * k));
    ctx.vfx.spawnProjectileToTarget(f, t, col, 64, 1.0, 0.65, () => {});
    return true;
  }

  if (combo === 3) {
    const count = SKILLS.BASIC_ATTACK.meta?.combo3Projectiles ?? 5;
    const k = event.index ?? 0;
    const spread = (k - (count - 1) / 2) * 0.2;
    const f = from.clone().add(new window.THREE.Vector3(away * (0.2 + 0.12 * k), spread * 0.25, 0));
    const t = to.clone().add(new window.THREE.Vector3(0, spread * 0.1, 0));
    ctx.vfx.spawnProjectileToTarget(f, t, col, 70, 1.1, 1.0, () => {});
    return true;
  }

  return false;
}
