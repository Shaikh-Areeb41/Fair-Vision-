import { motion, useReducedMotion } from "framer-motion";
import React from "react";

interface PageTransitionProps {
  children: React.ReactNode;
}

// Centralized page transition variants aligned with 2025 SaaS motion patterns
// Using an ease-out expo for entry and a slightly faster ease-in for exit.
const variants = {
  initial: { opacity: 0, y: 16, scale: 0.985 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.985,
    transition: {
      duration: 0.35,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <>{children}</>; // Respect user preference, no animation.
  }
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
};
