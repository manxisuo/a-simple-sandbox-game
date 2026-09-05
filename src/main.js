import { Game } from './Game.js';

const app = document.querySelector('#app');

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#77bfff';
app.style.width = '100vw';
app.style.height = '100vh';

const game = new Game(app);
game.start();
