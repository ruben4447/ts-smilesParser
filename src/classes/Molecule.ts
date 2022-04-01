import { organicSubset } from "../data-vars";
import { IBond } from "../types/Bonds";
import { IGroupStrMap, IMatchAtom } from "../types/Group";
import { createGenerateSmilesStackItemObject, IAtomCount, ICountAtoms, IElementToIonMap, IGenerateSmilesStackItem, createRenderOptsObject, defaultRenderOptsObject, IRenderOptions } from "../types/SMILES";
import { IRec, IVec } from "../types/utils";
import { assembleEmpiricalFormula, assembleMolecularFormula, extractElement, extractInteger, getBondNumber, numstr, rotateCoords, _regexNum } from "../utils";
import { AdvError } from "./Error";
import { Group } from "./Group";
import { Ring } from "./Rings";

export class Molecule {
  public groups: { [id: number]: Group };
  public rings: Ring[];

  constructor();
  constructor(groups: Group[]);
  constructor(groups: { [id: number]: Group });
  constructor(groups?: | Group[] | { [id: number]: Group }) {
    this.rings = [];
    if (groups === undefined) {
      this.groups = {};
    } else if (Array.isArray(groups)) {
      this.groups = groups.reduce((obj, group) => {
        obj[group.ID] = group;
        return obj;
      }, {});
    } else {
      this.groups = groups;
    }
  }

  /** Calculate Mr for a compound */
  public calculateMr() {
    if (Object.values(this.groups).length === 0) return 0;
    const stack: number[] = [+Object.keys(this.groups)[0]];
    const done = new Set<number>();
    let Mr = 0;
    while (stack.length !== 0) {
      const id = stack.pop(), group = this.groups[id];
      if (!done.has(id)) {
        done.add(id);
        Mr += group.calculateMr();
        group.bonds.forEach(bond => {
          stack.push(bond.dest);
        });
      }
    }
    return Mr;
  }

  /** Get all bonds to/from a group ID (.dest is group groupID is bonded to) */
  public getAllBonds(groupID: number) {
    const bonds: IBond[] = this.groups[groupID].bonds.map(bond => ({ ...bond }));
    for (const gid in this.groups) {
      if (+gid === groupID) continue;
      this.groups[gid].bonds.forEach(bond => {
        if (bond.dest === groupID) {
          const nbond = { ...bond };
          nbond.dest = +gid;
          bonds.push(nbond);
        }
      });
    }
    return bonds;
  }

  /** Get total bond count for a group */
  public getBondCount(groupID: number) {
    let count = 0;
    this.groups[groupID].bonds.forEach(bond => (count += getBondNumber(bond.bond)));
    for (let gid in this.groups) {
      if (+gid === groupID) continue;
      this.groups[gid].bonds.forEach(bond => bond.dest === groupID && (count += getBondNumber(bond.bond)));
    }
    return count;
  }

  /** Remove unbonded groups from molecule, starting from a given group */
  public removeUnbondedGroups(startID: number) {
    const bondedGroups = new Set<number>(); // Set of group IDs which are bonded
    bondedGroups.add(startID);
    const stack: number[] = [startID]; // Stack of groups to explore
    const doneGroups = new Set<number>(); // Set of groups which have been explored

    while (stack.length !== 0) {
      const gid = stack.pop();
      if (!doneGroups.has(gid)) {
        doneGroups.add(gid);
        const bonds = this.getAllBonds(gid);
        for (let i = bonds.length - 1; i >= 0; --i) {
          if (!doneGroups.has(bonds[i].dest)) {
            stack.push(bonds[i].dest);
            bondedGroups.add(bonds[i].dest); // This group is bonded to startID
          }
        }
      }
    }

    // Remove all groups which are not bonded
    for (let gid in this.groups) {
      if (!bondedGroups.has(+gid)) {
        delete this.groups[gid]; // Remove
      }
    }
  }

