import type { Molecule } from "../classes/Molecule";
import { halogen, IGroupStrMap } from "./Group";
import { IParseOptions } from "./SMILES";

export interface IExtractBetweenInformation {
  input: string;
  startIndex: number;
  endIndex: number;
  extracted: string;
  remaining: string;
  openCount: number; // How many 'open's are there still (if !== 0, means ubclosed bracket)
}

export interface IParseInorganicString {
  elements: Map<string, number>;
  charge: number;
  atomicMass?: number;
  isRadical?: boolean;
  endIndex: number;
  error?: string; // Error message if any
}

export interface IParseDigitString {
  digits: number[];
  endIndex: number;
}

export interface IMoleculeType {
  repr: string;
  name: string;
  eg: { smiles: string, name: string }; // Smiles example
  variantOf?: number;
  // TODO: implement below feature:
  removeIfPresent?: number[]; // Groups to remove if this is present (from same carbon, rec id 1)
  test?: (molecule: Molecule) => IGroupStrMap[];
  // react?: (molecule: Molecule, groups: IGroupStrMap[]) => void;
}

export interface IReactionInfo {
  name?: string; // Reaction name e.g. "Halogenation"
  type?: string; // Reaction mechanism e.g. "nucleophilic addition"
  start: number; // ID of starting molecule type
  end: number; // ID of ending molecule type
  reagents?: string; // Reagents of reaction
  conditions?: string; // Condition of reaction
  react?: (mol: Molecule, fgroup: IGroupStrMap, opts: IReactionOpts, reactant?: Molecule) => { ok: boolean; data?: string, cont?: boolean }; // Carry out reaction
  reactOnce?: boolean; // Call .react only once? (default = false)
  provideReactant?: {
    prompt: string; // Prompt to show user
    default: string; // Default prompt input
    smilesOpts?: { [param: string]: boolean } // Overwrite SMILES.parseOptions
  }; // Ask user for reactant molecule?
}

export interface IReactionOpts {
  addH?: boolean;
  primarySide?: boolean;
}

export interface IVec {
  x: number;
  y: number;
}

export interface IRec extends IVec {
  w: number;
  h: number;
}