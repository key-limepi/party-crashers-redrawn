    function handleAbilityInput(t) {
      let { p, data, isLMS } = t;
      // evil keys
      const now = Date.now();
      // ropes + rockets lock abilities
      const canCast = p.alive !== false && (p.stunT || 0) <= 0 && !selectOpen && !p.rocketing
        && !(p.evil && now < K.pullUntil); // busy dragging
      if (!canCast) while (game.input.consumeAbility()) {} // clear queue
      const m1Muted = now < K.penaltyUntil; // sneak mute
      let ab;
      while (canCast && (ab = game.input.consumeAbility())) {
        if (p.evil && isBear5() && ab === 'Z') {
          const victim = game.remotes
            .filter((r) => !r.evil && r.alive && r.hp > 0 &&
              Math.abs(r.pos.x - p.pos.x) < 120 &&
              Math.abs((r.pos.y + r.h / 2) - (p.pos.y + p.h / 2)) < 110)
            .sort((a, b) => Math.abs(a.pos.x - p.pos.x) - Math.abs(b.pos.x - p.pos.x))[0];
          const oldFacing = p.facing || 1;
          const dir = victim ? (Math.sign(victim.pos.x + victim.w / 2 - (p.pos.x + p.w / 2)) || oldFacing) : oldFacing;
          const foldedTurn = !!victim && dir !== oldFacing;
          p.facing = dir;
          p.rooted = true;
          p.actionImg = bear5Image; p.actionT = 0.44;
          if (foldedTurn) {
            p._bearFoldStart = Date.now();
            p._bearFoldDuration = 440;
            p._bearFoldUntil = p._bearFoldStart + p._bearFoldDuration;
          }
          setPose(foldedTurn ? 'bear-fold' : 'swing', 440);
          if (victim) {
            fetch('/api/hit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: net.id, victim: victim.id, dmg: 999, stun: 0, kb: 3.5, stack: true }),
            }).catch(() => {});
          }
          continue;
        }
        if (!p.evil) {
          if (isToko()) {
              castToko(p, now, ab);
              continue;
            }
          if (isSonic()) {
              castSonic(p, now, ab);
              continue;
            }
          if (isSuper()) {
              castSuper(p, now, ab);
              continue;
            }
          if (isNyan()) {
              castNyan(p, data, isLMS, now, ab);
              continue;
            }
          if (isTails()) {
              castTails(p, isLMS, now, ab);
              continue;
            }
          if (isMario()) {
              castMario(p, now, ab);
              continue;
            }
          const luxCdMult = () => (L.prayer === 'haste' ? 1.5 : L.prayer === 'burden' ? 0.7 : 1) * (isLMS ? LMS_CD : 1);
          if (ab === 'Z' && now >= L.prayCD && !L.prayUntil && !L.rushing && !L.panting) {
            // kneel and pray, exposed
            L.prayUntil = now + 5000;
            p.rooted = true;
            p.actionImg = luxSprites.pray[0]; p.actionT = 0.15;
            sayStatus('praying...', 2);
            fileSfx(LUX_SFX.prayer, { v: 0.32 });
          } else if (ab === 'X' && now >= L.adCD && !L.prayUntil && !L.rushing && !L.panting) {
            // adrenaline sprint, locked line
            L.rushing = true; L.adUntil = now + 6000;
            L.adDir = game.input.left ? -1 : (game.input.right ? 1 : (p.facing || 1));
            p.chargeDir = L.adDir; p.facing = L.adDir;
            p.chargeSpeed = 750 * (PRAY_SPD[L.prayer] || 1); // peelout pace
            p.rooted = false;
            fileSfx(LUX_SFX.run, { v: 0.45 });
          } else if (ab === 'C' && now >= L.overCD && !L.overBusy && !L.prayUntil && !L.rushing && !L.panting && data.phase === 'round') {
            // overheal ally or self
            L.overBusy = true;
            p.actionImg = luxSprites.pray[0]; p.actionT = 0.4;
            const targetId = (data.lms || data.lms_set) ? net.id : null; // self target in lms
            fetch('/api/overheal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: net.id, target: targetId, prayer: L.prayer }),
            }).then((r) => r.json()).then((d) => {
              L.overBusy = false;
              if (d && d.ok) {
                L.overCD = Date.now() + 13500 * luxCdMult();
                if (Number.isFinite(d.self_shield)) p.shield = d.self_shield;
                else if (d.lms_self) p.shield = d.shield || 0;
                const patchedNames = Array.isArray(d.targets) ? d.targets.map((target) => target.name).join(', ') : d.name;
                sayStatus(d.lms_self || d.self_only ? 'Patch gave you +25 shield!!' : `patched ${patchedNames} and gave you +25 shield!!`, 3);
                setPose('patch', 500);
                fileSfx(LUX_SFX.heal, { v: 0.48 });
                // holy shock here
                game.luxGlow(p.pos.x + p.w / 2, p.pos.y + p.h / 2, '#5ff2ff', 3, 90);
                // empower burst there
                const targetIds = Array.isArray(d.targets) ? d.targets.map((target) => target.id) : [d.target];
                for (const targetId of targetIds) {
                  const tgt = game.remotes.find((r) => r.id === targetId);
                  if (tgt) game.luxGlow(tgt.pos.x + tgt.w / 2, tgt.pos.y + tgt.h / 2, '#ffd23f', 6, 130);
                  game.bubbles[targetId] = { text: 'PATCH!!', until: Date.now() + 2000 };
                }
              } else {
                if (Number.isFinite(d && d.cooldown) && d.cooldown > 0) {
                  L.overCD = Math.max(L.overCD, Date.now() + d.cooldown * 1000);
                  sayStatus('patch recharging!!', 2);
                  return;
                }
                // failed casts cost nothing
                sayStatus(d && d.reason ? d.reason : 'patch failed!!', 2);
                fileSfx(SFX + 'denied.wav', {});
              }
            }).catch(() => {
              L.overBusy = false;
              sayStatus('patch lost the server!!', 2);
            });
          }
          continue;
        }
        if (ab === 'C' && p.invis) {
          // end sneak
          p.invis = false;
          K.penaltyUntil = now + 4250;
        } else if (p.invis) {
          continue; // stay quiet
        } else if (ab === 'Z' && m1Muted) {
          fileSfx(SFX + 'denied.wav', {}); // muted swing
        } else if (ab === 'Z' && !m1Muted && now >= K.m1CD) {
          // slow swing
          K.m1CD = now + 1200;
          const victim = game.remotes
            .filter((r) => !r.evil && r.alive && r.hp > 0 &&
              Math.abs(r.pos.x - p.pos.x) < 120 &&
              Math.abs((r.pos.y + r.h / 2) - (p.pos.y + p.h / 2)) < 110)
            .sort((a, b) => Math.abs(a.pos.x - p.pos.x) - Math.abs(b.pos.x - p.pos.x))[0];
          p._m1v = Math.floor(Math.random() * evilM1.length); // everyone sees this same frame
          p.actionImg = evilM1[p._m1v]; p.actionT = 0.25; // swing frame
          setPose('swing', 300);
          if (victim) {
            fetch('/api/hit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: net.id, victim: victim.id, dmg: 30, stun: 0 }),
            }).catch(() => {});
            // bit back
            fileSfx(SFX + (victim.cowering ? 'basic_hit.wav' : 'm1_hit.wav'), {});
            hitBurst(victim.pos.x + victim.w / 2, victim.pos.y + victim.h / 2, false, true);
          }
        } else if (ab === 'X' && now >= K.spikeCD) {
          // stay grounded
          if (!p.onGround) {
            sayStatus('land first!!', 2);
            fileSfx(SFX + 'denied.wav', {});
            continue;
          }
          const sx = Math.round(p.pos.x + p.w / 2), sy = Math.round(p.pos.y + p.h);
          K.spikeCD = now + 10000;
          p.actionImg = isBear5() ? bear5Image : evilAct.spike; p.actionT = 0.5;
          setPose('spike', 500);
          fileSfx(SFX + 'spike_place.wav', {});
          game.luxGlow(sx, sy - 10, '#c9c9d6', 4, 90); // set dust
          fetch('/api/spike', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: net.id, action: 'place', x: sx, y: sy }),
          }).catch(() => {});
        } else if (ab === 'C' && now >= K.sneakCD) {
          // ghost mode
          p.invis = true;
          K.invisUntil = now + 10000; K.sneakCD = now + 20000;
          voiceSfx(vpick(VL_SNEAK));
          sneakLoop.start();
        } else if (ab === 'V' && now >= K.pullCD && !K.pullWindup) {
          // wound up ropes
          const kx = p.pos.x + p.w / 2, ky = p.pos.y + p.h / 2;
          const target = game.remotes.map((r) => {
            if (r.evil || !r.alive || r.hp <= 0) return null;
            const rx = r.pos.x + r.w / 2, ry = r.pos.y + r.h / 2;
            const distance = Math.hypot(kx - rx, ky - ry);
            return distance < PULL_RANGE ? { player: r, distance } : null;
          }).filter(Boolean).sort((a, b) => a.distance - b.distance)[0]?.player;
          K.pullTarget = target?.id || null;
          K.pullCastAt = now;
          K.pullDamage = 0; K.pullPending = 0; K.pullEnding = false; K.pullLastHitAt = 0;
          K.pullSequence++;
          K.pullCD = now + (target ? 22000 : 8000);
          K.pullHit = false;
          if (!target) {
            // drop ropes
            p.stunT = Math.max(p.stunT || 0, 3);
            fileSfx(SFX + 'denied.wav', {});
            sayStatus('nobody around!!', 2);
          } else {
            K.pullWindup = now + 1500;
            p.rooted = true;
            p.actionImg = evilAct.pullwindup; p.actionT = 1.6;
          }
        } else if (ab === 'B' && now >= K.rushCD && !K.charging && !K.windupUntil) {
          K.windupUntil = now + 3000; // rooted windup
          K.rushCD = now + 18000;
          p.rooted = true;
          voiceSfx(vpick(VL_RUSH));
          p.actionImg = evilAct.windup; p.actionT = 3.1;
          fileSfx(SFX + 'dash_charge.wav', {});
        } else if (ab === 'N' && isNyan() && now >= NY.rocketCD && data.phase === 'round' && !data.grace) {
          // killer rocket seeks survivor
          NY.rocketCD = now + ROCKET_CD * (isLMS ? LMS_CD : 1);
          fireRocket();
        }
      }
      Object.assign(t, { now });
    }

    function finishEvilPullCooldown() {
      if (!K.pullEnding || K.pullPending > 0) return;
      if (K.pullDamage < 25) K.pullCD = Math.min(K.pullCD, K.pullCastAt + 12000);
      K.pullEnding = false;
      K.pullTarget = null;
    }

    function stopEvilPull(p) {
      K.pullUntil = 0;
      K.pullWindup = 0;
      K.pullEnding = true;
      p.rooted = false;
      p.vel.x = 0;
      if (p.actionImg === evilAct.pull || p.actionImg === evilAct.pullwindup) {
        p.actionImg = null; p.actionT = 0;
      }
      finishEvilPullCooldown();
    }

    function tickEvilKit(t) {
      let { p, data, now } = t;
      // mute over
      if (p.invis && now >= K.invisUntil) {
        p.invis = false;
        K.penaltyUntil = now + 4250;
      }
      // loud reveal
      if (K.wasInvis && !p.invis) fileSfx(SFX + 'sneak_reveal.mp3', {});
      if (K.wasInvis && !p.invis) sneakLoop.stop();
      K.wasInvis = !!p.invis;
      if (p.evil && (K.pullWindup || K.pullUntil)) {
        const target = game.remotes.find((r) => r.id === K.pullTarget && !r.evil && r.alive && r.hp > 0);
        const dx = target ? target.pos.x + target.w / 2 - (p.pos.x + p.w / 2) : 0;
        const dy = target ? target.pos.y + target.h / 2 - (p.pos.y + p.h / 2) : 0;
        if (!target || Math.hypot(dx, dy) >= PULL_RANGE) stopEvilPull(p);
      }
      if (p.evil && p.alive !== false && now < K.pullUntil) { p.actionImg = evilAct.pull; p.actionT = 0.15; pullLoop.start(); }
      else pullLoop.stop();
      // wound up
      if (p.evil && K.pullWindup && now >= K.pullWindup) {
        K.pullWindup = 0;
        p.rooted = false;
        if (p.alive !== false && (p.stunT || 0) <= 0 && data.phase === 'round') {
          K.pullUntil = now + 5000;
        } else {
          stopEvilPull(p);
        }
      }
      // fizzled pull
      if (p.evil && K.pullUntil && now >= K.pullUntil && p.alive !== false) {
        stopEvilPull(p);
        if (!K.pullHit) {
          p.stunT = Math.max(p.stunT || 0, 3);
          fileSfx(SFX + 'denied.wav', {});
        }
      }
      // rush charge
      if (p.evil && K.windupUntil) {
        // scary pose
        p.actionImg = evilWindup[Math.floor(now / 400) % evilWindup.length];
        p.actionT = 0.5;
      }
      if (p.evil && K.windupUntil && now >= K.windupUntil) {
        K.windupUntil = 0;
        K.charging = true; K.chargeUntil = now + 600;
        p.chargeDir = p.facing || 1;
        p.rooted = false;
        fileSfx(SFX + 'super_dash.wav', {});
      }
      if (p.evil && K.charging) {
        if (now >= K.chargeUntil || p.alive === false) { K.charging = false; p.chargeDir = 0; }
        else {
          // streak behind the charge
          if (now >= (K._ghostAt || 0)) {
            K._ghostAt = now + 45;
            const cgi = game._spriteFor(p);
            const cfs = game.frameSize(p, cgi);
            game.afterimages.push({
              x: p.pos.x, y: p.pos.y, w: p.w, h: p.h,
              drawW: cfs.dw, drawH: cfs.dh, facing: p.facing,
              img: cgi, age: 0, plain: true,
            });
          }
          // wide slam
          for (const r of game.remotes) {
            if (r.evil || !r.alive || r.hp <= 0) continue;
            if (Math.abs(r.pos.x - p.pos.x) < 55 &&
                Math.abs((r.pos.y + r.h / 2) - (p.pos.y + p.h / 2)) < 70) {
              fetch('/api/hit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: net.id, victim: r.id, dmg: 50, stun: 0 }),
              }).catch(() => {});
              fileSfx(SFX + 'm1_hit.wav', { rate: 0.7 }); // slam sound
              hitBurst(r.pos.x + r.w / 2, r.pos.y + r.h / 2, true, true); // slam chunks
              p.stunT = 3;
              K.charging = false; p.chargeDir = 0;
              break;
            }
          }
        }
      }
      K.m1ok = !(now < K.penaltyUntil) && !K.charging && data.phase === 'round';
      // red rush
      p.redFlash = !!(p.evil && K.windupUntil);
      // stop loops
      if (p.alive === false || data.phase !== 'round') { cowerLoop.stop(); pullLoop.stop(); }
      // ghost meter
      p.sneakFrac = p.invis ? Math.max(0, (K.invisUntil - now) / 10000) : 0;
      // evil waits
      if (p.evil) {
        if (data.grace) p.rooted = true;
        else if (now < K.pullUntil) { p.rooted = true; p.vel.x = 0; }
        else if (!K.windupUntil && !K.charging && !K.pullWindup) p.rooted = false;
      }
      // rope ticks
      if (p.evil && p.alive !== false && data.phase === 'round' && now < K.pullUntil) {
        const kx = p.pos.x + p.w / 2, ky = p.pos.y + p.h / 2;
        const r = game.remotes.find((b) => b.id === K.pullTarget && !b.evil && b.alive && b.hp > 0);
        if (r) {
          const rx = r.pos.x + r.w / 2, ry = r.pos.y + r.h / 2;
          const pullD = Math.hypot(kx - rx, ky - ry);
          if (pullD >= PULL_RANGE) stopEvilPull(p);
          else {
            // through walls now
            if (!K.pullHit) {
              fileSfx(SFX + 'basic_hit.wav', {}); voiceSfx(vpick(VL_PULL));
              hitBurst(rx, ry, false, true); // rope catch
            } // caught one
            K.pullHit = true;
            // closer burns more
            if (now - K.pullLastHitAt >= 1100) {
              K.pullLastHitAt = now;
              const tickDmg = Math.round(1 + 5 * (1 - pullD / PULL_RANGE));
              const seq = K.pullSequence;
              K.pullPending++;
              fetch('/api/hit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: net.id, victim: r.id, dmg: tickDmg, stun: 0 }),
              }).then((response) => response.json()).then((result) => {
                if (K.pullSequence === seq && result.ok) K.pullDamage += Math.max(0, Number(result.landed) || 0);
              }).catch(() => {}).finally(() => {
                if (K.pullSequence !== seq) return;
                K.pullPending = Math.max(0, K.pullPending - 1);
                finishEvilPullCooldown();
              });
            }
          }
        }
      }
      // fast ghost
      if (p.evil) game.moveSpeed = isBear5() ? 820 : p.invis ? EVIL_SNEAK_SPEED : EVIL_SPEED;
    }

    function tickLux(t) {
      let { p, data, isLMS, now } = t;
      // lux lightshard kit
      if (!p.evil && isLux()) {
        const luxCdMult = () => (L.prayer === 'haste' ? 1.5 : L.prayer === 'burden' ? 0.7 : 1) * (isLMS ? LMS_CD : 1);
        const pcx = p.pos.x + p.w / 2, pcy = p.pos.y + p.h / 2; // lux center
        // dim look, shard drains
        const dim = !!L.hot;
        if (dim && p._wore !== 'luxdim') { game.setPlayerSprites(luxDimSprites); p._wore = 'luxdim'; }
        else if (!dim && p._wore && p._wore !== 'lux') { wearChar('lux'); p._wore = 'lux'; }
        // slow body, prayer legs
        // half speed while converting
        let needy = false;
        {
          const px = p.pos.x, py = p.pos.y;
          for (const r of game.remotes) {
            if (r.evil || !r.alive || (r.hp ?? 0) <= 0) continue;
            if ((r.hp ?? 0) >= (r.maxHp || 100)) continue;
            const dx = r.pos.x - px, dy = r.pos.y - py;
            if (dx * dx + dy * dy < 260 * 260) { needy = true; break; }
          }
        }
        game.moveSpeed = 240 * (needy ? 0.5 : 1) * (PRAY_SPD[L.prayer] || 1);
        // prayer lands
        if (L.prayUntil && now >= L.prayUntil) {
          L.prayUntil = 0;
          const opts = PRAYERS.filter((x) => x !== L.prayer);
          L.prayer = opts[Math.floor(Math.random() * opts.length)];
          L.prayCD = now + 9000 * luxCdMult();
          p.rooted = false;
          p.actionImg = luxSprites.prayend; p.actionT = 0.6;
          sayStatus('prayer of ' + L.prayer + '!!', 3);
          game.luxRing(pcx, pcy, '#ffe93b', 560); // prayer answered
          game.luxGlow(pcx, pcy, '#ffe93b', 5, 120);
        }
        if (L.prayUntil) {
          p.actionImg = luxSprites.pray[0]; p.actionT = 0.15;
          p.rooted = true;
          if (now >= (L._prayFxAt || 0)) {
            L._prayFxAt = now + 130;
            game.luxGlow(pcx, pcy, '#ffe93b', 2, 90); // rising prayers
          }
        }
        // light float, prayer or overheal
        p.luxFloat = L.prayUntil ? 70 : ((p.hp ?? 0) > (p.maxHp ?? 100) ? 40 : 0);
        // adrenaline sprint
        if (L.rushing) {
          if (now >= L.adUntil || p.alive === false) {
            L.rushing = false; L.panting = true; L.pantUntil = now + 3000;
            p.chargeDir = 0; p.chargeSpeed = 0; p.rooted = true;
            game.luxGlow(pcx, pcy, '#ffffff', 4, 130); // skid stop
            if (p.alive !== false) fileSfx(LUX_SFX.panting, { v: 0.16 });
          } else {
            if (game.input.left) { p.facing = -1; p.chargeDir = -1; }
            else if (game.input.right) { p.facing = 1; p.chargeDir = 1; }
            p.actionImg = luxSprites.adrun[Math.floor(now / 80) % 2]; p.actionT = 0.15;
            if (now >= (L._rushFxAt || 0)) {
              L._rushFxAt = now + 110;
              game.luxGlow(pcx, pcy, '#aef1ff', 2, 140); // speed sparks
            }
            const gi = game._spriteFor(p);
            const fs = game.frameSize(p, gi);
            game.afterimages.push({
              x: p.pos.x, y: p.pos.y, w: p.w, h: p.h,
              drawW: fs.dw, drawH: fs.dh, facing: p.facing,
              img: gi, age: 0, plain: true,
            });
          }
        }
        // panting halt
        if (L.panting) {
          p.actionImg = luxSprites.pant[Math.floor(now / 200) % 2]; p.actionT = 0.15;
          p.rooted = true;
          if (now >= L.pantUntil || p.alive === false) {
            L.panting = false; p.rooted = false; p.actionImg = null;
            L.adCD = now + 18000 * luxCdMult();
          }
        }
        // engine flags, all screens
        p.praying = !!L.prayUntil;
        p.rushing = !!L.rushing;
        p.panting = !!L.panting;
        // conversion shimmer, shard working
        if (dim && p.alive !== false && now >= (L._hotFxAt || 0)) {
          L._hotFxAt = now + 260;
          game.luxGlow(pcx, pcy, '#5ff2ff', 1, 110);
        }
        // overhealed lux pants too
        if (!L.prayUntil && !L.rushing && !L.panting && (p.hp ?? 0) > (p.maxHp ?? 100)) {
          p.actionImg = luxSprites.pant[Math.floor(now / 200) % 2]; p.actionT = 0.15;
        }
        p.cyanFlash = false;
        if (!L.prayUntil && !L.rushing && !L.panting) p.rooted = (p.hp ?? 0) > (p.maxHp ?? 100); // fat stays put
        // taken mults
        let dt = 1;
        if (L.prayUntil) dt *= 1.25;
        if (L.panting) dt *= 1.2;
        if (L.prayer === 'shelter') dt *= 0.7;
        if (L.prayer === 'frailty') dt *= 1.3;
        L.dt = dt;
        L.heal = L.prayer === 'grace' ? 2 : 1;
      }
    }

    function tickSonicPeel(t) {
      let { p, now } = t;
      // sonic taxi
      if (!p.evil && isSonic()) {
        if (SN.windupUntil && now < SN.windupUntil) {
          // revving for charge pose
          p.windupUntil = true;
          p.actionImg = null;
          p.actionT = 0;
        } else {
          p.windupUntil = false;
        }
        if (SN.windupUntil && now >= SN.windupUntil) {
          SN.windupUntil = 0;
          SN.peeling = true; SN.peelUntil = now + 6000;
          p.chargeDir = game.input.left ? -1 : (game.input.right ? 1 : (p.facing || 1));
          p.facing = p.chargeDir;
          p.chargeSpeed = 750;
          p.rooted = false;
          fileSfx(SFX + 'dash_release.wav', {});
        }
        if (SN.peeling) {
          if (now >= SN.peelUntil || p.alive === false) {
            SN.peeling = false; p.peeling = false; // engine flag
            p.chargeDir = 0; p.chargeSpeed = 0;
            p.actionImg = null;
            SN.peelCD = now + 18000;
          } else {
            // steer the zoom
            if (game.input.left) { p.facing = -1; p.chargeDir = -1; }
            else if (game.input.right) { p.facing = 1; p.chargeDir = 1; }
            // engine handles peel animation
            p.peeling = true; // engine flag
            const pgi = game._spriteFor(p);
            const pfs = game.frameSize(p, pgi);
            game.afterimages.push({
              x: p.pos.x, y: p.pos.y, w: p.w, h: p.h,
              drawW: pfs.dw, drawH: pfs.dh, facing: p.facing,
              img: pgi, age: 0, plain: true,
            });
          }
        }
        p.rooted = !!SN.windupUntil || !!SN.spinWindup;
      }
    }

    function tickSonicSpin(t) {
      let { p, now } = t;
      // sonic spin
      if (!p.evil && isSonic()) {
        if (SN.spinWindup && now < SN.spinWindup) {
          p.spinWindup = true; // engine spin charge flag
          p.actionImg = null;
          p.actionT = 0;
        } else {
          p.spinWindup = false;
        }
        if (SN.spinWindup && now >= SN.spinWindup) {
          SN.spinWindup = 0;
          SN.spinning = true; SN.spinUntil = now + 4000; SN.spinStart = now; SN.spinHits = 0; SN.spinTouching = false;
          p.chargeDir = game.input.left ? -1 : (game.input.right ? 1 : (p.facing || 1));
          p.facing = p.chargeDir;
          SN.dir = p.chargeDir;
          SN.lastX = p.pos.x;
          p.chargeSpeed = 600;
          p.rooted = false;
          fileSfx(SFX + 'dash_release.wav', {});
        }
        // clear spin if stopped
        if (!SN.spinning) p.spinning = false;
        if (SN.spinning) {
          const spinOver = now >= SN.spinUntil || p.alive === false || now - (SN.spinStart || now) > 6000;
          if (spinOver) {
            SN.spinning = false; p.spinning = false; // engine flag
            p.chargeDir = 0; p.chargeSpeed = 0;
            p.actionImg = null;
            SN.spinCD = now + (SN.spinHits > 0 ? 16200 : 22500);
          } else {
            // slow steer
            const want = game.input.left ? -1 : (game.input.right ? 1 : (SN.dir || p.chargeDir));
            SN.dir = SN.dir ?? p.chargeDir;
            SN.dir += Math.max(-0.15, Math.min(0.15, want - SN.dir));
            if (Math.abs(SN.dir) > 0.2) {
              p.chargeDir = Math.sign(SN.dir);
              p.facing = Math.sign(SN.dir);
            }
            p.chargeSpeed = 600 * (0.4 + 0.6 * Math.min(1, Math.abs(SN.dir)));
            // locked line
            const spinAge = 4000 - (SN.spinUntil - now);
            if (spinAge > 300 && Math.abs(p.pos.x - (SN.lastX ?? p.pos.x)) < 2 && p.alive !== false) {
              // bonked a wall
              p.chargeDir = -(p.chargeDir || p.facing || 1);
              p.facing = p.chargeDir;
              SN.dir = p.chargeDir;
              fileSfx(SFX + 'basic_hit.wav', { v: 0.25 });
            }
            SN.lastX = p.pos.x;
            p.spinning = true; // engine flag
            const sgi = game._spriteFor(p);
            const sfs = game.frameSize(p, sgi);
            game.afterimages.push({
              x: p.pos.x, y: p.pos.y, w: p.w, h: p.h,
              drawW: sfs.dw, drawH: sfs.dh, facing: p.facing,
              img: sgi, age: 0, plain: true,
            });
            const ek = game.remotes.find((r) => r.id === net.ekid && r.alive && r.hp > 0);
            const touching = !!(ek &&
                Math.abs(ek.pos.x - p.pos.x) < 55 &&
                Math.abs((ek.pos.y + ek.h / 2) - (p.pos.y + p.h / 2)) < 70);
            if (touching && !SN.spinTouching && SN.spinHits < 3 && now >= (SN.spinHitCD || 0)) {
              SN.spinTouching = true;
              SN.spinHits++;
              SN.spinHitCD = now + 1000;
              fileSfx(SFX + 'basic_hit.wav', {});
              // both fly
              const away = (p.pos.x + p.w / 2) >= (ek.pos.x + ek.w / 2) ? 1 : -1;
              p.chargeDir = away; p.facing = away; SN.dir = away;
              p.vel.y = Math.min(p.vel.y || 0, -300);
              fetch('/api/hit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: net.id, victim: ek.id, dmg: 2, stun: 3, stack: true, kb: 2.5 }),
              }).catch(() => {});
              if (SN.spinHits >= 3) {
                SN.spinning = false; p.chargeDir = 0; p.chargeSpeed = 0;
                p.actionImg = null;
                SN.spinCD = now + 16200;
              }
            } else if (!touching) {
              SN.spinTouching = false;
            }
          }
        }
      }
    }

    function tickSuperSonic(t) {
      let { p, isLMS, now } = t;
      // super sonic ticks
      if (!p.evil && isSuper()) {
        // right look
        if (SS.transformed && p._wore !== 'super') { wearChar('supersonic'); p._wore = 'super'; }
        else if (!SS.transformed && !SS.formUntil && p._wore !== 'sonic') { wearChar('sonic'); p._wore = 'sonic'; }
        game.moveSpeed = SS.transformed ? SUPER_SPEED : 270;
        p.rainbow = SS.transformed === true;
        p.pulseWhite = SS.transformed === true;
        // glowing up
        if (SS.formUntil) {
          p.rooted = true;
          p.tremble = true; p.whiteFlash = true;
          if (now >= SS.formUntil) {
            SS.formUntil = 0; p.tremble = false; p.whiteFlash = false;
            if (p.alive === false) { p.rooted = false; p.actionImg = null; }
            else {
            SS.transformed = true;
            p.rooted = false; p.actionImg = null;
            p.maxHp = SUPER_HP; p.hp = SUPER_HP;
            wearChar('supersonic'); p._wore = 'super';
            fileSfx(SFX + 'dash_release.wav', {});
            sayStatus('super sonic!!', 3);
            fetch('/api/heal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: net.id, amount: 999, max: SUPER_HP }),
            }).catch(() => {});
            }
          } else {
            const seq = superSprites.transform;
            p.actionImg = seq[Math.min(seq.length - 1, Math.floor((now - (SS.formUntil - 1600)) / 200))];
            p.actionT = 0.15;
          }
        }
        // boost skid
        if (SS.boostWindup && now < SS.boostWindup) {
          p.actionImg = superSprites.skid[Math.floor(now / 90) % 2]; p.actionT = 0.15;
        }
        if (SS.boostWindup && now >= SS.boostWindup) {
          SS.boostWindup = 0;
          SS.boosting = true; SS.boostUntil = now + 4000; SS.boostTouching = false;
          p.chargeDir = game.input.left ? -1 : (game.input.right ? 1 : (p.facing || 1));
          p.facing = p.chargeDir;
          p.chargeSpeed = 950;
          p.rooted = false;
          setPose('boost', 4000);
          fileSfx(SFX + 'dash_release.wav', {});
        }
        if (SS.boosting) {
          if (now >= SS.boostUntil || p.alive === false) {
            SS.boosting = false;
            p.chargeDir = 0; p.chargeSpeed = 0;
            p.actionImg = null;
            SS.boostCD = now + 18000 * (isLMS ? LMS_CD : 1);
          } else {
            if (game.input.left) { p.facing = -1; p.chargeDir = -1; }
            else if (game.input.right) { p.facing = 1; p.chargeDir = 1; }
            p.actionImg = superSprites.boost[Math.floor(now / 80) % 2]; p.actionT = 0.15;
            const bgi = game._spriteFor(p);
            const bfs = game.frameSize(p, bgi);
            game.afterimages.push({
              x: p.pos.x, y: p.pos.y, w: p.w, h: p.h,
              drawW: bfs.dw, drawH: bfs.dh, facing: p.facing,
              img: bgi, age: 0, plain: true,
            });
            const ek = game.remotes.find((r) => r.id === net.ekid && r.alive && r.hp > 0);
            const touching = !!(ek &&
                Math.abs(ek.pos.x - p.pos.x) < 55 &&
                Math.abs((ek.pos.y + ek.h / 2) - (p.pos.y + p.h / 2)) < 70);
            if (touching && !SS.boostTouching && now >= (SS.boostHitCD || 0)) {
              SS.boostTouching = true;
              SS.boostHitCD = now + 1000;
              fileSfx(SFX + 'basic_hit.wav', {});
              fetch('/api/hit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: net.id, victim: ek.id, dmg: 30, stun: 3, stack: true, kb: 2.5 }),
              }).catch(() => {});
            } else if (!touching) {
              SS.boostTouching = false;
            }
          }
        }
        // guard up
        const blocking = SS.wasBlocking && (p.cowerT || 0) > 0;
        if (blocking) {
          const age = 2.5 - (p.cowerT || 0);
          p.actionImg = age < 0.4 ? superSprites.duck[Math.floor(now / 130) % 3] : superSprites.guard;
          p.actionT = 0.15;
          p.rooted = true;
        }
        if (SS.wasBlocking && (p.cowerT || 0) <= 0) {
          SS.wasBlocking = false;
          SS.blockCD = now + 13500 * (isLMS ? LMS_CD : 1);
        }
        // super spin
        if (SS.spinWindup && now < SS.spinWindup) {
          p.spinWindup = true;
          p.actionImg = null; p.actionT = 0;
        } else {
          p.spinWindup = false;
        }
        if (SS.spinWindup && now >= SS.spinWindup) {
          SS.spinWindup = 0;
          SS.spinning = true; SS.spinUntil = now + 5000; SS.spinStart = now; SS.spinHits = 0; SS.spinTouching = false;
          p.superFly = true; // ball can fly now
          p.chargeDir = game.input.left ? -1 : (game.input.right ? 1 : (p.facing || 1));
          p.facing = p.chargeDir;
          SS.dir = p.chargeDir;
          SS.lastX = p.pos.x;
          p.chargeSpeed = 700;
          p.rooted = false;
          fileSfx(SFX + 'dash_release.wav', {});
        }
        if (!SS.spinning) { p.spinning = false; p.superFly = false; }
        if (SS.spinning) {
          const spinOver = now >= SS.spinUntil || p.alive === false || now - (SS.spinStart || now) > 7000;
          if (spinOver) {
            SS.spinning = false; p.spinning = false; p.superFly = false;
            p.chargeDir = 0; p.chargeSpeed = 0;
            p.actionImg = null;
            SS.spinCD = now + (SS.spinHits > 0 ? 16200 : 22500) * (isLMS ? LMS_CD : 1);
          } else {
            const want = game.input.left ? -1 : (game.input.right ? 1 : (SS.dir || p.chargeDir));
            SS.dir = SS.dir ?? p.chargeDir;
            SS.dir += Math.max(-0.15, Math.min(0.15, want - SS.dir));
            if (Math.abs(SS.dir) > 0.2) {
              p.chargeDir = Math.sign(SS.dir);
              p.facing = Math.sign(SS.dir);
            }
            p.chargeSpeed = 700 * (0.4 + 0.6 * Math.min(1, Math.abs(SS.dir)));
            const spinAge = 5000 - (SS.spinUntil - now);
            if (spinAge > 300 && Math.abs(p.pos.x - (SS.lastX ?? p.pos.x)) < 2 && p.alive !== false) {
              p.chargeDir = -(p.chargeDir || p.facing || 1);
              p.facing = p.chargeDir;
              SS.dir = p.chargeDir;
              fileSfx(SFX + 'basic_hit.wav', { v: 0.25 });
            }
            SS.lastX = p.pos.x;
            p.spinning = true;
            const sgi = game._spriteFor(p);
            const sfs = game.frameSize(p, sgi);
            game.afterimages.push({
              x: p.pos.x, y: p.pos.y, w: p.w, h: p.h,
              drawW: sfs.dw, drawH: sfs.dh, facing: p.facing,
              img: sgi, age: 0, plain: true,
            });
            const ek = game.remotes.find((r) => r.id === net.ekid && r.alive && r.hp > 0);
            const touching = !!(ek &&
                Math.abs(ek.pos.x - p.pos.x) < 55 &&
                Math.abs((ek.pos.y + ek.h / 2) - (p.pos.y + p.h / 2)) < 70);
            if (touching && !SS.spinTouching && SS.spinHits < 5 && now >= (SS.spinHitCD || 0)) {
              SS.spinTouching = true;
              SS.spinHits++;
              SS.spinHitCD = now + 1000;
              fileSfx(SFX + 'basic_hit.wav', {});
              const away = (p.pos.x + p.w / 2) >= (ek.pos.x + ek.w / 2) ? 1 : -1;
              p.chargeDir = away; p.facing = away; SS.dir = away;
              p.vel.y = Math.min(p.vel.y || 0, -300);
              fetch('/api/hit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: net.id, victim: ek.id, dmg: 25, stun: 3, stack: true, kb: 2.5 }),
              }).catch(() => {});
              if (SS.spinHits >= 5) {
                SS.spinning = false; p.spinning = false; p.superFly = false;
                p.chargeDir = 0; p.chargeSpeed = 0;
                p.actionImg = null;
                SS.spinCD = now + 16200 * (isLMS ? LMS_CD : 1);
              }
            } else if (!touching) {
              SS.spinTouching = false;
            }
          }
        }
        // dazed flicker
        if ((p.stunT || 0) > 0 && p.alive !== false && !SS.boosting && !SS.spinning) {
          p.actionImg = (Math.floor(now / 150) % 2) ? superSprites.stun2 : superSprites.stun;
          p.actionT = 0.15;
        }
        if (!SS.formUntil) p.rooted = !!SS.boostWindup || !!SS.spinWindup || blocking;
      }
    }

    function tickToko(t) {
      let { p, isLMS, now } = t;
      // toko ticks
      if (!p.evil && isToko()) {
        const ek = game.remotes.find((r) => r.id === net.ekid && r.alive && r.hp > 0);
        const ekClose = (dx, dy) => ek &&
          Math.abs(ek.pos.x - p.pos.x) < dx &&
          Math.abs((ek.pos.y + ek.h / 2) - (p.pos.y + p.h / 2)) < dy;
        // bounce kick
        if (T.kickUntil) {
          p.kickUntil = true; // engine flag
          // ground ends
          const landed = p.onGround && now > (T.kickStart || 0) + 100;
          if (now >= T.kickUntil || landed) {
            T.kickUntil = 0;
            p.kickUntil = false; // engine flag
            p.chargeDir = 0; p.chargeSpeed = 0;
            T.kickCD = now + (T.kickHit ? 12750 : 18700) * (isLMS ? LMS_CD : 1); // kick waits
            if (!T.kickHit) fileSfx(SFX + 'denied.wav', {}); // missed kick
          } else if (!T.kickHit && ekClose(60, 80)) {
            T.kickHit = true;
            T.kickUntil = 0; // start bounce
            p.kickUntil = false; // engine flag
            p.chargeDir = 0; p.chargeSpeed = 0;
            T.kickCD = now + 12750 * (isLMS ? LMS_CD : 1);
            setPose('kick', 400);
            fileSfx(SFX + 'roundhouse_hit.wav', {});
            hitBurst(ek.pos.x + ek.w / 2, ek.pos.y + ek.h / 2, false, false);
            const away = (p.pos.x + p.w / 2) >= (ek.pos.x + ek.w / 2) ? 1 : -1;
            p.vel.x = away * 1350; // huge bounce
            p.vel.y = -950;
            fetch('/api/hit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: net.id, victim: ek.id, dmg: isLMS ? 30 : 20, stun: 4 }),
            }).catch(() => {});
          }
        } else {
          p.kickUntil = false; // engine flag
        }
        // fast jab
        if (T.jabUntil) {
          p.jabUntil = true; // engine flag
          p.rooted = true;
          if (!T.jabHit && ekClose(55, 70)) {
            T.jabHit = true;
            fileSfx(SFX + 'jab_hit.wav', {});
            fetch('/api/hit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: net.id, victim: ek.id, dmg: 0, stun: 2 }),
            }).catch(() => {});
          }
          if (now >= T.jabUntil) {
            T.jabUntil = 0;
            p.jabUntil = false; // engine flag
            p.rooted = false;
            if (T.jabHit) {
              T.jabCD = now + 10200 * (isLMS ? LMS_CD : 1); // fast recharge
            } else {
              T.jabCD = now + 16150 * (isLMS ? LMS_CD : 1); // slow whiff
              p.stunT = Math.max(p.stunT || 0, 2);
              fileSfx(SFX + 'denied.wav', {}); // missed jab
            }
          }
        } else {
          p.jabUntil = false; // engine flag
        }
      }
    }

    function tickMario(t) {
      let { p, isLMS, now } = t;
      // Mario's fireball and spin
      if (!p.evil && isMario()) {
        const ek = game.remotes.find((r) => r.id === net.ekid && r.alive && r.hp > 0);
        const ekClose = (dx, dy) => ek &&
          Math.abs(ek.pos.x - p.pos.x) < dx &&
          Math.abs((ek.pos.y + ek.h / 2) - (p.pos.y + p.h / 2)) < dy;
        if (MU.fireballUntil && now < MU.fireballUntil && p.alive !== false && (p.stunT || 0) <= 0) {
          const age = now - (MU.fireballUntil - 650);
          p.actionImg = marioSprites.fireballThrow[Math.min(marioSprites.fireballThrow.length - 1, Math.floor(age / 80))];
          p.actionT = 0.15;
        } else if (MU.fireballUntil) {
          MU.fireballUntil = 0;
          p.rooted = false;
          if (p.actionImg && marioSprites.fireballThrow.includes(p.actionImg)) { p.actionImg = null; p.actionT = 0; }
        }
        if (MU.fireballPending && !MU.fireballProjectile && MU.fireballLaunchAt && now >= MU.fireballLaunchAt && p.alive !== false && (p.stunT || 0) <= 0) {
          const dir = MU.fireballDir || p.facing || 1;
          const x = p.pos.x + p.w / 2 + dir * (p.w / 2 + 9);
          const y = p.pos.y + p.h - 9;
          MU.fireballProjectile = {
            id: `${net.id}-${now}`, x, y, vx: dir * 480, vy: -260,
            age: 0, lastStepAt: now, stepRemainder: 0, start: now,
            owner: net.id, mine: true,
          };
          (game.marioFireballs ||= []).push(MU.fireballProjectile);
          MU.fireballLaunchAt = 0;
        } else if (MU.fireballLaunchAt && now >= MU.fireballLaunchAt && (p.alive === false || (p.stunT || 0) > 0)) {
          MU.fireballLaunchAt = 0;
          MU.fireballUntil = 0;
          MU.fireballCD = now + 20000 * (isLMS ? LMS_CD : 1);
          MU.fireballPending = false;
          p.rooted = false;
        }
        const shot = MU.fireballProjectile;
        if (shot) {
          const elapsed = Math.max(0, Math.min(1.5, (now - shot.lastStepAt) / 1000));
          shot.lastStepAt = now;
          const result = game.stepMarioFireball(shot, elapsed, ek);
          if (result.hit || result.expired || p.alive === false) {
            MU.fireballProjectile = null;
            game.marioFireballs = game.marioFireballs.filter((f) => f !== shot);
            const finish = (landed) => {
              MU.fireballCD = Date.now() + (landed ? 12000 : 20000) * (isLMS ? LMS_CD : 1);
              MU.fireballPending = false;
              MU.fireballLaunchAt = 0;
            };
            if (result.hit) {
              hitBurst(ek.pos.x + ek.w / 2, ek.pos.y + ek.h / 2, false, false);
              fetch('/api/hit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: net.id, victim: ek.id, dmg: 0, stun: 3, fireball: true }),
              }).then((response) => response.json()).then((result) => finish(!!result.ok)).catch(() => finish(false));
            } else finish(false);
          } else {
            shot.syncedAt = now;
          }
        }
        // fresh air, fresh spin
        if (p.onGround) MU.spinUsed = false;
        // spinning jump
        if (MU.spinUntil) {
          p.actionImg = marioSprites.spin[Math.floor((now - (MU.spinUntil - 1000)) / 120) % 4]; p.actionT = 0.15;
          if (!MU.spinHit && ekClose(60, 80)) {
            MU.spinHit = true;
            MU.spinUntil = 0;
            MU.spinCD = now + 12000 * (isLMS ? LMS_CD : 1);
            p.actionImg = null; p.actionT = 0;
            fileSfx(SFX + 'basic_hit.wav', {});
            hitBurst(ek.pos.x + ek.w / 2, ek.pos.y + ek.h / 2, false, false);
            fetch('/api/hit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: net.id, victim: ek.id, dmg: 0, stun: 2 }),
            }).catch(() => {});
          } else if (now >= MU.spinUntil || p.onGround || p.alive === false || (p.stunT || 0) > 0) {
            MU.spinUntil = 0;
            MU.spinCD = now + (MU.spinHit ? 12000 : 20000) * (isLMS ? LMS_CD : 1);
            p.actionImg = null; p.actionT = 0;
          }
        }
      }
    }

    function tickNyan(t) {
      let { p, isLMS, now } = t;
      // nyan dash
      if (!p.evil && isNyan()) {
        p.dashing = NY.dashing; // engine flag, longer rainbow
        if (NY.dashing) {
          const gi = game._spriteFor(p);
          const fs = game.frameSize(p, gi);
          game.afterimages.push({
            x: p.pos.x, y: p.pos.y, w: p.w, h: p.h,
            drawW: fs.dw, drawH: fs.dh, facing: p.facing,
            img: gi, age: 0, plain: true,
          });
          const ek = game.remotes.find((r) => r.id === net.ekid && r.alive && r.hp > 0);
          if (!NY.dashHit && ek &&
              Math.abs(ek.pos.x - p.pos.x) < 60 &&
              Math.abs((ek.pos.y + ek.h / 2) - (p.pos.y + p.h / 2)) < 70) {
            NY.dashHit = true;
            fileSfx(SFX + 'basic_hit.wav', {});
            hitBurst(ek.pos.x + ek.w / 2, ek.pos.y + ek.h / 2, false, false); // rainbow slam
            fetch('/api/hit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: net.id, victim: ek.id, dmg: isLMS ? 20 : 15, stun: 3 }),
            }).catch(() => {});
          }
          if (now >= NY.dashUntil || p.alive === false || (p.stunT || 0) > 0) {
            NY.dashing = false; p.dashing = false;
            p.chargeDir = 0; p.chargeSpeed = 0;
            NY.dashCD = now + NYAN_DASH_CD * (isLMS ? LMS_CD : 1);
          }
        }
      }
    }

    function tickTails(t) {
      let { p, data, isLMS, now } = t;
      // tails ticks
      if (!p.evil && isTails()) {
        // stunned drops the flight
        if (TW.flying && ((p.stunT || 0) > 0 || p.alive === false || data.phase !== 'round')) {
          TW.flying = false;
          TW.flyCD = now + FLY_CD * (1 - TW.flyLeft / FLY_MAX) * (isLMS ? LMS_CD : 1);
        }
        // bomb in hand
        game.moveSpeed = TW.holding ? 140 : 240; // heavy carry
        p.holdingBomb = TW.holding === true;
        // carry art
        if (TW.holding && p._wore !== 'carry') { game.setPlayerSprites(tailsCarrySprites); p._wore = 'carry'; }
        else if (!TW.holding && p._wore === 'carry') { wearChar('tails'); p._wore = 'tails'; }
        if (TW.throwUntil) {
          // winding the toss
          p.throwUntil = true; // engine flag
          if (now >= TW.throwUntil) {
            TW.throwUntil = 0;
            p.throwUntil = false; // engine flag
          }
        } else {
          p.throwUntil = false; // engine flag
        }
        // fly meter
        if (TW.flying) {
          TW.flyLeft -= FLY_DRAIN; // burns fast
          flyLoop.start();
          p.taxiFly = true;
          p.lift = true; // engine flag
          p.sneakFrac = Math.max(0, TW.flyLeft / FLY_MAX);
          p.sneakColor = FLY_COLOR;
          // engine handles fly animation
          if (TW.flyLeft <= 0) {
            TW.flying = false;
            TW.flyCD = now + FLY_CD * (isLMS ? LMS_CD : 1);
          }
        } else {
          p.taxiFly = false;
          flyLoop.stop();
          p.lift = false; // engine flag
          p.sneakColor = FLY_COLOR;
          p.sneakFrac = 0; // bar only mid flight
        }
        // tailwhip
        if (TW.whipUntil) {
          p.whipUntil = true; // engine flag
          p.rooted = true;
          const ek = game.remotes.find((r) => r.id === net.ekid && r.alive && r.hp > 0);
          if (!TW.whipHit && ek &&
              Math.abs((ek.pos.x + ek.w / 2) - (p.pos.x + p.w / 2)) < 90 &&
              Math.abs((ek.pos.y + ek.h / 2) - (p.pos.y + p.h / 2)) < 80) {
            TW.whipHit = true;
            TW.whipCD = now + WHIP_CD * (isLMS ? LMS_CD : 1);
            const away = (p.pos.x + p.w / 2) >= (ek.pos.x + ek.w / 2) ? 1 : -1;
            p.vel.x = away * 500;
            hitBurst(ek.pos.x + ek.w / 2, ek.pos.y + ek.h / 2, false, false); // whip crack
            fetch('/api/hit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: net.id, victim: ek.id, dmg: 0, stun: 2.5 }),
            }).catch(() => {});
          }
          if (now >= TW.whipUntil) {
            TW.whipUntil = 0;
            p.whipUntil = false; // engine flag
            p.rooted = false;
            if (!TW.whipHit) {
              TW.whipCD = now + 22500 * (isLMS ? LMS_CD : 1); // slow whiff
              p.stunT = Math.max(p.stunT || 0, 1);
              fileSfx(SFX + 'denied.wav', {}); // missed whip
            }
          }
        } else {
          p.whipUntil = false; // engine flag
        }
      }
    }

    function tickRopesAndRides(t) {
      let { p, data, now } = t;
      // shared ropes
      game.pullSrc = null;
      game.pullLinks = [];
      if (data.phase === 'round') {
        const pullers = [];
        if (p.evil && p.alive !== false && now < K.pullUntil) pullers.push(p);
        for (const r of game.remotes) if (r.evil && r.pull && r.alive && r.hp > 0) pullers.push(r);
        const victims = [];
        if (!p.evil && p.alive !== false) victims.push(p);
        for (const r of game.remotes) if (!r.evil && r.alive && r.hp > 0) victims.push(r);
        for (const pl of pullers) {
          const kx = pl.pos.x + pl.w / 2, ky = pl.pos.y + pl.h / 2;
          for (const vc of victims) {
            if (vc === pl) continue;
            const targetId = pl === p ? K.pullTarget : pl.pullTarget;
            if (!targetId || vc.id !== targetId) continue;
            const mx = vc.pos.x + vc.w / 2, my = vc.pos.y + vc.h / 2;
            if (Math.hypot(kx - mx, ky - my) < PULL_RANGE) {
              game.pullLinks.push({ x1: mx, y1: my, x2: kx, y2: ky });
              if (vc === p) game.pullSrc = { x: kx, y: ky };
            }
          }
        }
      }
      // sonic taxi
      game.peelSrc = null;
      game.liftSrc = null;
      if (!p.evil && p.alive !== false && data.phase === 'round') {
        const jumpEdge = game.input.jump && !p._jumpPrev;
        if (p._rideId) {
          // latched on
          const ride = game.remotes.find((r) => r.id === p._rideId && (r.peeling || r.lift) && r.alive && r.hp > 0);
          const far = !ride || Math.hypot((ride.pos.x + ride.w / 2) - (p.pos.x + p.w / 2), (ride.pos.y) - (p.pos.y)) > 400;
          if (!ride || far || jumpEdge) {
            if (jumpEdge && ride) p._dropRideUntil = now + 1000;
            p._rideId = null;
          } else if (ride.lift) {
            game.liftSrc = { x: ride.pos.x + ride.w / 2, y: ride.pos.y - 10 };
          } else {
            game.peelSrc = { x: ride.pos.x + ride.w / 2, y: ride.pos.y - 10 };
          }
        } else if (!game.input.jump && !(now < (p._dropRideUntil || 0))) {
          // fresh board
          const ride = game.remotes.find((r) => (r.peeling || r.lift) && r.alive && r.hp > 0 && !r.evil &&
            Math.abs(r.pos.x - p.pos.x) < 70 &&
            Math.abs((r.pos.y + r.h / 2) - (p.pos.y + p.h / 2)) < 90);
          if (ride) {
            p._rideId = ride.id;
            if (ride.lift) game.liftSrc = { x: ride.pos.x + ride.w / 2, y: ride.pos.y - 10 };
            else game.peelSrc = { x: ride.pos.x + ride.w / 2, y: ride.pos.y - 10 };
          }
        }
      } else {
        p._rideId = null;
      }
    }

    function updateSpectate(t) {
      let { p } = t;
      p._jumpPrev = !!game.input.jump;
      // dead spec
      if (p.alive === false && net.id) {
        const alive = game.remotes.filter((r) => r.alive && r.hp > 0);
        if (!alive.find((r) => r.id === specId)) specId = alive.length ? alive[0].id : null;
        game.cameraTarget = alive.find((r) => r.id === specId) || null;
        const t = game.cameraTarget;
        // delayed spec
        const showSpec = !net.diedAt || Date.now() - net.diedAt > 5100;
        specBox.textContent = t ? `SPECTATING ${t.name}!!` : 'SPECTATING!!';
        specBox.style.display = showSpec ? 'block' : 'none';
        specHint.style.display = showSpec ? 'block' : 'none';
      } else {
        specBox.style.display = 'none';
        specHint.style.display = 'none';
      }
    }

    function updateFocusCamera(t) {
      let { p } = t;
      // focus super glow up
      {
        const nowF = Date.now();
        let focusBody = null;
        if (nowF < (SS.focusUntil || 0) && p.alive !== false) focusBody = p;
        if (!focusBody) focusBody = game.remotes.find((r) => r.alive && r.hp > 0 && (r.forming || nowF < (r._focusUntil || 0))) || null;
        if (focusBody) {
          if (game.cameraTarget !== focusBody && game.cameraTarget) game.cameraTarget._superFocus = false;
          focusBody._superFocus = true;
          game.cameraTarget = focusBody;
        } else if (game.cameraTarget && game.cameraTarget._superFocus) {
          // show over, restore camera
          game.cameraTarget._superFocus = false;
          game.cameraTarget = null;
          if (p.alive === false) {
            const alive = game.remotes.filter((r) => r.alive && r.hp > 0);
            if (!alive.find((r) => r.id === specId)) specId = alive.length ? alive[0].id : null;
            game.cameraTarget = alive.find((r) => r.id === specId) || null;
          }
        }
      }
    }
