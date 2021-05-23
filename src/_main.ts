import { Environment } from './classes/Environment';
import * as utils from './utils';
globalThis.utils = utils;
import * as dataVars from './data-vars';
globalThis.dataVars = dataVars;

var canvas: HTMLCanvasElement;

function _main() {
  canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 700;
  canvas.style.border = '2px solid black';
  document.body.appendChild(canvas);

  const env = new Environment(canvas);
  globalThis.env = env;
  env.setSMILESstring("C(C(=O)O[H])CC");
  try {
    env.parse();
  } catch (e) {
    _error(e);
    throw e;
  }
}

function _error(e: Error) {
  let ctx = canvas.getContext("2d");
  ctx.fillStyle = '#4C2F36';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f9accb';
  ctx.font = '13px consolas';
  utils.canvasWriteText(ctx, e.message, 10, 15);
}

window.addEventListener('load', _main);