  /** Add implicit hydrogens to atoms e.g. C -> C([H])([H])[H]. Note, these hydrogens are marked as implicit and will not be in generated SMILES */
  public addImplicitHydrogens() {
    for (const gid in this.groups) {
      const group = this.groups[gid];
      if (!group.isRadical && group.inOrganicSubset()) {
        const bonds = this.getBondCount(group.ID);
        if (group.charge === 0) {
          // Find target bonds
          let targetBonds: number = NaN, el = Array.from(group.elements.keys())[0];
          for (let n of organicSubset[el]) {
            if (n >= bonds) {
              targetBonds = n
              break;
            }
          }
          // Add hydrogens (if got targetBonds)
          if (!isNaN(targetBonds)) {
            let hCount = targetBonds - bonds;
            for (let h = 0; h < hCount; h++) {
              let H = new Group({ chainDepth: group.chainDepth + 1 });
              H.addElement("H");
              H.isImplicit = true;
              group.addBond('-', H);
              this.groups[H.ID] = H;
            }
          }
        }
      }
    }
  }

  /**
   * Check each atom - has it too many/few bonds?
   * Return `true` if valid, else returns information object
  */
  public checkBondCounts(): true | { group: Group, element: string, error: AdvError } {
    for (const gid in this.groups) {
      const group = this.groups[gid], bonds = this.getBondCount(group.ID);
      if (group.charge === 0 && !group.isRadical && group.inOrganicSubset()) {
        let el = Array.from(group.elements.keys())[0] as string;
        if (!isNaN(organicSubset[el][0]) && !organicSubset[el].some((n: number) => n === bonds)) {
          const error = new AdvError(`Bond Error: invalid bond count for organic atom '${el}': ${bonds}. Expected ${organicSubset[el].join(' or ')}.`, el).setColumnNumber(group.smilesStringPosition);
          return { group, element: el, error };
        }
      }
    }
    return true;
  }

  /** Return array of matching recIDs if match. */
  // TODO Multiple of same chain from single atom, not only in top-most atom? (e.g. OCO) 
  public matchMolecule(thing: IMatchAtom, matchMany = true): IGroupStrMap[] {
    const matches: IGroupStrMap[] = [];
    for (const gid in this.groups) {
      const rec: IGroupStrMap = {};
      let match = this.groups[gid].matchAtoms(thing, this, rec, true);
      if (match) {
        matches.push(rec);
        if (!matchMany) return matches;
      }
    }
    return matches;
  }

