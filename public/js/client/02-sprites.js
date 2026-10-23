    // lux sprites
    const luxSprites = {
      idle: [loadImg(LUX + "idle1.png"), loadImg(LUX + "idle2.png")],
      walk: [loadImg(LUX + "walk1.png"), loadImg(LUX + "walk2.png")],
      run: [loadImg(LUX + "run1.png"), loadImg(LUX + "run2.png")], // run cycle
      jump: loadImg(LUX + "jump.png"),
      stun: loadImg(LUX + "hit.png"),
      struggle: [loadImg(LUX + "struggle1.png"), loadImg(LUX + "struggle2.png")],
      cower: loadImg(LUX + "cower.png"),
      pray: [loadImg(LUX + "pray.png")],
      prayend: loadImg(LUX + "prayend.png"),
      adrun: [loadImg(LUX + "adrun1.png"), loadImg(LUX + "adrun2.png")],
      pant: [loadImg(LUX + "pant.png"), loadImg(LUX + "pant2.png")],
    };
    const luxDimSprites = { ...luxSprites,
      idle: [loadImg(LUX + "idle1d2.png")],
      walk: [loadImg(LUX + "walk1d.png"), loadImg(LUX + "walk1d2.png")],
      jump: loadImg(LUX + "jumpd3.png"),
    };
    const luxDash = loadImg(LUX + "dash.png");
    // pick roster
    const CS = "./Assets/Images/UI/CharacterSelect/";
    const ROSTER = [
      { id: 'lux', name: 'LUX', nameImg: CS + 'luxname.png' },
      { id: 'toko', name: 'TOKO', nameImg: CS + 'tokoname.png' },
      { id: 'sonic', name: 'SONIC', nameImg: CS + 'sonicname.png' },
      { id: 'supersonic', name: 'SUPER SONIC', nameImg: CS + 'supersonicname.png' },
      { id: 'tails', name: 'TAILS', nameImg: CS + 'tailsname.png' },
      { id: 'nyan', name: 'NYAN CYAT', nameImg: CS + 'nyanname.png' },
      { id: 'mario', name: 'MARIO', nameImg: CS + 'marioname.png' },
      { id: 'noelle', name: 'NOELLE', nameImg: CS + 'noelle_name.png' },
    ];
    const TOKO = "./Assets/Images/Characters/Survivors/Toko/";
    const tokoSprites = {
      idle: [loadImg(TOKO + "idle1.png"), loadImg(TOKO + "idle2.png")],
      walk: [loadImg(TOKO + "walk1.png"), loadImg(TOKO + "walk2.png")],
      run: [loadImg(TOKO + "run1.png"), loadImg(TOKO + "run2.png")],
      jump: loadImg(TOKO + "jump1.png"),
      stun: loadImg(TOKO + "jab.png"),
      struggle: [loadImg(TOKO + "walk1.png"), loadImg(TOKO + "walk2.png")],
      cower: loadImg(TOKO + "idle1.png"),
      dash: loadImg(TOKO + "run1.png"),
      kick: [loadImg(TOKO + "kick.png"), loadImg(TOKO + "kick2.png")],
      jab: [loadImg(TOKO + "jab.png"), loadImg(TOKO + "jab2.png")],
    };
    const SONIC = "./Assets/Images/Characters/Survivors/Sonic/";
    const sonicSprites = {
      idle: [loadImg(SONIC + "idle (1).png"), loadImg(SONIC + "idlelong.png"), loadImg(SONIC + "idlelong2.png"), loadImg(SONIC + "idlelong3.png"), loadImg(SONIC + "idlelong4.png"), loadImg(SONIC + "idlelong5.png"), loadImg(SONIC + "idlelong6.png"), loadImg(SONIC + "idlelong7.png")],
      walk: [loadImg(SONIC + "walk.png"), loadImg(SONIC + "walk2.png"), loadImg(SONIC + "walk3.png"), loadImg(SONIC + "walk4.png"), loadImg(SONIC + "walk5.png"), loadImg(SONIC + "walk6.png"), loadImg(SONIC + "walk7.png"), loadImg(SONIC + "walk8.png")],
      run: [loadImg(SONIC + "run.png"), loadImg(SONIC + "run2.png"), loadImg(SONIC + "run3.png"), loadImg(SONIC + "run4.png"), loadImg(SONIC + "run5.png"), loadImg(SONIC + "run6.png"), loadImg(SONIC + "run7.png"), loadImg(SONIC + "run8.png")],
      runStride: 35,
      jump: [loadImg(SONIC + "jump.png"), loadImg(SONIC + "roll.png"), loadImg(SONIC + "roll2.png"), loadImg(SONIC + "roll3.png"), loadImg(SONIC + "roll4.png"), loadImg(SONIC + "roll5.png"), loadImg(SONIC + "roll6.png"), loadImg(SONIC + "roll7.png")],
      jumpScale: 0.87,
      stun: loadImg(SONIC + "stun.png"),
      struggle: [loadImg(SONIC + "struggle.png"), loadImg(SONIC + "struggle2.png")],
      cower: loadImg(SONIC + "idle (1).png"),
      dash: loadImg(SONIC + "run.png"),
      peel: [loadImg(SONIC + "peelout.png"), loadImg(SONIC + "peelout2.png"), loadImg(SONIC + "peelout3.png"), loadImg(SONIC + "peelout4.png")],
      spin: [loadImg(SONIC + "spindash.png"), loadImg(SONIC + "spindash2.png"), loadImg(SONIC + "spindash3.png")],
      charge: [loadImg(SONIC + "peeloutcharge1.png"), loadImg(SONIC + "peeloutcharge2.png"), loadImg(SONIC + "peeloutcharge3.png"), loadImg(SONIC + "peeloutcharge4.png")],
      fall: loadImg(SONIC + "fall.png"),
    };
    const TAILS = "./Assets/Images/Characters/Survivors/Tails/";
    const tailsSprites = {
      idle: [loadImg(TAILS + "idle.png"), loadImg(TAILS + "idle.png"), loadImg(TAILS + "idle.png"), loadImg(TAILS + "idle_blink1.png"), loadImg(TAILS + "idle_blink2.png")],
      walk: [loadImg(TAILS + "walk1.png"), loadImg(TAILS + "walk2.png"), loadImg(TAILS + "walk3.png"), loadImg(TAILS + "walk4.png"), loadImg(TAILS + "walk5.png"), loadImg(TAILS + "walk6.png")],
      run: [loadImg(TAILS + "run1.png"), loadImg(TAILS + "run2.png"), loadImg(TAILS + "run3.png"), loadImg(TAILS + "run4.png"), loadImg(TAILS + "run5.png"), loadImg(TAILS + "run6.png")],
      jump: loadImg(TAILS + "jump.png"),
      fall: loadImg(TAILS + "fall.png"),
      fly: [loadImg(TAILS + "fly.png"), loadImg(TAILS + "fly2.png"), loadImg(TAILS + "fly3.png")],
      stun: loadImg(TAILS + "fall.png"),
      struggle: [loadImg(TAILS + "fall.png")],
      cower: loadImg(TAILS + "idle_blink2.png"),
      dash: loadImg(TAILS + "run1.png"),
      whip: [loadImg(TAILS + "tailwhip.png"), loadImg(TAILS + "tailwhip2.png"), loadImg(TAILS + "tailwhip3.png"), loadImg(TAILS + "tailwhip4.png"), loadImg(TAILS + "tailwhip5.png"), loadImg(TAILS + "tailwhip6.png"), loadImg(TAILS + "tailwhip7.png")],
      throw: [loadImg(TAILS + "throw.png"), loadImg(TAILS + "throw2.png")],
      airthrow: [loadImg(TAILS + "airthrow.png"), loadImg(TAILS + "airthrow2.png")],
      bomb: loadImg(TAILS + "bomb.png"),
    };
    const tailsCarrySprites = { ...tailsSprites,
      idle: [loadImg(TAILS + "bombcarry.png")],
      walk: [loadImg(TAILS + "bombcarry.png"), loadImg(TAILS + "bombcarry2.png"), loadImg(TAILS + "bombcarry3.png"), loadImg(TAILS + "bombcarry4.png"), loadImg(TAILS + "bombcarry5.png"), loadImg(TAILS + "bombcarry6.png")],
      run: [loadImg(TAILS + "bombcarry.png"), loadImg(TAILS + "bombcarry2.png"), loadImg(TAILS + "bombcarry3.png"), loadImg(TAILS + "bombcarry4.png"), loadImg(TAILS + "bombcarry5.png"), loadImg(TAILS + "bombcarry6.png")],
      jump: loadImg(TAILS + "jumpcarry.png"),
    };
    const SSP = "./Assets/Images/Characters/Survivors/SuperSonic/";
    const superSprites = {
      idle: [loadImg(SSP + "idle1.png"), loadImg(SSP + "idle2.png"), loadImg(SSP + "idle3.png")],
      walk: [loadImg(SSP + "walk1.png"), loadImg(SSP + "walk2.png"), loadImg(SSP + "walk3.png"), loadImg(SSP + "walk4.png"), loadImg(SSP + "walk5.png"), loadImg(SSP + "walk6.png")],
      run: [loadImg(SSP + "run1.png"), loadImg(SSP + "run2.png")],
      runStride: 35,
      jump: [loadImg(SSP + "roll1.png"), loadImg(SSP + "roll2.png"), loadImg(SSP + "roll3.png"), loadImg(SSP + "roll4.png")],
      jumpScale: 0.87,
      stun: loadImg(SSP + "stun.png"),
      stun2: loadImg(SSP + "stun2.png"),
      struggle: [loadImg(SSP + "struggle1.png"), loadImg(SSP + "struggle2.png")],
      cower: loadImg(SSP + "duck2.png"),
      duck: [loadImg(SSP + "duck.png"), loadImg(SSP + "duck2.png"), loadImg(SSP + "duck3.png")],
      dash: loadImg(SSP + "run1.png"),
      skid: [loadImg(SSP + "skid1.png"), loadImg(SSP + "skid2.png")],
      boost: [loadImg(SSP + "boost.png"), loadImg(SSP + "boost2.png")],
      spin: [loadImg(SSP + "spindash1.png"), loadImg(SSP + "spindash2.png"), loadImg(SSP + "spindash3.png")],
      guard: loadImg(SSP + "guard.png"),
      // skip missing transform4
      transform: [loadImg(SSP + "transform.png"), loadImg(SSP + "transform2.png"), loadImg(SSP + "transform3.png"), loadImg(SSP + "transform5.png"), loadImg(SSP + "transform6.png"), loadImg(SSP + "transform7.png"), loadImg(SSP + "transform8.png"), loadImg(SSP + "rollflash.png")],
      fall: loadImg(SSP + "roll1.png"),
    };
    const NYAN = "./Assets/Images/Characters/Survivors/NyanCyat/";
    const nyanRun = [1, 2, 3, 4, 5, 6].map((n) => loadImg(NYAN + `main-${n}.png`)); // one loop fits all
    const nyanSprites = {
      idle: nyanRun,
      idleFps: 10,
      walk: nyanRun,
      walkStride: 16,
      run: nyanRun,
      runStride: 12,
      jump: nyanRun[2],
      fall: nyanRun[2],
      stun: nyanRun[0],
      struggle: [nyanRun[0], nyanRun[1]],
      cower: nyanRun[0],
      dash: nyanRun[0],
      trail: loadImg(NYAN + "rainbow.png"), // cat rainbow trail
    };
    const MARIO = "./Assets/Images/Characters/Survivors/Mario/";
    const marioStand = [];
    for (let n = 1; n <= 26; n++) marioStand.push(loadImg(MARIO + `standing_sprites/sprite-2-${n}.png`));
    const marioWalk = [];
    for (let n = 1; n <= 14; n++) marioWalk.push(loadImg(MARIO + `walkingsprites/sprite-4-${n}.png`));
    const marioRun = [];
    for (let n = 1; n <= 8; n++) marioRun.push(loadImg(MARIO + `running_sprites/sprite-5-${n}.png`));
    const marioJump = loadImg(MARIO + "jump.png");
    const marioFall = loadImg(MARIO + "fall.png");
    const marioStun = loadImg(MARIO + "stun.png");
    const marioSpin = [1, 2, 3, 4].map((n) => loadImg(MARIO + `spinjump/sprite-42-${n}.png`));
    const marioLuma = [1, 2, 3, 4].map((n) => loadImg(MARIO + `luma_particle/sprite-41-${n}.png`));
    const marioSprites = {
      idle: marioStand,
      idleFps: 8, // fast flip
      walk: marioWalk,
      walkStride: 24, // slower flip
      run: marioRun,
      runStride: 32, // slower flip
      jump: marioJump,
      fall: marioFall,
      spin: marioSpin, // extra jump
      luma: marioLuma, // one-shot puff
      dive: marioFall,
      stun: marioStun,
      struggle: [marioWalk[0], marioWalk[1]],
      cower: marioStand[0],
      dash: marioRun[0],
    };
    game.rocketImgs = [1, 2, 3, 4].map((n) => loadImg(NYAN + `rocket-${n}.png`));
    const NYAN_H = 50; // low wide cat
    const NOELLE = "./Assets/Images/Characters/Survivors/Noelle/";
    const noelleStand = [loadImg(NOELLE + "noelle_idle.png")];
    const noelleWalk = [1, 2, 3, 4].map((n) => loadImg(NOELLE + `noelle_walk/sprite-3-${36 + n}.png`));
    const noelleRun = [1, 2, 3, 4].map((n) => loadImg(NOELLE + `noelle_run/sprite-3-${24 + n}.png`));
    const noelleJump = loadImg(NOELLE + "noelle_jump.png");
    const noelleFall = loadImg(NOELLE + "noelle_fall.png");
    const noelleStun = loadImg(NOELLE + "noelle_stun.png");
    const noelleStruggle = [1, 2].map((n) => loadImg(NOELLE + `noelle_struggle/sprite-10-${3 + n}.png`));
    const noelleCower = loadImg(NOELLE + "noelle_cower.png");
    const noelleIcewallAnim = [loadImg(NOELLE + "noelle_icewall/noelle_icewall.png"),
      ...[2, 3, 4, 5, 6].map((n) => loadImg(NOELLE + `noelle_icewall/noelle_icewall${n}.png`))];
    const noelleSprites = {
      idle: noelleStand,
      walk: noelleWalk,
      run: noelleRun,
      jump: noelleJump,
      fall: noelleFall,
      stun: noelleStun,
      struggle: noelleStruggle,
      cower: noelleCower,
      dash: noelleRun[0],
      icewall: noelleIcewallAnim,
    };
    const charSprites = { lux: luxSprites, toko: tokoSprites, sonic: sonicSprites, supersonic: superSprites, tails: tailsSprites, nyan: nyanSprites, mario: marioSprites, noelle: noelleSprites, evil: null }; // evil later
    function wearChar(id) {
      game.setPlayerSprites(charSprites[id] || luxSprites);
      // true size
      game.player.drawW = id === 'mario' ? 46 : 50;
      game.player.drawH = id === 'mario' ? 64 : (id === 'nyan' ? NYAN_H : (id === 'sonic' || id === 'supersonic' || id === 'tails') ? 64 : 70);
      game.player.maxJumps = id === 'nyan' ? 2 : 1; // nyan double jumps
    }
    game.setPlayerSprites(luxSprites);

    // evil stats
    const EVIL = "./Assets/Images/Characters/Killers/EvilLux/";
    const bear5Image = loadImg("./Assets/Images/Characters/Killers/Bear5/Bear5.png");
    const evilSprites = {
      idle: [loadImg(EVIL + "idle1.png"), loadImg(EVIL + "idle2.png")],
      walk: [loadImg(EVIL + "walk1.png"), loadImg(EVIL + "walk2.png")],
      run: [loadImg(EVIL + "run1.png"), loadImg(EVIL + "run2.png")],
      jump: loadImg(EVIL + "run1.png"),
      stun: loadImg(EVIL + "stun.png"),
      pull: loadImg(EVIL + "pull1.png"),
    };
    const evilM1 = [loadImg(EVIL + "m1walk.png"), loadImg(EVIL + "m1walk2.png"), loadImg(EVIL + "m1walk3.png")];
    const bear5Sprites = {
      idle: bear5Image,
      walk: bear5Image,
      run: bear5Image,
      jump: bear5Image,
      fall: bear5Image,
      stun: bear5Image,
      struggle: bear5Image,
      cower: bear5Image,
      dash: bear5Image,
    };
    const SHADOW_MARIO = "./Assets/Images/Characters/Killers/ShadowMario/";
    const shadowMarioWalk = Array.from({ length: 8 }, (_, i) =>
      loadImg(SHADOW_MARIO + `shadow_mariowalk/sprite-18-${i + 1}.png`));
    const shadowMarioSpin = [1, 2, 3, 4].map((n) =>
      loadImg(SHADOW_MARIO + `shadowmario_spin/sprite-51-${n}.png`));
    const shadowMarioSlam = [1, 2].map((n) =>
      loadImg(SHADOW_MARIO + `shadowmario_slam${n}.png`));
    const shadowMarioMimic = [15, 16, 17, 18].map((n) =>
      loadImg(SHADOW_MARIO + `shadowmario_mimick/sprite-12-${n}.png`));
    const shadowMarioSprites = {
      idle: [loadImg(SHADOW_MARIO + "shadowmario_idle.png")],
      walk: shadowMarioWalk,
      run: shadowMarioWalk,
      jump: loadImg(SHADOW_MARIO + "shadowmario_jump.png"),
      fall: loadImg(SHADOW_MARIO + "shadowmario_fall.png"),
      dive: loadImg(SHADOW_MARIO + "shadowmario_dive.png"),
      spin: shadowMarioSpin,
      slam: shadowMarioSlam,
      mimic: shadowMarioMimic,
      walkStride: 36,
      runStride: 30,
    };
    charSprites.evil = evilSprites;
    charSprites.bear5 = bear5Sprites;
    charSprites.shadowmario = shadowMarioSprites;
    const evilWindup = [loadImg(EVIL + "m1idle.png"), loadImg(EVIL + "m1idle2.png"), loadImg(EVIL + "m1idle3.png")];
    const evilAct = {
      spike: loadImg(EVIL + "spikeplace1.png"),
      windup: loadImg(EVIL + "m1idle.png"),
      pull: loadImg(EVIL + "pull1.png"),
      pullwindup: loadImg(EVIL + "pullwindup.png"),
      m1: null, // random swing
    };

    game.chatBubbleImg = loadImg("./Assets/Images/UI/chatbub.png");
    game.alertArrow = loadImg("./Assets/Images/UI/CharacterSelect/left.png"); // ping arrow
    game.spikeImg = loadImg("./Assets/Images/Characters/Killers/EvilLux/spikes.png");
    game.icewallImgs = [1, 2, 3, 4].map((n) => loadImg(NOELLE + `noelle_icewall/icewall_${n}.png`));
    game.mistImg = loadImg(NOELLE + "sleep_mist.webp");
    game.bombImg = loadImg(TAILS + "bomb.png");
    game.boomImg = loadImg("./Assets/Images/Objects/explosion.gif");
