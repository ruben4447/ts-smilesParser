import { masses, organicSubset, symbols } from "../data-vars";
import { BondType, IBond } from "../types/Bonds";
import { IAtomCount, defaultRenderOptsObject, IRenderOptions } from "../types/SMILES";
import { IGroupInformation, IGroupStrMap, IMatchAtom } from "../types/Group";
import { chargeToString, getBondNumber, getTextMetrics, numstr, parseInorganicString } from "../utils";
import type { Molecule } from "./Molecule";
import { IVec } from "../types/utils";

var ID = 0; // Next ID

export class Group {
  public readonly ID = ID++;
  public elements: Map<string, number>;
  public isLowercase = false; // Was digit defined as lower-case? (only applies to FIRST element)
  public atomicMass: number | undefined; // Atomic mass of FIRST element in this.elements
  public isRadical: boolean;
  public charge: number;
  public bonds: IBond[];
  public ringDigits: number[] = []; // Are we defined with any ring digits?
  public memberRings: number[]; // Array if IDs of rings we are members of
  public smilesStringPosition: number = 0; // Position declared in SMILES string
  public smilesStringLength: number = 1; // Length of definition in SMILES string
  public readonly chainDepth: number;
  public isImplicit = false; // Mainly for Hydrogens

  public constructor(data?: IGroupInformation);
  public constructor(elements: string[]);
  public constructor(data?: IGroupInformation | string[]) {
    if (data === undefined) data = {};
    let els: string[] = [];
    if (Array.isArray(data)) {
      els = data;
      data = {};
    }
    this.elements = data.elements || new Map();
    this.charge = data.charge === undefined ? 0 : data.charge;
    this.ringDigits = data.ringDigits || [];
    this.bonds = data.bonds || [];
    this.chainDepth = data.chainDepth === undefined ? 0 : data.chainDepth;
    this.isRadical = !!data.isRadical;
    els.forEach(el => this.addElement(el))
  }

  /** Is in organic subset */
  public inOrganicSubset() { return this.elements.size === 1 && organicSubset[Array.from(this.elements.keys())[0]] !== undefined && Array.from(this.elements.values())[0] === 1; }

  /** Get bonds we make with said group. Return BondType or null. */
  public getBondWith(group: Group): BondType | null {
    for (const bond of this.bonds) {
      if (bond.dest === group.ID) return bond.bond;
    }
    return null;
  }

  /** Attempt to create bonds with said group. Return: successfull? */
  public addBond(type: BondType, group: Group, smilesPosition?: number, position?: number): boolean {
    if (this === group) return false;
    if (this.getBondWith(group)) {
      return false;
    } else {
      if (position === undefined) this.bonds.push({ bond: type, dest: group.ID, smilesPosition });
      else this.bonds.splice(position, 0, { bond: type, dest: group.ID, smilesPosition });
      return true;
    }
  }

  /** Set position in SMILES string information */
  public setSMILESposInfo(pos: number, length: number): this {
    this.smilesStringPosition = pos;
    this.smilesStringLength = length;
    return this;
  }

  /** Add <count> of an element to this.elements */
  public addElement(element: string, count = 1) {
    this.elements.set(element, (this.elements.get(element) ?? 0) + count);
  }

  /** Get element string { "A" => 1, "B" => 2 } goes to "AB2". doLowercase => if true and this.isLowercase, return first element as lowercase */
  public getElementString(doLowercase: boolean, html = false) {
    return Array.from(this.elements).map(([element, count], i) => (i === 0 && doLowercase && this.isLowercase ? (element = element.toLowerCase()) : 1) && count === 1 ? element : element + (html ? `<sub>${numstr(count)}</sub>` : count.toString())).join("");
  }

  /** Is this group a single element? */
  public isElement(...elements: string[]) {
    if (this.elements.size === 1) {
      const [el, count] = Array.from(this.elements)[0];
      return count === 1 && elements.indexOf(el) !== -1;
    } else {
      return false;
    }
  }

  /** Do two groups match? */
  public matchGroup(group: Group) {
    if (this.charge !== group.charge) return false;
    for (const [el, count] of this.elements) {
      if (!group.elements.has(el) || group.elements.get(el) !== count) return false;
    }
    return true;
  }

  /** Get bond count - how mnay SINGLE bond equivalents we have (e.g. '=' would be +2) */
  public getBondCount(): number {
    return this.bonds.reduce((s, b) => s + getBondNumber(b.bond), 0);
  }

