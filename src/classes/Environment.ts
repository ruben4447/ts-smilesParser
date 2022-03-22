import { organicSubset } from "../data-vars";
import { BondType } from "../types/Bonds";
import { createGenerateSmilesStackItemObject, createParseOptionsObject, IAtomCount, ICountAtoms, IElementToIonMap, IGenerateCondensedFormulaItem, IGenerateSmilesStackItem, IParseOptions, IRingMap } from "../types/Environment";
import { IGroupMap } from "../types/Group";
import { arrFromBack, assembleEmpiricalFormula, assembleMolecularFormula, extractBetweenMatching, extractDuplicates, extractElement, extractInteger, getBondNumber, isBondChar, numstr, parseChargeString, parseDigitString, parseInorganicString, _chargeRegex1, _chargeRegex2, _regexNum } from "../utils";
import { AdvError } from "./Error";
import { Group, resetGroupID } from "./Group";
import Ring from "./Rings";

export class Environment {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;

  private _smilesString: string = '';
  private _groups: IGroupMap;
  public parseOptions: IParseOptions = createParseOptionsObject();
  private _openRings: IRingMap; // What rings are open? This index corresponds to the ring digits
  private _rings: Ring[];

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
    this._groups = {};
    this._openRings = {};
    this._rings = [];
    resetGroupID();
    try {
      const mainChain: Group[] = [];
      this._tryParse(this._smilesString, mainChain);
      // Add implicit hydrogens?
      if (this.parseOptions.addImplicitHydrogens) this._addImplcitHydrogens();
      // Check bond count
      try {
        if (this.parseOptions.checkBondCount) this.checkBondCounts(); // Check bond counts
        this._checkOpenRings();
      } catch (e) {
        if (e instanceof AdvError) {
          let col = e.columnNumber;
          e.insertMessage(`Error in SMILES '${this._smilesString}'`);
          e.setUnderlineString(this._smilesString);
          e.columnNumber = col;
        }
        throw e;
      }
    } catch (e) {
      // Turn AdvError into Error - transfer fancy message
      if (e instanceof AdvError) throw new Error(e.getErrorMessage());
      throw e;
    }
  }

  private _tryParse(smiles: string, groups: Group[], parent?: Group, chainDepth = 0, indexOffset = 0) {
    try {
      return this._parse(smiles, groups, parent, chainDepth, indexOffset);
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

  /** NOT designed to be called directly */
  private _parse(smiles: string, groups: Group[], parent?: Group, chainDepth = 0, indexOffset = 0) {
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
      if (smiles[pos] === '{' && this.parseOptions.enableChargeClauses) {
        let extraction = extractBetweenMatching(smiles, "{", "}", pos);
        // Was the extraction OK?
        if (extraction.openCount !== 0) throw new AdvError(`Syntax Error: unmatched closing brace at position ${pos} '${smiles[pos]}'`, smiles.substr(pos)).setColumnNumber(pos);

        // Valid charge?
        let charge = parseChargeString(extraction.extracted);
        if (isNaN(charge)) throw new AdvError(`Syntax Error: invalid charge string. Expected ${_chargeRegex1} or ${_chargeRegex2}`, extraction.extracted).setColumnNumber(pos + 1);

        // Apply to last atom, if exists. Is charge already applied?
        if (groups.length > 0) {
          let group = arrFromBack(groups, 1), length = extraction.extracted.length + 2;
          // Cumulative charge?
          if (group.charge !== 0 && !this.parseOptions.cumulativeCharge) throw new AdvError(`Syntax Error: unexpected charge clause`, "{" + extraction.extracted + "}").setColumnNumber(pos);
          group.charge += charge;
          pos += length;
          group.smilesStringLength += length;
          continue;
        }
      }
      //#endregion

      // [...]
      // #region Inorganic Atom/Ion
      else if (smiles[pos] === '[' && this.parseOptions.enableInorganicAtoms) {
        // Extract between [...]
        let extraction = extractBetweenMatching(smiles, "[", "]", pos);
        if (extraction.openCount !== 0) throw new AdvError(`Syntax Error: unmatched closing bracket at position ${pos} '${smiles[pos]}'`, smiles.substr(pos)).setColumnNumber(pos);

        // Parse inorganic string (function in 'utils')
        let info = parseInorganicString(extraction.extracted);
        try {
          if (info.error === undefined) {
            // Are there any elements?
            if (info.elements.size === 0) {
              throw new AdvError(`Syntax Error: expected element`, extraction.extracted || "]").setColumnNumber(pos + 1);
            } else {
              if (currentGroup === undefined) currentGroup = new Group({ chainDepth }).setSMILESposInfo(indexOffset + pos, extraction.extracted.length + 2);
              info.elements.forEach((value, key) => currentGroup.addElement(key, value));
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
      else if (smiles[pos] === '(' && this.parseOptions.enableChains) {
        // Extract chain SMILES string
        let extraction = extractBetweenMatching(smiles, "(", ")", pos);
        if (extraction.openCount !== 0) throw new AdvError(`Syntax Error: unmatched closing parenthesis at position ${pos} '${smiles[pos]}'`, smiles.substr(pos)).setColumnNumber(pos);
        if (extraction.extracted.length === 0) throw new AdvError(`Syntax Error: Empty chain at position ${pos}`, '()').setColumnNumber(pos);

        // Parse
        if (groups.length === 0) throw new AdvError(`Syntax Error: unexpected SMILES chain (no parent could be found)`, "(" + extraction.extracted + ")").setColumnNumber(pos);
        const parent = groups[groups.length - 1], chainGroups: Group[] = [];
        try {
          this._tryParse(extraction.extracted, chainGroups, parent, chainDepth + 1, indexOffset + pos + 1);
        } catch (e) {
          if (e instanceof AdvError) e.insertMessage(`Error whilst parsing chain "(${extraction.extracted})" at position ${pos}: `);
          throw e;
        }

        pos += extraction.extracted.length + 2;
        continue; // We dont wanna process bonds (nothing on the main chain would've changed)
      }
      // #endregion

      // #region Ring digits
      else if ((_regexNum.test(smiles[pos]) || smiles[pos] === '%') && this.parseOptions.enableRings) {
        if (groups.length === 0) throw new AdvError(`Syntax Error: unexpected ring digit`, smiles[pos]).setColumnNumber(pos);
        const obj = parseDigitString(smiles.substr(pos));
        const extractedString = smiles.substr(pos, obj.endIndex);

        // No digits?
        if (obj.digits.length === 0 || obj.digits.some(n => isNaN(n))) throw new AdvError(`Syntax Error: invalid syntax`, extractedString).setColumnNumber(pos);
        // Duplicates?
        const duplicates = extractDuplicates(obj.digits);
        if (duplicates.length !== 0) throw new AdvError(`Syntax Error: duplicate ring endings found: ${duplicates.join(', ')}`, extractedString).setColumnNumber(pos);
        // Add to atom
        const group = groups[groups.length - 1];
        group.ringDigits.push(...obj.digits);

        // Update _openRings
        // Add last atom to ring if it is opened
        // Do not add if ring is closed -> this was handled last time
        obj.digits.forEach(digit => {
          if (this._openRings[digit] === undefined) {
            const ring = new Ring(digit);
            this._openRings[digit] = ring;
            this._rings.push(ring);
            this._openRings[digit].members.push(group.ID);
          } else {
            delete this._openRings[digit];
          }
        });

        pos += extractedString.length;
        continue;
      }
      //#endregion

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
              if (currentGroup === undefined) currentGroup = new Group({ chainDepth }).setSMILESposInfo(indexOffset + pos, extracted.length);
              currentGroup.addElement(extracted);
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
          let ok = two.addBond(currentBond, one, indexOffset + currentBondPos);
          if (!ok) throw new AdvError(`Bond Error: attempted to create explicit bond between this (${one.toString()}) and last atom (${two.toString()})`, currentBond).setColumnNumber(currentBondPos);
        } else if (groups.length === 1 && parent instanceof Group) {
          // Link to chain parent
          let ok = parent.addBond(currentBond, groups[0], indexOffset + currentBondPos);
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
          let ok = two.addBond(defaultBond, one, indexOffset + currentBondPos);
          if (!ok) throw new AdvError(`Bond Error: attempted to create implicit bond between this (${one.toString()}) and last atom (${two.toString()})`, smiles[pos]).setColumnNumber(pos);
        } else if (groups.length === 1 && parent instanceof Group) {
          // Link to chain parent
          let ok = parent.addBond(defaultBond, groups[0], indexOffset + currentBondPos);
          if (!ok) throw new AdvError(`Bond Error: attempted to create implicit bond between this (${groups[0].toString()}) and chain parent atom '${parent.toString()}'`, smiles[pos]).setColumnNumber(pos);
        }
      }
      //#endregion

      // #region Add to Any Open Rings
      for (let digit in this._openRings) {
        if (this._openRings.hasOwnProperty(digit)) {
          this._openRings[digit].members.push(groups[groups.length - 1].ID);
        }
      }
      //#endregion
    }

    // Add to global collection
    groups.forEach(g => this._groups[g.ID] = g);
  }

  /** Add implicit hydrogens e.g. "C" -> "C([H])([H])([H])([H])" */
  private _addImplcitHydrogens() {
    for (const gid in this._groups) {
      if (this._groups.hasOwnProperty(gid)) {
        const group = this._groups[gid];
        if (group.inOrganicSubset()) {
          const bonds = this._getBondCount(group);
          if (group.charge === 0) {
            // Find target bonds
            let targetBonds: number = NaN, el = Array.from(group.elements.keys())[0];
            for (let n of organicSubset[el]) {
              if (n >= bonds) {
                targetBonds = n
                break;
              }
            }
            // Add hydrogens (if got targetBonds)
            if (!isNaN(targetBonds)) {
              let hCount = targetBonds - bonds;
              for (let h = 0; h < hCount; h++) {
                let hydrogen = new Group({ chainDepth: group.chainDepth + 1 });
                hydrogen.addElement("H");
                hydrogen.isImplicit = true;
                group.addBond('-', hydrogen);
                this._groups[hydrogen.ID] = hydrogen;
              }
            }
          }
        }
      }
    }
  }

  /**
   * Check each atom - has it too many/few bonds?
   * Return `true` if valid, else throws AdvError
  */
  public checkBondCounts() {
    try {
      for (const gid in this._groups) {
        if (this._groups.hasOwnProperty(gid)) {
          const group = this._groups[gid], bonds = this._getBondCount(group);
          // If charge is zero, and not in organic subset, ignore
          if (group.charge === 0) {
            if (group.inOrganicSubset()) {
              let el = Array.from(group.elements.keys())[0], bondNumbers = organicSubset[el], ok = false;
              for (let n of bondNumbers) {
                if (n === bonds) {
                  ok = true;
                  break;
                }
              }
              if (!ok) throw new AdvError(`Bond Error: invalid bond count for organic atom '${el}': ${bonds}. Expected ${bondNumbers.join(' or ')}.`, el).setColumnNumber(group.smilesStringPosition);
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof AdvError) {
        let col = e.columnNumber;
        e.setUnderlineString(this._smilesString);
        e.columnNumber = col;
      }
      throw e;
    }
  }

  /** How many bonds does said group have? */
  private _getBondCount(group: Group): number {
    let count = group.getBondCount();
    for (const gid in this._groups) {
      if (this._groups.hasOwnProperty(gid)) {
        this._groups[gid].bonds.forEach(bond => {
          if (bond.dest === group.ID) count += getBondNumber(bond.bond);
        });
      }
    }
    return count;
  }

  /** Check that there are no open rings. */
  private _checkOpenRings() {
    for (let digit in this._openRings) {
      if (this._openRings.hasOwnProperty(digit)) {
        const ring = this._openRings[digit];
        if (ring !== undefined) {
          const openingGroup = this._groups[ring.members[0]];
          throw new AdvError(`Ring Error: unclosed ring '${ring.digit}'`, this._smilesString.substr(openingGroup.smilesStringPosition)).setColumnNumber(openingGroup.smilesStringPosition);
        }
      }
    }
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
    for (const id in this._groups) {
      if (this._groups.hasOwnProperty(id)) {
        const group = this._groups[id], groupCharge = opts.ignoreCharge ? 0 : group.charge;
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

  // #region Generate
  /** Generate SMILES string from parsed data.
   * @param showImplcities - Render implicit groups? (if .isImplicit === true)
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
    stack.push(createGenerateSmilesStackItemObject(+Object.keys(this._groups)[0])); // Add root group

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
        const group = this._groups[stack[i].group];

        // Shall we render this?
        const render = !group.isImplicit || (group.isImplicit && showImplicits);
        if (render) {
          stack[i].smiles += stack[i].bond && stack[i].bond !== '-' ? stack[i].bond : '';
          stack[i].smiles += group.toString();
          if (group.ringDigits.length !== 0) stack[i].smiles += group.ringDigits.map(n => '%' + n).join('');
        }
        stack[i].handled = true;

        // Bonds (add in reverse as topmost is processed first)
        for (let j = group.bonds.length - 1; j >= 0; j--) {
          const obj = group.bonds[j];
          stack.push(createGenerateSmilesStackItemObject(obj.dest, i, obj.bond));
        }
      }
    }
    return smiles;
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
    stack.push(+Object.keys(this._groups)[0]);

    while (stack.length !== 0) {
      const i = stack.length - 1, group = this._groups[stack[i]];
      if (isNaN(stack[i]) || doneGroups.has(group.ID)) {
        stack.splice(i, 1);
      } else {
        let groupElements = new Map<string, number>();
        groupElements.set(group.toStringFancy(), 1);
        for (let j = group.bonds.length - 1; j >= 0; j--) {
          const bond = group.bonds[j];
          if (!doneGroups.has(bond.dest) && this._groups[bond.dest].bonds.length === 0) {
            let el = this._groups[bond.dest].toStringFancy();
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
    elements.forEach(map => {
      let j = 0, segStr = '';
      map.forEach((count, el) => {
        let str = count === 1 ? el : el + (html ? "<sub>" + numstr(count) + "</sub>" : count.toString());
        if (j > 0 && j < map.size - 1) str = "(" + str + ")";
        j++;
        segStr += str;
      });
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
  //#endregion

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
    stack.push(+Object.keys(this._groups)[0]);

    while (stack.length !== 0) {
      const i = stack.length - 1, group = this._groups[stack[i]];
      if (isNaN(stack[i]) || doneGroups.has(group.ID)) {
        stack.splice(i, 1);
      } else {
        // Halogen
        if (group.isElement("F", "Cl", "Br", "I")) {
          addFGroups("haloalkane", { pos: group.smilesStringPosition, symbol: group.getElementString() });
        }

        for (let j = group.bonds.length - 1; j >= 0; j--) {
          const bond = group.bonds[j], bondedGroup = this._groups[bond.dest], isC = group.isElement("C");
          if (isC && !hasC) hasC = true;
          // Alkene/Alkyne
          group.bonds.forEach(bond => {
            if (isC && bondedGroup.isElement("C")) {
              if (bond.bond === "=") addFGroups("alkene", { pos: bond.smilesPosition, symbol: "=" }); // C=C
              else if (bond.bond === "#") addFGroups("alkyne", { pos: bond.smilesPosition, symbol: "#" }); // C#C
            }
          });

          // Halogen
          if (bondedGroup.isElement("F", "Cl", "Br", "I")) {
            addFGroups("haloalkane", { pos: bondedGroup.smilesStringPosition, symbol: bondedGroup.getElementString() });
          }

          // Alcohol: -OH
          else if ((group.isElement("O") && bondedGroup.isElement("H")) || (group.isElement("H") && bondedGroup.isElement("O"))) {
            addFGroups("alcohol", { pos: group.smilesStringPosition, symbol: "OH" });
          }

          // Nitrile: -C#N
          else if (bond.bond === "#" && ((group.isElement("C") && bondedGroup.isElement("N")) || (group.isElement("N") && bondedGroup.isElement("C")))) {
            addFGroups("nitrile", { pos: group.smilesStringPosition, symbol: "C#N" });
          }

          // Ketone / Aldehyde
          else if (bond.bond === "=" && ((group.isElement("C") && bondedGroup.isElement("O")) || (group.isElement("O") && bondedGroup.isElement("C")))) {
            const hasH = group.bonds.some(bond => this._groups[bond.dest].isElement("H"));
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
}

export default Environment;