export type MapMode = "default" | "fase1" | "inspection" | "fase2-ndvi" | "fase2-hama";

export interface SelectedMapFeature {
  id: string;
  mode: MapMode;
  coordinates: [number, number];
  data: any;
}

export type MenuRoute = "/overview" | "/maps" | "/fase-1/ndvi" | "/fase-2/ndvi" | "/fase-2/hama" | "/settings";
