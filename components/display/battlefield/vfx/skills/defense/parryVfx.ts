export function parryOnHit(ctx, event){
  const col = ctx.core.getColor(event.attacker);
  ctx.vfx.spawnBurstAt(ctx.fighters[event.defender].getCorePos(9.2), col, 1.0);
}
