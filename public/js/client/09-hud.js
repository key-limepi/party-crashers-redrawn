    // evil kit
    // weak pull
    // wound ticking ropes
    const PULL_RANGE = 350;
    const EVIL_HP = 220;
    const SHADOW_MARIO_HP = 300;
    const SHADOW_MARIO_DRAW_W = 46, SHADOW_MARIO_DRAW_H = 64;
    const EVIL_SPEED = 300;
    const SHADOW_MARIO_SPEED = EVIL_SPEED * 1.5;
    const SHADOW_MIMIC_SPEED = { sonic: 270, supersonic: 270, nyan: 300 };
    const EVIL_SNEAK_SPEED = 430;
    // lms buffs
    const LMS_HP = 150; // more health
    const LMS_CD = 0.6; // faster cds
    const K = {
      spikeCD: 0, sneakCD: 0, pullCD: 0, rushCD: 0, m1CD: 0, m1ok: true,
      invisUntil: 0, penaltyUntil: 0, pullUntil: 0, pullHit: false, pullWindup: 0,
      pullTarget: null, pullCastAt: 0, pullDamage: 0, pullPending: 0, pullSequence: 0, pullEnding: false, pullLastHitAt: 0,
      windupUntil: 0, chargeUntil: 0, charging: false,
    };
    const trippedIds = new Set(); // used spikes
    const seenSpikes = new Set(); // watched spikes
    const bombPos = {}; // last seen spots
    const abilBar = document.getElementById('abilities');
    // party list
    const partyList = document.getElementById('partyList');
    const CHAR_ICON = {
      lux: './Assets/Images/UI/luxicon.png',
      toko: './Assets/Images/UI/tokoicon.png',
      sonic: './Assets/Images/UI/sonicicon.png',
      supersonic: './Assets/Images/UI/supersonicicon.jpg',
      tails: './Assets/Images/UI/tailsicon.png',
      nyan: './Assets/Images/UI/nyanicon.png',
      mario: './Assets/Images/UI/marioicon.png',
      noelle: './Assets/Images/UI/noelle_icon.PNG',
    };
    function renderParty(self, p, others, killerId) {
      partyList.innerHTML = '';
      // killer spot
      let kx = null, ky = null;
      if (p.evil) {
        kx = p.pos.x + p.w / 2; ky = p.pos.y + p.h / 2;
      } else {
        const ek = game.remotes.find((r) => r.id === killerId && r.alive && r.hp > 0);
        if (ek && !ek.invis) { kx = ek.pos.x + ek.w / 2; ky = ek.pos.y + ek.h / 2; }
      }
      const chasedAt = (x, y) => kx !== null && Math.hypot(kx - x, ky - y) < 260;
      const add = (name, char, hp, maxhp, shield, alive, me, evil, x, y) => {
        const row = document.createElement('div');
        row.className = 'pRow' + (alive ? '' : ' dead') + (me ? ' me' : '') + (!evil && alive && chasedAt(x, y) ? ' chased' : '') + (char === 'supersonic' ? ' super' : '');
        const img = document.createElement('img');
        img.src = evil ? EVIL + 'idle1.png' : (CHAR_ICON[char] || CHAR_ICON.lux);
        img.alt = '';
        const col = document.createElement('div');
        col.className = 'pCol';
        const tx = document.createElement('span');
        tx.textContent = `${name} ${Math.max(0, Math.ceil(hp || 0) + Math.max(0, shield || 0))}`;
        const bar = document.createElement('div');
        bar.className = 'pBar';
        const fill = document.createElement('div');
        fill.className = 'pFill';
        const sh = Math.max(0, shield || 0);
        const denom = (maxhp || 100) + (sh > 0 ? 50 : 0);
        const frac = Math.max(0, Math.min(1, (hp || 0) / denom));
        fill.style.width = `${Math.round(frac * 100)}%`;
        fill.style.background = (hp || 0) <= 30 ? '#8e0000' : frac > 0.5 ? '#2ed573' : frac > 0.25 ? '#ffa502' : '#8e0000';
        bar.appendChild(fill);
        if (sh > 0) {
          // blue bonus past green
          const blue = document.createElement('div');
          blue.className = 'pFillBlue';
          blue.style.width = `${Math.round(Math.min(1, sh / denom) * 100)}%`;
          blue.style.left = `${Math.round(frac * 100)}%`;
          bar.appendChild(blue);
        }
        col.appendChild(tx);
        col.appendChild(bar);
        row.appendChild(img);
        row.appendChild(col);
        partyList.appendChild(row);
      };
      if (self && !p.evil && self.in_round !== false) add(self.name, self.char === 'supersonic' && !SS.transformed ? 'sonic' : self.char, p.hp, p.maxHp, p.shield || 0, p.alive !== false, true, false, p.pos.x + p.w / 2, p.pos.y + p.h / 2);
      for (const [id, d] of Object.entries(others || {})) {
        if (!d || id === net.id || id === killerId) continue;
        if (d.in_round === false) continue; // round only
        const r = game.remotes.find((r) => r.id === id);
        const rx = r ? r.pos.x + r.w / 2 : 1e9, ry = r ? r.pos.y + r.h / 2 : 1e9;
        add(d.name, d.char === 'supersonic' && !d.super ? 'sonic' : d.char, d.hp, d.maxhp || 100, d.shield || 0, (d.alive ?? d.hp > 0), false, false, rx, ry);
      }
    }
    // spike pips
    const spikeBar = document.getElementById('spikeBar');
    const spikePips = document.getElementById('spikePips');
    const bombBar = document.getElementById('bombBar');
    const bombPips = document.getElementById('bombPips');
    const PIP_FULL = './Assets/Images/UI/spikepip_full.png';
    const PIP_EMPTY = './Assets/Images/UI/spikepip_empty.png';
    for (let i = 0; i < 5; i++) {
      const im = document.createElement('img');
      im.src = PIP_FULL;
      im.alt = '';
      spikePips.appendChild(im);
      const bm = document.createElement('img');
      bm.src = PIP_FULL;
      bm.alt = '';
      bombPips.appendChild(bm);
    }
    // blank slots
    const AB = './Assets/Images/UI/Abilities/';
    const PRAY_EFFECT = {
      grace: '+HEAL',
      haste: '+SPD, +CD',
      shelter: '-SPD, -DMG',
      burden: '-SPD, -CD',
      frailty: '+SPD, +DMG',
    };
    const ABIL_ICONS = {
      hit: null,
      blank: AB + 'ability_blank.png',
      spikes: AB + 'ability_spikes.png',
      sneak: AB + 'ability_sneak.png',
      pull: AB + 'ability_pull.png',
      rush: AB + 'ability_rushdown.png',
      dash: AB + 'ability_dash.png',
      cower: AB + 'ability_cower.png',
      roundhouse: AB + 'ability_roundhouse.png',
      jab: AB + 'ability_jab.png',
      bear5m1: AB + 'blank_bear5m1.png',
      pray: AB + 'icon_pray.png',
      adrenaline: AB + 'blank_adrenneline.png',
      overheal: AB + 'icon_overheal.png',
      peelout: AB + 'icon_peelout.png',
      spindash: AB + 'icon_spindash.png',
      fly: AB + 'icon_fly.png',
      bomb: AB + 'icon_bomb.png',
      whip: AB + 'blank_tailwhip.png',
    };
    let abilDefs = [];
    function buildAbilities() {
      // role icons
      const p = game.player;
      if (!p) return;
      if (p.evil) {
        if (net.killerPick === 'bear5') {
          abilDefs = [{ key: 'Z', name: 'M1', icon: ABIL_ICONS.bear5m1, cd: () => 0 }];
        } else if (net.killerPick === 'shadowmario') {
          abilDefs = [
            { key: 'X', name: 'SLAM', icon: ABIL_ICONS.blank, cd: () => SM.slamCD },
            { key: 'C', name: 'MIMIC', icon: ABIL_ICONS.blank, cd: () => SM.mimicCD },
            { key: 'V', name: 'DIVE', icon: ABIL_ICONS.blank, cd: () => SM.diveCD },
          ];
        } else {
          abilDefs = [
            { key: 'X', name: 'SPIKES', icon: ABIL_ICONS.spikes, cd: () => K.spikeCD },
            { key: 'C', name: p.invis ? 'CANCEL' : 'SNEAK', icon: ABIL_ICONS.sneak, cd: () => K.sneakCD },
            { key: 'V', name: 'PULL', icon: ABIL_ICONS.pull, cd: () => K.pullCD },
            { key: 'B', name: 'RUSH', icon: ABIL_ICONS.rush, cd: () => K.rushCD },
          ];
          if (isNyan()) abilDefs.push({ key: 'N', name: 'ROCKET', icon: null, cd: () => NY.rocketCD });
        }
      } else if (isNyan()) {
        abilDefs = [
          { key: 'Z', name: 'ROCKET', icon: null, cd: () => NY.rocketCD },
          { key: 'X', name: 'RAINBOW DASH', icon: ABIL_ICONS.dash, cd: () => NY.dashCD },
        ];
      } else if (isToko()) {
        abilDefs = [
          { key: 'Z', name: 'ROUNDHOUSE', icon: ABIL_ICONS.roundhouse, cd: () => T.kickCD },
          { key: 'X', name: 'JAB', icon: ABIL_ICONS.jab, cd: () => T.jabCD },
        ];
      } else if (isSonic()) {
        abilDefs = [
          { key: 'Z', name: 'PEELOUT', icon: ABIL_ICONS.peelout, cd: () => SN.peelCD },
          { key: 'X', name: 'SPINDASH', icon: ABIL_ICONS.spindash, cd: () => SN.spinCD },
        ];
      } else if (isSuper()) {
        // pre-glow, only one move
        abilDefs = SS.transformed ? [
          { key: 'Z', name: 'BOOST', icon: ABIL_ICONS.rush, cd: () => SS.boostCD },
          { key: 'X', name: 'BLOCK', icon: ABIL_ICONS.cower, cd: () => SS.blockCD },
          { key: 'C', name: 'SPINDASH', icon: ABIL_ICONS.spindash, cd: () => SS.spinCD },
        ] : [
          { key: 'Z', name: 'TRANSFORM', icon: null, cd: () => 0 },
        ];
      } else if (isTails()) {
        abilDefs = [
          { key: 'Z', name: 'FLY', icon: ABIL_ICONS.fly, cd: () => TW.flyCD },
          { key: 'X', name: 'BOMB', icon: ABIL_ICONS.bomb, cd: () => TW.bombCD },
          { key: 'C', name: 'WHIP', icon: ABIL_ICONS.whip, cd: () => TW.whipCD },
        ];
      } else if (isMario()) {
        abilDefs = [
          { key: 'Z', name: 'DIVE', icon: null, cd: () => MU.diveCD },
          { key: 'X', name: 'SPIN', icon: null, cd: () => MU.spinCD },
        ];
      } else if (isNoelle()) {
        abilDefs = [
          { key: 'Z', name: 'ICEWALL', icon: null, cd: () => NW.icewallCD },
          { key: 'X', name: 'SLEEPMIST', icon: null, cd: () => Math.max(NW.sleepmistCD, NW.mistUntil) },
        ];
      } else {
        abilDefs = [
          { key: 'Z', name: 'PRAY', icon: ABIL_ICONS.pray, cd: () => L.prayCD },
          { key: 'X', name: 'ADRENALINE', icon: ABIL_ICONS.adrenaline, cd: () => L.adCD },
          { key: 'C', name: 'PATCH', icon: ABIL_ICONS.overheal, cd: () => L.overCD },
        ];
      }
      abilBar.innerHTML = '';
      for (const d of abilDefs) {
        const slot = document.createElement('div');
        slot.className = 'abSlot';
        const img = document.createElement('img');
        img.src = d.icon || ABIL_ICONS.blank;
        img.alt = d.name;
        slot.appendChild(img);
        const cd = document.createElement('span');
        cd.className = 'abCd';
        slot.appendChild(cd);
        const label = document.createElement('span');
        label.className = 'abName';
        label.textContent = `${bindLabel(game.input, d.key)} ${d.name}`;
        slot.appendChild(label);
        d.el = slot;
        d.cdEl = cd;
        abilBar.appendChild(slot);
      }
    }
    // evil form
    function applyRole(evil) {
      const p = game.player;
      p.evil = evil;
      if (evil) {
        const bear = net.killerPick === 'bear5';
        const shadowMario = net.killerPick === 'shadowmario';
        p.char = bear ? 'bear5' : shadowMario ? 'shadowmario' : 'evil';
        game.setPlayerSprites(bear ? bear5Sprites : shadowMario ? shadowMarioSprites : evilSprites);
        p.drawW = bear ? 76 : shadowMario ? SHADOW_MARIO_DRAW_W : 50;
        p.drawH = bear ? 94 : shadowMario ? SHADOW_MARIO_DRAW_H : 70;
        p.maxHp = bear ? 999 : shadowMario ? SHADOW_MARIO_HP : EVIL_HP;
        p.hp = p.maxHp;
        p.maxJumps = 2;
        game.moveSpeed = bear ? 820 : shadowMario ? SHADOW_MARIO_SPEED : EVIL_SPEED; // killer speed
        // bear5 fast no fly
        game.fly = false;
        game.noclip = false;
        game.spawn = { x: game.evilSpawn.x, y: game.evilSpawn.y }; // far spawn
      } else {
        p.char = net.pick || 'lux';
        wearChar(net.pick === 'supersonic' ? 'sonic' : net.pick); // plain sonic until glow
        p.maxHp = survHp(); p.hp = Math.min(p.hp, p.maxHp);
        p.maxJumps = net.pick === 'nyan' ? 2 : 1;
        game.moveSpeed = (net.pick === 'sonic' || net.pick === 'supersonic') ? 270 : net.pick === 'nyan' ? 300 : 240;
        game.fly = false; game.noclip = false;
        game.spawn = { x: 100, y: 880 };
        p.invis = false; p.rooted = false; p.chargeDir = 0;
        K.charging = false;
        game.pullSrc = null;
      }
      abilBar.style.display = 'none'; // phase icons
    }
    let abilRole = '';
    function abilTick() {
      // cooldown overlay
      const now = Date.now();
      const p = game.player;
      if (!p || !net.id) return;
      const role = p.evil ? (net.killerPick === 'bear5' ? 'bear5' : net.killerPick === 'shadowmario' ? 'shadowmario' : 'evil') : (isNyan() ? 'nyan' : isToko() ? 'toko' : (isSonic() ? 'sonic' : (isSuper() ? (SS.transformed ? 'super' : 'super0') : (isTails() ? 'tails' : (isMario() ? 'mario' : (isNoelle() ? 'noelle' : 'lux'))))));
      if (role !== abilRole) {
        abilRole = role;
        buildAbilities();
      }
      for (const d of abilDefs) {
        const left = Math.ceil((d.cd() - now) / 1000);
        const cooling = left > 0;
        d.el.classList.toggle('cd', cooling);
        d.cdEl.textContent = cooling ? `${left}` : '';
        if (d.key === 'C' && p.evil) {
          d.el.querySelector('.abName').textContent = `${bindLabel(game.input, 'C')} ${p.invis ? 'CANCEL' : 'SNEAK'}`;
        }
      }
      // lux prayer tag, above abilities
      const prayEl = document.getElementById('prayLabel');
      if (prayEl) {
        if (!p.evil && isLux() && L.prayer && p.alive !== false) {
          prayEl.querySelector('.prayEffect').textContent = PRAY_EFFECT[L.prayer] || '';
          prayEl.querySelector('.prayName').textContent = `prayer of ${L.prayer}`;
          prayEl.style.color = PRAY_COL[L.prayer] || '#fff';
          if (prayEl.style.display !== 'flex') prayEl.style.display = 'flex';
        } else if (prayEl.style.display !== 'none') {
          prayEl.style.display = 'none';
        }
      }
      // trap count
      const showSpikes = !!(p.evil && net.killerPick === 'evil' && p.alive !== false && net.phase === 'round');
      spikeBar.style.display = showSpikes ? 'flex' : 'none';
      if (showSpikes) {
        const trapsLeft = Math.max(0, 5 - (game.spikes ? game.spikes.length : 0));
        [...spikePips.children].forEach((el, i) => {
          const src = i < trapsLeft ? PIP_FULL : PIP_EMPTY;
          if (el.getAttribute('src') !== src) el.src = src;
        });
      }
      // bomb stash
      const showBombs = !!(!p.evil && isTails() && p.alive !== false && net.phase === 'round');
      bombBar.style.display = showBombs ? 'flex' : 'none';
      if (showBombs) {
        const left = Math.max(0, Math.min(5, TW.bombsLeft));
        [...bombPips.children].forEach((el, i) => {
          const src = i < left ? PIP_FULL : PIP_EMPTY;
          if (el.getAttribute('src') !== src) el.src = src;
        });
      }
      // afk button
      afkBtn.style.display = (net.id && net.phase !== 'round') || net.afk ? 'block' : 'none';
    }
    setInterval(() => { if (game.player && net.id) abilTick(); }, 250);