  /**
   * Count each atom in parsed data
   * Order the AtomCount object via the Hill system
   * - Hill system => carbons, hydrogens, then other elements in alphabetical order
   * - Ignore charge => ignore charge on atoms?
   */
  public countAtoms(opts: ICountAtoms = {}): IAtomCount[] {
    opts.splitGroups ??= false;
    opts.hillSystemOrder ??= true;
    opts.ignoreCharge ??= false;

    let atoms: IAtomCount[] = [], elementsPos: string[] = [];
    for (const id in this.groups) {
      if (this.groups.hasOwnProperty(id)) {
        const group = this.groups[id], groupCharge = opts.ignoreCharge ? 0 : group.charge;
        if (opts.splitGroups) {
          group.elements.forEach((count, element) => {
            let chargeStr = element + '{' + groupCharge + '}', i = elementsPos.indexOf(chargeStr);
            if (atoms[element] === undefined) {
              atoms.push({ atom: element, charge: NaN, count: 0 }); // If splitting groups up, cannot associate charge
              elementsPos.push(chargeStr);
              i = elementsPos.length - 1;
            }
            atoms[i].count += count;
          });
        } else {
          let str = group.getElementString(false, true), chargeStr = str + '{' + groupCharge + '}', i = elementsPos.indexOf(chargeStr);
          if (atoms[i] === undefined) {
            atoms.push({ atom: str, charge: groupCharge, count: 0 });
            elementsPos.push(chargeStr);
            i = elementsPos.length - 1;
          }
          atoms[i].count++;
        }
      }
    }
    if (opts.splitGroups) {
      // Deconstruct numbered atoms e.g. "H2": 1 --> "H": 2
      let newAtoms: IAtomCount[] = [], elementsPos: string[] = [];
      for (let i = 0; i < atoms.length; i++) {
        const group = atoms[i];
        if (_regexNum.test(group.atom)) {
          let atom = extractElement(group.atom), count = extractInteger(group.atom.substr(atom.length)), str = atom + "{" + group.charge + "}", i = elementsPos.indexOf(str);
          if (i === -1) {
            newAtoms.push({ atom, count, charge: NaN });
            elementsPos.push(str);
          } else {
            newAtoms[i].count += count;
          }
        } else {
          let str = group.atom + "{" + group.charge + "}", i = elementsPos.indexOf(str);
          if (i === -1) {
            newAtoms.push(group);
            elementsPos.push(str);
          } else {
            newAtoms[i].count += group.count;
          }
        }
      }
      atoms = newAtoms;
    }
    if (opts.hillSystemOrder) {
      let newAtoms: IAtomCount[] = [], elementPos: string[] = [];
      // Carbons come first
      let carbons: IAtomCount[] = [];
      for (let i = atoms.length - 1; i >= 0; i--) {
        if (atoms[i].atom === 'C') {
          carbons.push(atoms[i]);
          atoms.splice(i, 1);
        }
      }
      carbons.sort((a, b) => a.charge - b.charge);
      newAtoms.push(...carbons);
      // Hydrogens come second
      let hydrogens: IAtomCount[] = [];
      for (let i = atoms.length - 1; i >= 0; i--) {
        if (atoms[i].atom === 'H') {
          hydrogens.push(atoms[i]);
          atoms.splice(i, 1);
        }
      }
      hydrogens.sort((a, b) => a.charge - b.charge);
      newAtoms.push(...hydrogens);
      // Sort rest by alphabetical order
      let elements: IElementToIonMap = {}, elementKeys: string[] = [];
      // Extract element ions
      for (let group of atoms) {
        if (elements[group.atom] === undefined) {
          elements[group.atom] = [];
          elementKeys.push(group.atom);
        }
        elements[group.atom].push(group);
      }
      // Order ions by charge
      for (let element in elements) {
        if (elements.hasOwnProperty(element)) {
          elements[element].sort((a, b) => a.charge - b.charge);
        }
      }
      // Order elements alphabeticalls
      elementKeys.sort();
      elementKeys.forEach(e => {
        elements[e].forEach(ion => {
          newAtoms.push(ion);
        });
      });
      return newAtoms;
    }
    return atoms;
  }

  /** Count number of matching elements given group is bonded to */
  public countBondedElements(groupID: number, elements: string | string[], includeImplicit = false) {
    if (typeof elements === "string") elements = [elements];
    return this.getAllBonds(groupID).filter(bond => (this.groups[bond.dest].isImplicit ? includeImplicit : true) && this.groups[bond.dest].isElement(...elements)).length;
  }

