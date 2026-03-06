/**
 * Convert \[...\] → $$...$$ and \(...\) → $...$
 * so remark-math (which only supports $ delimiters) can parse them.
 */
export function preprocessMath(content: string): string {
  // Convert \[...\] display math to $$...$$
  let result = content.replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner) => {
    return `$$${inner}$$`;
  });

  // Convert \(...\) inline math to $...$
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_match, inner) => {
    return `$${inner}$`;
  });

  return result;
}
