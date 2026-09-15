import fs from 'node:fs';

const path = 'src/scenes/BattleScene.ts';
let text = fs.readFileSync(path, 'utf8');

function replaceOnce(from, to, label) {
  if (text.includes(to)) return;
  if (!text.includes(from)) throw new Error(`No se encontró ${label}`);
  text = text.replace(from, to);
}

replaceOnce(
  "import { StatusEngine, type CombatStatusInstance } from '../systems/combat/StatusEngine';",
  "import { StatusEngine, type CombatStatusInstance } from '../systems/combat/StatusEngine';\nimport { SpecialEffectEngine, type BattleFormStore, type BattleResourceStore } from '../systems/combat/SpecialEffectEngine';",
  'import SpecialEffectEngine'
);

replaceOnce(
  "    this.ensureStatusStore();\n    this.refreshCombatStats();\n    this.playerHp = Phaser.Math.Clamp(this.playerChampion.currentHp, 1, BattleEngine.statsFor(this.playerChampion).hp);\n    this.wildHp = Phaser.Math.Clamp(this.wildChampion.currentHp, 1, BattleEngine.statsFor(this.wildChampion).hp);",
  "    this.ensureStatusStore();\n    const resources = this.ensureResourceStore();\n    const forms = this.ensureFormStore();\n    SpecialEffectEngine.initializeResources(this.playerChampion, resources, forms);\n    SpecialEffectEngine.initializeResources(this.wildChampion, resources, forms);\n    this.applyOpeningPassive(this.playerChampion, this.wildChampion);\n    this.applyOpeningPassive(this.wildChampion, this.playerChampion);\n    this.refreshCombatStats();\n    this.playerHp = Phaser.Math.Clamp(this.playerChampion.currentHp, 1, this.statsForChampion(this.playerChampion).hp);\n    this.wildHp = Phaser.Math.Clamp(this.wildChampion.currentHp, 1, this.statsForChampion(this.wildChampion).hp);",
  'battle stores create'
);

replaceOnce(
  "    const playerTexture = this.playerBattleTexture(this.playerChampion.championId);",
  "    const playerTexture = this.playerBattleTexture(this.playerChampion.championId, this.currentFormId(this.playerChampion));",
  'player form texture create'
);
replaceOnce(
  "    const wildTexture = this.wildBattleTexture(this.wildChampion.championId);",
  "    const wildTexture = this.wildBattleTexture(this.wildChampion.championId, this.currentFormId(this.wildChampion));",
  'wild form texture create'
);
replaceOnce(
  "  private playerBattleTexture(championId: string): string {\n    const back = championId + '-battle-back';\n    if (this.textures.exists(back)) return back;\n    const front = championId + '-battle-front';\n    if (this.textures.exists(front)) return front;\n    return 'garen-battle-back';\n  }\n\n  private wildBattleTexture(championId: string): string {\n    const front = championId + '-battle-front';\n    if (this.textures.exists(front)) return front;\n    return 'teemo-battle-front';\n  }",
  "  private playerBattleTexture(championId: string, formId?: string): string {\n    if (formId) {\n      const formBack = championId + '-form-' + formId + '-battle-back';\n      if (this.textures.exists(formBack)) return formBack;\n      const formFront = championId + '-form-' + formId + '-battle-front';\n      if (this.textures.exists(formFront)) return formFront;\n    }\n    const back = championId + '-battle-back';\n    if (this.textures.exists(back)) return back;\n    const front = championId + '-battle-front';\n    if (this.textures.exists(front)) return front;\n    return 'garen-battle-back';\n  }\n\n  private wildBattleTexture(championId: string, formId?: string): string {\n    if (formId) {\n      const formFront = championId + '-form-' + formId + '-battle-front';\n      if (this.textures.exists(formFront)) return formFront;\n    }\n    const front = championId + '-battle-front';\n    if (this.textures.exists(front)) return front;\n    return 'teemo-battle-front';\n  }",
  'generic form battle textures'
);

replaceOnce(
  "      BattleEngine.statsFor(this.wildChampion).hp,",
  "      this.statsForChampion(this.wildChampion).hp,",
  'wild panel form hp'
);
replaceOnce(
  "      BattleEngine.statsFor(this.playerChampion).hp,",
  "      this.statsForChampion(this.playerChampion).hp,",
  'player panel form hp'
);

