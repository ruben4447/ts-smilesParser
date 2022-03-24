import type Ring from "../classes/Rings";
import { BondType } from "./Bonds";

export interface IAtom {
  atom: string;
  charge: number;
}

export interface IAtomCount extends IAtom {
  count: number;
}

export interface IParseOptions {
  enableChargeClauses: boolean // {...}
  enableInorganicAtoms: boolean; // [...]
  enableChains: boolean; // (...)
  enableRings: boolean;
  enableSeperatedStructures: boolean;
  cumulativeCharge?: boolean; // Allow O{-}{-} ?
  checkBondCount?: boolean;
  addImplicitHydrogens?: boolean; // Add implicit Hydrogens e.g. "C" -> "C([H])([H])([H])([H])"
}

export const createParseOptionsObject = (): IParseOptions => ({
  enableChargeClauses: true,
  enableInorganicAtoms: true,
  enableChains: true,
  enableRings: false,
  enableSeperatedStructures: true,
  cumulativeCharge: true,
  checkBondCount: true,
  addImplicitHydrogens: true,
});

export interface IElementToIonMap {
  [element: string]: IAtomCount[];
}

export interface IRingMap {
  [digit: number]: Ring;
}

export interface IGenerateSmilesStackItem {
  group: number; // Current group -> ID for this._groups
  handled: boolean;
  parent: number; // What were we last bonded to? ID for stack
  bond: BondType; // How were we bonded?
  smiles: string; // Smiles of group
  smilesChildren: string[]; // SMILES of processed children
}

export const createGenerateSmilesStackItemObject = (group: number, parent: number = undefined, bond: BondType = undefined): IGenerateSmilesStackItem => ({
  group,
  handled: false,
  parent,
  bond,
  smiles: '',
  smilesChildren: [],
});


/** Option interface for .countAtoms */
export interface ICountAtoms {
  splitGroups?: boolean;
  hillSystemOrder?: boolean;
  ignoreCharge?: boolean;
}