  /**
   * Generate molecular formula
   * e.g. "C2H4O2"
   * @param detailed - If true, will keep [NH4+] and not split it up, keep charges etc...
   * @param html - Return formula as HTML?
   * @param useHillSystem - Use hill system to order formula in conventional way?
   */
  public generateMolecularFormula(opts: ICountAtoms = {}, html = false): string {
    opts.ignoreCharge = true;
    let count = this.countAtoms(opts);
    return assembleMolecularFormula(count, html);
  }
  /**
   * Generate empirical formula
   * e.g. "C2H4O2" -> "CH2O"
   * @param html - Return formula as HTML?
   * @param useHillSystem - Use hill system to order formula in conventional way?
   */
  public generateEmpiricalFormula(html = false, useHillSystem = true): string {
    let count = this.countAtoms({ splitGroups: true, hillSystemOrder: useHillSystem });
    return assembleEmpiricalFormula(count, html);
  }
  /**
   * Generate condensed formula
   * e.g. "C2H4O2" -> CH3COOH
   * - collapseSucecssiveGroups => condense groups e.g. "CH3CH2CH2CH3" -> "CH3(CH2)2CH3"
   * @param html - Return formula as HTML?
   */
  public generateCondensedFormula(html = false, collapseSucecssiveGroups = true): string {
    if (Object.values(this.groups).length === 0) return "";

    let elements: Map<string, number>[] = []; // Array of elements for each group
    const stack: number[] = []; // Stack of IDs to this._group (or NaN if done)
    const doneGroups = new Set<number>(); // Set of group IDs which have been done
    stack.push(+Object.keys(this.groups)[0]);

    while (stack.length !== 0) {
      const i = stack.length - 1, group = this.groups[stack[i]];
      if (isNaN(stack[i]) || doneGroups.has(group.ID)) {
        stack.splice(i, 1);
      } else {
        let groupElements = new Map<string, number>();
        groupElements.set(group.toStringFancy(html), 1);
        const bonds = this.getAllBonds(group.ID);
        for (let j = bonds.length - 1; j >= 0; j--) {
          const bond = bonds[j];
          if (!doneGroups.has(bond.dest) && this.groups[bond.dest].bonds.length === 0) {
            let el = this.groups[bond.dest].toStringFancy(html);
            groupElements.set(el, (groupElements.get(el) ?? 0) + 1);
            doneGroups.add(bond.dest);
          }
          stack.push(bond.dest);
        }
        elements.push(groupElements);
        stack[i] = NaN;
        doneGroups.add(group.ID);
      }
    }
    let string = '', lastSegment: string, segCount = 0;
    elements.forEach((map, ei) => {
      let j = 0, segStr = '';
      map.forEach((count, el) => {
        let str = count === 1 ? el : el + (html ? "<sub>" + numstr(count) + "</sub>" : count.toString());
        if (j > 0 && j < map.size - 1 && count > 1) str = "(" + str + ")";
        j++;
        segStr += str;
      });
      if (collapseSucecssiveGroups) {
        if (lastSegment === undefined) {
          lastSegment = segStr;
          segCount = 1;
        } else if (segStr === lastSegment) {
          segCount++;
        } else {
          string += segCount === 1 ? lastSegment : "(" + lastSegment + ")" + (html ? "<sub>" + numstr(segCount) + "</sub>" : segCount.toString());
          lastSegment = segStr;
          segCount = 1;
        }
      } else {
        string += segStr;
      }
    });
    if (collapseSucecssiveGroups && segCount !== 0) {
      string += segCount === 1 ? lastSegment : "(" + lastSegment + ")" + (html ? "<sub>" + numstr(segCount) + "</sub>" : segCount.toString());
    }
    return string;
  }

