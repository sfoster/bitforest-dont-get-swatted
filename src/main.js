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
  console.log(`loaded JSON from ${filename}`, data);
  return data;
}

function loadImage(filename) {
  return new Promise((resolve) => {
    let img = new Image();
    img.onload = () => resolve(filename);
    img.src = filename;
  });
}

/*
 * Preload all the game assets.
 * We have named collections for the different kinds of assets
 */
const backgroundsMap = new Map();
const animationsMap = new Map();
const manifestsMap = new Map();
const assetsMap = window.assetsMap = new Map([
  ["manifests", manifestsMap],
  ["stories", null],
  ["backgrounds", backgroundsMap],
  ["animations", animationsMap]
]);

function loadManifest(name, url) {
  return loadJSON(url).then(data => {
    manifestsMap.set(name, data);
  });
}

function loadBackgroundImage(name, url) {
  return loadImage(url).then(() => {
    backgroundsMap.set(name, data);
  });
}

function loadAnimationImage(name, url) {
  return loadImage(url).then(() => {
    animationsMap.set(name, data);
  });
}

function loadAsset(url, type, name, collection) {
  const collectionMap = collection ? assetsMap.get(collection) : assetsMap;
  switch (type) {
    case "json":
      return loadJSON(url).then(data => {
        collectionMap.set(name, data);
      });
    case "image":
      return loadImage(url).then(data => {
        collectionMap.set(name, data);
      });
  }
}
const assetsLoaded = (async function loadAssets() {
  // Load all the JSON manifests
  await Promise.all([
    loadAsset("./backgrounds.json", "json", "backgrounds", "manifests"),
    loadAsset("./animations.json", "json", "animations", "manifests"),
  ]);

  // Load the stories data
  await loadAsset("./stories.json", "json", "stories");

  // Load all the background images
  const loadedPromises = [];
  for (let [name, url] of Object.entries(assetsMap.get("manifests").get("backgrounds"))) {
    loadedPromises.push(loadAsset(url, "image", name, "backgrounds"));
  }
  // Load all the animation images
  for (let [name, url] of Object.entries(assetsMap.get("manifests").get("animations"))) {
    loadedPromises.push(loadAsset(url, "image", name, "animations"));
  }
  await loadedPromises;
})();

document.addEventListener(
  'DOMContentLoaded',
  async () => {
    await assetsLoaded;

    let ui = (window.ui = new UI());
    let game = (window.game = new Game({
      ui,
      assetsMap
    }));
    // Handle control over to the Game
    game.start();
  },
  { once: true }
);
