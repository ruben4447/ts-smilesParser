export type BondType = "-" | "=" | "#";

export interface IBond {
  bond: BondType;
  dest: number; // ID of destination Group
}