  /** Generate SMILES string from parsed data.
   * @param showImplicits - Render implicit groups? (if .isImplicit === true)
  */
  public generateSMILES(showImplicits = false): string {
    if (Object.keys(this.groups).length === 0) return "";

    /** Assemble and return SMILES string from a StackItem */
    const assembleSMILES = (item: IGenerateSmilesStackItem): string => {
      item.smilesChildren = item.smilesChildren.filter(x => x.length > 0);
      let lastChild = item.smilesChildren.pop();
      return item.smiles + item.smilesChildren.map(x => `(${x})`).join('') + (lastChild || '');
    };

    let smiles = '';
    const stack: IGenerateSmilesStackItem[] = [];
    const doneGroups = new Set<number>();
    stack.push(createGenerateSmilesStackItemObject(+Object.keys(this.groups)[0])); // Add root group

    while (stack.length !== 0) {
      const i = stack.length - 1;
      if (stack[i].handled) {
        // Handled; remove from array
        if (stack[i].parent !== undefined) {
          let j = stack[i].parent;
          stack[j].smilesChildren.push(assembleSMILES(stack[i]));
        } else {
          smiles = assembleSMILES(stack[i]) + smiles;
        }
        stack.splice(i, 1);
      } else {
        const group = this.groups[stack[i].group];
        if (doneGroups.has(group.ID)) {
          stack[i].handled = true;
        } else {
          // Shall we render this?
          const render = !group.isImplicit || (group.isImplicit && showImplicits);
          if (render) {
            let bond = stack[i].bond && stack[i].bond !== '-' ? (stack[i].bond === ":" && this.groups[stack[i].group].isLowercase ? "" : stack[i].bond) : ''; // Get bond between molecules. If aromatic bond and lowercase, ignore
            stack[i].smiles += bond;
            stack[i].smiles += group.toString();
            if (group.ringDigits.length !== 0) stack[i].smiles += group.ringDigits.map(n => '%' + n).join('');
          }
          stack[i].handled = true;

          // Bonds (add in reverse as topmost is processed first)
          const bonds = this.getAllBonds(group.ID);
          for (let j = bonds.length - 1; j >= 0; j--) {
            const obj = bonds[j];
            if (!doneGroups.has(obj.dest)) {
              stack.push(createGenerateSmilesStackItemObject(obj.dest, i, obj.bond));
            }
          }

          doneGroups.add(group.ID);
        }
      }
    }
    return smiles;
  }

  /** Find all paths from one group to another. Return array of bond position IDs. Only visit groups whose IDs are in availableGroups */
  public pathfind(startID: number, endID: number, availableGroups?: number[]) {
    const paths: number[][] = [];
    const current: number[] = []; // Current path (bond indexes from startID)
    const currGroups: number[] = [] // Stack of groups so we can backtrack
    const explored = new Map<number, number>(); // Maps group ID to the bond it should start iterating at
    const allBonds = new Map<number, IBond[]>(); // Map all group IDs to (full) bond array
    for (let gid in this.groups) {
      explored.set(+gid, 0);
      allBonds.set(+gid, this.getAllBonds(+gid));
    }

    currGroups.push(startID);

    while (currGroups.length > 0) {
      const gid = currGroups[currGroups.length - 1];
      if (gid === endID) { // At end?
        paths.push([ ...current ]);
        current.pop();
        currGroups.pop();
      } else {
        // Explore each bond
        const bonds = allBonds.get(gid), bi = explored.get(gid);
        if (bi < bonds.length) {
          if (bonds[bi].dest === currGroups[currGroups.length - 2] || availableGroups?.indexOf(bonds[bi].dest) === -1) { // Backtrack or out of bounds?
            // Pass
          } else {
            current.push(bi);
            currGroups.push(bonds[bi].dest);
          }
          explored.set(gid, bi + 1); // Iterate to next bond
        } else { // Fully explored from this group
          currGroups.pop();
          current.pop();
        }
      }
    }

    return paths;
  }

  /** From starting group ID, given an array of bond indexes to follow (all bonds from this.getAllBonds) return array of group IDs */
  public traceBondPath(startID: number, path: number[]) {
    return path.reduce((p, c, i) => p.push(this.getAllBonds(p[i])[c].dest) && p, [startID]);
  }

