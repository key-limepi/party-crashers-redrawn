    function fireRocket() {
      const p = game.player;
      // cat becomes rocket instantly
      const cx = Math.round(p.pos.x + p.w / 2), cy = Math.round(p.pos.y + p.h / 2);
      if (NY.dashing) { NY.dashing = false; p.dashing = false; p.chargeDir = 0; p.chargeSpeed = 0; }
      const local = game.addRocket(cx, cy, { owner: net.id, mine: true });
      p.rocketing = true;
      game.luxGlow(cx, cy, '#c9c9d6', 4, 130); // launch smoke
      fetch('/api/rocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: net.id, action: 'launch', x: cx, y: cy }),
      }).then((r) => r.json()).then((d) => {
        const rk = d && d.rocket;
        if (!rk) {
          // server refused revert cat
          game.rockets = game.rockets.filter((g) => g !== local);
          NY.rocketCD = 0;
          return;
        }
        // poll may claim first
        if (!local.id) local.id = rk.id;
        local.owner = rk.by;
        game.rockets = game.rockets.filter((g) => g === local || g.id !== rk.id);
      }).catch(() => { game.rockets = game.rockets.filter((g) => g !== local); });
      fileSfx(SFX + 'dash_release.wav', {});
    }
    // caster calls server damages
    game.onRocketHome = (rk, rate) => {
      fileSfx(SFX + 'nyan_homing.wav', { rate: rate || 1 });
    };
    game.onRocketBoom = (rk) => {
      fetch('/api/rocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: net.id, action: 'detonate', rocket: rk.id, x: Math.round(rk.x), y: Math.round(rk.y) }),
      }).catch(() => {});
    };
    // sync rockets and blasts
    function syncRockets(data) {
      game.myId = net.id;
      const list = data.rockets || [];
      for (const r of list) {
        if (game.rocketDone.has(r.id)) continue; // already blew up here
        let rk = game.rockets.find((g) => g.id === r.id);
        // match own pending launch
        if (!rk && r.by === net.id) {
          rk = game.rockets.find((g) => g.mine && !g.id);
          if (rk) rk.id = r.id;
        }
        if (!rk) {
          rk = game.addRocket(r.x, r.y, { id: r.id, owner: r.by, mine: r.by === net.id, age: r.age });
          fileSfx(SFX + 'dash_release.wav', { v: 0.6 });
          game.luxGlow(r.x, r.y, '#c9c9d6', 4, 120); // watched launch
        }
        rk.target = r.target || null;
      }
      game.rockets = game.rockets.filter((g) => !g.id || list.some((r) => r.id === g.id));
      for (const b of (data.blasts || [])) {
        if (seenBlasts.has(b.id)) continue;
        seenBlasts.add(b.id);
        if (b.age > 1.5) continue; // old news
        game.addBlast(b.x, b.y);
        // everyone shakes, closer is harder
        const cx = game.camera.x + game.width / 2, cy = game.camera.y + game.height / 2;
        const k = Math.max(0, 1 - Math.hypot(b.x - cx, b.y - cy) / BLAST_RANGE);
        game.shake(3 + 30 * k * k, 0.7 + 0.9 * k);
        fileSfx(SFX + 'explode.mp3', { v: 0.25 + 0.75 * k });
      }
      if (seenBlasts.size > 60) seenBlasts.delete(seenBlasts.values().next().value);
    }
