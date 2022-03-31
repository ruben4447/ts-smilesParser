import { masses, organicSubset, symbols } from "../data-vars";
import { BondType } from "../types/Bonds";
import { createParseOptionsObject, createRenderOptsObject, IParseOptions, IRenderOptions, IRingMap } from "../types/SMILES";
import { IRec } from "../types/utils";
import { arrFromBack, extractBetweenMatching, extractDuplicates, extractElement, getTextMetrics, isBondChar, parseChargeString, parseDigitString, parseInorganicString, _chargeRegex1, _chargeRegex2, _regexNum } from "../utils";
import { AdvError } from "./Error";
import { Group } from "./Group";
import { Molecule } from "./Molecule";
import Ring from "./Rings";

export class SMILES {
  public parseOptions: IParseOptions = createParseOptionsObject();
  public renderOptions: IRenderOptions = createRenderOptsObject(); // Passed to ParsedSMILES

  /**
   * Parse a SMILES string according to this.parseOptions (individual properties mey be overriden by parseOptionsOverride)
   * @throws AdvError
   */
  public parse(smiles: string, parseOptionsOverride?: { [opt: string]: boolean }) {
    const parseOptions = { ...this.parseOptions };
    if (parseOptionsOverride) {
      for (let key in parseOptionsOverride) {
        parseOptions[key] = parseOptionsOverride[key];
      }
    }

    const ps = new ParsedSMILES(smiles, parseOptions);
    ps.renderOptions = this.renderOptions;

    try {
      const mainChain: Group[] = [];
      this._tryParse(ps, smiles, mainChain);
      try {
        // Incomplete reaction?
        if (ps.reactionIndexes.length % 2 === 1) {
          throw new AdvError(`Syntax Error: ">" expected (incomplete reaction SMILES)`, smiles[smiles.length - 1]).setColumnNumber(smiles.length - 1);
        }
        // Check that rings do not cross structures
        ps.molecules.forEach(mol => {
          mol.rings.forEach(ring => {
            ring.members.forEach(n => {
              if (mol.groups[n] === undefined) { // Group not in molecule
                const start = mol.groups[ring.members[0]];
                throw new AdvError(`Ring Error: ring structure cannot bridge molecules`, start.toString()).setColumnNumber(start.smilesStringPosition);
              }
            });
          });
        });
        // Check for open rings && close them with bonds
        for (const ring of ps.rings) {
          if (ring.end === undefined) throw new AdvError(`Ring Error: unclosed ring '${ring.digit}'`, smiles.substring(ps.groupMap[ring.start].smilesStringPosition)).setColumnNumber(ps.groupMap[ring.start].smilesStringPosition);
          ps.groupMap[ring.start].addBond(ring.isAromatic ? ':' : '-', ps.groupMap[ring.end]);
        }
        // Add implicit hydrogens?
        if (parseOptions.addImplicitHydrogens) ps.molecules.forEach(m => m.addImplicitHydrogens());
        // Check bond count
        if (parseOptions.checkBondCount) ps.molecules.forEach(m => {
          const x = m.checkBondCounts();
          if (typeof x === 'object') {
            let col = x.error.columnNumber;
            x.error.setUnderlineString(smiles);
            x.error.columnNumber = col;
            throw x.error;
          }
        });
        // Find ring members
        for (let mol of ps.molecules) {
          for (let ring of mol.rings) {
            const paths = mol.pathfind(ring.start, ring.end, ring.members);
            const llen = Math.max(...paths.map(path => path.length)); // Length of longest path
            ring.members = mol.traceBondPath(ring.start, paths.find(path => path.length === llen));
          }
        }
      } catch (e) {
        if (e instanceof AdvError) {
          let col = e.columnNumber;
          e.insertMessage(`Error in SMILES '${smiles}'`);
          e.setUnderlineString(smiles);
          e.columnNumber = col;
        }
        throw e;
      }
    } catch (e) {
      // Turn AdvError into Error - transfer fancy message
      if (e instanceof AdvError) throw new Error(e.getErrorMessage());
      throw e;
    }

    return ps;
  }

  private _tryParse(ps: ParsedSMILES, smiles: string, groups: Group[], parent?: Group, chainDepth = 0, indexOffset = 0) {
    try {
      return this._parse(ps, smiles, groups, parent, chainDepth, indexOffset);
    } catch (e) {
      if (e instanceof AdvError) {
        let colNo = indexOffset + e.columnNumber;
        e.insertMessage(`Error whilst parsing SMILES string "${ps.smiles}" (chain depth ${chainDepth}):`);
        e.setUnderlineString(ps.smiles);
        e.columnNumber = colNo;
      }
      throw e;
    }
  }

