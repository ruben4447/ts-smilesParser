type FontStyle = "normal" | "italic" | "oblique";
type FontVariant = "normal" | "small-caps";
type FontWeight = "lighter" | "normal" | "bold" | "bolder" | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export class Font {
    public style: FontStyle = "normal";
    public variant: FontVariant = "normal";
    public weight: FontWeight = "normal";
    public size: number = 10;
    public sizeUnits: string = "px";
    public family: string = "sans-serif";

    constructor() {
        this.toDefault();
    }

    /** Return string representation of font (CSS font string) */
    public toString(): string {
        return `${this.style} ${this.variant} ${this.weight} ${this.size}${this.sizeUnits} ${this.family}`;
    }

    /** Apply font to a Canvas 2D Context */
    public apply(ctx: CanvasRenderingContext2D): void {
        ctx.font = this.toString();
    }

    /** Reset Font to default */
    public toDefault() {
        this.style = "normal";
        this.variant = "normal";
        this.weight = "normal";
        this.size = 10;
        this.sizeUnits = 'px';
        this.family = "sans-serif";
    }

    /** Return copy of this font */
    public clone(): Font {
        const font = new Font();
        font.style = this.style;
        font.variant = this.variant;
        font.weight = this.weight;
        font.size = this.size;
        font.sizeUnits = this.sizeUnits;
        font.family = this.family;
        return font;
    }

    /** @chainable option to set properties */
    public set(prop: keyof Font, value: any) {
        if (prop in this) {
            (this as any)[prop] = value;
            return this;
        } else {
            throw new Error(`Property '${prop}' does not exist`);
        }
    }

    /** Get new Font from a CSS font string */
    public static fromString(string: string): Font {
        const div = document.createElement("div"), font = new Font();
        div.style.font = string;

        font.style = div.style.fontStyle as FontStyle;
        font.variant = div.style.fontVariant as FontVariant;
        font.weight = div.style.fontWeight as FontWeight;
        let [size, units] = div.style.fontSize.split(/(?<=[0-9\.])(?=[A-Za-z])/);
        font.size = +size;
        font.sizeUnits = units ?? 'px';
        font.family = div.style.fontFamily;
        return font;
    }
}