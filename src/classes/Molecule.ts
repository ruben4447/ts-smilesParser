import { BondType, IBond } from "../types/Bonds";
import { IGroupStrMap, IMatchAtom } from "../types/Group";
import { createGenerateSmilesStackItemObject, IAtomCount, ICountAtoms, IElementToIonMap, IGenerateSmilesStackItem } from "../types/SMILES";
import { assembleEmpiricalFormula, assembleMolecularFormula, extractElement, extractInteger, numstr, _regexNum } from "../utils";
import { Group } from "./Group";

export class Molecule {
  public groups: { [id: number]: Group };

  constructor();
  constructor(groups: Group[]);
  constructor(groups: { [id: number]: Group });
  constructor(groups?: | Group[] | { [id: number]: Group }) {
    if (groups === undefined) {
      this.groups = {};
    } else if (Array.isArray(groups)) {
      this.groups = groups.reduce((obj, group) => {
        obj[group.ID] = group;
        return obj;
      }, {});
    } else {
      this.groups = groups;
    }
  }

  /** Calculate Mr for a compound */
  public calculateMr() {
    const stack: number[] = [+Object.keys(this.groups)[0]];
    const done = new Set<number>();
    let Mr = 0;
    while (stack.length !== 0) {
      const id = stack.pop(), group = this.groups[id];
      if (!done.has(id)) {
        done.add(id);
        Mr += group.calculateMr();
        group.bonds.forEach(bond => {
          stack.push(bond.dest);
        });
      }
    }
    return Mr;
  }

  /** Get all bonds to/from a group ID (.dest is group groupID is bonded to) */
  public getAllBonds(groupID: number) {
    const bonds: IBond[] = this.groups[groupID].bonds.map(bond => ({ ...bond }));
    for (const gid in this.groups) {
      if (+gid === groupID) continue;
      this.groups[gid].bonds.forEach(bond => {
        if (bond.dest === groupID) {
          const nbond = { ...bond };
          nbond.dest = +gid;
          bonds.push(nbond);
        }
      });
    }
    return bonds;
  }

  /** Remove unbonded groups from molecule, starting from a given group */
  public removeUnbondedGroups(startID: number) {
    const bondedGroups = new Set<number>(); // Set of group IDs which are bonded
    bondedGroups.add(startID);
    const stack: number[] = [startID]; // Stack of groups to explore
    const doneGroups = new Set<number>(); // Set of groups which have been explored

    while (stack.length !== 0) {
      const gid = stack.pop();
      if (!doneGroups.has(gid)) {
        doneGroups.add(gid);
        const bonds = this.getAllBonds(gid);
        for (let i = bonds.length - 1; i >= 0; --i) {
          if (!doneGroups.has(bonds[i].dest)) {
            stack.push(bonds[i].dest);
            bondedGroups.add(bonds[i].dest); // This group is bonded to startID
          }
        }
      }
    }

    // Remove all groups which are not bonded
    for (let gid in this.groups) {
      if (!bondedGroups.has(+gid)) {
        delete this.groups[gid]; // Remove
      }
    }
  }

  /** Return array of matching recIDs if match. */
  // TODO Multiple of same chain from single atom, not only in top-most atom? (e.g. OCO) 
  public matchMolecule(thing: IMatchAtom, matchMany = true): IGroupStrMap[] {
    const matches: IGroupStrMap[] = [];
    for (const gid in this.groups) {
      const rec: IGroupStrMap = {};
      let match = this.groups[gid].matchAtoms(thing, this, rec, true);
      if (match) {
        matches.push(rec);
        if (!matchMany) return matches;
      }
    }
    return matches;
  }

