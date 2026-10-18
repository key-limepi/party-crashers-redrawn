    // chat box
    const chatBox = document.getElementById('chatBox');
    const openFromBox = (e) => {
      if (selectOpen) {
        if (e.type === 'focus') chatBox.blur();
        return;
      }
      if (chatBox.disabled) {
        e.preventDefault();
        chatBox.blur();
        sayStatus('muted!!', 3);
        fileSfx(SFX + 'denied.wav', {});
        return;
      }
      game.input.left = game.input.right = game.input.jump = false; // stop moving
      if (net.mod) {
        closeQuick();
      } else {
        e.preventDefault();
        chatBox.blur();
        openQuick();
      }
    };
    chatBox.addEventListener('click', openFromBox);
    chatBox.addEventListener('focus', openFromBox);
    // changelog
    const logBtn = document.getElementById('logBtn');
    const logModal = document.getElementById('logModal');
    logBtn.addEventListener('click', () => {
      if (logModal.style.display !== 'none') {
        logModal.style.display = 'none';
        return;
      }
      fetch('./changelog.md?v=' + Date.now()).then((r) => r.text()).then((t) => {
        logModal.textContent = t;
        logModal.style.display = 'block';
      }).catch(() => {});
    });
    // quick shouts
    const QUICK = [
      'OK!', 'what a save!', 'run away!!!', 'help me!!',
      'thanks!!', 'sorry!!', 'nice!!', 'wow!!',
      'good luck!!', 'killer here!!', 'split up!!', 'gg!!',
    ];
    const QUICK_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w'];
    let quickOpen = false;
    const quickPanel = document.getElementById('quickPanel');
    QUICK.forEach((text, i) => {
      const b = document.createElement('button');
      b.className = 'quickBtn';
      b.textContent = `${QUICK_KEYS[i]} ${text}`;
      b.addEventListener('click', () => { sendChat(text); closeQuick(); });
      quickPanel.appendChild(b);
    });
    function openQuick() { quickOpen = true; quickPanel.style.display = 'grid'; }
    function closeQuick() { quickOpen = false; quickPanel.style.display = 'none'; }
    function sendChat(text) {
      if (!text) return;
      if (net.mutedUntil && Date.now() < net.mutedUntil) {
        sayStatus('muted!!', 3);
        fileSfx(SFX + 'denied.wav', {});
        return;
      }
      if (!net.id) {
        sayStatus('not connected!!', 2);
        fileSfx(SFX + 'denied.wav', {});
        return;
      }
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: net.id, text }),
      }).then((r) => r.json()).then((d) => {
        if (d && d.ok === false && d.reason === 'blocked') {
          sayStatus('yikes!! blocked!!', 2);
          fileSfx(SFX + 'denied.wav', {});
        } else if (d && d.ok === false && d.reason === 'muted') {
          applyMute(d.left || 600);
        }
      }).catch(() => {});
    }
    const seenChat = new Set();
    let muteTimer = null;
    function applyMute(secs) {
      // mute lock
      chatBox.disabled = true;
      net.mutedUntil = Date.now() + secs * 1000;
      clearInterval(muteTimer);
      let left = secs;
      const show = () => {
        chatBox.placeholder = `muted!! ${Math.ceil(left / 60)} min left!!`;
      };
      show();
      muteTimer = setInterval(() => {
        left -= 5;
        if (left <= 0) {
          clearInterval(muteTimer);
          chatBox.disabled = false;
          net.mutedUntil = 0;
          chatBox.placeholder = net.mod ? 'type a message!! (enter)' : 'say something!! (enter)';
        } else show();
      }, 5000);
    }
    window.addEventListener('keydown', (e) => {
      if (selectOpen) return; // select eats keys
      const typing = document.activeElement === chatBox || document.activeElement === pinBox;
      if (quickOpen) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          closeQuick();
        } else if (!typing && !e.repeat) {
          const i = QUICK_KEYS.indexOf(e.key.toLowerCase());
          if (i >= 0 && i < QUICK.length) {
            e.preventDefault();
            sendChat(QUICK[i]);
            closeQuick();
          }
        }
        return;
      }
      if (e.key === 'Enter' && !typing) {
        e.preventDefault();
        game.input.left = game.input.right = game.input.jump = false; // stop moving
        if (net.mod) chatBox.focus();
        else openQuick();
      }
    });
    chatBox.addEventListener('keydown', (e) => {
      if (!net.mod || selectOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        chatBox.blur();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const text = chatBox.value.trim();
        if (text) sendChat(text);
        chatBox.value = '';
      }
    });
    setInterval(() => {
      // old bubbles
      const now = Date.now();
      for (const k of Object.keys(game.bubbles)) {
        if (now >= (game.bubbles[k].until || 0)) delete game.bubbles[k];
      }
      if (seenChat.size > 200) seenChat.clear();
    }, 500);
