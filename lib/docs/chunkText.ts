export function chunkText(text: string, chunkSize = 600) {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += chunkSize) {
    chunks.push(words.slice(index, index + chunkSize).join(" "));
  }

  return chunks;
}
