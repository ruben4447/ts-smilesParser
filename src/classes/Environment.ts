import { organicSubset } from "../data-vars";
import { BondType } from "../types/Bonds";
import { IAtomCount, IElementToIonMap } from "../types/Environment";
import { IGroupMap } from "../types/Group";
import { arrFromBack, extractBetweenMatching, extractElement, extractInteger, isBondChar, parseChargeString, parseInorganicString, _chargeRegex1, _chargeRegex2, _regexNum } from "../utils";
import { AdvError } from "./Error";
import { Group } from "./Group";

export class Environment {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;

  private _smilesString: string = '';
  private _groups: IGroupMap;

  public constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._ctx = canvas.getContext("2d");
  }

  public getSMILESstring(): string { return this._smilesString; }
  public setSMILESstring(string: string) { this._smilesString = string; }

  /**
   * Parses this._smilesString
   * @throws Error
   */
  public parse() {
    this._groups = [];
    try {
      const mainChain: Group[] = [];
      this._tryParse(this._smilesString, mainChain);
    } catch (e) {
      // Turn AdvError into Error - transfer fancy message
      if (e instanceof AdvError) throw new Error(e.getErrorMessage());
      throw e;
    }
  }

  private _tryParse(smiles: string, groups: Group[], parent?: Group, chainDepth = 0, indexOffset = 0) {
    try {
      return this._parse(smiles, groups, parent);
    } catch (e) {
      if (e instanceof AdvError) {
        let colNo = indexOffset + e.columnNumber;
        e.insertMessage(`Error whilst parsing SMILES string "${smiles}" (chain depth ${chainDepth}):`);
        e.setUnderlineString(smiles);
        e.columnNumber = colNo;
      }
      throw e;
    }
  }

  private _parse(smiles: string, groups: Group[], parent?: Group, chainDepth = 0) {
    let currentGroup: Group = undefined, currentBond: BondType, currentBondPos = NaN;
    for (let pos = 0; pos < smiles.length;) {
      // #region Explicit Bond
      if (isBondChar(smiles[pos])) {
        currentBond = smiles[pos] as BondType;
        currentBondPos = pos;
        pos++;
        if (pos >= smiles.length) throw new AdvError(`Syntax Error: invalid bond '${currentBond}': unexpected end-of-input after bond`, currentBond).setColumnNumber(pos - 1);
      }
      //#endregion

      // {...}
      // #region Charge
      if (smiles[pos] === '{') {
        let extraction = extractBetweenMatching(smiles, "{", "}", pos);
        // Was the extraction OK?
        if (extraction.openCount !== 0) throw new AdvError(`Syntax Error: unmatched closing brace at position ${pos} '${smiles[pos]}'`, smiles.substr(pos)).setColumnNumber(pos);

        // Valid charge?
        let charge = parseChargeString(extraction.extracted);
        if (isNaN(charge)) throw new AdvError(`Syntax Error: invalid charge string. Expected ${_chargeRegex1} or ${_chargeRegex2}`, extraction.extracted).setColumnNumber(pos + 1);

        // Apply to last atom, if exists. Is charge already applied?
        if (groups.length > 0) {
          let group = arrFromBack(groups, 1);
          group.charge += charge;
          pos += extraction.extracted.length + 2; // pos += "{<extracted>}".length
          continue;
        }
      }
      //#endregion

      // [...]
      // #region Inorganic Atom/Ion
      else if (smiles[pos] === '[') {
        // Extract between [...]
        let extraction = extractBetweenMatching(smiles, "[", "]", pos);
        if (extraction.openCount !== 0) throw new AdvError(`Syntax Error: unmatched closing bracket at position ${pos} '${smiles[pos]}'`, smiles.substr(pos)).setColumnNumber(pos);

        // Parse inorganic string (function in 'utils')
        let info = parseInorganicString(extraction.extracted);
        try {
          if (info.error === undefined) {
            // Are there any elements?
            if (info.elements.length === 0) {
              throw new AdvError(`Syntax Error: expected element`, extraction.extracted || "]").setColumnNumber(pos + 1);
            } else {
              if (currentGroup === undefined) currentGroup = new Group();
              currentGroup.elements.push(...info.elements);
              currentGroup.charge = info.charge;

              groups.push(currentGroup);
              currentGroup = undefined;

              pos += extraction.extracted.length + 2; // [<extraction.extracted>]
            }
          } else {
            // Handle "error"
            throw new AdvError(info.error, extraction.extracted.substr(info.endIndex)).setColumnNumber(pos + 1 + info.endIndex);
          }
        } catch (e) {
          if (e instanceof AdvError) e.insertMessage(`Error whilst parsing inorganic group "[${extraction.extracted}]": `);
          throw e;
        }
      }
      //#endregion

      // (...)
      // #region Chains
      else if (smiles[pos] === '(') {
        // Extract chain SMILES string
        let extraction = extractBetweenMatching(smiles, "(", ")", pos);
        if (extraction.openCount !== 0) throw new AdvError(`Syntax Error: unmatched closing parenthesis at position ${pos} '${smiles[pos]}'`, smiles.substr(pos)).setColumnNumber(pos);
        if (extraction.extracted.length === 0) throw new AdvError(`Syntax Error: Empty chain at position ${pos}`, '()').setColumnNumber(pos);

        // Parse
        if (groups.length === 0) throw new AdvError(`Syntax Error: unexpected SMILES chain (no parent could be found)`, "(" + extraction.extracted + ")").setColumnNumber(pos);
        const parent = groups[groups.length - 1], chainGroups: Group[] = [];
        try {
          this._tryParse(extraction.extracted, chainGroups, parent, chainDepth + 1, pos + 1);
        } catch (e) {
          if (e instanceof AdvError) e.insertMessage(`Error whilst parsing chain "(${extraction.extracted})" at position ${pos}: `);
          throw e;
        }

        pos += extraction.extracted.length + 2;
        continue; // We dont wanna process bonds (nothing on the main chain would've changed)
      }
      // #endregion

      // #region Organic Atom
      // Attempt to extract atom
      else {
        if (smiles[pos] === undefined) {
          throw new AdvError(`Syntax Error: unexpected end of input (expected organic atom, got EOL) at position ${pos}`, '').setColumnNumber(pos);
        } else {
          let extracted = extractElement(smiles.substr(pos));
          if (extracted) {
            if (organicSubset[extracted] === undefined) {
              throw new AdvError(`Syntax Error: expected organic element[${Object.keys(organicSubset).join(',')}], got '${extracted}'`, extracted).setColumnNumber(pos);
            } else {
              // Add element to group information
              if (currentGroup === undefined) currentGroup = new Group();
              currentGroup.elements.push(extracted);
              groups.push(currentGroup);
              currentGroup = undefined;
              pos += extracted.length;
            }
          } else {
            let got = smiles[pos];
            throw new AdvError(`Syntax Error: position ${pos}: expected atom, got "${got}"`, got).setColumnNumber(pos);
          }
        }
      }
      //#endregion

      // #region Bonding
      if (currentBond) {
        // Link last two items?
        if (groups.length >= 2) {
          let one = arrFromBack(groups, 1), two = arrFromBack(groups, 2);
          let ok = two.addBond(currentBond, one);
          if (!ok) throw new AdvError(`Bond Error: attempted to create explicit bond between this (${one.toString()}) and last atom (${two.toString()})`, currentBond).setColumnNumber(currentBondPos);
        } else if (groups.length === 1 && parent instanceof Group) {
          // Link to chain parent
          let ok = parent.addBond(currentBond, groups[0]);
          if (!ok) throw new AdvError(`Bond Error: attempted to create explicit bond between this (${groups[0].toString()}) and chain parent atom '${parent.toString()}'`, currentBond).setColumnNumber(currentBondPos);
        } else {
          throw new AdvError(`Syntax Error: unexpected bond '${currentBond}'`, currentBond).setColumnNumber(currentBondPos);
        }
        currentBond = undefined;
      } else {
        // With default bond
        const defaultBond: BondType = '-';
        if (groups.length >= 2) {
          // Add default, single bond to last atom
          let one = arrFromBack(groups, 1), two = arrFromBack(groups, 2);
          let ok = two.addBond(defaultBond, one);
          if (!ok) throw new AdvError(`Bond Error: attempted to create implicit bond between this (${one.toString()}) and last atom (${two.toString()})`, smiles[pos]).setColumnNumber(pos);
        } else if (groups.length === 1 && parent instanceof Group) {
          // Link to chain parent
          let ok = parent.addBond(defaultBond, groups[0]);
          if (!ok) throw new AdvError(`Bond Error: attempted to create implicit bond between this (${groups[0].toString()}) and chain parent atom '${parent.toString()}'`, smiles[pos]).setColumnNumber(pos);
        }
      }
      //#endregion
    }

    // Add to global collection
    groups.forEach(g => this._groups[g.ID] = g);
  }

  /**
   * Count each atom in parsed data
   * Order the AtomCount object via the Hill system
   * - Hill system => carbons, hydrogens, then other elements in alphabetical order
   */
  public countAtoms(splitGroups = false, hillSystemOrder = true): IAtomCount[] {
    let atoms: IAtomCount[] = [], elementsPos: string[] = [];
    for (const id in this._groups) {
      if (this._groups.hasOwnProperty(id)) {
        const group = this._groups[id];
        if (splitGroups) {
          for (const element of group.elements) {
            let chargeStr = element + '{' + group.charge + '}', i = elementsPos.indexOf(chargeStr);
            if (atoms[element] === undefined) {
              atoms.push({ atom: element, charge: NaN, count: 0 }); // If splitting groups up, vannot associate charge
              elementsPos.push(chargeStr);
              i = elementsPos.length - 1;
            }
            atoms[i].count++;
          }
        } else {
          let str = group.elements.join(''), chargeStr = str + '{' + group.charge + '}', i = elementsPos.indexOf(chargeStr);
          if (atoms[i] === undefined) {
            atoms.push({ atom: str, charge: group.charge, count: 0 });
            elementsPos.push(chargeStr);
            i = elementsPos.length - 1;
          }
          atoms[i].count++;
        }
      }
    }
    if (splitGroups) {
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
    if (hillSystemOrder) {
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
        if (atoms[i].atom === 'J') {
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
}

export default Environment;