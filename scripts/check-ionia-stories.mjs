import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'vite';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const server = await createServer({ server: { middlewareMode: true } });
try {
  const { DataRegistry } = await server.ssrLoadModule('/src/data/DataRegistry.ts');
  const { QuestService } = await server.ssrLoadModule('/src/systems/quests/QuestService.ts');
  const { createNewGame } = await server.ssrLoadModule('/src/state/GameState.ts');
  assert.deepEqual(DataRegistry.validate(), [], 'All live content references must resolve');
  const { SaveService } = await server.ssrLoadModule('/src/systems/save/SaveService.ts');
  const legacy = createNewGame('Legacy');
  legacy.gold = 777;
  legacy.worldProgress.flags.push('story:ionia-sett-ledger', 'echo:sett-resonance', 'story:other-arc');
  legacy.quests['ionia-sett-debt'] = { status: 'active', currentStepIndex: 2, objectiveProgress: {'objetivo-1': 1} };
  const restored = SaveService.deserializeSave(JSON.stringify(legacy));
  assert.equal(restored.gold, 777);
  assert.equal(restored.quests['ionia-sett-debt'], undefined);
  assert(restored.worldProgress.flags.includes('echo:sett-resonance'));
  assert(restored.worldProgress.flags.includes('story:other-arc'));
  assert(!restored.worldProgress.flags.includes('story:ionia-sett-ledger'));
  legacy.quests['ionia-sett-debt'].status = 'completed';
  const completed = SaveService.deserializeSave(JSON.stringify(legacy));
  assert.equal(completed.quests['ionia-sett-debt'].status, 'completed');
  assert.equal(completed.gold, 777, 'Migration must never pay rewards again');
  console.log('Legacy save migration preserves money, earned echoes and other stories.');
  const npcs = DataRegistry.npcs(), dialogues = DataRegistry.dialogues();
  const storyFiles = readdirSync('src/data/stories').map(file => read(`src/data/stories/${file}`));
  const stories = new Map(storyFiles.map(story => [story.id, story]));
  const dialoguesById = new Map(dialogues.map(d => [d.id, d]));
  for (const npc of npcs) for (const variant of npc.dialogueVariants ?? []) assert(dialoguesById.has(variant.dialogueId), `${npc.id}: unknown variant`);
  for (const dialogue of dialogues) for (const node of dialogue.nodes) {
    for (const action of node.actions ?? []) if (action.type === 'play-story') assert(stories.has(action.storyId), `Missing scene ${action.storyId}`);
  }
  assert.equal(stories.get('karma-flashback').beats.reduce((sum, beat) => sum + beat.durationMs, 0), 180000);
  assert(stories.get('karma-flashback').beats.every(beat => beat.grayscale));
  for (const story of stories.values()) for (const beat of story.beats) {
    assert(DataRegistry.map(beat.mapId), `${story.id}: unknown background`);
    assert(beat.text.length <= 300, `${story.id}: overlong subtitle`);
    for (const actor of beat.actors) {
      if (actor.actorId) DataRegistry.worldActor(actor.actorId);
      if (actor.championId) DataRegistry.champion(actor.championId);
    }
  }
  for (const id of ['ionia-sett-debt', 'ionia-karma-memory', 'ionia-jhin-trail']) {
    const quest = DataRegistry.quest(id), save = createNewGame();
    assert(QuestService.start(save, id));
    assert.equal(save.quests[id].revision, 2);
    // Witnesses can be heard in either order. Their evidence stays recorded.
    for (const step of [...quest.steps].reverse()) for (const objective of step.objectives) {
      QuestService.recordEvent(save, { type: objective.type, targetId: objective.targetId });
    }
    assert.equal(save.quests[id].status, 'ready', `${id}: out-of-order evidence stalls`);
    assert(QuestService.complete(save, id));
    assert(save.worldProgress.flags.includes(`echo:${id.split('-')[1]}-resonance`));
    assert(!QuestService.complete(save, id), 'No duplicate completion');
    if (id !== 'ionia-jhin-trail') assert(quest.steps.every(step => step.objectives.every(o => o.type !== 'defeat')), `${id}: forced duel`);
    console.log(`${id}: complete, resonance unlocked, out-of-order evidence retained.`);
  }
  // Play each data-authored conversation/scene along the real mission path.
  const { WorldActionService } = await server.ssrLoadModule('/src/systems/world/WorldActionService.ts');
  const runDialogue = (save, id) => {
    const dialogue = dialoguesById.get(id); assert(dialogue, id);
    let node = dialogue.nodes.find(n => n.id === dialogue.startNodeId);
    while (node) {
      for (const action of node.actions ?? []) {
        if (action.type === 'play-story') WorldActionService.applyAll(save, stories.get(action.storyId).completionActions);
        else WorldActionService.apply(save, action);
      }
      const choice = node.choices?.[0];
      WorldActionService.applyAll(save, choice?.actions);
      node = dialogue.nodes.find(n => n.id === (choice?.nextNodeId ?? node.nextNodeId));
    }
  };
  for (const [id, sequence] of [
    ['ionia-sett-debt', ['ionia-sett-intro','ionia-sett-witness','ionia-sett-mother','ionia-sett-ledger','ionia-sett-collector','ionia-sett-resolution']],
    ['ionia-jhin-trail', ['ionia-jhin-witness','ionia-jhin-first','ionia-jhin-rice','ionia-jhin-register','ionia-jhin-elan','ionia-jhin-bullet','ionia-jhin-aya-return','ionia-jhin-intro','BATTLE','ionia-jhin-won']],
    ['ionia-karma-memory', ['ionia-karma-intro','ionia-karma-keeper','ionia-karma-tao','ionia-karma-suyin','ionia-karma-stone','ionia-karma-inscription','ionia-karma-memory-scene','ionia-karma-resolution']]
  ]) {
    const save = createNewGame();
    for (const dialogue of sequence) {
      if (dialogue === 'BATTLE') WorldActionService.applyAll(save, DataRegistry.duel('ionia-jhin-unmasking').victoryActions);
      else runDialogue(save, dialogue);
    }
    assert.equal(save.quests[id].status, 'completed', `${id}: data-authored path stalled`);
    console.log(`${id}: actual dialogue, scene and battle actions reach the epilogue.`);
  }
} finally { await server.close(); }
