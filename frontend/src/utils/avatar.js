export const getTwoLetterInitials = (name = "User") => {
  const cleaned = String(name).trim().replace(/\s+/g, "");
  const value = cleaned.slice(0, 2).toUpperCase();
  return value || "US";
};

export const getTwoLetterAvatarUrl = (name = "User") => {
  const initials = getTwoLetterInitials(name);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    initials
  )}&background=random&color=fff`;
};
