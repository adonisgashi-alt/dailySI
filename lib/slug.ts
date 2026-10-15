// Readable story URLs: /story/<headline-words>-<id>. The id at the end is what
// identifies the story, so links keep working if the headline changes.

export function slugify(text: string, maxLen = 80): string {
  const s = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’‘`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  return cut.slice(0, cut.lastIndexOf("-") > 20 ? cut.lastIndexOf("-") : maxLen).replace(/-+$/, "");
}

export const storySlug = (s: { id: string; headline: string }) => `${slugify(s.headline) || "story"}-${s.id}`;

export const storyPath = (s: { id: string; headline: string }) => `/story/${storySlug(s)}`;

/** The story id from a URL segment: "headline-words-<id>" or a bare "<id>". */
export const idFromSlug = (param: string) => param.slice(param.lastIndexOf("-") + 1);
