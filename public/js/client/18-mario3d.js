// live 3D Mario layer
(function () {
  'use strict';

  const MODEL_URL = './Assets/Images/Characters/Survivors/Mario/mario.glb';
  const CLIPS = {
    idle: 'Other Standing Normal Part 1',
    walk: 'Walking (Not running)',
    run: 'Running 1',
    jump: 'Normal jump',
    fall: 'Fall from height',
    land: 'Normal Jump land',
    hurt: 'Get bumped by enemy',
    stun: 'Stuck looking around',
    cower: 'crouching',
    spin: 'Other triple jump and start flying',
    dive: 'Belly flop',
    punch: 'Punch right',
    pulled: 'Picked up by enemy',
  };
  const FACE_RIGHT = Math.PI / 2 - 0.16;
  const BODY_SCALE = 0.92;
  const EXTRA_MESHES = [
    'Head no cap',
    'right hand open',
    'left hand cap',
    'left hand open',
    'left hand peace',
    'left hand wing cap',
    'Wings',
    'Sphere',
  ];

  let ready = false;
  let failed = false;
  let renderer = null;
  let scene = null;
  let camera = null;
  let overlay = null;
  let gameCanvas = null;
  let template = null;
  let clips = null;
  let baseHeight = 1;
  let pending = [];
  const opaqueMaps = new Map();
  const instances = new Map();
  let lastUpdate = performance.now();
  let lastW = 0;
  let lastH = 0;
  let layoutTick = 0;

  function isMario(b) {
    return !!b && b.char === 'mario' && !b.evil;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('failed ' + src));
      document.head.appendChild(s);
    });
  }

  function layout() {
    if (!renderer || !gameCanvas) return;
    const cw = gameCanvas.clientWidth;
    const ch = gameCanvas.clientHeight;
    if (cw < 1 || ch < 1) return;
    const ar = gameCanvas.width / gameCanvas.height;
    let vw = cw;
    let vh = cw / ar;
    if (vh > ch) {
      vh = ch;
      vw = ch * ar;
    }
    const left = gameCanvas.offsetLeft + gameCanvas.clientLeft + (cw - vw) / 2;
    const top = gameCanvas.offsetTop + gameCanvas.clientTop + (ch - vh) / 2;
    const w = Math.max(1, Math.round(vw));
    const h = Math.max(1, Math.round(vh));
    overlay.style.left = Math.round(left) + 'px';
    overlay.style.top = Math.round(top) + 'px';
    if (w !== lastW || h !== lastH) {
      renderer.setSize(w, h, true);
      lastW = w;
      lastH = h;
    }
  }

  function measure(root) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    let any = false;
    root.traverse((o) => {
      if (!o.isSkinnedMesh || !o.geometry || !o.geometry.attributes.position) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        o.boneTransform(i, v);
        v.applyMatrix4(o.matrixWorld);
        box.expandByPoint(v);
        any = true;
      }
    });
    if (!any || !isFinite(box.min.y)) return new THREE.Box3().setFromObject(root);
    return box;
  }

  function setupScene() {
    gameCanvas = document.getElementById('game');
    if (!gameCanvas) throw new Error('no game canvas');
    const stage = gameCanvas.parentNode;

    overlay = document.createElement('canvas');
    overlay.id = 'mario3d';
    overlay.style.cssText =
      'position:absolute;left:0;top:0;pointer-events:none;image-rendering:auto;' +
      'border:none;background:transparent;';
    stage.insertBefore(overlay, gameCanvas.nextSibling);

    renderer = new THREE.WebGLRenderer({
      canvas: overlay,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(0, game.width, game.height, 0, 0.1, 1000);
    camera.position.set(0, 0, 100);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6f7a, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(2, 3, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcfe4ff, 0.2);
    fill.position.set(-3, 1, 2);
    scene.add(fill);

    window.addEventListener('resize', layout, { passive: true });
    document.addEventListener('fullscreenchange', () => {
      layout();
      setTimeout(layout, 80);
    });
    if (window.ResizeObserver) {
      new ResizeObserver(layout).observe(gameCanvas);
    }
  }

  function loadModel() {
    return new Promise((resolve, reject) => {
      new THREE.GLTFLoader().load(MODEL_URL, resolve, undefined, reject);
    });
  }

  function srgb(hex) {
    return new THREE.Color(hex).convertSRGBToLinear();
  }

  function materialKey(materialName) {
    return materialName.toLowerCase().replace(/_v\d+$/, '');
  }

  function makeOpaqueMap(texture, baseColor, materialName) {
    let maps = opaqueMaps.get(texture);
    if (!maps) {
      maps = new Map();
      opaqueMaps.set(texture, maps);
    }
    const name = materialKey(materialName);
    const cacheKey = name + ':' + baseColor;
    if (maps.has(cacheKey)) return maps.get(cacheKey);
    const image = texture.image;
    const canvas = document.createElement('canvas');
    canvas.width = image.width || image.naturalWidth;
    canvas.height = image.height || image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const red = (baseColor >> 16) & 0xff;
    const green = (baseColor >> 8) & 0xff;
    const blue = baseColor & 0xff;
    const sideburn = name.indexOf('sideburn') === 0;
    const hairRed = 0x4a;
    const hairGreen = 0x2a;
    const hairBlue = 0x14;
    for (let i = 0; i < pixels.data.length; i += 4) {
      const x = (i / 4) % canvas.width;
      const y = Math.floor(i / 4 / canvas.width);
      const alpha = pixels.data[i + 3] / 255;
      const whiteBackground =
        pixels.data[i] >= 240 &&
        pixels.data[i + 1] >= 240 &&
        pixels.data[i + 2] >= 240;
      const faceFeatures =
        name.indexOf('face') === 0 &&
        ((((x - canvas.width * 0.31) / (canvas.width * 0.14)) ** 2 +
          ((y - canvas.height * 0.625) / (canvas.height * 0.27)) ** 2 <=
          1) ||
          (((x - canvas.width * 0.73) / (canvas.width * 0.14)) ** 2 +
            ((y - canvas.height * 0.625) / (canvas.height * 0.27)) ** 2 <=
            1) ||
          (whiteBackground === false &&
            y <= canvas.height * 0.3 &&
            ((x >= canvas.width * 0.1 && x <= canvas.width * 0.44) ||
              (x >= canvas.width * 0.59 && x <= canvas.width * 0.91))));
      if (name.indexOf('body') === 0) {
        const redPixel = pixels.data[i];
        const greenPixel = pixels.data[i + 1];
        const bluePixel = pixels.data[i + 2];
        if (
          Math.max(redPixel, greenPixel, bluePixel) -
            Math.min(redPixel, greenPixel, bluePixel) <
          18
        ) {
          pixels.data[i] = (redPixel * red) / 255;
          pixels.data[i + 1] = (greenPixel * green) / 255;
          pixels.data[i + 2] = (bluePixel * blue) / 255;
        }
        pixels.data[i + 3] = 255;
        continue;
      }
      if (sideburn) {
        const mask = whiteBackground ? 0 : Math.min(1, pixels.data[i + 3] / 64);
        pixels.data[i] = red * (1 - mask) + hairRed * mask;
        pixels.data[i + 1] = green * (1 - mask) + hairGreen * mask;
        pixels.data[i + 2] = blue * (1 - mask) + hairBlue * mask;
        pixels.data[i + 3] = 255;
        continue;
      }
      if (name.indexOf('face') === 0 && faceFeatures) {
        pixels.data[i + 3] = 255;
        continue;
      }
      if (name.indexOf('mustache') === 0) {
        if (whiteBackground) {
          pixels.data[i] = red;
          pixels.data[i + 1] = green;
          pixels.data[i + 2] = blue;
        } else {
          pixels.data[i] = pixels.data[i] * alpha + hairRed * (1 - alpha);
          pixels.data[i + 1] = pixels.data[i + 1] * alpha + hairGreen * (1 - alpha);
          pixels.data[i + 2] = pixels.data[i + 2] * alpha + hairBlue * (1 - alpha);
        }
        pixels.data[i + 3] = 255;
        continue;
      }
      const capBadge =
        name.indexOf('cap') === 0 &&
        Math.pow((x - canvas.width / 2) / (canvas.width * 0.27), 2) +
          Math.pow((y - canvas.height / 2) / (canvas.height * 0.27), 2) <=
          1;
      if (
        whiteBackground &&
        (name.indexOf('face') === 0 ||
          name.indexOf('mustache') === 0 ||
          (name.indexOf('cap') === 0 && !capBadge))
      ) {
        pixels.data[i] = red;
        pixels.data[i + 1] = green;
        pixels.data[i + 2] = blue;
      } else {
        pixels.data[i] = pixels.data[i] * alpha + red * (1 - alpha);
        pixels.data[i + 1] = pixels.data[i + 1] * alpha + green * (1 - alpha);
        pixels.data[i + 2] = pixels.data[i + 2] * alpha + blue * (1 - alpha);
      }
      pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const map = texture.clone();
    map.image = canvas;
    if (sideburn) {
      map.wrapS = THREE.ClampToEdgeWrapping;
      map.wrapT = THREE.ClampToEdgeWrapping;
    }
    map.needsUpdate = true;
    maps.set(cacheKey, map);
    return map;
  }

  function styleMaterial(src) {
    if (!src) return src;
    const name = materialKey(src.name || '');
    const material = src.clone();
    material.side = THREE.DoubleSide;
    material.metalness = 0;
    material.roughness = 0.8;
    if (
      name.indexOf('face') === 0 ||
      name.indexOf('mustache') === 0 ||
      name.indexOf('sideburn') === 0
    ) {
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      material.polygonOffsetUnits = -1;
    }
    let baseColor = 0xffffff;
    if (name.indexOf('body') === 0) {
      baseColor = 0x2446c8;
    } else if (name.indexOf('face') === 0) {
      baseColor = 0xf2b98b;
    } else if (name.indexOf('cap') === 0) {
      baseColor = 0xe52521;
    } else if (name.indexOf('shoes') === 0) {
      baseColor = 0x71401e;
    } else if (name.indexOf('hair') === 0) {
      baseColor = 0x4a2a14;
    } else if (name.indexOf('sideburn') === 0 || name.indexOf('mustache') === 0) {
      baseColor = 0xf2b98b;
    } else if (name.indexOf('gloves') === 0) {
      baseColor = 0xffffff;
    }
    material.vertexColors = false;
    material.transparent = false;
    material.alphaTest = 0;
    material.depthWrite = true;
    material.color.copy(srgb(baseColor));
    if (material.map) {
      material.map = makeOpaqueMap(material.map, baseColor, name);
      material.color.setRGB(1, 1, 1);
    }
    if (material.map) {
      material.map.encoding = THREE.sRGBEncoding;
      material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      material.map.needsUpdate = true;
    }
    return material;
  }

  function prepare(gltf) {
    const src = gltf.scene;
    const holder = new THREE.Group();
    holder.add(src);
    const idleClip = THREE.AnimationClip.findByName(gltf.animations, CLIPS.idle);
    const modelClips = gltf.animations;

    const extra = EXTRA_MESHES.map((n) => n.replace(/ /g, '_').toLowerCase());
    const dropped = [];
    holder.traverse((o) => {
      if (!o.isMesh) return;
      const name = o.name.replace(/ /g, '_').toLowerCase();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const wing = mats.some((m) => m && /wing/i.test(m.name || ''));
      const strayFace =
        o.geometry.attributes.position &&
        o.geometry.attributes.position.count <= 3 &&
        mats.some((m) => m && /^face/i.test(m.name || ''));
      if (!o.isSkinnedMesh || wing || strayFace || extra.indexOf(name) >= 0) dropped.push(o);
    });
    for (const o of dropped) if (o.parent) o.parent.remove(o);

    const styled = new Map();
    holder.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const source = Array.isArray(o.material) ? o.material : [o.material];
      const mats = source.map((m) => {
        if (!m) return m;
        let out = styled.get(m);
        if (!out) {
          out = styleMaterial(m);
          styled.set(m, out);
        }
        return out;
      });
      o.material = Array.isArray(o.material) ? mats : mats[0];
    });
    const temp = new THREE.AnimationMixer(holder);
    if (idleClip) {
      temp.clipAction(THREE.AnimationClip.findByName(modelClips, CLIPS.idle)).play();
      temp.update(0.4);
    }
    holder.updateMatrixWorld(true);
    const box = measure(holder);
    temp.stopAllAction();

    const h = box.max.y - box.min.y;
    if (!isFinite(h) || h < 0.01) throw new Error('bad model bounds');

    src.position.x -= (box.min.x + box.max.x) / 2;
    src.position.y -= box.min.y;
    src.position.z -= (box.min.z + box.max.z) / 2;

    holder.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false;
    });

    template = holder;
    baseHeight = h;
    clips = modelClips;
    ready = true;
    layout();
    console.log('[Mario3D] ready, height', h.toFixed(2), 'clips', clips.length);
  }

  function makeInstance(body) {
    const root = THREE.SkeletonUtils.clone(template);
    root.rotation.y = FACE_RIGHT;
    root.visible = false;
    scene.add(root);

    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    for (const key of Object.keys(CLIPS)) {
      const clip = THREE.AnimationClip.findByName(clips, CLIPS[key]);
      if (!clip) continue;
      const action = mixer.clipAction(clip);
      if (key === 'idle') {
        action.setLoop(THREE.LoopPingPong, Infinity);
      } else if (key === 'land' || key === 'punch' || key === 'dive') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      actions[key] = action;
    }

    const inst = {
      body,
      root,
      mixer,
      actions,
      key: '',
      action: null,
      lastSeen: performance.now(),
      wasGround: body.onGround !== false,
      lastVy: 0,
      landUntil: 0,
      idleStarted: false,
    };
    instances.set(body, inst);
    return inst;
  }

  function play(inst, key, speed) {
    if (inst.key === key) {
      if (inst.action) inst.action.timeScale = speed;
      return;
    }
    const next = inst.actions[key] || inst.actions.idle;
    if (!next) return;
    const prev = inst.action;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.setEffectiveTimeScale(speed);
    next.play();
    if (key === 'idle' && !inst.idleStarted) {
      inst.idleStarted = true;
      next.time = Math.random() * next.getClip().duration;
    }
    if (prev && prev !== next) next.crossFadeFrom(prev, 0.14, false);
    inst.key = key;
    inst.action = next;
  }

  function resolve(inst, body, now) {
    const sprites = body.sprites;
    const actionImg = body.actionImg;
    const poseImg =
      body.isRemote && body.poseImg && now < (body.poseUntil || 0) ? body.poseImg : null;
    const marioAction = body.mario3dAction || body.anim;
    const isSpin =
      marioAction === 'mspin' ||
      !!(actionImg && sprites && sprites.spin && sprites.spin.indexOf(actionImg) >= 0);
    const isDive = marioAction === 'mdive';
    const air = body.onGround === false;
    const vy = (body.vel && body.vel.y) || 0;
    const speed = Math.abs((body.vel && body.vel.x) || 0);

    if (air) inst.lastVy = vy;
    if (!inst.wasGround && !air && inst.lastVy > 220 && speed < 140) {
      inst.landUntil = now + 260;
    }
    inst.wasGround = !air;

    let key = 'idle';
    let ts = 1;
    const stunned =
      (body.stunT || 0) > 0 ||
      (body.isRemote && (body.stunned || (body.stun || 0) > 0));

    if (stunned) {
      key = 'stun';
    } else if (isDive) {
      key = 'dive';
      ts = 1.4;
    } else if (isSpin) {
      key = 'spin';
      ts = 1.35;
    } else if (now < inst.landUntil) {
      key = 'land';
    } else if (body.pulled) {
      key = 'pulled';
    } else if (body.cowering || body.tremble) {
      key = 'cower';
    } else if (air) {
      key = vy > 0 ? 'fall' : 'jump';
    } else if (body.animMoving || speed > 25) {
      if (body.animRunning) {
        key = 'run';
        ts = 2 * Math.max(1.8, Math.min(5.5, speed / 120));
      } else {
        key = 'walk';
        ts = Math.max(1.6, Math.min(5, speed / 55));
      }
    }

    play(inst, key, ts);
  }

  function flush() {
    if (failed) {
      pending.length = 0;
      return;
    }
    if (!ready) {
      pending.length = 0;
      return;
    }

    if (++layoutTick % 20 === 0) layout();
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - lastUpdate) / 1000));
    lastUpdate = now;

    renderer.clear();
    for (const inst of instances.values()) inst.root.visible = false;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      const inst = instances.get(item.body) || makeInstance(item.body);
      inst.lastSeen = now;
      inst.root.visible = true;
      resolve(inst, item.body, now);
      inst.mixer.update(dt);
      const scale = Math.max(10, item.h * BODY_SCALE) / baseHeight;
      inst.root.position.set(item.x, game.height - item.y, 0);
      inst.root.rotation.y = (item.body.facing || 1) < 0 ? -FACE_RIGHT : FACE_RIGHT;
      inst.root.scale.setScalar(scale);
    }
    if (pending.length) renderer.render(scene, camera);
    pending.length = 0;

    for (const [body, inst] of instances) {
      if (now - inst.lastSeen > 2500) {
        scene.remove(inst.root);
        inst.mixer.stopAllAction();
        instances.delete(body);
      }
    }
  }

  function queue(body) {
    if (!ready || failed || !isMario(body)) return false;
    pending.push({
      body,
      x: body.pos.x + body.w / 2 - game.camera.x,
      y: body.pos.y + body.h - game.camera.y,
      h: body.drawH || body.h,
    });
    return true;
  }

  window.Mario3D = { queue, flush };

  function start() {
    loadScript('./vendor/three.min.js')
      .then(() => loadScript('./vendor/GLTFLoader.js'))
      .then(() => loadScript('./vendor/SkeletonUtils.js'))
      .then(() => {
        setupScene();
        return loadModel();
      })
      .then(prepare)
      .catch((err) => {
        failed = true;
        ready = false;
        console.warn('[Mario3D] disabled:', err && err.message ? err.message : err);
      });
  }

  start();
})();
