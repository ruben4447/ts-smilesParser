var ID = 0;
export class Ring {
  public members: number[] = [];
  public readonly ID: number;
  public readonly digit: number; // Digit which was associated with the ring at parse-time
  public isAromatic: boolean;

  constructor(digit: number) {
    this.ID = ID++;
    this.digit = digit;
    this.isAromatic = false;
  }
}

export default Ring;