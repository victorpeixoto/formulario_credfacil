'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface CardWrapperProps {
  children: React.ReactNode;
  cardKey: string | number;
}

const variants = {
  enter: { x: '100%', opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: '-100%', opacity: 0 },
};

export default function CardWrapper({ children, cardKey }: CardWrapperProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={cardKey}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="w-full h-full flex flex-col justify-center px-6 py-10"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