  /**
   * Count each atom in parsed data
   * Order the AtomCount object via the Hill system
   * - Hill system => carbons, hydrogens, then other elements in alphabetical order
   * - Ignore charge => ignore charge on atoms?
   */
  public countAtoms(opts: ICountAtoms = {}): IAtomCount[] {
    opts.splitGroups ??= false;
    opts.hillSystemOrder ??= true;
    opts.ignoreCharge ??= false;

    let atoms: IAtomCount[] = [], elementsPos: string[] = [];
    for (const id in this.groups) {
      if (this.groups.hasOwnProperty(id)) {
        const group = this.groups[id], groupCharge = opts.ignoreCharge ? 0 : group.charge;
        if (opts.splitGroups) {
          group.elements.forEach((count, element) => {
            let chargeStr = element + '{' + groupCharge + '}', i = elementsPos.indexOf(chargeStr);
            if (atoms[element] === undefined) {
              atoms.push({ atom: element, charge: NaN, count: 0 }); // If splitting groups up, cannot associate charge
              elementsPos.push(chargeStr);
              i = elementsPos.length - 1;
            }
            atoms[i].count += count;
          });
        } else {
          let str = group.getElementString(true), chargeStr = str + '{' + groupCharge + '}', i = elementsPos.indexOf(chargeStr);
          if (atoms[i] === undefined) {
            atoms.push({ atom: str, charge: groupCharge, count: 0 });
            elementsPos.push(chargeStr);
            i = elementsPos.length - 1;
          }
          atoms[i].count++;
        }
      }
    }
    if (opts.splitGroups) {
      // Deconstruct numbered atoms e.g. "H2": 1 --> "H": 2
      let newAtoms: IAtomCount[] = [], elementsPos: string[] = [];
      for (let i = 0; i < atoms.length; i++) {
        const group = atoms[i];
        if (_regexNum.test(group.atom)) {
          let atom = extractElement(group.atom), count = extractInteger(group.atom.substr(atom.length)), str = atom + "{" + group.charge + "}", i = elementsPos.indexOf(str);
          if (i === -1) {
            newAtoms.push({ atom, count, charge: NaN });
            elementsPos.push(str);
          } else {
            newAtoms[i].count += count;
          }
        } else {
          let str = group.atom + "{" + group.charge + "}", i = elementsPos.indexOf(str);
          if (i === -1) {
            newAtoms.push(group);
            elementsPos.push(str);
          } else {
            newAtoms[i].count += group.count;
          }
        }
      }
      atoms = newAtoms;
    }
    if (opts.hillSystemOrder) {
      let newAtoms: IAtomCount[] = [], elementPos: string[] = [];
      // Carbons come first
      let carbons: IAtomCount[] = [];
      for (let i = atoms.length - 1; i >= 0; i--) {
        if (atoms[i].atom === 'C') {
          carbons.push(atoms[i]);
          atoms.splice(i, 1);
        }
      }
      carbons.sort((a, b) => a.charge - b.charge);
      newAtoms.push(...carbons);
      // Hydrogens come second
      let hydrogens: IAtomCount[] = [];
      for (let i = atoms.length - 1; i >= 0; i--) {
        if (atoms[i].atom === 'H') {
          hydrogens.push(atoms[i]);
          atoms.splice(i, 1);
        }
      }
      hydrogens.sort((a, b) => a.charge - b.charge);
      newAtoms.push(...hydrogens);
      // Sort rest by alphabetical order
      let elements: IElementToIonMap = {}, elementKeys: string[] = [];
      // Extract element ions
      for (let group of atoms) {
        if (elements[group.atom] === undefined) {
          elements[group.atom] = [];
          elementKeys.push(group.atom);
        }
        elements[group.atom].push(group);
      }
      // Order ions by charge
      for (let element in elements) {
        if (elements.hasOwnProperty(element)) {
          elements[element].sort((a, b) => a.charge - b.charge);
        }
      }
      // Order elements alphabeticalls
      elementKeys.sort();
      elementKeys.forEach(e => {
        elements[e].forEach(ion => {
          newAtoms.push(ion);
        });
      });
      return newAtoms;
    }
    return atoms;
  }

