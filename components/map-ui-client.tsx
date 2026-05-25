"use client";

import dynamic from "next/dynamic";

const MapUIClient = dynamic(() => import("./map-ui"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-slate-950" />,
});

export default MapUIClient;
