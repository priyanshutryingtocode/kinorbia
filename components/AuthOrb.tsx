// A flat wireframe orb, drawn as SVG rather than CSS gradients.
//
// This replaced three attempts to light a sphere with `radial-gradient`, all of
// which failed the same way: `radial-gradient(circle at ...)` with no explicit
// size is sized `farthest-corner`, measured from the box *corner*, so an "88%"
// stop is nowhere near 88% of the orb. That sliced a rim light into a hard
// crescent, turned the terminator into a centred vignette that described no
// shape at all, and eventually left the orb with no height and invisible.
//
// SVG circles have explicit radii. `rx="172.6"` is 172.6. There is no geometry
// here to miscalculate, which is the whole reason the drawing is line art rather
// than lit shading.
//
// The identity lives in the static geometry. Only the accents animate -- an arc,
// a dashed ring, and two orbiting dots -- and all three degrade safely when
// frozen: an arc still reads as an arc, a dash pattern is already a ring, and
// dots land at defined points on their circles. Nothing relies on a transform
// that would collapse to a flat line.
//
// Colours are all theme tokens, so one component is correct in both themes
// without a second palette. Decorative and behind the card, so it is hidden from
// assistive technology rather than announced as an empty graphic.
//
// The rotating groups need `transform-box: view-box` and a 50% origin, both set
// in globals.css. SVG's default origin is 0 0, which would send every dot
// spinning around the top-left corner instead of around the orb.

const C = 260; // centre, in a 520x520 viewBox
const R = 230; // silhouette radius

// A latitude at `dy` from the equator has radius sqrt(R^2 - dy^2), which is what
// keeps those lines hugging the silhouette instead of cutting through it.
//
// Rounded, because Math.sqrt(230 * 230 - 76 * 76) is exactly
// 217.08063018150654, and shipping seventeen significant figures into the markup
// of a decorative background helps nobody. One decimal is well under a pixel
// at any size this renders at.
const latitude = (dy: number) => Math.round(Math.sqrt(R * R - dy * dy) * 10) / 10;

export default function AuthOrb() {
  return (
    <svg
      viewBox="0 0 520 520"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full"
    >
      <g fill="none" stroke="var(--rule)" strokeWidth="1.25">
        {/* Silhouette. */}
        <circle cx={C} cy={C} r={R} />

        {/* Latitudes: the equator plus two pairs either side of it. `ry` stays
            small so they read as the edge-on view of a sphere. */}
        <ellipse cx={C} cy={C} rx={latitude(0)} ry={22} />
        <ellipse cx={C} cy={C - 76} rx={latitude(76)} ry={14} />
        <ellipse cx={C} cy={C + 76} rx={latitude(76)} ry={14} />
        <ellipse cx={C} cy={C - 152} rx={latitude(152)} ry={6} />
        <ellipse cx={C} cy={C + 152} rx={latitude(152)} ry={6} />

        {/* Meridians: full height, narrow. Static, so the globe is always a
            complete globe even with animation off. */}
        <ellipse cx={C} cy={C} rx={168} ry={R} />
        <ellipse cx={C} cy={C} rx={88} ry={R} />
      </g>

      {/* One brighter meridian, so the grid has a focus rather than reading as
          uniformly flat line work. */}
      <ellipse
        cx={C}
        cy={C}
        rx={210}
        ry={R}
        fill="none"
        stroke="var(--content-subtle)"
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Dashed ring outside the silhouette. Animates dashoffset rather than
          rotation, because rotating a full circle is invisible and a dash
          pattern is what makes the motion legible. */}
      <circle
        cx={C}
        cy={C}
        r={252}
        fill="none"
        stroke="var(--rule)"
        strokeWidth="1"
        strokeDasharray="3 14"
        className="auth-orb-dash"
      />

      {/* Accent arc. Deliberately partial: this is the one element where
          rotation actually reads as rotation. Circumference at r=244 is 1533,
          so 150 + 1383 is one arc and one gap. */}
      <circle
        cx={C}
        cy={C}
        r={244}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="150 1383"
        className="auth-orb-arc"
      />

      {/* Two dots on different orbits, counter-rotating. The orbits are
          implicit -- each dot sits at the top of its own circle and the group
          rotates about the centre -- so there are no extra path elements. */}
      <g className="auth-orb-orbit">
        <circle cx={C} cy={C - R} r={4.5} fill="var(--highlight)" />
      </g>
      {/* Capped at r=252 so it stays inside the viewBox. An earlier draft used
          278, which put the dot 23px outside a 520-unit box and clipped it for
          part of every orbit. */}
      <g className="auth-orb-orbit-rev">
        <circle cx={C} cy={C - 250} r={3.5} fill="var(--accent)" />
      </g>
    </svg>
  );
}