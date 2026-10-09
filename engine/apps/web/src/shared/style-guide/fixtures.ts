/**
 * The style guide's sample pictures: a faint plate of a given shape as an inline SVG, so a sample
 * loads on either host (each host serves only its own `public/<site>/` folder).
 */
export function samplePlate(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill-opacity="0.12"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
