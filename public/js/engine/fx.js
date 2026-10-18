// shake blast particles
Object.assign(PlatformerEngine.prototype, {
  // screen shake, bigger wins
  shake(mag, dur) {
    if (window.SHAKE_ON === false) return; // settings calm
    const cur = this.shakeT > 0 ? this.shakeMag * Math.min(1, this.shakeT * 3) : 0;
    if (mag < cur) return;
    this.shakeMag = mag;
    this.shakeT = Math.max(this.shakeT, dur);
  },

  // big code drawn blast
  addBlast(x, y, scale = 1) {
    if (window.FX_ON === false) return; // settings hush
    const add = (o) => this.fx.push(Object.assign({ x, y, vx: 0, vy: 0, age: 0, life: 1, size: 10, grow: 0, drag: 0, grav: 0 }, o));
    add({ kind: 'flash', life: 0.35, size: 260 * scale });
    add({ kind: 'ring', life: 0.55, size: 20, grow: 700 * scale });
    add({ kind: 'ring', life: 0.8, size: 10, grow: 480 * scale, color: '#ffd23f' });
    for (let i = 0; i < 16; i++) {
      // fireball core
      const a = Math.random() * Math.PI * 2, s = Math.random() * 190 * scale;
      add({ kind: 'fire', vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5 + Math.random() * 0.45, size: (26 + Math.random() * 26) * scale, grow: 70 * scale, drag: 2.2 });
    }
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2, s = (60 + Math.random() * 360) * scale;
      add({ kind: 'fire', vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.5, size: (8 + Math.random() * 14) * scale, grow: 25, drag: 2.6 });
    }
    for (let i = 0; i < 28; i++) {
      // dark smoke, drifts up
      const a = Math.random() * Math.PI * 2, s = Math.random() * 150 * scale;
      add({ kind: 'smoke', vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90, life: 1.1 + Math.random() * 0.9, size: (18 + Math.random() * 20) * scale, grow: 36 * scale, drag: 1.6, grav: -40 });
    }
    for (let i = 0; i < 80; i++) {
      // flying sparks
      const a = Math.random() * Math.PI * 2, s = (250 + Math.random() * 850) * scale;
      add({ kind: 'spark', vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.4 + Math.random() * 0.7, size: 2 + Math.random() * 2, drag: 1.4, grav: 900 });
    }
    for (let i = 0; i < 44; i++) {
      // nyan confetti
      const a = Math.random() * Math.PI * 2, s = (120 + Math.random() * 520) * scale;
      add({ kind: 'confetti', vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, life: 0.9 + Math.random() * 0.9, size: 4 + Math.random() * 4, drag: 1.2, grav: 700, hue: Math.floor(Math.random() * 6) * 60, spin: Math.random() * 6.28 });
    }
    if (this.fx.length > FX_MAX) this.fx.splice(0, this.fx.length - FX_MAX);
  },

  stepFx(dt) {
    for (const f of this.fx) {
      f.age += dt;
      if (f.drag) { const k = Math.exp(-f.drag * dt); f.vx *= k; f.vy *= k; }
      if (f.grav) f.vy += f.grav * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.grow) f.size += f.grow * dt;
    }
    this.fx = this.fx.filter((f) => f.age < f.life);
  },

  renderFx(ctx) {
    for (const f of this.fx) {
      const t = f.age / f.life;
      ctx.save();
      if (f.kind === 'flash') {
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
        g.addColorStop(0, 'rgba(255,255,240,1)');
        g.addColorStop(0.35, 'rgba(255,220,120,0.7)');
        g.addColorStop(1, 'rgba(255,120,0,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, 6.2832); ctx.fill();
      } else if (f.kind === 'ring') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.strokeStyle = f.color || '#ffffff';
        ctx.lineWidth = 8 * (1 - t) + 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, 6.2832); ctx.stroke();
      } else if (f.kind === 'halo') {
        // faint ring, barely there
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - t) * 0.45;
        ctx.strokeStyle = f.color || '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, 6.2832); ctx.stroke();
      } else if (f.kind === 'fire') {
        // hot to cool colors
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, 1 - t) * 0.85;
        const fireColor = f.color || (t < 0.2 ? '#fff6c8' : t < 0.45 ? '#ffd23f' : t < 0.75 ? '#ff7a1a' : '#c2260c');
        ctx.fillStyle = fireColor;
        ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(1, f.size * (1 - t * 0.35)), 0, 6.2832); ctx.fill();
      } else if (f.kind === 'splat') {
        const radius = Math.max(1, f.size * (1 - t * 0.3));
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.translate(f.x, f.y);
        ctx.rotate((f.spin || 0) * f.age);
        const points = Array.from({ length: 12 }, (_, i) => {
          const angle = i / 12 * 6.2832;
          const lobe = i % 2 ? 0.62 : 1;
          const wobble = 0.88 + 0.12 * Math.sin(i * 3.7 + (f.seed || 0));
          return { x: Math.cos(angle) * radius * lobe * wobble, y: Math.sin(angle) * radius * lobe * wobble };
        });
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
        ctx.fillStyle = f.color || '#249bff';
        ctx.strokeStyle = f.outline || '#12324f';
        ctx.lineWidth = Math.max(1.5, radius * 0.2);
        ctx.lineJoin = 'round';
        ctx.fill(); ctx.stroke();
      } else if (f.kind === 'smoke') {
        ctx.globalAlpha = Math.max(0, (1 - t)) * 0.55;
        ctx.fillStyle = t < 0.3 ? '#4a4a52' : '#2b2b31';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, 6.2832); ctx.fill();
      } else if (f.kind === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = t < 0.4 ? '#fff2a8' : '#ff9a2a';
        ctx.lineWidth = f.size;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 0.035, f.y - f.vy * 0.035); ctx.stroke();
      } else if (f.kind === 'confetti') {
        ctx.globalAlpha = Math.min(1, (1 - t) * 2);
        ctx.translate(f.x, f.y);
        ctx.rotate(f.spin + f.age * 9);
        ctx.fillStyle = `hsl(${f.hue}, 100%, 55%)`;
        ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size * 0.6);
      } else if (f.kind === 'sprite') {
        // one-shot frames, then gone
        const fr = f.imgs[Math.min(f.imgs.length - 1, Math.floor(f.age / f.step))];
        if (fr && fr.complete && fr.naturalWidth) {
          const dw = fr.naturalWidth * (f.size || 2), dh = fr.naturalHeight * (f.size || 2);
          ctx.globalAlpha = Math.max(0, 1 - t);
          ctx.drawImage(fr, f.x - dw / 2, f.y - dh / 2, dw, dh);
        }
      }
      ctx.restore();
    }
  },

  // lux glow, chunky cartoon bits
  luxGlow(x, y, color, n, spread) {
    if (window.FX_ON === false) return; // settings hush
    if (this.fx.length > 650) return; // cap guard
    for (let i = 0; i < (n || 8); i++) {
      const a = Math.random() * 6.2832, s = Math.random() * (spread || 120);
      this.fx.push({
        kind: 'splat', x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(a) * s * 0.4, vy: Math.sin(a) * s * 0.4 - 55,
        age: 0, life: 0.7 + Math.random() * 0.5,
        size: 3 + Math.random() * 3, drag: 1.6,
        color: color || '#ffe93b', seed: Math.random() * 6.2832,
        spin: (Math.random() - 0.5) * 4, grow: 2,
      });
    }
  },

  // lux ring, faint halo
  luxRing(x, y, color, grow) {
    if (window.FX_ON === false) return; // settings hush
    if (this.fx.length > 650) return; // cap guard
    this.fx.push({ kind: 'halo', x, y, vx: 0, vy: 0, age: 0, life: 0.5, size: 10, grow: (grow || 420) * 0.45, color: color || '#ffffff' });
  },

  // sprite puff, plays once
  spawnSprite(x, y, imgs, step) {
    if (window.FX_ON === false) return; // settings hush
    if (!imgs || !imgs.length) return; // nothing to play
    if (this.fx.length > 650) return; // cap guard
    const st = step || 0.15;
    this.fx.push({ kind: 'sprite', x, y, vx: 0, vy: -30, age: 0, life: imgs.length * st, size: 2, drag: 0, imgs, step: st });
  },
});
