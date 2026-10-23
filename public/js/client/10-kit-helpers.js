    // pose flashes
    let poseName = null, poseUntil = 0;
    function setPose(name, ms) { poseName = name; poseUntil = Date.now() + ms; }
    // which animation i am playing right now, so everyone else can play it too
    function curAnim(p) {
      const now = Date.now();
      if (p.evil) return K.charging ? 'echarge' : null;
      if (isMario()) {
        if (MU.diveAnimUntil > now) return 'mdive';
        if (MU.spinAnimUntil > now) return 'mspin';
      }
      if (!isSuper() || !SS.transformed) return null;
      if (SS.boostWindup && now < SS.boostWindup) return 'sskid';
      if (SS.boosting) return 'sboost';
      if (SS.wasBlocking && (p.cowerT || 0) > 0) return (2.5 - p.cowerT) < 0.4 ? 'sduck' : 'sguard';
      if (SS.spinWindup && now < SS.spinWindup) return 'sspinw';
      if (SS.spinning) return 'sspin';
      if ((p.stunT || 0) > 0 && p.alive !== false) return 'sstun';
      return null;
    }
    // hit burst, red when the killer hit, blue when a survivor hit. only the two people in the hit see it
    function hitBurst(x, y, big, killerHit) {
      net._hitFxAt = Date.now();
      game.luxGlow(x, y, killerHit ? (big ? '#ff2d3d' : '#ff4757') : '#249bff', big ? 6 : 4, big ? 140 : 120);
    }
    function poseImage(isEvil, char, pose, variant) {
      if (isEvil) {
        if (char === 'bear5') return bear5Image;
        if (char === 'shadowmario') {
          if (pose === 'smmimic') return shadowMarioSprites.mimic[0];
          if (pose === 'smm1') return shadowMarioSprites.spin[0];
          if (pose === 'smslam') return shadowMarioSprites.slam[0];
          if (pose === 'smslamland') return shadowMarioSprites.slam[1];
          if (pose === 'smdive') return shadowMarioSprites.dive;
        }
        if (pose === 'swing') return evilM1[(variant | 0) % evilM1.length];
        if (pose === 'spike') return evilAct.spike;
      } else if (char === 'toko') {
        // kick and jab play their full animation from the flags, so no still frame here
      } else if (char === 'tails') {
        // same for whip and throw
      } else if (char === 'supersonic') {
        if (pose === 'transform') return superSprites.transform[0];
        if (pose === 'boost') return superSprites.boost[0];
        if (pose === 'block') return superSprites.guard;
      } else if (char === 'mario') {
        if (pose === 'dive') return marioSprites.dive;
        if (pose === 'spin') return marioSprites.spin[0];
      } else if (char === 'noelle') {
        if (pose === 'icewall' || pose === 'sleepmist') {
          const frames = noelleSprites.icewall || [];
          return frames.length ? frames[0] : null;
        }
      } else {
        if (pose === 'dash') return luxDash;
      }
      return null;
    }
    // clear evil
    function clearEvil(p) {
      p.invis = false; p.rooted = false; p.chargeDir = 0; p.chargeSpeed = 0;
      p.cowerT = 0; p.cowering = false; p.stunT = 0;
      p.peeling = false; p.spinning = false; p.spinWindup = false;
      p.luxFloat = 0;
      p.lift = false; p.dashing = false; p.pull = false; p.pullwindup = false;
      p.windupUntil = false; p.kickUntil = false; p.jabUntil = false;
      p.whipUntil = false; p.throwUntil = false;
      p.fatigue = 0; p.actionT = 0; p._wore = null;
      game.moveSpeed = 240; // base speed
      K.charging = false; K.pullUntil = 0; K.pullWindup = 0; K.pullTarget = null; K.pullEnding = false;
      K.pullDamage = 0; K.pullPending = 0; K.pullCastAt = 0; K.pullLastHitAt = 0; K.pullSequence++;
      K.windupUntil = 0;
      K.spikeCD = 0; K.sneakCD = 0; K.pullCD = 0; K.rushCD = 0; K.m1CD = 0;
      K.penaltyUntil = 0; K.invisUntil = 0; K.pullHit = false;
      S.windupUntil = 0; S.dashing = false;
      S.dashCD = 0; S.cowerCD = 0; S.dashUntil = 0; S.dashHit = false;
      S.countered = false; S.wasCowering = false; S.dashTouching = false;
      L.prayCD = 0; L.prayUntil = 0;
      L.prayer = PRAYERS[Math.floor(Math.random() * PRAYERS.length)]; // born blessed
      L.adCD = 0; L.adUntil = 0; L.pantUntil = 0; L.rushing = false; L.panting = false;
      L.overCD = 0; L.overBusy = false; L.dt = 1; L.heal = 1; L.tier = 0;
      p.praying = false; p.rushing = false; p.panting = false;
      T.kickUntil = 0; T.jabUntil = 0;
      T.kickCD = 0; T.jabCD = 0; T.kickHit = false; T.jabHit = false;
      MU.diveCD = 0; MU.diveUntil = 0; MU.diveAnimUntil = 0; MU.diveHit = false; MU.diveDir = 0;
      MU.spinCD = 0; MU.spinUntil = 0; MU.spinAnimUntil = 0; MU.spinHit = false; MU.spinUsed = false;
      SM.mimic = null; SM.mimicTarget = null; SM.mimicUntil = 0;
      SM.m1CD = 0; SM.slamCD = 0; SM.slamActive = false; SM.slamStartedAt = 0; SM.slamAirborne = false;
      SM.slamHitIds.clear(); SM.slamRecoveryUntil = 0;
      SM.mimicCD = 0; SM.diveCD = 0; SM.diving = false; SM.diveUntil = 0; SM.diveHit = false; SM.divePrevX = null; SM.divePrevY = null;
      SM.diveRecoveryUntil = 0;
      SN.windupUntil = 0; SN.peelUntil = 0; SN.peeling = false;
      SN.spinWindup = 0; SN.spinUntil = 0; SN.spinning = false;
      SN.peelCD = 0; SN.spinCD = 0; SN.spinHits = 0; SN.spinTouching = false;
      SN.spinHitCD = 0; SN.dir = 0;
      SS.transformed = false; SS.formUntil = 0;
      SS.boostCD = 0; SS.boostWindup = 0; SS.boostUntil = 0; SS.boosting = false;
      SS.blockCD = 0; SS.wasBlocking = false;
      SS.spinCD = 0; SS.spinWindup = 0; SS.spinUntil = 0; SS.spinning = false;
      p.superFly = false;
      SS.formUntil = 0; SS.focusUntil = 0;
      p.tremble = false; p.rainbow = false; p.whiteFlash = false; p.pulseWhite = false;
      sneakLoop.stop();
      TW.flying = false; TW.flyLeft = 0; TW.whipUntil = 0; TW.holding = false; TW.whipHit = false;
      p.holdingBomb = false;
      p.sneakColor = null;
      TW.bombCD = 0; TW.flyCD = 0; TW.whipCD = 0; TW.throwUntil = 0; TW.bombsLeft = 5; flyLoop.stop();
      NY.rocketCD = 0; NY.dashCD = 0; NY.dashUntil = 0; NY.dashing = false; NY.dashHit = false;
      NW.icewallCD = 0; NW.sleepmistCD = 0; NW.mistUntil = 0; NW.speedBurstUntil = 0; NW.rootUntil = 0; NW.icewallActive = false; NW.triggeredWalls.clear();
      p.taxiFly = false;
      p.rooted = false;
      p.actionImg = null;
      p.mario3dAction = null;
      game.pullSrc = null; game.peelSrc = null; game.liftSrc = null;
    }
    // survivor kit
    // hit or whiff
    const S = {
      dashCD: 0, cowerCD: 0, windupUntil: 0,
      dashUntil: 0, dashing: false, dashHit: false,
      countered: false, wasCowering: false,
    };
    // lux lightshard kit
    const L = {
      prayCD: 0, prayUntil: 0, prayer: null,
      adCD: 0, adUntil: 0, pantUntil: 0, rushing: false, panting: false, adDir: 0,
      overCD: 0, overBusy: false,
      dt: 1, heal: 1, tier: 0,
    };
    const PRAYERS = ['grace', 'haste', 'shelter', 'burden', 'frailty'];
    const PRAY_COL = { grace: '#ffe93b', haste: '#ffa502', shelter: '#00e5ff', burden: '#c084fc', frailty: '#ff4757' };
    const PRAY_SPD = { grace: 0.9, haste: 1.25, shelter: 0.85, burden: 0.8, frailty: 1.15 };
    const T = {
      kickCD: 0, jabCD: 0, kickUntil: 0, kickHit: false,
      jabUntil: 0, jabHit: false,
    };
    // mario dive and spin kit
    const MU = {
      diveCD: 0, diveUntil: 0, diveAnimUntil: 0, diveHit: false, diveDir: 0,
      spinCD: 0, spinUntil: 0, spinAnimUntil: 0, spinHit: false, spinUsed: false,
    };
    const SM = {
      mimic: null, mimicTarget: null, mimicUntil: 0,
      m1CD: 0, slamCD: 0, slamActive: false, slamStartedAt: 0, slamAirborne: false,
      slamHitIds: new Set(), slamRecoveryUntil: 0,
      mimicCD: 0, diveCD: 0, diving: false, diveUntil: 0, diveHit: false, divePrevX: null, divePrevY: null,
      diveRecoveryUntil: 0,
    };
    game.onUpdate = () => {
      const player = game.player;
      const survivors = game.remotes.filter((b) => !b.evil && b.alive && b.hp > 0);
      if (player && !player.evil && player.alive !== false) survivors.push(player);
      const bears = game.remotes.filter((b) => b.evil && b.char === 'bear5');
      if (player && player.evil && player.char === 'bear5') bears.push(player);
      const now = performance.now();
      for (const bear of bears) {
        const vx = bear.vel?.x || 0;
        let vy = bear.vel?.y || 0;
        if (bear !== player) {
          const elapsed = Math.max(0.001, (now - (bear._bearMotionAt || now)) / 1000);
          vy = ((bear.pos.y || 0) - (bear._bearMotionY ?? bear.pos.y)) / elapsed;
          bear._bearMotionAt = now;
          bear._bearMotionY = bear.pos.y;
        }
        const speed = Math.hypot(vx, vy);
        const moving = Math.min(1, speed / 1050);
        const pulse = Math.sin((bear.animTime || 0) * 22);
        const rising = Math.min(1, Math.max(0, -vy / 1300));
        const falling = Math.min(1, Math.max(0, vy / 1300));
        bear.bearDrawScaleX = 1 + moving * (0.22 + pulse * 0.14) + falling * 0.16;
        bear.bearDrawScaleY = 1 - moving * (0.12 + pulse * 0.08) + rising * 0.22 - falling * 0.1;
        bear.bearDrawAngle = Math.max(-0.22, Math.min(0.22, vx / 1500 * 0.18 - vy / 2000 * 0.12));
        bear.bearFold = 0;
        if ((bear._bearFoldUntil || 0) > Date.now()) {
          let target = null, nearest = Infinity;
          for (const survivor of survivors) {
            const dx = survivor.pos.x + survivor.w / 2 - (bear.pos.x + bear.w / 2);
            const dy = survivor.pos.y + survivor.h / 2 - (bear.pos.y + bear.h / 2);
            const distance = Math.hypot(dx, dy);
            if (distance < nearest) { nearest = distance; target = { dx, dy }; }
          }
          if (target) {
            const progress = 1 - (bear._bearFoldUntil - Date.now()) / (bear._bearFoldDuration || 440);
            bear.bearFold = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI);
            bear.bearFoldX = Math.sign(target.dx || bear.facing || 1) * (bear.facing || 1);
            bear.bearFoldY = Math.max(-1, Math.min(1, target.dy / 120));
            bear.bearFoldReach = Math.min(1, nearest / 150);
          }
        }
        if ((bear === player ? game.fly : bear.trail) && speed > 250 && now - (bear._bearTrailAt || 0) > 60) {
          const img = game._spriteFor(bear);
          if (img && img.complete && img.naturalWidth) {
            const frame = game.frameSize(bear, img);
            game.afterimages.push({
              x: bear.pos.x, y: bear.pos.y, w: bear.w, h: bear.h,
              drawW: frame.dw * (bear.bearDrawScaleX || 1), drawH: frame.dh * (bear.bearDrawScaleY || 1),
              facing: bear.facing, img, age: 0,
            });
            bear._bearTrailAt = now;
          }
        }
      }
    };
    const isToko = () => effChar() === 'toko';
    const isSonic = () => effChar() === 'sonic';
    const isSuper = () => effChar() === 'supersonic';
    const isTails = () => effChar() === 'tails';
    const isMario = () => effChar() === 'mario';
    const isShadowMario = () => !!(game.player && game.player.evil && net.killerPick === 'shadowmario');
    const isNoelle = () => !!(game.player && !game.player.evil && net.pick === 'noelle');
    const isLux = () => !isToko() && !isSonic() && !isSuper() && !isTails() && !isNyan() && !isMario() && !isNoelle();
    const isBear5 = () => !!(game.player && game.player.evil && (net.killerPick === 'bear5' || (game.player.char || '') === 'bear5'));
    // costume counts
    function effChar() {
      if ((net.phase === 'intermission' || net.phase === 'lobby') && net.costume) return net.costume;
      return net.pick || 'lux';
    }
    function lobbyCostume(id) {
      // same face everywhere
      const ids = ['lux', 'toko', 'sonic', 'tails'];
      let h = 0;
      for (const ch of String(id || '')) h = ((h * 31 + ch.charCodeAt(0)) >>> 0);
      return ids[h % ids.length];
    }
    // sonic peelout
    const SN = {
      peelCD: 0, windupUntil: 0, peelUntil: 0, peeling: false,
      spinCD: 0, spinWindup: 0, spinUntil: 0, spinning: false, spinHits: 0, spinTouching: false, spinHitCD: 0,
    };
    // super dev test kit
    const SS = {
      transformed: false, formUntil: 0,
      boostCD: 0, boostWindup: 0, boostUntil: 0, boosting: false, boostTouching: false, boostHitCD: 0,
      blockCD: 0, wasBlocking: false,
      spinCD: 0, spinWindup: 0, spinUntil: 0, spinning: false, spinStart: 0, spinHits: 0, spinTouching: false, spinHitCD: 0, dir: 0, lastX: 0,
    };
    const SUPER_HP = 550; // super health
    const SUPER_SPEED = 360; // super run speed
    // tails kit
    const TW = {
      flyCD: 0, flyLeft: 0, flying: false,
      bombCD: 0, holding: false, throwUntil: 0, bombsLeft: 5,
      whipCD: 0, whipUntil: 0, whipHit: false,
    };
    // nyan dev survivor kit
    const NY = { rocketCD: 0, dashCD: 0, dashUntil: 0, dashing: false, dashHit: false };
    const isNyan = () => effChar() === 'nyan';
    // noelle kit
    const NW = { icewallCD: 0, sleepmistCD: 0, mistUntil: 0, speedBurstUntil: 0, rootUntil: 0, triggeredWalls: new Set(), icewallActive: false };
    const NYAN_HP = 200; // survivor nyan is tanky
    const ROCKET_CD = 7200; // rocket wait
    const NYAN_DASH_CD = 5400; // rainbow dash wait
    const NYAN_DASH_MS = 700; // dash length
    const NYAN_DASH_SPEED = 950;
    const BLAST_RANGE = 1800; // shake falloff range
    // lms/nyan max hp
    const survHp = () => (net.pick === 'nyan' ? NYAN_HP : 100);
    const seenBlasts = new Set();
