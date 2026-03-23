export const capitalize = (word) => {
  const safeWord = String(word || "").trim();
  if (!safeWord) return "";
  return safeWord[0].toUpperCase() + safeWord.substring(1).toLowerCase();
};
