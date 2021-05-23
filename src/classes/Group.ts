import { organicSubset } from "../data-vars";
import { BondType, IBond } from "../types/Bonds";
import { IGroupInformation } from "../types/Group";
import { chargeToString, getBondNumber } from "../utils";

var ID = 0; // Next ID
export const resetGroupID = () => ID = 0;

export class Group {
  public readonly ID = ID++;
  public elements: string[];
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
    this.elements = data.elements || [];
    this.charge = data.charge === undefined ? 0 : data.charge;
    this.ringDigits = data.ringDigits || [];
    this.bonds = data.bonds || [];
    this.chainDepth = data.chainDepth === undefined ? 0 : data.chainDepth;
  }

  /** Is in organic subset */
  public inOrganicSubset() { return this.elements.length === 1 && organicSubset[this.elements[0]] !== undefined; }

  /** Get bonds we make with said group. Return BondType or null. */
  public getBondWith(group: Group): BondType | null {
    for (const bond of this.bonds) {
      if (bond.dest === group.ID) return bond.bond;
    }
    return null;
  }

  /** Attempt to create bonds with said group. Return: successfull? */
  public addBond(type: BondType, group: Group): boolean {
    if (this === group) return false;
    if (this.getBondWith(group)) {
      return false;
    } else {
      this.bonds.push({ bond: type, dest: group.ID });
      return true;
    }
  }

  /** Set position in SMILES string information */
  setSMILESposInfo(pos: number, length: number): this {
    this.smilesStringPosition = pos;
    this.smilesStringLength = length;
    return this;
  }

  /** Get bond count - how mnay SINGLE bond equivalents we have (e.g. '=' would be +2) */
  public getBondCount(): number {
    let count = 0;
    for (let bond of this.bonds) {
      let n = getBondNumber(bond.bond);
      count += n;
    }
    return count;
  }

  /** String representation of whole atom */
  public toString() {
    let string = '';
    if (this.charge === 0) {
      string += this.inOrganicSubset() ? this.elements[0] : `[${this.elements.join('')}]`;
    } else {
      const charge = chargeToString(this.charge);
      string += this.inOrganicSubset() ? `[${this.elements[0]}${charge}]` : `[${this.elements.join('')}${charge}]`;
    }
    return string;
  }

  /** More in-depth string representation */
  public toStringAdv() {
    let string = "#" + this.ID + ":"
    string += this.toString();
    string += " ^" + this.chainDepth;
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