    // loot pool maps
    const SPR = './Assets/Images/Objects/';
    for (const def of MAP_POOL) {
      def.art = loadImg(def.art);
      def.backdrop = def.backdrop ? loadImg(def.backdrop) : null;
      def.springs = def.springs.map((s) => ({ x: s[0], y: s[1], power: s[2], img: loadImg(s[3]) }));
    }
    game.mapBg.inter = '#bfe9ff';
    game.loadMainMap(MAP_POOL[0]);
    game.respawn();

    // test hitboxes
    game.loadInterLevel(LEVEL_INTERMISSION, loadImg('./Assets/Images/Levels/Intermission.png'), 1, loadImg('./Assets/Images/Levels/IntermissionBG.png'), loadImg('./Assets/Images/Levels/Intermission_Props.png')); // built art
    // inter springs
    game.addSpring(246, 1820, 1200, loadImg(SPR + 'spring_orange.png'), 'inter'); // low floor
    game.addSpring(166, 1446, 950, loadImg(SPR + 'spring_yellow.png'), 'inter'); // mid shelf
    game.addSpring(2282, 1058, 1500, loadImg(SPR + 'spring_red.png'), 'inter'); // east ledge
    game.addSpring(2367, 564, 1500, loadImg(SPR + 'spring_red.png'), 'inter'); // high deck
    game.respawn();

    game.start();
