import { organicSubset } from "../data-vars";
import { BondType, IBond } from "../types/Bonds";
import { IGroupInformation } from "../types/Group";
import { chargeToString } from "../utils";

var ID = 0;
export class Group {
  public readonly ID = ID++;
  public elements: string[];
  public charge: number;
  public bonds: IBond[];
  public ringDigits: number[] = []; // Are we defined with any ring digits?
  public memberRings: number[]; // Array if IDs of rings we are members of

  public constructor(data?: IGroupInformation) {
    if (data === undefined) data = {};
    this.elements = data.elements || [];
    this.charge = data.charge === undefined ? 0 : data.charge;
    this.ringDigits = data.ringDigits || [];
    this.bonds = data.bonds || [];
  }

  /** Is in organic subset */
  public inOrganicSubset() { return this.elements.length === 1 && organicSubset[this.elements[0]] !== undefined; }

  /** Get bonds we make with said group. Return BondType or null. */
  public getBondWith(group: Group): BondType | null {
    for (const bond of this.bonds) {
      if (bond.dest === group) return bond.bond;
    }
    return null;
  }

  /** Attempt to create bonds with said group. Return: successfull? */
  public addBond(type: BondType, group: Group): boolean {
    if (this === group) return false;
    if (this.getBondWith(group)) {
      return false;
    } else {
      this.bonds.push({ bond: type, dest: group });
      return true;
    }
  }

  /** String representation of whole atom */
  public toString() {
    let string = "#" + this.ID + ":"
    string += this.inOrganicSubset() ? this.elements[0] : "[" + this.elements.join('') + "]";
    if (this.charge !== 0) string += "{" + chargeToString(this.charge) + "}";
    if (this.bonds.length > 0) {
      const lim = this.bonds.length;
      for (let i = 0; i < lim; i++) {
        const bond = this.bonds[i];
        string += ` ${bond.bond}<${bond.dest.ID}>`;
      }
    }
    return string;
  }
}