replaceOnce(
  "    const definition = DataRegistry.champion(this.playerChampion.championId);\n    const skillIds = definition.skillIds;",
  "    const skillIds = SpecialEffectEngine.skillIds(this.playerChampion, this.ensureFormStore());",
  'form skill ids'
);

replaceOnce(
  "    UiKit.label(this, x, y - 1, 'i', UI.font.tiny, UI.text.accent, true).setOrigin(0.5);\n    circle.on(Phaser.Input.Events.POINTER_UP, () => this.openSkillInfo(skill, rank, slot));",
  "    const infoLabel = UiKit.label(this, x, y - 1, 'i', UI.font.tiny, UI.text.accent, true).setOrigin(0.5);\n    circle.on(Phaser.Input.Events.POINTER_UP, () => this.openSkillInfo(skill, rank, slot));\n    this.actionObjects.push(circle, infoLabel);",
  'track info buttons'
);

replaceOnce(
  "      if (effect.handlerId === 'execute-low-hp') tags.add('EJECUCIÓN');",
  "      if (effect.handlerId === 'execute-low-hp') tags.add('EJECUCIÓN');\n      if (effect.handlerId === 'destierro-temporal') tags.add('DESTIERRO');\n      if (effect.handlerId === 'transformacion-control') tags.add('TRANSFORMACIÓN');\n      if (effect.handlerId === 'marca-explosiva') tags.add('BOMBA');\n      if (effect.handlerId === 'aumento-evasion') tags.add('EVASIÓN ↑');\n      if (effect.handlerId === 'transformar-forma') tags.add('CAMBIO DE FORMA');",
  'special tags'
);

replaceOnce(
  "  private async handleCombatAction(playerAction: CombatAction): Promise<void> {\n    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;\n    this.busy = true;\n    this.refreshCombatStats();\n    const enemyAction = BattleEngine.chooseEnemyAction(this.wildChampion);",
  "  private async handleCombatAction(playerAction: CombatAction): Promise<void> {\n    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;\n    if (playerAction.type === 'skill') {\n      const check = SpecialEffectEngine.canUseSkill(this.playerChampion, DataRegistry.skill(playerAction.skillId), this.ensureResourceStore());\n      if (!check.allowed) {\n        this.setMessage(check.message ?? 'No puedes usar esa habilidad todavía.');\n        return;\n      }\n    }\n    this.busy = true;\n    this.refreshCombatStats();\n    const enemyAction = BattleEngine.chooseEnemyAction(this.wildChampion, this.currentFormId(this.wildChampion));",
  'skill resource gate'
);

replaceOnce(
  "      this.setMessage('Elige tu siguiente acción.');",
  "      this.setMessage(this.idlePrompt());",
  'idle prompt after round'
);

replaceOnce(
  "    const defenderMaxHp = BattleEngine.statsFor(defender).hp;",
  "    const defenderMaxHp = this.statsForChampion(defender).hp;\n    const attackerMaxHpBefore = this.statsForChampion(attacker).hp;",
  'form aware defender max'
);

replaceOnce(
  "    const blindChance = BattleEngine.actionHasDamage(action) ? StatusEngine.blindMissChance(attackerStatuses) : 0;\n    const missed = blindChance > 0 && Math.random() < blindChance;",
  "    if (resolution.damage > 0) resolution.damage += SpecialEffectEngine.bonusDamageFromPassive(attacker, this.ensureFormStore());\n\n    const blindChance = BattleEngine.actionHasDamage(action) ? StatusEngine.blindMissChance(attackerStatuses) : 0;\n    const evasionChance = BattleEngine.actionHasDamage(action) ? StatusEngine.evasionMissChance(defenderStatuses) : 0;\n    const missChance = 1 - (1 - blindChance) * (1 - evasionChance);\n    const missed = missChance > 0 && Math.random() < missChance;",
  'blind plus evasion'
);

replaceOnce(
  "      await this.awaitContinue(`${attackerName} falla por Ceguera.`);",
  "      await this.awaitContinue(evasionChance > 0 ? `${defenderName} evita el ataque.` : `${attackerName} falla por Ceguera.`);",
  'miss message'
);