  /** Return position vectors of each Group around (0,0) */
  public getGroupPositions(ctx: OffscreenCanvasRenderingContext2D, re?: IRenderOptions) {
    if (Object.keys(this.groups).length === 0) return {};
    if (re === undefined) re = defaultRenderOptsObject;

    const collision = (rec: IRec) => Object.values(posData).find(rec2 => rec.x < rec2.x + rec2.w && rec.x + rec.w > rec2.x && rec.y < rec2.y + rec2.h && rec.h + rec.y > rec2.y) ?? false;
    const posData: { [gid: number]: IRec } = {};
    const processStack: number[] = []; // Stack of group IDs to process
    const doneGroups = new Set<number>();
    const inRings = new Set<number>(); // Set of all groups which have been sorted into a ring structure
    const rings = new Map<number, { minX: number, maxX: number, minY: number, maxY: number }>();
    const angles = new Map<number, [number, number]>(); // Group IDs to angle [start, end]
    let iters = 0;
    
    // For each group, populate text width/height
    for (let id in this.groups) {
      angles.set(+id, [0, 2*Math.PI]);
      let { width: w, height: h } = this.groups[+id].getRenderAsTextDimensions(ctx, re, re.renderImplicit && re.collapseH ? this.getAllBonds(+id).filter(bond => this.groups[bond.dest].isImplicit && this.groups[bond.dest].isElement("H")).length : 0);
      posData[id] = { x: NaN, y: NaN, w, h };
    }

    // Start with forst group
    let gid = +Object.keys(this.groups)[0];
    processStack.push(gid);
    posData[gid].x = 0;
    posData[gid].y = 0;

    while (processStack.length !== 0) {
      const gid = processStack.pop();
      if (!doneGroups.has(gid)) {
        const rec = posData[gid]; // Current position vector
        // Get bonds
        let bonds = this.getAllBonds(gid);
        if (!re.renderImplicit) bonds = bonds.filter(bond => !this.groups[bond.dest].isImplicit);
        else if (re.collapseH) bonds = bonds.filter(bond => !(this.groups[bond.dest].isImplicit && this.groups[bond.dest].isElement("H")));

        const ring = this.rings.find(ring => ring.members.some(mid => mid === gid));
        if (ring) {
          if (!rings.has(ring.ID)) {
            const interior = 2*Math.PI / ring.members.length; // Interior angle
            const rot = Math.PI/2 - interior/2;
            const ext = Math.PI - 2*rot;
            let angle = angles.get(gid)[0] + rot;
            let x = rec.x, y = rec.y, minX = x, maxX = x, minY = y, maxY = y;
            for (let k = 0; k < ring.members.length; k++) {
              inRings.add(ring.members[k]);
              const rec = posData[ring.members[k]];
              let [dx, dy] = rotateCoords(re.bondLength + rec.w, angle);
              rec.x = x;
              rec.y = y;
              if (x > maxX) maxX = x;
              if (x < minX) minX = x;
              if (y > maxY) maxY = y;
              if (y < minY) minY = y;
              x += dx;
              y += dy;
              angles.set(ring.members[k], re.ringRestrictAngleSmall ? [angle + Math.PI, angle + ext] : [angle, angle + 2*(Math.PI - ext)]);
              angle -= ext;
            }
            rings.set(ring.ID, { minX, maxX, minY, maxY });
          }
        }

        let [ θu, θv ] = angles.get(gid); // Start/end angle
        let df = (iters === 0 ? bonds.length : bonds.length - 1);
        // bonds.filter(bond => !inRings.has(bond.dest)).length;
        let θi = (θv - θu) / df; // angle increment
        // console.log({ θu, θv, df, θi });
        for (let i = 0, θ = θu; i < bonds.length; i++) {
          let did = bonds[i].dest, θc = θ; // Copy angle
          if (!doneGroups.has(did)) {
            // Avoid collisions
            if (!inRings.has(did)) {
              let bondLength = re.bondLength + rec.w / 2 + posData[did].w / 2; // Account for overlap from text
              let num = 1, denom = 1; // For finding fraction of angle
              let x: number, y: number;
              while (true) {
                ([x, y] = rotateCoords(bondLength, θc));
                const rec1 = { ...rec };
                rec1.x += x;
                rec1.y += y;
                if (collision(rec1)) {
                  θc += θi * (num / denom);
                  if (num >= denom) {
                    denom++;
                    num = 1;
                  } else {
                    num++;
                  }
                } else break;
              }
              posData[did].x = rec.x + x;
              posData[did].y = rec.y + y;
            }
            processStack.push(did);
            θ += θi; // Increase angle
          }
        }
        doneGroups.add(gid);
        iters++;
      }
    }
    return { pos: posData, rings, angles };
  }

