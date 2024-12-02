import { Game } from './game.js';
import { UI } from './ui.js';

/*
  Bootstrap everything:
    Load the assets
  - Configure environment and data sources
  - Instantiate the top-level class instances
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
const storiesMap = new Map();
const endingsMap = new Map();
const assetsMap = (window.assetsMap = new Map([
  ['manifests', manifestsMap],
  ['stories', storiesMap],
  ['backgrounds', backgroundsMap],
  ['animations', animationsMap],
  ['endings', endingsMap],
]));

function loadAsset(url, type, name, collection) {
  const collectionMap = collection ? collection : assetsMap;
  switch (type) {
    case 'json':
      return loadJSON(url).then((data) => {
        collectionMap.set(name, data);
      });
    case 'image':
      return loadImage(url).then((data) => {
        collectionMap.set(name, data);
      });
  }
}

const assetsLoaded = (async function loadAssets() {
  // Load all the JSON manifests
  console.log('Loading the manifests');
  await Promise.all([
    loadAsset('./backgrounds.json', 'json', 'backgrounds', manifestsMap),
    loadAsset('./animations.json', 'json', 'animations', manifestsMap),
    loadAsset(
      './passage-animations.json',
      'json',
      'animationDirectory',
      manifestsMap
    ),
  ]);
  console.log('Manifests: ', manifestsMap);

  // Load the stories data
  console.log('Loading the twine data');
  await loadAsset('./stories.json', 'json', 'stories');

  // Load achievement and endings save data
  console.log('Loading the endings data');
  await loadAsset('./endings.json', 'json', 'endings');

  // Load all the background images
  const loadedPromises = [];
  for (let [name, url] of Object.entries(
    assetsMap.get('manifests').get('backgrounds')
  )) {
    loadedPromises.push(loadAsset(url, 'image', name, backgroundsMap));
  }
  // Load all the animation images
  for (let [name, animData] of Object.entries(
    assetsMap.get('manifests').get('animations')
  )) {
    console.log('animData: ', animData.frames);
    animationsMap.set(
      name,
      new Map([
        ['frames', animData.frames],
        ['styles', animData['styles']],
        ['url', null],
      ])
    );

    loadedPromises.push(
      loadAsset(animData.url, 'image', 'url', animationsMap.get(name))
    );
  }
  console.log('Loading the images');
  await Promise.all(loadedPromises);
  console.log('Assets loaded');
  console.log(assetsMap);
})();

document.addEventListener(
  'DOMContentLoaded',
  async () => {
    console.log('start DOMContentLoaded, waiting for assetsLoaded');
    await assetsLoaded;

    let ui = (window.ui = new UI(assetsMap));
    let game = (window.game = new Game({
      ui,
      assetsMap,
    }));
    // Handle control over to the Game
    game.start();
  },
  { once: true }
);
