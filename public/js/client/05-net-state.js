    // needs server
    // die to spectate
    const net = { id: null, timer: null, round: null, phase: null, ping: null, wasEvil: false, retry: null, mod: false, everOnline: false, wasElect: false, fail: 0, killerPick: 'evil' };
    // unique tabs
    let tabId = '';
    for (let i = 0; i < 16; i++) tabId += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    const netStatus = document.getElementById('netStatus');
    let statusUntil = 0; // passing messages
    function sayStatus(text, secs) {
      netStatus.textContent = text;
      netStatus.style.color = ''; // normal color
      statusUntil = secs ? Date.now() + secs * 1000 : 0;
    }
    // loud errors
    const errScreen = document.getElementById('errScreen');
    const errText = document.getElementById('errText');
    function showFatal(text) {
      if (!errScreen) return;
      errText.textContent = text;
      errScreen.classList.add('show');
    }
    function hideFatal() {
      if (!errScreen) return;
      errScreen.classList.remove('show');
    }
    if (errScreen) errScreen.addEventListener('click', hideFatal); // click dismisses
    // warning splash
    (function splash() {
      const el = document.getElementById('splash');
      const title = document.getElementById('titleScreen');
      if (!el) return;
      let gone = false;
      const dismiss = () => {
        if (gone) return;
        gone = true;
        el.classList.add('hide');
        setTimeout(() => { el.style.display = 'none'; }, 1100);
        if (title) title.style.display = 'flex'; // show title
      };
      el.addEventListener('click', dismiss);
      setTimeout(dismiss, 4000);
      // loading tips, true to kit
      const tips = [
        `tip: lux prays (${bindLabel(game.input, 'Z')}) for a random blessing!!`,
        `tip: adrenaline (${bindLabel(game.input, 'X')}) is a 6s sprint, then you pant!!`,
        `tip: patch (${bindLabel(game.input, 'C')}) shares +50 shield among nearby allies!!`,
        'tip: cower counters evil swings!!',
        'tip: watch the floor, spikes bite!!',
        'tip: tails bombs only blow up on evil!!',
        'tip: last one standing heals to full!!',
        'tip: evil sneak hides you for 10s!!',
        'tip: evil pull drags through walls!!',
        'tip: springs bounce you sky high!!',
        'tip: adrenaline ends in a 3s pant, plan the landing!!',
        'tip: patch waits 15s between casts!!',
        'tip: full blue hp still drains away!!',
        'tip: a whiffed toko jab staggers herself!!',
        'tip: sonic revs 3s before peelout!!',
        'tip: spindash ends after 3 hits!!',
        'tip: super block eats stuns!!',
        'tip: tails only carries 5 bombs!!',
        'tip: nyan rockets home in on their mark!!',
        'tip: evil sneak ends in a 4s mute!!',
        'tip: a whiffed evil pull stuns you 3s!!',
        'tip: evil rush needs a 3s windup!!',
        'tip: only 5 spikes fit on the map!!',
        'tip: grace protects you when the round starts!!',
        'tip: lms duels extend the round!!',
        'tip: cower right as evil swings to counter!!',
        'tip: press M to solo music tracks!!',
        'tip: enter opens quick chat!!',
        'tip: its pronounced "LUCKS"!!',
      ];
      let tipIdx = Math.floor(Math.random() * tips.length);
      const tipBar = document.getElementById('tipBar');
      const mapLoadEl = document.getElementById('mapLoad');
      setInterval(() => {
        if (!tipBar || !mapLoadEl || mapLoadEl.style.display === 'none') return;
        tipIdx = (tipIdx + 1) % tips.length;
        tipBar.textContent = tips[tipIdx];
      }, 4000);
      if (tipBar) tipBar.textContent = tips[tipIdx];
      // click connects
      let titleClicked = false;
      if (title) title.addEventListener('click', async () => {
        if (titleClicked) return;
        titleClicked = true;
        const me = await loadMe();
        if (!me.logged_in) { location.href = '/login'; return; } // formbar login
        if (me.needs_pin && !me.has_pin) {
          showPinPrompt();
          sayStatus('enter your digipog pin, then click again!!', 8);
          titleClicked = false;
          return;
        }
        net.titleT0 = Date.now(); // hold loading
        const label = title.querySelector('span');
        if (label) label.innerHTML = 'LOADING!!';
        joinOnline();
      });
    })();
    function netError(text, secs) {
      netStatus.textContent = text;
      netStatus.style.color = '#ff4757';
      statusUntil = Date.now() + (secs || 10) * 1000;
      showFatal(text);
    }
    window.addEventListener('error', (e) => {
      try { netError(`uh oh!! ${String((e && e.message) || 'something broke').slice(0, 80)}`, 10); } catch (_) { /* too broken!! */ }
    });
    window.addEventListener('unhandledrejection', () => {
      try { netError('uh oh!! a request failed, refresh if stuck!!', 10); } catch (_) { /* too broken!! */ }
    });
    // account shop
    const pinRow = document.getElementById('pinRow');
    const pinBanner = document.getElementById('pinBanner');
    const pinBox = document.getElementById('pinBox');
    const malicePanel = document.getElementById('malicePanel');
    const maliceNum = document.getElementById('maliceNum');
    const buyMaliceBtn = document.getElementById('buyMaliceBtn');
    async function loadMe() {
      net.me = await (await fetch('/api/me')).json();
      return net.me;
    }
    function showPinPrompt() {
      pinRow.style.display = 'flex';
      pinBanner.style.display = 'flex';
      pinBox.focus();
    }
    async function savePin() {
      // malice/round mode verifies
      if (pinMode === 'malice' || pinMode === 'round') {
        if (pinMode === 'round') {
          const res = await fetch('/api/pin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: net.id, pin: pinBox.value.trim() }),
          });
          const out = await res.json().catch(() => ({}));
          pinBox.value = '';
          pinRow.style.display = 'none';
          pinBanner.style.display = 'none';
          pinMode = 'save';
          document.getElementById('pinRememberLabel').style.display = '';
          pinBanner.querySelector('.pinPrompt > span').textContent = 'ENTER YOUR PIN!!';
          sayStatus(out.ok ? 'joining next match!! -15 digipogs' : (out.reason || 'could not join!!'), 5);
          return;
        }
        const res = await fetch('/api/malice/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: net.id, pin: pinBox.value.trim() }),
        });
        const out = await res.json();
        pinBox.value = '';
        pinRow.style.display = 'none';
        pinBanner.style.display = 'none';
        pinMode = 'save';
        document.getElementById('pinRememberLabel').style.display = '';
        pinBanner.querySelector('.pinPrompt > span').textContent = 'ENTER YOUR PIN!!';
        sayStatus(out.ok ? `malice updated!! you have ${out.malice}!!` : (out.reason || 'could not buy!!'), 5);
        buyMaliceBtn.disabled = false;
        return;
      }
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinBox.value.trim(), remember: !!document.getElementById('pinRemember')?.checked }),
      });
      const out = await res.json();
      if (out.ok) {
        pinBox.value = '';
        pinRow.style.display = 'none';
        pinBanner.style.display = 'none';
        sayStatus('pin saved!! click the title to play!!', 6);
        if (net.id) { net.id = null; joinOnline(); } // retry join
      } else {
        sayStatus(out.reason || 'pin not saved!!', 5);
      }
    }
    document.getElementById('pinBtn').addEventListener('click', savePin);
    pinBox.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      pinBox.blur();
      savePin();
    });
    // typing heartbeat, holds round
    const typingBeat = () => {
      if (!net.id || Date.now() - (net.typingT || 0) < 2000) return;
      net.typingT = Date.now();
      fetch('/api/pin/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: net.id }),
      }).catch(() => {});
    };
    pinBox.addEventListener('input', typingBeat);
    // per-round join check
    const verifyBox = document.getElementById('verifyBox');
    async function submitVerify() {
      if (!net.id) return;
      const res = await fetch('/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: net.id, pin: verifyBox.value.trim() }),
      });
      const out = await res.json().catch(() => ({}));
      if (out.ok) {
        verifyBox.value = '';
        document.getElementById('verifyBanner').style.display = 'none';
        sayStatus('verified!! joining next round!!', 4);
      } else {
        sayStatus(out.reason || 'verify failed!!', 5);
      }
    }
    document.getElementById('verifyBtn').addEventListener('click', submitVerify);
    verifyBox.addEventListener('input', typingBeat);
    verifyBox.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      verifyBox.blur();
      submitVerify();
    });
    let pinMode = 'save'; // save or malice or round
    buyMaliceBtn.addEventListener('click', async () => {
      if (!net.id) return;
      buyMaliceBtn.disabled = true;
      let amount = undefined;
      if (net.mod) {
        const raw = window.prompt('free dev malice amount?', '1000');
        if (raw === null) {
          buyMaliceBtn.disabled = false;
          return;
        }
        const parsed = Number(raw);
        amount = Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
        const res = await fetch('/api/malice/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: net.id, amount }),
        });
        const out = await res.json();
        sayStatus(out.ok ? `malice updated!! you have ${out.malice}!!` : (out.reason || 'could not buy!!'), 5);
        buyMaliceBtn.disabled = false;
        return;
      }
      // paid path verifies pin
      pinMode = 'malice';
      document.getElementById('pinRememberLabel').style.display = 'none';
      pinBanner.querySelector('.pinPrompt > span').textContent = `MALICE: -${net.me?.malice_price ?? '?'} DIGIPOGS - ENTER PIN!!`;
      showPinPrompt();
    });
    function showRoundPinPrompt() {
      if (net.me && net.me.formbar_mode === false) return;
      pinMode = 'round';
      document.getElementById('pinRememberLabel').style.display = 'none';
      const cost = net.me && net.me.round_cost ? net.me.round_cost : 15;
      pinBanner.querySelector('.pinPrompt > span').textContent = `NEXT MATCH: -${cost} DIGIPOGS - ENTER PIN!!`;
      showPinPrompt();
    }
    window.showRoundPinPrompt = showRoundPinPrompt;
    const midBox = document.getElementById('midBox');
    let midShown = false;
    midBox.addEventListener('click', () => {
      midShown = !midShown;
      midBox.textContent = midShown ? (net.fid || '?') : 'show my id';
    });
    // afk button
    // canvas corner
    const afkBtn = document.getElementById('afkImgBtn');
    net.afk = false;
    function setAFK(on) {
      net.afk = on;
      afkBtn.classList.toggle('on', on); // away tint
      if (on) game.input.left = game.input.right = game.input.jump = false;
      if (net.id) {
        const id = net.id;
        net.afkSync = (net.afkSync || Promise.resolve()).then(() => fetch('/api/afk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, away: on }),
        })).catch(() => {});
      }
    }
    afkBtn.addEventListener('click', () => setAFK(!net.afk));
    const specBox = document.getElementById('spectate');
    const specHint = document.getElementById('specHint');
    const phaseLine = document.getElementById('phaseLine');
    const roleBox = document.getElementById('roleBox');
    const hitPop = document.getElementById('hitPop');
    const hurtFlash = document.getElementById('hurtFlash');
    let hitPopT = null;
    let lastPhaseText = '';
    let roleTimer = null;
    const statsBox = document.getElementById('stats');
    const posdbg = document.getElementById('posdbg');
    // pos overlay
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        posdbg.style.display = posdbg.style.display === 'none' ? 'block' : 'none';
      }
    });
    const vignette = document.getElementById('vignette');
    const chatLog = document.getElementById('chatLog');
    let specId = null; // spectate target