  /** Return image of rendered molecule */
  public render(ctx: OffscreenCanvasRenderingContext2D, re?: IRenderOptions): ImageData {
    if (Object.values(this.groups).length === 0) return ctx.createImageData(1, 1); // "Empty" image
    if (re === undefined) re = createRenderOptsObject();
    const { pos: positions, rings, angles } = this.getGroupPositions(ctx, re), rects = Object.values(positions);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const rec of rects) {
      if (rec.x - rec.w / 2 < minX) minX = rec.x - rec.w / 2;
      if (rec.x + rec.w / 2 > maxX) maxX = rec.x + rec.w / 2;
      if (rec.y - rec.h / 2 < minY) minY = rec.y - rec.h / 2;
      if (rec.y + rec.h / 2 > maxY) maxY = rec.y + rec.h / 2;
    }
    rings.forEach((obj, id) => {
      if (obj.minX < minX) minX = obj.minX;
      if (obj.maxX > maxX) maxX = obj.maxX;
      if (obj.minY < minY) minY = obj.minY;
      if (obj.maxY > maxY) maxY = obj.maxY;
    });
    minX -= re.moleculePadding;
    maxX += re.moleculePadding;
    minY -= re.moleculePadding;
    maxY += re.moleculePadding;

    // Make sure no coordinate is negative!
    let dx = Math.abs(minX), dy = Math.abs(minY);
    for (const rec of rects) {
      rec.x += dx;
      rec.y += dy;
    }
    rings.forEach(obj => {
      obj.minX += dx;
      obj.maxX += dx;
      obj.minY += dy;
      obj.maxY += dy;
    });

    // Fill background
    ctx.fillStyle = re.bg;
    ctx.fillRect(0, 0, maxX - minX, maxY - minY);

    // Bonds
    ctx.strokeStyle = re.defaultAtomColor;
    ctx.lineWidth = re.bondWidth;
    const GSTART = 0.35, GSTOP = 0.65;
    for (const id in positions) {
      if (positions[id] && !isNaN(positions[id].x) && !isNaN(positions[id].y)) {
        const c1 = this.groups[id].getRenderColor(re);
        for (const bond of this.groups[id].bonds) {
          if (positions[bond.dest] && !isNaN(positions[bond.dest].x) && !isNaN(positions[bond.dest].y)) {
            const c2 = this.groups[bond.dest].getRenderColor(re);

            if (bond.bond === "-" || bond.bond === "#" || bond.bond === ":") {
              let grad = ctx.createLinearGradient(positions[id].x, positions[id].y, positions[bond.dest].x, positions[bond.dest].y);
              grad.addColorStop(GSTART, c1);
              grad.addColorStop(GSTOP, c2);
              ctx.strokeStyle = grad;
              ctx.beginPath();
              ctx.moveTo(positions[id].x, positions[id].y);
              ctx.lineTo(positions[bond.dest].x, positions[bond.dest].y);
              ctx.stroke();
            }
            if (bond.bond === "=" || bond.bond === "#") {
              let θ = Math.atan2(positions[bond.dest].y - positions[id].y, positions[bond.dest].x - positions[id].x);
              let x = re.bondGap * Math.sin(θ), y = re.bondGap * Math.cos(θ);
              let grad = ctx.createLinearGradient(positions[id].x - x, positions[id].y - y, positions[bond.dest].x - x, positions[bond.dest].y - y);
              grad.addColorStop(GSTART, c1);
              grad.addColorStop(GSTOP, c2);
              ctx.strokeStyle = grad;
              ctx.beginPath();
              ctx.moveTo(positions[id].x - x, positions[id].y - y);
              ctx.lineTo(positions[bond.dest].x - x, positions[bond.dest].y - y);
              ctx.stroke();

              grad = ctx.createLinearGradient(positions[id].x + x, positions[id].y + y, positions[bond.dest].x + x, positions[bond.dest].y + y);
              grad.addColorStop(GSTART, c1);
              grad.addColorStop(GSTOP, c2);
              ctx.strokeStyle = grad;
              ctx.beginPath();
              ctx.moveTo(positions[id].x + x, positions[id].y + y);
              ctx.lineTo(positions[bond.dest].x + x, positions[bond.dest].y + y);
              ctx.stroke();
            }
          }
        }
      }
    }

