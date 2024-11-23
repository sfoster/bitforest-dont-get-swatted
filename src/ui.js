class WordPicker extends HTMLElement {
  connectedCallback() {
    console.log('connectedCallback');
    this.addEventListener('click', this);
  }
  updateWords(words) {
    // wipe out the previous child elements
    this.textContent = '';
    this.words = words;
    if (!words) {
      return;
    }

    // create choice boxes
    let fragment = document.createDocumentFragment();
    for (let word of words) {
      let child = document.createElement('div');
      child.classList.add('word');
      child.textContent = word.label;
      child.dataset.identifier = word.id;
      fragment.appendChild(child);
    }
    this.appendChild(fragment);
  }
  updateScrollSpeed(newSpeed) {
    this.scrollSpeed = newSpeed;
    // TODO: do something to adjust scroll speed
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
  handleEvent(event) {
    switch (event.type) {
      case 'click': {
        this.selected = event.target;
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
  updateBackground(filename) {
    document.body.style.backgroundImage = filename;
  }
}
