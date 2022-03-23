import { organicSubset } from "../data-vars";
import { BondType } from "../types/Bonds";
import { createGenerateSmilesStackItemObject, createParseOptionsObject, IGenerateSmilesStackItem, IParseOptions, IRingMap } from "../types/SMILES";
import { IGroupMap } from "../types/Group";
import { arrFromBack, extractBetweenMatching, extractDuplicates, extractElement, getBondNumber, isBondChar, parseChargeString, parseDigitString, parseInorganicString, _chargeRegex1, _chargeRegex2, _regexNum } from "../utils";
import { AdvError } from "./Error";
import { Group, resetGroupID } from "./Group";
import { Molecule } from "./Molecule";
import Ring from "./Rings";

export class SMILES {
  private _smilesString: string = '';
  private _groups: IGroupMap;
  public parseOptions: IParseOptions = createParseOptionsObject();
  private _openRings: IRingMap; // What rings are open? This index corresponds to the ring digits
  private _rings: Ring[];

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
        // Create bonds between ring ends
        this._rings.forEach(ring => {
          this._groups[ring.members[0]].addBond(ring.isAromatic ? ':' : '-', this._groups[arrFromBack(ring.members)]);
        });

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
    let currentGroup: Group = undefined, currentBond: BondType, currentBondPos = NaN, dontBondNext = false;
    for (let pos = 0; pos < smiles.length;) {
      // #region Disconnected Structures
      if (this.parseOptions.enableSeperatedStructures && smiles[pos] === "." && chainDepth === 0) {
        // Unecesarry
        if (dontBondNext) throw new AdvError(`Syntax Error: expected SMILES, got seperator '.'`, '.').setColumnNumber(pos);
        dontBondNext = true;
        pos++;
        continue;
      }
      //#endregion

      // #region Explicit Bond
      if (isBondChar(smiles[pos])) {
        currentBond = smiles[pos] as BondType;
        currentBondPos = pos;
        pos++;
        if (pos >= smiles.length) throw new AdvError(`Syntax Error: invalid bond '${currentBond}': unexpected end-of-input after bond`, currentBond).setColumnNumber(pos - 1);
        if (currentBond === ':') {
          if (Object.keys(this._openRings).length === 0) throw new AdvError(`Bond Error: aromatic bond '${currentBond}' only valid in rings`, currentBond).setColumnNumber(pos - 1);
          for (const rid in this._openRings) this._openRings[rid].isAromatic = true;
        }
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
      if (dontBondNext) {
        if (currentBond) throw new AdvError(`Bond Error: attempted to create bond between seperatured structures`, currentBond).setColumnNumber(currentBondPos);
        dontBondNext = false;
      } else {
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
          console.log(openingGroup)
          throw new AdvError(`Ring Error: unclosed ring '${ring.digit}'`, this._smilesString.substr(openingGroup.smilesStringPosition)).setColumnNumber(openingGroup.smilesStringPosition);
        }
      }
    }
  }

  /** Return array of molecules */
  public getMolecules(): Molecule[] {
    const moleculeGroups: Group[][] = [];
    const stack: number[] = Object.keys(this._groups).map(k => +k).reverse(); // Stack of IDs to this._group to scan (or NaN if done)
    const bondedGroups = new Set<number>(); // Set of group IDs which have been bonded
    const doneGroups = new Set<number>(); // Set of group IDs which have been done

    while (stack.length !== 0) {
      const i = stack.length - 1, group = this._groups[stack[i]];
      if (doneGroups.has(group.ID)) {
        stack.splice(i, 1);
      } else {
        let isNew = !bondedGroups.has(group.ID);
        let arr: Group[];
        if (isNew) {
          arr = [group];
          moleculeGroups.push(arr);
        } else {
          arr = arrFromBack(moleculeGroups);
        }

        for (let j = group.bonds.length - 1; j >= 0; j--) {
          const bond = group.bonds[j];
          arr.push(this._groups[bond.dest]);
          // doneGroups.add(bond.dest);
          stack.push(bond.dest);
          bondedGroups.add(bond.dest);
        }

        doneGroups.add(group.ID);
        bondedGroups.add(group.ID);
      }
    }

    return moleculeGroups.map(groups => new Molecule(groups));
  }

  // /** Search for a functional group */
  // public matchSegments(groups: IGroupMap) {
  //   const checkStack: number[] = Object.keys(this._groups).map(k => +k).reverse(); // Groups to check
  //   const csToMatchIndex: number[] = Array.from<number>({ length: checkStack.length }).fill(-1); // Map IDs of this._groups to section we are macthing from in groups (or -1 if none)
  //   let matchingCount = 0;
  //   let stackLength = checkStack.length; // Record length of stack before started checking molecule

  //   /**  If groups match, go throuh each bond and check if it matches a bond from the group in segments. If so, and matches atom it is connected to, push to record. Return is any continuations were made. */
  //   const exploreForward = (gid: number, fgid: number) => {
  //     let anyMatch = false;
  //     if (groups[fgid].matchGroup(this._groups[gid])) {
  //       for (const bond of this._groups[gid].bonds) {
  //         for (const fbond of groups[fgid].bonds) {
  //           if (bond.bond === fbond.bond && this._groups[bond.dest].matchGroup(groups[fbond.dest])) {
  //             checkStack.push(bond.dest);
  //             csToMatchIndex.push(fbond.dest);
  //             anyMatch = true;
  //           }
  //         }
  //       }
  //     }
  //     return anyMatch;
  //   };

  //   while (checkStack.length > 0) {
  //     const gid = checkStack.pop(), fgid = csToMatchIndex.pop();

  //     if (fgid !== -1) {
  //       let cont = exploreForward(gid, fgid);
  //       if (!cont) {
  //         matchingCount = -1;
  //         checkStack.length = stackLength;
  //         csToMatchIndex.length = stackLength;
  //       }
  //     } else {
  //       for (const fgid in groups) {
  //         exploreForward(gid, +fgid);
  //       }
  //     }

  //     if (!matching) {
  //       matching = true;
  //       checkStack.length = stackLength;
  //     }
  //   }
  // }

  /** Generate SMILES string from parsed data.
   * @param molecules - Generate SMILES from provided array of molecules. If not provided, molecules = this.getMolecules()
   * @param showImplicits - Render implicit groups? (if .isImplicit === true)
  */
  public generateSMILES(molecules?: Molecule[], showImplicits = false): string {
    if (molecules === undefined) molecules = this.getMolecules();
    return molecules.map(mol => mol.generateSMILES()).join(".");
  }
}

export default SMILES;