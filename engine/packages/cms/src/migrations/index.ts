import * as migration_20261002_073156_initial from './20261002_073156_initial'
import * as migration_20261002_200042_indies_wave_3_1 from './20261002_200042_indies_wave_3_1'
import * as migration_20261005_033710_indies_9_4b from './20261005_033710_indies_9_4b'
import * as migration_20261006_053750_indies_6_6 from './20261006_053750_indies_6_6'
import * as migration_20261006_054525_indies_9_1 from './20261006_054525_indies_9_1'
import * as migration_20261007_080534_indies_8_3 from './20261007_080534_indies_8_3'
import * as migration_20261020_065238_partner_sign_in from './20261020_065238_partner_sign_in'
import * as migration_20261021_075316_shop_categories from './20261021_075316_shop_categories'
import * as migration_20261021_080409_shop_page_blocks from './20261021_080409_shop_page_blocks'
import * as migration_20261021_084010_shop_apply_anchor from './20261021_084010_shop_apply_anchor'
import * as migration_20261021_092446_pages_share_image from './20261021_092446_pages_share_image'
import * as migration_20261105_024103_shop_admin_data_model from './20261105_024103_shop_admin_data_model'
import * as migration_20261109_082713_shop_header_footer_staff from './20261109_082713_shop_header_footer_staff'
import * as migration_20261116_031741_media_video_pdf from './20261116_031741_media_video_pdf'
import * as migration_20261116_061814_media_label from './20261116_061814_media_label'
import * as migration_20261119_073601_feedback_data from './20261119_073601_feedback_data'

export const migrations = [
  {
    up: migration_20261002_073156_initial.up,
    down: migration_20261002_073156_initial.down,
    name: '20261002_073156_initial',
  },
  {
    up: migration_20261002_200042_indies_wave_3_1.up,
    down: migration_20261002_200042_indies_wave_3_1.down,
    name: '20261002_200042_indies_wave_3_1',
  },
  {
    up: migration_20261005_033710_indies_9_4b.up,
    down: migration_20261005_033710_indies_9_4b.down,
    name: '20261005_033710_indies_9_4b',
  },
  {
    up: migration_20261006_053750_indies_6_6.up,
    down: migration_20261006_053750_indies_6_6.down,
    name: '20261006_053750_indies_6_6',
  },
  {
    up: migration_20261006_054525_indies_9_1.up,
    down: migration_20261006_054525_indies_9_1.down,
    name: '20261006_054525_indies_9_1',
  },
  {
    up: migration_20261007_080534_indies_8_3.up,
    down: migration_20261007_080534_indies_8_3.down,
    name: '20261007_080534_indies_8_3',
  },
  {
    up: migration_20261020_065238_partner_sign_in.up,
    down: migration_20261020_065238_partner_sign_in.down,
    name: '20261020_065238_partner_sign_in',
  },
  {
    up: migration_20261021_075316_shop_categories.up,
    down: migration_20261021_075316_shop_categories.down,
    name: '20261021_075316_shop_categories',
  },
  {
    up: migration_20261021_080409_shop_page_blocks.up,
    down: migration_20261021_080409_shop_page_blocks.down,
    name: '20261021_080409_shop_page_blocks',
  },
  {
    up: migration_20261021_084010_shop_apply_anchor.up,
    down: migration_20261021_084010_shop_apply_anchor.down,
    name: '20261021_084010_shop_apply_anchor',
  },
  {
    up: migration_20261021_092446_pages_share_image.up,
    down: migration_20261021_092446_pages_share_image.down,
    name: '20261021_092446_pages_share_image',
  },
  {
    up: migration_20261105_024103_shop_admin_data_model.up,
    down: migration_20261105_024103_shop_admin_data_model.down,
    name: '20261105_024103_shop_admin_data_model',
  },
  {
    up: migration_20261109_082713_shop_header_footer_staff.up,
    down: migration_20261109_082713_shop_header_footer_staff.down,
    name: '20261109_082713_shop_header_footer_staff',
  },
  {
    up: migration_20261116_031741_media_video_pdf.up,
    down: migration_20261116_031741_media_video_pdf.down,
    name: '20261116_031741_media_video_pdf',
  },
  {
    up: migration_20261116_061814_media_label.up,
    down: migration_20261116_061814_media_label.down,
    name: '20261116_061814_media_label',
  },
  {
    up: migration_20261119_073601_feedback_data.up,
    down: migration_20261119_073601_feedback_data.down,
    name: '20261119_073601_feedback_data',
  },
]
