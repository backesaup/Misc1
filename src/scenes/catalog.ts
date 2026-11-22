// Scene types, presets and the timeline actions each supports.
// Kept free of React/three imports so lesson validation runs anywhere.
export const sceneCatalog = {
  voxel: {
    blocks64: ['fillStack', 'morph', 'showSides', 'hideSides', 'lightRows', 'countRows', 'countLayers', 'doubleTo', 'spin'],
    solarCube: ['spin', 'countPanels', 'panelsOff', 'sunrise', 'pulsePanels', 'twist', 'explode', 'focusEdge', 'sunAngle', 'tag'],
    arrange: ['arrive', 'set', 'robot'],
    solids: ['show', 'roll', 'spin', 'fold'],
    made: ['raw', 'cut', 'build', 'finish', 'explode', 'spin', 'test', 'set', 'tags', 'hot', 'steve', 'climb', 'touch'],
    disco: ['lights', 'spin', 'dots', 'secondLight', 'oneMirror', 'countMirrors', 'clearCount', 'music', 'colour', 'floorDance', 'countFloor', 'tag', 'untag'],
  },
  diagram: {
    wiring: ['flow', 'lightFace', 'lightRails'],
    power: ['stage', 'charge'],
    balance: ['set', 'signs', 'addOnes'],
    grid: ['every', 'cells', 'mirror', 'robot', 'cards'],
    fraction: ['cut'],
    clock: ['time', 'shade', 'labels'],
    coins: ['coins'],
    gauge: ['place', 'fill', 'set'],
    shapes: ['set'],
    board: ['move', 'set', 'hot'],
    nature: ['view', 'hot', 'grow', 'season'],
    lab: ['view', 'circuit', 'attract', 'poles', 'lamp', 'pivot', 'lift', 'gears', 'heat'],
  },
} satisfies Record<string, Record<string, string[]>>
