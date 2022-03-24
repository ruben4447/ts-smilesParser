import { Group } from "./classes/Group";
import type { Molecule } from "./classes/Molecule";
import { IBond } from "./types/Bonds";
import { IMoleculeType, IReactionInfo } from "./types/utils";

export const moleculeTypes: { [id: number]: IMoleculeType } = {
  1: {
    repr: "alkane",
    name: "Alkane",
    eg: { smiles: "CC", name: "ethane" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "H", rec: 3 }, { atom: "C", bond: "-", rec: 2 }] }),
  },
  2: {
    repr: "alkene",
    name: "Alkene",
    eg: { smiles: "C=C", name: "ethene" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "H" }, { atom: "C", bond: "=", rec: 2 }] }),
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
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "H" }] }),
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
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "O", bondedTo: [{ atom: "C", rec: 3 }] }] }),
    removeIfPresent: [13],
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
    eg: { smiles: "C(=O)OCl", name: "methanoyl chloride" },
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=", rec: 2 }, { atom: "O", rec: 3, bondedTo: [{ atom: "Cl", rec: 4 }] }] }),
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
    test: mol => mol.matchMolecule({ atom: "C", rec: 1, bondedTo: [{ atom: "O", bond: "=" }, { atom: "O", bondedTo: [{ atom: "C", bondedTo: [{ atom: "O", bond: "=" }] }] }] }),
    removeIfPresent: [13, 8, 16]
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
      const bond = group[1].bonds.find(bond => bond.dest === group[2].ID);
      bond.bond = "-";
      // Add hydrogen to both carbons
      [group[1], group[2]].forEach(group => {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group.addBond('-', H);
      });
    }
  },
  {
    name: "Halogenation",
    type: "electrophilic addition",
    start: 2,
    end: 23,
    reagents: "HX",
    react: (mol, group, opts) => {
      // Find C=C
      const bond = group[1].bonds.find(bond => bond.dest === group[2].ID);
      bond.bond = "-"; // Break C=C
      // Add halogen
      let X = new Group();
      X.addElement(opts.halogen);
      mol.groups[X.ID] = X;
      group[1].addBond('-', X);
      // Add hydrogen
      let H = new Group();
      H.addElement("H");
      H.isImplicit = !opts.addH;
      mol.groups[H.ID] = H;
      group[2].addBond('-', H);
    }
  },
  {
    name: "Halogenation",
    type: "electrophilic addition",
    start: 2,
    end: 23,
    reagents: "X2",
    react: (mol, group, opts) => {
      // Find C=C
      const bond = group[1].bonds.find(bond => bond.dest === group[2].ID);
      bond.bond = "-"; // Break C=C
      // Add halogens
      [group[1], group[2]].forEach(group => {
        let X = new Group();
        X.addElement(opts.halogen);
        mol.groups[X.ID] = X;
        group.addBond('-', X);
      });
    }
  },
  {
    name: "Halogenation",
    start: 1,
    end: 23,
    reagents: "X2",
    conditions: "UV",
    reactOnce: true,
    react: (mol, group, opts) => {
      let ok = false;
      // Replace Hydrogen bonded to group[2]
      for (const bond of group[2].bonds) {
        if (mol.groups[bond.dest].isElement("H")) {
          mol.groups[bond.dest].elements.clear(); // Remove H
          mol.groups[bond.dest].addElement(opts.halogen); // Add halogen
          mol.groups[bond.dest].isImplicit = false;
          ok = true;
          break;
        }
      }
      if (!ok) return "Both carbons must be bonded to a Hydrogen";
      // Replace Hydroegen bonded to group[1] (which is group[3])
      group[3].elements.clear();
      group[3].addElement(opts.halogen);
      group[3].isImplicit = false;
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
      let bond = group[1].bonds.find(bond => bond.dest === group[2].ID);
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
      let bond = group[1].bonds.find(bond => bond.dest === group[2].ID);
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
      if (!otherC) return "Must be 2-carbon: R-CCOH";
      // Find -H from otherC
      let bondIndex = otherC.bonds.findIndex(bond => bond.bond === "-" && mol.groups[bond.dest].isElement("H"));
      if (bondIndex === -1) return "Carbon bonded to -COH must be bonded to a Hydrogem";
      // Remove -H
      delete mol.groups[otherC.bonds[bondIndex].dest];
      otherC.bonds.splice(bondIndex, 1);
      // Remove -OH
      delete mol.groups[group[3].ID]; // Remove H
      delete mol.groups[group[2].ID]; // Remove O
      bondIndex = group[1].bonds.findIndex(bond => bond.dest === group[2].ID); // Bond linking C-O
      group[1].bonds.splice(bondIndex, 1); // Remove bond
      // C-C to C=C
      let bond = group[1].bonds.find(bond => bond.dest === otherC.ID);
      if (bond === undefined) bond = otherC.bonds.find(bond => bond.dest === group[1].ID);
      bond.bond = "=";
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
      if (!hydrogen) return "A hydrogen must be bonded to -COH";
      // Sever O-H bond
      let bondIndex = group[2].bonds.findIndex(bond => bond.dest === group[3].ID);
      group[2].bonds.splice(bondIndex, 1);
      // Remove -H from -OH
      delete mol.groups[group[3].ID]; // Delete H
      // Sever C-H bond
      bondIndex = group[1].bonds.findIndex(bond => bond.dest === hydrogen.ID);
      group[1].bonds.splice(bondIndex, 1);
      // Remove -H from C
      delete mol.groups[hydrogen.ID];
      // Double up C-O to C=O
      bondIndex = group[1].bonds.findIndex(bond => bond.dest === group[2].ID);
      group[1].bonds[bondIndex].bond = "=";
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
      let bond = group[1].bonds.find(bond => bond.dest === group[2].ID);
      bond.bond = "-";
      // Add H to C and O
      [group[1], group[2]].forEach(group => {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group.addBond('-', H);
      });
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
      if (!hydrogen) return "A hydrogen must be bonded to -COH";
      // Sever O-H bond
      let bondIndex = group[2].bonds.findIndex(bond => bond.dest === group[3].ID);
      group[2].bonds.splice(bondIndex, 1);
      // Remove -H from -OH
      delete mol.groups[group[3].ID]; // Delete H
      // Sever C-H bond
      bondIndex = group[1].bonds.findIndex(bond => bond.dest === hydrogen.ID);
      group[1].bonds.splice(bondIndex, 1);
      // Remove -H from C
      delete mol.groups[hydrogen.ID];
      // Double up C-O to C=O
      bondIndex = group[1].bonds.findIndex(bond => bond.dest === group[2].ID);
      group[1].bonds[bondIndex].bond = "=";
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
      let bond = group[1].bonds.find(bond => bond.dest === group[2].ID);
      bond.bond = "-";
      // Add H to C and O
      [group[1], group[2]].forEach(group => {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group.addBond('-', H);
      });
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
      if (hydrogens.length !== 2) return "Two hydrogens must be bonded to -COH";
      // Sever and remove both C-H bonds and H's
      hydrogens.forEach(hydrogen => {
        let bondIndex = group[1].bonds.findIndex(bond => bond.dest === hydrogen.ID);
        group[1].bonds.splice(bondIndex, 1);
        delete mol.groups[hydrogen.ID];
      });
      // Create C=O
      let O = new Group();
      O.addElement("O");
      mol.groups[O.ID] = O;
      group[1].addBond("=", O);
    }
  },
  {
    type: "nucleophilic addition",
    start: 12,
    end: 15,
    reagents: "NaCN(aq)/H{+}(aq)",
    react: (mol, group, opts) => {
      // Break C=O to C-O
      let bond = group[1].bonds.find(bond => bond.dest === group[2].ID);
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
    }
  },
  {
    name: "Hydrolysis",
    start: 7,
    end: 14,
    reagents: "H2O/HCl",
    react: (mol, group, opts) => {
      // Bread C#N
      let bondIndex = group[1].bonds.findIndex(bond => bond.dest === group[2].ID);
      group[1].bonds.splice(bondIndex, 1);
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
    }
  },
  {
    name: "Hydrolysis",
    start: 15,
    end: 14,
    reagents: "H2O/HCl",
    react: (mol, group, opts) => {
      // Break C#N
      let bondIndex = group[2].bonds.findIndex(bond => bond.dest === group[4].ID);
      group[2].bonds.splice(bondIndex, 1);
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
    }
  },
  // TODO
  {
    name: "Esterification",
    start: 3,
    end: 16,
    reagents: "Carboxylic acid/conc H2SO4 or acid anhydride",
    conditions: "50C"
  },
  // TODO
  {
    name: "Esterification",
    start: 14,
    end: 16,
    reagents: "alcohol/conc H2SO4",
    conditions: "50C"
  },
  // TODO
  {
    name: "Hydrolysis",
    start: 16,
    end: 14,
    reagents: "dil HCl",
    conditions: "reflux"
  },
  // TODO
  {
    name: "Base Hydrolysis",
    start: 16,
    end: 17,
    reagents: "dil HCl",
    conditions: "reflux"
  },
  {
    name: "Reduction",
    start: 14,
    end: 4,
    reagents: "LiAlH4/HCl",
    conditions: "dry ether",
    react: (mol, group, opts) => {
      // Remove C=O
      let bondIndex = group[1].bonds.findIndex(bond => bond.dest === group[2].ID);
      group[1].bonds.splice(bondIndex, 1);
      delete mol.groups[group[2].ID];
      // Add Hs
      for (let i = 0; i < 2; ++i) {
        let H = new Group();
        H.addElement("H");
        H.isImplicit = !opts.addH;
        mol.groups[H.ID] = H;
        group[1].addBond("-", H);
      }
    }
  },
  {
    start: 14,
    end: 18,
    reagents: "SOCl2",
    react: (mol, group) => {
      // Replace C-O-H with C-O-Cl
      group[4].elements.clear();
      group[4].addElement("Cl");
      group[4].isImplicit = false;
    }
  },
  // TODO
  {
    name: "Esterification",
    start: 18,
    end: 16,
    reagents: "alcohol",
    conditions: "cold",
  },
  {
    start: 18,
    end: 14,
    reagents: "H2O",
    react: (mol, group, opts) => {
      // Replace C-O-Cl with C-O-H
      group[4].elements.clear();
      group[4].addElement("H");
      group[4].isImplicit = !opts.addH;
    }
  },
  {
    start: 18,
    end: 20,
    reagents: "NH3",
    react: (mol, group, opts) => {
      // Remove O-Cl
      let bondIndex = group[3].bonds.findIndex(bond => bond.dest === group[4].ID);
      group[3].bonds.splice(bondIndex, 1);
      delete mol.groups[group[4].ID];
      // Replace C-O with C-N
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
    }
  },
  // TODO
  {
    start: 18,
    end: 21,
    reagents: "primary amine",
  },
  // TODO
  {
    name: "Dehydration",
    start: 14,
    end: 24,
    reagents: "carboxylic acid or acid chloride/NaOH",
  },
  {
    start: 9,
    end: 4,
    reagents: "HNO2",
    react: (mol, group) => {
      // Remove N-H
      let bondIndex = group[1].bonds.findIndex(bond => bond.dest === group[4].ID);
      group[1].bonds.splice(bondIndex, 1);
      delete mol.groups[group[4].ID];
      // Replace C-N with C-O
      group[1].elements.clear();
      group[1].addElement("O");
    }
  },
  // TODO Add alcohol -> haloalkane using H2SO4/NaX
  // Start again at Reaction ID 28
];
// TODO: with reactions which require another entire molecule (e.g. esterification), prompt for SMILES input and find the appropriate functional group (e.g. alcohol).
//       In matchAtoms(), include { rec: n } to capture any group