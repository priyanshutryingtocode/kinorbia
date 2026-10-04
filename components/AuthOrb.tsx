const C = 260; 
const R = 230; 

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