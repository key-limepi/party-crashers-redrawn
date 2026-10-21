// main render pass
Object.assign(PlatformerEngine.prototype, {
  render() {
    const { ctx, width, height } = this;
    ctx.imageSmoothingEnabled = false; // sharp pixels
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
    if (this.shakeT > 0) {
      // rumble
      const m = this.shakeMag * Math.min(1, this.shakeT * 3);
      ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m);
    }

    if (this.levelArt && this.levelArt.complete && this.activeMap === 'main') {
      const cx = Math.max(0, Math.round(this.camera.x)), cy = Math.max(0, Math.round(this.camera.y));
      const sw = Math.min(this.width + 2, this.levelArt.width - cx), sh = Math.min(this.height + 2, this.levelArt.height - cy);
      if (sw > 0 && sh > 0) {
        const bd = this.levelBackdrop;
        const lb = this.levelBounds;
        if (bd && bd.complete && bd.naturalWidth && lb) {
          const sc = Math.max(lb.w / bd.naturalWidth, lb.h / bd.naturalHeight); // fill without stretch
          const bw = bd.naturalWidth * sc, bh = bd.naturalHeight * sc;
          ctx.drawImage(bd, (lb.w - bw) / 2, (lb.h - bh) / 2 + (this.backdropShiftY || 0), bw, bh);
        }
        ctx.drawImage(this.levelArt, cx, cy, sw, sh, cx, cy, sw, sh);
      }
    } else if (this.interArt && this.interArt.complete && this.activeMap === 'inter') {
      const S = this.interScale || 1;
      const lb = this.interBounds;
      const bd = this.interBackdrop;
      if (bd && bd.complete && bd.naturalWidth && lb) ctx.drawImage(bd, 0, 0, bd.naturalWidth, bd.naturalHeight, 0, 0, lb.w, lb.h);
      const cx = Math.max(0, Math.round(this.camera.x)), cy = Math.max(0, Math.round(this.camera.y));
      const sx = cx / S, sy = cy / S;
      const sw = Math.min((this.width + 2) / S, this.interArt.width - sx), sh = Math.min((this.height + 2) / S, this.interArt.height - sy);
      if (sw > 0 && sh > 0) ctx.drawImage(this.interArt, sx, sy, sw, sh, cx, cy, sw * S, sh * S);
    } else {
      for (const s of this.statics) {
        ctx.fillStyle = s.color;
        ctx.fillRect(s.pos.x, s.pos.y, s.w, s.h);
      }
    }
    
    // spike art
    // dim spikes
    const spk = this.spikeImg;
    const spkOk = spk && spk.complete && spk.naturalWidth;
    ctx.save();
    if (this.player && !this.player.evil) ctx.globalAlpha = 0.2;
    for (const sp of this.spikes) {
      if (sp.tripped) continue;
      const x = sp.x, y = sp.y;
      if (spkOk) {
        ctx.drawImage(spk, Math.round(x - 20), Math.round(y - 24), 40, 24);
        continue;
      }
      ctx.fillStyle = '#3a3a5a';
      ctx.beginPath();
      ctx.moveTo(x - 18, y); ctx.lineTo(x - 12, y - 22); ctx.lineTo(x - 6, y);
      ctx.moveTo(x - 6, y); ctx.lineTo(x, y - 28); ctx.lineTo(x + 6, y);
      ctx.moveTo(x + 6, y); ctx.lineTo(x + 12, y - 22); ctx.lineTo(x + 18, y);
      ctx.fill();
    }
    ctx.restore();
<<<<<<< Updated upstream
=======
    // icewall art
    for (const iw of this.icewalls || []) {
      if (iw.destroyed) continue;
      const stage = iw.hp > 22.5 ? 4 : iw.hp > 15 ? 3 : iw.hp > 7.5 ? 2 : 1;
      const wi = this.icewallImgs && this.icewallImgs[stage - 1];
      if (wi && wi.complete && wi.naturalWidth) {
          const wh = iw.h;
        const ww = Math.max(1, Math.round(wh * wi.naturalWidth / wi.naturalHeight));
        ctx.drawImage(wi, Math.round(iw.x + iw.w / 2 - ww / 2), Math.round(iw.y + iw.h - wh), ww, wh);
      }
      // hp bar
      const hpFrac = Math.max(0, iw.hp / 60);
      ctx.fillStyle = '#000';
      ctx.fillRect(iw.x - 2, iw.y - 8, iw.w + 4, 6);
      ctx.fillStyle = '#7cc7ff';
      ctx.fillRect(iw.x, iw.y - 6, iw.w * hpFrac, 4);
    }
    // sleepmist puff
    for (const m of this.mists || []) {
      const age = m.age || 0;
      const a = age < 8 ? 0.85 : Math.max(0, 0.85 * (10 - age) / 2);
      if (a <= 0) continue;
      ctx.globalAlpha = a * 0.2;
      ctx.fillStyle = '#bfe8ff';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 200, 0, Math.PI * 2); // area edge
      ctx.fill();
      const mi = this.mistImg;
      ctx.globalAlpha = a;
      if (mi && mi.complete && mi.naturalWidth) {
        // four drifting clouds
        const cw = 120;
        const ch = Math.round(cw * mi.naturalHeight / mi.naturalWidth);
        const spots = [[-78, -30], [66, -52], [-36, 52], [58, 44]];
        for (let i = 0; i < spots.length; i++) {
          const bob = Math.sin(age * 2 + i * 1.7) * 8;
          ctx.drawImage(mi, Math.round(m.x + spots[i][0] - cw / 2),
                        Math.round(m.y + spots[i][1] - ch / 2 + bob), cw, ch);
        }
      }
      ctx.globalAlpha = 1;
    }
>>>>>>> Stashed changes
    // bomb art
    for (const bb of this.bombs) {
      if (bb.used) continue;
      const bi = bb.img || this.bombImg;
      if (bi && bi.complete && bi.naturalWidth) {
        this.drawContent(ctx, bi, bb.x, bb.y, BOMB_DH);
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(bb.x - BOMB_DH / 2, bb.y - BOMB_DH, BOMB_DH, BOMB_DH);
      }
    }
    // toss arcs
    for (const t of this.tosses) {
      if (t.dead) continue;
      const ti = t.img || this.bombImg;
      if (ti && ti.complete && ti.naturalWidth) this.drawContent(ctx, ti, Math.round(t.x), Math.round(t.y + BOMB_R), BOMB_DH);
      else { ctx.fillStyle = '#333'; ctx.fillRect(Math.round(t.x) - BOMB_R, Math.round(t.y) - BOMB_R, BOMB_R * 2, BOMB_R * 2); }
    }
    // Mario fireballs are short-lived, straight moving projectiles.
    const nowMs = Date.now();
    this.marioFireballs = (this.marioFireballs || []).filter((f) => f.mine
      ? nowMs - f.start < 7000
      : nowMs - (f.syncedAt || f.start) < 500);
    for (const f of this.marioFireballs) {
      const frames = marioSprites.fireball;
      const age = Math.max(0, nowMs - f.start);
      const img = frames[Math.floor(age / 65) % frames.length];
      if (!img || !img.complete || !img.naturalWidth) continue;
      const extrapolate = Math.min(0.07, Math.max(0, (nowMs - (f.syncedAt || nowMs)) / 1000));
      const x = f.x + f.vx * extrapolate;
      const y = f.y + f.vy * extrapolate + 750 * extrapolate * extrapolate;
      const w = 18, h = 18;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(age * 0.018);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    // boom pops
    if (window.FX_ON !== false) for (const b of this.booms) {
      const img = b.img || this.boomImg;
      ctx.save();
      if (img && img.complete && img.naturalWidth) {
        const dw = Math.round(img.naturalWidth * 0.5), dh = Math.round(img.naturalHeight * 0.5);
        ctx.drawImage(img, Math.round(b.x - dw / 2), Math.round(b.y - dh / 2), dw, dh);
      } // no fallback needed
      ctx.restore();
    }
    // spring art
    for (const sp of this.springs) {
      if (sp.map !== this.activeMap) continue;
      const dim = sp.cd > this.time;
      if (sp.img && sp.img.complete && sp.img.naturalWidth) {
        ctx.save();
        if (dim) ctx.globalAlpha = 0.4;
        ctx.drawImage(sp.img, Math.round(sp.x), Math.round(sp.y), sp.w, sp.h);
        ctx.restore();
      } else {
        ctx.fillStyle = dim ? '#555' : '#0f0';
        ctx.fillRect(sp.x, sp.y, sp.w, sp.h);
      }
    }
    // trip pings
    const arrow = this.alertArrow && this.alertArrow.complete && this.alertArrow.naturalWidth
      ? this._redTint(this.alertArrow) : null;
    // edge arrow
    const edgeArrow = (sx, sy) => {
      const m = 34; // edge space
      const cx = Math.min(Math.max(sx, m), this.width - m);
      const cy = Math.min(Math.max(sy, m), this.height - m);
      const ang = Math.atan2(sy - this.height / 2, sx - this.width / 2);
      const px = cx + this.camera.x, py = cy + this.camera.y;
      if (arrow) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang - Math.PI); // spin arrow
        ctx.drawImage(arrow, -14, -14, 28, 28);
        ctx.restore();
      } else {
        // backup triangle
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(ang) * 14, py + Math.sin(ang) * 14);
        ctx.lineTo(px + Math.cos(ang + 2.5) * 12, py + Math.sin(ang + 2.5) * 12);
        ctx.lineTo(px + Math.cos(ang - 2.5) * 12, py + Math.sin(ang - 2.5) * 12);
        ctx.fill();
      }
    };
    if (this.showAlerts) {
      const pulse = 1 + Math.sin(this.time * 10) * 0.2;
      ctx.fillStyle = '#ff4757';
      ctx.font = `${Math.round(20 * pulse)}px "Comic Sans MS", "Comic Sans", cursive`;
      ctx.textAlign = 'center';
      for (const a of this.alerts) {
        const sx = a.x - this.camera.x, sy = (a.y - 30) - this.camera.y;
        if (sx > -20 && sx < this.width + 20 && sy > -20 && sy < this.height + 20) {
          ctx.fillText('!!', a.x, a.y - 30);
          continue;
        }
        edgeArrow(sx, sy);
      }
    }
    // ghost tracks
    if (this.sneakArrows) {
      for (const r of this.remotes) {
        if (r.evil || !r.alive || r.hp <= 0) continue;
        const sx = (r.pos.x + r.w / 2) - this.camera.x, sy = (r.pos.y + r.h / 2) - this.camera.y;
        if (sx > -20 && sx < this.width + 20 && sy > -20 && sy < this.height + 20) continue;
        edgeArrow(sx, sy);
      }
    }
    const bars = []; // bar list
    // rope art
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const l of this.pullLinks) {
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
    }
    ctx.stroke();
    for (const b of [...this.bodies, ...(this.remotes || [])]) {
      if (b.visible === false) continue;
      if (b.isRemote && b.alive === false) continue;
      if (b.isRemote && b.invis && !this.seeInvis) continue;
      const img = this._spriteFor(b);
      if (img && img.complete && img.naturalWidth) {
        // cower shake
        const scare = (b.cowering || b.tremble) ? Math.floor(Math.random() * 3) - 1 : 0;
        const fs = this.frameSize(b, img);
        const mimicScale = b.shadowMimicScale || 1;
        const scaleX = (b.char === 'bear5' ? (b.bearDrawScaleX || 1) : 1) * mimicScale;
        const scaleY = (b.char === 'bear5' ? (b.bearDrawScaleY || 1) : 1) * mimicScale;
        const dw = Math.max(1, Math.round(fs.dw * scaleX));
        const dh = Math.max(1, Math.round(fs.dh * scaleY));
        // use visual center
        const box = this.contentBox(img);
        let offsetX = 0;
        if (box) {
          const base = this.baseFrame(b);
<<<<<<< Updated upstream
          const scale = (base ? (b.drawH || b.h) / base.h : 1) * scaleX;
=======
          let scale = (base ? (b.drawH || b.h) / base.h : 1) * scaleX;
          scale = Math.max(1, Math.round(scale));
>>>>>>> Stashed changes
          // content box center
          const contentCenterX = box.x + box.w / 2;
          // full image center
          const fullCenterX = img.naturalWidth / 2;
          offsetX = Math.round((contentCenterX - fullCenterX) * scale);
        }
        const dx = Math.round(b.pos.x + (b.w - dw) / 2) + offsetX + scare;
        const dy = Math.round(b.pos.y + (b.h - dh)); // align feet
        const cx = Math.round(b.pos.x + b.w / 2) + offsetX;
        // rainbow follows cat motion
        const trail = b.sprites && b.sprites.trail;
        if (trail && trail.complete && trail.naturalWidth) {
          if (b.rocketing && b._rk) {
            // tail rainbow in rocket
            const rk = b._rk;
            this.drawTrail(ctx, b, trail, rk.x - Math.cos(rk.ang) * 40, rk.y - Math.sin(rk.ang) * 40, 0.8);
          } else if (!b.rocketing) {
            const s = dw / img.naturalWidth; // frame scale
            const x0 = dx + 15 * s; // starts inside the pop tart
            const ax = b.facing < 0 ? 2 * cx - x0 : x0; // flip with the cat
            this.drawTrail(ctx, b, trail, ax, dy + 3 * s + trail.naturalHeight * s / 2, s);
          }
        } else if (b._tr) {
          b._tr.pts.length = 0;
        }
        // skip body when rocketing
        if (!b.rocketing) {
          ctx.save();
          if (b === this.player && b.invis) ctx.globalAlpha = 0.45;
          else if (b.isRemote && b.away) ctx.globalAlpha = 0.5;
          ctx.imageSmoothingEnabled = false;
          ctx.webkitImageSmoothingEnabled = false;
          ctx.mozImageSmoothingEnabled = false;
          ctx.msImageSmoothingEnabled = false;
          if (b.facing < 0) {
            ctx.translate(cx, 0);
            ctx.scale(-1, 1);
            ctx.translate(-cx, 0);
          }
          // windup strobes
          const strobe = window.FLASH_ON !== false && Math.floor(this.time * 10) % 2 === 0;
          const stunnedKiller = b.evil && ((b.stunT || 0) > 0 || b.stunned); // dark while stunned
          const tinted = stunnedKiller ? this._darkTint(img)
            : (b.whiteFlash && strobe) ? this._whiteTint(img)
            : (b.redFlash && strobe) ? this._redTint(img)
            : (b.cyanFlash && strobe) ? this._cyanTint(img) : img;
          if (b.char === 'bear5' && b.bearFold > 0.02) {
            this.drawBearFold(ctx, tinted, img, dx, dy, dw, dh, b.bearFold, b.bearFoldX, b.bearFoldY, b.bearFoldReach);
          } else if (b.char === 'bear5' && b.bearDrawAngle) {
            ctx.save();
            ctx.translate(cx, dy + dh);
            ctx.rotate(b.bearDrawAngle);
            ctx.translate(-cx, -(dy + dh));
            this.blit(ctx, tinted, img, dx, dy, dw, dh);
            ctx.restore();
          } else {
            this.blit(ctx, tinted, img, dx, dy, dw, dh);
          }
          if (b.pulseWhite && window.FLASH_ON !== false) {
            // stepped white pulse
            const levels = [0.08, 0.24, 0.42, 0.6];
            ctx.save();
            ctx.globalAlpha = levels[Math.floor(this.time * 8) % levels.length];
            this.blit(ctx, this._whiteTint(img), img, dx, dy, dw, dh);
            ctx.restore();
          }
          ctx.restore();
        }
        // draw held bomb
        if (b.holdingBomb && !b.rocketing) {
          const bi = this.bombImg;
          if (bi && bi.complete && bi.naturalWidth) {
            const hx = cx + (b.facing || 1) * dw * 0.35;
            this.drawContent(ctx, bi, Math.round(hx), Math.round(dy + dh * 0.55), BOMB_DH);
          }
        }
      } else {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.pos.x, b.pos.y, b.w, b.h);
        // fallback char initial
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initial = (b.name || '?')[0].toUpperCase();
        ctx.fillText(initial, b.pos.x + b.w / 2, b.pos.y + b.h / 2);
      }
      // ghost meter
      if (b === this.player && (b.sneakFrac || 0) > 0) {
        const frac = Math.min(1, b.sneakFrac);
        const bx0 = Math.round(b.pos.x) - 10, by0 = Math.round(b.pos.y);
        const bh = Math.round(40 * frac);
        ctx.fillStyle = '#000';
        ctx.fillRect(bx0 - 1, by0 - 1, 6, 42);
        ctx.fillStyle = b.sneakColor || '#c084fc';
        ctx.fillRect(bx0, by0 + 40 - bh, 4, bh);
      }
      // stack bars
      if (b === this.player || b.isRemote) {
        const dw = b.drawW || b.w, dh = b.drawH || b.h; // keep aspect from frameSize elsewhere; this is bar/position only
        bars.push({
          b,
          bw: Math.max(dw, 50), bh: 8,
          bx: b.pos.x + (b.w - Math.max(dw, 50)) / 2,
          by: Math.round(b.pos.y + (b.h - dh)) - 20,
        });
      }
    }
    // spread bars
    bars.sort((m, n) => m.bx - n.bx);
    let stackX1 = -Infinity, stackY = 0;
    for (const bar of bars) {
      const { b, bw, bh } = bar;
      let { bx, by } = bar;
      if (bx < stackX1 && Math.abs(by - stackY) < 16) by = stackY - 16;
      stackX1 = bx + bw; stackY = by;
      {
        const sh = Math.max(0, b.shield || 0);
        const denom = (b.maxHp ?? 100) + (sh > 0 ? 50 : 0);
        const frac = Math.min(1, Math.max(0, (b.hp ?? 100) / denom));
        ctx.fillStyle = '#000';
        ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = '#000';
        ctx.fillRect(bx, by, bw, bh);
        if (b.rainbow) {
          // super bar
          const segs = 6, base = Math.floor(this.time * 200) % 360;
          for (let i = 0; i < segs; i++) {
            ctx.fillStyle = `hsl(${(base + i * 60) % 360}, 100%, 55%)`;
            ctx.fillRect(bx + (bw * frac * i) / segs, by, (bw * frac) / segs + 0.5, bh);
          }
        } else ctx.fillStyle = (b.hp ?? 100) <= 30 ? '#8e0000' // low health
          : frac > 0.5 ? '#2ed573' : frac > 0.25 ? '#ffa502' : '#8e0000';
        if (!b.rainbow) ctx.fillRect(bx, by, bw * frac, bh);
        if (!b.rainbow && sh > 0) {
          // draw bonus hp
          ctx.fillStyle = '#249bff';
          ctx.fillRect(bx + bw * frac, by, bw * Math.min(1, sh / denom), bh);
        }
        // evil name
        // afk tag
        const disguisedKiller = b.isRemote && b.evil && b.char === 'shadowmario' && !!b.mimic;
        const evilTag = b.isRemote && b.evil && !disguisedKiller;
        const afkTag = b.isRemote && b.away;
        ctx.fillStyle = evilTag ? '#ff4757' : '#fff';
        ctx.font = `${evilTag ? 'bold 13px' : '11px'} "Comic Sans MS", "Comic Sans", cursive`;
        ctx.textAlign = 'center';
        // dark outline
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#1a1b26';
        const label = evilTag ? `EVIL ${String(b.name || 'friend')}` :
          b.isRemote ? String(disguisedKiller ? (b.mimicName || b.name || 'friend') : (b.name || 'friend')) : `${Math.ceil((b.hp ?? 0) + Math.max(0, b.shield || 0))}`;
        const labelText = afkTag ? `${label} [AFK]` : label;
        ctx.strokeText(labelText, bx + bw / 2, by - 4);
        ctx.fillText(labelText, bx + bw / 2, by - 4);
        // chat art
        const bub = this.bubbles[b.isRemote ? b.id : 'me'];
        if (bub && bub.text && Date.now() < bub.until) {
          const bimg = this.chatBubbleImg;
          if (bimg && bimg.complete && bimg.naturalWidth) {
            const bw3 = 92, bh3 = 44;
            const px = Math.round(bx + bw / 2 - bw3 * 0.4); // bubble tail
            const py = Math.round(by - bh3 - 4);
            ctx.drawImage(bimg, px, py, bw3, bh3);
            // fit text
            const L = bub.text.length;
            let size = L <= 8 ? 16 : L <= 20 ? 13 : 12, txt = bub.text;
            const maxW = bw3 - 20;
            const setF = () => { ctx.font = `${size}px "Comic Sans MS", "Comic Sans", cursive`; };
            setF();
            while (ctx.measureText(txt).width > maxW && size > 8) { size--; setF(); }
            while (txt.length > 1 && ctx.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1);
            if (txt !== bub.text) txt += '…';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.fillText(txt, px + bw3 / 2, py + bh3 / 2 + size * 0.35);
          } else {
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#5b4b8a';
            ctx.lineWidth = 2;
            ctx.font = '12px "Comic Sans MS", "Comic Sans", cursive';
            const tw = ctx.measureText(bub.text).width;
            const pw = tw + 16, ph = 22;
            const px = bx + bw / 2 - pw / 2, py = by - ph - 12;
            ctx.fillRect(px, py, pw, ph);
            ctx.strokeRect(px, py, pw, ph);
            ctx.fillStyle = '#5b4b8a';
            ctx.textAlign = 'center';
            ctx.fillText(bub.text.slice(0, 20), bx + bw / 2, py + 15);
          }
        }
      }
    }
    // fade ghosts
    if (window.FX_ON !== false) for (const g of this.afterimages) {
      if (!g.img || !g.img.complete || !g.img.naturalWidth) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.5 * (1 - g.age / 0.4));
      // use visual center
      const box = this.contentBox(g.img);
      let offsetX = 0;
      if (box) {
        const baseH = g.drawH || g.h;
        const scale = baseH / g.img.naturalHeight;
        const contentCenterX = box.x + box.w / 2;
        const fullCenterX = g.img.naturalWidth / 2;
        offsetX = Math.round((contentCenterX - fullCenterX) * scale);
      }
      const cx = Math.round(g.x + g.w / 2) + offsetX;
      if (g.facing < 0) {
        ctx.translate(cx, 0);
        ctx.scale(-1, 1);
        ctx.translate(-cx, 0);
      }
      const dw = g.drawW || g.w, dh = g.drawH || g.h;
      const gx = Math.round(g.x + (g.w - dw) / 2) + offsetX;
      const gy = Math.round(g.y + (g.h - dh));
      this.blit(ctx, g.plain ? g.img : this._cyanTint(g.img), g.img, gx, gy, dw, dh);
      ctx.restore();
    }
    // rockets then blast
    this.renderRockets(ctx);
    if (window.FX_ON !== false) this.renderFx(ctx);
    // front props, over players
    const fp = this.interProps;
    if (fp && fp.complete && fp.naturalWidth && this.activeMap === 'inter') {
      const S = this.interScale || 1;
      const fx0 = Math.max(0, Math.round(this.camera.x)), fy0 = Math.max(0, Math.round(this.camera.y));
      const fsx = fx0 / S, fsy = fy0 / S;
      const fsw = Math.min((this.width + 2) / S, fp.width - fsx), fsh = Math.min((this.height + 2) / S, fp.height - fsy);
      if (fsw > 0 && fsh > 0) ctx.drawImage(fp, fsx, fsy, fsw, fsh, fx0, fy0, fsw * S, fsh * S);
    }
    // debug boxes
    if (this.debug) {
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 1;
      for (const s of this.statics) ctx.strokeRect(s.pos.x, s.pos.y, s.w, s.h);
      for (const b of this.bodies) ctx.strokeRect(b.pos.x, b.pos.y, b.w, b.h);
      for (const r of this.remotes) ctx.strokeRect(r.pos.x, r.pos.y, r.w, r.h);
    }
    ctx.restore();
  },
});
