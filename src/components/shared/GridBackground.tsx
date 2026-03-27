"use client";

import { useEffect, useState, type ReactNode } from "react";

const TARGET_SIZE = 80;

export function GridPage({ children }: { children: ReactNode }) {
  const [gridStyle, setGridStyle] = useState<React.CSSProperties>({});
  const [contentStyle, setContentStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    function calc() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Responsive: on mobile, no side cells — content goes edge to edge
      // Grid only shows above and below the content
      const isMobile = w < 640;
      const sideCells = isMobile ? 0 : w < 768 ? 2 : 4;
      const vertCells = isMobile ? 1 : 2;

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

      const contentLeft = sideCells * cellW;
      const contentWidth = sideCells > 0
        ? (cols - sideCells * 2) * cellW - 2
        : w;

      setContentStyle({
        position: "absolute",
        left: sideCells > 0 ? contentLeft + 1 : 0,
        top: topOffset + vertCells * cellW + 1,
        width: contentWidth,
        height: (finalRows - vertCells * 2) * cellW - 2,
        overflow: "visible" as const,
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
        className="z-10 bg-white flex items-center justify-center px-4 sm:px-0"
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  );
}
