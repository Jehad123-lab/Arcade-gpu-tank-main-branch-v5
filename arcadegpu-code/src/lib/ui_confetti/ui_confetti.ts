import { UIWidget } from '../ui/ui_widget';

class UIConfetti extends UIWidget {
  containerEl: HTMLDivElement | null;
  colors: Array<string>;
  animations: Array<string>;
  quantity: number;
  frequency: number;
  started: boolean;
  counter: number;
  timer: number;

  constructor(options: { colors?: Array<string>, animations?: Array<string>, frequency?: number, quantity?: number } = {}) {
    super({
      className: 'UIConfetti'
    });

    this.containerEl = null;
    this.colors = options.colors ?? ['#EF2964', '#00C09D', '#2D87B0', '#48485E', '#EFFF1D'];
    this.animations = options.animations ?? ['slow', 'medium', 'fast'];
    this.frequency = options.frequency ?? 100;
    this.quantity = options.quantity ?? 50;
    this.started = false;
    this.counter = 0;
    this.timer = 0;
  }

  update(ts: number) {
    if (this.counter >= this.quantity) {
      return;
    }

    if (!this.started) {
      return;
    }

    this.timer += ts;
    if (this.timer >= this.frequency) {
      this.timer = 0;

      const confettiEl = document.createElement('div');
      const confettiSize = (Math.floor(Math.random() * 3) + 7) + 'px';
      const confettiBackground = this.colors[Math.floor(Math.random() * this.colors.length)];
      const confettiLeft = (Math.floor(Math.random() * this.node.offsetWidth)) + 'px';
      const confettiAnimation = this.animations[Math.floor(Math.random() * this.animations.length)];

      confettiEl.classList.add('UIConfetti-container-item', 'UIConfetti-container-item--animation-' + confettiAnimation);
      confettiEl.style.left = confettiLeft;
      confettiEl.style.width = confettiSize;
      confettiEl.style.height = confettiSize;
      confettiEl.style.backgroundColor = confettiBackground;

      if (this.containerEl) {
        this.containerEl.appendChild(confettiEl);
        this.counter++;
      }
    }
  }

  start() {
    this.node.classList.add('UIConfetti--visible');
    this.setupElements();
    this.node.style.display = 'block';
    this.started = true;
  }

  stop() {
    this.node.classList.remove('UIConfetti--visible');
    this.node.style.display = 'none';
    this.node.innerHTML = '';
    this.started = false;
  }

  setupElements() {
    const containerEl = document.createElement('div');
    containerEl.classList.add('UIConfetti-container');
    this.node.appendChild(containerEl);
    this.containerEl = containerEl;
  }
}

export { UIConfetti };