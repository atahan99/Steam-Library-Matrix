export const normalizeGameName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[™®©:]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