  /** Calculate Mr for a group */
  public calculateMr() {
    let Mr = Array.from(this.elements).reduce((Mr, [atom, count]) => Mr + (masses[symbols.indexOf(atom)] ?? 0) * count, 0);
    if (this.atomicMass !== undefined) {
      Mr -= masses[symbols.indexOf(Array.from(this.elements.keys())[0])];
      Mr += this.atomicMass;
    }
    return Mr;
  }

  /** Count atoms in group */
  public countAtoms(ignoreCharge = false): IAtomCount[] {
    if (this.charge !== 0 && !ignoreCharge) {
      let str = this.getElementString(false), chargeStr = str + '{' + this.charge + '}';
      return [{ atom: str, charge: this.charge, count: 1 }];
    } else {
      let atoms: IAtomCount[] = [], elementsPos: string[] = [];
      this.elements.forEach((count, element) => {
        let chargeStr = element + '{' + this.charge + '}', i = elementsPos.indexOf(chargeStr);
        if (atoms[element] === undefined) {
          atoms.push({ atom: element, charge: 0, count: 0 }); // If splitting groups up, cannot associate charge
          elementsPos.push(chargeStr);
          i = elementsPos.length - 1;
        }
        atoms[i].count += count;
      });
      return atoms;
    }
  }

  /** Return boolean: does this match an IMatchAtom? */
  public matchAtom(atom: IMatchAtom) {
    return (atom.atom === undefined ? true : Array.isArray(atom.atom) ? this.isElement(...atom.atom) : this.isElement(atom.atom)) && (atom.notAtom === undefined ? true : Array.isArray(atom.notAtom) ? !this.isElement(...atom.notAtom) : !this.isElement(atom.notAtom)) && (atom.charge === undefined || atom.charge === this.charge);
  }

  /** Return true if all branches provided are present from this group */
  public matchAtoms(toMatch: IMatchAtom, molecule: Molecule, recorded?: IGroupStrMap, scanAllBonds = true, exploredGroups?: Set<number>) {
    toMatch.bondedTo ??= [];
    recorded ??= {};
    exploredGroups ??= new Set();
    exploredGroups.add(this.ID);

    let matches = 0;
    if (this.matchAtom(toMatch)) {
      if (toMatch.bondedTo.length === 0) {
        if (toMatch.rec !== undefined) recorded[toMatch.rec] = this;
        matches++;
        return true;
      } else {
        const exploredBonds = new Set<number>();
        const bonds = scanAllBonds ? molecule.getAllBonds(this.ID) : this.bonds;
        for (const matchNext of toMatch.bondedTo) {
          for (let i = 0; i < bonds.length; ++i) {
            if (exploredBonds.has(i)) continue;
            if (matchNext.bond === undefined || matchNext.bond === bonds[i].bond) {
              let set = new Set(exploredGroups);
              set.add(bonds[i].dest);
              if (!exploredGroups.has(bonds[i].dest) && molecule.groups[bonds[i].dest].matchAtoms(matchNext, molecule, recorded, scanAllBonds, set)) {
                exploredBonds.add(i);
                if (toMatch.rec !== undefined) recorded[toMatch.rec] = this;
                matches++;
                break;
              }
            }
          }
        }
      }
      return matches >= toMatch.bondedTo.length;
    } else {
      return false;
    }
  }

  /** Return copy of group */
  public copy() {
    let g = new Group();
    g.charge = this.charge;
    g.isImplicit = this.isImplicit;
    g.bonds = this.bonds.map(bond => ({ ...bond }));
    g.ringDigits = [...this.ringDigits];
    return g;
  }

  /** String representation of whole atom */
  public toString() {
    let string = '', brackets = !this.inOrganicSubset() || this.charge !== 0 || this.isRadical;
    if (this.atomicMass !== undefined) {
      string += this.atomicMass.toString();
      brackets = true;
    }
    string += this.getElementString(true);
    if (this.charge !== 0) string += chargeToString(this.charge);
    if (this.isRadical) string += ".";
    if (brackets) string = "[" + string + "]";
    return string;
  }

  /** To fancy string e.g. "[NH4+]" -> (NH<sub>4</sub>)<sup>+</sup> */
  public toStringFancy(html = false, doLowercase = true): string {
    let string = this.getElementString(doLowercase, true);
    if (this.elements.size > 1) string = "(" + string + ")";
    if (this.charge !== 0) {
      const charge = chargeToString(this.charge);
      string += html ? "<sup>" + charge + "</sup>" : "{" + charge + "}";
    }
    if (this.isRadical) string += html ? "•" : ".";
    return string;
  }

