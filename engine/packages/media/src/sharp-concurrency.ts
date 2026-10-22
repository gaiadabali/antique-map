/**
 * Imported for its effect by every module that imports sharp. With `MALLOC_ARENA_MAX` set (pm2
 * does), sharp stops forcing one libvips thread and would use every core inside the web process,
 * so the pool is pinned at two once, at module load.
 */
import sharp from 'sharp'

sharp.concurrency(2)
