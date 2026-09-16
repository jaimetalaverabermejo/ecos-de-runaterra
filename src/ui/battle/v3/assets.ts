import atlas1 from './masterAtlas1';
import atlas2 from './masterAtlas2';
import atlas3 from './masterAtlas3';
import atlas4 from './masterAtlas4';
import atlas5 from './masterAtlas5';
import atlas6 from './masterAtlas6';

export const UI960_MASTER_ATLAS_DATA_URI = 'data:image/png;base64,' + [atlas1, atlas2, atlas3, atlas4, atlas5, atlas6].join('');

export const BATTLE_UI_960_FRAMES = {
  '02_panel_enemy.png': { x: 2, y: 2, w: 420, h: 102 },
  '03_panel_player.png': { x: 424, y: 2, w: 368, h: 94 },
  '04_dialog_panel.png': { x: 2, y: 106, w: 938, h: 64 },
  '05_skill_card_base.png': { x: 2, y: 172, w: 144, h: 110 },
  '06_skill_card_selected.png': { x: 148, y: 172, w: 144, h: 110 },
  '07_skill_card_disabled.png': { x: 294, y: 172, w: 144, h: 110 },
  '08_side_button_base.png': { x: 440, y: 172, w: 168, h: 48 },
  '09_side_button_selected.png': { x: 610, y: 172, w: 168, h: 48 },
  '10_side_button_disabled.png': { x: 780, y: 172, w: 168, h: 48 },
  '23_hp_bar_frame_enemy.png': { x: 2, y: 284, w: 288, h: 17 },
  '24_hp_bar_frame_player.png': { x: 292, y: 284, w: 288, h: 17 },
  '26_exp_bar_frame_player.png': { x: 582, y: 284, w: 288, h: 12 },
  '29_rank_dot_filled.png': { x: 872, y: 284, w: 8, h: 8 },
  '30_rank_dot_empty.png': { x: 882, y: 284, w: 8, h: 8 },
  '31_status_poison.png': { x: 892, y: 284, w: 16, h: 16 },
  '32_status_blind.png': { x: 910, y: 284, w: 16, h: 16 },
  '33_status_stun.png': { x: 928, y: 284, w: 16, h: 16 },
  '34_status_shield.png': { x: 946, y: 284, w: 16, h: 16 },
  '35_status_evasion.png': { x: 964, y: 284, w: 16, h: 16 },
  '36_status_polymorph.png': { x: 982, y: 284, w: 16, h: 16 },
  '37_status_banish.png': { x: 1000, y: 284, w: 16, h: 16 },
  '38_bomb_charge_0.png': { x: 2, y: 303, w: 28, h: 28 },
  '39_bomb_charge_1.png': { x: 32, y: 303, w: 28, h: 28 },
  '40_bomb_charge_2.png': { x: 62, y: 303, w: 28, h: 28 },
  '41_bomb_charge_3.png': { x: 92, y: 303, w: 28, h: 28 },
  '11_type_marcial.png': { x: 122, y: 303, w: 24, h: 24 },
  '12_type_arcano.png': { x: 148, y: 303, w: 24, h: 24 },
  '13_type_espiritual.png': { x: 174, y: 303, w: 24, h: 24 },
  '14_type_tecnologico.png': { x: 200, y: 303, w: 24, h: 24 },
  '15_type_primordial.png': { x: 226, y: 303, w: 24, h: 24 },
  '16_type_sombrio.png': { x: 252, y: 303, w: 24, h: 24 },
  '17_type_celestial.png': { x: 278, y: 303, w: 24, h: 24 },
  '18_type_vacio.png': { x: 304, y: 303, w: 24, h: 24 },
  '19_type_runico.png': { x: 330, y: 303, w: 24, h: 24 },
  '20_action_switch.png': { x: 356, y: 303, w: 24, h: 24 },
  '21_action_items.png': { x: 382, y: 303, w: 24, h: 24 },
  '22_action_flee.png': { x: 408, y: 303, w: 24, h: 24 },
  'title-logo.png': { x: 2, y: 340, w: 520, h: 150 },
  'save-slot-panel.png': { x: 2, y: 500, w: 760, h: 120 },
  'save-option-panel.png': { x: 2, y: 625, w: 320, h: 120 }
} as const;
