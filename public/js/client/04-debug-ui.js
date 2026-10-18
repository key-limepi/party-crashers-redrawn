
    // fullscreen button
    const fsBtn = document.getElementById('fsBtn');
    fsBtn.addEventListener('click', () => {
      const el = document.getElementById('stage'); // game only
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (el.requestFullscreen) {
        el.requestFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', () => {
      fsBtn.textContent = document.fullscreenElement ? 'un-fullscreen!!' : 'go fullscreen!! :D';
    });

    // settings menu
    const setBtn = document.getElementById('setBtn');
    const setBox = document.getElementById('settings');
    const setFx = document.getElementById('setFx');
    const setVoice = document.getElementById('setVoice');
    const setFlash = document.getElementById('setFlash');
    const setShake = document.getElementById('setShake');
    const setClose = document.getElementById('setClose');
    const setMus = document.getElementById('setMus');
    const setSfx = document.getElementById('setSfx');
    const setVvl = document.getElementById('setVvl');
    if (setBtn && setBox && setFx && setVoice && setFlash && setShake && setMus && setSfx && setVvl) {
      // skip if settings missing
      let settings = { fx: true, voice: true, flash: true, shake: true, mus: 68, sfx: 50, vvl: 100 };
      try { Object.assign(settings, JSON.parse(localStorage.getItem('pc_settings') || '{}')); } catch (_) { /* fresh!! */ }
      const applySettings = () => {
        window.FX_ON = settings.fx !== false;
        window.VOICE_ON = settings.voice !== false;
        window.FLASH_ON = settings.flash !== false;
        window.SHAKE_ON = settings.shake !== false;
        window.MUS_VOL = Math.max(0, Math.min(100, +settings.mus || 0));
        window.SFX_VOL = Math.max(0, Math.min(100, +settings.sfx || 0));
        window.VVL_VOL = Math.max(0, Math.min(100, +settings.vvl || 0));
        setFx.checked = window.FX_ON;
        setVoice.checked = window.VOICE_ON;
        setFlash.checked = window.FLASH_ON;
        setShake.checked = window.SHAKE_ON;
        setMus.value = window.MUS_VOL;
        setSfx.value = window.SFX_VOL;
        setVvl.value = window.VVL_VOL;
        try { localStorage.setItem('pc_settings', JSON.stringify(settings)); } catch (_) { /* full!! */ }
      };
      applySettings();
      setBtn.addEventListener('click', () => {
        setBox.style.display = setBox.style.display === 'block' ? 'none' : 'block';
      });
      if (setClose) setClose.addEventListener('click', () => {
        setBox.style.display = 'none';
      });
      setFx.addEventListener('change', () => { settings.fx = setFx.checked; applySettings(); });
      setVoice.addEventListener('change', () => { settings.voice = setVoice.checked; applySettings(); });
      setFlash.addEventListener('change', () => { settings.flash = setFlash.checked; applySettings(); });
      setShake.addEventListener('change', () => { settings.shake = setShake.checked; applySettings(); });
      setMus.addEventListener('input', () => { settings.mus = +setMus.value; applySettings(); });
      setSfx.addEventListener('input', () => { settings.sfx = +setSfx.value; applySettings(); });
      setVvl.addEventListener('input', () => { settings.vvl = +setVvl.value; applySettings(); });

      // keybinds
      const keyList = document.getElementById('keyList');
      const keyReset = document.getElementById('keyReset');
      const input = game.input;
      if (keyList && input) {
        let waiting = null; // action awaiting a key
        const renderKeys = () => {
          keyList.innerHTML = '';
          for (const act of BIND_ORDER) {
            const row = document.createElement('div');
            row.className = 'setRow';
            const name = document.createElement('span');
            name.textContent = `${BIND_NAMES[act]}!!`;
            row.appendChild(name);
            const group = document.createElement('span');
            group.className = 'keyGroup';
            for (const k of input.keys[act]) {
              const chip = document.createElement('button');
              chip.className = 'keyChip';
              chip.textContent = keyLabel(k);
              chip.title = 'click to remove';
              chip.addEventListener('click', () => {
                input.clearBind(act, k);
                buildAbilities();
                renderKeys();
              });
              group.appendChild(chip);
            }
            const add = document.createElement('button');
            add.className = waiting === act ? 'keyAdd waiting' : 'keyAdd';
            add.textContent = waiting === act ? 'press a key' : '+';
            add.title = 'add another key';
            add.addEventListener('click', () => {
              waiting = waiting === act ? null : act;
              input.capturing = !!waiting; // pause game keys
              if (waiting) input.left = input.right = input.down = input.jump = false;
              renderKeys();
            });
            group.appendChild(add);
            row.appendChild(group);
            keyList.appendChild(row);
          }
        };
        const stopCapture = () => {
          waiting = null;
          input.capturing = false;
          renderKeys();
        };
        // grab the next key
        window.addEventListener('keydown', (e) => {
          if (!waiting) return;
          e.preventDefault();
          e.stopPropagation();
          const act = waiting;
          waiting = null;
          input.capturing = false;
          if (e.key !== 'Escape' && !e.repeat) input.addBind(act, e.key);
          buildAbilities();
          renderKeys();
        }, true);
        if (setClose) setClose.addEventListener('click', stopCapture);
        setBtn.addEventListener('click', stopCapture);
        // click away cancels
        document.addEventListener('pointerdown', (e) => {
          if (waiting && !(e.target.closest && e.target.closest('#settings'))) stopCapture();
        });
        if (keyReset) keyReset.addEventListener('click', () => {
          input.resetBinds();
          buildAbilities();
          renderKeys();
        });
        renderKeys();
      }
    }

    // mod menu
    const debugBox = document.getElementById('debug');
    const readout = document.getElementById('readout');
    const wantDebug = new URLSearchParams(location.search).has('debug');
    const dbgClose = document.getElementById('dbgClose');
    if (dbgClose) dbgClose.addEventListener('click', () => {
      game.debug = false;
      debugBox.style.display = 'none';
    });
    for (const h of debugBox.querySelectorAll('.modSec > h3')) {
      h.addEventListener('click', () => h.parentElement.classList.toggle('shut')); // fold group
    }
    function openModMenu() {
      game.debug = true;
      debugBox.style.display = 'block';
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        if (net.id && net.mod) {
          game.debug = !game.debug;
          debugBox.style.display = game.debug ? 'block' : 'none';
        } else {
          sayStatus(`mods only!! click 'show my id' below, paste the formbar id in admins.txt!!`, 5);
        }
      }
    });
    function mod(action, extra) {
      if (!net.id) return;
      fetch('/api/mod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: net.id, action, ...(extra || {}) }),
      }).catch(() => {});
    }
    document.getElementById('hurtBtn').addEventListener('click', () => game.hurtPlayer(10));
    document.getElementById('healBtn').addEventListener('click', () => game.healPlayer(10));
    document.getElementById('spawnBtn').addEventListener('click', () => game.respawn());
    document.getElementById('killMeBtn').addEventListener('click', () => mod('killme'));
    document.getElementById('killAllBtn').addEventListener('click', () => mod('killall'));
    document.getElementById('healAllBtn').addEventListener('click', () => mod('healall'));
    document.getElementById('endSurvBtn').addEventListener('click', () => mod('endround', { winner: 'survivors' }));
    document.getElementById('endKillBtn').addEventListener('click', () => mod('endround', { winner: 'killer' }));
    document.getElementById('skipBtn').addEventListener('click', () => mod('skipwait'));
    document.getElementById('forceBtn').addEventListener('click', () => mod('forcestart'));
    document.getElementById('meEvilBtn').addEventListener('click', () => mod('makekiller', { target: net.id }));
    document.getElementById('randEvilBtn').addEventListener('click', () => mod('makekiller', { target: 'random' }));
    document.getElementById('clearSpikesBtn').addEventListener('click', () => mod('clearspikes'));
    document.getElementById('setTimeBtn').addEventListener('click', () => mod('settime', { seconds: parseInt(timeBox.value) || 0 }));
    const flyBtn = document.getElementById('flyBtn');
    const noclipBtn = document.getElementById('noclipBtn');
    const hpBox = document.getElementById('hpBox');
    const devBox = document.getElementById('devBox');
    flyBtn.addEventListener('click', () => {
      if (!net.mod) return;
      game.fly = !game.fly;
      flyBtn.textContent = game.fly ? 'fly: on' : 'fly: off';
    });
    noclipBtn.addEventListener('click', () => {
      if (!net.mod) return;
      game.noclip = !game.noclip;
      noclipBtn.textContent = game.noclip ? 'noclip: on' : 'noclip: off';
    });
    document.getElementById('hpMeBtn').addEventListener('click', () => mod('sethealth', { target: 'me', hp: hpBox.value }));
    document.getElementById('hpAllBtn').addEventListener('click', () => mod('sethealth', { target: 'all', hp: hpBox.value }));
    document.getElementById('devOnBtn').addEventListener('click', () => mod('makedev', { char: devBox.value.trim().toLowerCase() }));
    document.getElementById('devOffBtn').addEventListener('click', () => mod('unmakedev', { char: devBox.value.trim().toLowerCase() }));
    const announceBox = document.getElementById('announceBox');
    const announceEl = document.getElementById('announce');
    document.getElementById('announceBtn').addEventListener('click', () => {
      mod('announce', { text: announceBox.value.trim().slice(0, 120) });
      announceBox.value = '';
    });
    if (new URLSearchParams(location.search).has('debug')) {
      // mod check
      window.__wantDebug = true;
    }
    setInterval(() => {
      if (!game.debug || !game.player) return;
      const p = game.player;
      readout.textContent =
        `hp: ${Math.ceil(p.hp)}/${p.maxHp}\n` +
        `pos: ${Math.round(p.pos.x)}, ${Math.round(p.pos.y)}\n` +
        `vel: ${Math.round(p.vel.x)}, ${Math.round(p.vel.y)}\n` +
        `ground: ${p.onGround ? 'yep!!' : 'nope!!'}\n` +
        `phase: ${net.phase}\n` +
        `mus: map=${beds.map.volume.toFixed(2)} wait=${beds.wait.volume.toFixed(2)} inter=${beds.inter.volume.toFixed(2)} lms=${beds.lms.volume.toFixed(2)} lmslux=${beds.lmslux.volume.toFixed(2)} lmssonic=${beds.lmssonic.volume.toFixed(2)} lmstails=${beds.lmstails.volume.toFixed(2)} lmsnyan=${beds.lmsnyan.volume.toFixed(2)} lmsmario=${beds.lmsmario.volume.toFixed(2)} hero=${beds.hero.volume.toFixed(2)} chase=${beds.chase.volume.toFixed(2)} terror=${beds.terror.volume.toFixed(2)} cs=${beds.charselect.volume.toFixed(2)}`;
    }, 100);