  /**
   * Generate molecular formula
   * e.g. "C2H4O2"
   * @param detailed - If true, will keep [NH4+] and not split it up, keep charges etc...
   * @param html - Return formula as HTML?
   * @param useHillSystem - Use hill system to order formula in conventional way?
   */
  public generateMolecularFormula(opts: ICountAtoms = {}, html = false): string {
    opts.ignoreCharge = true;
    let count = this.countAtoms(opts);
    return assembleMolecularFormula(count, html);
  }
  /**
   * Generate empirical formula
   * e.g. "C2H4O2" -> "CH2O"
   * @param html - Return formula as HTML?
   * @param useHillSystem - Use hill system to order formula in conventional way?
   */
  public generateEmpiricalFormula(html = false, useHillSystem = true): string {
    let count = this.countAtoms({ splitGroups: true, hillSystemOrder: useHillSystem });
    return assembleEmpiricalFormula(count, html);
  }
  /**
   * Generate condensed formula
   * e.g. "C2H4O2" -> CH3COOH
   * - collapseSucecssiveGroups => condense groups e.g. "CH3CH2CH2CH3" -> "CH3(CH2)2CH3"
   * @param html - Return formula as HTML?
   */
  public generateCondensedFormula(html = false, collapseSucecssiveGroups = true): string {
    let elements: Map<string, number>[] = []; // Array of elements for each group
    const stack: number[] = []; // Stack of IDs to this._group (or NaN if done)
    const doneGroups = new Set<number>(); // Set of group IDs which have been done
    stack.push(+Object.keys(this.groups)[0]);

    while (stack.length !== 0) {
      const i = stack.length - 1, group = this.groups[stack[i]];
      if (isNaN(stack[i]) || doneGroups.has(group.ID)) {
        stack.splice(i, 1);
      } else {
        let groupElements = new Map<string, number>();
        groupElements.set(group.toStringFancy(), 1);
        const bonds = this.getAllBonds(group.ID);
        for (let j = bonds.length - 1; j >= 0; j--) {
          const bond = bonds[j];
          if (!doneGroups.has(bond.dest) && this.groups[bond.dest].bonds.length === 0) {
            let el = this.groups[bond.dest].toStringFancy();
            groupElements.set(el, (groupElements.get(el) ?? 0) + 1);
            doneGroups.add(bond.dest);
          }
          stack.push(bond.dest);
        }
        elements.push(groupElements);
        stack[i] = NaN;
        doneGroups.add(group.ID);
      }
    }
    let string = '', lastSegment: string, segCount = 0;
    elements.forEach((map, ei) => {
      let j = 0, segStr = '';
      map.forEach((count, el) => {
        let str = count === 1 ? el : el + (html ? "<sub>" + numstr(count) + "</sub>" : count.toString());
        if (j > 0 && j < map.size - 1) str = "(" + str + ")";
        j++;
        segStr += str;
      });
      // if (ei > 0 && ei < elements.length - 1 && map.size > 1) segStr = "(" + segStr + ")";
      if (collapseSucecssiveGroups) {
        if (lastSegment === undefined) {
          lastSegment = segStr;
          segCount = 1;
        } else if (segStr === lastSegment) {
          segCount++;
        } else {
          string += segCount === 1 ? lastSegment : "(" + lastSegment + ")" + (html ? "<sub>" + numstr(segCount) + "</sub>" : segCount.toString());
          lastSegment = segStr;
          segCount = 1;
        }
      } else {
        string += segStr;
      }
    });
    if (collapseSucecssiveGroups && segCount !== 0) {
      string += segCount === 1 ? lastSegment : "(" + lastSegment + ")" + (html ? "<sub>" + numstr(segCount) + "</sub>" : segCount.toString());
    }
    return string;
  }

