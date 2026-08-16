import type { MediaType } from "@/types";

export function mediaMatch(mediaType: MediaType) {
  if (mediaType === "tv") {
    return { mediaType: "tv" };
  }

  return { mediaType: { $in: ["movie", null] } };
}

export function mediaEquals(mediaType: MediaType) {
  if (mediaType === "tv") {
    return "tv";
  }

  return { $in: ["movie", null] };
}