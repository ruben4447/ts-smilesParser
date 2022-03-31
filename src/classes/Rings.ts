var ID = 0;
export class Ring {
  public members: number[] = [];
  public readonly ID: number;
  public readonly digit: number; // Digit which was associated with the ring at parse-time
  public start: number; // ID of starting group
  public end: number | undefined = undefined; // ID of ending group
  public isAromatic: boolean | undefined;

  constructor(digit: number, startID: number) {
    this.ID = ID++;
    this.digit = digit;
    this.start = startID;
  }
}

export default Ring;