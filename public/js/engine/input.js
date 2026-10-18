// keyboard input handling
// rebindable action defaults
const DEFAULT_BINDS = {
  left: ['arrowleft'], right: ['arrowright'], down: ['arrowdown'], jump: ['arrowup', ' '],
  Z: ['z'], X: ['x'], C: ['c'], V: ['v'], B: ['b'], N: ['n'],
};
const BIND_ORDER = ['left', 'right', 'down', 'jump', 'Z', 'X', 'C', 'V', 'B', 'N'];
const BIND_NAMES = {
  left: 'left', right: 'right', down: 'down', jump: 'jump',
  Z: 'ability 1', X: 'ability 2', C: 'ability 3', V: 'ability 4', B: 'ability 5', N: 'ability 6',
};
const MOVE_ACTS = ['left', 'right', 'down', 'jump'];
// key -> on screen label
function keyLabel(k) {
  if (k === ' ') return 'SPACE';
  const named = {
    arrowleft: 'LEFT', arrowright: 'RIGHT', arrowup: 'UP', arrowdown: 'DOWN',
    enter: 'ENTER', shift: 'SHIFT', control: 'CTRL', alt: 'ALT', tab: 'TAB',
    backspace: 'BACK', delete: 'DEL', escape: 'ESC',
  };
  return named[k] || String(k).toUpperCase();
}
// label for an action
function bindLabel(input, act) {
  const list = input && input.keys ? input.keys[act] : null;
  return keyLabel(list && list.length ? list[0] : act);
}
class Input {
  constructor() {
    this.left = false; this.right = false; this.jump = false; this.down = false;
    this._jumpPressed = false;
    this._abilityPressed = []; // ability taps
    this.capturing = false; // settings rebind
    this.keys = Input.loadKeys();
    this._bind();
  }
  // saved or default binds
  static loadKeys() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('pc_binds') || 'null'); } catch (_) { /* fresh!! */ }
    const keys = {};
    for (const act of BIND_ORDER) {
      const list = saved && Array.isArray(saved[act]) ? saved[act].filter((k) => typeof k === 'string' && k) : null;
      keys[act] = list && list.length ? list.map((k) => k.toLowerCase()) : DEFAULT_BINDS[act].slice();
    }
    return keys;
  }
  saveKeys() {
    try { localStorage.setItem('pc_binds', JSON.stringify(this.keys)); } catch (_) { /* full!! */ }
  }
  setBind(act, list) {
    if (!this.keys[act]) return;
    const clean = [];
    for (const k of list) {
      const n = String(k).toLowerCase();
      if (n && !clean.includes(n)) clean.push(n);
    }
    this.keys[act] = clean.length ? clean : DEFAULT_BINDS[act].slice();
    this.saveKeys();
  }
  addBind(act, k) {
    if (k !== 'escape') this.setBind(act, (this.keys[act] || []).concat([k]));
  }
  clearBind(act, k) {
    this.setBind(act, (this.keys[act] || []).filter((x) => x !== k));
  }
  resetBinds() {
    for (const act of BIND_ORDER) this.keys[act] = DEFAULT_BINDS[act].slice();
    this.saveKeys();
  }
  // which action owns this key
  actionFor(key) {
    const k = String(key).toLowerCase();
    for (const act of BIND_ORDER) if (this.keys[act].includes(k)) return act;
    return null;
  }
  _bind() {
    // typing guard
    const typing = () => {
      const el = document.activeElement;
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const down = (e) => {
      if (typing() || this.capturing) return;
      const act = this.actionFor(e.key);
      if (!act) return;
      if (MOVE_ACTS.includes(act)) e.preventDefault();
      if (act === 'left') this.left = true;
      else if (act === 'right') this.right = true;
      else if (act === 'down') this.down = true;
      else if (act === 'jump') {
        if (!this.jump) this._jumpPressed = true;
        this.jump = true;
      } else if (!e.repeat) this._abilityPressed.push(act); // key names
    };
    const up = (e) => {
      const act = this.actionFor(e.key);
      if (act === 'left') this.left = false;
      else if (act === 'right') this.right = false;
      else if (act === 'down') this.down = false;
      else if (act === 'jump') this.jump = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
  }
  consumeJumpPressed() {
    const j = this._jumpPressed;
    this._jumpPressed = false;
    return j;
  }
  consumeAbility() {
    return this._abilityPressed.shift(); // key names
  }
}
