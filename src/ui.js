function createDiv(id, className) {
  let elem = document.createElement('div');
  if (className) {
    elem.className = className;
  }
  if (id) {
    elem.id = id;
  }
  return elem;
}

class ImageAnimation extends HTMLElement {
  get image() {
    return this.isConnected ? this.querySelector('img') : null;
  }
  get src() {
    return this._imgSrc;
  }
  setImageSource(url) {
    if (this._imgSrc !== url) {
      this.image?.remove();
    }
    this._imgSrc = url;
    if (!this.image) {
      this._insertImage();
    }
    this.stop();
    this.image.src = url;
    delete this._loadedPromise;
  }
  get loadedPromise() {
    if (!(this.isConnected && this.imageElement)) {
      throw new Error(
        "Can't load the image until the host element is connected"
      );
    }
    if (this._loadedPromise) {
      return this._loadedPromise;
    }
    if (this.imageElement.complete) {
      return (this._loadedPromise = Promise.resolve());
    }
    let promise = new Promise((resolve) => {
      this.image.onload = resolve;
    });
    return (this._loadedPromise = promise);
  }
  _insertImage() {
    this.textContent = '';
    this.imageElement = new Image();
    this.appendChild(this.imageElement);
  }
  async start(src, fps, frameCount, maxLoopCount = Infinity) {
    this.setImageSource(src);
    this.fps = fps;
    this.frameCount = frameCount;
    this.maxLoopCount = maxLoopCount;

    const img = this.imageElement;
    this.frameIndex = 0;
    await this.loadedPromise;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.classList.add('animating');
    this.frameSize = img.getBoundingClientRect().width / this.frameCount;
    console.log(
      `animating image loaded, frameSize: ${this.frameSize}, src:${this.src}`
    );
    this.animating = true;
    this.lastFrameTime = Date.now();
    this.loopCount = 0;

    this.advance();
  }
  advance() {
    if (!this.animating) {
      return;
    }
    const img = this.imageElement;
    const now = Date.now();
    if (now - this.lastFrameTime >= this.fps) {
      img.style.transform = `translateX(${
        -this.frameIndex * this.frameSize
      }px)`;
      this.frameIndex += 1;
      this.lastFrameTime = Date.now();
      if (this.frameIndex >= this.frameCount - 1) {
        this.frameIndex = 0;
        this.loopCount++;
      }
      if (this.loopCount > this.maxLoopCount) {
        this.animating = false;
      }
    }
    this._rafID = requestAnimationFrame(() => this.advance());
  }
  stop() {
    if (this._rafID) {
      cancelAnimationFrame(this._rafID);
    }
    this.classList.remove('animating');
    this.animating = false;
    this.frameIndex = 0;
  }
}
customElements.define('image-animation', ImageAnimation);

class WordPicker extends HTMLElement {
  scrollSpeed = 5;
  wordCount = 0;

