Original prompt: đọc lại toàn bộ code liên quan tới control.html kiểm tra các hàm xử lý , hãy đưa ra các phương án để nhận biết kí hiệu tay rõ ràng nhanh nhạy hơn

- 2026-02-03: Read control-related code in Next + public/js/control/main.js. Plan: improve gesture clarity and responsiveness.
- 2026-02-03: Implemented gesture smoothing (EMA), majority voting, stronger gesture rules, and hysteresis thresholds in public/js/control/main.js. Reduced stabilization/cooldown timings for faster response.
- TODO: Run Playwright-based validation once a control page dev server URL is available.

- 2026-02-03: Scanned overall codebase for architecture/quality. Noted: duplicated legacy files (main1/config1/VFXManager1/GiantSkill1, public/js/control/main copy.js, app/control1), mixed global scripts vs module imports (three/socket.io), version mismatch between CDN three (r128) and npm three (0.182), heavy VFX allocations without pooling/dispose, HUD/CombatSystem coupling, and data/skill definitions spread across multiple files. TODO: propose cleanup + refactor plan and performance optimizations.
- 2026-02-03: Step1 cleanup: removed legacy/duplicate files (main1/config1/VFXManager1/GiantSkill1, control copy, app/control1). Unified Three.js to npm by dynamic imports in DisplayPage and removed CDN three scripts. Removed lobby side-effect import of battlefield/main. Added outputColorSpace fallback for new Three in SceneManager.
- 2026-02-03: Removed socket.io CDN usage. Display now uses socket.io-client import; initDisplay accepts io. Control logic moved to components/control/controlClient.ts with socket.io-client; ControlPage now boots via useEffect and only loads mediapipe hands. Removed public/js/control/main.js and window.__SOCKET_URL usage. Added socket.io-client dependency and cleaned window globals type.
- 2026-02-03: Started engine refactor: added game-core (`components/display/battlefield/core/GameCore.ts`, `core/types.ts`) with pure state/combat/skills + event emission. Display `main.ts` now wires GameCore events to HUD/VFX/scene, replacing CombatSystem/SkillRegistry/Scheduler. CombatSystem remains but unused (candidate for removal later). Added basic parry event handling and ULT charge stop event.
- 2026-02-03: Normalized render VFX: added render Scheduler in display main; expanded GameCore event handling to restore BASIC_ATTACK projectiles, FAN orbit fallback, GIANT projectiles, and ULT ritual visuals (magic circles + fire dragon). SKILL_HIT now drives combo-specific projectiles and FAN slashes.
- 2026-02-03: Split render-side VFX into grouped handlers under components/display/battlefield/render/* with RenderRegistry dispatch. main.ts now only handles HUD/scene and delegates VFX/animation to registry. Added common handlers (cast/hit/giant-charge) and per-skill handlers (basic/spin/fan/giant/lotus/wall/sphere/ult/parry).
- 2026-02-03: Began VFXManager split by function. Added vfx/modules/helpers.ts, spawn.ts, update.ts. VFXManager now delegates spawn helpers and update loop to modules, shrinking core file while preserving API.
- 2026-02-03: Split VFXManager further by function. Added modules for projectiles, giantCharge, shields, ult, and rewired VFXManager methods to delegate. Updated update module shield + giant charge handling to match current shield data structure.
- 2026-02-03: Split VFX usage by skill. Added vfx/skills/* helpers and updated Render skill handlers to delegate to those helpers. This keeps render files thin and concentrates VFX logic per skill.
- 2026-02-03: Added VFX pooling for slashes/bursts/shockwaves/sparks and updated update loop to recycle or dispose based on pool caps. Added functional skill VFX helpers and rewired render to use them. Prepared modules for projectiles/giant charge/shields/ult; VFXManager delegates accordingly.
- 2026-02-03: Fixed ULT swarm update to drive instanced mesh transforms (prevents undefined set error). RenderRegistry now always runs HitRender for SKILL_HIT so fighters flash/play hit. Control: relaxed GIANT palm detection, added raise grace window, and increased raise threshold for more reliable GIANT recognition.
- 2026-02-04: Renamed GIANT -> Tam Nhẫn Kiếm Chỉ, FAN -> Vạn Kiếm Quy Tông, ULT -> Song Long Quá Hải across config/UI/banners. Lowered GIANT charge height, increased GIANT multi-sword firing (ring-based + fallback spread), and updated FAN to 2s sword-gather with large instanced swarm before launch. Reworked ULT to two-stage dragon summon (2s + 2s) with staged hits; updated legacy skill files for consistency.
- 2026-02-04: Reduced bloom strength, brightened arena lighting/backgrounds. GIANT ring firing now streams swords out over time (rings thin as swords leave). FAN now gathers many swords overhead for 2s then fires a single giant sword; updated VFX to support singleLaunch + gather radius; FAN damage tuned to single hit.
- 2026-02-04: GIANT damage timing now delayed to match sword launch cadence; GIANT meta cadence slowed to show each sword and projectile speed reduced. Increased giant charge sword trail/glow for visibility. FAN core synced to single-hit values.
- 2026-02-04: GIANT charge stop delayed 0.8s to preserve rings for firing. giantVfx no longer clears rings before firing, and fallback now spawns swords sequentially using delayed sword-factory projectiles.
- 2026-02-04: FAN VFX reworked: instanced swords now fly from around the fighter toward a center point over 2s, merge into a charging big sword above the head, then launch that big sword. Added bigSword growth during gather and reuse for launch.
- 2026-02-04: FAN VFX now uses persistent pooled swords (40 small + 1 big). No per-cast instantiation; swords are enabled, positioned from offscreen, converge to rally above head, merge into big sword (grow), aim-lock, then big sword launches as reused projectile.
- 2026-02-04: Replaced FAN VFX with pooled VN text ribbons (~6). Added fanTextSword module with pooled ribbons using CanvasTexture, converge -> assemble into tilted sword -> aim lock -> shoot. Integrated via VFXManager.playFanTextSword and update loop.
- 2026-02-04: Replaced Fan VFX with pooled VN text ribbons (CanvasTexture) converging over head, assembling into a sword, aim-locking, then shooting. Added createFanVNTextSwordEffect module and wired VFXManager playFanTextSword + update.
- 2026-02-04: Fan VFX swapped to VN text ribbon effect (CanvasTexture planes) with pooled ribbons; converge above head, assemble into sword, aim-lock, shoot via group motion. Integrated createFanVNTextSwordEffect + VFXManager.playFanTextSword.
- 2026-02-04: Fan text ribbons now stay camera-facing during converge, grow over 2s, then assemble into sword with X-axis alignment and increased scale; converge time set to 2s as requested.
- 2026-02-04: Fan text ribbons visibility boosted (DoubleSide, depthTest off, higher opacity), spawn positions kept nearer camera, headHeight lowered to 10.5 for better framing.
- 2026-02-04: Boosted Fan text ribbon visibility (larger plane, stronger opacity, shadowed CanvasTexture), disabled frustum culling, and increased sword length/size. Lowered headHeight to keep effect in camera frame.
- 2026-02-04: Added direct FAN cast hook in display main.ts to ensure playFanTextSword is invoked on SKILL_CAST FAN (bypasses render registry if it isn't firing).
- 2026-02-04: FAN text sword updated to include a large sword mesh above the caster that aims at the target and shoots straight; added big-sword sizing/opacity controls, fixed CanvasTexture init ordering, and tuned fanVfx timings/sizes. playFanTextSword now handles ownerIndex + option passthrough correctly.
- 2026-02-04: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js. Install Playwright or provide a preinstalled runtime to enable automated checks.
- 2026-02-04: FAN text ribbons now undulate with sine-wave offsets (snake-like motion) during converge, then fade into a large sword; added wave config params and tuned FAN defaults.
- 2026-02-04: Rebuilt FAN effect: replaced ribbon text VFX with "A" letter dragon segments that slither for 2s, merge into a big sword, then shoot straight at the target. Updated fanVfx options to match new dragon effect.
- 2026-02-04: Reworked FAN dragon letters to be clearer (reduced glow, bigger glyphs), increased dragon count, and switched big sword to SwordFactory projectile. Added hitDelaySec in FAN meta and GameCore timing so damage lands after sword hit. Updated fanVfx options + VFXManager to pass vfx into fanTextSword effect.
- 2026-02-04: Reduced FAN brightness: lowered letter opacity/shadows, reduced sword glow/trail opacity, and lowered sword emissive intensity for clearer glyphs.
- 2026-02-04: Reduced global bloom in SceneManager (UnrealBloomPass strength/radius/threshold) to make all skills less glaring.
- 2026-02-04: Reverted global bloom change; reduced brightness across skill VFX and swords: lowered SwordFactory emissive/glow/trail, dimmed slashes/bursts/shockwaves/sparks/magic circles, and toned down GIANT rings, shields, and fire dragon opacity.
- 2026-02-04: Slowed FAN dragon motion, increased segment spacing, and increased dragon count defaults; updated fanVfx options accordingly.
- 2026-02-04: FAN dragon pool now dynamic (can increase dragon/segment counts after creation), added per-dragon base offsets to place some near feet/front, slowed wave speed, and widened segment spacing. Updated fanVfx defaults and VFXManager to keep fighter object for facing.
- 2026-02-04: Slowed FAN dragons further, increased segment spacing, lengthened orbitSec to 6s, and added sword tilt/roll toward target while hovering; sword still uses SwordFactory.
- 2026-02-04: FAN dragons now shrink and fade as the sword materializes during gather phase.
- 2026-02-04: Added sword skin system: SwordFactory now supports image-based swords with setSwordTexture, Display page includes sword selector UI, and default sword skins (azure/ember/jade) added in public/img/swords.
- 2026-02-04: Added per-sword bloom color: GameCore now supports VFX color overrides; Display sword picker sends bloom color; main applies sword texture + bloom to both players; SwordFactory already uses that color for glow/trail.
- 2026-02-04: Reduced glow/trail on texture-based swords to preserve patterns and moved trail higher/shorter. Added sword back-offset option for FAN so the sword appears slightly behind the head when charging/launching.
- 2026-02-04: FAN sword anchor now supports up/back offsets and aims from the anchored position; increased back offset and added up offset in fanVfx options.
- 2026-02-04: GIANT charge rings raised (baseHeight/heightStep) and added tilt toward camera via tiltX; ring groups now rotate around Y while maintaining tilt.
- 2026-02-04: Renamed FAN display text to "Việt Tự Kiếm Tiên" (GameCore banners/last-skill, control UI, FanSkill). FAN VFX: dragon-letter segments now collapse toward the sword while shrinking/fading as the sword appears; sword impact burst now uses per-projectile burstColor/burstScale, with FAN sword set to a larger hit burst. Reduced FAN hitDelaySec to 0.35 for faster impact timing. Updated VFX update loop to honor custom burst settings.
- 2026-02-04: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-04: Removed red hit square by mapping hit flash overlay to the fighter sprite texture (additive red silhouette) and keeping it in sync on texture changes. (StickFighter flash overlay now uses the sprite sheet map).
- 2026-02-04: FAN sword now pierces with a slight downward angle, sticks in the target briefly, and fades out. Implemented front/back split swords for partial occlusion and added configurable pierce hold/fade/tilt/offset settings. Updated fanVfx options for belly-aimed pierce.
- 2026-02-04: Increased FAN sword downward tilt and moved hit burst to occur when the sword tip contacts the target (travel end offset by tip length, burstPos at impact). Added tipContactRatio config; updated update loop to use burstPos if provided.
- 2026-02-04: Recomputed FAN sword tip contact using base-length * scale (cached per sword) so burst triggers when the tip touches the target; increased travel clamp to 0.92 to avoid over-travel.
- 2026-02-04: Adjusted FAN tip-contact math to clamp by distance (shootDist - 0.05) and set tipContactRatio to 1.0 for immediate burst on contact.
- 2026-02-04: FAN projectile now triggers burst on tip contact (burstAt) but continues traveling past the target (pass-through distance) before despawning. Added onContact hook to start pierce effect and call hitCallback while keeping sword flying through.
- 2026-02-04: Added light-ray burst VFX + enemy lift after FAN pass-through (rays from mid-body + burst). Implemented ray spawning/pooling in VFXManager/spawn/update and added StickFighter playLift vertical pop.
- 2026-02-04: Boosted FAN post-pierce light-ray spectacle: added ray growth + end explosion, and tuned fanVfx to higher ray count/length/width with larger explode scale and stronger lift.
- 2026-02-04: Added lift tilt to StickFighter playLift (sprite leans while popping up) by animating group.rotation.z during lift.
- 2026-02-04: Raised burst origin for light rays and added downward bias so rays spread downward; exposed pierceRayExplodeYOffset and pierceRayDownBias and tuned fanVfx defaults.
- 2026-02-04: Reduced fake feel: rays now bias downward, grow less aggressively, burst origin raised, and impact effects trigger immediately (no hitch). Sword now appears earlier via swordAppearAt. Added pierceImpactDelay option.
- 2026-02-04: Ensured HURT state shows reliably: block playCast during hit window and re-assert HURT action while anim.mode="hit".
- 2026-02-04: Added hitLockUntil in StickFighter to force HURT animation during damage windows; playCast now respects hit lock, update reasserts hit mode if needed.
- 2026-02-04: Added StateDamageRender to trigger HURT on any HP drop from STATE updates (fallback when SKILL_HIT misses), with hitLock guard to prevent double triggers.
- 2026-02-04: Routed STATE events to RenderRegistry (no early return) so StateDamageRender can force HURT on HP drops.
- 2026-02-04: Set HURT row to use all 8 frames (not 1) so hurt animation shows visible frames from the sprite sheet.
- 2026-02-04: ULT (Song Long Quá Hai) VFX updated: fire dragon now winds more, tightens into a pierce phase with head stretch, and impact uses shockwave/slash/sparks instead of burst ball. ULT hit render now skips burst for cleaner dragon focus.
- 2026-02-04: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.

- 2026-02-05: Fan sword assembly stabilized by smoothing aim direction during gather (reduces blade jitter while creating).

- 2026-02-05: FAN sword gather now shakes strongly (position + rotation jitter) while forming; added swordShakeAmp/Freq/Rot options and tuned FAN defaults.

- 2026-02-05: Reduced FAN sword shake distance/rotation (swordShakeAmp 0.08, swordShakeRot 0.08).

- 2026-02-05: Migrated StickFighter to low-poly 3D: added GLB + PNG skin textures, new procedural animation state machine (idle/run/cast/hurt), sword attachment to RightHand anchor, and updated skin defaults/UI copy to PNG skins. Added GLB generator script for future tweaks. NOTE: Playwright validation not run (Playwright still missing, no dev server URL).
- 2026-02-05: Added CameraManager (multi-mode camera + smoothing) and socket camera commands; SceneManager now delegates camera updates. Implemented ArmPoseTypes and arm_pose pipeline: controller uses MediaPipe Tasks Vision PoseLandmarker with calibration/mirror/debug UI, sends arm_pose at ~25Hz; display applies arm pose to StickFighter arms with blending. Added socket-server relays for camera/arm_pose. Added @mediapipe/tasks-vision dependency. Tests not run (Playwright missing).
- 2026-02-05: Merged control UI into Display page (camera/arm tracking panel + debug canvas + hands.js script). Display now boots initControl locally so camera changes and arm pose are applied without separate /control page. Updated display CSS for control panel.
- 2026-02-05: Added arm-gesture mode (raise/forward/forward-bent/rest) using PoseLandmarker; added Arm Gesture toggle; hand gestures are skipped when arm mode is on. Pose loop now drives gesture detection; hands.js wait removed earlier.
- 2026-02-05: Playwright run failed again: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Playwright run still failing (missing playwright) after arm-gesture tweak.
- 2026-02-05: Updated MediaPipe model URLs to official mediapipe-models bucket (pose_landmarker_full + hand_landmarker) to fix 404.
- 2026-02-05: Added camera preview overlay + control panel collapse button (Display). Arm Gesture mode now disables arm_pose sending and sends zero-confidence once to avoid jitter; preview mirrors with Mirror toggle.
- 2026-02-05: Suppressed hydration warning on <html> to silence extension-injected class (mdl-js) mismatch.
- 2026-02-05: Playwright run failed again: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Disabled arm-gesture detection; arm pose is now optional (toggle off by default). Hand gestures always active and now drive simple arm pose presets on the fighter; IDLE gesture is sent once to reset pose. Fighters now face each other via Y-rotation instead of X-scale flip.
- 2026-02-05: Playwright run failed again: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Adjusted fighter facing: rotate Y by ±90° (assuming model forward +Z) so fighters face each other across X axis.
- 2026-02-05: Clarified character skin image handling in StickFighter by adding resolveTextureUrl and using it for initial load + setTexture (consistent default + trim). Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Updated StickFighter to use smooth shading and rounded procedural geometry (capsule/cylinder/sphere) for fallback. Enabled character shadows by setting castShadow on meshes. SceneManager now enables soft shadows on renderer/ground and configures key light shadow map. Regenerated `public/models/stick_fighter.glb` using capsule/cylinder/sphere geometry in `scripts/gen_stick_fighter_glb.mjs` to reduce blocky/Minecraft look.
- 2026-02-05: Switched default fighter model to /models/model01.glb. Added skinnable model allowlist (only stick_fighter.glb uses skin material). Custom models keep their own materials and still get shadows. Added fallback hand anchor using bounding box when no RightHand bone. Added hasRigParts flag and whole-body tilt/bob when model has no named parts. Inspected model01.glb: single node, no skins/bones.
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Increased fighter scale (DEFAULT_MODEL_SCALE=1.3), shrunk arena ground/ring (45 radius, ring 26-28), and zoomed camera defaults (dist 44, fov 50). Updated Display/Control UI defaults and ControlClient fallback values. Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Increased DEFAULT_MODEL_SCALE to 26 (20x larger than previous 1.3) per request.
- 2026-02-05: Added modelYOffset auto-ground alignment using bounding box. Group Y now adds modelYOffset. Added stronger hit reaction for models without rig parts (increased hit knockback and added hit lean on rotation.x).
- 2026-02-05: Added per-model forward-axis mapping so fighters face each other along X axis (model01 uses X-forward, stick_fighter uses Z-forward). Stored baseRotY and applied in constructor.
- 2026-02-05: Switched default model to /models/model02.glb and added forward-axis mapping for model02 (Z-forward). Added skinned-mesh detection and warning when bones exist without skin weights.
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Inspected model02.glb after re-export: Skins=1 (good), Animations=0, bones named Bone.* / neutral_bone (no Torso/ArmL/etc), so current bindParts won't pick them without renaming or mapping.
- 2026-02-05: Added flexible bone name lookup in StickFighter.bindParts to handle Blender suffixes (e.g., LegL.001) and common rig naming variants.
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Added auto scale + ground alignment based on mesh bounds (MODEL_TARGET_HEIGHT=14, DEFAULT_MODEL_SCALE=1). Now compute bounds from meshes only, set group scale and modelYOffset accordingly to avoid hidden/giant models.
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Added unit normalization + scale clamp in StickFighter auto-scaling to prevent tiny/invisible models (mm/cm heuristic; clamp 0.2–8). Logs when clamp occurs.
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Added ensureModelVisible for custom models (force DoubleSide, disable transparency, disable frustum culling) to fix invisible mesh cases; applied for non-skinnable models.
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Switched default model back to /models/model01.glb per request to test visibility.
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: For model02, force a solid MeshStandardMaterial (skinning=true) to rule out invisible/transparent material issues. Added FORCE_SOLID_MATERIAL_MODELS and applySolidMaterial.
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Use SkeletonUtils.clone for skinned models to fix invisible/incorrect skinned meshes (clone(true) can break skins). buildCharacter now detects skinned meshes and clones appropriately.
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Reverted default fighter model to /models/model01.glb per request (restore known-good model).
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Inspected model04.glb: Skins=1, Animations=1 (Bow), bones named pelvis/spine/head/upperarm_l/... Added bone name variants for model04 and mapped forward axis to Z.
- 2026-02-05: Playwright run failed: missing local "playwright" package for web_game_playwright_client.js.
- 2026-02-05: Added model04 to forced solid material list. Added warning log when no rig parts are found to help diagnose mapping.
- 2026-02-05: Added prepareSkinnedMeshes (normalize skin weights, compute bounds, disable culling) to improve visibility for skinned models like model04.
- 2026-02-05: Playwright run failed: browsers not installed. Need `npx playwright install`.
- 2026-02-05: Added console logs for model load success/failure and metrics to diagnose invisible models.
- 2026-02-05: Playwright run failed: browsers not installed. Need `npx playwright install`.
- 2026-02-05: For model04, force unlit MeshBasicMaterial to rule out lighting issues; applySolidMaterial now supports unlit mode and sets needsUpdate.
- 2026-02-05: Updated bone mapping order to prioritize model04 rig names (pelvis/root/spine_*, upperarm/lowerarm, thigh/calf, hand_r).
- 2026-02-06: Expanded StickFighter bone mapping + animation to cover spine segments, neck, clavicles, hands, feet, and ball joints for full-body rigs (model04). Added subtle spine/clavicle/foot/ball motion driven by existing procedural pose.
- 2026-02-06: Playwright run failed in sandbox (MachPortRendezvous permission denied) even after browsers installed; cannot capture screenshots in this environment.
- 2026-02-06: Dimmed character material color and removed emissive for forced-solid models to reduce bloom glare (MODEL_DIM_COLOR, lower metalness, higher roughness).
- 2026-02-06: Reduced global bloom (strength/radius/threshold) and lowered toneMappingExposure in SceneManager to cut glow on bright characters.

- 2026-02-06: Adjusted torso bone mapping to prefer spine_03/02/01 before pelvis/root so upper-body tilt doesn't skew legs (pose alignment for model04).
- 2026-02-06: Playwright run failed (missing x64 browser) and mac-arm64 run failed in sandbox (MachPortRendezvous permission denied).

- 2026-02-06: Added model05 animation mapping for cast/hit, animation mixer support, and passed skillId into playCast so clips can be chosen per skill.
- 2026-02-06: Playwright run failed in sandbox (MachPortRendezvous permission denied).

- 2026-02-06: Model05 facing yaw offset + recovery clip (LayToIdle) after hit; GIANT uses Levitate Entrance; FAN triggers Fighting Left Jab when sword fires.
- 2026-02-06: Playwright run failed in sandbox (MachPortRendezvous permission denied).

- 2026-02-06: Disabled hand sword attachment (SHOW_HAND_SWORD=false) so characters no longer hold a sword.
- 2026-02-06: Playwright run failed in sandbox (MachPortRendezvous permission denied).

- 2026-02-06: Switched default model to model06, added model06 anim maps (Meditate/Throw Object/Sword_Regular_*), and scheduled Throw Object for FAN fire + Sword_Regular_C for GIANT fire.
- 2026-02-06: Playwright run failed in sandbox (MachPortRendezvous permission denied).

- 2026-02-06: Reduced idle sway/bob for model06 to keep a more neutral stance while idle.

- 2026-02-06: Disabled procedural pose for model06, smoothed hit/cast return offset, and kept neutral stance (no idle sway) while relying on animation clips.

- 2026-02-06: Model06 hit reactions now default to Hit_Chest; FAN overrides to Hit_Knockback_RM + LayToIdle. Added idle loop (NinjaJump_Idle_Loop) for arms-straight stance and hit skillId routing.

- 2026-02-06: Idle loop for model06 switched to Levitate Idle; idle loop resumes after attack/end clips.

- 2026-02-06: FAN hit now forces return-to-base after knockback; idle loop now resumes after any clip ends, with Levitate Idle as default idle.

- 2026-02-06: FAN knockback now forces return-to-base drift; idle loop resumes after any clip ends even if anim mode still cast.
- 2026-02-06: Playwright run failed in sandbox (MachPortRendezvous permission denied).

- 2026-02-06: Forced non-loop clip completion detection (time/paused), ensured idle loop resumes after any clip, and snap back to base when idle resumes; FAN knockback now flags return-to-base on recovery/knockback clip.

- 2026-02-06: Playwright run failed in sandbox (MachPortRendezvous permission denied).

- 2026-02-06: GIANT firing now cycles Sword_Regular_A_Rec/B/A/C during each shot cadence.

- 2026-02-06: GIANT now plays a single slow A_Rec -> B -> C sequence spanning the whole firing window (no per-shot looping).

- 2026-02-06: GIANT now uses only Sword_Regular_Combo with slowed duration during firing.

- 2026-02-06: Reset model root transforms when returning to idle; recovery clip tracked to avoid being overridden; idle loop now force-resets and snaps return-to-base to avoid stuck offset.

- 2026-02-06: Playwright run failed in sandbox (MachPortRendezvous permission denied).

- 2026-02-06: GIANT charge start now plays Levitate Entrance when rings begin.

- 2026-02-06: GIANT charge now loops Levitate Entrance until firing; on charge stop returns to Levitate Idle.

- 2026-02-06: Added idle-hold system to keep Levitate Entrance during GIANT charge and Meditate during FAN gather; cleared holds at firing to allow action clips.

- 2026-02-06: FAN now holds Meditate through sword creation (gather+aim) and starts Throw Object when firing begins; GIANT charge stop keeps Levitate Entrance briefly instead of snapping to idle, and GIANT fire clears hold at the fire moment. Playwright run failed: missing chromium headless shell (needs `npx playwright install`).
