// core engine platformer logic
class PlatformerEngine {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width = opts.width || 800;
    this.height = canvas.height = opts.height || 450;

    this.gravity = opts.gravity ?? 2200; // fall speed
    this.flyGravity = opts.flyGravity ?? 700; // wings are floaty
    this.moveSpeed = opts.moveSpeed ?? 260; // walk speed
    this.jumpSpeed = opts.jumpSpeed ?? 866; // jump speed
    this.airControl = opts.airControl ?? 0.7;
    this.tossGravity = opts.tossGravity ?? 2300; // clearer bomb arcs

    this.bodies = [];
    this.statics = [];
    this.maps = { main: this.statics, inter: [] }; // two maps
    this.activeMap = 'main';
    this.remotes = []; // draw only
    this.player = null;
    this.camera = { x: 0, y: 0 };
    this.shakeT = 0; // screen shake timer
    this.shakeMag = 0; // shake size
    this.followPlayer = opts.followPlayer ?? true;
    this.background = opts.background || '#1a1b26';
    this.spawn = { x: 60, y: 100 };
    this.evilSpawn = { x: 4300, y: 100 }; // far spawn
    this.fallY = opts.fallY ?? 800; // fall line
    this.fallDamage = opts.fallDamage ?? 50;

    this.input = new Input();
    this.time = 0;
    this.onUpdate = null; // tick hook
    this.moveLock = false; // select lock
    this.fly = false; // mod fly
    this.noclip = false; // mod ghost
    this.onHurt = null; // hurt hook
    this.onHeal = null; // heal hook
    this.onJump = null; // jump hook
    this.onDeath = null; // death hook
    this.onCounter = null; // counter hook
    this.onSpikeTrip = null; // trip hook
    this.cameraTarget = null; // watch target
    this.spikes = []; // trap list
    this.spikeImg = null; // spike art
    this.bombs = []; // tails traps
    this.onBombTrip = null; // bomb hook
    this.tosses = []; // bomb arcs
    this.onTossLand = null; // land hook
    this.onFlyLand = null; // touchdown hook
    this.booms = []; // boom pops
    this.boomImg = null; // boom art
    this.rockets = []; // nyan rockets
    this.rocketDone = new Set(); // done ids never respawn
    this.rocketImgs = []; // rocket frames
    this.onRocketBoom = null; // rocket hook
    this.onRocketHome = null; // homing hook
    this.myId = null; // my net id
    this.fx = []; // blast particles
    this.bombImg = null; // bomb art
    this.springs = []; // bounce pads
    this.onSpring = null; // bounce hook
    this.alertArrow = null; // ping arrow
    this.alerts = []; // ping list
    this.afterimages = []; // ghosts
    this.bubbles = {}; // chat bubbles
    this.chatBubbleImg = null; // bubble art
    this.showAlerts = false;
    this.sneakArrows = false; // ghost tracks
    this.seeInvis = false; // see ghosts
    this.damageOn = true; // safe rounds
    
