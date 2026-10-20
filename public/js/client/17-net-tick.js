async function netTick() {
      const p = game.player;
      if (!net.id || !p) return;
      if (document.hidden) {
        // dead tabs
        const now = performance.now();
        let missed = Math.min((now - (net.lastWall || now)) / 1000, 2);
        net.lastWall = now;
        let guard = 0;
        while (missed > 0.001 && guard++ < 120) {
          const step = Math.min(missed, 1 / 30);
          game.update(step);
          missed -= step;
        }
      } else {
        net.lastWall = performance.now();
      }
      try {
        const t0 = performance.now();
        // send and get at the same time, so a tick costs 1 trip instead of 2
        const sendReq = fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: net.id, r: net.round, maxhp: p.maxHp,
            x: Math.round(p.pos.x * 10) / 10, y: Math.round(p.pos.y * 10) / 10,
            facing: p.facing, hp: Math.ceil(p.hp),
            moving: Math.abs(p.vel.x) > 10, onGround: p.onGround,
            alive: p.alive !== false,
            invis: p.invis === true, m1: K.m1ok !== false, peeling: SN.peeling === true, spinning: SN.spinning === true, spinwindup: !!SN.spinWindup,
            lift: TW.flying === true, super: SS.transformed === true, forming: !!SS.formUntil, holding: TW.holding === true, whipuntil: !!TW.whipUntil, kickUntil: !!T.kickUntil, jabUntil: !!T.jabUntil, throwUntil: !!TW.throwUntil,
            stunned: (p.stunT || 0) > 0, pull: Date.now() < K.pullUntil,
            pulltarget: p.evil ? K.pullTarget : null,
            mimic: p.evil && isShadowMario() ? SM.mimic : null,
            mimic_target: p.evil && isShadowMario() ? SM.mimicTarget : null,
            cower: (p.cowerT || 0) > 0, windup: !!L.prayUntil || !!K.windupUntil || !!SN.windupUntil || !!SN.spinWindup || !!K.pullWindup, pullwindup: !!K.pullWindup,
            dashing: NY.dashing,
            dtmult: isLux() ? (L.dt || 1) : 1, healmult: isLux() ? (L.heal || 1) : 1,
            praying: isLux() && !!L.prayUntil, rushing: isLux() && !!L.rushing, panting: isLux() && (!!L.panting || (p.hp ?? 0) > (p.maxHp ?? 100)),
            pose: (poseName && Date.now() < poseUntil) ? poseName : null,
            fireball: isMario() && MU.fireballProjectile ? {
              id: MU.fireballProjectile.id, x: MU.fireballProjectile.x, y: MU.fireballProjectile.y,
              vx: MU.fireballProjectile.vx, vy: MU.fireballProjectile.vy,
            } : null,
            anim: curAnim(p), m1v: p._m1v || 0, trail: !!(p.evil && game.fly),
          }),
        });
        const getReq = fetch(`/api/players?id=${encodeURIComponent(net.id)}`);
        const got = await Promise.all([sendReq, getReq]);
        const data = await got[1].json();
        net.ping = Math.round(performance.now() - t0); // trip time
        const prevRound = net.round;
        const others = data.players || {};
        // fresh id
        if (!others[net.id]) {
          net.id = null;
          game.remotes = [];
          joinOnline();
          return;
        }
        const t = { data, prevRound, others, p };
        syncPhase(t);
        syncEvilState(t);
        updatePhaseText(t);
        syncRemotes(t);
        syncCharSelect(t);
        updateMusic(t);
        syncStunFeel(t);
        syncTraps(t);
        syncAnnouncesAndChat(t);
        syncHitPop(t);
        handleAbilityInput(t);
        tickEvilKit(t);
        tickShadowMario(t);
        tickLux(t);
        tickSonicPeel(t);
        tickSonicSpin(t);
        tickSuperSonic(t);
        tickToko(t);
        tickMario(t);
        tickNyan(t);
        tickTails(t);
        tickRopesAndRides(t);
        updateSpectate(t);
        updateFocusCamera(t);

        if (net.fail > 0) { netStatus.style.color = ''; hideFatal(); } // error clear
        net.fail = 0;
      } catch (e) {
        // count fails
        net.fail = (net.fail || 0) + 1;
        if (net.fail === 75) netError('connection lost!! retrying...', 30);
      }
    }
