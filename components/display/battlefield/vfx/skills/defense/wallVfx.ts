export function wallOnCast(ctx: any, event: any) {
  const col = ctx.core.getColor(event.attacker);
  ctx.vfx.spawnShield(ctx.fighters[event.attacker], col, "WALL", event.attacker);
}
