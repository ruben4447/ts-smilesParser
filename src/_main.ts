import { ParsedSMILES, SMILES } from './classes/SMILES';
import * as utils from './utils';
globalThis.utils = utils;
import * as dataVars from './data-vars';
globalThis.dataVars = dataVars;
import $globals from './globals';
import { moleculeIDsToString, moleculeTypes, reactions } from './organic';
import { Tabs } from './classes/Tabs';
import { Molecule } from './classes/Molecule';
import { IGroupStrMap } from './types/Group';
import { createParseOptionsObject } from './types/SMILES';
import { IReactReturn } from './types/utils';
globalThis.$globals = $globals;

var canvas: HTMLCanvasElement, env: SMILES;
var inputSMILES: HTMLInputElement, elOutput: HTMLElement, selectBoolOption: HTMLSelectElement, inputBoolOption: HTMLInputElement;
var prepAnalyseMolecule: (mol: Molecule) => void;

function _main() {
  env = new SMILES();
  $globals.env = env;
  env.parseOptions.addImplicitHydrogens = true;
  env.parseOptions.checkBondCount = true;
  env.renderOptions.skeletal = true;
  env.renderOptions.renderImplicit = true;
  env.renderOptions.collapseH = true;

  const tabContainer = document.createElement('div');
  const tabMap = Tabs.createMap();
  tabMap.set("smiles", { text: "SMILES", content: generateSMILESContent() });
  tabMap.set("analyse", { text: "Analyse", content: generateAnalyseMoleculeContent() });
  tabMap.set("fgroups", { text: "Functional Groups", content: generateFunctionalGroupsContent() });
  const tabs = new Tabs(tabContainer, tabMap);
  $globals.tabs = tabs;
  tabs.open("smiles");
  document.body.appendChild(tabContainer);

  // parseSmiles("N{-}(C)(CC1CCC1)");
  // parseSmiles("CS(=O)(=O)O.F>>C(F)(F)(F)S(=O)(=O)O.[H2]");
  // parseSmiles("C=C>[H2].[Ni]>CC");
  // parseSmiles("C.ClCl>>CCl.ClCCl.C(Cl)(Cl)Cl.ClC(Cl)(Cl)Cl.[H]Cl");
  // parseSmiles("C1=CC=C(C(=C1)CC(=O)O)NC2=C(C=CC=C2Cl)Cl");
  // parseSmiles("C=COC1=COC=C1");
  // parseSmiles("C=CC=C>[O2].[CuCl2]>O1C=CC=C1");
  parseSmiles("c1ccccc1");
  // parseSmiles("ClCl>>[Cl.].[Cl.]");
  // parseSmiles("CC1:C(:C:C(:C:C1[N+](=O)[O-])[N+](=O)[O-])[N+](=O)[O-]");
  // parseSmiles("Cc1c(cc(cc1[NO2])[NO2])[NO2]");
}

function generateSMILESContent() {
  const container = document.createElement('div');

  let p = document.createElement("p");
  container.appendChild(p);
  p.insertAdjacentHTML("beforeend", "Input SMILES String: ");
  inputSMILES = document.createElement("input");
  p.appendChild(inputSMILES);
  inputSMILES.placeholder = "CC(=O)(O)";
  inputSMILES.addEventListener('input', () => parseSmiles(inputSMILES.value));
  inputSMILES.style.width = "40%";

  p.insertAdjacentHTML("beforeend", " | Option: ");
  selectBoolOption = document.createElement("select");
  p.appendChild(selectBoolOption);
  // Allow user to configure stuff
  const opts = {};
  opts['renderSkeletal'] = { get: () => $globals.env.renderOptions.skeletal, set: (v: boolean) => ($globals.env.renderOptions.skeletal = v), flag: 2 };
  for (let key in createParseOptionsObject()) {
    opts[key] = { get: () => $globals.env.parseOptions[key], set: (v: boolean) => ($globals.env.parseOptions[key] = v), flag: 1 };
  }
  opts['renderImplicit'] = { get: () => $globals.env.renderOptions.renderImplicit, set: (v: boolean) => ($globals.env.renderOptions.renderImplicit = v), flag: 2 };
  opts['collapseHydrogens'] = { get: () => $globals.env.renderOptions.collapseH, set: (v: boolean) => ($globals.env.renderOptions.collapseH = v), flag: 2 };
  opts['ringBondAngleSmall'] = { get: () => $globals.env.renderOptions.ringRestrictAngleSmall, set: (v: boolean) => ($globals.env.renderOptions.ringRestrictAngleSmall = v), flag: 2 };
  opts['reactionSplitLine'] = { get: () => $globals.env.renderOptions.reactionSplitLine, set: (v: boolean) => ($globals.env.renderOptions.reactionSplitLine = v), flag: 2 };
  for (let key in opts) selectBoolOption.insertAdjacentHTML("beforeend", `<option value='${key}'>${key}</option>`);

  p.insertAdjacentHTML("beforeend", " <span>=</span> ");
  inputBoolOption = document.createElement("input");
  inputBoolOption.type = "checkbox";
  selectBoolOption.addEventListener('change', () => {
    inputBoolOption.checked = opts[selectBoolOption.value].get();
  });
  inputBoolOption.addEventListener('change', () => {
    opts[selectBoolOption.value].set(inputBoolOption.checked);
    parseSmiles($globals.parsedSMILES.smiles, opts[selectBoolOption.value].flag);
  });
  p.appendChild(inputBoolOption);
  inputBoolOption.checked = opts[selectBoolOption.value].get();

  elOutput = document.createElement("p");
  container.appendChild(elOutput);

  canvas = document.createElement('canvas');
  $globals.canvas = canvas;
  canvas.width = 1000;
  canvas.height = 500;
  canvas.style.border = '2px solid black';
  container.appendChild(canvas);

  inputBoolOption.checked = $globals.env.parseOptions[selectBoolOption.value];
  return container;
}

