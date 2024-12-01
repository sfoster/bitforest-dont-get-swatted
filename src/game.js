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
    if (outcome == null) {
      this.ui.updateBackground(this.backgroundNames.get('default')).then(() => {
        // Play one of the mouth animations (0-4, see animations.json)
        // this.ui.animateMouth(`mouth-${Math.floor(Math.random() * 4)}`);
        this.ui.animateMouth(`mouth-0`, 3);
      });
    } else {
      this.ui.updateBackground(this.backgroundNames.get(outcome));
      this.ui.animateMouth(`mouth-2`, 4);
    }
    console.log('Outcome: ' + outcome);

    this.ui.updatePrompt(currentPassage.text.split('[[')[0]);
    this.ui.updateWordChoices(currentPassage.links);
  }

  /**
   * Finds and counts the outcome of a passage based on it's tags
   * @param {Array} tags a list of tags for the passage
   * @returns {string | null} the matching outcome
   */
  countOutcome(tags) {
    if (tags.includes('BAD-END')) {
      this.outcomes.bad += 1;
      return 'BAD-END';
    } else if (tags.includes('Neutral-Path')) {
      this.outcomes.neutral += 1;
      return 'Neutral-Path';
    } else if (tags.includes('Good-End')) {
      this.outcomes.goodEnd += 1;
      return 'Good-End';
    } else if (tags.includes('Neutral-End')) {
      this.outcomes.neutralEnd += 1;
      return 'Neutral-End';
    } else if (tags.includes('GOOD')) {
      this.outcomes.good += 1;
      return 'GOOD';
    } else if (tags.includes('EGG')) {
      return 'EGG';
    }

    return null;
  }
}
