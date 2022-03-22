var ID = 0;
export class Ring {
  public members: number[] = [];
  public readonly ID: number;
  public readonly digit: number; // Digit which was associated with the ring at parse-time

  constructor(digit: number) {
    this.ID = ID++;
    this.digit = digit;
  }
}

export default Ring;