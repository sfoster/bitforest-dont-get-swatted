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
    document.addEventListener("user-choice", this);
    this.twineData = this.assets.get("stories");
    console.log("Game start, with data:", this.twineData);
    // TODO: Figure out what the first state needs to be, and tell the UI about it
    let currentPassage = this.twineData.passages[0];
    this.ui.updatePrompt(currentPassage.text.split("__")[0]);
    this.ui.updateWordChoices(currentPassage.links);
  }
  handleEvent(event) {
    if (event.type == "user-choice") {
      console.log("Got user choice:", event.detail);
      // TODO: The user selected something. Use that input to change our game state
    }
  }
}
