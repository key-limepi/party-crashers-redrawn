// map loot pool
const MAP_POOL = [
  {
    id: 'rough_draft',
    name: 'Rough Draft',
    level: LEVEL_ROUGH_DRAFT,
    art: './Assets/Images/Levels/RoughDraft.png',
    backdrop: './Assets/Images/Levels/RoughDraft_bg.jpg',
    background: '#3b2a2a',
    music: 'Rough-Draft-theme.mp3',
    spawn: { x: 100, y: 880 }, // west pillar-side ground
    evilSpawn: { x: 2575, y: 1667 }, // far east floor
    springs: [
      [927, 652, 1200, './Assets/Images/Objects/spring_orange.png'],
      [1245, 480, 1200, './Assets/Images/Objects/spring_orange.png'],
      [18, 1244, 1200, './Assets/Images/Objects/spring_orange.png'],
      [2506, 1545, 1500, './Assets/Images/Objects/spring_red.png'],
      [2473, 1036, 950, './Assets/Images/Objects/spring_yellow.png'],
      [1777, 1267, 1500, './Assets/Images/Objects/spring_red.png'],
      [2633, 887, 950, './Assets/Images/Objects/spring_yellow.png'],
      [1560, 757, 1500, './Assets/Images/Objects/spring_red.png'],
      [305, 1089, 1500, './Assets/Images/Objects/spring_red.png'],
    ],
  },
  {
    id: 'greenhill',
    name: 'Green Hill',
    level: LEVEL_GREENHILL_HITBOXES,
    art: './Assets/Images/Levels/Greenhill_Hitboxes.png',
    backdrop: './Assets/Images/Levels/greenhill_bg.png',
    backdropShiftY: 480, // sunset sits above the ground
    background: '#4aa3e0',
    music: 'GreenHill_TEMP.mp3',
    spawn: { x: 620, y: 1875 }, // wide west ground
    evilSpawn: { x: 2400, y: 1747 }, // far east ground
    springs: [
      [700, 1940, 1200, './Assets/Images/Objects/spring_orange.png'],
      [777, 1488, 950, './Assets/Images/Objects/spring_yellow.png'],
      [1864, 1435, 1500, './Assets/Images/Objects/spring_red.png'],
      [1900, 1824, 1500, './Assets/Images/Objects/spring_red.png'],
      [2353, 1599, 1500, './Assets/Images/Objects/spring_red.png'],
    ],
  },
];

// pick a pool map
function mapDef(id) {
  return MAP_POOL.find((m) => m.id === id) || MAP_POOL[0];
}
