    /** toko abilities: one queued key press (Z/X/...) */
    function castToko(p, now, ab) {
      if (ab === 'Z' && now >= T.kickCD && !T.kickUntil) {
        // high kick
        p.chargeDir = p.facing || 1;
        p.chargeSpeed = 450;
        p.vel.y = -990;
        T.kickUntil = now + 1200;
        T.kickStart = now;
        T.kickHit = false;
        setPose('kick', 600);
        // quiet kick
      } else if (ab === 'X' && now >= T.jabCD && !T.jabUntil) {
        p.rooted = true; // planted jab
        T.jabUntil = now + 400;
        T.jabHit = false;
        setPose('jab', 400);
      }
    }

    /** sonic abilities: one queued key press (Z/X/...) */
    function castSonic(p, now, ab) {
      if (ab === 'Z' && now >= SN.peelCD && !SN.windupUntil && !SN.peeling && !SN.spinning && !SN.spinWindup) {
        // long zoom
        SN.windupUntil = now + 3000;
        p.rooted = true;
        p.actionImg = sonicSprites.charge; p.actionT = 3.1;
        fileSfx(SFX + 'dash_charge.wav', {});
      } else if (ab === 'X' && now >= SN.spinCD && !SN.spinWindup && !SN.spinning && !SN.peeling && !SN.windupUntil) {
        // spindash
        SN.spinWindup = now + 1000;
        p.rooted = true;
        p.actionImg = sonicSprites.spin[0]; p.actionT = 1.1;
        fileSfx(SFX + 'dash_charge.wav', {});
      }
    }

    /** super abilities: one queued key press (Z/X/...) */
    function castSuper(p, now, ab) {
      if (!SS.transformed) {
        // plain sonic one move
        if (ab === 'Z' && !SS.formUntil && p.alive !== false) {
          // glow up
          SS.formUntil = now + 1600;
          SS.focusUntil = now + 2800; // all eyes here
          game.cameraTarget = p;
          p.rooted = true;
          wearChar('supersonic'); p._wore = 'super'; // scale the seq right
          setPose('transform', 1600);
          fileSfx(SFX + 'dash_charge.wav', {});
        }
      } else if (ab === 'Z' && now >= SS.boostCD && !SS.boostWindup && !SS.boosting && !SS.spinning && !SS.spinWindup && (p.cowerT || 0) <= 0) {
        // boost
        SS.boostWindup = now + 400;
        p.rooted = true;
        p.actionImg = superSprites.skid[0]; p.actionT = 0.5;
        setPose('boost', 400);
        fileSfx(SFX + 'dash_charge.wav', {});
      } else if (ab === 'X' && now >= SS.blockCD && !SS.boosting && !SS.spinning && !SS.spinWindup && (p.cowerT || 0) <= 0) {
        // block spares server hit
        p.cowerT = 2.5;
        p.rooted = true;
        SS.wasBlocking = true;
        setPose('block', 2500);
        fileSfx(SFX + 'basic_hit.wav', { v: 0.3 });
      } else if (ab === 'C' && now >= SS.spinCD && !SS.spinWindup && !SS.spinning && !SS.boosting && !SS.boostWindup && (p.cowerT || 0) <= 0) {
        // super spindash
        SS.spinWindup = now + 800;
        p.rooted = true;
        p.actionImg = superSprites.spin[0]; p.actionT = 0.9;
        fileSfx(SFX + 'dash_charge.wav', {});
      }
    }

    /** nyan abilities: one queued key press (Z/X/...) */
    function castNyan(p, data, isLMS, now, ab) {
      if (ab === 'Z' && now >= NY.rocketCD && data.phase === 'round' && !data.grace) {
        // rocket goes for the killer
        NY.rocketCD = now + ROCKET_CD * (isLMS ? LMS_CD : 1);
        fireRocket();
      } else if (ab === 'X' && now >= NY.dashCD && !NY.dashing) {
        // rainbow dash
        NY.dashing = true; NY.dashUntil = now + NYAN_DASH_MS; NY.dashHit = false;
        p.chargeDir = game.input.left ? -1 : (game.input.right ? 1 : (p.facing || 1));
        p.facing = p.chargeDir;
        p.chargeSpeed = NYAN_DASH_SPEED;
        fileSfx(SFX + 'super_dash.wav', {});
      }
    }

    /** tails abilities: one queued key press (Z/X/...) */
    function castTails(p, isLMS, now, ab) {
      if (ab === 'Z') {
        if (TW.flying) {
          TW.flying = false; // drop out
          TW.flyCD = now + FLY_CD * (1 - TW.flyLeft / FLY_MAX) * (isLMS ? LMS_CD : 1);
        } else if (now >= TW.flyCD && !TW.whipUntil) {
          TW.flying = true;
          TW.flyLeft = FLY_MAX; // meter
          if (p.onGround) {
            // grounded launch costs quarter
            TW.flyLeft = FLY_MAX * 0.75;
            p.vel.y = Math.min(p.vel.y || 0, -600);
            p.onGround = false;
          }
          fileSfx(SFX + 'dash_release.wav', {});
          game.luxGlow(p.pos.x + p.w / 2, p.pos.y + p.h / 2, '#ffffff', 4, 110); // liftoff puff
        }
      } else if (ab === 'X' && !TW.flying && !TW.throwUntil) {
        // arm then toss again
        const dir = p.facing || 1;
        if (!TW.holding) {
          if (TW.bombsLeft <= 0) {
            sayStatus('out of bombs!!', 2);
            fileSfx(SFX + 'denied.wav', {});
          } else if (now < TW.bombCD) {
            fileSfx(SFX + 'denied.wav', {});
          } else {
            TW.holding = true;
            fileSfx(SFX + 'bomb_grab.wav', {});
            sayStatus('bomb out!!', 1.5);
          }
        } else if (TW.bombsLeft <= 0) {
          sayStatus('out of bombs!!', 2);
          fileSfx(SFX + 'denied.wav', {});
        } else {
          TW.holding = false;
          TW.bombsLeft--;
          TW.bombCD = now + BOMB_CD * (isLMS ? LMS_CD : 1);
          TW.throwUntil = now + 300;
          setPose('throw', 300);
          // short lob now
          const throwX = p.pos.x + p.w / 2 + dir * 16;
          const throwY = p.pos.y + 8;
          const throwVx = dir * 500;
          const throwVy = -320;
          // add toss with owner
          game.addToss(throwX, throwY, throwVx, throwVy, game.bombImg, null, net.id);
          game.luxGlow(throwX, throwY, '#ffa502', 4, 100); // toss puff
          fetch('/api/bomb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: net.id, action: 'throw', x: throwX, y: throwY, vx: throwVx, vy: throwVy }),
          }).then((response) => response.json()).then((payload) => {
            if (payload.toss?.id) seenTosses.add(payload.toss.id);
          }).catch(() => {});
          fileSfx(SFX + 'bomb_grab.wav', {});
        }
      } else if (ab === 'C' && now >= TW.whipCD && !TW.whipUntil && !TW.flying) {
        // tailwhip
        TW.whipUntil = now + 400; TW.whipHit = false;
        p.rooted = true;
        setPose('whip', 400);
        fileSfx(SFX + 'tailwhip.wav', {});
      }
    }

    /** mario abilities: one queued key press (Z/X/...) */
    function castMario(p, now, ab) {
      if (ab === 'Z' && now >= MU.diveCD && !MU.diveUntil) {
        MU.diveUntil = now + 520;
        MU.diveAnimUntil = now + 700;
        MU.diveHit = false;
        MU.diveDir = p.facing || 1;
        p.mario3dAction = 'mdive';
        p.rooted = true;
        p.chargeDir = MU.diveDir;
        p.chargeSpeed = 900;
        p.vel.x = MU.diveDir * p.chargeSpeed;
        p.vel.y = Math.min(p.vel.y, -120);
        p.onGround = false;
        p.actionImg = marioSprites.dive; p.actionT = 0.55;
        setPose('dive', 520);
        fileSfx(SFX + 'mario_dive.wav', {});
      } else if (ab === 'X' && now >= MU.spinCD && !MU.spinUntil && !MU.spinUsed) {
        // spin jump, one per air
        MU.spinUsed = true;
        MU.spinUntil = now + 1000;
        MU.spinAnimUntil = now + 1000;
        MU.spinHit = false;
        p.mario3dAction = 'mspin';
        p.vel.y = -900;
        p.onGround = false;
        p.noCutUntil = game.time + 1.0; // keep full hop
        p.actionImg = marioSprites.spin[0]; p.actionT = 0.15;
        setPose('spin', 1000);
        game.spawnSprite(p.pos.x + p.w / 2, p.pos.y + p.h / 2, marioSprites.luma, 0.15); // luma puff
        fileSfx(SFX + 'spin_attack_mario.wav', {});
        fileSfx(SFX + 'mario_spin_voice.wav', {});
      }
    }

    /** noelle abilities: one queued key press (Z/X/...) */
    function castNoelle(p, now, ab) {
      if (ab === 'Z' && now >= NW.icewallCD && !NW.icewallActive && !p.rooted) {
        // wall blocks killer path
        NW.icewallActive = true;
        NW.rootUntil = now + 800;
        p.rooted = true;
        const iwf = noelleSprites.icewall || [];
        p.actionImg = iwf[0] || noelleSprites.idle[0]; p.actionT = 0.15;
        setPose('icewall', 800);
        fileSfx(SFX + 'icewall.mp3', { v: 0.5 });
        const dir = p.facing || 1;
        const wx = p.pos.x + p.w / 2 + dir * 44 - 30;
        const wy = p.pos.y + p.h - 190; // wall stands on the ground at her feet
        fetch('/api/icewall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: net.id, action: 'place', x: wx, y: wy }),
        }).then((r) => r.json()).then((out) => {
          if (!out || !out.ok) NW.icewallActive = false; // rejected
        }).catch(() => { NW.icewallActive = false; });
      } else if (ab === 'X' && now >= NW.sleepmistCD && !NW.mistUntil && !p.rooted) {
        // sleepmist - freezing mist around self
        NW.mistUntil = now + 10000; // mist lasts 10s
        NW.rootUntil = now + 800;
        p.rooted = true;
        const iwf = noelleSprites.icewall || [];
        p.actionImg = iwf[0] || noelleSprites.idle[0]; p.actionT = 0.15;
        setPose('sleepmist', 800);
        fileSfx(SFX + 'sleep_mist.wav', { v: 0.5 });
        fetch('/api/icewall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: net.id, action: 'mist' }),
        }).then((r) => r.json()).then((out) => {
          if (!out || !out.ok) NW.mistUntil = 0; // rejected
        }).catch(() => { NW.mistUntil = 0; });
      }
    }
