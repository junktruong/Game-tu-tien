export function wallOnCast(ctx, event){
  const col = ctx.core.getColor(event.attacker);
  ctx.vfx.spawnShield(ctx.fighters[event.attacker], col, "WALL", event.attacker);
}