  connectedCallback() {
    let line = (this.lineElem = createDiv('wordsLine'));
    this.appendChild(line);

    let reticule = (this.reticule =
      document.getElementById('wordsLineReticule'));
    this.cursorElem = this.reticule.querySelector('.cursor');
    document.addEventListener('click', this);
    document.addEventListener('keypress', this);
  }
  updateWords(words) {
    // wipe out the previous child elements
    this.lineElem.textContent = '';
    this.lineRect = new DOMRect();
    this.wordOffsets = [];
    this.wordCount = 0;
    this.classList.toggle('empty', !words?.length);
    if (this.mouthAnimation) {
      this.mouthAnimation.stop();
    }
    if (!words) {
      return;
    }
    // create choice boxes
    const wordCount = (this.wordCount = words.length);
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
      let selectionX = document
        .getElementById('selection')
        .getBoundingClientRect().x;
      let cursorRect = this.cursorElem.getBoundingClientRect();
      this.cursorRectOffsetX = cursorRect.x - selectionX + cursorRect.width / 2;

      let lastWidth = 0;
      let rect,
        x = 0,
        endX = 0;
      this.wordOffsets = [];
      for (let i = 0; i < wordCount; i++) {
        rect = this.lineElem.children[i].getBoundingClientRect();
        x = rect.x - this.lineRect.x;
        if (i == wordCount - 1) {
          endX = Math.max(lastWidth, x + rect.width);
        }
        // this.lineElem.children[i].style.outline = "1px solid black";
        this.wordOffsets.push({ x, width: rect.width });
      }
      this.startSpin(0, endX);
      console.log(
        'updateWords, ',
        this.wordOffsets,
        this.spinX,
        this.wordCount
      );
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
    let currentCenterX = this.spinX + this.cursorRectOffsetX;
    for (let i = 0; i < this.wordCount; i++) {
      let offsetX = this.wordOffsets[i].x;
      if (
        currentCenterX > offsetX &&
        currentCenterX < offsetX + this.wordOffsets[i].width
      ) {
        selectedChild = this.lineElem.children[i];
        break;
      }
    }
    return selectedChild;
  }
  handleEvent(event) {
    let selectedChild;
    switch (event.type) {
      case 'click':
      // fallthrough
      case 'keypress': {
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
  constructor(assetsMap) {
    this.assets = assetsMap;
  }

  /**
   * Initializes the UI
   * @returns {Promise}
   */
  initialize() {
    this.currentPrompt = document.getElementById('currentPrompt');
    const promptContainer = document.querySelector('#stage .prompt-outer');
    const picker = (this.wordPicker = document.createElement('word-picker'));

    // Create word picker
    picker.id = 'wordPicker';
    picker.classList.add('selection-inner');
    picker.classList.add('layer');
    picker.tabIndex = -1;

    // Create mouth animation
    let mouthAnim = (this.mouthAnimation =
      document.createElement('image-animation'));
    mouthAnim.id = 'mouth';
    promptContainer.parentElement.insertBefore(mouthAnim, promptContainer);

    const selectionElement = document.getElementById('selection');
    const reticuleElement = document.getElementById('wordsLineReticule');

    selectionElement.insertBefore(picker, reticuleElement);
    return new Promise((resolve) =>
      requestAnimationFrame((res) => {
        picker.focus();
        resolve();
      })
    );
  }

  /**
   * Updates the UI prompt with the given text
   * @param {string} text text to update the UI prompt with
   */
  updatePrompt(text) {
    console.log('updatePrompt with:', text);
    this.currentPrompt.textContent = text;
  }

  /**
   * Updates the UI word choices with the given links
   * @param {Array} links array of word choice links and labels
   */
  updateWordChoices(links) {
    console.log('updateWordChoices with:', links);
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

  /**
   * Updates the UI background with file specified
   * @param {string} filename filename of the background image
   */
  updateBackground(filename) {
    console.log('updateBackground with:', filename);
    let backdrop = document.getElementById('pageBackdrop');
    backdrop.classList.add('transitioning');
    return new Promise((resolve) => {
      backdrop.addEventListener(
        'transitionend',
        () => {
          backdrop.style.backgroundImage = 'url(' + filename + ')';
          backdrop.classList.remove('transitioning');
          resolve();
        },
        { once: true }
      );
    });
  }

  /**
   * Plays a mouth animation
   * @param {string} animationName name of the animation file
   * @param {string} frames number of frames in the animation
   */
  animateMouth(animationName) {
    console.log('animateMouth with:', animationName);

    // get animation data
    let animData = this.assets.get('animations').get(animationName);
    // Get image source
    let animationSrc = animData.get('url');
    console.log('Animating with:', animationSrc);

    // add styles to animation
    this.mouthAnimation.style.top = animData.get('styles')['top'];
    this.mouthAnimation.style.left = animData.get('styles')['left'];
    this.mouthAnimation.style.height = animData.get('styles')['height'];
    this.mouthAnimation.style.aspectRatio =
      animData.get('styles')['aspect-ratio'];

    // get frames
    let frames = animData.get('frames');

    // start animation
    this.mouthAnimation.start(animationSrc, 1000 / 8, frames);
  }
}
