import { useEffect, useRef, useState } from "react";

/**
 * Hook de contador animado — conta de 0 até ao valor alvo.
 * Usado nos KPIs do dashboard para dar vida aos números.
 */
export function useCountUp(
  target: number,
  options: { duration?: number; delay?: number; decimals?: number } = {},
) {
  const { duration = 900, delay = 0, decimals = 0 } = options;
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }

    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startRef.current) startRef.current = timestamp;
        const progress = Math.min((timestamp - startRef.current) / duration, 1);
        // Easing: ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(parseFloat((eased * target).toFixed(decimals)));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        } else {
          setValue(target);
        }
      };
      startRef.current = null;
      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay, decimals]);

  return value;
}