    // Loop through rings
    rings.forEach(({ minX, maxX, minY, maxY }, id) => {
      const ring = this.rings.find(r => r.ID === id);
      const rx = (maxX - minX) / 2, ry = (maxY - minY) / 2;
      // Aromatic?
      if (ring.isAromatic) {
        ctx.beginPath();
        ctx.lineWidth = re.bondWidth;
        ctx.strokeStyle = re.defaultAtomColor;
        const r = Math.min(rx * re.aromaticRingDist, ry * re.aromaticRingDist);
        ctx.arc(minX + rx, minY + ry, r, 0, 2 * Math.PI);
        ctx.stroke();
      }
      // Debug: show ID?
      if (re.debugShowRingIDs) {
        ctx.font = re.debugFont.toString();
        ctx.fillStyle = "mediumblue";
        ctx.fillText(id.toString(), minX + rx, minY + ry);
      }
    });

    // Render groups
    for (const id in positions) {
      let rec = positions[id], group = this.groups[id], P = 4, extraHs = 0;
      if (re.renderImplicit && re.collapseH) extraHs = this.getAllBonds(group.ID).filter(bond => (this.groups[bond.dest].isImplicit ? re.renderImplicit : false) && this.groups[bond.dest].isElement("H")).length;
      ctx.fillStyle = re.bg;
      ctx.fillRect(rec.x - rec.w / 2 - P, rec.y - rec.h / 2 - P, rec.w + 2 * P, rec.h + 2 * P);
      group.renderAsText(ctx, { x: rec.x - rec.w / 2, y: rec.y + rec.h * 0.25 }, re, extraHs);

      if (group.isRadical) {
        ctx.beginPath();
        ctx.fillStyle = group.getRenderColor();
        ctx.arc(rec.x, rec.y - rec.h / 2 + re.radicalRadius, re.radicalRadius, 0, 2*Math.PI);
        ctx.fill();
      }

      if (re.debugShowGroupIDs) {
        ctx.fillStyle = "mediumblue";
        ctx.font = re.debugFont.toString();
        ctx.fillText(group.ID.toString(), rec.x + rec.w / 2, rec.y);
      }
      if (re.debugGroupBoundingBoxes) {
        ctx.strokeStyle = "#FF00FF";
        ctx.strokeRect(rec.x - rec.w / 2, rec.y - rec.h / 2, rec.w, rec.h);
      }
    }

    // Angles?
    if (re.debugShowAngles) {
      ctx.font = re.debugFont.toString();
      let L = re.bondLength * 0.3, LINES = 5;
      angles.forEach(([u, v], id) => {
        if (this.groups[id].isImplicit) return;
        const { x, y } = positions[id];
        ctx.beginPath();
        ctx.strokeStyle = "blue";
        let [rx, ry] = rotateCoords(L, u);
        ctx.moveTo(x, y);
        ctx.lineTo(x + rx, y + ry);
        ctx.stroke();
        ctx.strokeText(u.toFixed(1), x + rx, y + ry);
        ctx.beginPath();
        ctx.strokeStyle = "red";
        ([rx, ry] = rotateCoords(L, v));
        ctx.moveTo(x, y);
        ctx.lineTo(x + rx, y + ry);
        ctx.stroke();
        ctx.strokeText(v.toFixed(1), x + rx, y + ry);
        ctx.strokeStyle = "green";
        let ai = (v - u) / (LINES + 1);
        for (let i = 0, a = u; i < (LINES + 1); i++, a += ai) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ([ rx, ry ] = rotateCoords(L / 3, a));
          ctx.lineTo(x + rx, y + ry);
          ctx.stroke();
        }
      });
    }

    // Return bounding box
    return ctx.getImageData(0, 0, maxX - minX, maxY - minY);
  }
}