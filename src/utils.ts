import { lowercaseRingAtoms, symbolsByLength } from "./data-vars";
import { BondType } from "./types/Bonds";
import { IAtomCount } from "./types/SMILES";
import { IExtractBetweenInformation, IParseDigitString, IParseInorganicString } from "./types/utils";

export const getTextMetrics = (ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, text: string) => {
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    height: metrics.fontBoundingBoxDescent + metrics.fontBoundingBoxAscent,
  };
};

/** Render multiline text to a canvas. Return final y position. */
export function canvasWriteText(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, text: string, startX = 0, startY = 0, linePaddingMult = 1): number {
  const lines = text.split(/\r\n|\r|\n/g);
  let x = startX, y = startY;
  for (const line of lines) {
    const metrics = getTextMetrics(ctx, line);
    ctx.fillText(line, x, y);
    y += metrics.height * linePaddingMult;
  }
  return y;
}

/**
 * @param string - charge strinng SYNTAX '[-+][0-9]+' or '[+-]+'
 * @return charge
 */
export function parseChargeString(string: string): number {
  let match = string.match(_chargeRegex1);
  if (match) {
    let num = parseInt(match[2]);
    if (match[1] === '-') num *= -1;
    return num;
  } else {
    match = string.match(_chargeRegex2);
    if (match) {
      let num = match[1].length;
      if (match[1][0] === '-') num *= -1;
      return num;
    }
  }
  return NaN;
}
export const _chargeRegex1 = /^([\+\-])([0-9]+)$/; // e.g. +3
export const _chargeRegex2 = /^([\+]+|[\-]+)$/; // e.g. +++

/**
 * Extract ring digits from ring digit string
 * @param string - ring digit string e.g. "12%10%3" -> [1, 2, 10, 3]
 */
export function parseDigitString(string: string): IParseDigitString {
  let i: number, digits = [], metPercent = false;
  for (i = 0; i < string.length; i++) {
    if (string[i] === '%') {
      metPercent = true;
      digits.push("");
      continue;
    } else if (_regexNum.test(string[i])) {
      if (metPercent) {
        digits[digits.length - 1] += string[i];
      } else {
        digits.push(string[i]);
      }
    } else {
      break;
    }
  }
  return {
    digits: digits.map(x => parseInt(x)),
    endIndex: i,
  };
}

/** Does an array have duplicates? */
export function hasDuplicates<T>(array: T[]): boolean {
  return array.some(x => array.indexOf(x) !== array.lastIndexOf(x));
}

export function underlineStringPortion(string: string, startPos: number, length: number = 1, prefix: string = "") {
  return prefix + string + '\n' + (' '.repeat(startPos + prefix.length)) + ('~'.repeat(length));;
}

/**
 * Extract string between matching parameters
*/
export function extractBetweenMatching(string: string, open: string, close: string, startIndex = 0): IExtractBetweenInformation {
  let extracted = '', i = startIndex;
  let openCount = 0, opened = false;
  for (; i < string.length; i++) {
    if (string[i] === open) {
      if (openCount > 0) extracted += open;
      openCount++;
      opened = true;
    } else if (string[i] === close) {
      if (openCount <= 0) break;
      openCount--;
      if (openCount > 0) extracted += close;
      if (openCount === 0) break;
    } else {
      if (opened) extracted += string[i];
    }
  }
  return {
    input: string,
    startIndex,
    endIndex: i,
    extracted,
    remaining: string.substr(i),
    openCount,
  };
}

/** Extract atom from string */
export function extractElement(string: string, searchLowercaseAtoms = true): string | null {
  if (searchLowercaseAtoms)
    for (let el of lowercaseRingAtoms) {
      if (el === string.substr(0, el.length)) return el;
    }
  for (let i = symbolsByLength.length - 1; i >= 0; i--) {
    for (let j = 0; j < symbolsByLength[i].length; j++) {
      let symbol = symbolsByLength[i][j];
      if (symbol === string.substr(0, symbol.length)) return symbol;
    }
  }
  return null;
}

/** Is the given string a bond? */
export const isBondChar = (chr: string) => chr === "-" || chr === "=" || chr === "#" || chr === ":";

/** Get bond number */
export function getBondNumber(bond: BondType): number {
  if (bond === '-') return 1;
  if (bond === ':') return 1.5;
  if (bond === '=') return 2;
  if (bond === '#') return 3;
  return NaN;
}

export const arrFromBack = <T>(array: T[], index = 1): T => array[array.length - index];