  /** Return array of functional groups */
  public getFunctionalGroups() {
    interface Where { pos: number; symbol: string; };
    const addFGroups = (group: string, where: Where) => {
      if (fgroups.has(group)) fgroups.get(group).push(where);
      else fgroups.set(group, [where]);
    };

    const fgroups = new Map<string, Where[]>();
    const stack: number[] = []; // Stack of IDs to this._group (or NaN if done)
    const doneGroups = new Set<number>(); // Set of group IDs which have been done
    let hasC = false; // Has a carbon atom?
    stack.push(+Object.keys(this.groups)[0]);

    while (stack.length !== 0) {
      const i = stack.length - 1, group = this.groups[stack[i]];
      if (isNaN(stack[i]) || doneGroups.has(group.ID)) {
        stack.splice(i, 1);
      } else {
        // Halogen
        if (group.isElement("F", "Cl", "Br", "I")) {
          addFGroups("haloalkane", { pos: group.smilesStringPosition, symbol: group.getElementString() });
        }

        for (let j = group.bonds.length - 1; j >= 0; j--) {
          const bond = group.bonds[j], bondedGroup = this.groups[bond.dest], isC = group.isElement("C");
          if (isC && !hasC) hasC = true;
          // Alkene/Alkyne
          group.bonds.forEach(bond => {
            if (isC && bondedGroup.isElement("C")) {
              if (bond.bond === "=") addFGroups("alkene", { pos: bond.smilesPosition, symbol: "=" }); // C=C
              else if (bond.bond === "#") addFGroups("alkyne", { pos: bond.smilesPosition, symbol: "#" }); // C#C
            }
          });

          // Alcohol: -OH
          if ((group.isElement("O") && bondedGroup.isElement("H")) || (group.isElement("H") && bondedGroup.isElement("O"))) {
            addFGroups("alcohol", { pos: group.smilesStringPosition, symbol: "OH" });
          }

          // Nitrile: -C#N
          else if (bond.bond === "#" && ((group.isElement("C") && bondedGroup.isElement("N")) || (group.isElement("N") && bondedGroup.isElement("C")))) {
            addFGroups("nitrile", { pos: group.smilesStringPosition, symbol: "C#N" });
          }

          // Ketone / Aldehyde
          else if (bond.bond === "=" && ((group.isElement("C") && bondedGroup.isElement("O")) || (group.isElement("O") && bondedGroup.isElement("C")))) {
            const hasH = group.bonds.some(bond => this.groups[bond.dest].isElement("H"));
            addFGroups(hasH ? "aldehyde" : "ketone", { pos: group.smilesStringPosition, symbol: hasH ? "C(H)=O" : "C=O" });
          }

          stack.push(bond.dest);
        }
        stack[i] = NaN;
        doneGroups.add(group.ID);
      }
    }

    // Remove groups which depend on a carbon
    if (!hasC) {
      fgroups.delete("haloalkane");
    }

    return fgroups;
  }

  /** Generate SMILES string from parsed data.
   * @param showImplicits - Render implicit groups? (if .isImplicit === true)
  */
  public generateSMILES(showImplicits = false): string {
    /** Assemble and return SMILES string from a StackItem */
    const assembleSMILES = (item: IGenerateSmilesStackItem): string => {
      item.smilesChildren = item.smilesChildren.filter(x => x.length > 0);
      let lastChild = item.smilesChildren.pop();
      return item.smiles + item.smilesChildren.map(x => `(${x})`).join('') + (lastChild || '');
    };

    let smiles = '';
    const stack: IGenerateSmilesStackItem[] = [];
    const doneGroups = new Set<number>();
    stack.push(createGenerateSmilesStackItemObject(+Object.keys(this.groups)[0])); // Add root group

    while (stack.length !== 0) {
      const i = stack.length - 1;
      if (stack[i].handled) {
        // Handled; remove from array
        if (stack[i].parent !== undefined) {
          let j = stack[i].parent;
          // stack[j].smiles += "(" + stack[i].smiles + ")";
          stack[j].smilesChildren.push(assembleSMILES(stack[i]));
        } else {
          // smiles = stack[i].smiles + smiles;
          smiles = assembleSMILES(stack[i]) + smiles;
        }
        stack.splice(i, 1);
      } else {
        const group = this.groups[stack[i].group];
        if (doneGroups.has(group.ID)) {
          stack[i].handled = true;
        } else {
          // Shall we render this?
          const render = !group.isImplicit || (group.isImplicit && showImplicits);
          if (render) {
            stack[i].smiles += stack[i].bond && stack[i].bond !== '-' ? stack[i].bond : '';
            stack[i].smiles += group.toString();
            if (group.ringDigits.length !== 0) stack[i].smiles += group.ringDigits.map(n => '%' + n).join('');
          }
          stack[i].handled = true;

          // Bonds (add in reverse as topmost is processed first)
          const bonds = this.getAllBonds(group.ID);
          for (let j = bonds.length - 1; j >= 0; j--) {
            const obj = bonds[j];
            if (!doneGroups.has(obj.dest)) {
              stack.push(createGenerateSmilesStackItemObject(obj.dest, i, obj.bond));
            }
          }

          doneGroups.add(group.ID);
        }
      }
    }
    return smiles;
  }
}