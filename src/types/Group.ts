import type { Group } from "../classes/Group";
import type { BondType, IBond } from "./Bonds";
import { IRec, IVec } from "./utils";

export type halogen = "F" | "Cl" | "Br" | "I";

export interface IGroupInformation {
  elements?: Map<string, number>;
  charge?: number;
  atomicMass?: number;
  isRadical?: boolean;
  ringDigits?: number[];
  bonds?: IBond[];
  chainDepth?: number;
}

export const createGroupInfoObject = (): IGroupInformation => ({ elements: new Map(), charge: 0, ringDigits: [], bonds: [], chainDepth: 0 });

export interface IGroupMap {
  [id: number]: Group;
}

export interface IGroupStrMap {
  _ringID?: number;
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

/** Return interface for Molecule.getPositionData */
export interface IPositionData {
  groups: { [gid: number]: IRec }; // Bounding box for each group
  rings: Map<number, { minX: number, maxX: number, minY: number, maxY: number }>;
  angles: Map<number, [number, number, boolean]>; // Map each group ID to possible angle range, and if it is exclusive
  dim: IVec; // Dimensions
}