replaceOnce(
  "    if (actor === 'player') this.wildHp = Math.max(0, this.wildHp - actualDamage);\n    else this.playerHp = Math.max(0, this.playerHp - actualDamage);",
  "    if (actor === 'player') this.wildHp = Math.max(0, this.wildHp - actualDamage);\n    else this.playerHp = Math.max(0, this.playerHp - actualDamage);\n    if (actualDamage > 0) {\n      StatusEngine.chargeExplosive(defenderStatuses);\n      SpecialEffectEngine.onDamageTaken(defender, this.ensureResourceStore(), this.ensureFormStore());\n    }",
  'damage charges mechanics'
);

replaceOnce(
  "      if (actor === 'player') this.playerHp = Math.min(BattleEngine.statsFor(attacker).hp, this.playerHp + resolution.heal);\n      else this.wildHp = Math.min(BattleEngine.statsFor(attacker).hp, this.wildHp + resolution.heal);",
  "      if (actor === 'player') this.playerHp = Math.min(this.statsForChampion(attacker).hp, this.playerHp + resolution.heal);\n      else this.wildHp = Math.min(this.statsForChampion(attacker).hp, this.wildHp + resolution.heal);",
  'form aware healing'
);

replaceOnce(
  "    const application = skill\n      ? StatusEngine.applySkillEffects(skill, rank, attackerStatuses, defenderStatuses, true)\n      : { selfAppliedIds: [], enemyAppliedIds: [], messages: [] };\n    this.persistStatusStore();\n    this.refreshUi();",
  "    const application = skill\n      ? StatusEngine.applySkillEffects(skill, rank, attackerStatuses, defenderStatuses, true)\n      : { selfAppliedIds: [], enemyAppliedIds: [], messages: [] };\n    const transformed = skill\n      ? SpecialEffectEngine.applyTransformation(attacker, skill, this.ensureResourceStore(), this.ensureFormStore())\n      : null;\n    if (transformed) this.syncFormVisualAndHp(actor, attackerMaxHpBefore);\n    this.persistSpecialStores();\n    this.persistStatusStore();\n    this.refreshUi();",
  'apply transformation'
);

replaceOnce(
  "    await this.announceAppliedStatuses(defender, defenderStatuses, application.enemyAppliedIds);",
  "    await this.announceAppliedStatuses(defender, defenderStatuses, application.enemyAppliedIds);\n    if (transformed) await this.awaitContinue(`${attackerName} cambia a ${DataRegistry.form(attacker.championId, transformed.formId).name}.`);",
  'transformation message'
);

replaceOnce(
  "    const passiveHeal = BattleEngine.passiveHealing(attacker);",
  "    const passiveHeal = BattleEngine.passiveHealing(attacker, this.currentFormId(attacker));",
  'form passive heal'
);

replaceOnce(
  "    this.finishActorTurn(actor, application.selfAppliedIds);",
  "    this.finishActorTurn(actor, application.selfAppliedIds, Boolean(transformed));",
  'finish transformed turn'
);

replaceOnce(
  "    const poisonDamage = StatusEngine.poisonDamage(statuses);\n\n    if (poisonDamage > 0) {",
  "    const explosive = StatusEngine.consumeExplosiveDetonation(statuses);\n    if (explosive) {\n      const shield = StatusEngine.absorbDamage(statuses, explosive.damage);\n      if (actor === 'player') this.playerHp = Math.max(0, this.playerHp - shield.damage);\n      else this.wildHp = Math.max(0, this.wildHp - shield.damage);\n      this.statusTickFeedback(actor === 'player' ? this.playerSprite : this.wildSprite);\n      this.refreshUi();\n      await this.awaitContinue(`¡La Carga explosiva detona sobre ${name}${explosive.stacks > 0 ? ` con ${explosive.stacks} carga${explosive.stacks === 1 ? '' : 's'}` : ''}!`);\n      if (this.wildHp <= 0) { await this.finishVictory(); return false; }\n      if (this.playerHp <= 0) { await this.handlePlayerKnockout(); return false; }\n    }\n\n    const poisonDamage = StatusEngine.poisonDamage(statuses);\n\n    if (poisonDamage > 0) {",
  'explosive detonation'
);