function generateAnalyseMoleculeContent() {
  const container = document.createElement('div');

  // Setup stuff
  const divSetup = document.createElement('div');
  container.appendChild(divSetup);

  // Add hydrogens
  divSetup.insertAdjacentHTML("beforeend", "<span title='If addImplicitHydrogens is enabled, hydrogens will be impliciitly added'>Insert Hydrogens?</span> ");
  const checkInsertH = document.createElement("input");
  checkInsertH.type = "checkbox";
  checkInsertH.checked = $globals.reactionOpts.addH;
  checkInsertH.addEventListener("click", () => ($globals.reactionOpts.addH = checkInsertH.checked));
  divSetup.appendChild(checkInsertH);

  divSetup.insertAdjacentHTML("beforeend", "<br><span>Choose primary side or molecule for main organic product</span> ");
  const checkPrimarySide = document.createElement("input");
  checkPrimarySide.type = "checkbox";
  checkPrimarySide.checked = $globals.reactionOpts.primarySide;
  checkPrimarySide.addEventListener("click", () => ($globals.reactionOpts.primarySide = checkPrimarySide.checked));
  divSetup.appendChild(checkPrimarySide);
  divSetup.insertAdjacentHTML("beforeend", "<br><table><thead><tr><th>Group</th><th>Structure</th><th>Primary Side</th></tr></thead><tbody><tr><td>Ether</td><td><var>R-O-R'</var></td><td><var>R</var></td></tr></tbody></table>");

  let molecule: Molecule;

  prepAnalyseMolecule = mol => {
    molecule = mol;
    if (mol) analyse();
  };

  const analyse = () => {
    p.innerHTML = "";
    const table = document.createElement('table'), tbody = table.createTBody();
    p.appendChild(table);
    tbody.insertAdjacentHTML("beforeend", `<tr><th>SMILES</th><td>${molecule.generateSMILES()}</td></tr>`);
    tbody.insertAdjacentHTML("beforeend", `<tr><th>Mol. Mass</th><td>${utils.numstr(molecule.calculateMr())} g<sup>-1</sup> mol</td></tr>`);
    tbody.insertAdjacentHTML("beforeend", `<tr><th title="Molecular Formula: Actual number of atoms of each element in a molecule">Molecular F.</th><td>${molecule.generateMolecularFormula({}, true)}</td></tr>`);
    tbody.insertAdjacentHTML("beforeend", `<tr><th title="Empirical Formula: Simplest whole number ratio of atoms of each element present in a compound">Empirical F.</th><td>${molecule.generateEmpiricalFormula(true)}</td></tr>`);
    tbody.insertAdjacentHTML("beforeend", `<tr><th title="Structural Formula: The minimal detail that shows the arrangement of atoms in a molecule">Strutural F.</th><td>${molecule.generateCondensedFormula(true, false)}</td></tr>`);
    let btnLoadSmiles = document.createElement("button");
    btnLoadSmiles.innerText = "Load SMILES";
    btnLoadSmiles.addEventListener("click", () => {
      parseSmiles(molecule.generateSMILES());
      prepAnalyseMolecule($globals.parsedSMILES.molecules[0]);
    });
    p.appendChild(btnLoadSmiles);

    fgul.innerHTML = '';
    const organicGroups: { [fgid: number]: IGroupStrMap[] } = [];
    for (const id in moleculeTypes) {
      const groups = moleculeTypes[id].test ? moleculeTypes[id].test(molecule) : [];
      if (groups.length !== 0) organicGroups[id] = groups;
    }

    // Remove duplicate groups
    for (let ogid in organicGroups) {
      if (moleculeTypes[ogid].removeIfPresent) {
        for (const gid of moleculeTypes[ogid].removeIfPresent) {
          let remove = false;
          if (organicGroups[gid]) {
            for (const ogroup of organicGroups[ogid]) {
              for (const ggroup of organicGroups[gid]) {
                remove = ogroup[1].ID === ggroup[1].ID;
                if (remove) break;
              }
              if (remove) break;
            }
          }
          if (remove) delete organicGroups[gid];
        }
      }
    }

    // Render
    for (const id in organicGroups) {
      const li = document.createElement("li");
      li.insertAdjacentHTML("beforeend", `<span>${moleculeTypes[id].name}</span><br>`);;
      fgul.appendChild(li);
      const ul = document.createElement("ul");
      li.appendChild(ul);
      reactions.forEach((info, i) => {
        if (info.start === +id || moleculeTypes[id].variantOf === info.start) {
          const li = document.createElement("li");
          li.insertAdjacentHTML("beforeend", `<span> &rarr; ${moleculeIDsToString(info.end)}</span> &nbsp;`);
          const btn = document.createElement("button");
          btn.addEventListener("click", () => {
            let text = `Carry out reaction ${moleculeTypes[info.start].name} -> ${moleculeIDsToString(info.end)} ?${info.name ? '\nReaction Name: ' + info.name : ''}${info.type ? '\nReaction Mechanism: ' + info.type : ''}${info.conditions ? '\nConditions: ' + info.conditions : ''}${info.reagents ? '\nReagents: ' + info.reagents : ''}`;
            let resp = info.provideReactant ? prompt(`${text}\n${info.provideReactant.prompt}`, info.provideReactant.default) : confirm(text);
            let ok: IReactReturn = { ok: true };
            if (resp) {
              if (info.react) {
                let reactant: Molecule;
                if (info.provideReactant && typeof resp === "string") {
                  const sp = new SMILES();
                  const optOverride: { [opt: string]: boolean } = { ...info.provideReactant.smilesOpts };
                  optOverride.enableSeperatedStructures = false;
                  try {
                    let si = sp.parse(resp, optOverride);
                    reactant = si.molecules[0];
                  } catch (e) {
                    ok.ok = false;
                    ok.data = e.message;
                  }
                }

                if (ok.ok) {
                  ok = info.react(molecule, organicGroups[+id][0], $globals.reactionOpts, reactant);
                  if (!info.reactOnce && moleculeTypes[id].test) {
                    while (ok.ok || ok.cont) {
                      let groups = moleculeTypes[id].test(molecule);
                      if (groups.length === 0) break;
                      ok = info.react(molecule, groups[0], $globals.reactionOpts, reactant);
                    }
                  }
                }
              } else {
                ok.ok = false;
                ok.data = "Cannot carry out reaction";
              }
            }

            if (ok.add) {
              ok.add.forEach(mol => $globals.parsedSMILES.addMolecule(mol))
            }
            if (ok.ok) {
              analyse();
              parseSmiles($globals.parsedSMILES.generateSMILES(), 2);
              if (ok.data) alert(ok.data);
            } else {
              alert("Reaction failed: " + ok.data);
            }
          });
          btn.innerText = "Go";
          li.appendChild(btn);
          ul.appendChild(li);
        }
      });
    }
  };

  let p = document.createElement("p");
  container.appendChild(p);
  container.insertAdjacentHTML("beforeend", "<h3>Functional Groups</h3>");
  const div = document.createElement("div");
  const fgul = document.createElement("ul");
  div.appendChild(fgul);
  container.appendChild(div);

  const btn = document.createElement("button");
  btn.innerText = "Analyse";
  btn.addEventListener("click", analyse);
  container.appendChild(btn);

  return container;
}

