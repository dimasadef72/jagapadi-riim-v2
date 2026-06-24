"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { Activity, Sprout, Wheat } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } // Custom spring-like easing
  },
};

const clusterTiles = [
  "bg-emerald-300/85",
  "bg-lime-300/80",
  "bg-amber-300/85",
  "bg-teal-300/80",
  "bg-emerald-500/85",
  "bg-yellow-300/80",
  "bg-green-200/85",
  "bg-rose-300/80",
  "bg-cyan-200/80",
];

const loadingAnimationDelay = 1.15;

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    // Keep the product mark readable before handing control back to the app shell.
    const timer = setTimeout(() => {
      onComplete();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#04150f]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(250,204,21,0.14),transparent_28%),linear-gradient(135deg,rgba(5,46,22,0.96),rgba(4,21,15,1)_48%,rgba(9,51,45,0.96))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(187,247,208,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(187,247,208,0.3)_1px,transparent_1px)] [background-size:46px_46px]" />
      <motion.div
        aria-hidden="true"
        animate={{ opacity: [0.18, 0.38, 0.18], scale: [1, 1.04, 1] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(78vw,680px)] w-[min(78vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/20 bg-emerald-400/10 blur-3xl"
      />
      <motion.div
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute h-[min(92vw,560px)] w-[min(92vw,560px)] rounded-full border border-dashed border-emerald-200/20"
      />

      <motion.div 
        variants={containerVariants}
        className="relative flex w-full max-w-4xl flex-col items-center justify-center px-6"
      >
        <motion.div variants={itemVariants} className="flex flex-col items-center">
          <div className="relative mb-8 inline-flex">
            <motion.div 
              animate={{ scale: [1, 1.18, 1], opacity: [0.18, 0.42, 0.18] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-amber-300 blur-2xl"
            />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-[32px] border border-amber-300/35 bg-gradient-to-br from-green-950 via-emerald-900 to-teal-900 shadow-[0_22px_70px_rgba(16,185,129,0.28)]">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <Wheat className="h-16 w-16 text-amber-300 drop-shadow-[0_0_14px_rgba(252,211,77,0.58)]" strokeWidth={1.35} />
                <Sprout className="absolute -bottom-2 -right-3 h-7 w-7 text-emerald-200" strokeWidth={1.6} />
              </motion.div>
            </div>
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.26em] text-emerald-100/85 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-md">
            <Activity className="h-3.5 w-3.5 text-amber-300" strokeWidth={2} />
            NDVI Spatial Intelligence
          </div>

          <h1 className="select-none text-center font-sans text-[clamp(2.45rem,10vw,6.4rem)] font-black leading-none tracking-normal text-transparent bg-clip-text bg-gradient-to-br from-white via-emerald-100 to-amber-100 drop-shadow-2xl">
            JAGAPADI<span className="text-amber-300">Cluster</span>
          </h1>
          <div className="mt-7 h-1 w-36 rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-teal-300 shadow-[0_0_22px_rgba(52,211,153,0.48)]" />
        </motion.div>

        <motion.div variants={itemVariants} className="mt-7 text-center">
          <p className="max-w-xl select-none text-sm font-medium leading-relaxed tracking-wide text-emerald-50/88 md:text-base">
            Platform pemantauan lahan padi berbasis cluster, NDVI, dan data OPT untuk keputusan lapang yang lebih presisi.
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-9 grid grid-cols-9 gap-1.5 rounded-2xl border border-emerald-100/15 bg-black/18 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-md"
        >
          {clusterTiles.map((tileClass, index) => (
            <motion.div
              key={`${tileClass}-${index}`}
              animate={{ opacity: [0.45, 1, 0.45], scale: [0.92, 1, 0.92] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.12,
              }}
              className={`h-4 w-4 rounded-[4px] shadow-[0_0_18px_rgba(132,204,22,0.28)] md:h-5 md:w-5 ${tileClass}`}
            />
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col items-center space-y-4 pt-9">
          <div className="relative h-2 w-56 overflow-hidden rounded-full bg-emerald-950/70 ring-1 ring-emerald-100/10">
            <motion.div
              className="absolute inset-y-0 left-0 origin-left overflow-hidden rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-teal-300 shadow-[0_0_18px_rgba(252,211,77,0.7)]"
              initial={{ scaleX: 0.08 }}
              animate={{ scaleX: 1 }}
              transition={{
                delay: loadingAnimationDelay,
                duration: 3.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ width: "100%" }}
            >
              <motion.div
                className="absolute inset-y-0 w-20 rounded-full bg-white/55 blur-sm"
                initial={{ x: -96, opacity: 0 }}
                animate={{ x: 260, opacity: [0, 0.72, 0] }}
                transition={{
                  delay: loadingAnimationDelay,
                  duration: 1.65,
                  repeat: Infinity,
                  repeatDelay: 0.28,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute right-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-100 shadow-[0_0_14px_rgba(254,243,199,0.95)]"
                animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.25, 0.8] }}
                transition={{
                  delay: loadingAnimationDelay,
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </div>
          <span className="animate-pulse text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/70">
            Sinkronisasi data cluster
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