    this.pullSrc = null; // drag point
    this.peelSrc = null; // ride point
    this.liftSrc = null; // tails carry point
    this.pullLinks = []; // rope lines
    this.debug = false; // debug view
    this.levelArt = null; // level art
    this.levelBounds = null; // level size
    this.levelBackdrop = null; // level backdrop
    this.interArt = null; // inter art
    this.interBounds = null; // inter size
    this.interBackdrop = null; // inter backdrop
    this.interProps = null; // front props
    this.interScale = 1; // inter shrink
    this.mapFall = { main: this.fallY, inter: this.fallY }; // fall lines
    this.mapBg = { main: this.background, inter: this.background }; // sky colors
    this.mapId = null; // active main map
  }

  // traced level
  loadLevel(level, art, opts = {}) {
    for (const [x, y, w, h] of level.rects) this.addPlatform(x, y, w, h, '#000');
    // stay inside
    this.addPlatform(-200, -1500, 200, level.h + 3000, '#000'); // left wall
    this.addPlatform(level.w, -1500, 200, level.h + 3000, '#000'); // right wall
    this.addPlatform(-200, -1700, level.w + 400, 200, '#000'); // ceiling
    this.levelArt = art;
    this.levelBackdrop = opts.backdrop || null;
    this.backdropShiftY = opts.backdropShiftY || 0;
    this.levelBounds = { w: level.w, h: level.h };
    this.mapFall.main = level.h + 600;
    if (opts.background) this.mapBg.main = opts.background;
    if (this.activeMap === 'main') { this.fallY = this.mapFall.main; this.background = this.mapBg.main; }
  }

  // swap main map
  loadMainMap(def) {
    this.maps.main.length = 0;
    this.springs = this.springs.filter((s) => s.map !== 'main');
    this.loadLevel(def.level, def.art, { background: def.background, backdrop: def.backdrop, backdropShiftY: def.backdropShiftY });
    this.spawn = { x: def.spawn.x, y: def.spawn.y };
    this.evilSpawn = { x: def.evilSpawn.x, y: def.evilSpawn.y };
    for (const s of def.springs || []) this.addSpring(s.x, s.y, s.power, s.img);
    if (this.activeMap === 'main') {
      this.statics = this.maps.main;
      this.fallY = this.mapFall.main;
      this.background = this.mapBg.main;
    }
    this.mapId = def.id;
    return def;
  }

  // traced intermission
  loadInterLevel(level, art, scale, backdrop, props) {
    const S = scale || 1;
    for (const [x, y, w, h] of level.rects) this.addPlatform(x, y, w, h, '#000', 'inter');
    // stay inside
    this.addPlatform(-200, -1500, 200, level.h + 3000, '#000', 'inter'); // left wall
    this.addPlatform(level.w, -1500, 200, level.h + 3000, '#000', 'inter'); // right wall
    this.addPlatform(-200, -1700, level.w + 400, 200, '#000', 'inter'); // ceiling
    this.interArt = art;
    this.interBackdrop = backdrop || null;
    this.interProps = props || null;
    this.interScale = S;
    this.interBounds = { w: level.w, h: level.h };
    this.mapFall.inter = level.h + 600;
    if (this.activeMap === 'inter') { this.fallY = this.mapFall.inter; this.background = this.mapBg.inter; }
  }

  addPlayer(x, y, w = 36, h = 52, color = '#7aa2f7') {
    const p = new Body(x, y, w, h, { color });
    p.hp = 100;
    p.maxHp = 100;
    this.spawn = { x, y };
    this.player = p;
    this.bodies.push(p);
    return p;
  }

  // deal damage
  hurtPlayer(n, source) {
    const p = this.player;
    if (!p || p.alive === false) return;
    if (p.rocketing) return; // rocket form can't be hurt
    // soften hits
    if (source !== 'killer' && this.lmsResist && !p.evil) n = Math.ceil(n * 0.75);
    if (source === 'killer' && (p.cowerT ?? 0) > 0) {
      p.cowerT = 0;
      p.cowering = false;
      if (this.onCounter) this.onCounter();
      return;
    }
    p.hp = Math.max(0, p.hp - n);
    if (this.onHurt) this.onHurt(p.hp);
    if (p.hp <= 0) {
      p.alive = false;
      p.visible = false;
      if (this.onDeath) this.onDeath();
      else { p.hp = p.maxHp; this.respawn(); }
    }
  }

  respawn() {
    const p = this.player;
    if (!p) return;
    // far respawn
    const s = (p.evil && this.activeMap === 'main') ? this.evilSpawn : this.spawn;
    p.pos.x = s.x;
    p.pos.y = s.y;
    p.vel.x = 0; p.vel.y = 0;
    p.runTime = 0;
    p.alive = true;
    p.visible = true;
    p.fatigue = 0; // fresh legs
    p.lastJumpT = -99;
    p._justJumped = false;
    p.rooted = false; p.chargeDir = 0; // clear locks
    p.cowerT = 0; p.cowering = false; p.stunT = 0; p.actionT = 0;
  }

  // debug heal
  healPlayer(n) {
    const p = this.player;
    if (!p) return;
    p.hp = Math.min(p.maxHp, p.hp + n);
    if (this.onHeal) this.onHeal(n);
  }

  // set sprites
  setPlayerSprites(sprites) {
    if (this.player) {
      if (this.player.sprites !== sprites) this.player._baseFrame = null;
      this.player.sprites = sprites;
    }
  }

  addPlatform(x, y, w, h, color = '#9ece6a', map = 'main') {
    const p = new Body(x, y, w, h, { isStatic: true, color });
    this.maps[map].push(p);
    return p;
  }

  // bounce pads
  addSpring(x, y, power, img, map = 'main') {
    const sp = { x, y, w: 46, h: 26, power, img, cd: 0, map };
    this.springs.push(sp);
    return sp;
  }

  // swap maps
  switchMap(name, spawnX, spawnY) {
    this.activeMap = name;
    this.statics = this.maps[name];
    this.fallY = this.mapFall[name] ?? this.fallY;
    this.background = this.mapBg[name] ?? this.background;
    this.spawn = { x: spawnX, y: spawnY };
  }

  // load tiles
  loadTilemap(rows, tile = 32, color = '#9ece6a') {
    rows.forEach((row, ry) => {
      [...row].forEach((ch, rx) => {
        if (ch === '#') this.addPlatform(rx * tile, ry * tile, tile, tile, color);
      });
    });
  }

  // height of the floor under x, near the feet. null if no floor there
  floorAt(x, feet) {
    let best = null;
    for (const s of this.statics) {
      if (x < s.pos.x || x >= s.pos.x + s.w) continue;
      if (s.pos.y < feet - 24 || s.pos.y > feet + 24) continue;
      if (best === null || s.pos.y < best) best = s.pos.y;
    }
    return best;
  }

  // if a body ended up inside a wall, move it to the closest open spot
  unstick(b) {
    const inWall = () => this.statics.some((s) => aabbOverlap(b, s));
    if (!inWall()) return;
    const ox = b.pos.x, oy = b.pos.y;
    for (let r = 8; r <= 240; r += 8) {
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        b.pos.x = ox + Math.cos(a) * r;
        b.pos.y = oy + Math.sin(a) * r;
        if (!inWall()) return;
      }
    }
    b.pos.x = ox; b.pos.y = oy; // nothing found, leave it
  }

  // tilt the body to match the slope under its feet
  updateTilt(b, dt) {
    let want = 0;
    if (b.alive !== false && !b.rocketing && Math.abs(b.vel.y || 0) < 60) {
      const cx = b.pos.x + b.w / 2, feet = b.pos.y + b.h;
      const l = this.floorAt(cx - 22, feet), r = this.floorAt(cx + 22, feet);
      if (l !== null && r !== null) {
        const ang = Math.atan2(r - l, 44);
        if (Math.abs(ang) > 0.08) want = Math.max(-0.6, Math.min(0.6, ang)); // ignore tiny bumps
      }
    }
    b.tilt = (b.tilt || 0) + (want - (b.tilt || 0)) * Math.min(1, 12 * dt);
  }

  // split motion
  moveBody(b, dt, statics) {
    if (this.noclip && b === this.player) {
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
      b.onGround = false;
      return;
    }
    const dist = Math.hypot(b.vel.x, b.vel.y) * dt; // frame distance
    const maxStep = Math.max(4, Math.min(b.w, b.h) / 2); // step cap
    const steps = Math.max(1, Math.min(8, Math.ceil(dist / maxStep))); // cap substeps
    const stepDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      b.pos.x += b.vel.x * stepDt;
      this.resolveAxis(b, statics, 'x');
      b.pos.y += b.vel.y * stepDt;
      this.resolveAxis(b, statics, 'y');
    }
  }

  // pop out
  resolveAxis(b, statics, axis) {
    for (const s of statics) {
      if (!aabbOverlap(b, s)) continue;
      if (axis === 'x') {
        // small steps
        const rise = b.bottom - s.top;
        if (b.vel.y >= 0 && (b.wasGround || b.onGround) && rise > 0 && rise <= 12) {
          const oy = b.pos.y;
          b.pos.y = s.pos.y - b.h;
          let clear = true;
          for (const o of statics) { if (o !== s && aabbOverlap(b, o)) { clear = false; break; } }
          if (clear) { b.onGround = true; continue; }
          b.pos.y = oy;
        }
        const fromLeft = b.right - s.left; // left depth
        const fromRight = s.right - b.left; // right depth
        if (b.vel.x > 0 || (b.vel.x === 0 && fromLeft <= fromRight)) b.pos.x = s.pos.x - b.w;
        else b.pos.x = s.pos.x + s.w;
        b.vel.x = 0;
      } else {
        const fromAbove = b.bottom - s.top; // top depth
        const fromBelow = s.bottom - b.top; // bottom depth
        if (b.vel.y > 0 || (b.vel.y === 0 && fromAbove <= fromBelow)) {
          b.pos.y = s.pos.y - b.h;
          b.onGround = true; // feet landed
        } else {
          b.pos.y = s.pos.y + s.h; // bonked head
        }
        b.vel.y = 0;
      }
    }
  }

  update(dt) {
    const p = this.player;
    if (p && p.rocketing) {
      // rocket mode skips walk
      p.vel.x = 0; p.vel.y = 0;
      p.onGround = false; p.wasGround = false;
      p.stunT = 0; p.chargeDir = 0; p.cowerT = 0; p.cowering = false;
      p.pulled = false;
      p.animTime += dt;
      this.input.consumeJumpPressed(); // drop inputs
    }
    if (p && !p.rocketing) {
      const stunned = (p.stunT ?? 0) > 0;
      if (stunned) p.stunT -= dt;
      if (p.actionT > 0) p.actionT -= dt;
      if ((p.cowerT ?? 0) > 0) p.cowerT -= dt; // cower ticks
      p.cowering = (p.cowerT ?? 0) > 0;
      const locked = stunned || p.rooted || p.chargeDir || this.moveLock; // still check
      const noJump = stunned || p.rooted || this.moveLock; // jump lock
      let ax = 0;
      if (!locked) {
        if (this.input.left) ax -= 1;
        if (this.input.right) ax += 1;
      }

      // run faster
      if (ax !== 0 && Math.sign(ax) === Math.sign(p.runDir || ax)) {
        p.runTime = (p.runTime || 0) + dt;
      } else if (ax !== 0) {
        p.runTime = 0; // turn reset
      } else {
        p.runTime = 0; // stop reset
      }
      p.runDir = ax !== 0 ? ax : 0;
      // tired jumps
      const fat = p.evil ? 0 : (p.fatigue || 0);
      p.fatigue = Math.max(0, (p.fatigue || 0) - dt * 0.2);
      const boost = 1 + Math.min(p.runTime / 2, 1) * 0.8;
      const target = ax * this.moveSpeed * boost * (1 - 0.3 * fat);

      // soft accel
      const accel = p.onGround ? 14 : 8;
      p.vel.x += (target - p.vel.x) * Math.min(accel * dt, 1);
      if (p.chargeDir && (p.stunT || 0) <= 0) p.vel.x = p.chargeDir * (p.chargeSpeed || 700); // dash speed

      if (ax !== 0) p.facing = ax > 0 ? 1 : -1;
      p.animTime += dt;

      // mod fly
      const canFly = this.fly && p.alive !== false;
      if (canFly) {
        const fs = this.moveSpeed * 1.6;
        p.vel.x = ax * fs;
        p.vel.y = this.input.jump ? -fs : this.input.down ? fs : 0;
        p.onGround = false;
        p.jumps = p.maxJumps ?? 1;
      } else if (p.taxiFly && p.alive !== false) {
        // tap to flap
        const fs = this.moveSpeed * 1.6;
        const flap = fs * 1.05; // one tap of lift
        const sinkMax = fs * 1.25;
        p.vel.x = ax * fs;
        if (this.input.consumeJumpPressed()) p.vel.y = -flap; // single flap
        else {
          p.vel.y += this.flyGravity * dt; // floaty sink
          if (p.vel.y > sinkMax) p.vel.y = sinkMax;
        }
        p.onGround = false;
        p.jumps = p.maxJumps ?? 1;
      } else if (p.superFly && p.alive !== false) {
        // tap climbs, steer otherwise
        if (this.input.consumeJumpPressed()) p.vel.y = -620; // flap up
        else p.vel.y += this.gravity * dt; // normal sink
        p.jumps = p.maxJumps ?? 1;
      } else if (p.luxFloat && p.alive !== false) {
        // light float
        p.vel.y += (-p.luxFloat - p.vel.y) * Math.min(8 * dt, 1);
        p.onGround = false;
        p.jumps = p.maxJumps ?? 1;
      } else {
        p.vel.y += this.gravity * dt;
      }

      if (p.onGround) p.jumps = p.maxJumps ?? 1; // feet reset
      if (!noJump && !this.fly && !p.taxiFly && !p.superFly && this.input.consumeJumpPressed()) {
        // weak jumps
        const hop = this.jumpSpeed * (1 - 0.5 * fat);
        if (p.onGround) {
          p.vel.y = -hop;
          p.onGround = false;
          p.jumps = (p.maxJumps ?? 1) - 1;
          if (!p.evil) p.fatigue = Math.min(1, (p.fatigue || 0) + 0.15);
          p.lastJumpT = this.time;
          p._justJumped = true;
          if (this.onJump) this.onJump(false);
        } else if ((p.jumps ?? 0) > 0) {
          p.jumps--; // use jump
          p.vel.y = -hop;
          if (!p.evil) p.fatigue = Math.min(1, (p.fatigue || 0) + 0.15);
          p.lastJumpT = this.time;
          p._justJumped = true;
          if (this.onJump) this.onJump(true);
        }
      } else {
        this.input.consumeJumpPressed(); // drop inputs
      }
      // cap short hops
      if (!p.taxiFly && !p.superFly && !this.input.jump && p.vel.y < -273 && this.time > (p.noCutUntil || 0)) p.vel.y = -273;
    }

    // move bodies
    for (const b of this.bodies) {
      if (b.isStatic) continue;
      if (b === p && p.rocketing) continue; // rocket flies through everything
      b.wasGround = b.onGround;
      b.onGround = false;
      this.moveBody(b, dt, b._roped ? [] : this.statics); // tunnel-safe push
      // clear jump flag landing
      if (!b.wasGround && b.onGround) b._justJumped = false;
      // wings end on touchdown
      if (b === p && p.taxiFly && b.onGround) {
        p.taxiFly = false;
        if (this.onFlyLand) this.onFlyLand(p);
      }
    }

    // drag close
    p.pulled = false;
    if (p && !p.rocketing && this.pullSrc && p.alive !== false && !p.evil) {
      const dx = this.pullSrc.x - (p.pos.x + p.w / 2);
      const dy = this.pullSrc.y - (p.pos.y + p.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      // stop next to the killer instead of shaking on top of them
      const pull = Math.max(0, Math.min(450 * dt, d - 36));
      p.pos.x += (dx / d) * pull;
      p.pos.y += (dy / d) * pull;
      p.vel.y = 0; // no stored up fall speed
      p.pulled = true; // dragged pose
      p._roped = true; // walls dont count while on the rope
    } else if (p && p._roped) {
      p._roped = false;
      this.unstick(p); // let go, pop out of any wall
    }
    // ride sonic
    if (p && !p.rocketing && this.peelSrc && p.alive !== false && !p.evil) {
      p.pos.x = this.peelSrc.x - p.w / 2;
      p.pos.y = this.peelSrc.y - p.h / 2;
      p.pulled = true; // dragged pose
    }
    // ride tails
    if (p && !p.rocketing && this.liftSrc && p.alive !== false && !p.evil) {
      p.pos.x = this.liftSrc.x - p.w / 2;
      p.pos.y = this.liftSrc.y - p.h / 2;
      p.pulled = true; // dragged pose
    }
    // mark caught
    for (const r of this.remotes) {
      r.pulled = false;
      if (r.alive !== false && !r.evil) {
        const ex = r.pos.x + r.w / 2, ey = r.pos.y + r.h / 2;
        for (const l of this.pullLinks) {
          if (Math.hypot(l.x1 - ex, l.y1 - ey) < 50 || Math.hypot(l.x2 - ex, l.y2 - ey) < 50) {
            r.pulled = true;
            break;
          }
        }
      }
    }

    // trap bites
    if (p && !p.rocketing && p.alive !== false && !p.evil && p.onGround && this.damageOn !== false) {
      const cx = p.pos.x + p.w / 2, feet = p.pos.y + p.h;
      for (const sp of this.spikes) {
        if (sp.tripped) continue;
        if (Math.abs(cx - sp.x) < 30 && feet > sp.y - 24 && feet < sp.y + 10) {
          sp.tripped = true;
          this.hurtPlayer(30);
          p.stunT = Math.max(p.stunT || 0, 3);
          if (this.onSpikeTrip) this.onSpikeTrip(sp);
          break;
        }
      }
    }

    // bomb bites
    if (p && p.alive !== false && p.evil && p.onGround && this.damageOn !== false) {
      const cx = p.pos.x + p.w / 2, feet = p.pos.y + p.h;
      for (const bb of this.bombs) {
        if (bb.used) continue;
        if (Math.abs(cx - bb.x) < 34 && feet > bb.y - 40 && feet < bb.y + 8) {
          bb.used = true;
          if (this.onBombTrip) this.onBombTrip(bb);
          break;
        }
      }
    }

    // spring pads
    if (p && !p.rocketing && p.alive !== false && (p.vel.y >= 0 || p.onGround)) {
      const cx = p.pos.x + p.w / 2, feet = p.pos.y + p.h;
      for (const sp of this.springs) {
        if (sp.map !== this.activeMap) continue;
        if (sp.cd > this.time) continue;
        if (Math.abs(cx - (sp.x + sp.w / 2)) < (p.w + sp.w) / 2 &&
            feet > sp.y + 6 && feet < sp.y + sp.h + 14) {
          sp.cd = this.time + 6;
          p.pos.y = sp.y + 6 - p.h;
          p.vel.y = -sp.power;
          p.noCutUntil = this.time + 0.6;
          p.onGround = false;
          p.jumps = p.maxJumps ?? 1;
          if (this.onSpring) this.onSpring(sp);
          break;
        }
      }
    }

    // ground math
    if (p && p.onGround) p.walkDist += Math.abs(p.vel.x) * dt;

    // fade ghosts
    for (const g of this.afterimages) g.age += dt;
    this.afterimages = this.afterimages.filter((g) => g.age < 0.4);

    // boom pops
    for (const b of this.booms) b.age += dt;
    this.booms = this.booms.filter((b) => {
        const keep = b.age < 1.8;
        if (!keep && b.node) { b.node.remove(); b.node = null; }
        return keep;
      });

    // toss arcs
    this.stepTosses(dt);

    // nyan rockets and blast bits
    this.stepRockets(dt);
    this.stepFx(dt);

    // glide friends
    for (const r of this.remotes) {
      if (r.tx === undefined) { r.tx = r.pos.x; r.ty = r.pos.y; }
      const dx = r.tx - r.pos.x, dy = r.ty - r.pos.y;
      if (Math.abs(dx) > 300 || Math.abs(dy) > 300) {
        r.pos.x = r.tx; r.pos.y = r.ty; // snap far
        r.vel.x = 0;
        const now0 = performance.now();
        r.hist = [{ x: r.pos.x, y: r.pos.y, t: now0 }, { x: r.pos.x, y: r.pos.y, t: now0 }];
      } else {
        const rt = performance.now() - (r.delay || 100); // delay adapts to ping
        const h = (r.hist && r.hist.length >= 2) ? r.hist : null;
        let nx = r.tx, ny = r.ty;
        if (h) {
          let i = h.length - 1;
          while (i > 0 && h[i].t > rt) i--;
          const a = h[i], b = h[Math.min(i + 1, h.length - 1)];
          if (b.t > a.t) {
            const f = Math.min(1, Math.max(0, (rt - a.t) / (b.t - a.t)));
            nx = a.x + (b.x - a.x) * f;
            ny = a.y + (b.y - a.y) * f;
          } else {
            nx = b.x; ny = b.y;
          }
        } else {
          const t = Math.min(16 * dt, 1);
          nx = r.pos.x + dx * t;
          ny = r.pos.y + dy * t;
        }
        const moved = Math.abs(nx - r.pos.x);
        r.walkDist += moved; // glide steps
        // safe speed
        const hh = r.hist;
        if (hh && hh.length >= 2) {
          const ha = hh[0], hb = hh[hh.length - 1];
          const span = Math.max(0.05, (hb.t - ha.t) / 1000);
          const raw = Math.abs(hb.x - ha.x) / span;
          r.vel.x = (r.vel.x || 0) + (raw - (r.vel.x || 0)) * Math.min(1, 5 * dt);
        } else {
          r.vel.x = moved / Math.max(dt, 0.001); // rough speed
        }
        r.pos.x = nx; r.pos.y = ny;
        // dash ghosts
        if ((r.dashing || r.peeling || r.spinning || r.rushing || r.boosting || r.echarge) && moved > 1) {
          r.ghostDist = (r.ghostDist || 0) + moved;
          if (r.ghostDist > 14) {
            r.ghostDist = 0;
            const gi = this._spriteFor(r);
            if (gi && gi.complete && gi.naturalWidth) {
              const fs = this.frameSize(r, gi);
              this.afterimages.push({
                x: r.pos.x, y: r.pos.y, w: r.w, h: r.h,
                drawW: fs.dw, drawH: fs.dh, facing: r.facing,
                img: gi, age: 0, plain: !!(r.peeling || r.spinning || r.rushing || r.boosting || r.echarge),
              });
            }
          }
        } else {
          r.ghostDist = 0;
        }
      }
      r.animTime += dt; // blink all
    }

    // lean on slopes
    if (p) this.updateTilt(p, dt);
    for (const r of this.remotes) this.updateTilt(r, dt);

    // fell far
    if (p && !p.rocketing && p.pos.y > this.fallY && this.damageOn !== false) {
      this.hurtPlayer(this.fallDamage);
      if (p.hp > 0) this.respawn(); // spawn back
    }

    if (this.followPlayer && p) {
      const t = this.cameraTarget || p; // watch who
      this.camera.x = t.pos.x + t.w / 2 - this.width / 2;
      this.camera.y = t.pos.y + t.h / 2 - this.height / 2;      if (this.levelBounds && this.activeMap === 'main') { // stay inside
        this.camera.x = Math.max(0, Math.min(this.levelBounds.w - this.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.levelBounds.h - this.height, this.camera.y));
      }
      if (this.interBounds && this.activeMap === 'inter') { // stay inside
        this.camera.x = Math.max(0, Math.min(this.interBounds.w - this.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.interBounds.h - this.height, this.camera.y));
      }
    }
    if (this.shakeT > 0) this.shakeT -= dt; // shake decays

    if (this.onUpdate) this.onUpdate(dt);
    this.time += dt;
  }

  start() {
    let last = performance.now();
    let frames = 0, fpsTime = last;
    this.fps = 0;
    const loop = (now) => {
      frames++;
      if (now - fpsTime >= 1000) { this.fps = frames; frames = 0; fpsTime = now; }
      let dt = (now - last) / 1000;
      last = now;
      dt = Math.min(dt, 1 / 30); // small steps
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

window.PlatformerEngine = PlatformerEngine;
