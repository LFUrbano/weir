// Motion's scroll tracker on its own, for RequestDiagram to import on demand:
// it is not needed for the first paint or for hydration, so it stays out of
// the home page's first load.
export { scroll } from "motion";