export function extractInteger(str: string): number {
  let numStr = '';
  for (let i = 0; i < str.length; i++) {
    if (_regexNum.test(str[i])) {
      numStr += str[i];
    } else break;
  }
  return parseInt(numStr);
}
export const _regexNum = /[0-9]/;

export const numstr = (n: number) => n.toLocaleString("en-GB");

/**
 * Parse inorganic string e.g. 'NH4+' (stuff inside [...])
 * @throws AdvError
*/
export function parseInorganicString(str: string): IParseInorganicString {
  let info: IParseInorganicString = { elements: new Map(), charge: 0, endIndex: 0 }, i = 0, lastAtom: string;
  // Atomic mass?
  if (_regexNum.test(str[i])) {
    let num = extractInteger(str.substr(i)), numStr = num.toString();
    if (!isNaN(num)) {
      info.atomicMass = num;
      i += numStr.length;
    }
  }
  for (; i < str.length;) {
    // Atom?
    let atom = extractElement(str.substr(i));
    if (atom) {
      lastAtom = atom;
      info.elements.set(atom, (info.elements.get(atom) ?? 0) + 1);
      i += atom.length;
    } else {
      // Number after element?
      if (_regexNum.test(str[i])) {
        let num = extractInteger(str.substr(i)), numStr = num.toString();
        if (isNaN(num)) {
          info.error = `Syntax Error: expected integer, got '${numStr}'`;
          break;
        } else {
          info.elements.set(lastAtom, info.elements.get(lastAtom) + (num - 1)); // num - 1 as last atom already added once
          i += numStr.length;
        }
      } else {
        // Charge?
        const chargeStr = str.substr(i), charge = parseChargeString(chargeStr);
        if (isNaN(charge)) {
          info.error = `Syntax Error: invalid charge string '${chargeStr}'`;
          break;
        } else {
          info.charge = charge;
          i += chargeStr.length;
        }
      }
    }
  }
  info.endIndex = i;
  return info;
}

/** Charge number to string */
export const chargeToString = (charge: number): string => (charge < 0 ? '-' : '+') + (charge === 1 || charge === -1 ? '' : Math.abs(charge).toString());

/**
 * Transform AtomCount map into formula string
 * @param html - use <sub/> and <sup/> elements to encase numbers?
 */
export function assembleMolecularFormula(atoms: IAtomCount[], html = false): string {
  let str = '';
  for (let group of atoms) {
    // Only one atom?
    let firstAtom = extractElement(group.atom), atom = firstAtom === group.atom ? group.atom : '(' + group.atom + ')';
    str += atom;
    if (group.count !== 1) str += html ? `<sub>${group.count}</sub>` : group.count;
    if (!isNaN(group.charge) && group.charge !== 0) str += html ? `<sup>${chargeToString(group.charge)}</sup>` : `{${chargeToString(group.charge)}}`;
  }
  return str;
}

/**
 * Transform AtomCount map into empirical formula string
 * @param html - use <sub/> and <sup/> elements to encase numbers?
 */
export function assembleEmpiricalFormula(atoms: IAtomCount[], html = false): string {
  // Assemblt atom counts (without charges)
  const counts: { [atom: string]: number } = {};
  atoms.forEach(group => {
    if (counts[group.atom] === undefined) counts[group.atom] = 0;
    counts[group.atom] += group.count;
  });
  // Divide by GCD
  let gcd = gcdOfManyNumbers(Object.values(counts));
  let str = '';
  for (let atom in counts) {
    if (counts.hasOwnProperty(atom)) {
      counts[atom] /= gcd;
      str += atom;
      if (counts[atom] !== 1) str += html ? `<sub>${numstr(counts[atom])}</sub>` : counts[atom];
    }
  }
  return str;
}

/** Find Greatest Common Divisor or 2 numbers */
export function gcdOfTwoNumbers(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    let t = b;
    b = a % t;
    a = t;
  }
  return a;
}

/** Find greatest common divisor of a group of numbers */
export function gcdOfManyNumbers(numbers: number[]): number {
  let len = numbers.length, a: number, b: number;
  a = numbers[0];
  for (let i = 1; i < len; i++) {
    b = numbers[i];
    a = gcdOfTwoNumbers(a, b);
  }
  return a;
}

/** Extract duplicates from array */
export const extractDuplicates = <T>(array: T[]): T[] => array.filter(x => array.indexOf(x) !== array.lastIndexOf(x));

/** Polar to cartesian coordinates around (0,0) */
export const rotateCoords = (r: number, θ: number) => ([ r * Math.cos(θ), r * Math.sin(θ) ]);