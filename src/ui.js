function createDiv(id, className) {
  let elem = document.createElement("div");
  if (className) {
    elem.className = className;
  }
  if (id) {
    elem.id = id;
  }
  return elem;
}

class LetterBox extends HTMLElement {
  connectedCallback() {
    for (let edge of ["top", "right", "bottom", "left", "center"]) {
      this[edge] = this.appendChild(createDiv("", edge));
    }
  }
}
customElements.define('letter-box', LetterBox);

class WordPicker extends HTMLElement {
  scrollSpeed = 0.5;
  wordCount = 0;

  connectedCallback() {
    let line = this.lineElem = createDiv("wordsLine");
    this.appendChild(line);

    let reticule = this.reticule = document.createElement("letter-box");
    reticule.id = "wordsLineReticule";
    this.appendChild(reticule);

    this.addEventListener("click", this);
    // this.addEventListener('click', this);
    this.addEventListener('keypress', this);
  }
  updateWords(words) {
    // wipe out the previous child elements
    this.lineElem.textContent = "";
    this.lineRect = new DOMRect();
    this.wordOffsets = [];
    this.classList.toggle("empty", !words?.length);
    if (!words) {
      return;
    }
    // create choice boxes
    const wordCount = this.wordCount = words.length;
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
          // this.lineElem.children[i].style.outline = "1px solid black";
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
      this.spinX = this.spinX - this.endX;
    }
    requestAnimationFrame(() => this.advanceSpin());
  }
  getSelectedChild() {
    let offsetX = 0;
    let selectedChild = this.lineElem.firstElementChild;
    this.wordOffsets
    for (let i = 0; i < this.wordCount; i++) {
      let offsetX = this.wordOffsets[i];
      if (this.spinX <= offsetX) {
        selectedChild = this.lineElem.children[i];
        break;
      }
    }
    return selectedChild;
  }
  handleEvent(event) {
    let selectedChild;
    switch (event.type) {
      case "click":
        // fallthrough
      case "keypress": {
        selectedChild = this.getSelectedChild();
        event.preventDefault();
        break;
      }
    }
    if (!selectedChild?.dataset.identifier) {
      return;
    }
    this.continueSpin = false;
    let detail = {
      value: selectedChild.textContent,
      id: selectedChild.dataset.identifier,
    };
    this.dispatchUserChoice(detail);
  }
}

customElements.define('word-picker', WordPicker);

export class UI {
  initialize() {
    this.currentPrompt = document.getElementById('currentPrompt');
    let picker = (this.wordPicker = document.createElement('word-picker'));
    picker.id = 'wordPicker';
    picker.tabIndex = -1;

    this.currentPrompt.parentElement.appendChild(picker);
    return new Promise((resolve) => requestAnimationFrame(res => {
        picker.focus();
        resolve();
    }));
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
  updateBackground(filename) {
    let backdrop = document.getElementById("backdrop");
    backdrop.classList.add("transitioning");
    backdrop.addEventListener("transitionend", () => {
      backdrop.style.backgroundImage = 'url(' + filename + ')';
      backdrop.classList.remove("transitioning");
    }, { once: true });
  }
}
