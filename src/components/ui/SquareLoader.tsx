// Adapted from a UIverse.io component by ZacharyCrespin. Keyframes live in
// globals.css (square-loader) next to the project's other one-off
// animations - the 7 squares and their staggered delays are tuned together
// as one fixed animation, not a generic N-square loader.
export default function SquareLoader() {
  return (
    <div className="square-loader" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="square-loader-square" />
      ))}
    </div>
  );
}
