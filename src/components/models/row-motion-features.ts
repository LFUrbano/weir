// Motion's animation and layout features on their own, for the catalog rows
// to import on demand (row-motion.ts): they are not needed for the first
// paint or for hydration, so they stay out of the catalog's first load.
// domMax rather than domAnimation: sliding rows to new places is a layout
// animation.
export { domMax as default } from "motion/react";
