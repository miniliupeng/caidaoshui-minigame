import { DESIGN_H, DESIGN_W, LayoutBox } from '../types/game';

export function getButtonBarTop(designH: number = DESIGN_H): number {
  return designH - 188;
}

/** 按瓶子数量在顶栏与底栏之间排布。safeTop 来自 Screen。 */
export function computeLayout(count: number, safeTop: number): LayoutBox[] {
  const topUI = 210 + safeTop;
  const bottomUI = 250;
  const areaH = DESIGN_H - topUI - bottomUI;
  const areaY = topUI;
  const cols = count <= 4 ? count : count <= 6 ? 3 : count <= 8 ? 4 : 5;
  const rows = Math.ceil(count / cols);
  const gapX = count <= 3 ? 48 : count <= 5 ? 28 : 18;
  const gapY = 36;
  const sidePad = 40;
  const maxBw = Math.floor((DESIGN_W - sidePad * 2 - gapX * (cols - 1)) / cols);
  const maxBh = Math.floor((areaH - gapY * (rows - 1)) / rows);
  let bw = Math.min(maxBw, 156, Math.floor(maxBh / 2.4));
  let bh = Math.floor(bw * 2.4);
  if (bh > maxBh) {
    bh = maxBh;
    bw = Math.floor(bh / 2.4);
  }
  bw = Math.max(72, Math.min(bw, maxBw));
  bh = Math.max(170, bh);
  const totalW = cols * bw + (cols - 1) * gapX;
  const totalH = rows * bh + (rows - 1) * gapY;
  const startX = Math.floor((DESIGN_W - totalW) / 2);
  const startY = areaY + Math.floor((areaH - totalH) / 2);
  const layout: LayoutBox[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    layout.push({
      x: startX + col * (bw + gapX),
      y: startY + row * (bh + gapY),
      w: bw,
      h: bh
    });
  }
  return layout;
}
