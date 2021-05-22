import type { Group } from "../classes/Group";

export type BondType = "-" | "=" | "#";

export interface IBond {
  bond: BondType;
  dest: Group;
}