import { styleText } from "node:util";

export const dim = (text: string) => styleText("dim", text);
export const bold = (text: string) => styleText("bold", text);

/** Wrap prose to a width, so a long reason reads as a paragraph. */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
