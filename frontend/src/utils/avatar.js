export const getTwoLetterInitials = (name = "") => {
  const raw = String(name || "").trim();

  if (!raw) {
    return "NA";
  }

  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  const alphanumeric = raw.replace(/[^a-zA-Z0-9]/g, "");
  if (alphanumeric.length >= 2) {
    return alphanumeric.slice(0, 2).toUpperCase();
  }

  if (alphanumeric.length === 1) {
    return `${alphanumeric}${alphanumeric}`.toUpperCase();
  }

  return "NA";
};

export const getTwoLetterAvatarUrl = (name = "") => {
  const initials = getTwoLetterInitials(name);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    initials
  )}&background=random&color=fff`;
};