  /** NOT designed to be called directly */
  private _parse(ps: ParsedSMILES, smiles: string, groups: Group[], parent?: Group, chainDepth = 0, indexOffset = 0) {
    let currentGroup: Group = undefined, currentBond: BondType, currentBondPos = NaN, dontBondNext = false;
    for (let pos = 0; pos < smiles.length;) {
      // #region Disconnected Structures
      if (ps.parseOptions.enableSeperatedStructures && smiles[pos] === "." && chainDepth === 0) {
        // Unecesarry
        if (dontBondNext) throw new AdvError(`Syntax Error: expected SMILES, got seperator '.'`, '.').setColumnNumber(pos);
        dontBondNext = true;
        ps.molecules.push(new Molecule());
        pos++;
        continue;
      }
      //#endregion

      //#region Reaction
      if (smiles[pos] === ">" && chainDepth === 0 && groups.length > 0 && (ps.parseOptions.enableMultipleReactions ? true : ps.reactionIndexes.length < 2) && ps.parseOptions.enableReaction) {
        let ptr = ps.molecules.length - 1;
        dontBondNext = true;
        if (Object.keys(ps.molecules[ptr].groups).length > 0) {
          ps.molecules.push(new Molecule());
        } else {
          ptr--;
        }
        pos++;
        ps.reactionIndexes.push(ptr);
        continue;
      }
      //#endregion

      // #region Explicit Bond
      if (isBondChar(smiles[pos]) && (smiles[pos] === ":" ? ps.parseOptions.enableAromaticity : true)) {
        currentBond = smiles[pos] as BondType;
        currentBondPos = pos;
        pos++;
        if (pos >= smiles.length) throw new AdvError(`Syntax Error: invalid bond '${currentBond}': unexpected end-of-input after bond`, currentBond).setColumnNumber(pos - 1);
        if (currentBond === ':') {
          if (Object.keys(ps.openRings).length === 0) throw new AdvError(`Bond Error: aromatic bond '${currentBond}' only valid in rings`, currentBond).setColumnNumber(pos - 1);
          for (const rid in ps.openRings) ps.openRings[rid].isAromatic = true;
        }
      }
      //#endregion

      // {...}
      // #region Charge
      if (smiles[pos] === '{' && groups.length > 0 && ps.parseOptions.enableChargeClauses) {
        let extraction = extractBetweenMatching(smiles, "{", "}", pos);
        // Was the extraction OK?
        if (extraction.openCount !== 0) throw new AdvError(`Syntax Error: unmatched closing brace at position ${pos} '${smiles[pos]}'`, smiles.substr(pos)).setColumnNumber(pos);

        // Valid charge?
        let charge = parseChargeString(extraction.extracted);
        if (isNaN(charge)) throw new AdvError(`Syntax Error: invalid charge string. Expected ${_chargeRegex1} or ${_chargeRegex2}`, extraction.extracted).setColumnNumber(pos + 1);

        // Apply to last group Is charge already applied?
        let group = arrFromBack(groups, 1), length = extraction.extracted.length + 2;
        // Cumulative charge?
        if (group.charge !== 0 && !ps.parseOptions.cumulativeCharge) throw new AdvError(`Syntax Error: unexpected charge clause`, "{" + extraction.extracted + "}").setColumnNumber(pos);
        group.charge += charge;
        pos += length;
        group.smilesStringLength += length;
        continue;
      }
      //#endregion

      // [...]
      // #region Inorganic Atom/Ion
      else if (smiles[pos] === '[' && ps.parseOptions.enableInorganicAtoms) {
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
              if (info.atomicMass !== undefined) currentGroup.atomicMass = info.atomicMass;
              else if (ps.parseOptions.showImplcitAtomicMass) currentGroup.atomicMass = masses[symbols.indexOf(Array.from(currentGroup.elements.keys())[0])];

              groups.push(currentGroup);
              ps.molecules[ps.molecules.length - 1].groups[currentGroup.ID] = currentGroup;
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
      else if (smiles[pos] === '(' && ps.parseOptions.enableChains) {
        // Extract chain SMILES string
        let extraction = extractBetweenMatching(smiles, "(", ")", pos);
        if (extraction.openCount !== 0) throw new AdvError(`Syntax Error: unmatched closing parenthesis at position ${pos} '${smiles[pos]}'`, smiles.substr(pos)).setColumnNumber(pos);
        if (extraction.extracted.length === 0) throw new AdvError(`Syntax Error: Empty chain at position ${pos}`, '()').setColumnNumber(pos);

        // Parse
        if (groups.length === 0) throw new AdvError(`Syntax Error: unexpected SMILES chain (no parent could be found)`, "(" + extraction.extracted + ")").setColumnNumber(pos);
        const parent = groups[groups.length - 1], chainGroups: Group[] = [];
        try {
          this._tryParse(ps, extraction.extracted, chainGroups, parent, chainDepth + 1, indexOffset + pos + 1);
        } catch (e) {
          if (e instanceof AdvError) e.insertMessage(`Error whilst parsing chain "(${extraction.extracted})" at position ${pos}: `);
          throw e;
        }

        pos += extraction.extracted.length + 2;
        continue; // We dont wanna process bonds (nothing on the main chain would've changed)
      }
      // #endregion

      // #region Ring digits
      else if ((_regexNum.test(smiles[pos]) || smiles[pos] === '%') && ps.parseOptions.enableRings) {
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
          if (ps.openRings[digit] === undefined) {
            const ring = new Ring(digit, group.ID);
            ps.openRings[digit] = ring;
            ps.rings.push(ring);
            ps.molecules[ps.molecules.length - 1].rings.push(ring);
            ps.openRings[digit].members.push(group.ID);
          } else {
            ps.openRings[digit].end = group.ID;
            delete ps.openRings[digit];
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
              if (ps.parseOptions.showImplcitAtomicMass) currentGroup.atomicMass = masses[symbols.indexOf(Array.from(currentGroup.elements.keys())[0])];
              groups.push(currentGroup);
              ps.molecules[ps.molecules.length - 1].groups[currentGroup.ID] = currentGroup;
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
      for (let digit in ps.openRings) {
        ps.openRings[digit].members.push(groups[groups.length - 1].ID);
      }
      //#endregion
    }

    // Add groups to SMILES instance
    groups.forEach(g => ps.groupMap[g.ID] = g);
  }
}

/** Output from SMILES#parse */
export class ParsedSMILES {
  public readonly smiles: string; // Original SMILES string
  public readonly parseOptions: IParseOptions; // Options used to parse SMILES
  public groups: Group[];
  public groupMap: { [gid: number]: Group };
  public molecules: Molecule[];
  public openRings: IRingMap;
  public rings: Ring[];
  public renderOptions: IRenderOptions; // Options to be used for rendering
  public reactionIndexes: number[]; // Indexes of ">"

  constructor(smiles: string, parseOptions: IParseOptions) {
    this.smiles = smiles;
    this.parseOptions = parseOptions;
    this.groups = [];
    this.groupMap = {};
    this.molecules = [new Molecule()];
    this.openRings = {};
    this.rings = [];
    this.renderOptions = createRenderOptsObject();
    this.reactionIndexes = [];
  }

  /** Generate SMILES string from parsed data.
   * @param showImplicits - Render implicit groups? (if .isImplicit === true)
  */
  public generateSMILES(showImplicits = false) {
    let smiles = '';
    for (let i = 0; i < this.molecules.length; ++i) {
      smiles += this.molecules[i].generateSMILES(showImplicits);
      if (i < this.molecules.length - 1) {
        let j = this.reactionIndexes.findIndex(n => n === i);
        let sep = j === -1 ? "." : ">";
        if (j !== -1 && i === this.reactionIndexes[j + 1]) sep += ">";
        smiles += sep;
      }
    }
    return smiles;
  }

  /** Render to a canvas */
  public render(renderOptionsOverride?: { [opt: string]: boolean }) {
    const renderOptions = { ...this.renderOptions };
    if (renderOptionsOverride) {
      for (let key in renderOptionsOverride) {
        renderOptions[key] = renderOptionsOverride[key];
      }
    }

    const images: ImageData[] = [];
    const oc = new OffscreenCanvas(1000, 1000), occtx = oc.getContext("2d");
    for (const mol of this.molecules) {
      occtx.clearRect(0, 0, oc.width, oc.height);
      const image = mol.render(occtx, renderOptions);
      images.push(image);
    }

    occtx.fillStyle = renderOptions.bg;
    occtx.fillRect(0, 0, oc.width, oc.height);

    // Record positions of every image/text piece
    let P = 3, x = P, y = P, w = x, h = y, minH = h, minW = w;
    const molPosHistory: { x: number, y: number, minW: number, minH: number }[] = []; // Position of molecules
    const txtPosHistory: { text: string, x: number, y: number, w: number, h: number }[] = [];
    const isReaction = this.reactionIndexes.some(n => n !== -1);
    for (let i = 0; i < images.length; ++i) {
      const image = images[i];
      // Width/height of final image
      if (image.height > h - minH) h = minH + image.height;
      if (image.width > w - minW) w = minW + image.width;
      if (w > minW) minW = w;
      // Add record
      molPosHistory.push({ x, y: NaN, minW, minH });
      x += image.width;

      if (isReaction && this.molecules[i + 1]) {
        const eq = !this.reactionIndexes.some(n => n === i); // Are molecules the same type?
        const text = eq ? "+" : "→";
        const osize = renderOptions.font.size;
        occtx.font = renderOptions.font.set("size", 25).toString();
        occtx.fillStyle = renderOptions.defaultAtomColor;
        let { width, height } = getTextMetrics(occtx, text);
        txtPosHistory.push({ text, x: x + P, y: NaN, w: width, h: height });
        occtx.font = renderOptions.font.set("size", osize).toString();
        width += 2 * P;
        x += width;
        if (x > w) w = x;

        if (!eq) {
          for (let j = txtPosHistory.length - 1; j >= 0 && isNaN(txtPosHistory[j].y); j--)
            txtPosHistory[j].y = y + (h - minH) / 2;
          for (let j = molPosHistory.length - 1; j >= 0 && isNaN(molPosHistory[j].y); j--)
            molPosHistory[j].y = y + (h - minH) / 2 - images[j].height / 2;
          x = P;
          y = h + 2 * P;
          minH = y;
          minW = x;
        }
      }
    }
    for (let j = txtPosHistory.length - 1; j >= 0 && isNaN(txtPosHistory[j].y); j--)
      txtPosHistory[j].y = y + (h - minH) / 2;
    for (let j = molPosHistory.length - 1; j >= 0 && isNaN(molPosHistory[j].y); j--)
      molPosHistory[j].y = y + (h - minH) / 2 - images[j].height / 2;

    // Render molecule images
    for (let i = 0; i < molPosHistory.length; i++) {
      occtx.putImageData(images[i], molPosHistory[i].x, molPosHistory[i].y);
    }

    // Render text
    const osize = renderOptions.font.size;
    occtx.font = renderOptions.font.set("size", 25).toString();
    occtx.fillStyle = renderOptions.defaultAtomColor;
    for (const { text, x, y, h } of txtPosHistory) {
      occtx.fillText(text, x, y + h/3);
    }
    occtx.font = renderOptions.font.set("size", osize).toString();

    // Reagent brackets
    if (renderOptions.reagentBracketWidth !== -1 && this.reactionIndexes.length !== 0) {
      for (let j = 0; j < this.reactionIndexes.length - 1; j += 2) {
        if (this.reactionIndexes[j] !== this.reactionIndexes[j + 1]) {
          let i = this.reactionIndexes[j] + 1;
          // "["
          occtx.strokeStyle = renderOptions.defaultAtomColor;
          occtx.beginPath();
          occtx.moveTo(molPosHistory[i].x + renderOptions.reagentBracketWidth, molPosHistory[i].y + P);
          occtx.lineTo(molPosHistory[i].x, molPosHistory[i].y + P);
          occtx.lineTo(molPosHistory[i].x, molPosHistory[i].y + images[i].height - P);
          occtx.lineTo(molPosHistory[i].x + renderOptions.reagentBracketWidth, molPosHistory[i].y + images[i].height - P);
          occtx.stroke();
          molPosHistory[i].x += renderOptions.reagentBracketWidth;

          i = this.reactionIndexes[j + 1];
          // "]"
          occtx.strokeStyle = renderOptions.defaultAtomColor;
          occtx.beginPath();
          occtx.moveTo(molPosHistory[i].x + images[i].width - 2*P - renderOptions.reagentBracketWidth, molPosHistory[i].y + P);
          occtx.lineTo(molPosHistory[i].x + images[i].width - 2*P, molPosHistory[i].y + P);
          occtx.lineTo(molPosHistory[i].x + images[i].width - 2*P, molPosHistory[i].y + images[i].height - P);
          occtx.lineTo(molPosHistory[i].x + images[i].width - 2*P - renderOptions.reagentBracketWidth, molPosHistory[i].y + images[i].height - P);
          occtx.stroke();
          molPosHistory[i].x += renderOptions.reagentBracketWidth;
        }
      }
    }

    const image = occtx.getImageData(0, 0, w + P, h);
    return image;
  }
}