import { symbolsByLength } from "./data-vars";
import { IExtractBetweenInformation, IParseInorganicString } from "./types/utils";

export const getTextMetrics = (ctx: CanvasRenderingContext2D, text: string) => {
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    height: metrics.fontBoundingBoxDescent + metrics.fontBoundingBoxAscent,
  };
};

/** Render multiline text to a canvas. Return final y position. */
export function canvasWriteText(ctx: CanvasRenderingContext2D, text: string, startX = 0, startY = 0, linePaddingMult = 1): number {
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
export function parseDigitString(string: string): number[] {
  let digits = [], metPercent = false;
  for (let i = 0; i < string.length; i++) {
    if (string[i] === '%') {
      metPercent = true;
      digits.push("");
      continue;
    }

    if (metPercent) {
      digits[digits.length - 1] += string[i];
    } else {
      digits.push(string[i]);
    }
  }
  return digits.map(x => parseInt(x)).filter(n => !isNaN(n));
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
export function extractElement(string: string): string | null {
  for (let i = symbolsByLength.length - 1; i >= 0; i--) {
    for (let j = 0; j < symbolsByLength[i].length; j++) {
      let symbol = symbolsByLength[i][j];
      if (symbol === string.substr(0, symbol.length)) return symbol;
    }
  }
  return null;
}

/** Is the given string a bond? */
export const isBondChar = (chr: string) => chr == "-" || chr == "=" || chr == "#";

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
const _regexNum = /[0-9]/;

/**
 * Parse inorganic string e.g. 'NH4+' (stuff inside [...])
 * @throws AdvError
*/
export function parseInorganicString(str: string): IParseInorganicString {
  let info: IParseInorganicString = { elements: [], charge: 0, endIndex: 0 }, i: number;
  for (i = 0; i < str.length;) {
    // Atom?
    let atom = extractElement(str.substr(i));
    if (atom) {
      info.elements.push(atom);
      i += atom.length;
    } else {
      // Number after element?
      if (_regexNum.test(str[i])) {
        let num = extractInteger(str.substr(i)), numStr = num.toString();
        if (isNaN(num)) {
          info.error = `Syntax Error: expected integer, got '${numStr}'`;
          break;
        } else {
          info.elements[info.elements.length - 1] += numStr;
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
          break;
        }
      }
    }
  }
  info.endIndex = i;
  return info;
}

/** Charge number to string */
export const chargeToString = (charge: number): string => (charge < 0 ? '-' : '+') + Math.abs(charge).toString();