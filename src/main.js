import { Game } from './game.js';
import { UI } from './ui.js';

/*
  Bootstrap everything:
  - Make the top-level class instances
  - Configure environment and data sources
  - Kick things off
*/

async function loadJSON(filename) {
  let response = await fetch(filename);
  let data = await response.json();
  console.log('loaded JSON', data);
  return data;
}

function loadImage(filename) {
  return new Promise((resolve) => {
    let img = new Image();
    img.onload = resolve;
    img.src = filename;
  });
}

/*
 * Preload all the game assets.
 * Right now this is just our sample data file,
 * but we could preload images and other stuff here too
 */
const assetsMap = new Map();
const assetsLoaded = (async function loadAssets() {
  assetsMap.set('stories', await loadJSON('./stories.json'));
  const imageList = await loadJSON('./backgrounds.json');
  await Promise.all(Object.values(imageList).map(filename => loadImage(filename)));
  assetsMap.set('images', imageList);
})();

document.addEventListener(
  'DOMContentLoaded',
  async () => {
    await assetsLoaded;
    let ui = (window.ui = new UI());
    let game = (window.game = new Game({ ui, assetsMap }));
    // Handle control over to the Game
    game.start();
  },
  { once: true }
);
