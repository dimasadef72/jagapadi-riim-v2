export const dynamic = "force-dynamic";

type NominatimReverseResponse = {
  display_name?: string;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const addressCache = new Map<
  string,
  {
    displayName: string | null;
    expiresAt: number;
  }
>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json(
      { error: "Koordinat tidak valid." },
      { status: 400 },
    );
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/reverse");
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("lat", lat.toString());
  nominatimUrl.searchParams.set("lon", lon.toString());
  nominatimUrl.searchParams.set("zoom", "18");
  nominatimUrl.searchParams.set("addressdetails", "1");

  const cacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  const cached = addressCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return Response.json({
      displayName: cached.displayName,
    });
  }

  try {
    const response = await fetch(nominatimUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "id,en;q=0.8",
        "User-Agent": "JagapadiRIIM/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { error: `Reverse geocoding gagal (${response.status}).` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as NominatimReverseResponse;
    const displayName = data.display_name ?? null;
    addressCache.set(cacheKey, {
      displayName,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return Response.json({
      displayName,
    });
  } catch {
    return Response.json(
      { error: "Gagal menghubungi layanan alamat." },
      { status: 502 },
    );
  }
}
