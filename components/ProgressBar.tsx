'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  atual: number;
  total: number;
}

export default function ProgressBar({ atual, total }: ProgressBarProps) {
  const pct = Math.round((atual / total) * 100);

  return (
    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-green-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}
