import Phaser from 'phaser';
import { ConsoleFocusController } from '../input/ConsoleFocusController';
import { configureSceneLayout } from '../config/GameDimensions';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleInput } from '../input/ConsoleInput';
import { GamepadController, type PadControl, type PadProfile, type PadBinding, type PadDirection, type DirectionBindings } from '../input/GamepadController';
const STEPS: Array<[PadControl,string]> = [['up','ARRIBA'],['down','ABAJO'],['left','IZQUIERDA'],['right','DERECHA'],['a','CONFIRMAR / INTERACTUAR'],['b','VOLVER / CORRER'],['menu','ABRIR MENÚ'],['info','INFORMACIÓN DEL ATAQUE']];
export class ControllerSettingsScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;
  private device!: Phaser.GameObjects.Text;
  private step = -1;
  private draft = {} as PadProfile;
  private secondary = false;
  private secondaryDraft = {} as DirectionBindings;
  private baseline: number[] = [];
  private release = true;
  private deviceId = '';
  constructor() { super('ControllerSettingsScene'); }
  create(): void {
    configureSceneLayout(this,'native-960'); ConsoleInput.clearTransient();
    this.step = -1; GamepadController.suspended = false;
    Ui960Kit.backdrop(this,'ui960-title-bg'); Ui960Kit.header(this,'MANDO USB','CONTROLES');
    Ui960Kit.frame(this,'ui960a-panel-content-large',60,100,840,350);
    this.device = Ui960Kit.label(this,90,125,'',UI960_FONT.small,UI.text.gold).setWordWrapWidth(760);
    this.status = Ui960Kit.label(this,90,198,'Conecta el mando y pulsa un botón para que el navegador lo detecte.',UI960_FONT.body,UI.text.primary).setWordWrapWidth(750).setLineSpacing(5);
    Ui960Kit.label(this,90,290,'Joystick y cruceta: moverte y elegir con cualquiera\nAñadir cruceta/stick: asigna el segundo control sin cambiar botones\nConfirmar: hablar · Volver: cancelar o mantener para correr\nMenú: abrir el menú de exploración · Info: consultar el ataque',UI960_FONT.small,UI.text.secondary).setLineSpacing(5);
    Ui960Kit.button(this,220,412,240,42,'CONFIGURAR BOTONES',()=>this.begin(),{selected:true,fontSize:'14px'});
    Ui960Kit.button(this,480,412,240,42,'AÑADIR CRUCETA/STICK',()=>this.begin(true),{fontSize:'14px'});
    Ui960Kit.button(this,740,412,220,42,'RESTABLECER',()=>{const p=GamepadController.connected();if(p){GamepadController.reset(p);this.cancel();this.status.setText('Restablecido. Puedes volver a configurar los botones.');}},{fontSize:'14px'});
    Ui960Kit.button(this,830,505,150,40,'VOLVER',()=>this.back(),{fontSize:UI960_FONT.small});
    this.input.keyboard?.on('keydown-ESC',this.back,this);
    this.events.once('shutdown',()=>{GamepadController.suspended=false;this.input.keyboard?.off('keydown-ESC',this.back,this);ConsoleInput.clearTransient();});
  }
  private begin(secondary = false): void {
    const pad=GamepadController.connected();
    if(!pad){this.status.setText('Todavía no se detecta un mando. Conéctalo por USB, pulsa un botón y prueba otra vez.');return;}
    const existing = GamepadController.profile(pad);
    if (secondary && !existing) {this.status.setText('Primero usa Configurar botones.\nDespués añade el joystick o la cruceta que te falte.');return;}
    this.secondary=secondary;this.secondaryDraft={} as DirectionBindings;
    this.draft = secondary ? structuredClone(existing!) : { secondaryDirections: existing?.secondaryDirections } as PadProfile;
    this.deviceId=pad.id;this.baseline=pad.axes.map((v,i)=>i<2&&Math.abs(v)<=1.01?0:v);this.step=0;this.release=true;GamepadController.suspended=true;ConsoleInput.clearTransient();this.prompt();
  }
  private prompt(): void { this.status.setText(`Paso ${this.step+1}/${this.secondary?4:STEPS.length}: ${this.secondary?'SEGUNDO CONTROL · ':''}${STEPS[this.step][1]}\nSuelta los controles y ${this.secondary?'usa el joystick o la cruceta que te falta.':'pulsa el botón o dirección que quieras asignar.'}`); }
  private cancel(): void {this.step=-1;GamepadController.suspended=false;ConsoleInput.clearTransient();}
  private back(): void { this.cancel();this.scene.start((this.registry.get('controller.returnScene') as string|undefined)??'TitleScene'); }
  update(): void {
    const pad=GamepadController.connected();
    const profile = pad ? GamepadController.profile(pad) : undefined;
    this.device.setText(pad?`Detectado: ${pad.id}${profile?.secondaryDirections?' · Dos controles de dirección':profile?' · Controles asignados':''}`:'Ningún mando detectado');
    if(this.step<0){ConsoleFocusController.updateScene(this, () => this.back());return;}
    if(!pad||pad.id!==this.deviceId){this.cancel();this.status.setText('El mando se ha desconectado. Vuelve a conectarlo para configurar.');return;}
    const pressed=pad.buttons.findIndex(b=>b.pressed||b.value>0.6);
    const moved=pad.axes.findIndex((v,i)=>Math.abs(v-(this.baseline[i]??0))>0.5&&Math.abs(v)<=1.01);
    if(this.release){if(pressed<0&&moved<0)this.release=false;return;}
    let binding:PadBinding|undefined;
    if(pressed>=0)binding={type:'button',index:pressed};
    else if(this.step<4&&moved>=0)binding={type:'axis',index:moved,value:pad.axes[moved],mode:Math.abs(this.baseline[moved]??0)>1.01?'hat':'analog'};
    if(!binding)return;
    const assigned = [...STEPS.map(([c])=>this.draft[c]), ...Object.values(this.secondary?this.secondaryDraft:this.draft.secondaryDirections??{})].filter((b):b is PadBinding=>Boolean(b));
    if (assigned.some(old => old.type === binding!.type && old.index === binding!.index
      && (old.type === 'button' || (binding!.type === 'axis' && Math.abs(old.value - binding!.value) < 0.15)))) {
      this.release = true;
      this.status.setText(`Ese control ya está asignado.\nElige otro para ${STEPS[this.step][1]}.`);
      return;
    }
    if(this.secondary)this.secondaryDraft[STEPS[this.step][0] as PadDirection]=binding;
    else this.draft[STEPS[this.step][0]]=binding;
    this.step++;this.release=true;
    if(this.step===(this.secondary?4:STEPS.length)){
      if(this.secondary)this.draft.secondaryDirections=this.secondaryDraft;
      const saved=GamepadController.save(pad,this.draft);this.cancel();
      this.status.setText(saved?(this.draft.secondaryDirections?'Guardado: joystick y cruceta listos para jugar.\nLos botones de acción conservan su configuración.':'Configuración guardada para este mando.\nUsa Añadir cruceta/stick para asignar el segundo control.'):'Controles listos para esta sesión.\nEl navegador no permite guardar la configuración.');
    }
    else this.prompt();
  }
}
