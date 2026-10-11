import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleInput } from '../input/ConsoleInput';
import { GamepadController, type PadControl, type PadProfile, type PadBinding } from '../input/GamepadController';
const STEPS: Array<[PadControl,string]> = [['up','ARRIBA'],['down','ABAJO'],['left','IZQUIERDA'],['right','DERECHA'],['a','CONFIRMAR / INTERACTUAR'],['b','VOLVER / CORRER'],['menu','ABRIR MENÚ']];
export class ControllerSettingsScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;
  private device!: Phaser.GameObjects.Text;
  private step = -1;
  private draft = {} as PadProfile;
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
    Ui960Kit.label(this,90,300,'Cruceta o stick: moverte y elegir\nConfirmar: hablar, seleccionar y avanzar\nVolver: cancelar; mantenlo para correr\nMenú: abrir el menú de exploración',UI960_FONT.small,UI.text.secondary).setLineSpacing(5);
    Ui960Kit.button(this,230,412,220,42,'CONFIGURAR BOTONES',()=>this.begin(),{selected:true,fontSize:'14px'});
    Ui960Kit.button(this,670,412,220,42,'RESTABLECER',()=>{const p=GamepadController.connected();if(p){GamepadController.reset(p);this.cancel();this.status.setText('Restablecido. Puedes volver a configurar los botones.');}},{fontSize:'14px'});
    Ui960Kit.button(this,830,505,150,40,'VOLVER',()=>this.back(),{fontSize:UI960_FONT.small});
    this.input.keyboard?.on('keydown-ESC',this.back,this);
    this.events.once('shutdown',()=>{GamepadController.suspended=false;this.input.keyboard?.off('keydown-ESC',this.back,this);ConsoleInput.clearTransient();});
  }
  private begin(): void {
    const pad=GamepadController.connected();
    if(!pad){this.status.setText('Todavía no se detecta un mando. Conéctalo por USB, pulsa un botón y prueba otra vez.');return;}
    this.deviceId=pad.id;this.baseline=pad.axes.map((v,i)=>i<2&&Math.abs(v)<=1.01?0:v);this.draft={} as PadProfile;this.step=0;this.release=true;GamepadController.suspended=true;ConsoleInput.clearTransient();this.prompt();
  }
  private prompt(): void { this.status.setText(`Paso ${this.step+1}/7: ${STEPS[this.step][1]}\nSuelta los controles y pulsa el botón o dirección que quieras asignar.`); }
  private cancel(): void {this.step=-1;GamepadController.suspended=false;ConsoleInput.clearTransient();}
  private back(): void { this.cancel();this.scene.start((this.registry.get('controller.returnScene') as string|undefined)??'TitleScene'); }
  update(): void {
    const pad=GamepadController.connected();
    this.device.setText(pad?`Detectado: ${pad.id}${GamepadController.profile(pad)?' · Controles asignados':''}`:'Ningún mando detectado');
    if(this.step<0){if(ConsoleInput.consumeA())this.begin();if(ConsoleInput.consumeB())this.back();return;}
    if(!pad||pad.id!==this.deviceId){this.cancel();this.status.setText('El mando se ha desconectado. Vuelve a conectarlo para configurar.');return;}
    const pressed=pad.buttons.findIndex(b=>b.pressed||b.value>0.6);
    const moved=pad.axes.findIndex((v,i)=>Math.abs(v-(this.baseline[i]??0))>0.5&&Math.abs(v)<=1.01);
    if(this.release){if(pressed<0&&moved<0)this.release=false;return;}
    let binding:PadBinding|undefined;
    if(pressed>=0)binding={type:'button',index:pressed};
    else if(this.step<4&&moved>=0)binding={type:'axis',index:moved,value:pad.axes[moved],mode:Math.abs(this.baseline[moved]??0)>1.01?'hat':'analog'};
    if(!binding)return;
    if (Object.values(this.draft).some(old => old.type === binding!.type && old.index === binding!.index
      && (old.type === 'button' || (binding!.type === 'axis' && Math.abs(old.value - binding!.value) < 0.15)))) {
      this.release = true;
      this.status.setText(`Ese control ya está asignado.\nElige otro para ${STEPS[this.step][1]}.`);
      return;
    }
    this.draft[STEPS[this.step][0]]=binding;this.step++;this.release=true;
    if(this.step===STEPS.length){const saved=GamepadController.save(pad,this.draft);this.cancel();this.status.setText(saved?'Configuración guardada para este mando.\nYa puedes jugar: pulsa Volver para regresar.':'Controles listos para esta sesión.\nEl navegador no permite guardar la configuración.');}
    else this.prompt();
  }
}
