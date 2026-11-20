import * as migration_20261118_065632_initial from './20261118_065632_initial'
import * as migration_20261119_073533_feedback_data from './20261119_073533_feedback_data'

export const migrations = [
  {
    up: migration_20261118_065632_initial.up,
    down: migration_20261118_065632_initial.down,
    name: '20261118_065632_initial',
  },
  {
    up: migration_20261119_073533_feedback_data.up,
    down: migration_20261119_073533_feedback_data.down,
    name: '20261119_073533_feedback_data',
  },
]
