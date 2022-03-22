import { masses, organicSubset, symbols } from "../data-vars";
import { BondType, IBond } from "../types/Bonds";
import { IAtomCount } from "../types/SMILES";
import { IGroupInformation } from "../types/Group";
import { chargeToString, getBondNumber, numstr } from "../utils";

var ID = 0; // Next ID
export const resetGroupID = () => ID = 0;

export class Group {
  public readonly ID = ID++;
  public elements: Map<string, number>;
  public charge: number;
  public bonds: IBond[];
  public ringDigits: number[] = []; // Are we defined with any ring digits?
  public memberRings: number[]; // Array if IDs of rings we are members of
  public smilesStringPosition: number = 0; // Position declared in SMILES string
  public smilesStringLength: number = 1; // Length of definition in SMILES string
  public readonly chainDepth: number;
  public isImplicit: boolean = false; // Mainly for Hydrogens

  public constructor(data?: IGroupInformation) {
    if (data === undefined) data = {};
    this.elements = data.elements || new Map();
    this.charge = data.charge === undefined ? 0 : data.charge;
    this.ringDigits = data.ringDigits || [];
    this.bonds = data.bonds || [];
    this.chainDepth = data.chainDepth === undefined ? 0 : data.chainDepth;
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
  public addBond(type: BondType, group: Group, smilesPosition?: number): boolean {
    if (this === group) return false;
    if (this.getBondWith(group)) {
      return false;
    } else {
      this.bonds.push({ bond: type, dest: group.ID, smilesPosition });
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

  /** Get element string { "A" => 1, "B" => 2 } goes to "AB2" */
  public getElementString(html = false) {
    return Array.from(this.elements).map(([element, count]) => count === 1 ? element : element + (html ? `<sub>${numstr(count)}</sub>` : count.toString())).join("");
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
    return Array.from(this.elements).reduce((Mr, [atom, count]) => Mr + (masses[symbols.indexOf(atom)] ?? 0) * count, 0);
  }

  /** Count atoms in group */
  public countAtoms(ignoreCharge = false): IAtomCount[] {
    if (this.charge !== 0 && !ignoreCharge) {
      let str = this.getElementString(), chargeStr = str + '{' + this.charge + '}';
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

  /** String representation of whole atom */
  public toString() {
    let string = '';
    if (this.charge === 0) {
      string += this.inOrganicSubset() ? Array.from(this.elements.keys())[0] : `[${this.getElementString()}]`;
    } else {
      const charge = chargeToString(this.charge);
      string += this.inOrganicSubset() ? `[${Array.from(this.elements.keys())[0]}${charge}]` : `[${this.getElementString()}${charge}]`;
    }
    return string;
  }

  /** To fancy string e.g. "[NH4+]" -> (NH<sub>4</sub>)<sup>+</sup> */
  public toStringFancy(): string {
    let string = this.getElementString(true);
    if (this.elements.size > 1) string = "(" + string + ")";
    if (this.charge !== 0) {
      const charge = chargeToString(this.charge);
      string += "<sup>" + charge + "</sup>";
    }
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
}