function generateFunctionalGroupsContent() {
  const container = document.createElement('div');
  container.innerHTML = "<p>Below are listed all the functional groups which this program recognises</p>";

  for (const id in moleculeTypes) {
    const data = moleculeTypes[id];
    const div = document.createElement("div");
    container.appendChild(div);
    div.insertAdjacentHTML("beforeend", `<h2>${id}: ${data.name}</h2>`);
    if (data.variantOf !== undefined) div.insertAdjacentHTML("beforeend", `<em>Variant Of ${moleculeTypes[data.variantOf].name}</em><br>`);
    div.insertAdjacentHTML("beforeend", `<img type="image/png" src="img/${data.repr}.png" />`);

    // EXAMPLE MOLECULE
    div.insertAdjacentHTML("beforeend", `<br>Example: <var>${data.eg.name}</var>, <code>${data.eg.smiles}</code> `);
    let btnEg = document.createElement("button");
    btnEg.innerText = "(View)";
    btnEg.addEventListener("click", () => {
      $globals.tabs.open("smiles");
      parseSmiles(data.eg.smiles);
    });
    div.appendChild(btnEg);
    div.insertAdjacentHTML("beforeend", "<br><br>");

    // TABLE OF REACTIONS
    const ourReactions = reactions.filter(r => r.start === +id || moleculeTypes[id].variantOf === r.start);
    if (ourReactions.length > 0) {
      const table = document.createElement("table"), tbody = table.createTBody();
      table.insertAdjacentHTML("afterbegin", `<thead><tr><th colspan='5'>Reactions: ${utils.numstr(ourReactions.length)}</th></tr><tr><th>Reaction</th><th>Name</th><th>Mechanism</th><th>Reagents</th><th>Conditions</th></tr></thead>`);
      div.appendChild(table);
      ourReactions.forEach(reaction => {
        const tr = document.createElement("tr");
        tbody.appendChild(tr);
        tr.insertAdjacentHTML("beforeend", `<td>${moleculeTypes[reaction.start].name} &rarr; ${moleculeIDsToString(reaction.end)}`);
        tr.insertAdjacentHTML("beforeend", `<td>${reaction.name ?? ''}</td>`);
        tr.insertAdjacentHTML("beforeend", `<td>${reaction.type ?? ''}</td>`);
        tr.insertAdjacentHTML("beforeend", `<td>${reaction.reagents ?? ''}</td>`);
        tr.insertAdjacentHTML("beforeend", `<td>${reaction.conditions ?? ''}</td>`);
      });
    }

    div.insertAdjacentHTML("beforeend", "<hr>");
  }

  return container;
}

