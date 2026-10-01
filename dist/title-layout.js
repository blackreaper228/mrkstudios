export function titleLayout(widths, activeIndex, smallScale, gap = 16) {
 const scales = widths.map((_, i) => i === activeIndex ? 1 : smallScale);
 const sizes = widths.map((width, i) => width * scales[i]);
 const centers = widths.map(() => 0);
 for (let i = activeIndex + 1; i < widths.length; i++) centers[i] = centers[i-1] + sizes[i-1]/2 + gap + sizes[i]/2;
 for (let i = activeIndex - 1; i >= 0; i--) centers[i] = centers[i+1] - sizes[i+1]/2 - gap - sizes[i]/2;
 return centers.map((x, i) => `translate(-50%,-50%) translate(${x}px,${i === activeIndex ? 0 : 2}px) scale(${scales[i]})`);
}
