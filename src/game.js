/*
  The main game logic
  - Owns the game loop
  - Handles state changes
*/
export class Game {
  constructor({ ui, assetsMap }) {
    this.assets = assetsMap;
    this.ui = ui;
  }
  /*
   * Kick off the game loop
   */
  async start() {
    await this.ui.initialize();
    document.addEventListener('user-choice', this);
    this.twineData = this.assets.get('stories');
    this.imageNames = this.assets.get('images');
    console.log('Game start, with data:', this.twineData);
    // TODO: Figure out what the first state needs to be, and tell the UI about it

    this.handleChoice(8);
  }
  handleEvent(event) {
    if (event.type == 'user-choice') {
      console.log('Got user choice:', event.detail);
      this.handleChoice(parseInt(event.detail.id));
      // TODO: The user selected something. Use that input to change our game state
    }
  }

  handleChoice(pid) {
    // Process id starts at 1, convert to 0 indexing
    let currentPassage = this.twineData.passages[pid - 1];
    this.ui.updatePrompt(currentPassage.text.split('[[')[0]);
    this.ui.updateWordChoices(currentPassage.links);
    console.log(this.imageNames[pid]);
    this.ui.updateBackground(this.imageNames[pid]);
  }
}
