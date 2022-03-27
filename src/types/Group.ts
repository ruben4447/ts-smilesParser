import type { Group } from "../classes/Group";
import type { BondType, IBond } from "./Bonds";

export type halogen = "F" | "Cl" | "Br" | "I";

export interface IGroupInformation {
  elements?: Map<string, number>;
  charge?: number;
  atomicMass?: number;
  ringDigits?: number[];
  bonds?: IBond[];
  chainDepth?: number;
}

export const createGroupInfoObject = (): IGroupInformation => ({ elements: new Map(), charge: 0, ringDigits: [], bonds: [], chainDepth: 0 });

export interface IGroupMap {
  [id: number]: Group;
}

export interface IGroupStrMap {
  [id: string]: Group;
}

export interface IMatchAtom {
  atom?: string | string[];
  notAtom?: string | string[];
  charge?: number;
  bond?: BondType;
  bondedTo?: IMatchAtom[];
  rec?: string | number; // Record as this ID ... in recorded dict
}