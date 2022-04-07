import { Group } from "./classes/Group";
import { Molecule } from "./classes/Molecule";
import Ring from "./classes/Rings";
import { BondType } from "./types/Bonds";
import { IGroupStrMap } from "./types/Group";
import { IMoleculeType, IReactionInfo } from "./types/utils";

export const moleculeTypes: { [id: number]: IMoleculeType } = {
  1: {
    repr: "alkane",
    name: "Alkane",
    eg: { smiles: "CC", name: "ethane" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "H", rec: 2 }] }),
  },
  2: {
    repr: "alkene",
    name: "Alkene",
    eg: { smiles: "C=C", name: "ethene" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "H" }, { atom: "C", bond: "=", rec: 2 }] }),
    removeIfPresent: [1],
  },
  3: {
    repr: "alcohol",
    name: "Alcohol",
    eg: { smiles: "CO", name: "methanol" },
  },
  4: {
    repr: "1-alcohol",
    name: "Primary Alcohol",
    eg: { smiles: "CO", name: "methanol" },
    variantOf: 3,
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", rec: 2, bondedTo: [{ atom: "H", rec: 3 }] }, { notAtom: "C" }, { notAtom: "C" }, { atom: ["C", "H"] }] }),
  },
  5: {
    repr: "2-alcohol",
    name: "Secondary Alcohol",
    eg: { smiles: "CC(O)C", name: "propan-2-ol" },
    variantOf: 3,
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", rec: 2, bondedTo: [{ atom: "H", rec: 3 }] }, { atom: "C" }, { atom: "C" }, { notAtom: "C" }] }),
  },
  6: {
    repr: "3-alcohol",
    name: "Tertiary Alcohol",
    eg: { smiles: "CC(O)(C)C", name: "2-methylpropan-2-ol" },
    variantOf: 3,
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", rec: 2, bondedTo: [{ atom: "H", rec: 3 }] }, { atom: "C" }, { atom: "C" }, { atom: "C" }] }),
  },
  7: {
    repr: "nitrile",
    name: "Nitrile",
    eg: { smiles: "CC#N", name: "ethanenitrile" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "N", bond: "#", rec: 2 }] }),
  },
  8: {
    repr: "amine",
    name: "Amine",
    eg: { smiles: "CN", name: "methylamine" },
    // test: mol => mol.matchMolecule({ atom: "N", rec: 1, bondedTo: [{ atom: "C", rec: 2 }, { atom: "H" }, { atom: "H" }] }),
  },
  9: {
    repr: "1-amine",
    name: "Primary Amine",
    variantOf: 9,
    eg: { smiles: "CN", name: "methylamine" },
    test: mol => mol.matchMolecule({ atom: "N", rec: 1, bondedTo: [{ atom: "C", rec: 2 }, { atom: "H", rec: 3 }, { atom: "H", rec: 4 }] }),
  },
  10: {
    repr: "2-amine",
    name: "Secondary Amine",
    variantOf: 9,
    eg: { smiles: "CNC", name: "dimethylanamine" },
    test: mol => mol.matchMolecule({ atom: "N", rec: 1, bondedTo: [{ atom: "C", rec: 2 }, { atom: "C" }, { atom: "H" }] }),
  },
  11: {
    repr: "3-amine",
    name: "Tertiary Amine",
    variantOf: 9,
    eg: { smiles: "CN(C)C", name: "trimethylamine" },
    test: mol => mol.matchMolecule({ atom: "N", rec: 1, bondedTo: [{ atom: "C", rec: 2 }, { atom: "C" }, { atom: "C" }] }),
  },
  12: {
    repr: "ketone",
    name: "Ketone",
    eg: { smiles: "CC(=O)C", name: "propan-2-one" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "C" }, { atom: "C" }] }),
  },
  13: {
    repr: "aldehyde",
    name: "Aldehyde",
    eg: { smiles: "C=O", name: "methanal" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "H", rec: 3 }] }),
  },
  14: {
    repr: "carboxylic-acid",
    name: "Carboxylic Acid",
    eg: { smiles: "C(=O)O", name: "methanoic acid" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "O", rec: 3, bondedTo: [{ atom: "H", rec: 4 }] }] }),
    removeIfPresent: [12, 13],
  },
  15: {
    repr: "hydroxynitrile",
    name: "Hydroxynitrile",
    eg: { smiles: "CC(C)(C#N)O", name: "2-hydroxy-2-methylpropanenitrile" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "C", rec: 2, bondedTo: [{ atom: "N", bond: "#", rec: 4 }] }, { atom: "O", rec: 3, bondedTo: [{ atom: "H" }] }, { atom: ["C", "H"] }, { atom: ["C", "H"] }] }),
    removeIfPresent: [3, 7],
  },
  16: {
    repr: "ester",
    name: "Ester",
    eg: { smiles: "C(=O)OC", name: "methyl methanoate" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "O", rec: 4, bondedTo: [{ atom: "C", rec: 3 }] }] }),
    removeIfPresent: [13, 25],
  },
  17: {
    repr: "carboxylate",
    name: "Carboxylate",
    eg: { smiles: "C(=O)[O-]", name: "methanoate" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "O", rec: 3, charge: -1 }] }),
    removeIfPresent: [13],
  },
  18: {
    repr: "acyl-chloride",
    name: "Acyl Chloride",
    eg: { smiles: "C(=O)Cl", name: "methanoyl chloride" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "Cl", rec: 3 }] }),
    removeIfPresent: [13],
  },
  19: {
    repr: "amide",
    name: "Amide",
    eg: { smiles: "C(=O)N", name: "methanamide" },
    removeIfPresent: [13]
  },
  20: {
    repr: "1-amide",
    name: "Primary Amide",
    eg: { smiles: "C(=O)N", name: "methanamide" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "N", rec: 3, bondedTo: [{ atom: "H" }, { atom: "H" }] }] }),
    removeIfPresent: [13, 8]
  },
  21: {
    repr: "2-amide",
    name: "Secondary Amide",
    eg: { smiles: "C(=O)NC", name: "N-methylmethanamide" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "N", rec: 3, bondedTo: [{ atom: "C" }, { atom: "H" }] }] }),
    removeIfPresent: [13, 8]
  },
  22: {
    repr: "3-amide",
    name: "Tertiary Amide",
    eg: { smiles: "C(=O)N(C)C", name: "N,N-dimethylmethanamide" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "N", rec: 3, bondedTo: [{ atom: "C" }, { atom: "C" }] }] }),
    removeIfPresent: [13, 8]
  },
  23: {
    repr: "haloalkane",
    name: "Haloalkane",
    eg: { smiles: "CBr", name: "bromomethane" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: ["F", "Cl", "Br", "I"], rec: 2 }] }),
    removeIfPresent: [1],
  },
  24: {
    repr: "acid-anhydride",
    name: "Acid Anhydride",
    eg: { smiles: "CC(=O)OC(=O)C", name: "ethanoic anhydride" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "O", rec: 3, bondedTo: [{ atom: "C", rec: 4, bondedTo: [{ atom: "O", bond: "=", rec: 5 }] }] }] }),
    removeIfPresent: [13, 8, 16]
  },
  25: {
    repr: "ether",
    name: "Ether",
    eg: { smiles: "COC", name: "dimethyl ether/methoxymethane" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", rec: 2, bondedTo: [{ atom: "C", rec: 3 }] }] }),
    removeIfPresent: [13, 8]
  },
  26: {
    repr: "alkoxide",
    name: "Alkoxide",
    eg: { smiles: "C[O-]", name: "methoxide" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", rec: 2, charge: -1 }] }),
    removeIfPresent: [17]
  },
  27: {
    repr: "benzene",
    name: "Aromatic",
    eg: { smiles: "c1ccccc1", name: "benzene" },
    test: mol => mol.rings.map(ring => ring.isAromatic ? ring.members.reduce((p, c, i) => (p[i] = mol.groups[c]) && p, {} as IGroupStrMap) : null).filter(x => x !== null),
  },
  28: {
    repr: "benzene",
    name: "Benzene",
    eg: { smiles: "c1ccccc1", name: "benzene" },
    test: mol => mol.matchBenzene({ atom: "H", rec: 6 })
  },
  29: {
    repr: "halo-benzene",
    name: "Halobenzene",
    eg: { smiles: "c1cccc(Br)c1", name: "bromobenzene" },
    test: mol => mol.matchBenzene({ atom: ["F", "Cl", "Br", "I"], rec: 6 })    
  },
  30: {
    repr: "nitro-benzene",
    name: "Nitrobenzene",
    eg: { smiles: "c1cccc([N+](=O)[O-])c1", name: "nitrobenzene" },
    test: mol => mol.matchBenzene({ atom: ["N"], charge: 1, rec: 6, bondedTo: [{ atom: ["O"], bond: "=", rec: 7 }, { atom: ["O"], bond: "-", charge: -1, rec: 8 }] })    
  },
  31: {
    repr: "alkyl-benzene",
    name: "Alkylbenzene",
    eg: { smiles: "c1(C)ccccc1", name: "methylbenzene" },
    test: mol => mol.matchBenzene({ atom: ["C"], rec: 6 })    
  },
  32: {
    repr: "amino-benzene",
    name: "Aminobenzene",
    eg: { smiles: "c1(N)ccccc1", name: "aminobenzene" },
    test: mol => mol.matchBenzene({ atom: ["N"], rec: 6, bondedTo: [{ atom: "H" }, { atom: "H" }] })    
  },
  33: {
    repr: "hydroperoxide",
    name: "Hydroperoxide",
    eg: { smiles: "COO", name: "methylhydroperoxide" },
    test: mol => mol.matchMolecule({ atom: ["C"], rec: 1, bondedTo: [{ atom: "O", rec: 2, bondedTo: [{ atom: "O", rec: 3, bondedTo: [{ atom: "H", rec: 4 }] }] }] })    
  },
  34: {
    repr: "peroxide",
    name: "Peroxide",
    eg: { smiles: "COOC", name: "dimethylperoxide" },
    test: mol => mol.matchMolecule({ atom: ["C"], rec: 1, bondedTo: [{ atom: "O", rec: 2, bondedTo: [{ atom: "O", rec: 3, bondedTo: [{ atom: "C", rec: 4 }] }] }] })    
  },
  40: {
    repr: "phenol",
    name: "Phenol",
    eg: { smiles: "c1(O)ccccc1", name: "phenol" },
    test: mol => mol.matchBenzene({ atom: ["O"], rec: 6, bondedTo: [{ atom: "H", rec: 7 }] })    
  },
};

export const reactions: IReactionInfo[] = [
  {
    name: "Hydrogenation",
    start: 2,
    end: 1,
    reagents: "H2/Ni",
    conditions: "150C",
    react: (mol, group, opts) => {
      // Only replace ONE C=C with C-C
      const bond = mol.getBond(group[1].ID, group[2].ID);
      bond.bond = "-";
      // Add hydrogen to both carbons
      [group[1], group[2]].forEach(group => {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group.addBond('-', H);
      });
      return { ok: true };
    }
  },
  {
    name: "Halogenation",
    type: "electrophilic addition",
    start: 2,
    end: 23,
    reagents: "HX",
    provideReactant: { prompt: "Enter halogen X: ", default: "Br", smilesOpts: { addImplicitHydrogens: false, checkBondCount: false } },
    react: (mol, group, opts, reactant) => {
      let X: Group;
      if (Object.values(reactant.groups).length === 1) {
        X = Object.values(reactant.groups)[0];
        if (!X.isElement("F", "Cl", "Br", "I") || X.charge !== 0) return { ok: false, data: `Expected halogen X, got ${X.toStringFancy(false)}`};
      } else {
        return { ok: false, data: `Expected halogen X, got ${reactant.generateSMILES()}` };
      }

      // Find C=C
      const bond = mol.getBond(group[1].ID, group[2].ID);
      bond.bond = "-"; // Break C=C
      // Add halogen
      mol.groups[X.ID] = X;
      group[1].addBond('-', X);
      // Add hydrogen
      let H = new Group();
      H.addElement("H");
      H.isImplicit = !opts.addH;
      mol.groups[H.ID] = H;
      group[2].addBond('-', H);

      return { ok: true };
    }
  },
  {
    name: "Halogenation",
    type: "electrophilic addition",
    start: 2,
    end: 23,
    reagents: "X2",
    provideReactant: { prompt: "Enter halogen X: ", default: "Br", smilesOpts: { addImplicitHydrogens: false, checkBondCount: false } },
    react: (mol, group, opts, reactant) => {
      let Xstr: string;
      if (Object.values(reactant.groups).length === 1) {
        let X = Object.values(reactant.groups)[0];
        if (X.isElement("F", "Cl", "Br", "I") && X.charge === 0) Xstr = X.getElementString(false, false);
        else return { ok: false, data: `Expected halogen X, got ${X.toStringFancy(false)}` };
      } else {
        return { ok: false, data: `Expected halogen X, got ${reactant.generateSMILES()}` };
      }

      // Find C=C
      const bond = mol.getBond(group[1].ID, group[2].ID);
      bond.bond = "-"; // Break C=C
      // Add halogens
      [group[1], group[2]].forEach(group => {
        let X = new Group();
        X.addElement(Xstr);
        mol.groups[X.ID] = X;
        group.addBond('-', X);
      });

      return { ok: true };
    }
  },
  {
    name: "Halogenation",
    start: 1,
    end: 23,
    reagents: "X2",
    conditions: "UV",
    reactOnce: true,
    provideReactant: { prompt: "Enter halogen X: ", default: "Br", smilesOpts: { addImplicitHydrogens: false, checkBondCount: false } },
    react: (mol, group, opts, reactant) => {
      let Xstr: string;
      if (Object.values(reactant.groups).length === 1) {
        let X = Object.values(reactant.groups)[0];
        if (X.isElement("F", "Cl", "Br", "I") && X.charge === 0) Xstr = X.getElementString(false, false);
        else return { ok: false, data: `Expected halogen X, got ${X.toStringFancy(false)}` };
      } else {
        return { ok: false, data: `Expected halogen X, got ${reactant.generateSMILES()}` };
      }

      // Replace hydrogen
      group[2].elements.clear();
      group[2].addElement(Xstr);
      group[2].isImplicit = false;

      return { ok: true };
    }
  },
  {
    type: "nucleophilic substitution",
    start: 23,
    end: 7,
    reagents: "CN{-}/ethanol",
    conditions: "reflux",
    react: (mol, group) => {
      // Replace X with C
      group[2].elements.clear();
      group[2].addElement("C");
      // Create N
      const N = new Group();
      N.addElement("N");
      mol.groups[N.ID] = N;
      // Bond C and N via #
      group[2].addBond("#", N);

      return { ok: true };
    }
  },
  {
    name: "Hydroxylation",
    type: "nucleophilic substitution",
    start: 23,
    end: 3,
    reagents: "NaOH",
    react: (mol, group, opts) => {
      // Replace X with O
      group[2].elements.clear();
      group[2].addElement("O");
      // Create H
      const H = new Group(["H"]);
      H.isImplicit = !opts.addH;
      mol.groups[H.ID] = H;
      // Bond O-H
      group[2].addBond("-", H);

      return { ok: true };
    }
  },
  {
    type: "nucleophilic substitution",
    start: 23,
    end: 8,
    reagents: "conc NH3/ethanol",
    conditions: "heat",
    react: (mol, group, opts) => {
      // Replace X with N
      group[2].elements.clear();
      group[2].addElement("N");
      // Add 2 hydrogens
      for (let i = 0; i < 2; i++) {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group[2].addBond('-', H);
      }

      return { ok: true };
    }
  },
  {
    name: "Reduction",
    start: 7,
    end: 8,
    reagents: "H2/Ni",
    conditions: "heat/pressure",
    react: (mol, group, opts) => {
      // Remove replace #N with -N
      let bond = mol.getBond(group[1].ID, group[2].ID);
      bond.bond = "-";
      // Add two hydrogens to both C and N
      [group[1], group[2]].forEach(group => {
        // Add 2 hydrogens
        for (let i = 0; i < 2; i++) {
          let H = new Group();
          H.addElement("H");
          H.isImplicit = !opts.addH;
          mol.groups[H.ID] = H;
          group.addBond('-', H);
        }
      });

      return { ok: true };
    }
  },
  {
    name: "Hydration",
    start: 2,
    end: 3,
    reagents: "H2O(g)/H3PO4",
    conditions: "heat/pressure",
    react: (mol, group, opts) => {
      // Break C=C
      let bond = mol.getBond(group[1].ID, group[2].ID);
      bond.bond = "-";
      // Add oxygen
      let O = new Group();
      O.addElement("O");
      mol.groups[O.ID] = O;
      group[1].addBond("-", O);
      // Add hydrogens
      [O, group[2]].forEach(group => {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group.addBond('-', H);
      });

      return { ok: true };
    }
  },
  {
    name: "Dehydration",
    start: 3,
    end: 2,
    reagents: "conc H3PO4",
    react: (mol, group) => {
      // There must be two carbons
      let otherC: Group;
      for (const bond of mol.getAllBonds(group[1].ID)) {
        if (bond.bond === "-" && mol.groups[bond.dest].isElement("C")) {
          otherC = mol.groups[bond.dest];
          break;
        }
      }
      if (!otherC) return { ok: false, data: "Must be 2-carbon: R-CCOH" };
      // Find -H from otherC
      let bond = mol.getAllBonds(otherC.ID).find(bond => bond.bond === "-" && mol.groups[bond.dest].isElement("H"));
      if (bond === undefined) return { ok: false, data: "Carbon bonded to -COH must be bonded to a Hydrogen" };
      // Remove -H
      mol.severBond(otherC.ID, bond.dest);
      // Remove -OH
      delete mol.groups[group[3].ID]; // Remove H
      delete mol.groups[group[2].ID]; // Remove O
      mol.severBond(group[1].ID, group[2].ID);
      // C-C to C=C
      bond = mol.getBond(group[1].ID, otherC.ID);
      bond.bond = "=";

      return { ok: true };
    }
  },
  {
    name: "Neutralisation",
    start: 3,
    end: 26,
    reagents: "strong OH{-}(aq)",
    react: (mol, group) => {
      // Remove O-H
      mol.severBond(group[2].ID, group[3].ID);
      delete mol.groups[group[3].ID];
      // O -> [O-]
      group[2].charge = -1;

      return { ok: true };
    }
  },
  {
    name: "Halogenation",
    start: 3,
    end: 23,
    reagents: "HX/conc H3PO4",
    provideReactant: { prompt: "Enter halogen X: ", default: "Br", smilesOpts: { addImplicitHydrogens: false, checkBondCount: false } },
    react: (mol, group, opts, reactant) => {
      let X: Group;
      if (Object.values(reactant.groups).length === 1) {
        X = Object.values(reactant.groups)[0];
        if (!X.isElement("F", "Cl", "Br", "I") || X.charge !== 0) return { ok: false, data: `Expected halogen X, got ${X.toStringFancy(false)}` };
      } else {
        return { ok: false, data: `Expected halogen X, got ${reactant.generateSMILES()}` };
      }

      // Remove O-H
      mol.severBond(group[2].ID, group[3].ID);
      delete mol.groups[group[3].ID];
      // Replace C-O with C-X
      group[2].elements.clear();
      group[2].addElement(X.getElementString(false, false));

      return { ok: true };
    }
  },
  {
    name: "Oxidation",
    start: 5,
    end: 12,
    reagents: "K2Cr2O7/H2SO4",
    conditions: "reflux",
    react: (mol, group) => {
      // Find -H from base carbon
      let hydrogen: Group;
      for (const bond of group[1].bonds) {
        if (mol.groups[bond.dest].isElement("H")) {
          hydrogen = mol.groups[bond.dest];
          break;
        }
      }
      if (!hydrogen) return { ok: false, data: "A hydrogen must be bonded to -COH" };
      // Sever O-H bond
      mol.severBond(group[2].ID, group[3].ID);
      // Remove -H from -OH
      delete mol.groups[group[3].ID]; // Delete H
      // Sever C-H bond
      mol.severBond(group[1].ID, hydrogen.ID);
      // Remove -H from C
      delete mol.groups[hydrogen.ID];
      // Double up C-O to C=O
      let bond = mol.getBond(group[1].ID, group[2].ID);
      bond.bond = "=";

      return { ok: true };
    }
  },
  {
    name: "Reduction",
    start: 12,
    end: 5,
    reagents: "NaBH4 or AlLiH4",
    conditions: "ethanol or dry ether",
    react: (mol, group, opts) => {
      // Collapse C=O to C-O
      let bond = mol.getBond(group[1].ID, group[2].ID);
      bond.bond = "-";
      // Add H to C and O
      [group[1], group[2]].forEach(group => {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group.addBond('-', H);
      });

      return { ok: true };
    }
  },
  {
    name: "Oxidation",
    start: 4,
    end: 13,
    reagents: "K2CR2O7/H2SO4",
    conditions: "distill",
    react: (mol, group) => {
      // Find -H from base carbon
      let hydrogen: Group;
      for (const bond of group[1].bonds) {
        if (mol.groups[bond.dest].isElement("H")) {
          hydrogen = mol.groups[bond.dest];
          break;
        }
      }
      if (!hydrogen) return { ok: false, data: "A hydrogen must be bonded to -COH" };
      // Sever O-H bond
      mol.severBond(group[2].ID, group[3].ID);
      // Remove -H from -OH
      delete mol.groups[group[3].ID]; // Delete H
      // Sever C-H bond
      mol.severBond(group[1].ID, hydrogen.ID);
      // Remove -H from C
      delete mol.groups[hydrogen.ID];
      // Double up C-O to C=O
      let bond = mol.getBond(group[1].ID, group[2].ID);
      bond.bond = "=";

      return { ok: true };
    }
  },
  {
    name: "Reduction",
    start: 13,
    end: 4,
    reagents: "NaBH4 or AlLiH4",
    conditions: "ethanol or dry ether",
    react: (mol, group, opts) => {
      // Collapse C=O to C-O
      let bond = mol.getBond(group[1].ID, group[2].ID);
      bond.bond = "-";
      // Add H to C and O
      [group[1], group[2]].forEach(group => {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group.addBond('-', H);
      });

      return { ok: true };
    }
  },
  {
    name: "Oxidation",
    start: 4,
    end: 14,
    reagents: "K2Cr2O7/H2SO4",
    conditions: "reflux",
    react: (mol, group) => {
      // Find 2* -H from base carbon
      let hydrogens: Group[] = [];
      for (const bond of group[1].bonds) {
        if (mol.groups[bond.dest].isElement("H")) {
          hydrogens.push(mol.groups[bond.dest]);
          if (hydrogens.length === 2) break;
        }
      }
      if (hydrogens.length !== 2) return { ok: false, data: "Two hydrogens must be bonded to -COH" };
      // Sever and remove both C-H bonds and H's
      hydrogens.forEach(hydrogen => {
        mol.severBond(group[1].ID, hydrogen.ID);
        delete mol.groups[hydrogen.ID];
      });
      // Create C=O
      let O = new Group();
      O.addElement("O");
      mol.groups[O.ID] = O;
      group[1].addBond("=", O);

      return { ok: true };
    }
  },
  {
    name: "Decarbonylation",
    start: 13,
    end: 1,
    reagents: "RhCl3/diglyme",
    conditions: "200C",
    react: (mol, group, opts) => {
      const carbonBond = mol.getAllBonds(group[1].ID).find(b => mol.groups[b.dest].isElement("C"));
      if (!carbonBond) return { ok: false, data: "Minimum carbon chain of two required" };
      // Sever C-H
      mol.severBond(group[1].ID, group[3].ID);
      // Sever C=O
      mol.severBond(group[1].ID, group[2].ID);
      delete mol.groups[group[2].ID];
      // Sever C-C
      mol.severBond(carbonBond.dest, group[1].ID);
      delete mol.groups[group[1].ID];
      // Bond C-H
      mol.groups[carbonBond.dest].addBond("-", group[3]);
      group[3].isImplicit = !opts.addH;

      return { ok: true };
    }
  },
  {
    name: "Decarbonylation",
    start: 12,
    end: 1,
    reagents: "RhCl3/diglyme",
    conditions: "200C",
    react: (mol, group, opts) => {
      const carbonBonds = mol.getAllBonds(group[1].ID).filter(b => mol.groups[b.dest].isElement("C"));
      if (carbonBonds.length === 0) return { ok: false, data: "Requires R-CC(=O)C-R'" };
      // Sever C=O
      mol.severBond(group[1].ID, group[2].ID);
      delete mol.groups[group[2].ID];
      // Sever C-C bonds
      mol.severBond(group[1].ID, carbonBonds[0].dest);
      mol.severBond(group[1].ID, carbonBonds[1].dest);
      // Remove ketone C
      delete mol.groups[group[1].ID];
      // Bond C-C
      mol.groups[carbonBonds[0].dest].addBond("-", mol.groups[carbonBonds[1].dest]);

      return { ok: true };
    }
  },
  {
    type: "nucleophilic addition",
    start: 12,
    end: 15,
    reagents: "NaCN(aq)/H{+}(aq)",
    react: (mol, group, opts) => {
      // Break C=O to C-O
      let bond = mol.getBond(group[1].ID, group[2].ID);
      bond.bond = "-";
      // Bond H to O -> C-O to C-O-H
      let H = new Group();
      H.addElement("H");
      H.isImplicit = !opts.addH;
      mol.groups[H.ID] = H;
      group[2].addBond("-", H);
      // Bond C to base C
      let C = new Group();
      C.addElement("C");
      mol.groups[C.ID] = C;
      group[1].addBond("-", C);
      // Bond N to C -> C-C to C-C#N
      let N = new Group();
      N.addElement("N");
      mol.groups[N.ID] = N;
      C.addBond("#", N);

      return { ok: true };
    }
  },
  {
    name: "Hydrolysis",
    start: 7,
    end: 14,
    reagents: "H2O/HCl",
    react: (mol, group, opts) => {
      // Bread C#N
      mol.severBond(group[1].ID, group[2].ID);
      delete mol.groups[group[2].ID];
      // Create C=O
      let O = new Group();
      O.addElement("O");
      mol.groups[O.ID] = O;
      group[1].addBond("=", O);
      // Create C-O
      O = new Group();
      O.addElement("O");
      mol.groups[O.ID] = O;
      group[1].addBond("-", O);
      // Create O-H
      let H = new Group();
      H.addElement("H");
      H.isImplicit = !opts.addH;
      mol.groups[H.ID] = H;
      O.addBond("-", H);

      return { ok: true };
    }
  },
  {
    name: "Hydrolysis",
    start: 15,
    end: 14,
    reagents: "H2O/HCl",
    react: (mol, group, opts) => {
      // Break C#N
      mol.severBond(group[2].ID, group[4].ID);
      delete mol.groups[group[4].ID];
      // Create C=O
      let O = new Group();
      O.addElement("O");
      mol.groups[O.ID] = O;
      group[2].addBond("=", O);
      // Create C-O
      O = new Group();
      O.addElement("O");
      mol.groups[O.ID] = O;
      group[2].addBond("-", O);
      // Create O-H
      let H = new Group();
      H.addElement("H");
      H.isImplicit = !opts.addH;
      mol.groups[H.ID] = H;
      O.addBond("-", H);

      return { ok: true };
    }
  },
  {
    name: "Esterification",
    start: 3,
    end: 16,
    reagents: "Carboxylic acid/conc H2SO4",
    conditions: "50C",
    provideReactant: { prompt: "Enter carboxylic acid: ", default: "C(=O)O", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[14].test(reactant), cgroup = cgroups[0];
      if (cgroups.length === 0) return { ok: false, data: `Molecule ${reactant.generateSMILES()} is not a carboxylic acid` };
      // Alcohol: Remove -H
      mol.severBond(group[2].ID, group[3].ID);
      delete mol.groups[group[3].ID];
      // Carboxylic Acid: Remove O-H
      reactant.severBond(cgroup[3].ID, cgroup[4].ID);
      delete reactant.groups[cgroup[4].ID];
      // Carboxylic Acid: Remove C-O
      reactant.severBond(cgroup[1].ID, cgroup[3].ID);
      delete reactant.groups[cgroup[3].ID];
      // Add each group in reactant to alcohol
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      }
      // Create bond alcohol(O) and carboxylic_acid(1)
      group[2].addBond("-", cgroup[1]);

      return { ok: true };
    }
  },
  {
    name: "Esterification",
    start: 3,
    end: 16,
    reagents: "Acid anhydride",
    conditions: "50C",
    provideReactant: { prompt: "Enter Acid Anhydride: ", default: "C(=O)OC(=O)O", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[24].test(reactant), cgroup = cgroups[0];
      if (cgroups.length === 0) return { ok: false, data: `Molecule ${reactant.generateSMILES()} is not an acid anhydride` };
      // Alcohol: remove -H
      mol.severBond(group[2].ID, group[3].ID);
      delete mol.groups[group[3].ID];
      // Acid anhdride: remove C-O bond
      reactant.severBond(cgroup[1].ID, cgroup[3].ID);
      delete reactant.groups[cgroup[3].ID];
      // Acid anhydride: remove unecessary groups
      let discarded = reactant.removeUnbondedGroups(cgroup[1].ID);
      // Create C-O
      group[2].addBond("-", cgroup[1]);
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      }
      // Create alcohol
      const alcohol = new Molecule(discarded);
      let H = new Group();
      H.addElement("H");
      H.isImplicit = !opts.addH;
      alcohol[H.ID] = H;
      cgroup[3].addBond("-", H);

      return { ok: true, add: [alcohol] };
    }
  },
  {
    name: "Esterification",
    start: 14,
    end: 16,
    reagents: "alcohol/conc H2SO4",
    conditions: "50C",
    provideReactant: { prompt: "Enter Alcohol: ", default: "CO", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[4].test(reactant);
      if (cgroups.length === 0) cgroups = moleculeTypes[5].test(reactant);
      if (cgroups.length === 0) cgroups = moleculeTypes[6].test(reactant);
      if (cgroups.length === 0) return { ok: false, data: `Molecule ${reactant.generateSMILES()} is not an alcohol` };
      let cgroup = cgroups[0];
      // Alcohol: remove (O)-H
      reactant.severBond(cgroup[3].ID, cgroup[3].ID);
      delete reactant.groups[cgroup[3].ID];
      // Carboxylic acid: (O)-H
      mol.severBond(group[3].ID, group[4].ID);
      delete mol.groups[group[4].ID];
      // Carboxylic acid: (C)-O
      mol.severBond(group[1].ID, group[3].ID);
      delete mol.groups[group[3].ID];
      // Bond carboxylic_acid(C) to alcohol(O)
      group[1].addBond("-", cgroup[2]);
      // Transfer group ownership
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      } 

      return { ok: true };
    }
  },
  {
    name: "Hydrolysis",
    start: 16,
    end: [14, 3],
    reagents: "dil HCl",
    conditions: "reflux",
    react: (mol, group, opts) => {
      // Remove O-C
      mol.severBond(group[4].ID, group[3].ID);
      // Add hydrogen to O
      let H = new Group();
      H.addElement("H");
      H.isImplicit = !opts.addH;
      mol.groups[H.ID] = H;
      group[4].addBond("-", H);
      // Remove unecessary molecules starting at C
      const discarded = mol.removeUnbondedGroups(group[1].ID);
      const alcohol = new Molecule(discarded);
      // Create C-O for alcohol
      let O = new Group(["O"]);
      alcohol.groups[O.ID] = O;
      group[3].addBond("-", O);
      // Create O-H
      H = new Group(["H"]);
      H.isImplicit = !opts.addH;
      alcohol.groups[H.ID] = H;
      O.addBond("-", H);

      return { ok: true, add: [alcohol] };
    }
  },
  {
    start: 26,
    end: 25,
    reagents: "RX",
    provideReactant: { prompt: "Enter haloalkane: ", default: "CBr", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[23].test(reactant), cgroup = cgroups[0];
      if (cgroups.length === 0) return { ok: false, data: `Molecule ${reactant.generateSMILES()} is not a haloalkane` };
      // Remove C-X
      reactant.severBond(cgroup[1].ID, cgroup[2].ID);
      delete reactant.groups[cgroup[2].ID];
      // [O-] to O
      group[2].charge = 0;
      // Create O-R
      group[2].addBond("-", cgroup[1]);
      // Add each group in reactant to alcohol
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      }

      return { ok: true };
    }
  },
  {
    start: 23,
    end: 25,
    reagents: "alkoxide",
    provideReactant: { prompt: "Enter alkoxide: ", default: "C[O-]", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[26].test(reactant), cgroup = cgroups[0];
      if (cgroups.length === 0) return { ok: false, data: `Molecule ${reactant.generateSMILES()} is not an alkoxide` };
      // Remove C-X
      mol.severBond(group[1].ID, group[2].ID);
      delete mol.groups[group[2].ID];
      // [O-] to O
      cgroup[2].charge = 0;
      // Create O-R
      group[1].addBond("-", cgroup[2]);
      // Add each group in reactant to alcohol
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      }

      return { ok: true };
    }
  },
  {
    name: "Base Hydrolysis",
    start: 16,
    end: [17, 3],
    reagents: "dil HCl",
    conditions: "reflux",
    react: (mol, group, opts) => {
      // Remove O-C
      mol.severBond(group[4].ID, group[3].ID);
      // Apply negative charge to O
      group[4].charge = -1;
      // Remove unecessary molecules starting at C
      const discard = mol.removeUnbondedGroups(group[1].ID);
      // Create alcohol
      const alcohol = new Molecule(discard);
      // Create C-O for alcohol
      let O = new Group(["O"]);
      alcohol.groups[O.ID] = O;
      group[3].addBond("-", O);
      // Create O-H
      let H = new Group(["H"]);
      H.isImplicit = !opts.addH;
      alcohol.groups[H.ID] = H;
      O.addBond("-", H);

      return { ok: true, add: [alcohol] };
    }
  },
  {
    name: "Neutralisation",
    start: 14,
    end: 17,
    reagents: "OH{-}(aq)",
    react: (mol, group) => {
      // Remove (O)-H
      mol.severBond(group[3].ID, group[4].ID);
      delete mol.groups[group[4].ID];
      // O -> O{-}
      group[3].charge = -1;

      return { ok: true };
    }
  },
  {
    name: "Reduction",
    start: 14,
    end: 4,
    reagents: "LiAlH4/HCl",
    conditions: "dry ether",
    react: (mol, group, opts) => {
      // Remove C=O
      mol.severBond(group[1].ID, group[2].ID);
      delete mol.groups[group[2].ID];
      // Add Hs
      for (let i = 0; i < 2; ++i) {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group[1].addBond("-", H);
      }

      return { ok: true };
    }
  },
  {
    start: 14,
    end: 18,
    reagents: "SOCl2",
    react: (mol, group) => {
      // Remove O-H
      mol.severBond(group[3].ID, group[4].ID);
      delete mol.groups[group[4].ID];
      // Replace C-O with C-Cl
      group[3].elements.clear();
      group[3].addElement("Cl");

      return { ok: true };
    }
  },
  {
    name: "Esterification",
    start: 18,
    end: 16,
    reagents: "alcohol",
    conditions: "cold",
    provideReactant: { prompt: "Enter Alcohol: ", default: "CO", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[4].test(reactant);
      if (cgroups.length === 0) cgroups = moleculeTypes[5].test(reactant);
      if (cgroups.length === 0) cgroups = moleculeTypes[6].test(reactant);
      if (cgroups.length === 0) return { ok: false, data: `Molecule ${reactant.generateSMILES()} is not an alcohol` };
      let cgroup = cgroups[0];
      // Alcohol: remove (O)-H
      reactant.severBond(cgroup[2].ID, cgroup[3].ID);
      delete reactant.groups[cgroup[3].ID];
      // Acid chloride: remove (C)-Cl
      mol.severBond(group[1].ID, group[3].ID);
      delete mol.groups[group[3].ID];
      // Bond acid_chloride(C) to alcohol(O)
      group[1].addBond("-", cgroup[2]);
      // Transfer group ownership
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      }

      return { ok: true };
    }
  },
  {
    start: 18,
    end: 14,
    reagents: "H2O",
    react: (mol, group, opts) => {
      // Replace C-Cl with C-O
      group[3].elements.clear();
      group[3].addElement("O");
      // Add hydrogen to O
      let H = new Group();
      H.addElement("H");
      mol.groups[H.ID] = H;
      H.isImplicit = !opts.addH;
      group[3].addBond("-", H);

      return { ok: true };
    }
  },
  {
    start: 18,
    end: 20,
    reagents: "NH3",
    react: (mol, group, opts) => {
      // Replace C-Cl with C-N
      group[3].elements.clear();
      group[3].addElement("N");
      // Add Hydrogens
      for (let i = 0; i < 2; ++i) {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group[3].addBond("-", H);
      }

      return { ok: true };
    }
  },
  {
    start: 18,
    end: 21,
    reagents: "primary amine",
    provideReactant: { prompt: "Enter Primary Amine: ", default: "CN", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[9].test(reactant), cgroup = cgroups[0];
      if (cgroups.length === 0) return { ok: false, data: `Expected primary amine, got ${reactant.generateSMILES(false)}` };
      // Remove C-Cl
      mol.severBond(group[1].ID, group[3].ID);
      delete mol.groups[group[3].ID];
      // Remove N-H
      reactant.severBond(cgroup[1].ID, cgroup[3].ID);
      delete reactant.groups[cgroup[3].ID];
      // Create C-N
      group[1].addBond("-", cgroup[1]);
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      }

      return { ok: true };
    }
  },
  {
    name: "Dehydration",
    start: 14,
    end: 24,
    reagents: "carboxylic acid",
    provideReactant: { prompt: "Enter Carboxylic Acid: ", default: "C(=O)O", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[14].test(reactant), cgroup = cgroups[0];
      if (cgroups.length === 0) return { ok: false, data: `Expected carboxylic acid, got ${reactant.generateSMILES(false)}` };
      // Remove O-H
      reactant.severBond(cgroup[3].ID, cgroup[4].ID)
      delete reactant.groups[cgroup[4].ID];
      // Remove C-O
      reactant.severBond(cgroup[1].ID, cgroup[3].ID);
      delete reactant.groups[cgroup[3].ID];
      // Remove O-H
      mol.severBond(group[3].ID, group[4].ID);
      delete mol.groups[group[4].ID];
      // Create C-O
      group[3].addBond("-", cgroup[1]);
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      }

      return { ok: true };
    }
  },
  {
    name: "Dehydration",
    start: 14,
    end: 24,
    reagents: "acid chloride/NaOH",
    provideReactant: { prompt: "Enter Acid Chloride: ", default: "C(=O)Cl", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[18].test(reactant), cgroup = cgroups[0];
      if (cgroups.length === 0) return { ok: false, data: `Expected acyl chloride, got ${reactant.generateSMILES(false)}` };
      // Remove C-Cl
      reactant.severBond(cgroup[1].ID, cgroup[3].ID);
      delete reactant.groups[cgroup[3].ID];
      // Remove O-H
      mol.severBond(group[3].ID, group[4].ID);
      delete mol.groups[group[4].ID];
      // Create C-O
      group[3].addBond("-", cgroup[1]);
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      }

      return { ok: true };
    }
  },
  {
    start: 9,
    end: 4,
    reagents: "HNO2",
    react: (mol, group) => {
      // Remove N-H
      mol.severBond(group[1].ID, group[4].ID);
      delete mol.groups[group[4].ID];
      // Replace C-N with C-O
      group[1].elements.clear();
      group[1].addElement("O");

      return { ok: true };
    }
  },
  {
    name: "Hydrolysis",
    start: 25,
    end: [23, 3],
    reagents: "HX/conc BX3",
    provideReactant: { prompt: "Enter halogen X: ", default: "Br", smilesOpts: { addImplicitHydrogens: false, checkBondCount: false } },
    react: (mol, group, opts, reactant) => {
      let X: Group;
      if (Object.values(reactant.groups).length === 1) {
        X = Object.values(reactant.groups)[0];
        if (!X.isElement("F", "Cl", "Br", "I") || X.charge !== 0) return { ok: false, data: `Expected halogen X, got ${X.toStringFancy(false)}` };
      } else {
        return { ok: false, data: `Expected halogen X, got ${reactant.generateSMILES()}` };
      }

      let C = opts.primarySide ? group[1] : group[3];
      let otherC = opts.primarySide ? group[3] : group[1]; // Carbon to become haloalkane
      // Sever C-O
      mol.severBond(group[2].ID, otherC.ID);
      // Remove unecessary from alcohol
      const discarded = mol.removeUnbondedGroups(C.ID);
      // Add hydrogen to alcohol
      let H = new Group();
      H.addElement("H");
      H.isImplicit = !opts.addH;
      mol.groups[H.ID] = H;
      group[2].addBond("-", H);
      // Create haloalkane
      const haloalkane = new Molecule(discarded);
      haloalkane.groups[X.ID] = X;
      otherC.addBond("-", X);

      return { ok: true, add: [haloalkane] };
    }
  },
  {
    name: "Dehydration",
    type: "nucleophilic substitution",
    start: 3,
    end: 25,
    reagents: "conc H2SO4",
    conditions: "125C",
    provideReactant: { prompt: "Enter alcohol: ", default: "CO", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[4].test(reactant);
      if (cgroups.length === 0) cgroups = moleculeTypes[5].test(reactant);
      if (cgroups.length === 0) cgroups = moleculeTypes[6].test(reactant);
      if (cgroups.length === 0) return { ok: false, data: `Expected alcohol, got ${reactant.generateSMILES(false)}` };
      let cgroup = cgroups[0];

      // Remove O-H
      reactant.severBond(cgroup[2].ID, cgroup[3].ID);
      delete reactant.groups[cgroup[3].ID];
      // Remove C-O
      reactant.severBond(cgroup[1].ID, cgroup[2].ID);
      delete reactant.groups[cgroup[2].ID];
      // Remove O-H
      mol.severBond(group[2].ID, group[3].ID);
      delete mol.groups[group[3].ID];
      // Bond C-O
      group[2].addBond("-", cgroup[1]);
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      }

      return { ok: true };
    }
  },
  {
    name: "Ether Elimination",
    start: 26,
    end: 25,
    reagents: "alkoxide",
    provideReactant: { prompt: "Enter Alkoxide: ", default: "C[O-]", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[26].test(reactant), cgroup = cgroups[0];
      if (cgroups.length === 0) return { ok: false, data: `Expected alkoxide, got ${reactant.generateSMILES(false)}` };
      // Remove C-[O-]
      reactant.severBond(cgroup[1].ID, cgroup[2].ID);
      delete reactant.groups[cgroup[2].ID];
      // O{-} -> O
      group[2].charge = 0;
      // Create C-O
      group[2].addBond("-", cgroup[1]);
      for (let gid in reactant.groups) {
        mol.groups[gid] = reactant.groups[gid];
      }

      return { ok: true };
    }
  },
  {
    name: "Cyclic Oxidation",
    start: 2,
    end: 25,
    reagents: "O2/CuCl2(aq)",
    react: (mol) => {
      let cgroups = moleculeTypes[2].test(mol), groups: IGroupStrMap[] = [], Hs: [Group, Group][] = [];
      for (let cgroup of cgroups) {
        let cHs = mol.getAllBonds(cgroup[1].ID).filter(bond => mol.groups[bond.dest].isElement("H"));
        if (cHs.length === 2) {
          Hs.push(cHs.map(b => mol.groups[b.dest]) as [Group, Group]);
          groups.push(cgroup);
          if (groups.length === 2) break;
        }
      }
      if (groups.length === 0) return { ok: false, data: `Oxidation requires 2 terminal C=C bonds, got ${mol.generateSMILES(false)}` };
      // Path between both end
      let paths = mol.pathfind(groups[0][1].ID, groups[1][1].ID);
      const llen = Math.max(...paths.map(p => p.length));
      let path = mol.traceBondPath(groups[0][1].ID, paths.find(path => path.length === llen));
      // Remove single H from each carbon
      groups.forEach((map, i) => {
        let H = Hs[i][0];
        mol.severBond(map[1].ID, H.ID);
        delete mol.groups[H.ID];
      });
      // Bond C-O and O-C
      let O = new Group(["O"]);
      mol.groups[O.ID] = O;
      groups[0][1].addBond("-", O);
      O.addBond("-", groups[1][1]);
      // Create ring
      let ring = new Ring(1, O.ID);
      ring.end = groups[0][1].ID;
      ring.members = [O.ID, ...path];
      mol.rings.push(ring);

      return { ok: true };
    },
    reactOnce: true,
  },
  {
    name: "Reduction",
    start: 27,
    end: 1,
    reagents: "H2/Ni",
    react: (mol) => {
      mol.rings.forEach(ring => ring.isAromatic && mol.deAromaticifyRing(ring.ID));
      return { ok: true };
    }
  },
  {
    name: "Halogenation",
    start: 28,
    end: 29,
    reagents: "X2/(AlX3 or Fe or FeX3)",
    provideReactant: { prompt: "Enter halogen X: ", default: "Br", smilesOpts: { addImplicitHydrogens: false, checkBondCount: false } },
    react: (mol, group, opts, reactant) => {
      let X: Group;
      if (Object.values(reactant.groups).length === 1) {
        X = Object.values(reactant.groups)[0];
        if (!X.isElement("F", "Cl", "Br", "I") || X.charge !== 0) return { ok: false, data: `Expected halogen X, got ${X.toStringFancy(false)}` };
      } else {
        return { ok: false, data: `Expected halogen X, got ${reactant.generateSMILES()}` };
      }

      // Replace -H with -X
      group[6].elements.clear();
      group[6].isImplicit = false;
      group[6].addElement(X.getElementString(false));

      return { ok: true };
    },
    reactOnce: true,
  },
  {
    name: "Nitration",
    start: 28,
    end: 30,
    reagents: "conc HNO3/conc H2SO4",
    react: (mol, group) => {
      // Replace -H with -[N+]
      group[6].elements.clear();
      group[6].isImplicit = false;
      group[6].charge = 1;
      group[6].addElement("N");
      // Add O
      let O = new Group(["O"]);
      mol.groups[O.ID] = O;
      group[6].addBond("=", O);
      // Add [O-]
      O = new Group(["O"]);
      O.charge = -1;
      mol.groups[O.ID] = O;
      group[6].addBond("-", O);

      return { ok: true };
    },
    reactOnce: true,
  },
  {
    name: "Alkylation",
    start: 28,
    end: 31,
    reagents: "RX/AlX3",
    reactOnce: true,
    provideReactant: { prompt: "Enter haloalkane: ", default: "CBr", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[23].test(reactant), cgroup = cgroups[0];
      if (cgroups.length === 0) return { ok: false, data: `Expected haloalkane, got ${reactant.generateSMILES(false)}` };

      // Remove -X
      reactant.severBond(cgroup[1].ID, cgroup[2].ID);
      delete reactant.groups[cgroup[2].ID];
      // Remove -H
      mol.severBond(group[0].ID, group[6].ID);
      delete mol.groups[group[6].ID];
      // Bond benzene to alkyl
      group[0].addBond("-", cgroup[1]);
      for (let id in reactant.groups) {
        mol.groups[id] = reactant.groups[id];
      }

      return { ok: true };
    }
  },
  {
    name: "Acylation",
    start: 28,
    end: 13,
    reagents: "RCOCl/AlCl3",
    reactOnce: true,
    provideReactant: { prompt: "Enter acyl chloride: ", default: "C(=O)Cl", smilesOpts: { addImplicitHydrogens: true } },
    react: (mol, group, opts, reactant) => {
      let cgroups = moleculeTypes[18].test(reactant), cgroup = cgroups[0];
      if (cgroups.length === 0) return { ok: false, data: `Expected acyl chloride, got ${reactant.generateSMILES(false)}` };

      // Remove -Cl
      reactant.severBond(cgroup[1].ID, cgroup[3].ID);
      delete reactant.groups[cgroup[3].ID];
      // Remove -H
      mol.severBond(group[0].ID, group[6].ID);
      delete mol.groups[group[6].ID];
      // Bond benzene to acyl
      group[0].addBond("-", cgroup[1]);
      for (let id in reactant.groups) {
        mol.groups[id] = reactant.groups[id];
      }

      return { ok: true };
    }
  },
  {
    start: 30,
    end: 32,
    reagents: "Sn/conc HCl",
    reactOnce: true,
    react: (mol, group, opts) => {
      // [N+] -> N
      group[6].charge = 0;
      // O -> H
      [group[7], group[8]].forEach(group => {
        group.elements.clear();
        group.charge = 0;
        group.addElement("H");
        group.isImplicit = !opts.addH;
      });

      return { ok: true };
    }
  },
  {
    name: "Halogenation",
    start: 32,
    end: 23,
    reagents: "X2",
    provideReactant: { prompt: "Enter halogen X: ", default: "Br", smilesOpts: { addImplicitHydrogens: false, checkBondCount: false } },
    react: (mol, group, opts, reactant) => {
      let X: Group;
      if (Object.values(reactant.groups).length === 1) {
        X = Object.values(reactant.groups)[0];
        if (!X.isElement("F", "Cl", "Br", "I") || X.charge !== 0) return { ok: false, data: `Expected halogen X, got ${X.toStringFancy(false)}` };
      } else {
        return { ok: false, data: `Expected halogen X, got ${reactant.generateSMILES()}` };
      }

      // Replace -H with -X at positions 2, 4, 6
      [group[1], group[3], group[5]].forEach(group => {
        let Hbond = mol.getAllBonds(group.ID).find(b => mol.groups[b.dest].isElement("H"));
        mol.groups[Hbond.dest].elements.clear();
        mol.groups[Hbond.dest].isImplicit = false;
        mol.groups[Hbond.dest].addElement(X.getElementString(false));
      });

      return { ok: true };
    },
    reactOnce: true,
  },
];

export const moleculeIDsToString = (ids: number | number[]) => Array.isArray(ids) ? ids.map(j => moleculeTypes[j].name).join(" & ") : moleculeTypes[ids].name;