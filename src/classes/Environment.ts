import { organicSubset } from "../data-vars";
import { BondType } from "../types/Bonds";
import { arrFromBack, extractBetweenMatching, extractElement, isBondChar, parseChargeString, parseInorganicString, _chargeRegex1, _chargeRegex2 } from "../utils";
import { AdvError } from "./Error";
import { Group } from "./Group";

export class Environment {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;

  private _smilesString: string = '';
  private _groups: Group[];

  public constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._ctx = canvas.getContext("2d");
  }

  public setSMILESstring(string: string) { this._smilesString = string; }

  /**
   * Parses this._smilesString
   */
  public parse() {
    this._groups = [];
    this._tryParse(this._smilesString, this._groups, undefined, 0);
  }

  private _tryParse(smiles: string, groups: Group[], parent?: Group, startIndex = 0) {
    try {
      return this._parse(smiles, groups, parent);
    } catch (e) {
      if (e instanceof AdvError) {
        let colNo = e.columnNumber + startIndex;
        e.insertMessage(`Error whilst parsing SMILES string "${smiles}":`);
        e.setUnderlineString(smiles);
        e.columnNumber = colNo;
      }
      throw e;
    }
  }

  private _parse(smiles: string, groups: Group[], parent?: Group) {
    let currentGroup = parent, currentBond: BondType, currentBondPos = NaN;
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
              pos += extraction.extracted.length + 2; // [<extraction.extracted>]

              groups.push(currentGroup);
              currentGroup = undefined;
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
      if (smiles[pos] === '(') {
        throw new AdvError(`Syntax Error: unexpected chain at position ${pos}`, '(').setColumnNumber(pos);
      }
      // #endregion

      // #region Organic Atom
      // Attempt to extract atom
      else {
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
      //#endregion

      // #region Bonding
      if (currentBond) {
        // Link last two items?
        if (groups.length >= 2) {
          let one = arrFromBack(groups, 1), two = arrFromBack(groups, 2);
          let ok = two.addBond(currentBond, one);
          if (!ok) throw new AdvError(`Bond Error: attempted to create explicit bond between this and last atom`, currentBond).setColumnNumber(currentBondPos);
        } else {
          throw new AdvError(`Syntax Error: unexpected bond '${currentBond}'`, currentBond).setColumnNumber(currentBondPos);
        }
        currentBond = undefined;
      } else if (groups.length >= 2) {
        // Add default, single bond to last atom
        let one = arrFromBack(groups, 1), two = arrFromBack(groups, 2);
        let ok = two.addBond('-', one);
        if (!ok) throw new AdvError(`Bond Error: attempted to create default bond between this and last atom`, smiles[pos]).setColumnNumber(pos);
      }
      //#endregion
    }
  }
}