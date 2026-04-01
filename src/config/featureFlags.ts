/**
 * Feature flags for the 2D pivot.
 *
 * ENABLE_3D_STUDIO: When false, all 3D game creation capabilities are hidden
 * from the public studio. Set to true only for internal testing of future
 * Babylon.js / Three.js work. This flag is intentionally a compile-time
 * constant so tree-shaking can remove dead 3D paths from production builds.
 */
export const ENABLE_3D_STUDIO = false;

/**
 * When true, paid users see the 2D asset catalog in the studio.
 */
export const ENABLE_ASSET_CATALOG = true;
