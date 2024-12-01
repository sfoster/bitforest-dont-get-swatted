/**
  The main game logic
  - Owns the game loop
  - Handles state changes
*/
export class Game {
  constructor({ ui, assetsMap }) {
    this.assets = assetsMap;
    this.ui = ui;
    this.outcomes = {};
  }
  /**
   * Kick off the game loop
   */
  async start() {
    await this.ui.initialize();
    document.addEventListener('user-choice', this);
    this.twineData = this.assets.get('stories');
    this.backgroundNames = this.assets.get('backgrounds');
    console.log('Game start, with data:', this.twineData);

    // Handle the first passage
    this.handleChoice(this.twineData.startnode);
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
            .hasOwnProperty(pid + 1)
        ) {
          this.ui.animateMouth(
            this.assets.get('manifests').get('animationDirectory')[pid + 1]
          );
        } else {
          this.ui.animateMouth(`default`);
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
