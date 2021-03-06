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
  enableRadicals: boolean;
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
  enableRadicals: true,
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
  smallBondLengthFrac: number; // Fraction of bondLength that small bonds should be
  bondWidth: number;
  atomOverlapPadding: number;
  textPadding: number; // Padding between letters in text
  renderImplicit: boolean; // Render implicit molecules?
  collapseH: boolean;
  skeletal: boolean; // If true, do not render carbons
  skeletalAngle: number;
  bondGap: number; // Gap between double and triple bonds
  font: Font;
  smallFont: Font;
  aromaticRingGap: number; // Gap from outside of aromatic ring to aromatic bond (px)
  ringRestrictAngleSmall: boolean; // Bigger or smaller restrict space
  boxMolecules: boolean; // Render molecules in boxes
  moleculePadding: number;
  reagentBracketWidth: number; // Width of brackets surrounding reagents. -1 to disable brackets.
  reactionSplitLine: boolean; // Split reactions along multiple lines?
  radicalRadius: number;

  debugFont: Font;
  debugGroups?: boolean;
  debugRings?: boolean;
  debugShowAngles?: boolean;
  debugAngleLines?: number;
}

export const createRenderOptsObject = (): IRenderOptions => ({
  // bg: "#FFFFFF",
  bg: "#E4E4E4",
  defaultAtomColor: "#222222",
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
  bondLength: 45,
  smallBondLengthFrac: 0.85,
  bondWidth: 1,
  atomOverlapPadding: 4,
  textPadding: 1,
  renderImplicit: true,
  collapseH: true,
  skeletal: false,
  skeletalAngle: Math.PI / 7,
  bondGap: 5,
  aromaticRingGap: 10,
  ringRestrictAngleSmall: false,
  font: new Font().set("family", "Arial").set("size", 15),
  smallFont: new Font().set("family", "Arial").set("size", 10),
  debugFont: new Font().set("family", "monospace").set("size", 10),
  boxMolecules: true,
  moleculePadding: 10,
  reagentBracketWidth: 5,
  reactionSplitLine: true,
  radicalRadius: 2,
});

export const defaultRenderOptsObject = createRenderOptsObject();