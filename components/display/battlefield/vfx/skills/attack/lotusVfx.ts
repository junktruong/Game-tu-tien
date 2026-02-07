export function lotusOnCast(ctx: any, event: any) {
  const col = ctx.core.getColor(event.attacker);
  ctx.vfx.spawnBurstAt(ctx.fighters[event.attacker].getCorePos(8.4), col, 1.05);
}
