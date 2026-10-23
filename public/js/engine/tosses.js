// bomb toss arcs
Object.assign(PlatformerEngine.prototype, {
  // bomb toss arc
  addToss(x, y, vx, vy, img, id = null, throwerId = null) {
    // collides with walls
    const b = new Body(x - BOMB_R, y - BOMB_R, BOMB_R * 2, BOMB_R * 2, { color: '#333' });
    b.vel.x = vx; b.vel.y = vy;
    const t = { 
      body: b, 
      x, y, 
      age: 0, 
      landed: false, 
      img, 
      id,
      throwerId, // thrower sync id
      // for arc visualization
      startX: x,
      startY: y,
      startVx: vx,
      startVy: vy,
      arcPoints: [], // precomputed arc for rendering
    };
    this.tosses.push(t);
    if (this.tosses.length > 8) this.tosses.shift();
    return t;
  },

  // toss physics with drag
  stepTosses(dt) {
    for (const t of this.tosses) {
      t.age += dt;
      if (t.landed) { t.landedAge = (t.landedAge ?? 0) + dt; continue; }
      const b = t.body;
      
      // apply gravity
      b.vel.y += this.tossGravity * dt;
      
      // air drag slows bomb
      const speed = Math.hypot(b.vel.x, b.vel.y);
      if (speed > 0) {
        const dragForce = BOMB_DRAG * speed * speed;
        const dragX = -dragForce * (b.vel.x / speed);
        const dragY = -dragForce * (b.vel.y / speed);
        b.vel.x += dragX * dt;
        b.vel.y += dragY * dt;
      }
      
      b.onGround = false;
      this.moveBody(b, dt, this.statics); // walls and floors
      t.x = b.pos.x + b.w / 2;
      t.y = b.pos.y + b.h / 2;
      // spring bounce, keeps its speed
      if (b.vel.y > 0 && !b.onGround) {
        const bcx = b.pos.x + b.w / 2, feet = b.pos.y + b.h;
        for (const sp of this.springs) {
          if (sp.map !== this.activeMap || sp.cd > this.time) continue;
          if (Math.abs(bcx - (sp.x + sp.w / 2)) < (b.w + sp.w) / 2 &&
              feet > sp.y + 4 && feet < sp.y + sp.h + 14) {
            sp.cd = this.time + 6;
            b.vel.y = -sp.power;
            t.x = b.pos.x + b.w / 2;
            t.y = b.pos.y + b.h / 2;
            if (this.onTossBounce) this.onTossBounce(t);
            break;
          }
        }
      }
      if (b.onGround) {
        t.landed = true;
        t.groundY = b.pos.y + b.h; // surface under it
        if (this.onTossLand) this.onTossLand(t);
      } else if (b.pos.y > this.fallY) {
        t.landed = true;
        t.dead = true; // sailed off
      }
    }
    // midair hits
    const flying = this.tosses.filter((t) => !t.landed && !t.dead);
    for (let i = 0; i < flying.length; i++) {
      for (let j = i + 1; j < flying.length; j++) {
        const a = flying[i], c = flying[j];
        if (Math.abs(a.x - c.x) < 30 && Math.abs(a.y - c.y) < 30) {
          a.landed = true; a.dead = true;
          c.landed = true; c.dead = true;
          this.addBoom((a.x + c.x) / 2, (a.y + c.y) / 2);
          if (this.onTossBoom) this.onTossBoom(a, c);
        }
      }
    }
    // landed bombs linger briefly
    // stops instant vanish bug
    this.tosses = this.tosses.filter((t) => !(t.landed && (t.landedAge ?? 0) > 0.6));
  },

  // compute arc for drawing
  computeArc(t, maxTime = 3.0, step = 0.05) {
    if (t.arcPoints && t.arcPoints.length > 0) return t.arcPoints;
    
    const points = [];
    let x = t.startX;
    let y = t.startY;
    let vx = t.startVx;
    let vy = t.startVy;
    
    for (let time = 0; time < maxTime; time += step) {
      points.push({ x, y });
      
      // apply gravity
      vy += this.tossGravity * step;
      
      // apply drag
      const speed = Math.hypot(vx, vy);
      if (speed > 0) {
        const dragForce = BOMB_DRAG * speed * speed;
        vx -= dragForce * (vx / speed) * step;
        vy -= dragForce * (vy / speed) * step;
      }
      
      x += vx * step;
      y += vy * step;
      
      // stop below fall line
      if (y > this.fallY) break;
    }
    
    t.arcPoints = points;
    return points;
  },

  // bomb pop
  addBoom(x, y, scale = 1) {
    if (window.FX_ON === false) return null; // settings hush
    // fresh img per boom
    let img = null;
    const b = { x, y, age: 0, scale, img, loaded: false };
    if (this.boomImg && this.boomImg.src) {
      img = new Image();
      img.src = this.boomImg.src;
      img.style.position = 'fixed'; img.style.visibility = 'hidden'; img.style.left = '-9999px';
      document.body.appendChild(img); // needs page attachment
      img.onload = () => { b.loaded = true; b.age = 0; }; // starts on first paint
      b.img = img;
      b.node = img; // for later removal
    }
    this.booms.push(b);
    if (this.booms.length > 12) this.booms.shift(); // trim spares
    return this.booms[this.booms.length - 1];
  },
});
