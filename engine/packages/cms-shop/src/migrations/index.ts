import * as migration_20261118_065632_initial from './20261118_065632_initial'
import * as migration_20261119_073533_feedback_data from './20261119_073533_feedback_data'
import * as migration_20261123_082423_maps_url from './20261123_082423_maps_url'
import * as migration_20261124_030240_drop_unused_shop_settings from './20261124_030240_drop_unused_shop_settings'

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
  {
    up: migration_20261123_082423_maps_url.up,
    down: migration_20261123_082423_maps_url.down,
    name: '20261123_082423_maps_url',
  },
  {
    up: migration_20261124_030240_drop_unused_shop_settings.up,
    down: migration_20261124_030240_drop_unused_shop_settings.down,
    name: '20261124_030240_drop_unused_shop_settings',
  },
]
