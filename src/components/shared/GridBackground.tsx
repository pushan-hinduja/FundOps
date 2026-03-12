"use client";

import { useEffect, useState, type ReactNode } from "react";

const TARGET_SIZE = 80;
const SIDE_CELLS = 4; // 4 full boxes visible on each side
const VERT_CELLS = 2; // 2 full boxes visible top and bottom

export function GridPage({ children }: { children: ReactNode }) {
  const [gridStyle, setGridStyle] = useState<React.CSSProperties>({});
  const [contentStyle, setContentStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    function calc() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      const cols = Math.round(w / TARGET_SIZE);
      const rows = Math.round(h / TARGET_SIZE);
      const cellW = w / cols;

      let finalRows = rows;
      while (finalRows * cellW > h && finalRows > 1) {
        finalRows--;
      }

      const gridWidth = cols * cellW;
      const gridHeight = finalRows * cellW;
      const topOffset = Math.floor((h - gridHeight) / 2);

      setGridStyle({
        position: "absolute",
        left: 0,
        top: topOffset,
        width: gridWidth,
        height: gridHeight,
        backgroundImage:
          "linear-gradient(to right, #e5e5e5 1px, transparent 1px), linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)",
        backgroundSize: `${cellW}px ${cellW}px`,
        borderRight: "1px solid #e5e5e5",
        borderBottom: "1px solid #e5e5e5",
        pointerEvents: "none" as const,
      });

      // Inset by 1px on all sides so every surrounding border stays visible
      setContentStyle({
        position: "absolute",
        left: SIDE_CELLS * cellW + 1,
        top: topOffset + VERT_CELLS * cellW + 1,
        width: (cols - SIDE_CELLS * 2) * cellW - 2,
        height: (finalRows - VERT_CELLS * 2) * cellW - 2,
      });
    }

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-white relative">
      <div style={gridStyle} />

      <div
        className="z-10 bg-white flex items-center justify-center"
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  );
}
