"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { Wheat } from "lucide-react";

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

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    // Dismiss the splash screen after 4.5 seconds to allow reading the subtitle
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
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#061810]"
    >
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/50 via-transparent to-teal-950/80 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        className="flex flex-col items-center justify-center space-y-8"
      >
        <motion.div variants={itemVariants} className="flex flex-col items-center">
          {/* Animated Logo Container */}
          <div className="relative inline-flex mb-8">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-amber-400 rounded-full blur-xl"
            />
            <div className="relative bg-gradient-to-tr from-green-950 to-emerald-900 p-6 rounded-full border border-amber-500/30 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
              <Wheat className="w-14 h-14 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-sans font-black text-transparent bg-clip-text bg-gradient-to-br from-green-50 to-emerald-200 tracking-[0.2em] drop-shadow-2xl select-none">
            JAGA PADI
          </h1>
          <div className="w-24 h-1 mt-8 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
        </motion.div>

        <motion.div variants={itemVariants} className="text-center px-6">
          <p className="text-emerald-100/90 text-sm md:text-base font-medium tracking-wide max-w-md leading-relaxed select-none">
            Penelitian Riset dan Inovasi untuk Indonesia Maju (RIIM)
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="pt-8 flex flex-col items-center space-y-4">
          <div className="w-48 h-1.5 bg-emerald-950/50 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute top-0 left-0 h-full bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 4.2, ease: "easeInOut" }}
            />
          </div>
          <span className="text-emerald-400/80 text-xs font-semibold tracking-[0.2em] uppercase animate-pulse">
            loading.
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