replaceOnce(
  "    if (StatusEngine.isStunned(statuses)) {\n      await this.awaitContinue(`${name} está aturdido y no puede actuar.`);\n      this.finishActorTurn(actor);\n      return false;\n    }",
  "    const blocked = StatusEngine.blockingKind(statuses);\n    if (blocked) {\n      const message = blocked === 'banish'\n        ? `${name} está fuera del combate este turno.`\n        : blocked === 'polymorph'\n          ? `${name} está transformado y no puede actuar.`\n          : `${name} está aturdido y no puede actuar.`;\n      await this.awaitContinue(message);\n      this.finishActorTurn(actor);\n      return false;\n    }",
  'blocking status messages'
);

replaceOnce(
  "      if (status.kind === 'shield') message = `${name} obtiene un escudo.`;",
  "      if (status.kind === 'shield') message = `${name} obtiene un escudo.`;\n      if (status.kind === 'evasion') message = `${name} aumenta su evasión.`;\n      if (status.kind === 'polymorph') message = `¡${name} queda transformado!`;\n      if (status.kind === 'banish') message = `¡${name} es expulsado temporalmente del combate!`;\n      if (status.kind === 'explosive') message = `¡${name} queda marcado con una Carga explosiva!`;",
  'special status announcements'
);

replaceOnce(
  "  private finishActorTurn(actor: BattleActor, protectedIds: string[] = []): void {\n    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;\n    StatusEngine.advanceTurn(this.statusesFor(champion), protectedIds);\n    this.persistStatusStore();\n    this.refreshUi();\n  }",
  "  private finishActorTurn(actor: BattleActor, protectedIds: string[] = [], skipFormAdvance = false): void {\n    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;\n    StatusEngine.advanceTurn(this.statusesFor(champion), protectedIds);\n    const forms = this.ensureFormStore();\n    SpecialEffectEngine.onTurnFinished(champion, this.ensureResourceStore(), forms);\n    if (!skipFormAdvance && this.currentFormId(champion)) {\n      const oldMaxHp = this.statsForChampion(champion).hp;\n      SpecialEffectEngine.decrementFormAfterAction(champion, forms);\n      const state = SpecialEffectEngine.formState(champion, forms);\n      if (state && state.remainingTurns <= 0) {\n        SpecialEffectEngine.expireFormAtTurnStart(champion, forms);\n        this.syncFormVisualAndHp(actor, oldMaxHp);\n      }\n    }\n    this.persistSpecialStores();\n    this.persistStatusStore();\n    this.refreshUi();\n  }",
  'finish special turn'
);

replaceOnce(
  "  private refreshCombatStats(): void {\n    this.playerStats = StatusEngine.effectiveStats(BattleEngine.statsFor(this.playerChampion), this.statusesFor(this.playerChampion));\n    this.wildStats = StatusEngine.effectiveStats(BattleEngine.statsFor(this.wildChampion), this.statusesFor(this.wildChampion));\n  }",
  "  private refreshCombatStats(): void {\n    this.playerStats = StatusEngine.effectiveStats(this.statsForChampion(this.playerChampion), this.statusesFor(this.playerChampion));\n    this.wildStats = StatusEngine.effectiveStats(this.statsForChampion(this.wildChampion), this.statusesFor(this.wildChampion));\n  }",
  'form aware combat stats'
);

replaceOnce(
  "    this.registry.remove('battle.statuses');",
  "    this.registry.remove('battle.statuses');\n    this.registry.remove('battle.resources');\n    this.registry.remove('battle.forms');\n    this.registry.remove('battle.openingPassives');",
  'cleanup special stores'
);