  /** More in-depth string representation */
  public toStringAdv() {
    let string = "#" + this.ID + ":"
    string += this.toString();
    string += " ^" + this.chainDepth;
    if (this.ringDigits.length !== 0) string += ' %' + this.ringDigits.join('%')
    if (this.bonds.length > 0) {
      const lim = this.bonds.length;
      for (let i = 0; i < lim; i++) {
        const bond = this.bonds[i];
        string += ` ${bond.bond}<${bond.dest}>`;
      }
    }
    return string;
  }

  /** Attempt to create group from string: ["elements..."] (don't include square brackets) */
  public static fromString(str: string) {
    let info = parseInorganicString(str);
    if (info.error) return false;
    const group = new Group();
    info.elements.forEach((value, key) => group.addElement(key, value));
    group.charge = info.charge;
    return group;
  }

  /** Return color overall group would be represented with */
  public getRenderColor(re?: IRenderOptions) {
    if (re === undefined) re = defaultRenderOptsObject;
    let el = Array.from(this.elements.keys())[0];
    if (this.elements.size === 1 && this.elements.get(el) === 1) {
      return re.atomColors[el] ?? re.defaultAtomColor;
    } else {
      return re.defaultAtomColor;
    }
  }

  /** If rendered as text, what would the dimensions be? */
  public getRenderAsTextDimensions(re?: IRenderOptions, extraHs = 0) {
    if (re === undefined) re = defaultRenderOptsObject;
    const canv = new OffscreenCanvas(100 * re.font.size, re.font.size * 2), ctx = canv.getContext("2d");
    ctx.font = re.font.toString();
    let elements = new Map(this.elements);
    if (extraHs) elements.set("H", (elements.get("H") ?? 0 + extraHs));
    let str = Array.from(elements).map(([element, count]) => count === 1 ? element : element + count).join("");
    if (this.atomicMass !== undefined) str = this.atomicMass + str;
    if (this.charge !== 0) {
      let chargeStr = ((this.charge === 1 || this.charge === -1) ? '' : Math.abs(this.charge)) + (this.charge < 0 ? "-" : "+");
      str = (elements.size === 1 && Array.from(elements.values())[0] === 1) ? str + chargeStr : "[" + str + "]" + chargeStr;
    }
    let { width, height } = getTextMetrics(ctx, str);
    width += re.textPadding * (elements.size - 1);
    if (this.isRadical) height += re.radicalRadius * 4;
    return { width, height };
  }

  /** Render as text */
  public renderAsText(ctx: OffscreenCanvasRenderingContext2D, pos: IVec, re?: IRenderOptions, extraHs = 0) {
    if (isNaN(pos.x) || isNaN(pos.y)) return pos;
    if (re === undefined) re = defaultRenderOptsObject;
    ctx.font = re.font.toString();
    let x = pos.x, y = pos.y, elements = new Map(this.elements);
    if (extraHs) elements.set("H", (elements.get("H") ?? 0) + extraHs);
    let brackets = this.charge !== 0 && !(elements.size === 1 && Array.from(elements.values())[0] === 1);
    const items: { text: string, pos: -1 | 0 | 1, colEquiv?: string }[] = [];
    if (brackets) items.push({ text: "[", pos: 0 });
    if (this.atomicMass !== undefined) items.push({ text: this.atomicMass.toString(), pos: 1, colEquiv: Array.from(elements.keys())[0] });
    let prevEl = "";
    elements.forEach((count, el) => {
      let colEquiv = el === "H" && count - extraHs === 0 ? (prevEl ?? el) : el;
      items.push({ text: el, pos: 0, colEquiv });
      if (count !== 1) items.push({ text: count.toString(), pos: -1, colEquiv });
      prevEl = el;
    });
    if (brackets) items.push({ text: "]", pos: 0 });
    if (this.charge !== 0) items.push({ text: ((this.charge === 1 || this.charge === -1) ? '' : Math.abs(this.charge).toString()) + (this.charge < 0 ? "-" : "+"), pos: 1, colEquiv: brackets ? undefined : Array.from(this.elements.keys())[0] });

    items.forEach(({ text, pos, colEquiv }) => {
      ctx.font = pos === 0 ? re.font.toString() : re.smallFont.toString();
      let { width, height } = getTextMetrics(ctx, text);
      ctx.fillStyle = re.atomColors[colEquiv ?? text] ?? re.defaultAtomColor;
      ctx.fillText(text, x, y - (pos * height * 0.4));
      x += width;
    });
    return { x, y } as IVec;
  }
}