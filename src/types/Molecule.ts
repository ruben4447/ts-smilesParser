import { Font } from "../classes/Font";

export interface IRenderMolecule {
  bg: string;
  defaultAtomColor: string;
  atomColors: { [el: string]: string };
  bondLength: number;
  textPadding: number; // Padding between letters in text
  renderImplicit: boolean; // Render implicit molecules?
  collapseH: boolean;
  bondGap: number; // Gap between double and triple bonds
  font: Font;
  smallFont: Font;
}

export const createRenderMoleculeObject = (): IRenderMolecule => ({
  bg: "#FFFFFF",
  defaultAtomColor: "#000000",
  atomColors: {
    B: "#E67E22",
    N: "#3498DB",
    O: "#E74C3C",
    P: "#D35400",
    S: "#F1C40F",
    F: "#27AE60",
    Cl: "#16A085",
    I: "#934DB0",
    Br: "#D35400"
  },
  bondLength: 50,
  textPadding: 1,
  renderImplicit: true,
  collapseH: true,
  bondGap: 5,
  font: new Font().set("family", "Arial").set("size", 16),
  smallFont: new Font().set("family", "Arial").set("size", 10)
});

export const defaultRenderMoleculeObject = createRenderMoleculeObject();