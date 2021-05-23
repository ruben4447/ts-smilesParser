import Environment from './classes/Environment';
import * as utils from './utils';
globalThis.utils = utils;
import * as dataVars from './data-vars';
globalThis.dataVars = dataVars;
import $globals from './globals';
globalThis.$globals = $globals;

var canvas: HTMLCanvasElement, env: Environment;
var inputSMILES: HTMLInputElement, elOutput: HTMLElement, inputSplitFormula: HTMLInputElement;

function _main() {
  let p = document.createElement("p");
  document.body.appendChild(p);
  p.insertAdjacentHTML("beforeend", "Input SMILES String: ");
  inputSMILES = document.createElement("input");
  p.appendChild(inputSMILES);
  inputSMILES.placeholder = "CC(=O)(O)";
  inputSMILES.addEventListener('input', () => parseSmiles(inputSMILES.value));

  p.insertAdjacentHTML("beforeend", " | Simple Formula ");
  inputSplitFormula = document.createElement("input");
  inputSplitFormula.type = "checkbox";
  inputSplitFormula.checked = false;
  inputSplitFormula.addEventListener('change', () => parseSmiles(inputSMILES.value));
  p.appendChild(inputSplitFormula);

  elOutput = document.createElement("p");
  document.body.appendChild(elOutput);

  canvas = document.createElement('canvas');
  $globals.canvas = canvas;
  canvas.width = 1000;
  canvas.height = 700;
  canvas.style.border = '2px solid black';
  document.body.appendChild(canvas);

  env = new Environment(canvas);
  $globals.env = env;
  env.parseOptions.checkBondCount = false;
  parseSmiles("C(C(=O)O[H])CC");
  parseSmiles("CC(=O)O[H]");
}

function _error(e: Error) {
  let ctx = canvas.getContext("2d");
  ctx.fillStyle = '#4C2F36';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f9accb';
  ctx.font = '13px consolas';
  utils.canvasWriteText(ctx, e.message, 10, 15);
}

function parseSmiles(smiles: string) {
  const ctx = canvas.getContext("2d");
  elOutput.innerHTML = '';
  inputSMILES.value = smiles;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  env.setSMILESstring(smiles);
  try {
    env.parse();
  } catch (e) {
    elOutput.innerText = `Error!`;
    _error(e);
    $globals.error = e;
    return;
  }

  // SMILES
  elOutput.innerHTML += `<b>SMILES</b>: ${env.getSMILESstring()} ; ${env.generateSMILES()}`;

  // Atoms
  elOutput.innerHTML += ` | <b>Molecular Formula</b>: ${env.generateMolecularFormula(inputSplitFormula.checked, true, $globals.useHillSystem)}`;
  elOutput.innerHTML += ` | <b>Empirical Formula</b>: ${env.generateEmpiricalFormula(true, $globals.useHillSystem)}`;
}

window.addEventListener('load', _main);