replaceOnce(
  "  private disableActions(): void {",
  "  private ensureResourceStore(): BattleResourceStore {\n    const stored = this.registry.get('battle.resources') as BattleResourceStore | undefined;\n    if (stored && typeof stored === 'object') return stored;\n    const created: BattleResourceStore = {};\n    this.registry.set('battle.resources', created);\n    return created;\n  }\n\n  private ensureFormStore(): BattleFormStore {\n    const stored = this.registry.get('battle.forms') as BattleFormStore | undefined;\n    if (stored && typeof stored === 'object') return stored;\n    const created: BattleFormStore = {};\n    this.registry.set('battle.forms', created);\n    return created;\n  }\n\n  private persistSpecialStores(): void {\n    this.registry.set('battle.resources', this.ensureResourceStore());\n    this.registry.set('battle.forms', this.ensureFormStore());\n  }\n\n  private currentFormId(champion: ChampionInstance): string | undefined {\n    return SpecialEffectEngine.formId(champion, this.ensureFormStore());\n  }\n\n  private statsForChampion(champion: ChampionInstance): StatBlock {\n    return BattleEngine.statsFor(champion, this.currentFormId(champion));\n  }\n\n  private applyOpeningPassive(champion: ChampionInstance, opponent: ChampionInstance): void {\n    const initialized = (this.registry.get('battle.openingPassives') as string[] | undefined) ?? [];\n    if (initialized.includes(champion.instanceId)) return;\n    const passive = SpecialEffectEngine.passive(champion, this.ensureFormStore());\n    StatusEngine.applySkillEffects(passive, 1, this.statusesFor(champion), this.statusesFor(opponent), true);\n    initialized.push(champion.instanceId);\n    this.registry.set('battle.openingPassives', initialized);\n  }\n\n  private syncFormVisualAndHp(actor: BattleActor, oldMaxHp: number): void {\n    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;\n    const oldHp = actor === 'player' ? this.playerHp : this.wildHp;\n    const newMaxHp = this.statsForChampion(champion).hp;\n    const ratio = Math.max(0, Math.min(1, oldHp / Math.max(1, oldMaxHp)));\n    const newHp = Math.max(1, Math.round(newMaxHp * ratio));\n    if (actor === 'player') {\n      this.playerHp = newHp;\n      this.playerChampion.currentHp = newHp;\n      this.playerHpUi.maxHp = newMaxHp;\n      this.playerSprite.setTexture(this.playerBattleTexture(champion.championId, this.currentFormId(champion)));\n      this.rebuildActions();\n    } else {\n      this.wildHp = newHp;\n      this.wildChampion.currentHp = newHp;\n      this.wildHpUi.maxHp = newMaxHp;\n      this.wildSprite.setTexture(this.wildBattleTexture(champion.championId, this.currentFormId(champion)));\n    }\n  }\n\n  private rebuildActions(): void {\n    for (const object of this.actionObjects) object.destroy();\n    this.actionObjects = [];\n    this.createActions();\n  }\n\n  private idlePrompt(): string {\n    const resource = SpecialEffectEngine.resourceLabel(this.playerChampion, this.ensureResourceStore(), this.ensureFormStore());\n    const form = SpecialEffectEngine.formState(this.playerChampion, this.ensureFormStore());\n    if (form) return `Elige tu siguiente acción. · ${DataRegistry.form(this.playerChampion.championId, form.formId).name} ${form.remainingTurns}t`;\n    return resource ? `Elige tu siguiente acción. · ${resource}` : 'Elige tu siguiente acción.';\n  }\n\n  private disableActions(): void {",
  'special helper methods'
);

replaceOnce(
  "  private refreshUi(): void {\n    this.refreshCombatStats();\n    this.updateHpUi(this.playerHpUi, this.playerHp, this.statusesFor(this.playerChampion));\n    this.updateHpUi(this.wildHpUi, this.wildHp, this.statusesFor(this.wildChampion));",
  "  private refreshUi(): void {\n    this.refreshCombatStats();\n    this.playerHpUi.maxHp = this.playerStats.hp;\n    this.wildHpUi.maxHp = this.wildStats.hp;\n    this.playerHp = Math.min(this.playerHp, this.playerStats.hp);\n    this.wildHp = Math.min(this.wildHp, this.wildStats.hp);\n    this.updateHpUi(this.playerHpUi, this.playerHp, this.statusesFor(this.playerChampion));\n    this.updateHpUi(this.wildHpUi, this.wildHp, this.statusesFor(this.wildChampion));",
  'dynamic max hp ui'
);

replaceOnce(
  "    if (status.kind === 'shield') return '◆';\n    if (status.id === 'slow') return '↓';",
  "    if (status.kind === 'shield') return '◆';\n    if (status.kind === 'evasion') return '◇';\n    if (status.kind === 'polymorph') return '?';\n    if (status.kind === 'banish') return '↗';\n    if (status.kind === 'explosive') return String(status.stacks ?? 0);\n    if (status.id === 'slow') return '↓';",
  'special status symbols'
);

replaceOnce(
  "      this.setMessage('Elige tu siguiente acción.');",
  "      this.setMessage(this.idlePrompt());",
  'idle prompt enemy response'
);

fs.writeFileSync(path, text);
console.log('v15 BattleScene integration applied');
