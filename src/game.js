/**
  The main game logic
    Owns the game scenes and switches between them
*/
export class Game {
  constructor({ ui, assetsMap }) {
    this.assets = assetsMap;
    this.ui = ui;
    this.currentScene = null;

    const splashScene = new SplashScene(this);
    const choicesScene = new ChoicesScene(this);

    this.scenesMap = new Map();
    this.scenesMap.set(splashScene.id, splashScene);
    this.scenesMap.set(choicesScene.id, choicesScene);
  }

  async start() {
    await this.ui.initialize();
    // start at the first scene we registered
    await this.switchScene(Array.from(this.scenesMap.keys())[0]);
  }

  async switchScene(id, params = {}) {
    const scene = this.scenesMap.get(id);
    if (this.currentScene === scene) {
      return;
    }
    if (this.currentScene) {
      await this.currentScene.exit();
    }
    this.currentScene = scene;
    await this.currentScene.enter(params);
  }
}

class ChoicesScene {
  id = 'prompts';
  constructor(game) {
    this.ui = game.ui;
    this.assets = game.assets;
  }

  async enter({ startType }) {
    console.log(`entering ${this.id} scene`);
    this.outcomes = {};
    this.twineData = this.assets.get('stories');
    this.backgroundNames = this.assets.get('backgrounds');
    console.log('Game start, with data:', this.twineData);

    let startPid =
      startType == 'alt'
        ? this.twineData.altstartnode
        : this.twineData.startnode;
    this.handleChoice(startPid);

    await this.ui.enterScene(this.id);
    document.addEventListener('user-choice', this);
  }

  async exit() {
    console.log(`exiting ${this.id} scene`);
    document.removeEventListener('user-choice', this);
    // TODO:
    // stop all the loops and timers
    this.ui.animateMouth();
    await this.ui.fadeOut('prompts');
  }

  handleEvent(event) {
    if (event.type == 'user-choice') {
      console.log('Got user choice:', event.detail);
      this.handleChoice(parseInt(event.detail.id));
    }
  }

  handleChoice(pid) {
    // Process id starts at 1, convert to 0 indexing
    let currentPassage = this.twineData.passages[pid - 1];

    // Get outcome tag
    let outcome = this.countOutcome(currentPassage.tags);
    // handle null outcome (which only happens if tag not captured correctly)
    if (outcome == null) {
      this.ui
        .updateBackground(this.backgroundNames.get('default'))
        .then(() => {});
    } else {
      this.ui.updateBackground(this.backgroundNames.get(outcome.tag));
      // handle normal paths
      if (outcome.type != 'END' && outcome.type != 'MENU') {
        console.log(this.assets.get('manifests').get('animationDirectory'));
        // select correct mouth animation from manifest
        if (
          this.assets
            .get('manifests')
            .get('animationDirectory')
            .hasOwnProperty(pid)
        ) {
          this.ui.animateMouth(
            this.assets.get('manifests').get('animationDirectory')[pid][
              'mouthAnimation'
            ]
          );
          let sweat = this.assets.get('manifests').get('animationDirectory')[
            pid
          ]['sweat'];
          this.ui.showSweat(sweat);
        } else {
          this.ui.animateMouth(`default`);
          this.ui.showSweat(false);
        }
      }
      // handle menu and endings
      else {
        this.ui.stopAnimations();
      }
      // handle ending
    }
    // update prompt and wording
    this.ui.updatePrompt(currentPassage.text.split('[[')[0]);
    this.ui.updateWordChoices(currentPassage.links);
  }

  /**
   * Finds and counts the outcome of a passage based on it's tags
   * @param {Array} tags a list of tags for the passage
   * @returns {Object{tag: string, type: string} | null} the matching outcome
   */
  countOutcome(tags) {
    if (tags.includes('BAD-END')) {
      this.outcomes.bad += 1;
      return { tag: 'BAD-END', type: 'END' };
    } else if (tags.includes('Neutral-Path')) {
      this.outcomes.neutral += 1;
      return { tag: 'Neutral-Path', type: 'PATH' };
    } else if (tags.includes('Good-End')) {
      this.outcomes.goodEnd += 1;
      return { tag: 'Good-End', type: 'END' };
    } else if (tags.includes('Neutral-End')) {
      this.outcomes.neutralEnd += 1;
      return { tag: 'Neutral-End', type: 'END' };
    } else if (tags.includes('GOOD')) {
      this.outcomes.good += 1;
      return { tag: 'GOOD', type: 'PATH' };
    } else if (tags.includes('EGG')) {
      this.outcomes.egg += 1;
      return { tag: 'EGG', type: 'END' };
    } else if (tags.includes('Menu-page')) {
      return { tag: 'Menu-page', type: 'MENU' };
    }

    return null;
  }
}

class SplashScene {
  id = 'splash';

  constructor(game) {
    this.game = game;
    this.ui = game.ui;
    this.assets = game.assets;
  }

  handleEvent(event) {
    if (event.type == 'user-choice') {
      // Advance to next scene
      console.log('Got user choice:');
      this.game.switchScene('prompts', { ...event.detail });
    }
  }

  async enter() {
    console.log(`entering ${this.id} scene`);
    const backgrounds = this.assets.get('backgrounds');
    this.ui.updateBackground('');

    await this.ui.enterScene(this.id);
    document.addEventListener('user-choice', this);
  }

  async exit() {
    console.log(`exiting ${this.id} scene`);
    document.removeEventListener('user-choice', this);
    await this.ui.exitScene('splash');
  }
}
