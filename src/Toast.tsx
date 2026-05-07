import { useState, useRef, type PointerEvent } from 'react';

const DISMISS_THRESHOLD = 80;
const EXIT_DISTANCE = 600;

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const startXRef = useRef<number | null>(null);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (isExiting) return;
    startXRef.current = e.clientX;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore — capture is a hint */
    }
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || startXRef.current === null) return;
    setDragX(e.clientX - startXRef.current);
  };

  const finishDrag = (commit: boolean) => {
    setIsDragging(false);
    startXRef.current = null;
    if (commit && Math.abs(dragX) > DISMISS_THRESHOLD) {
      const direction = dragX > 0 ? 1 : -1;
      setIsExiting(true);
      setDragX(direction * EXIT_DISTANCE);
      window.setTimeout(onDismiss, 200);
    } else {
      setDragX(0);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    finishDrag(true);
  };

  const handlePointerCancel = () => {
    if (!isDragging) return;
    finishDrag(false);
  };

  const opacity = isExiting ? 0 : Math.max(0.4, 1 - Math.abs(dragX) / 300);
  const transitionStyle = isDragging ? 'none' : 'transform 200ms ease-out, opacity 200ms ease-out';
  const showBounce = !isDragging && !isExiting && dragX === 0;

  return (
    <div
      className="fixed top-10 left-1/2 z-50 touch-pan-y select-none"
      style={{
        transform: `translate(calc(-50% + ${dragX}px), 0)`,
        opacity,
        transition: transitionStyle,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        className={`bg-pancake-gold text-pancake-brown font-bold px-6 py-3 rounded-full shadow-lg text-sm md:text-base whitespace-nowrap ${showBounce ? 'animate-bounce' : ''}`}
      >
        {message}
      </div>
    </div>
  );
}
