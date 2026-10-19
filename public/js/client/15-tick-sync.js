    // apply round map
    function applyRoundMap(id) {
      const def = mapDef(id);
      if (game.mapId !== def.id) game.loadMainMap(def);
      game.switchMap('main', def.spawn.x, def.spawn.y);
      setMapMusic(def.music);
    }

    // per-map round music
    function setMapMusic(file) {
      const bed = beds.map;
      if (!bed || bed._mapFile === file) return;
      bed._mapFile = file;
      try { bed.src = audioSrc(MUS + file); bed.currentTime = 0; } catch (_) { /* hush!! */ }
    }

    const mapVotePanel = document.getElementById('mapVote');
    let mapVoteOptions = '';
    function updateMapVote(data) {
      const ids = data.vote_options || [];
      mapVotePanel.style.display = data.phase === 'intermission' && ids.length ? 'flex' : 'none';
      const signature = ids.join('|');
      if (signature !== mapVoteOptions) {
        mapVoteOptions = signature;
        mapVotePanel.replaceChildren();
        for (const id of ids) {
          const def = mapDef(id);
          const button = document.createElement('button');
          button.className = 'mapVoteOption';
          button.type = 'button';
          button.dataset.map = id;
          const image = document.createElement('img');
          image.src = def.preview || def.art;
          image.alt = `${def.name} preview`;
          const name = document.createElement('span');
          name.className = 'mapVoteName';
          name.textContent = def.name;
          const count = document.createElement('span');
          count.className = 'mapVoteCount';
          button.append(image, name, count);
          button.addEventListener('click', () => {
            fetch('/api/map-vote', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: net.id, map: id }),
            }).catch(() => {});
          });
          mapVotePanel.appendChild(button);
        }
      }
      for (const button of mapVotePanel.children) {
        const id = button.dataset.map;
        button.classList.toggle('selected', data.my_vote === id);
        button.disabled = data.phase !== 'intermission';
        button.querySelector('.mapVoteCount').textContent = `votes: ${(data.vote_counts || {})[id] || 0}`;
      }
    }

    function syncPhase(t) {
      let { p, data, prevRound, others } = t;
      const prevPhase = net.phase;
      const you = others[net.id];
      let justRevived = false;
      // swap behind instant black
      // never defer swap
      if (data.phase && data.phase !== net.phase) {
        const firstSync = net.phase == null;
        const doSwap = () => {
          net.phase = data.phase;
          soloIdx = -1; // reset ears
          lmsTrack = null; lmsEnded = false; // reset lms
          beds.lms.pause(); beds.lmslux.pause(); beds.lmssonic.pause(); beds.lmstails.pause(); beds.lmsnyan.pause(); beds.lmsmario.pause(); beds.chase.pause(); beds.terror.pause();
          clearEvil(p);
          trippedIds.clear();
          if (data.phase === 'select' || data.phase === 'round') net.costume = null; // picks rule now
          if (data.phase !== 'round' || you?.in_round) {
            if (data.phase === 'round') applyRoundMap(data.map);
            else {
              game.switchMap('inter', 800, 1844); // test map
              if (data.phase === 'intermission' || data.phase === 'lobby') {
                // random fighter kit
                net.costume = lobbyCostume(net.id);
                wearChar(net.costume);
                game.moveSpeed = net.costume === 'sonic' ? 270 : 240;
              }
            }
            if (!p.evil) { p.maxHp = data.phase === 'round' ? survHp() : 100; } // drop buffs, keep nyan
            p.hp = p.maxHp;
            game.respawn();
            justRevived = true;
            game.cameraTarget = null;
            specId = null;
            roleBox.style.display = 'none';
            // fast revive
            fetch('/api/state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: net.id, r: data.round, maxhp: p.maxHp,
                x: Math.round(p.pos.x * 10) / 10, y: Math.round(p.pos.y * 10) / 10,
                facing: p.facing, hp: Math.ceil(p.hp),
                moving: false, onGround: p.onGround, alive: true,
                invis: false, m1: true, stunned: false, pull: false,
              }),
            }).catch(() => {});
          } else {
            // mid-match joiners wait in intermission
            game.switchMap('inter', 800, 1844); // test map
            p.hp = p.maxHp;
            game.respawn();
            justRevived = true;
            game.cameraTarget = null;
            specId = null;
            roleBox.style.display = 'none';
          }
        };
        if (firstSync) doSwap();
        else if (typeof phaseFadeSwap === 'function') phaseFadeSwap(doSwap, 150);
        else doSwap();
      }
      net.round = data.round;
      // round just ended, loading card
      if (prevPhase === 'round' && data.phase === 'intermission' && data.result) {
        const rc = document.getElementById('roundCard');
        const rt = document.getElementById('roundCardTitle');
        const rs = document.getElementById('roundCardSub');
        if (rc && rt && rs) {
          const kwin = data.result.winner === 'killer';
          rt.textContent = kwin ? `EVIL ${data.result.killer_name || '???'} WINS` : 'SURVIVORS WIN';
          rt.className = kwin ? 'l' : 'w';
          rs.textContent = 'loading next round...';
          rc.style.display = 'flex';
          clearTimeout(rc._t);
          rc._t = setTimeout(() => { rc.style.display = 'none'; }, 3500);
          rc.onclick = () => { clearTimeout(rc._t); rc.style.display = 'none'; };
        }
      } else if (data.phase !== 'intermission') {
        const rc2 = document.getElementById('roundCard');
        if (rc2 && rc2.style.display !== 'none') { clearTimeout(rc2._t); rc2.style.display = 'none'; }
      }
      // take hits
      if (!justRevived && you && data.round === prevRound && you.hp < p.hp && you.hp < (you.maxhp || 100) && (you.maxhp || 100) >= p.maxHp && p.alive !== false) {
        game.hurtPlayer(Math.ceil(p.hp - you.hp), 'killer');
      }
      // shield blocked sting once
      if (!justRevived && you && (you.shield_hit || 0) > (p._lastShieldHit || 0) && p.alive !== false) {
        p._lastShieldHit = you.shield_hit;
        fileSfx(SFX + 'basic_hit.wav', {}); // blue hp sting
      }
      // take heals, server first
      if (!justRevived && you && data.round === prevRound && you.hp > p.hp && p.alive !== false) {
        p.hp = you.hp;
      }
      net.ekid = data.killer_id || null;
      net.amKillerElect = !!net.id && data.killer_id === net.id && data.phase !== 'round';
      net.killerPick = others[data.killer_id]?.killer_char || you?.killer_char || 'evil';
      // evil incoming
      // far exile
      if (net.amKillerElect && !net.wasElect) {
        clearTimeout(roleTimer);
        roleBox.textContent = 'YOU WILL BE EVIL!!';
        roleBox.style.color = '#ff4757';
        roleBox.style.display = 'block';
        roleTimer = setTimeout(() => { roleBox.style.display = 'none'; }, 3000);
        sayStatus('pick your killer!!', 5);
        game.spawn = { x: 1850, y: 1844 }; // far corner
        game.respawn();
      }
      net.wasElect = net.amKillerElect;
      Object.assign(t, { prevPhase, you });
    }

    function syncEvilState(t) {
      let { data, others, prevPhase } = t;
      // evil swap
      const amEvil = data.phase === 'round' && data.killer_id === net.id;
      const fresh = data.phase !== prevPhase;
      if (amEvil !== net.wasEvil) {
        net.wasEvil = amEvil;
        applyRole(amEvil);
        if (fresh && data.phase === 'round') game.respawn(); // evil spawn
        clearTimeout(roleTimer);
        if (fresh && data.phase === 'round') fileSfx(SFX + 'going_into_round.wav', {});
        if (fresh && data.phase === 'intro' && net.killerPick !== 'bear5') voiceSfx(vpick(VL_OPEN));
        roleBox.textContent = amEvil
          ? (net.killerPick === 'bear5' ? 'YOU ARE BEAR5!!' : fresh ? 'YOU ARE EVIL LUX!!' : 'YOU ARE EVIL NOW!!')
          : (fresh ? `you are ${(net.pick || 'lux').toUpperCase()}!! :D` : 'BACK TO NORMAL!!');
        roleBox.style.color = amEvil ? '#ff4757' : '#ffa502';
        roleBox.style.display = 'block';
        roleTimer = setTimeout(() => { roleBox.style.display = 'none'; }, 3000);
      }
      if (fresh && data.phase === 'round') {
        net.wasEvil = amEvil;
        applyRole(amEvil); // fresh stats always
        game.respawn(); // evil spawn
      }
      // black while map loads
      if (mapLoad) {
        const art = game.levelArt, bd = game.levelBackdrop;
        const iart = game.interArt, ipr = game.interProps;
        const loading = (game.activeMap === 'main' &&
          ((art && !art.complete) || (bd && !bd.complete))) ||
          (game.activeMap === 'inter' && ((iart && !iart.complete) || (ipr && !ipr.complete))) ||
          data.phase === 'intro';
        mapLoad.style.display = loading ? 'flex' : 'none';
      }
      // killer intro video
      if (introWrap) {
        const bv = (typeof bearVid !== 'undefined') ? bearVid : null; // old audio lacks it
        if (data.phase === 'intro' && data.round !== net._introRound) {
          net._introRound = data.round;
          // 2s breather, then show
          setTimeout(() => {
            if (net._introRound === data.round && net.phase === 'intro' && introWrap.style.display !== 'block') {
              introWrap.style.display = 'block';
              const isBearIntro = others[data.killer_id]?.killer_char === 'bear5';
              const vid = (isBearIntro ? bv : null) || introVid;
              const other = vid === introVid ? bv : introVid;
              if (other) { try { other.pause(); } catch (_) { /* hush!! */ } other.style.display = 'none'; }
              if (vid) {
                vid.style.display = '';
                try { vid.currentTime = 0; } catch (_) { /* hush!! */ }
                vid.play().catch(() => { introWrap.style.display = 'none'; });
              } else {
                introWrap.style.display = 'none';
              }
            }
          }, 2000);
        } else if (data.phase !== 'intro' && introWrap.style.display !== 'none') {
          introWrap.style.display = 'none';
          try { introVid.pause(); } catch (_) { /* hush!! */ }
          try { bv.pause(); } catch (_) { /* hush!! */ }
          introVid.style.display = '';
          if (bv) bv.style.display = 'none';
        }
      }
      // lms evil cinema
      {
        const cut = data.result && data.result.cutscene;
        if (!net._cutEls) net._cutEls = { w: document.getElementById('resCutWrap'), v: document.getElementById('resCutVid') };
        const cw = net._cutEls.w, cv = net._cutEls.v;
        if (data.phase === 'lms_cutscene' && cut && cw && cv) {
          if (net._cutRound !== data.result.round) {
            net._cutRound = data.result.round;
            cw.style.display = 'block';
            cw.style.opacity = '1'; // fade back in
            let cutGone = false;
            const cutDone = () => {
              if (cutGone) return;
              cutGone = true;
              cw.style.opacity = '0'; // fade out
              setTimeout(() => {
                cw.style.display = 'none';
                try { cv.pause(); } catch (_) { /* hush!! */ }
              }, 800);
              if (net.id) {
                fetch('/api/intro', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: net.id }),
                }).catch(() => {});
              }
            };
            cv.onended = cutDone;
            cv.onerror = cutDone; // missing file, skip ahead
            cw.onclick = cutDone; // click skips
            cv.src = cut;
            try { cv.currentTime = 0; } catch (_) { /* hush!! */ }
            cv.play().catch(cutDone); // blocked, skip ahead
          }
        } else if (cw && cw.style.display !== 'none') {
          cw.style.display = 'none';
          try { cv.pause(); } catch (_) { /* hush!! */ }
        }
      }
    }

    function updatePhaseText(t) {
      let { p, data, others, you } = t;
      updateMapVote(data);
      // phase text
      let phaseText = 'lobby!!';
      if (data.phase === 'lobby') {
        // head count
        const here = Object.entries(others)
          .filter(([id, o]) => id !== net.id && !o.away && (o.idle || 0) < 10).length
          + (net.afk ? 0 : 1);
        phaseText = `lobby - waiting for players (${here}/2)!!`;
      } else if (data.phase === 'intermission') {
        const t = Math.max(0, data.time_left || 0);
        const r = data.result;
        const who = r && r.winner === 'killer' ? `EVIL ${r.killer_name} WINS!!` : 'SURVIVORS WIN!!';
        const fee = net.me && net.me.round_cost ? ` (${net.me.round_cost} digipogs a round)` : '';
        if (data.vote_options && data.vote_options.length > 0) {
          phaseText = `${who} vote for map!! ${t}s${fee}`;
        } else {
          phaseText = `${who} picks open in ${t}s!!${fee}`;
        }
        // countdown tick, intermission only
        if (t <= 5 && t > 0 && t !== net._tickSec) {
          net._tickSec = t;
          fileSfx(SFX + 'timertick.wav', {});
        }
      } else if (data.phase === 'select') {
        const t = Math.max(0, data.time_left || 0);
        phaseText = you && you.paid === null ? 'paying the round fee...'
          : you && you.paid === false && net.me && net.me.round_cost ? `NOT PLAYING: ${you.pay_msg || 'round fee failed'}!!`
          : `PICK YOUR CHARACTER!! (${t}s)`;
      } else if (data.phase === 'intro') {
        phaseText = 'GET READY!!';
      } else if (data.phase === 'lms_cutscene') {
        phaseText = data.result && data.result.winner === 'killer' ? `EVIL ${data.result.killer_name || '???'} WINS!!` : 'ROUND OVER!!';
      } else if (data.phase === 'round') {
        const t = Math.max(0, data.time_left || 0);
        const mm = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
        phaseText = !you?.in_round
          ? (you?.away ? 'AFK - spectating this round!!' : 'NOT IN THIS ROUND - spectating!!')
          : data.notice
          ? `${data.notice} (${data.notice_left || 0}s)`
          : data.grace
          ? `GRACE - RUN!! (${mm})`
          : (p.evil ? `${mm} - YOU ARE EVIL!! Z = hit!!` : `${mm} - run!! evil: ${data.killer_name || '???'}`);
      }
      if (phaseText !== lastPhaseText) { phaseLine.textContent = phaseText; lastPhaseText = phaseText; }
      // malice shop
      malicePanel.style.display = 'block';
      maliceNum.textContent = you.malice || 0;
      buyMaliceBtn.disabled = data.phase !== 'intermission';
      buyMaliceBtn.textContent = net.me ? `buy ${net.me.malice_per_buy} malice (${net.me.malice_price} digipogs)` : 'buy malice';
      // per-round join check
      const vb = document.getElementById('verifyBanner');
      if (vb) {
        const needVerify = net.me && net.me.round_cost > 0 &&
          (data.phase === 'intermission' || data.phase === 'select') &&
          you && you.paid === false && /verify/i.test(you.pay_msg || '');
        vb.style.display = needVerify ? 'flex' : 'none';
      }
      // party list, round players only
      const showParty = data.phase === 'round' && net.id && you?.in_round !== false;
      partyList.style.display = showParty ? 'flex' : 'none';
      if (showParty && Date.now() - (net._partyT || 0) > 250) {
        net._partyT = Date.now();
        renderParty((data.players || {})[net.id], p, data.players, data.killer_id);
      }
    }

    function syncRemotes(t) {
      let { p, data, others } = t;
      const meIn = !!(others[net.id] && others[net.id].in_round);
      const seen = new Set();
      for (const [id, d] of Object.entries(others)) {
        if (id === net.id) continue;
        if (d.in_round !== undefined && !!d.in_round !== meIn) continue; // same group only
        seen.add(id);
        let r = game.remotes.find((r) => r.id === id);
        if (!r) {
          r = {
            id, isRemote: true, name: d.name,
            pos: { x: d.x, y: d.y }, vel: { x: 0, y: 0 },
            tx: d.x, ty: d.y,
            w: 28, h: 60, drawW: 50, drawH: 70, facing: 1,
            sprites: luxSprites, walkDist: 0, animTime: 0,
            onGround: true, hp: 100, maxHp: 100, alive: true,
          };
          game.remotes.push(r);
        }
        r.tx = d.x; r.ty = d.y; // glide targets
        // smooth history
        const nowHist = performance.now();
        r.hist = r.hist || [{ x: d.x, y: d.y, t: nowHist }, { x: d.x, y: d.y, t: nowHist }];
        r.hist.push({ x: d.x, y: d.y, t: nowHist });
        while (r.hist.length > 8) r.hist.shift();
        // how often updates really come in, so the glide can sit far enough behind
        if (r.lastPush) {
          const gap = Math.min(nowHist - r.lastPush, 500);
          r.gap = r.gap ? r.gap * 0.8 + gap * 0.2 : gap;
          const want = Math.min(450, Math.max(100, r.gap * 1.7));
          r.delay = r.delay ? r.delay + (want - r.delay) * 0.1 : want;
        }
        r.lastPush = nowHist;
        r.name = d.name; r.facing = d.facing; r.hp = d.hp;
        r.char = id === data.killer_id ? (d.killer_char || 'evil') : (d.char || 'lux');
        r.onGround = d.onGround ?? true;
        r.alive = d.alive ?? d.hp > 0;
        r.evil = id === data.killer_id;
        r.maxHp = d.maxhp || (r.evil && r.char === 'bear5' ? 999 : (r.evil ? 250 : 100)); // true bars
        r.shield = d.shield || 0; // temp hp
        r.super = !!d.super; // glowing or not
        r.rainbow = !!d.super; // gold bar
        r.pulseWhite = !!d.super; // glow pulse
        r.forming = !!d.forming; // mid glow up
        r.tremble = !!d.forming;
        r.whiteFlash = !!d.forming;
        // lobby face sync
        const rface = (!d.char && (net.phase === 'lobby' || net.phase === 'intermission')) ? lobbyCostume(id) : (r.char || 'lux');
        const luxDim = !r.evil && rface === 'lux' && !!d.aura_hot;
        r.sprites = r.evil ? (r.char === 'bear5' ? bear5Sprites : evilSprites) : (r.char === 'supersonic' && !r.super && !r.forming ? sonicSprites : (r.char === 'tails' && r.holdingBomb ? tailsCarrySprites : (luxDim ? luxDimSprites : (charSprites[rface] || luxSprites)))); // see all
        // true size
        const rkey = rface + (r.evil ? '*' : '') + (r.super ? '!' : '') + (r.forming ? '?' : '') + (r.holdingBomb ? 'h' : '') + (luxDim ? 'd' : '');
        if (r._lastChar !== rkey) { r._baseFrame = null; r._lastChar = rkey; }
        r.drawW = r.char === 'bear5' ? 76 : (!r.evil && rface === 'mario' ? 46 : 50);
        r.drawH = r.char === 'bear5' ? 94 : (r.char === 'nyan' ? NYAN_H : (!r.evil && (rface === 'sonic' || rface === 'supersonic' || rface === 'tails' || rface === 'mario')) ? 64 : 70);
        r.invis = !!d.invis;
        r.stunned = !!d.stunned;
        r.pull = !!d.pull;
        r.peeling = !!d.peeling;
        r.spinning = !!d.spinning;
        r.spinwindup = !!d.spinwindup;
        r.pullwindup = !!d.pullwindup;
        r.lift = !!d.lift;
        r.whipUntil = !!d.whipuntil;
        r.praying = !!d.praying;
        r.rushing = !!d.rushing;
        r.panting = !!d.panting;
        r.kickUntil = !!d.kickUntil;
        r.jabUntil = !!d.jabUntil;
        r.throwUntil = !!d.throwUntil;
        r.holdingBomb = !!d.holding;
        r.dashing = !!d.dashing;
        r.away = !!d.away;
        r.inRound = !!d.in_round;
        r.redFlash = !!d.windup && !!r.evil; // red warning
        r.cyanFlash = !!d.windup && !r.evil; // cyan windup
        r.cowering = !!d.cower;
        // synced animations (super sonic, evil rush, bear5 trail)
        const an = d.anim || null;
        r.trail = !!d.trail;
        r.boosting = an === 'sboost';
        r.echarge = an === 'echarge';
        if (an === 'sspin') r.spinning = true;
        if (an === 'sspinw') { r.spinwindup = true; r.spinWindup = true; }
        const animImg = {
          sskid: () => superSprites.skid[Math.floor(Date.now() / 90) % 2],
          sboost: () => superSprites.boost[Math.floor(Date.now() / 80) % 2],
          sduck: () => superSprites.duck[Math.floor(Date.now() / 130) % 3],
          sguard: () => superSprites.guard,
          sstun: () => ((Math.floor(Date.now() / 150) % 2) ? superSprites.stun2 : superSprites.stun),
        }[an];
        if (animImg && !r.evil) {
          r.actionImg = animImg(); r.actionT = 0.15; r._animOn = true;
        } else if (r._animOn) {
          r.actionImg = null; r.actionT = 0; r._animOn = false;
        }
        // watcher burst, move started
        if (r.alive && r.hp > 0 && data.phase === 'round') {
          const qx = r.pos.x + r.w / 2, qy = r.pos.y + r.h / 2;
          if (!r.evil) {
            if (r.kickUntil && !r._wasKick) game.luxGlow(qx, qy, '#ffffff', 3, 110); // their kick
            if (r.jabUntil && !r._wasJab) game.luxGlow(qx, qy, '#ffffff', 4, 110); // their jab
            if (r.throwUntil && !r._wasThrow) game.luxGlow(qx, qy, '#ffa502', 4, 100); // their toss
            if (r.whipUntil && !r._wasWhip) game.luxGlow(qx, qy, '#ffa502', 3, 120); // their whip
            if (r.lift && !r._wasLift) game.luxGlow(qx, qy, '#ffffff', 4, 110); // their liftoff puff
            // their spin jump
            const mspin = r.char === 'mario' && d.pose === 'spin';
            if (mspin && !r._wasSpinPose) {
              r._mspinUntil = Date.now() + 1000;
              r._mspinOn = true;
              game.spawnSprite(qx, qy, marioSprites.luma, 0.15); // their luma
            }
            r._wasSpinPose = mspin;
            if (r._mspinOn) {
              if ((r._mspinUntil || 0) > Date.now() && r.alive) {
                r.actionImg = marioSprites.spin[Math.floor((Date.now() - (r._mspinUntil - 1000)) / 120) % 4]; r.actionT = 0.15;
              } else {
                r.actionImg = null; r.actionT = 0; r._mspinOn = false;
              }
            }
          } else if (r.pull && !r._wasPull) {
            game.luxGlow(qx, qy, '#c084fc', 3, 110); // their catch
          }
          r._wasKick = !!r.kickUntil; r._wasJab = !!r.jabUntil;
          r._wasThrow = !!r.throwUntil; r._wasWhip = !!r.whipUntil; r._wasLift = !!r.lift;
          r._wasPull = !!r.pull;
        }
        // pose frames
        if (d.windup) {
          if (!r._wasWindup) r._windupStart = Date.now();
          if (r.evil) {
            r.poseImg = r.char === 'bear5' ? bear5Image : (r.pullwindup ? evilAct.pullwindup : evilWindup[0]);
          } else if (r.char === 'sonic') {
            // revving up
            if (r.spinwindup) {
              r.poseImg = sonicSprites.spin[Math.floor(Date.now() / 100) % 3];
            } else {
              const t = (Date.now() - (r._windupStart || Date.now())) / 3000;
              const w = sonicSprites.walk;
              r.poseImg = t < 0.3 ? sonicSprites.charge
                : t < 0.7 ? w[Math.floor(Date.now() / 100) % w.length]
                : sonicSprites.peel[Math.floor(Date.now() / 60) % 4];
            }
          } else if (rface === 'lux' && (r.praying || r.rushing || r.panting)) {
            // lux kit anims beat placeholder
            r.poseImg = null;
          } else {
            r.poseImg = luxSprites.run[0];
          }
          r.poseUntil = Date.now() + 150;
        } else if (d.pose && d.pose !== r.pose) {
          r.pose = d.pose;
          r.poseUntil = Date.now() + 350;
          r.poseImg = poseImage(r.evil, r.char, d.pose, d.m1v);
          if (r.char === 'bear5' && d.pose === 'bear-fold') {
            r._bearFoldStart = Date.now();
            r._bearFoldDuration = 440;
            r._bearFoldUntil = r._bearFoldStart + r._bearFoldDuration;
          }
          // watcher killer fx, pose struck
          if (r.evil && r.alive && data.phase === 'round') {
            const px = r.pos.x + r.w / 2, py = r.pos.y + r.h / 2;
            if (d.pose === 'swing') game.luxGlow(px, py, '#ff6b6b', 4, 120); // their swing
            else if (d.pose === 'spike') game.luxGlow(px, py - 10, '#c9c9d6', 4, 90); // their set
          }
        } else if (!d.pose) {
          r.pose = null;
        }
        r._wasWindup = !!d.windup;
        // sync sonic flags
        if (!r.evil) {
          r.peeling = !!r.peeling;
          r.spinning = !!r.spinning;
          r.spinWindup = !!r.spinwindup;
        }
        // fly for all
        if (!r.evil && r.lift) {
          r.poseImg = tailsSprites.fly[Math.floor(Date.now() / 120) % 3];
          r.poseUntil = Date.now() + 150;
        }
        // super glow for all
        if (!r.evil && r.char === 'supersonic' && r.forming) {
          r.poseImg = superSprites.transform[Math.floor(Date.now() / 200) % superSprites.transform.length];
          r.poseUntil = Date.now() + 150;
        }
        // mario uppercut, play once
        if (!r.evil && r.char === 'mario' && (d.pose === 'uppercharge' || d.pose === 'uppercut')) {
          if (r._mupPose !== d.pose) { r._mupPose = d.pose; r._mupStart = Date.now(); }
          const seq = d.pose === 'uppercharge' ? marioSprites.uppercharge : marioSprites.upper;
          const per = d.pose === 'uppercharge' ? 333 : 600;
          r.poseImg = seq[Math.min(seq.length - 1, Math.floor((Date.now() - r._mupStart) / per))];
          r.poseUntil = Date.now() + 150;
        } else if (r._mupPose) {
          r._mupPose = null;
        }
        const lostHp = r._lastHp !== undefined && r.hp < r._lastHp;
        const realHit = lostHp && r.hp < (r.maxHp || 100);
        if (realHit && !r.evil && p.evil && data.phase === 'round' && others[data.killer_id]?.killer_char === 'bear5') {
          spawnBearHitFx(r.pos.x + r.w / 2, r.pos.y + r.h / 2);
        }
        if (p.evil && realHit) {
          fileSfx(net.killerPick === 'bear5' ? SFX + 'jumpscare.mp3' : SFX + 'm1_hit.wav', {});
        }
        // shield hit sting killer
        if (p.evil && (d.shield_hit || 0) > (r._lastShieldHit || 0) && !r.evil && data.phase === 'round') {
          r._lastShieldHit = d.shield_hit;
          fileSfx(SFX + 'basic_hit.wav', {});
        }
        if (r._wasAlive && !r.alive && data.phase === 'round') {
          fileSfx(SFX + 'death.mp3', {}); // they died
          if (!r.evil) voiceSfx(vpick(VL_KILL)); // killer brags
        }
        // watcher lux fx, state driven
        if (!r.evil && r.alive && r.hp > 0 && data.phase === 'round') {
          const rx = r.pos.x + r.w / 2, ry = r.pos.y + r.h / 2;
          const fxNow = Date.now();
          if (r.praying && fxNow >= (r._prayFxAt || 0)) {
            r._prayFxAt = fxNow + 150;
            game.luxGlow(rx, ry, '#ffe93b', 2, 90); // their prayers rise
          }
          if (r.rushing && fxNow >= (r._rushFxAt || 0)) {
            r._rushFxAt = fxNow + 130;
            game.luxGlow(rx, ry, '#aef1ff', 2, 140); // their speed sparks
          }
          if ((r.shield || 0) > 0 && fxNow >= (r._shieldFxAt || 0)) {
            r._shieldFxAt = fxNow + 240;
            game.luxGlow(rx, ry, '#249bff', 1, 70); // empowered shimmer
          }
          if (luxDim && fxNow >= (r._hotFxAt || 0)) {
            r._hotFxAt = fxNow + 280;
            game.luxGlow(rx, ry, '#5ff2ff', 1, 110); // shard working
          }
          // fresh empower burst, once each
          if ((r.shield || 0) > (r._lastShield || 0)) {
            game.luxRing(rx, ry, '#ffd23f', 300);
            game.luxGlow(rx, ry, '#ffd23f', 4, 110);
          }
        }
        // move endings, so watchers get the same puffs the player does
        if (!r.evil && r.alive && data.phase === 'round') {
          const ex = r.pos.x + r.w / 2, ey = r.pos.y + r.h / 2;
          if (r._wasPraying && !r.praying) game.luxGlow(ex, ey, '#ffe93b', 5, 120); // prayer lands
          if (r._wasRushing && !r.rushing) game.luxGlow(ex, r.pos.y + r.h - 8, '#ffffff', 4, 130); // skid stop
        }
        r._wasPraying = !!r.praying; r._wasRushing = !!r.rushing;
        r._wasAlive = !!r.alive;
        r._lastHp = r.hp;
        r._lastShield = r.shield || 0;
        if (!r._wasSuper && r.super) {
          // watch new gold
          r._focusUntil = Date.now() + 1500;
        }
        r._wasSuper = !!r.super;
        if (r.forming) {
          // keep watching glow
          r._focusUntil = Date.now() + 2800;
        }
      }
      game.remotes = game.remotes.filter((r) => seen.has(r.id));
    }

    function syncCharSelect(t) {
      let { p, data, prevPhase, you } = t;
      // learn picks
      const mePick = (data.players || {})[net.id];
      if (mePick && typeof mePick.aura === 'number') L.tier = mePick.aura;
      if (mePick) L.hot = !!mePick.aura_hot;
      // bonus hp gained sting
      if (mePick && (mePick.shield || 0) > (p.shield || 0) && p.alive !== false) {
        fileSfx(SFX + 'dash_release.wav', {});
        sayStatus('overhealed!!', 2);
        game.luxRing(p.pos.x + p.w / 2, p.pos.y + p.h / 2, '#ffd23f', 300); // empowered
        game.luxGlow(p.pos.x + p.w / 2, p.pos.y + p.h / 2, '#ffd23f', 6, 120);
      }
      if (mePick) p.shield = mePick.shield || 0;
      if (mePick && mePick.char && mePick.char !== net.pick) {
        net.pick = mePick.char;
        if (!p.evil) wearChar(mePick.char === 'supersonic' && !SS.transformed ? 'sonic' : mePick.char);
      } else if (mePick && !mePick.char && net.pick) {
        net.pick = null;
        if (!p.evil) wearChar('lux');
      }
      // server truth
      if (!statusUntil || Date.now() > statusUntil) {
        netStatus.style.color = ''; // no error
        const mc = (mePick && mePick.char) || net.pick;
        netStatus.textContent = p.evil ? (net.killerPick === 'bear5' ? 'YOU ARE BEAR5!!' : 'YOU ARE EVIL LUX!!')
          : net.amKillerElect ? 'YOU WILL BE EVIL!!'
          : mc ? `you are ${mc.toUpperCase()}!! :D`
          : (net.id ? 'pick a character!!' : netStatus.textContent);
      }
      // back playing
      if (net.afk && (game.input.left || game.input.right || game.input.jump)) setAFK(false);
      // pick countdown
      if (data.phase === 'round' && prevPhase !== 'round') {
        revealUntil = Date.now() + 3000;
      }
      const picking = data.phase === 'select';
      // agree twice
      const inReveal = data.phase === 'round' && you?.in_round && Date.now() < revealUntil && data.round !== revealedRound;
      const wantOpen = (!!net.id || net.everOnline) && ((picking && !net.afk) || inReveal);
      if (wantOpen) {
        openStreak++; closeStreak = 0;
        if (openStreak >= 2) {
          if (inReveal) revealedRound = data.round;
          showSelect(true, `${data.phase} picking=${picking} reveal=${inReveal}`, false);
        }
      } else {
        closeStreak++; openStreak = 0;
        if (closeStreak >= 2) {
          showSelect(false, `${data.phase}`, data.phase === 'round');
        }
      }
      if (selectOpen) {
        takenMap = {};
        for (const c of (data.chars || [])) { takenMap[c.id] = !!c.taken; devChars[c.id] = !!c.dev; }
        renderSelect();
        const revealing = data.phase === 'round';
        renderLobby(data.players || {}, data.killer_id);
        // pick timer
        if (csCount) csCount.textContent = data.phase === 'select' && (data.time_left || 0) > 0 ? `${data.time_left}` : '';
      }
    }

    function updateMusic(t) {
      let { p, data, others, you } = t;
      // scary music
      let nearestEvil = Infinity;
      if (data.phase === 'round' && you?.in_round && p.alive !== false) {
        for (const r of game.remotes) {
          if (!r.inRound || !r.alive || r.hp <= 0 || r.invis) continue; // sneak hides
          if (p.evil === !!r.evil) continue; // foes only
          const d = Math.hypot(r.pos.x - p.pos.x, r.pos.y - p.pos.y);
          if (d < nearestEvil) nearestEvil = d;
        }
      }
      const chaseT0 = nearestEvil === Infinity ? 0
        : Math.min(1, Math.max(0, 1 - (nearestEvil - 40) / 220));
      let chaseT = chaseT0;
      let terrorT = nearestEvil === Infinity ? 0
        : Math.min(1, Math.max(0, 1 - Math.abs(nearestEvil - 380) / 280));
      if (chaseT > 0.05) terrorT = 0; // chase wins
      // last survivor
      // lux anthem
      const survsLeft = (you?.in_round && p.alive !== false && !p.evil ? 1 : 0) +
        game.remotes.filter((r) => r.inRound && r.alive && r.hp > 0 && !r.evil).length;
      const isLMS = data.phase === 'round' && survsLeft === 1;
      let lmsChar = null;
      if (isLMS) {
        if (p.alive !== false && !p.evil) lmsChar = net.pick || null;
        else {
          const last = game.remotes.find((r) => r.alive && r.hp > 0 && !r.evil);
          lmsChar = (last && last.char) || null;
        }
      }
      const luxLMS = isLMS && lmsChar === 'lux';
      const sonicLMS = isLMS && lmsChar === 'sonic';
      const tailsLMS = isLMS && lmsChar === 'tails';
      const nyanLMS = isLMS && lmsChar === 'nyan';
      const marioLMS = isLMS && lmsChar === 'mario';
      const superLMS = isLMS && lmsChar === 'supersonic';
      const lmsKey = luxLMS ? 'lmslux' : (sonicLMS ? 'lmssonic' : (tailsLMS ? 'lmstails' : (nyanLMS ? 'lmsnyan' : (marioLMS ? 'lmsmario' : (superLMS ? 'lmssonic' : 'lms')))));
      if (isLMS && lmsTrack !== lmsKey) {
        // start anthem
        for (const k of ['chase', 'terror', 'map', 'lms', 'lmslux', 'lmssonic', 'lmstails', 'lmsnyan', 'lmsmario']) {
          beds[k].pause();
          try { beds[k].currentTime = 0; } catch (_) { /* hush!! */ }
        }
        if (!document.hidden) beds[lmsKey].play().catch(() => {});
        lmsTrack = lmsKey;
        lmsEnded = false;
        if (!p.evil && p.alive !== false) {
          // heal, keep super hp
          const superGlow = isSuper() && SS.transformed;
          const lmsHp = Math.max(LMS_HP, survHp());
          p.maxHp = superGlow ? SUPER_HP : lmsHp; p.hp = superGlow ? SUPER_HP : lmsHp;
          S.dashCD = 0; S.cowerCD = 0; L.prayCD = 0; L.adCD = 0; L.overCD = 0; T.kickCD = 0; T.jabCD = 0; TW.flyCD = 0; TW.bombCD = 0; TW.whipCD = 0; TW.bombsLeft = 5;
          NY.rocketCD = 0; NY.dashCD = 0; MU.upperCD = 0;
          SS.boostCD = 0; SS.blockCD = 0; SS.spinCD = 0;
          fetch('/api/heal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: net.id, amount: 999, max: superGlow ? SUPER_HP : lmsHp }),
          }).catch(() => {});
        }
      } else if (!isLMS && lmsTrack) {
        // lms over
        beds.lms.pause(); beds.lmslux.pause(); beds.lmssonic.pause(); beds.lmstails.pause(); beds.lmsnyan.pause(); beds.lmsmario.pause();
        lmsTrack = null; lmsEnded = false;
        if (!p.evil) {
          // drop buffs except super
          if (!(isSuper() && SS.transformed)) { p.maxHp = survHp(); p.hp = Math.min(p.hp, p.maxHp); }
        } // drop buffs
      }
      // block chase
      if (isLMS) { chaseT = 0; terrorT = 0; }
      // bear5 uses own themes
      let bear5ChaseT = 0;
      const killerChar = others[data.killer_id]?.killer_char;
      const isBear5Killer = killerChar === 'bear5';
      if (isBear5Killer && p.alive !== false && data.phase === 'round'
        && (chaseT > 0.05 || terrorT > 0.05 || K.charging || Date.now() < K.windupUntil || Date.now() < K.pullUntil)) {
        bear5ChaseT = 1;
        chaseT = 0; terrorT = 0; // bear5 owns the air
      }
      // super theme overpowers everything
      const heroOn = (!p.evil && SS.transformed && p.alive !== false) ||
        game.remotes.some((r) => !r.evil && r.super && r.alive && r.hp > 0);
      // lms first
      const cands = [
        ['hero', heroOn ? 1 : 0, 0.3],
        ['lmslux', luxLMS ? 1 : 0, 0.25],
        ['lmssonic', (sonicLMS || superLMS) ? 1 : 0, 0.25],
        ['lmstails', tailsLMS ? 1 : 0, 0.25],
        ['lmsnyan', nyanLMS ? 1 : 0, 0.25],
        ['lmsmario', marioLMS ? 1 : 0, 0.25],
        ['lms', isLMS && !luxLMS && !sonicLMS && !tailsLMS && !nyanLMS && !marioLMS && !superLMS ? 1 : 0, 0.25],
        ['chase', chaseT, 0.9],
        ['terror', terrorT, 0.9],
        ['bear5chase', bear5ChaseT, 0.9],
        ['inter', data.phase === 'intermission' ? 1 : 0, 0.3],
        ['charselect', selectOpen && data.phase === 'select' ? 1 : 0, 0.4],
        ['map', data.phase === 'round' ? 1 : 0, 0.12],
        ['wait', data.phase === 'lobby' ? 1 : 0, 0.3],
      ];
      const bedT = { map: 0, wait: 0, inter: 0, lms: 0, lmslux: 0, lmssonic: 0, lmstails: 0, lmsnyan: 0, lmsmario: 0, hero: 0, chase: 0, terror: 0, bear5chase: 0, charselect: 0 };
      const win = cands.find((c) => c[1] > 0.05);
      if (win) bedT[win[0]] = win[2] * (win[0] === 'chase' || win[0] === 'terror' ? win[1] : 1);
      if (document.hidden) for (const k in bedT) bedT[k] = 0; // mute hidden
      for (const [key, a] of Object.entries(beds)) {
        // pause means silent
        // title mutes
        let target = soloIdx >= 0 ? (key === soloOrder[soloIdx] ? 0.8 : 0) : (bedT[key] || 0);
        target *= (window.MUS_VOL ?? 68) / 100; // settings level
        if (titleLive) target = 0;
        if (target > 0.01) {
          if (a.paused && !(key === lmsTrack && lmsEnded)) a.play().catch(() => {});
          a.volume += (target - a.volume) * 0.15; // fade in
        } else if (!a.paused) {
          a.volume += (0 - a.volume) * 0.3; // fade out
          if (a.volume < 0.02) a.pause();
        }
      }
      // hero lyrics
      {
        const hb = beds.hero;
        let line = '';
        if (hb && !hb.paused && hb.volume > 0.05 && hb.currentTime > 0) {
          const t = hb.currentTime;
          for (const [lt, lx] of HERO_LYRICS) {
            if (t < lt) break;
            line = lx;
          }
          const lastT = HERO_LYRICS[HERO_LYRICS.length - 1][0];
          if (t > lastT + 10) line = '';
        }
        if (line) {
          // rainbow super sonic
          const html = line.replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/(super sonic)/gi, '<span class="lyr-rainbow">$1</span>');
          if (lyricBar._html !== html) { lyricBar.innerHTML = html; lyricBar._html = html; }
        } else {
          lyricBar._html = '';
        }
        lyricBar.style.display = line ? 'block' : 'none';        }
      Object.assign(t, { isLMS });
    }

    function syncStunFeel(t) {
      let { p, data, you } = t;
      // feel stuns
      if (you && (you.stun || 0) > (p.stunT || 0)) p.stunT = you.stun;
      // stun sting
      if (p.evil && (p.stunT || 0) > (p._lastStun || 0)) {
        fileSfx(SFX + 'basic_hit.wav', {});
      }
      p._lastStun = p.stunT || 0;
      // words on recovery
      if (p.evil && (p._wasStun || 0) > 0 && (p.stunT || 0) <= 0 && p.alive !== false && data.phase === 'round') {
        voiceSfx(vpick(VL_STUN));
      }
      p._wasStun = p.stunT || 0;
      // ate hits
      if (you && you.countered && !p.evil) {
        S.countered = true; // shorter wait
        p.cowerT = 0; p.cowering = false;
        fileSfx(SFX + 'basic_hit.wav', {}); // got em
      }
      // shove killers
      if (p.evil && you && you.kb && you.kb.at !== p._lastKb) {
        p._lastKb = you.kb.at;
        const kbPow = you.kb.p || 1;
        if (!you.kb.vert) p.vel.x = (you.kb.x || 0) * Math.min(kbPow > 1 ? 4000 : 1100, 375 * (you.kb.s || 2) * kbPow); // keep momentum
        if (you.kb.up > 0) p.vel.y = Math.min(p.vel.y || 0, -you.kb.up); // pop up
        else if (p.onGround) p.vel.y = Math.min(p.vel.y || 0, -220); // hop up
      }
    }

    function others_char(data, kid) {
      const k = (data.players || {})[kid];
      return k ? k.killer_char : null;
    }

    function syncHitPop(t) {
      let { data } = t;
      const feed = data.hits || [];
      let latest = null;
      const lastSeen = net._hitSeq || 0;
      for (const h of feed) if ((h.seq || 0) > lastSeen) latest = h; // pick newest
      if (!latest) return;
      net._hitSeq = latest.seq;
      if (data.phase !== 'round' || !net.id) return;
      const kid = data.killer_id;
      // only the two players in a hit see the burst. red if the killer hit, blue if a survivor hit
      for (const h of feed) {
        if ((h.seq || 0) <= lastSeen) continue;
        if (h.a !== net.id && h.v !== net.id) continue;
        if (h.a === net.id && Date.now() - (net._hitFxAt || 0) < 600) continue; // my own was already shown
        const body = h.v === net.id ? t.p : game.remotes.find((r) => r.id === h.v);
        if (!body) continue;
        const killerHit = h.a === kid;
        hitBurst(body.pos.x + body.w / 2, body.pos.y + body.h / 2, (h.dmg || 0) >= 50, killerHit);
        if (killerHit && h.v === net.id && others_char(data, kid) === 'bear5') spawnBearHitFx(body.pos.x + body.w / 2, body.pos.y + body.h / 2);
      }
      if (latest.v === net.id) {
        // i ate it
        hurtVignette();
        fileSfx(SFX + 'ouch!.mp3', { v: 1 }); // loud on purpose
        return;
      }
      let text = '';
      if (latest.v === kid && (latest.stun || 0) > 0) {
        // killer is stunned
        text = 'stunned killer';
      } else if (latest.a === net.id) {
        // my hit landed
        const pl = (data.players || {})[latest.v];
        text = `hit ${pl && pl.name ? pl.name : 'them'}`;
      }
      if (!text) return; // not mine
      if (!hitPop) return;
      hitPop.textContent = text;
      hitPop.style.display = 'block';
      clearTimeout(hitPopT);
      hitPopT = setTimeout(() => { hitPop.style.display = 'none'; }, 1200);
    }

    function hurtVignette() {
      if (!hurtFlash) return;
      hurtFlash.style.transition = 'none';
      hurtFlash.style.opacity = '1';
      void hurtFlash.offsetWidth; // snap to full red
      hurtFlash.style.transition = '';
      hurtFlash.style.opacity = '0';
    }

    function syncTraps(t) {
      let { p, data } = t;
      // traps pings
      for (const sp of (data.spikes || [])) if (trippedIds.has(sp.id)) sp.tripped = true;
      for (const sp of (data.spikes || [])) {
        if (!seenSpikes.has(sp.id)) {
          seenSpikes.add(sp.id);
          if (data.phase === 'round') game.luxGlow(sp.x, sp.y - 10, '#c9c9d6', 4, 90); // fresh spike
        }
      }
      for (const id of [...seenSpikes]) {
        if (!(data.spikes || []).some((sp) => sp.id === id)) seenSpikes.delete(id); // gone now
      }
      game.spikes = data.spikes || [];
      // bomb sync
      for (const bb of (data.bombs || [])) bombPos[bb.id] = { x: bb.x, y: bb.y, owner: bb.owner || null, refunded: !!bombPos[bb.id]?.refunded };
      for (const bid of Object.keys(bombPos)) {
        if (!(data.bombs || []).some((bb) => bb.id === bid)) {
          const bp = bombPos[bid];
          if (!bp.refunded && data.phase === 'round' && bp.owner === net.id && isTails() && !p.evil && p.alive !== false) {
            TW.bombsLeft = Math.min(5, TW.bombsLeft + 1);
            bp.refunded = true;
          }
          boomedIds.delete(bid);
          delete bombPos[bid];
        }
      }
      game.bombs = data.bombs || [];
      for (const toss of (data.tosses || [])) {
        if (!seenTosses.has(toss.id)) {
          seenTosses.add(toss.id);
          // own throws already fly
          // server echo would dupe-pop
          if (toss.owner === net.id) continue;
          // pass owner for arc
          game.addToss(toss.x, toss.y, toss.vx, toss.vy, game.bombImg, toss.id, toss.owner);
        }
      }
      // midair bursts hit evil
      if (data.phase === 'round') {
        const foes = game.remotes.filter((r) => r.evil && r.alive && r.hp > 0);
        if (p.evil && p.alive !== false) foes.push(p);
        for (const t of (game.tosses || [])) {
          if (t.landed || t.dead || t.boomed) continue;
          for (const f of foes) {
            const fx = f.pos.x + f.w / 2, fy = f.pos.y + f.h / 2;
            if (Math.abs(t.x - fx) < 40 && Math.abs(t.y - fy) < 50) {
              t.boomed = true; t.landed = true; t.dead = true;
              game.addBoom(t.x, t.y);
              fileSfx(SFX + 'explode.mp3', {});
              if (t.throwerId && t.throwerId === net.id) {
                fetch('/api/bomb', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: net.id, action: 'airburst', x: Math.round(t.x), y: Math.round(t.y) }),
                }).then((r) => r.json()).then((d) => {
                  if (d && d.ok) TW.bombsLeft = Math.min(5, TW.bombsLeft + 1); // midair refund
                }).catch(() => {});
              }
              break;
            }
          }
        }
      }
    }

    function syncAnnouncesAndChat(t) {
      let { p, data, isLMS } = t;
      game.alerts = data.alerts || [];
      // mod announcement
      {
        const fresh = (data.announces || []).filter((a) => (a.age || 99) < 8);
        const top = fresh.length ? fresh[fresh.length - 1].text : '';
        if (top && announceEl.textContent !== top) announceEl.textContent = top;
        announceEl.style.display = top ? 'block' : 'none';
      }
      syncRockets(data);
      // chat log
      for (const m of (data.chat || [])) {
        if (!seenChat.has(m.mid)) {
          seenChat.add(m.mid);
          game.bubbles[m.pid === net.id ? 'me' : m.pid] = { text: String(m.text).slice(0, 60), until: Date.now() + 5000 };
          const line = document.createElement('div');
          line.textContent = `${m.name}: ${String(m.text).slice(0, 60)}`;
          chatLog.appendChild(line);
          while (chatLog.children.length > 30) chatLog.removeChild(chatLog.firstChild);
          chatLog.scrollTop = chatLog.scrollHeight;
        }
      }
      game.showAlerts = !!p.evil;
      game.sneakArrows = !!(p.evil && p.invis);
      game.seeInvis = !!p.evil || p.alive === false;
      game.damageOn = !!net.id && (!net.phase || net.phase === 'round');
      game.lmsResist = !!(isLMS && !p.evil && p.alive !== false);
      abilBar.style.display = net.id && p.alive !== false ? 'flex' : 'none';
    }
