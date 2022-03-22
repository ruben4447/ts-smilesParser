import SMILES from './classes/SMILES';
import * as utils from './utils';
globalThis.utils = utils;
import * as dataVars from './data-vars';
globalThis.dataVars = dataVars;
import $globals from './globals';
globalThis.$globals = $globals;

var canvas: HTMLCanvasElement, env: SMILES;
var inputSMILES: HTMLInputElement, elOutput: HTMLElement, inputSplitFormula: HTMLInputElement, selectBoolOption: HTMLSelectElement, inputBoolOption: HTMLInputElement;
var parseTime = 0;

function _main() {
  let p = document.createElement("p");
  document.body.appendChild(p);
  p.insertAdjacentHTML("beforeend", "Input SMILES String: ");
  inputSMILES = document.createElement("input");
  p.appendChild(inputSMILES);
  inputSMILES.placeholder = "CC(=O)(O)";
  inputSMILES.addEventListener('input', () => parseSmiles(inputSMILES.value));
  inputSMILES.style.width = "40%";

  p.insertAdjacentHTML("beforeend", " | Simple Formula ");
  inputSplitFormula = document.createElement("input");
  inputSplitFormula.type = "checkbox";
  inputSplitFormula.checked = false;
  inputSplitFormula.addEventListener('change', () => parseSmiles(inputSMILES.value));
  p.appendChild(inputSplitFormula);

  p.insertAdjacentHTML("beforeend", " | Parse Option: ");
  selectBoolOption = document.createElement("select");
  p.appendChild(selectBoolOption);
  ["enableInorganicAtoms", "enableChargeClauses", "enableChains", "enableRings", "enableSeperatedStructures", "cumulativeCharge", "checkBondCount", "addImplicitHydrogens"].forEach(op => {
    selectBoolOption.insertAdjacentHTML("beforeend", `<option value='${op}'>${op}</option>`);
  });
  p.insertAdjacentHTML("beforeend", " <span>=</span> ");
  inputBoolOption = document.createElement("input");
  inputBoolOption.type = "checkbox";
  selectBoolOption.addEventListener('change', () => {
    inputBoolOption.checked = env.parseOptions[selectBoolOption.value];
  });
  inputBoolOption.addEventListener('change', () => {
    env.parseOptions[selectBoolOption.value] = inputBoolOption.checked;
    parseSmiles();
  });
  p.appendChild(inputBoolOption);

  elOutput = document.createElement("p");
  document.body.appendChild(elOutput);

  canvas = document.createElement('canvas');
  $globals.canvas = canvas;
  canvas.width = 1000;
  canvas.height = 700;
  canvas.style.border = '2px solid black';
  document.body.appendChild(canvas);

  env = new SMILES(canvas);
  $globals.env = env;
  env.parseOptions.addImplicitHydrogens = true;
  env.parseOptions.checkBondCount = false;
  env.parseOptions.enableRings = true;
  inputBoolOption.checked = env.parseOptions[selectBoolOption.value];
  parseSmiles("C(=O)O.Br");
  // parseSmiles("CBr");
  // parseSmiles("C1C(=O)CC1");
  // parseSmiles("CC1=C(C=C(C=C1[N+](=O)[O-])[N+](=O)[O-])[N+](=O)[O-]");
}

function _error(e: Error) {
  let ctx = canvas.getContext("2d");
  ctx.fillStyle = '#4C2F36';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f9accb';
  ctx.font = '13px consolas';
  utils.canvasWriteText(ctx, e.message, 10, 15);
}

function parseSmiles(smiles?: string) {
  const ctx = canvas.getContext("2d");
  elOutput.innerHTML = '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  smiles ??= env.getSMILESstring();
  inputSMILES.value = smiles;

  env.setSMILESstring(smiles);
  try {
    parseTime = performance.now();
    env.parse();
    parseTime = performance.now() - parseTime;
  } catch (e) {
    elOutput.innerText = `Error!`;
    _error(e);
    $globals.error = e;
    parseTime = -1;
    return;
  }

  const molecules = env.getMolecules();

  // SMILES
  elOutput.innerHTML += `<b>SMILES</b>: ${env.generateSMILES()} | Took <em>${utils.numstr(parseTime)}</em> ms | Created ${utils.numstr(molecules.length)} molecule${molecules.length === 1 ? '' : 's'}`;

  const mdiv = document.createElement("div");
  elOutput.appendChild(mdiv);

  molecules.forEach(molecule => {
    const el = document.createElement("p");
    mdiv.appendChild(el);

    el.innerHTML = `&bull; &nbsp; ${molecule.generateSMILES()}`;
    el.innerHTML += ` | <strong>Mr</strong> = ${utils.numstr(molecule.calculateMr())}`;
    el.innerHTML += ` | <strong>Molecular</strong>: ${molecule.generateMolecularFormula({ splitGroups: inputSplitFormula.checked, hillSystemOrder: $globals.useHillSystem }, true)}`;
    el.innerHTML += ` | <strong>Empirical</strong>: ${molecule.generateEmpiricalFormula(true, $globals.useHillSystem)}`;
    el.innerHTML += ` | <strong>Condensed</strong>: ${molecule.generateCondensedFormula(true, true)}`;

    const fgroups = molecule.getFunctionalGroups();
    let fgroupStr = Array.from(fgroups).map(([group, locations]) => `<strong>${group}${locations.length > 1 ? ` &times; ${utils.numstr(locations.length)}` : ''}</strong>: ` + locations.map(where => `${where.symbol} (at ${where.pos})`)).join('; ');
    el.innerHTML += ` | <strong>Functional Groups</strong>: ${fgroupStr}`;
  });
}

window.addEventListener('load', _main);