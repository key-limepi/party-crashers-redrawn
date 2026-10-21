// tint/sprite mixins
Object.assign(PlatformerEngine.prototype, {
  // hot tint
  _redTint(img) {
    if (!img._redTint) {
      const t = document.createElement('canvas');
      t.width = img.naturalWidth || img.width;
      t.height = img.naturalHeight || img.height;
      const c = t.getContext('2d');
      c.drawImage(img, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(255, 30, 30, 0.85)';
      c.fillRect(0, 0, t.width, t.height);
      img._redTint = t;
    }
    return img._redTint;
  },

  // cold tint
  _cyanTint(img) {
    if (!img._cyanTint) {
      const t = document.createElement('canvas');
      t.width = img.naturalWidth || img.width;
      t.height = img.naturalHeight || img.height;
      const c = t.getContext('2d');
      c.drawImage(img, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(0, 229, 255, 0.85)';
      c.fillRect(0, 0, t.width, t.height);
      img._cyanTint = t;
    }
    return img._cyanTint;
  },

  // hero tint
  _whiteTint(img) {
    if (!img._whiteTint) {
      const t = document.createElement('canvas');
      t.width = img.naturalWidth || img.width;
      t.height = img.naturalHeight || img.height;
      const c = t.getContext('2d');
      c.drawImage(img, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(255, 255, 255, 0.9)';
      c.fillRect(0, 0, t.width, t.height);
      img._whiteTint = t;
    }
    return img._whiteTint;
  },

  // stun tint
  _darkTint(img) {
    if (!img._darkTint) {
      const t = document.createElement('canvas');
      t.width = img.naturalWidth || img.width;
      t.height = img.naturalHeight || img.height;
      const c = t.getContext('2d');
      c.drawImage(img, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(0, 0, 0, 0.6)';
      c.fillRect(0, 0, t.width, t.height);
      img._darkTint = t;
    }
    return img._darkTint;
  },

  // idle scale
  baseFrame(b) {
    if (b._baseFrame) return b._baseFrame;
    const idle = b.sprites && b.sprites.idle;
    const ref = Array.isArray(idle) ? idle[0] : idle;
    if (ref && ref.complete && ref.naturalWidth && ref.naturalHeight) {
      b._baseFrame = { w: ref.naturalWidth, h: ref.naturalHeight };
    }
    return b._baseFrame || null; // idle loading
  },

  // steady center
  anchorW(b) {
    const s = b.sprites;
    if (!s) return b.drawW || b.w;
    const base = this.baseFrame(b);
    const dh = b.drawH || b.h;
    const scale = base ? dh / base.h : 1;
    let mw = 0;
    for (const k of ['idle', 'walk', 'run', 'jump']) {
      const v = s[k];
      const arr = Array.isArray(v) ? v : (v ? [v] : []);
      for (const im of arr) {
        if (im && im.naturalWidth) mw = Math.max(mw, im.naturalWidth * scale);
      }
    }
    return Math.max(1, Math.round(mw)) || (b.drawW || b.w);
  },

  // crop feet
  blit(ctx, tinted, img, dx, dy, dw, dh) {
    const nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    if (!nw || !nh || dw <= 0 || dh <= 0) return;
    const sh = Math.max(1, nh - this.trimB(img));
    ctx.drawImage(tinted, 0, 0, nw, sh, dx, dy, dw, dh);
  },

  drawBearFold(ctx, tinted, img, dx, dy, dw, dh, fold, towardX, towardY, reach) {
    const nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    const sourceHeight = Math.max(1, nh - this.trimB(img));
    const strips = 12;
    for (let i = 0; i < strips; i++) {
      const top = i / strips, bottom = (i + 1) / strips;
      const sourceTop = Math.floor(sourceHeight * top);
      const sourceBottom = Math.min(sourceHeight, Math.ceil(sourceHeight * bottom));
      const centerFromFeet = 1 - (top + bottom) / 2;
      const angle = fold * (0.7 + centerFromFeet * 2.5) * Math.PI;
      const cosine = Math.cos(angle);
      const widthScale = 0.14 + 0.86 * Math.abs(cosine);
      const stripWidth = dw * widthScale;
      const bend = (towardX * 58 + towardY * 24) * (reach || 0) * centerFromFeet ** 1.35 * fold;
      const centerX = dx + dw / 2 + bend;
      const stripTop = dy + dh * top;
      const stripHeight = dh * (bottom - top) + 1;
      ctx.save();
      ctx.translate(centerX, stripTop);
      if (cosine < 0) ctx.scale(-1, 1);
      ctx.drawImage(tinted, 0, sourceTop, nw, sourceBottom - sourceTop, -stripWidth / 2, 0, stripWidth, stripHeight);
      ctx.restore();
    }
  },

  // content feet
  trimB(img) {
    if (img._trimB === undefined) {
      let t = 0;
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        outer:
        for (let y = c.height - 1; y >= 0; y--) {
          for (let x = 0; x < c.width; x++) {
            if (d[(y * c.width + x) * 4 + 3] > 8) break outer;
          }
          t++;
        }
      } catch (e) { t = 0; }
      img._trimB = t;
    }
    return img._trimB;
  },

  // get opaque box
  contentBox(img) {
    if (img._cbox !== undefined) return img._cbox;
    let box = null;
    const nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    try {
      const c = document.createElement('canvas');
      c.width = nw; c.height = nh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, nw, nh).data;
      let top = nh, bot = -1, left = nw, right = -1;
      for (let y = 0; y < nh; y++) {
        for (let x = 0; x < nw; x++) {
          if (d[(y * nw + x) * 4 + 3] > 8) {
            if (y < top) top = y;
            if (y > bot) bot = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
      }
      if (bot >= top) box = { x: left, y: top, w: right - left + 1, h: bot - top + 1 };
    } catch (e) { box = null; }
    img._cbox = box;
    return box;
  },

  // draw opaque pixels bottom-aligned
  drawContent(ctx, img, cx, bottomY, h) {
    const box = this.contentBox(img);
    if (!box) {
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      const dw = Math.max(1, Math.round(h * (nw / nh)));
      ctx.drawImage(img, Math.round(cx - dw / 2), Math.round(bottomY - h), dw, Math.round(h));
      return;
    }
    const dw = Math.max(1, Math.round(h * box.w / box.h));
    ctx.drawImage(img, box.x, box.y, box.w, box.h,
      Math.round(cx - dw / 2), Math.round(bottomY - h), dw, h);
  },

  frameSize(b, img) {
    const boxH = b.drawH || b.h;
    if (!(img && img.complete && img.naturalWidth && img.naturalHeight)) {
      return { dw: b.drawW || b.w, dh: boxH };
    }
    const base = this.baseFrame(b);
    let scale = base ? boxH / base.h : boxH / img.naturalHeight;
    const s = b.sprites;
    if (s && Array.isArray(s.jump) && s.jump.includes(img)) scale *= (s.jumpScale || 1);
    scale = Math.max(1, Math.round(scale));
    const trim = this.trimB(img);
    let dw = Math.max(1, Math.round(img.naturalWidth * scale));
    let dh = Math.max(1, Math.round((img.naturalHeight - trim) * scale));
    const target = 72;
    const maxd = Math.max(dw, dh);
    if (maxd !== target) {
      const factor = target / maxd;
      dw = Math.max(1, Math.round(dw * factor));
      dh = Math.max(1, Math.round(dh * factor));
    }
    return { dw, dh };
  },

  // sprite order
  // pick sprite
  _spriteFor(b) {
    const pick = this._spritePick(b);
    if (pick && pick.complete && pick.naturalWidth) return pick;
    // no hitbox
    const idle = b.sprites && b.sprites.idle;
    const fb = Array.isArray(idle) ? idle[0] : idle;
    if (fb && fb.complete && fb.naturalWidth) return fb;
    return null;
  },

  // raw pick
  _spritePick(b) {
    if (!b.sprites) return null;
    const s = b.sprites;
    if (b.actionImg && b.actionT > 0) return b.actionImg;
    if ((b.stunT ?? 0) > 0 && s.stun) return s.stun;
    if (b.isRemote && b.stunned && s.stun) return s.stun;
    // enemy moves
    if (b.isRemote && b.poseImg && Date.now() < (b.poseUntil || 0)) return b.poseImg;
    if (b.isRemote && b.pull && s.pull) return s.pull;
    if (b.cowering && s.cower) return s.cower;
    const tired = (b.hp ?? 100) / (b.maxHp ?? 100) < 0.5;
    // dragged pose
    if (b.pulled && s.struggle && s.struggle.length) {
      const i = Math.floor(b.animTime * 6) % s.struggle.length;
      return s.struggle[i];
    }
    // peelout animation
    if ((b.peeling || (b.isRemote && b.peeling)) && s.peel && s.peel.length) {
      return s.peel[Math.floor(b.animTime * 16) % s.peel.length];
    }
    // spindash roll animation
    if ((b.spinning || (b.isRemote && b.spinning)) && s.jump && Array.isArray(s.jump)) {
      return s.jump[Math.floor(b.animTime * 12) % s.jump.length];
    }
    // spindash windup animation
    if ((b.spinWindup || (b.isRemote && b.spinwindup)) && s.spin && s.spin.length) {
      return s.spin[Math.floor(b.animTime * 10) % s.spin.length];
    }
    // lux pray/rush/pant animation
    if ((b.praying || (b.isRemote && b.praying)) && s.pray && s.pray.length) {
      return s.pray[Math.floor(b.animTime * 4) % s.pray.length];
    }
    if ((b.rushing || (b.isRemote && b.rushing)) && s.adrun && s.adrun.length) {
      return s.adrun[Math.floor(b.animTime * 12) % s.adrun.length];
    }
    if ((b.panting || (b.isRemote && b.panting)) && s.pant && s.pant.length) {
      return s.pant[Math.floor(b.animTime * 4) % s.pant.length];
    }
    // tails fly animation
    if ((b.lift || (b.isRemote && b.lift)) && s.fly && s.fly.length) {
      return s.fly[Math.floor(b.animTime * 8) % s.fly.length];
    }
    // tailwhip animation
    if ((b.whipUntil || (b.isRemote && b.whipUntil)) && s.whip && s.whip.length) {
      return s.whip[Math.floor(b.animTime * 15) % s.whip.length];
    }
    // kick animation
    if ((b.kickUntil || (b.isRemote && b.kickUntil)) && s.kick && s.kick.length) {
      return s.kick[Math.floor(b.animTime * 8) % s.kick.length];
    }
    // jab animation
    if ((b.jabUntil || (b.isRemote && b.jabUntil)) && s.jab && s.jab.length) {
      return s.jab[Math.floor(b.animTime * 10) % s.jab.length];
    }
    // throw animation
    if ((b.throwUntil || (b.isRemote && b.throwUntil)) && s.throw && s.throw.length) {
      return s.throw[Math.floor(b.animTime * 8) % s.throw.length];
    }
    // air throw animation
    if ((b.throwUntil || (b.isRemote && b.throwUntil)) && !b.onGround && s.airthrow && s.airthrow.length) {
      return s.airthrow[Math.floor(b.animTime * 8) % s.airthrow.length];
    }
    // peelout windup animation
    if ((b.windupUntil && !b.peeling && !b.spinning) || (b.isRemote && b.windup && !b.peeling && !b.spinning)) {
      if (s.charge && s.charge.length) return s.charge[Math.floor(b.animTime * 8) % s.charge.length];
      if (s.charge) return s.charge;
    }
    if (!b.onGround && s.jump) {
      if (b.vel.y > 300 && s.fall) return s.fall;
      // hold jump, then roll
      if (Array.isArray(s.jump)) {
        const justJumped = b._justJumped && b.animTime < 0.15;
        if (justJumped) return s.jump[0];
        b._justJumped = false;
        return s.jump[Math.floor(b.animTime * 10) % s.jump.length];
      }
      return s.jump;
    }
    const speed = Math.abs(b.vel.x);
    // move gate
    if (!b.animMoving && speed > 25) b.animMoving = true;
    else if (b.animMoving && speed < 8) b.animMoving = false;
    if (b.animMoving && s.walk && s.walk.length) {
      // run gate
      if (!b.animRunning && speed > 340) b.animRunning = true;
      else if (b.animRunning && speed < 260) b.animRunning = false;
      const frames = (b.animRunning && s.run && s.run.length) ? s.run : s.walk;
      // slow run
      const stride = b.animRunning ? (s.runStride || 45) : (s.walkStride || (tired ? 70 : 40));
      const i = Math.floor(b.walkDist / stride) % frames.length;
      return frames[i];
    }
    if (s.idle && s.idle.length) {
      const i = Math.floor(b.animTime * (s.idleFps || (tired ? 1 : 2))) % s.idle.length;
      return s.idle[i];
    }
    return null;
  },
});
