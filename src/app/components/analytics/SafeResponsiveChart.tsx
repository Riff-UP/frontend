'use client';

import { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer } from 'recharts';

interface SafeResponsiveChartProps {
  children: React.ReactElement;
  className?: string;
}

export default function SafeResponsiveChart({ children, className = 'w-full h-64 sm:h-80' }: SafeResponsiveChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      const { width, height } = node.getBoundingClientRect();
      setIsReady(width > 0 && height > 0);
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(node);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <div ref={containerRef} className={`min-w-0 ${className}`}>
      {isReady ? <ResponsiveContainer width="100%" height="100%" minWidth={0}>{children}</ResponsiveContainer> : null}
    </div>
  );
}

