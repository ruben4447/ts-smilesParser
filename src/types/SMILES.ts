import type { Ring } from "../classes/Rings";
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
  enableAromaticity: boolean;
  enableSeperatedStructures: boolean;
  enableReaction: boolean;
  enableMultipleReactions: boolean; // Allow chained reactions e.g. ... > ... > ... > ... > ...
  cumulativeCharge?: boolean; // Allow O{-}{-} ?
  checkBondCount?: boolean;
  addImplicitHydrogens?: boolean; // Add implicit Hydrogens e.g. "C" -> "C([H])([H])([H])([H])"
  showImplcitAtomicMass?: boolean; // Show implicit atomic mass on groups?
}

export const createParseOptionsObject = (): IParseOptions => ({
  enableChargeClauses: true,
  enableInorganicAtoms: true,
  enableChains: true,
  enableRings: true,
  enableAromaticity: true,
  enableSeperatedStructures: true,
  enableReaction: true,
  enableMultipleReactions: true,
  cumulativeCharge: true,
  checkBondCount: true,
  addImplicitHydrogens: true,
  showImplcitAtomicMass: false,
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

import { Font } from "../classes/Font";

export interface IRenderOptions {
  bg: string;
  defaultAtomColor: string;
  atomColors: { [el: string]: string };
  bondLength: number;
  bondWidth: number;
  textPadding: number; // Padding between letters in text
  renderImplicit: boolean; // Render implicit molecules?
  collapseH: boolean;
  bondGap: number; // Gap between double and triple bonds
  font: Font;
  smallFont: Font;
  aromaticRingDist: number;
  ringRestrictAngleSmall: boolean; // Bigger or smaller restrict space
  boxMolecules: boolean; // Render molecules in boxes
  moleculePadding: number;
  reagentBracketWidth: number; // Width of brackets surrounding reagents. -1 to disable brackets.

  debugShowGroupIDs?: boolean;
  debugShowRingIDs?: boolean;
}

export const createRenderOptsObject = (): IRenderOptions => ({
  // bg: "#FFFFFF",
  bg: "#E0E0E0",
  defaultAtomColor: "#000000",
  atomColors: {
    B: "#E67E22",
    C: "#000000",
    N: "#3498DB",
    O: "#E74C3C",
    P: "#D35400",
    S: "#F1C40F",
    F: "#27AE60",
    Cl: "#16A085",
    I: "#934DB0",
    Br: "#D35400"
  },
  bondLength: 25,
  bondWidth: 1,
  textPadding: 1,
  renderImplicit: true,
  collapseH: true,
  bondGap: 5,
  aromaticRingDist: 0.71,
  ringRestrictAngleSmall: true,
  font: new Font().set("family", "Arial").set("size", 15),
  smallFont: new Font().set("family", "Arial").set("size", 10),
  boxMolecules: true,
  moleculePadding: 10,
  reagentBracketWidth: 5,
});

export const defaultRenderOptsObject = createRenderOptsObject();