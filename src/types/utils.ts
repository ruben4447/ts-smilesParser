export interface IExtractBetweenInformation {
  input: string;
  startIndex: number;
  endIndex: number;
  extracted: string;
  remaining: string;
  openCount: number; // How many 'open's are there still (if !== 0, means ubclosed bracket)
}

export interface IParseInorganicString {
  elements: string[];
  charge: number;
  endIndex: number;
  error?: string; // Error message if any
}