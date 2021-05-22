import { Environment } from './classes/Environment';
import * as utils from './utils';
globalThis.utils = utils;
import * as dataVars from './data-vars';
import { AdvError } from './classes/Error';
globalThis.dataVars = dataVars;

function _main() {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 700;
  canvas.style.border = '2px solid black';
  document.body.appendChild(canvas);

  const env = new Environment(canvas);
  globalThis.env = env;
  env.setSMILESstring("C(O)O");
  try {
    env.parse();
  } catch (e) {
    if (e instanceof AdvError) {
      console.error(e.getErrorMessage());
    } else {
      throw e;
    }
    return;
  }
}

window.addEventListener('load', _main);