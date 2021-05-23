import { BondType } from "./Bonds";

export interface IAtomCount {
  atom: string;
  charge: number;
  count: number;
}

export interface IParseOptions {
  cumulativeCharge?: boolean; // Allow O{-}{-} ?
  checkBondCount?: boolean;
  addImplicitHydrogens?: boolean; // Add implicit Hydrogens e.g. "C" -> "C([H])([H])([H])([H])"
}

export const createParseOptionsObject = (): IParseOptions => ({
  cumulativeCharge: true,
  checkBondCount: true,
  addImplicitHydrogens: true,
});

export interface IElementToIonMap {
  [element: string]: IAtomCount[];
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