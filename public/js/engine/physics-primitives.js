// vectors bodies overlap helpers
class Vec {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
}

class Body {
  constructor(x, y, w, h, opts = {}) {
    this.pos = new Vec(x, y);
    this.vel = new Vec(0, 0);
    this.w = w; this.h = h;
    this.isStatic = !!opts.isStatic;
    this.onGround = false;
    this.color = opts.color || '#fff';
    // sprite sets
    this.sprites = opts.sprites || null;
    this.facing = 1; // face right
    this.animTime = 0;
    this.walkDist = 0; // walk distance
    this.alive = true; // dead flag
    this.visible = true; // hide corpse
    this.maxJumps = 1; // extra jump
    this.jumps = 1;
    this.fatigue = 0; // jump tired
    this.lastJumpT = -99;
    this.stunT = 0; // stun timer
    this.rooted = false; // rooted flag
    this.chargeDir = 0; // charge way
    this.cowerT = 0; // cower timer
    this.cowering = false;
    this.invis = false; // ghost flag
    this.evil = false; // evil flag
    this.cyanFlash = false; // cyan strobe
    this.redFlash = false; // red strobe
    this.animMoving = false; // move latch
    this.animRunning = false; // run latch
    this.actionImg = null; // fight pose
    this.actionT = 0;
    // big sprites
    this.drawW = opts.drawW || w;
    this.drawH = opts.drawH || h;
  }
  get left() { return this.pos.x; }
  get right() { return this.pos.x + this.w; }
  get top() { return this.pos.y; }
  get bottom() { return this.pos.y + this.h; }
}

function aabbOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
