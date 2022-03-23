import type { Molecule } from "../classes/Molecule";
import { IGroupStrMap } from "./Group";

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
  start: number;
  end: number;
  reagents: string;
  conditions: string;
}