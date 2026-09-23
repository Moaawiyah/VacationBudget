"use client";

import { useEffect } from "react";

/**
 * Stops the page behind an open overlay from scrolling. Where the browser
 * shows a classic (space-taking) scrollbar, its width is added back as
 * padding so hiding it doesn't make the page jump sideways.
 */
export function useBodyScrollLock(): void {
  useEffect(() => {
    const html = document.documentElement;
    const scrollbar = window.innerWidth - html.clientWidth;
    const previous = { overflow: html.style.overflow, paddingRight: html.style.paddingRight };
    html.style.overflow = "hidden";
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
    return () => {
      html.style.overflow = previous.overflow;
      html.style.paddingRight = previous.paddingRight;
    };
  }, []);
}
