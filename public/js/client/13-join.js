    async function joinOnline() {
      // rejoin first
      if (net.id) {
        try {
          await fetch('/api/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: net.id }),
          });
        } catch (e) { /* bye anyway!! */ }
        net.id = null;
      }
      netStatus.textContent = 'knocking...';
      try {
        const res = await fetch('/api/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tab: tabId, name: new URLSearchParams(location.search).get('name') || '' }), // name needs formbar off
        });
        if (res.status === 401) {
          // no login
          const e = await res.json().catch(() => ({}));
          if (e.login) { location.href = '/login'; return; }
          showPinPrompt();
          sayStatus(e.error || 'enter your digipog pin!!', 8);
          return;
        }
        if (res.status === 403) {
          // still knocking
          let msg = 'match running - waiting to sneak in!!';
          try {
            const e = await res.json();
            if (e && /locked/.test(e.error || '')) msg = 'match locked - waiting for next one!!';
            if (e && /tab/.test(e.error || '')) msg = e.error;
          } catch (e2) { /* plain 403!! */ }
          netStatus.textContent = msg;
          clearTimeout(net.retry);
          net.retry = setTimeout(() => joinOnline(), 3000);
          return;
        }
        if (!res.ok) throw new Error('nope');
        const joined = await res.json();
        net.id = joined.id;
        setAFK(false); // fresh joins play
        hideFatal(); // error clear
        // fake loading fade in
        const held = Date.now() - (net.titleT0 || Date.now());
        setTimeout(() => {
          const showWorld = () => {
            const titleEl = document.getElementById('titleScreen');
            if (titleEl) titleEl.style.display = 'none';
            pinBanner.style.display = 'none';
            titleLive = false;
          };
          if (typeof phaseFadeSwap === 'function') phaseFadeSwap(showWorld, 600);
          else showWorld();
        }, Math.max(0, 3000 - held));
        clearTimeout(net.retry);
        net.mod = !!joined.mod;
        chatBox.readOnly = !net.mod;
        chatBox.placeholder = net.mod ? 'type a message!! (enter)' : 'say something!! (enter)';
        net.everOnline = true; // stay joined
        net.fid = joined.fid;
        sayStatus(`online as ${joined.name}!! friends can see you!! :D`, 4);
        if (window.__wantDebug && joined.mod) openModMenu();
        if (joined.muted > 0) applyMute(joined.muted); // muted stay
        if (!net.timer) {
          // chain ticks
          const loop = (wait) => {
            net.timer = setTimeout(async () => {
              const t0 = performance.now();
              try { await netTick(); } catch (e) { /* next tick!! */ }
              // only wait whats left of 40ms, high ping ticks go right away
              loop(Math.max(0, 40 - (performance.now() - t0)));
            }, wait); // tick rate
          };
          loop(40);
          window.addEventListener('beforeunload', () => {
            navigator.sendBeacon && navigator.sendBeacon('/api/leave', JSON.stringify({ id: net.id }));
          });
        }
      } catch (e) {
        netError('cannot reach the server!! retrying...', 10);
        clearTimeout(net.retry);
        net.retry = setTimeout(() => joinOnline(), 3000);
      }
    }
    // catch up
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        game.input.left = game.input.right = game.input.jump = false;
        if (net.id) netTick();
      }
    });
    // deferred join
    (function autoJoin() {
      if (location.protocol === 'file:') {
        netError('open this page through the server, not as a file!!', 3600);
        return;
      }
      loadMe().then((me) => {
        if (me.logged_in) sayStatus(`logged in as ${me.name}!! click the title to play!!`, 0);
        if (me.logged_in && me.needs_pin && !me.has_pin) {
          showPinPrompt();
          sayStatus('enter your digipog pin!!', 0);
        }
      }).catch(() => {});
    })();
    