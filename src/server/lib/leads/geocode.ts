import { z } from "zod";
import { AppError } from "@/server/lib/errors";

// Turns a typed place ("Austin, TX", "Kadıköy, İstanbul") into the coordinate
// the business listings search needs. OpenStreetMap Nominatim is free and has
// no key; its usage policy asks for an identifying User-Agent and light use,
// which one lookup per user-started search satisfies.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const resultSchema = z.array(
  z.object({
    lat: z.string(),
    lon: z.string(),
    display_name: z.string(),
  }),
);

type GeocodedPlace = {
  latitude: number;
  longitude: number;
  label: string;
};

export async function geocodePlace(query: string): Promise<GeocodedPlace> {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "MericSEO-LeadFinder/1.0 (https://seo.mericozyon.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6_000),
    });
  } catch {
    throw new AppError("LEAD_LOCATION_NOT_FOUND");
  }
  if (!response.ok) throw new AppError("LEAD_LOCATION_NOT_FOUND");

  const parsed = resultSchema.safeParse(await response.json());
  const first = parsed.success ? parsed.data[0] : undefined;
  if (!first) throw new AppError("LEAD_LOCATION_NOT_FOUND");

  return {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    label: first.display_name,
  };
}
