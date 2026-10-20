    const FLY_MAX = 10000; // meter
    const FLY_DRAIN = 95; // meter burns fast
    const FLY_COLOR = '#ff8c1a'; // orange
    const FLY_CD = 27000; // after flight
    const BOMB_CD = 13500; // trap wait
    const WHIP_CD = 13500; // whip wait
    game.onCounter = () => {
      // eat hits
      S.countered = true;
      fileSfx(SFX + 'basic_hit.wav', { v: 0.3 }); // counter sting
      if (net.ekid) {
        fetch('/api/hit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: net.id, victim: net.ekid, dmg: 0, stun: 2 }),
        }).catch(() => {});
      }
    };
    // blocked sight
    function losClear(x1, y1, x2, y2) {
      for (let i = 1; i < 12; i++) {
        const sx = x1 + (x2 - x1) * i / 12, sy = y1 + (y2 - y1) * i / 12;
        for (const s of game.statics) {
          if (sx > s.pos.x && sx < s.pos.x + s.w && sy > s.pos.y && sy < s.pos.y + s.h) return false;
        }
      }
      return true;
    }
    window.addEventListener('keydown', (e) => {
      if (e.repeat || !net.id || !game.player || game.player.alive !== false) return;
      const alive = game.remotes.filter((r) => r.alive && r.hp > 0);
      if (!alive.length) return;
      let i = alive.findIndex((r) => r.id === specId);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (i + 1) % alive.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (i - 1 + alive.length) % alive.length;
      else return;
      specId = alive[i < 0 ? 0 : i].id;
      game.cameraTarget = alive[i < 0 ? 0 : i];
    });
    setInterval(() => {
      const ping = net.id && net.ping != null ? `${net.ping}ms` : '--';
      const solo = soloIdx >= 0 ? ` | mus: ${soloOrder[soloIdx]} ` : '';
      statsBox.textContent = `fps: ${game.fps || '--'} | ping: ${ping}${solo}`;
      // tired overlay
      vignette.style.opacity = game.player ? Math.min(1, game.player.fatigue || 0).toFixed(2) : 0;
      // low hp static, quiet warning
      const lp = game.player;
      const lowhpEl = document.getElementById('lowhpStatic');
      if (lowhpEl) {
        const frac = lp && lp.alive !== false ? (lp.hp ?? 0) / (lp.maxHp ?? 100) : 1;
        const show = window.FLASH_ON !== false && frac < 0.35 ? (0.35 - frac) / 0.35 * 0.28 : 0;
        lowhpEl.style.display = show > 0 ? 'block' : 'none';
        lowhpEl.style.opacity = show.toFixed(2);
      }
      // sneak darkness, evil eyes only
      const p = game.player;
      sneakShade.style.opacity = (p && p.evil && p.invis && p.alive !== false) ? 0.45 : 0;
      // sunset wash on green hill
      sunsetShade.style.opacity = (game.activeMap === 'main' && game.mapId === 'greenhill') ? 0.22 : 0;
      // walking feet loop
      if (p && p.alive !== false && p.onGround && Math.abs(p.vel.x) > 60) {
        const isShadowMario = p.evil && net.killerPick === 'shadowmario';
        stepLoop.rate((isShadowMario ? 0.35 : 0.4) + Math.abs(p.vel.x) / 900);
        stepLoop.start();
      } else stepLoop.stop();
      if (posdbg.style.display !== 'none' && game.player) {
        posdbg.textContent = `x: ${Math.round(game.player.pos.x)} y: ${Math.round(game.player.pos.y)}`;
      }
    }, 100);
    // death fx
    const deathStatic = document.getElementById('deathStatic');
    function deathFx() {
      fileSfx(SFX + 'death.mp3', {});
      if (!deathStatic || window.FLASH_ON === false) return; // calm death
      deathStatic.style.display = 'block';
      deathStatic.style.opacity = '1';
      clearTimeout(deathStatic._t);
      clearTimeout(deathStatic._t2);
      deathStatic._t = setTimeout(() => { deathStatic.style.opacity = '0'; }, 2500);
      deathStatic._t2 = setTimeout(() => { deathStatic.style.display = 'none'; }, 5100);
    }
    game.onDeath = () => {
      const p = game.player;
      clearEvil(p);
      deathFx();
      net.diedAt = Date.now(); // delayed spec
      if (!net.id) { // dead respawn
        netError('not connected!! start the server and refresh!!', 30);
        p.hp = p.maxHp;
        game.respawn();
        return;
      }
      sayStatus('you died!! spectating the survivors...', 5);
    };
    game.onSpikeTrip = (sp) => {
      trippedIds.add(sp.id); // one trip
      fileSfx(SFX + 'basic_hit.wav', {}); // trap sound
      if (net.id) {
        fetch('/api/spike', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: net.id, action: 'trip', spike: sp.id }),
        }).catch(() => {});
      }
    };
    // bomb boom
    const boomedIds = new Set(); // already popped
    const seenTosses = new Set(); // synchronized throws already rendered
    game.onBombTrip = (bb) => {
      const me = game.player;
      if (!me || !me.evil) return;
      boomedIds.add(bb.id);
      fileSfx(SFX + 'explode.mp3', { v: 0.4 });
      game.addBoom(bb.x, bb.y - 20);
      if (net.id) {
        const pdx = Math.sign((me.pos.x + me.w / 2) - bb.x) || 1;
        fetch('/api/bomb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: net.id, action: 'trip', bomb: bb.id, dx: pdx }),
        }).then((response) => response.json()).then((result) => {
          if (result.ok) me.bombSlowUntil = Date.now() + (result.slow || 0) * 1000;
        }).catch(() => {});
      }
    };
    // touchdown kills the wings
    game.onFlyLand = () => {
      TW.flying = false;
      TW.flyCD = Date.now() + FLY_CD * (1 - TW.flyLeft / FLY_MAX);
      if (game.player) game.player.taxiFly = false;
      sayStatus('landed - tails folded!!', 1.5);
    };
    // bomb stays landed
    game.onTossLand = (t) => {
      if (t.dead || !net.id) return;
      if (t.throwerId && t.throwerId !== net.id) return; // owner places only
      const bx = Math.round(t.x), by = Math.round(t.groundY ?? t.y);
      if (net.phase === 'round') fileSfx(SFX + 'bomb_land.wav', {});
      // bombs need elbow room
      for (const ob of (game.bombs || [])) {
        if ((bx - ob.x) ** 2 + (by - ob.y) ** 2 < 100 ** 2) {
          sayStatus('too close!!', 2);
          TW.holding = true; // take it back
          TW.bombsLeft = Math.min(5, TW.bombsLeft + 1); // refund
          TW.bombCD = Date.now() + 2000;
          return;
        }
      }
      fetch('/api/bomb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: net.id, action: 'place', x: bx, y: by }),
      }).then((r) => r.json()).then((d) => {
        if (d && !d.ok) {
          if (d.reason === 'bomb limit reached!!') sayStatus('max 5 bombs!!', 2);
          TW.bombsLeft = Math.min(5, TW.bombsLeft + 1); // refund
        }
      }).catch(() => {});
    };
    // spring boing
    game.onSpring = () => {
      if (net.phase === 'round') fileSfx(SFX + 'spring.wav', {});
    };
    game.onTossBounce = () => {
      if (net.phase === 'round') fileSfx(SFX + 'spring.wav', {});
    };
    game.onTossBoom = (a, c) => {
      if (game.player && !game.player.evil && isTails()) {
        for (const t of [a, c]) {
          if (t && t.throwerId === net.id) {
            TW.holding = true;
            TW.bombsLeft = Math.min(5, TW.bombsLeft + 1);
          }
        }
      }
      fileSfx(SFX + 'explode.mp3', { v: 0.4 });
    };
