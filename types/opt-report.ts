export type OptYearMetadata = {
  tahun: number;
  rowCount: number;
  bucket?: string;
  storagePath?: string;
  fileName: string;
  publicUrl: string;
  fileSizeBytes: number;
  sourceFile?: string;
  schemaVersion?: number;
  updatedAt: string;
};

export type OptActiveItem = {
  nama: string;
  luas: number;
};

export type OptWeather = {
  temp: number;
  humidity: number;
  precip: number;
  windspeed: number;
  vpd: number;
  lwd: number;
};

export type OptReportRow = {
  id: string;
  sourceRowNumber: number;
  tahun: number;
  bulan: number;
  periode: string;
  mt: string;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  latitude: number;
  longitude: number;
  komoditas: string;
  lt: number;
  opt: string;
  ssr: number;
  sss: number;
  ssb: number;
  ssp: number;
  ssj: number;
  terkendali: number;
  panen: number;
  intensitas: number;
  ltsr: number;
  ltss: number;
  ltsb: number;
  ltsp: number;
  ltsj: number;
  kimia: number;
  hayati: number;
  eradikasi: number;
  cl: number;
  jumlahPengendali: number;
  lksr: number;
  lkss: number;
  lksb: number;
  lksp: number;
  lksj: number;
  waspada: number;
  tingkatKeparahan: string;
  aktifOpt: OptActiveItem[];
  cuaca: OptWeather;
  temp: number;
  humidity: number;
  precip: number;
  windspeed: number;
  vpd: number;
  lwd: number;
};
