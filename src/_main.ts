import SMILES from './classes/SMILES';
import * as utils from './utils';
globalThis.utils = utils;
import * as dataVars from './data-vars';
globalThis.dataVars = dataVars;
import $globals from './globals';
import { moleculeTypes, reactions } from './organic';
import { Tabs } from './classes/Tabs';
import { Molecule } from './classes/Molecule';
import { halogen, IGroupStrMap } from './types/Group';
globalThis.$globals = $globals;

var canvas: HTMLCanvasElement, env: SMILES;
var inputSMILES: HTMLInputElement, elOutput: HTMLElement, inputSplitFormula: HTMLInputElement, selectBoolOption: HTMLSelectElement, inputBoolOption: HTMLInputElement;
var parseTime = 0;
var prepAnalyseMolecule: (mol: Molecule) => void;

function _main() {
  env = new SMILES();
  $globals.env = env;
  env.parseOptions.addImplicitHydrogens = true;
  env.parseOptions.checkBondCount = true;
  env.parseOptions.enableRings = true;

  const tabContainer = document.createElement('div');
  const tabMap = Tabs.createMap();
  tabMap.set("smiles", { text: "SMILES", content: generateSMILESContent() });
  tabMap.set("analyse", { text: "Analyse", content: generateAnalyseMoleculeContent() });
  tabMap.set("fgroups", { text: "Functional Groups", content: generateFunctionalGroupsContent() });
  const tabs = new Tabs(tabContainer, tabMap);
  $globals.tabs = tabs;
  tabs.open("smiles");
  document.body.appendChild(tabContainer);

  // parseSmiles("C1:C:C:C:C:C1");
  // parseSmiles("C=CC(=O)C");
  parseSmiles("CCCO");
  // parseSmiles("C1C(=O)CC1");
  // parseSmiles("CC1=C(C=C(C=C1[N+](=O)[O-])[N+](=O)[O-])[N+](=O)[O-]");
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
    inputBoolOption.checked = $globals.env.parseOptions[selectBoolOption.value];
  });
  inputBoolOption.addEventListener('change', () => {
    $globals.env.parseOptions[selectBoolOption.value] = inputBoolOption.checked;
    parseSmiles();
  });
  p.appendChild(inputBoolOption);

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
    tbody.insertAdjacentHTML("beforeend", `<tr><th>Expl. SMILES</th><td>${molecule.generateSMILES(true)}</td></tr>`);
    tbody.insertAdjacentHTML("beforeend", `<tr><th>Mol. Mass</th><td>${utils.numstr(molecule.calculateMr())} g<sup>-1</sup> mol</td></tr>`);
    tbody.insertAdjacentHTML("beforeend", `<tr><th title="Molecular Formula: Actual number of atoms of each element in a molecule">Molecular F.</th><td>${molecule.generateMolecularFormula({}, true)}</td></tr>`);
    tbody.insertAdjacentHTML("beforeend", `<tr><th title="Empirical Formula: Simplest whole number ratio of atoms of each element present in a compound">Empirical F.</th><td>${molecule.generateEmpiricalFormula(true)}</td></tr>`);
    tbody.insertAdjacentHTML("beforeend", `<tr><th title="Structural Formula: The minimal detail that shows the arrangement of atoms in a molecule">Strutural F.</th><td>${molecule.generateCondensedFormula(true, false)}</td></tr>`);
    let btnLoadSmiles = document.createElement("button");
    btnLoadSmiles.innerText = "Load SMILES";
    btnLoadSmiles.addEventListener("click", () => {
      parseSmiles(molecule.generateSMILES());
      prepAnalyseMolecule($globals.env.molecules[0]);
    });
    p.appendChild(btnLoadSmiles);

    fgul.innerHTML = '';
    const organicGroups: { [fgid: number]: IGroupStrMap[] } = [];
    for (const id in moleculeTypes) {
      const groups = moleculeTypes[id].test ? moleculeTypes[id].test(molecule) : [];
      if (groups.length !== 0) {
        const li = document.createElement("li");
        li.insertAdjacentHTML("beforeend", `<span>${moleculeTypes[id].name}</span><br>`);;
        fgul.appendChild(li);
        const ul = document.createElement("ul");
        li.appendChild(ul);
        reactions.forEach((info, i) => {
          if (info.start === +id || moleculeTypes[id].variantOf === info.start) {
            const li = document.createElement("li");
            li.insertAdjacentHTML("beforeend", `<span> &rarr; ${moleculeTypes[info.end].name}</span> &nbsp;`);
            const btn = document.createElement("button");
            btn.addEventListener("click", () => {
              let text = `Carry out reaction ${moleculeTypes[info.start].name} -> ${moleculeTypes[info.end].name} ?${info.name ? '\nReaction Name: ' + info.name : ''}${info.type ? '\nReaction Mechanism: ' + info.type : ''}${info.conditions ? '\nConditions: ' + info.conditions : ''}${info.reagents ? '\nReagents: ' + info.reagents : ''}`;
              let resp = info.provideReactant ? prompt(`${text}\n${info.provideReactant.prompt}`, info.provideReactant.default) : confirm(text);
              let ok: { ok: boolean, data?: string } = { ok: true };
              if (resp) {

                if (info.react) {
                  let reactant: Molecule;
                  if (info.provideReactant && typeof resp === "string") {
                    let sp = new SMILES();
                    if (info.provideReactant.smilesOpts) {
                      for (let key in info.provideReactant.smilesOpts) sp.parseOptions[key] = info.provideReactant.smilesOpts[key];
                    }
                    sp.parseOptions.enableSeperatedStructures = false;
                    sp.setSMILESstring(resp);
                    try {
                      sp.parse();
                      reactant = sp.molecules[0];
                    } catch (e) {
                      ok.ok = false;
                      ok.data = e.message;
                    }
                  }
  
                  if (ok.ok) {
                    ok = info.react(molecule, organicGroups[+id][0], $globals.reactionOpts, reactant);
                    if (!info.reactOnce && moleculeTypes[id].test) {
                      while (ok === undefined) {
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

              if (ok.ok) {
                analyse();
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
        organicGroups[id] = groups;
      }
    }

    // Remove duplicate groups
    // for (const id2 in organicGroups) {
    //   console.log(moleculeTypes[id2].name, moleculeTypes[id2].removeIfPresent, +id);
    //   if (moleculeTypes[id2].removeIfPresent?.includes(+id)) {
    //     console.log(moleculeTypes[id2].name)
    //     for (let i = groups.length - 1; i >= 0; i--) {
    //       for (let j = 0; j < organicGroups[id2].length; j++) {
    //         if (groups[i][1] && organicGroups[id2][1] && groups[i][1].smilesStringPosition && organicGroups[+id2][1][j].smilesStringPosition) {
    //           groups.splice(i, 1);
    //         }
    //       }
    //     }
    //   }
    // }
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
        tr.insertAdjacentHTML("beforeend", `<td>${moleculeTypes[reaction.start].name} &rarr; ${moleculeTypes[reaction.end].name}`);
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


  // SMILES
  elOutput.innerHTML += `<b>SMILES</b>: ${env.generateSMILES(env.molecules)} | Took <em>${utils.numstr(parseTime)}</em> ms | Created ${utils.numstr(env.molecules.length)} molecule${env.molecules.length === 1 ? '' : 's'}`;

  const mdiv = document.createElement("div");
  elOutput.appendChild(mdiv);

  env.molecules.forEach(molecule => {
    const el = document.createElement("p");
    mdiv.appendChild(el);

    el.insertAdjacentHTML("beforeend", `<span>&bull; &nbsp; ${molecule.generateSMILES()} | ${molecule.generateMolecularFormula({}, true)} | Mr ${utils.numstr(molecule.calculateMr())} | `);
    const btn = document.createElement("button");
    btn.innerText = "Analyse";
    btn.addEventListener("click", () => {
      prepAnalyseMolecule(molecule);
      $globals.tabs.open("analyse");
    });
    el.appendChild(btn);

    // const fgroups = molecule.getFunctionalGroups();
    // let fgroupStr = Array.from(fgroups).map(([group, locations]) => `<strong>${group}${locations.length > 1 ? ` &times; ${utils.numstr(locations.length)}` : ''}</strong>: ` + locations.map(where => `${where.symbol} (at ${where.pos})`)).join('; ');
    // el.innerHTML += ` | <strong>Functional Groups</strong>: ${fgroupStr}`;
  });
}

window.addEventListener('load', _main);