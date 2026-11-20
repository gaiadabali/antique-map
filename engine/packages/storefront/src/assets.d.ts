// The package's own type-check (`tsc --noEmit`) sees no app's next-env.d.ts, so it takes Next's
// declarations (CSS Modules, stylesheets, images) here; an app type-checks these files with its own.
/// <reference types="next" />
/// <reference types="next/image-types/global" />
