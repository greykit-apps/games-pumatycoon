/* Original vector art: the six commodity icons, the start-player badge and
 * the game's mark. Nothing here is traced from the box; these are simple
 * drawn shapes in the portfolio's tactical palette. Each icon is a 24x24
 * symbol, used by <svg><use href="#pt-wheat"/></svg>. */

export const COLORS = {
  wheat: "#e8c55a",
  wood: "#c08850",
  iron: "#a9b4d0",
  coal: "#7c8396",
  goods: "#ef6a4f",
  luxury: "#3bb3a8",   // teal, not the green that means "price up"
  any: "#dbe4fb",
};

export const SPRITES = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <symbol id="pt-wheat" viewBox="0 0 24 24">
      <g fill="none" stroke="${COLORS.wheat}" stroke-width="1.7" stroke-linecap="round">
        <path d="M12 22V9"/><path d="M8 21l4-6 4 6"/>
      </g>
      <g fill="${COLORS.wheat}">
        <ellipse cx="12" cy="5" rx="2" ry="3.2"/>
        <ellipse cx="8.6" cy="8.2" rx="1.7" ry="2.8" transform="rotate(-30 8.6 8.2)"/>
        <ellipse cx="15.4" cy="8.2" rx="1.7" ry="2.8" transform="rotate(30 15.4 8.2)"/>
        <ellipse cx="8.4" cy="12.6" rx="1.6" ry="2.6" transform="rotate(-35 8.4 12.6)"/>
        <ellipse cx="15.6" cy="12.6" rx="1.6" ry="2.6" transform="rotate(35 15.6 12.6)"/>
      </g>
    </symbol>
    <symbol id="pt-wood" viewBox="0 0 24 24">
      <g fill="${COLORS.wood}" stroke="#3a2412" stroke-width="1">
        <rect x="3" y="13" width="18" height="7" rx="3.5"/>
        <rect x="5" y="6" width="14" height="7" rx="3.5"/>
      </g>
      <g fill="#f0d2a6" stroke="#3a2412" stroke-width=".8">
        <circle cx="6.5" cy="16.5" r="2.6"/><circle cx="8.5" cy="9.5" r="2.6"/>
      </g>
      <g fill="none" stroke="#8a5a2c" stroke-width=".7"><circle cx="6.5" cy="16.5" r="1.2"/><circle cx="8.5" cy="9.5" r="1.2"/></g>
    </symbol>
    <symbol id="pt-iron" viewBox="0 0 24 24">
      <path d="M2.5 17.5l3-8h13l3 8z" fill="${COLORS.iron}" stroke="#3b4256" stroke-width="1" stroke-linejoin="round"/>
      <path d="M5.5 9.5l1.5-3h10l1.5 3z" fill="#d6dcec" stroke="#3b4256" stroke-width="1" stroke-linejoin="round"/>
      <path d="M8 12.5h4" stroke="#eef2fb" stroke-width="1.2" stroke-linecap="round"/>
    </symbol>
    <symbol id="pt-coal" viewBox="0 0 24 24">
      <path d="M2 20c2-6 5-11 10-14 5 3 8 8 10 14z" fill="${COLORS.coal}" stroke="#20232c" stroke-width="1" stroke-linejoin="round"/>
      <g fill="#20232c"><circle cx="9" cy="14" r="1.1"/><circle cx="13" cy="11" r="1.1"/><circle cx="15" cy="16" r="1.1"/><circle cx="11" cy="17.5" r="1.1"/><circle cx="7" cy="18" r="1"/><circle cx="17.5" cy="18.5" r="1"/></g>
      <g fill="#b9bfcd"><circle cx="11.5" cy="8.6" r=".7"/><circle cx="16" cy="13" r=".6"/></g>
    </symbol>
    <symbol id="pt-goods" viewBox="0 0 24 24">
      <!-- a slatted crate: boards across, posts at the ends; no diagonal, which would read as a cross-out -->
      <rect x="3" y="5" width="18" height="15" rx="1.2" fill="${COLORS.goods}" stroke="#5a1c10" stroke-width="1"/>
      <path d="M3.6 10h16.8M3.6 15h16.8" stroke="#5a1c10" stroke-width="1.3"/>
      <path d="M6.5 5.5v14M17.5 5.5v14" stroke="#ffd9a8" stroke-width="1.8"/>
      <rect x="3" y="5" width="18" height="15" rx="1.2" fill="none" stroke="#ffd9a8" stroke-width="1.2"/>
    </symbol>
    <symbol id="pt-luxury" viewBox="0 0 24 24">
      <path d="M10 2.5h4v4.5c2.6 1.4 3.5 3.4 3.5 6V21a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-8c0-2.6.9-4.6 3.5-6z" fill="${COLORS.luxury}" stroke="#123b25" stroke-width="1" stroke-linejoin="round"/>
      <rect x="7.6" y="13" width="8.8" height="5" fill="#f2d48a"/>
      <rect x="9.6" y="1.5" width="4.8" height="2.4" rx=".6" fill="#b07a45"/>
    </symbol>
    <symbol id="pt-any" viewBox="0 0 24 24">
      <path d="M12 2l8.7 5v10L12 22l-8.7-5V7z" fill="none" stroke="${COLORS.any}" stroke-width="1.6" stroke-linejoin="round"/>
      <text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-family="ui-monospace,Menlo,monospace" font-weight="700" fill="${COLORS.any}">ANY</text>
    </symbol>
    <symbol id="pt-mark" viewBox="0 0 100 100">
      <path d="M18 74V38l14-12 10 10h16l10-10 14 12v36L50 90z" fill="none" stroke="#54f2ff" stroke-width="5" stroke-linejoin="round"/>
      <path d="M36 52l6 4M64 52l-6 4M44 70h12" stroke="#ffb000" stroke-width="5" stroke-linecap="round"/>
    </symbol>
  </defs>
</svg>`;

export function icon(g, size = 18, title = "") {
  const t = title ? `<title>${title}</title>` : "";
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="${title || g}">${t}<use href="#pt-${g}"/></svg>`;
}
