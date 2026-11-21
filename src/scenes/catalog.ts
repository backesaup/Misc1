// Scene types, presets and the timeline actions each supports.
// Kept free of React/three imports so lesson validation runs anywhere.
export const sceneCatalog = {
  voxel: {
    blocks64: ['fillStack', 'morph', 'showSides', 'hideSides', 'lightRows', 'countRows', 'countLayers', 'doubleTo', 'spin'],
    solarCube: ['spin', 'countPanels', 'panelsOff', 'sunrise', 'pulsePanels', 'twist', 'explode', 'focusEdge', 'sunAngle', 'tag'],
    disco: ['lights', 'spin', 'dots', 'secondLight', 'oneMirror', 'countMirrors', 'clearCount', 'music', 'colour', 'floorDance', 'countFloor', 'tag', 'untag'],
  },
  diagram: {
    wiring: ['flow', 'lightFace', 'lightRails'],
    power: ['stage', 'charge'],
  },
} satisfies Record<string, Record<string, string[]>>
