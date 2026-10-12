import Phaser from 'phaser';
import type { SkillDefinition, SkillEffectDefinition } from '../../data/types';
import { COMBAT_SKILL_DESCRIPTIONS } from '../../data/skills/combatDescriptions';
import { UI } from '../theme/UiTheme';
import { Ui960Kit } from '../components/Ui960Kit';

const stats: Record<string, string> = { attack: 'Ataque', power: 'Poder', defense: 'Defensa', resistance: 'Resistencia', speed: 'Velocidad', hp: 'Vida' };
const statuses: Record<string, string> = { stun:'Aturdimiento',root:'Inmovilización',airborne:'Por los aires',charm:'Enamoramiento',taunt:'Provocación',blind:'Ceguera',poison:'Veneno',burn:'Quemadura',shield:'Escudo',block:'Bloquea el siguiente ataque',trap:'Trampa',sleep:'Sueño',silence:'Silencio' };
const custom: Record<string, string> = {
 'recarga':'Recarga: no puede atacar en el siguiente turno', 'aumento-evasion':'Aumenta la evasión', 'precision-habilidad':'Aumenta la precisión',
 'execute-low-hp':'Mayor daño contra objetivos con poca Vida', 'missing-hp-scale':'Más daño cuanto menos Vida tenga el rival',
 'destierro-temporal':'Expulsa temporalmente al rival', 'transformacion-control':'Transforma al rival e impide sus habilidades',
 'marca-explosiva':'Coloca una bomba que acumula impactos', 'transformar-forma':'Cambia de forma', 'transformar-forma-persistente':'Cambia de forma',
 'invocar':'Invoca un aliado', 'abrir-reactivacion':'Permite reactivar la habilidad', 'añadir-marca':'Aplica una marca',
 'damage-per-mark':'Daño por cada marca acumulada', 'jhin-fourth-shot':'Último disparo crítico; aumenta con la Vida perdida del rival',
 'potenciar-siguiente-ofensiva':'Potencia el siguiente ataque', 'contador-misil':'Acumula misiles para potenciar el ataque',
 'hiper-acumulacion':'Acumula Híper', 'rebote-jhin':'Rebota entre enemigos', 'armar-habilidades-potenciadas':'Potencia las siguientes habilidades',
 'generar-coraje':'Genera Coraje', 'colision-secundaria':'Daño adicional al colisionar', 'accion-instantanea':'Acción inmediata',
 'curar-equipo-al-impactar':'Cura al equipo al impactar', 'generar-recurso':'Genera recurso de combate', 'bono-marcas-temporal':'Potencia temporalmente las marcas'
};
export function effectPower(effect: SkillEffectDefinition, rank: number): number {
 return effect.powerByRank?.[Math.max(0, Math.min(effect.powerByRank.length - 1, rank - 1))] ?? effect.power ?? 0;
}
export function skillInformation(skill: SkillDefinition, rank: number): { power: number | null; effects: string[] } {
 const damage = skill.effects.filter(e=>e.type==='damage');
 const power = damage.length ? Math.round(damage.reduce((sum,e)=>sum+effectPower(e,rank),0)) : null;
 const effects = skill.effects.map(e=>{
   const value=effectPower(e,rank);
   let text='';
   if(e.type==='damage') text=e.ignoreMitigation?'Daño verdadero':e.handlerId==='fixed-damage'?'Daño fijo':e.stat==='power'?'Daño mágico':'Daño físico';
   else if(e.type==='heal') text=`Curación: ${Math.round(value)} de Vida`;
   else if(e.type==='buff'||e.type==='debuff') text=`${value>=0?'Aumenta':'Reduce'} ${stats[e.stat??'']??'estadísticas'}: ${Math.round(Math.abs(value)*(e.modifierMode==='percent'?100:1))}${e.modifierMode==='percent'?'%':''}`;
   else if(e.statusKind) text=statuses[e.statusKind]??'Estado especial';
   if(e.statusKind==='shield')text=`Escudo: ${Math.round(value)}`;
   if(e.statusKind==='burn'||e.statusKind==='poison')text+=`: ${Math.round(value)} de daño por turno`;
   if(e.handlerId==='delayed-fixed-damage')text=`Daño real diferido: ${Math.round(value)} en el siguiente turno`;
   else if(e.handlerId==='marca-explosiva')text=`Bomba: ${Math.round(value)} de daño base al detonar; acumula impactos`;
   else if(e.handlerId&&custom[e.handlerId])text+=(text?' · ':'')+custom[e.handlerId];
   if(!text)text='Efecto especial (ver descripción)';
   if((e.hits??1)>1)text+=` · ${e.hits} impactos`;
   if(e.chance!==undefined&&e.chance<1)text+=` · ${Math.round(e.chance*100)}% de probabilidad`;
   if(e.durationTurns&&e.handlerId!=='recarga')text+=` · ${e.durationTurns} turno${e.durationTurns===1?'':'s'}`;
   if(e.target==='all-enemies')text+=' · todos los enemigos';
   return text;
 });
 return {power,effects:[...new Set(effects)]};
}

export function skillInformationPanel(scene: Phaser.Scene, skill: SkillDefinition, rank: number, close: ()=>void): Phaser.GameObjects.GameObject[] {
 const info=skillInformation(skill,rank), objects: Phaser.GameObjects.GameObject[]=[];
 objects.push(scene.add.rectangle(480,270,960,540,0x020912,0.65).setInteractive());
 objects.push(scene.add.rectangle(480,270,650,450,0x061a28,0.99).setStrokeStyle(2,UI.colors.gold));
 objects.push(Ui960Kit.label(scene,185,67,skill.name.toUpperCase(),'21px',UI.text.primary,true).setWordWrapWidth(450));
 objects.push(Ui960Kit.label(scene,775,72,rank>0?`RANGO ${rank}`:`DESBLOQUEO M${skill.unlockMastery}`,'11px',UI.text.gold,true).setOrigin(1,0));
 objects.push(Ui960Kit.label(scene,185,115,info.power===null?'SIN DAÑO DIRECTO':`POTENCIA BASE: ${info.power}`,'20px',UI.text.gold,true));
 objects.push(Ui960Kit.label(scene,185,145,'El daño final depende de tus estadísticas, las defensas y otros efectos.','11px',UI.text.muted));
 objects.push(Ui960Kit.label(scene,185,179,'EFECTOS','15px',UI.text.primary,true));
 const body=Ui960Kit.label(scene,185,206,info.effects.map(e=>'• '+e).join('\n'),'13px',UI.text.secondary).setWordWrapWidth(584,true).setLineSpacing(4);
 objects.push(body);
 const description=COMBAT_SKILL_DESCRIPTIONS[skill.id];
 if(description&&body.height<150)objects.push(Ui960Kit.label(scene,185,Math.max(356,210+body.height+12),description,'12px',UI.text.secondary).setWordWrapWidth(584,true).setLineSpacing(3));
 scene.input.keyboard?.once('keydown-ESC',close);
 const button=Ui960Kit.button(scene,480,462,160,36,'CERRAR · B / ESC',close,{fontSize:'12px'});
 button.button.once(Phaser.GameObjects.Events.DESTROY,()=>scene.input.keyboard?.off('keydown-ESC',close));
 objects.push(button.button,button.label);
 return objects;
}
