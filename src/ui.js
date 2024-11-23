class WordPicker extends HTMLElement {
  scrollSpeed = 0.5;

  connectedCallback() {
    let line = this.lineElem = document.createElement("div");
    line.id = "wordsLine";
    this.appendChild(line);
    this.lineElem.addEventListener("click", this);
    this.addEventListener('click', this);
  }
  updateWords(words) {
    // wipe out the previous child elements
    this.lineElem.textContent = "";
    this.lineRect = new DOMRect();
    this.wordOffsets = [];
    if (!words) {
      return;
    }
    // create choice boxes
    const wordCount = words.length;
    // We clone the last couple words so we can loop around without a visible break
    const lineElements = [...words, words[0], words[1]];
    const fragment = document.createDocumentFragment();
    for (let word of lineElements) {
      let child = document.createElement('div');
      child.classList.add('word');
      child.textContent = word.label;
      child.dataset.identifier = word.id;
      fragment.appendChild(child);
    }
    this.lineElem.appendChild(fragment);

    requestAnimationFrame(() => {
      this.lineRect = this.lineElem.getBoundingClientRect();
      let lastWidth = 0;
      let rect, x = 0, endX = 0;
      this.wordOffsets = [];
      for (let i = 0; i < wordCount; i++) {
        rect = this.lineElem.children[i].getBoundingClientRect();
        x = rect.x - this.lineRect.x;
        if (i == wordCount -1) {
          endX = Math.max(lastWidth, x + rect.width);
        }
        this.wordOffsets.push({x, width: rect.width});
      }
      this.startSpin(0, endX);
    });
  }
  adjustScrollSpeed(newSpeed) {
    this.scrollSpeed += newSpeed;
  }
  dispatchUserChoice(choiceDetail) {
    let choiceEvent = new CustomEvent('user-choice', { detail: choiceDetail });
    document.dispatchEvent(choiceEvent);
  }
  set selected(childElem) {
    for (let child of this.children) {
      child.toggleAttribute('selected', child === childElem);
    }
  }
  startSpin(startX, endX) {
    this.continueSpin = true;
    // Start a loop where we advance the x through to the last (non-duplicated word)
    // And loop back around so it appears like a seamless circle
    this.spinX = startX;
    this.endX = endX;
    this.advanceSpin();
  }
  nextSpinStep() {
    this.lineElem.style.transform = `translateX(-${this.spinX}px)`;
    this.spinX += this.scrollSpeed;
  }
  advanceSpin() {
    this.nextSpinStep();
    if (!this.continueSpin) {
      return;
    }
    if (this.spinX >= this.endX) {
      this.spinX = 0;
    }
    requestAnimationFrame(() => this.advanceSpin());
  }
  handleEvent(event) {
    switch (event.type) {
      case 'click': {
        this.selected = event.target;
        this.continueSpin = false;
        let detail = {
          value: event.target.textContent,
          id: event.target.dataset.identifier,
        };
        this.dispatchUserChoice(detail);
        break;
      }
    }
  }
}

customElements.define('word-picker', WordPicker);

export class UI {
  initialize() {
    this.currentPrompt = document.getElementById('currentPrompt');
    let picker = (this.wordPicker = document.createElement('word-picker'));
    picker.id = 'wordPicker';

    this.currentPrompt.parentElement.appendChild(picker);
    return new Promise((res) => requestAnimationFrame(res));
  }
  updatePrompt(text) {
    this.currentPrompt.textContent = text;
  }
  updateWordChoices(links) {
    /* each link takes the form:
      {
        "name": "Choice 1 ",
        "link": "Passage 2",
        "pid": "2"
      }
      */
    let words = null;
    if (links) {
      words = links.map((ln) => {
        return {
          label: ln.name,
          id: ln.pid,
        };
      });
    }
    this.wordPicker.updateWords(words);
  }
}