function _error(e: Error) {
  let ctx = canvas.getContext("2d");
  ctx.fillStyle = '#4C2F36';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f9accb';
  ctx.font = '13px consolas';
  utils.canvasWriteText(ctx, e.message, 10, 15);
}

function parseSmiles(smiles?: string, flag: 0 | 1 | 2 = 1) {
  const ctx = $globals.canvas.getContext("2d");
  elOutput.innerHTML = '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (smiles !== undefined) inputSMILES.value = smiles;
  if (flag === 0) return;
  
  let ps: ParsedSMILES, parseTime: number;
  if (flag === 1) {
    try {
      parseTime = performance.now();
      ps = env.parse(smiles);
      parseTime = performance.now() - parseTime;
    } catch (e) {
      elOutput.innerText = `Error!`;
      _error(e);
      $globals.error = e;
      parseTime = -1;
      return;
    }
    $globals.parsedSMILES = ps;
  } else {
    parseTime = 0;
    ps = $globals.parsedSMILES;
  }

  let renderTime = performance.now();
  const image = ps.render();
  renderTime = performance.now() - renderTime;

  // Get distance from (0,0) such that the molecule is centred
  let θ = Math.atan2(canvas.width - image.width, canvas.height - image.height);
  let h = 0.5 * Math.hypot(canvas.height - image.height, canvas.width - image.width);
  ctx.putImageData(image, h * Math.sin(θ), 0);

  // SMILES
  elOutput.innerHTML += `<b>SMILES</b>: ${ps.generateSMILES()} | <em>${utils.numstr(parseTime)}/${utils.numstr(renderTime)}</em> ms p/r | Created ${utils.numstr(ps.molecules.length)} molecule${ps.molecules.length === 1 ? '' : 's'}`;

  const mdiv = document.createElement("div");
  elOutput.appendChild(mdiv);

  ps.molecules.forEach(molecule => {
    const el = document.createElement("p");
    mdiv.appendChild(el);

    el.insertAdjacentHTML("beforeend", `<span>&bull; &nbsp; ${molecule.generateSMILES()} | ${molecule.generateMolecularFormula({}, true)} | Mr ${utils.numstr(molecule.calculateMr())} | `);
    let btn = document.createElement("button");
    btn.innerText = "Remove";
    btn.addEventListener("click", () => {
      $globals.parsedSMILES.removeMolecule(molecule);
      parseSmiles($globals.parsedSMILES.generateSMILES(), 2);
    });
    el.appendChild(btn);
    el.insertAdjacentHTML("beforeend", " | ");
    btn = document.createElement("button");
    btn.innerText = "Analyse";
    btn.addEventListener("click", () => {
      prepAnalyseMolecule(molecule);
      $globals.tabs.open("analyse");
    });
    el.appendChild(btn);
  });
}

window.addEventListener('load', _main);