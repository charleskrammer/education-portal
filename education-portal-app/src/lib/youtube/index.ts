export const getYouTubeId = (url: string): string => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host === "youtu.be") {
      return parsed.pathname.replace("/", "");
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (parsed.pathname.startsWith("/watch")) {
        return parsed.searchParams.get("v") ?? "";
      }

      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] ?? "";
      }

      if (parsed.pathname.startsWith("/live/")) {
        return parsed.pathname.split("/")[2] ?? "";
      }
    }
  } catch {
    return "";
  }

  return "";
};
