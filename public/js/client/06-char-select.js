    // pick lobby
    // slide and run
    const csBox = document.getElementById('charSelect');
    const csName = document.getElementById('csName');
    const csCount = document.getElementById('csCount');
    const csSlotEls = {
      killer: document.getElementById('csKiller'),
      surv: [document.getElementById('csSurv0'),
             document.getElementById('csSurv1'),
             document.getElementById('csSurv2')],
    };
    const EVIL_RUN = ['./Assets/Images/Characters/Killers/EvilLux/run1.png',
                      './Assets/Images/Characters/Killers/EvilLux/run2.png'];
    let selIdx = 0, selectOpen = false, takenMap = {}, csFrame = 0;
    // dev roster
    let devChars = {};
    // nyan cyat dev only
    const KILLER_ROSTER = [
      { id: 'evil', name: 'EVIL LUX', nameImg: './Assets/Images/UI/CharacterSelect/eluxname.png' },
      { id: 'bear5', name: 'BEAR5', nameImg: CS + 'bear5name.jpeg', dev: true },
    ];
    function visRoster() {
      const list = ROSTER.filter((c) => (net.mod || !devChars[c.id]));
      return list.length ? list : ROSTER.slice(0, 1);
    }
    function visKillerRoster() {
      return KILLER_ROSTER.filter((c) => !c.dev || net.mod);
    }
    // preview blurbs, true to kit
    let CHAR_INFO = {};
    fetch('./chars.txt').then((r) => r.text()).then((txt) => {
      // section per id, # comments
      let cur = null;
      for (const raw of txt.split('\n')) {
        const line = raw.trim();
        if (!line || line[0] === '#') continue;
        const sec = line.match(/^\[(.+)\]$/);
        if (sec) { cur = sec[1].trim(); CHAR_INFO[cur] = { desc: '', moves: [], passive: '' }; continue; }
        if (!cur) continue;
        const [k, ...rest] = line.split(':');
        const v = rest.join(':').trim();
        if (k.trim() === 'desc') CHAR_INFO[cur].desc = v;
        else if (k.trim() === 'passive') CHAR_INFO[cur].passive = v;
        else if (k.trim() === 'move') {
          const parts = v.split('|').map((s) => s.trim());
          if (parts.length >= 3) CHAR_INFO[cur].moves.push([parts[0], parts[1], parts.slice(2).join('|')]);
        }
      }
      if (selectOpen) renderSelect(); // fill preview now
    }).catch(() => {}); // no cards, game goes on
    let revealUntil = 0; // reveal timer
    let selectClosedAt = 0, closeToken = 0;
    let openStreak = 0, closeStreak = 0, revealedRound = null;
    const csFade = document.getElementById('csFade');
    function showSelect(open, why, handoff) {
      if (open === selectOpen) return;
      if (open && Date.now() - selectClosedAt < 3000) return; // no flicker
      selectOpen = open;
      game.moveLock = open;
      const mine = ++closeToken; // dead fade
      console.log(`[select] ${open ? 'OPEN' : 'CLOSE'} (${why || '?'})`);
      if (open) {
        // sync fade
        csFade.style.opacity = '0';
        csBox.style.display = 'block';
        csBox.classList.remove('cs-hide');
      } else {
        // fade style
        selectClosedAt = Date.now();
        const mine = closeToken;
        const black = handoff === true;
        if (black) csFade.style.opacity = '1';
        setTimeout(() => {
          if (mine !== closeToken) return; // newest wins
          csBox.style.display = 'none';
          csBox.classList.add('cs-hide');
          if (black) csFade.style.opacity = '0';
        }, black ? 600 : 1000);
      }
    }
    // slot cache
    const slotCache = { killer: null, s0: null, s1: null, s2: null };
    // keep spots
    const slotAssign = []; // survivor ids
    function fillSlot(el, key, charId, name) {
      // empty slots
      const sig = charId ? `${charId}:${name}` : '';
      if (slotCache[key] === sig) return false; // skip same
      slotCache[key] = sig;
      el.innerHTML = '';
      if (!charId) return true;
      const img = document.createElement('img');
      img.className = 'cs-run cs-enter'; // slide in
      img.alt = name;
      const tag = document.createElement('span');
      tag.className = 'cs-tag';
      tag.textContent = name;
      el.appendChild(img);
      el.appendChild(tag);
      el._runChar = charId;
      el._runImg = img;
      return true;
    }
    function runFrameFor(charId, evil) {
      if (evil) return charId === 'bear5' ? bear5Image.src : EVIL_RUN[csFrame % EVIL_RUN.length];
      if (charId === 'supersonic') charId = 'sonic'; // disguised in select
      const set = charSprites[charId];
      let run = set && set.run && set.run[csFrame % set.run.length];
      if (!run || !run.complete || !run.naturalWidth) {
        run = set && set.idle && set.idle[0];
      }
      return run && run.complete && run.naturalWidth ? run.src : null;
    }
    function renderLobby(players, killerId) {
      // pick order
      for (let i = slotAssign.length - 1; i >= 0; i--) {
        if (!players[slotAssign[i]]) slotAssign.splice(i, 1);
      }
      for (const id of Object.keys(players || {})) {
        if (id === killerId) continue;
        const ch = players[id].char;
        if (!ch || ch === 'evil') continue; // killer slot
        if (!slotAssign.includes(id)) slotAssign.push(id);
      }
      let si = 0;
      for (const id of slotAssign) {
        if (si >= 3) break;
        if (id === killerId) continue;
        const pl = players[id];
        if (!pl || !pl.char || pl.char === 'evil') continue;
        fillSlot(csSlotEls.surv[si], `s${si}`, pl.char, pl.name);
        si++;
      }
      // overflow count
      const extra = slotAssign.filter((id) => {
        const pl = players[id];
        return id !== killerId && pl && pl.char && pl.char !== 'evil';
      }).length - 3;
      const lastTag = csSlotEls.surv[2].querySelector('.cs-tag');
      if (lastTag) {
        lastTag.textContent = lastTag.textContent.replace(/ \+\d+!!$/, '');
        if (extra > 0) lastTag.textContent += ` +${extra}!!`;
      }
      for (; si < 3; si++) fillSlot(csSlotEls.surv[si], `s${si}`, null);
      // killer only, picked faces only
      const kp = killerId && players[killerId];
      if (kp && kp.killer_char) {
        const kName = kp.killer_char === 'bear5' ? 'BEAR5' : 'EVIL LUX'; // say who
        fillSlot(csSlotEls.killer, 'killer', kp.killer_char, `${kName} - ${kp.name}`);
      } else fillSlot(csSlotEls.killer, 'killer', null);
    }
    function renderSelect() {
      // pick bar
      const killerPicker = !!net.amKillerElect;
      const vis = killerPicker ? visKillerRoster() : visRoster();
      selIdx = ((selIdx % vis.length) + vis.length) % vis.length;
      const cur = vis[selIdx];
      const csNameText = document.getElementById('csNameText');
      if (killerPicker && !cur.nameImg) {
        csName.style.display = 'none';
        csNameText.style.display = '';
        csNameText.textContent = cur.name;
      } else {
        csName.style.display = '';
        csNameText.style.display = 'none';
        if (csName.dataset.char !== cur.id) {
          csName.dataset.char = cur.id;
          csName.src = cur.nameImg;
          csName.alt = cur.name;
        }
      }
      // preview card
      const info = CHAR_INFO[cur.id];
      const prevInfo = document.getElementById('csPrevInfo');
      if (prevInfo && prevInfo.dataset.char !== cur.id) {
        prevInfo.dataset.char = cur.id;
        const lines = info ? [`${info.desc}`] : [];
        if (info) for (const [k, n, d] of info.moves) lines.push(`${k} ${n} - ${d}`);
        if (info && info.passive) lines.push(`* ${info.passive}`);
        prevInfo.innerHTML = '';
        for (const ln of lines) {
          const div = document.createElement('div');
          div.textContent = ln;
          prevInfo.appendChild(div);
        }
      }
      const evilLocked = !!(game.player && game.player.evil) || net.phase === 'round';
      document.getElementById('csLeft').style.display = evilLocked ? 'none' : '';
      document.getElementById('csRight').style.display = evilLocked ? 'none' : '';
      csName.style.visibility = evilLocked ? 'hidden' : '';
      csNameText.style.visibility = evilLocked ? 'hidden' : '';
    }
    function browseSelect(dir) {
      const vis = net.amKillerElect ? visKillerRoster() : visRoster();
      selIdx = (selIdx + dir + vis.length) % vis.length;
      renderSelect();
      fileSfx(SFX + 'Character_advance.wav', {});
    }
    function lockPick() {
      if (net.phase !== 'select') return; // select only
      if (game.player && game.player.evil) return; // killers skip
      const killerPicker = !!net.amKillerElect;
      const vis = killerPicker ? visKillerRoster() : visRoster();
      const cur = vis[((selIdx % vis.length) + vis.length) % vis.length];
      fetch('/api/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: net.id, char: cur.id, role: killerPicker ? 'killer' : 'survivor' }),
      }).then((r) => r.json()).then((d) => {
        if (d && d.ok) {
          if (killerPicker) net.killerPick = cur.id;
          else net.pick = cur.id;
          fileSfx(SFX + 'character_selection.wav', {});
          if (!killerPicker && !game.player.evil) wearChar(cur.id === 'supersonic' && !SS.transformed ? 'sonic' : cur.id);
        }
      }).catch(() => {});
    }
    document.getElementById('csLeft').addEventListener('click', () => { if (selectOpen) browseSelect(-1); });
    document.getElementById('csRight').addEventListener('click', () => { if (selectOpen) browseSelect(1); });
    window.addEventListener('keydown', (e) => {
      if (!selectOpen || e.repeat) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // typing guard
      if (e.key === 'ArrowLeft') { e.preventDefault(); browseSelect(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); browseSelect(1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lockPick(); }
    });
    // lobby runners
    setInterval(() => {
      if (!selectOpen) return;
      csFrame = csFrame + 1; // full run cycles
      const paint = (el) => {
        if (!el || !el._runImg) return;
        const src = runFrameFor(el._runChar, el === csSlotEls.killer);
        if (src) {
          if (el._runImg.src !== src) el._runImg.src = src;
          el._runImg.style.display = '';
        } else {
          // fallback: colored placeholder
          el._runImg.style.display = 'none';
          if (!el._placeholder) {
            el._placeholder = document.createElement('div');
            el._placeholder.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;font-size:24px;background:#444';
            el._placeholder.textContent = (el._runChar || '?')[0].toUpperCase();
            el.insertBefore(el._placeholder, el._runImg);
          }
          el._placeholder.style.display = 'flex';
        }
      };
      paint(csSlotEls.killer);
      for (const el of csSlotEls.surv) paint(el);
      // preview idle animation
      const prevImg = document.getElementById('csPrevImg');
      if (prevImg) {
        const killerPicker = !!net.amKillerElect;
        const vis = killerPicker ? visKillerRoster() : visRoster();
        const cur = vis[((selIdx % vis.length) + vis.length) % vis.length];
        const face = cur.id === 'supersonic' ? 'sonic' : cur.id;
        const set = cur.id === 'evil' ? evilSprites : (charSprites[face] || luxSprites);
        const seq = (set.idle && (Array.isArray(set.idle) ? set.idle : [set.idle])) || [];
        const fr = seq[Math.floor(csFrame / 3) % Math.max(1, seq.length)];
        const src = fr && fr.complete && fr.naturalWidth ? fr.src : null;
        if (src) {
          if (prevImg.getAttribute('src') !== src) prevImg.src = src;
          prevImg.style.display = '';
        } else {
          prevImg.style.display = 'none';
        }
      }
    }, 180);
