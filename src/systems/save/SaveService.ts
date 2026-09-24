import { DataRegistry } from '../../data/DataRegistry';
import type { ActiveSkillSlot, ChampionInstance, SkillRanks } from '../../data/types';
import { createNewGame, type SaveGame } from '../../state/GameState';
import { EchoRegistryService } from '../echoes/EchoRegistryService';
import { ProgressionService } from '../progression/ProgressionService';
import { V15TestRosterService } from '../testing/V15TestRosterService';

const LEGACY_SAVE_KEY = 'ecos-de-runaterra.save.v1';
const PROFILE_INDEX_KEY = 'ecos-de-runaterra.profiles.v1';
const ACTIVE_PROFILE_KEY = 'ecos-de-runaterra.active-profile.v1';
const PROFILE_PREFIX = 'ecos-de-runaterra.profile.v1';

export type SaveProfileKind = 'story' | 'qa-progression' | 'qa-combat' | 'legacy';

export interface SaveProfile {
  id: string;
  name: string;
  kind: SaveProfileKind;
  createdAt: number;
  updatedAt?: number;
  recoveryUpdatedAt?: number;
}

type LegacyChampion = Partial<ChampionInstance> & {
  level?: number;
  experience?: number;
};

export class SaveService {
  static initialize(): void {
    const profiles = this.readProfiles();
    if (profiles.length > 0) {
      const active = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (!active || !profiles.some((profile) => profile.id === active)) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, profiles[0].id);
      }
      return;
    }

    const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!legacyRaw) return;

    const legacySave = this.deserializeSave(legacyRaw);
    const profile: SaveProfile = {
      id: crypto.randomUUID(),
      name: legacySave?.player.name ? `${legacySave.player.name} · Legacy` : 'Partida Legacy',
      kind: 'legacy',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      recoveryUpdatedAt: Date.now()
    };
    this.writeProfiles([profile]);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);

    if (legacySave) {
      this.writeSnapshot(profile.id, 'manual', legacySave);
      this.writeSnapshot(profile.id, 'recovery', legacySave);
    }
  }

  static profiles(): SaveProfile[] {
    return [...this.readProfiles()].sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
  }

  static profile(profileId: string): SaveProfile | undefined {
    return this.readProfiles().find((profile) => profile.id === profileId);
  }

  static activeProfile(): SaveProfile | undefined {
    const id = localStorage.getItem(ACTIVE_PROFILE_KEY);
    return id ? this.profile(id) : undefined;
  }

  static setActiveProfile(profileId: string): void {
    if (!this.profile(profileId)) throw new Error(`Unknown save profile: ${profileId}`);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  }

  static createProfile(name: string, kind: SaveProfileKind = 'story'): SaveProfile {
    const trimmed = name.trim() || 'Viajero';
    const profile: SaveProfile = {
      id: crypto.randomUUID(),
      name: trimmed.slice(0, 24),
      kind,
      createdAt: Date.now()
    };
    const profiles = this.readProfiles();
    profiles.push(profile);
    this.writeProfiles(profiles);
    this.setActiveProfile(profile.id);

    if (kind === 'qa-progression' || kind === 'qa-combat') {
      const save = this.createGameForProfile(profile.id);
      this.saveManual(save, profile.id);
    }

    return this.profile(profile.id) ?? profile;
  }

  static renameProfile(profileId: string, name: string): void {
    const profiles = this.readProfiles();
    const profile = profiles.find((entry) => entry.id === profileId);
    if (!profile) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    profile.name = trimmed.slice(0, 24);
    this.writeProfiles(profiles);
  }

  static deleteProfile(profileId: string): void {
    const profiles = this.readProfiles().filter((profile) => profile.id !== profileId);
    this.writeProfiles(profiles);
    localStorage.removeItem(this.snapshotKey(profileId, 'manual'));
    localStorage.removeItem(this.snapshotKey(profileId, 'recovery'));

    if (localStorage.getItem(ACTIVE_PROFILE_KEY) === profileId) {
      if (profiles[0]) localStorage.setItem(ACTIVE_PROFILE_KEY, profiles[0].id);
      else localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
  }

  static createGameForProfile(profileId?: string): SaveGame {
    const profile = profileId ? this.profile(profileId) : this.activeProfile();
    if (!profile) return createNewGame();
    this.setActiveProfile(profile.id);

    if (profile.kind === 'qa-progression') return this.createQaProgressionSave(profile.name);
    if (profile.kind === 'qa-combat') return this.createQaCombatSave(profile.name);
    return createNewGame(profile.name.replace(/ · Legacy$/, ''));
  }

  static load(): SaveGame {
    const profile = this.activeProfile();
    if (!profile) return createNewGame();
    return this.loadManual(profile.id) ?? this.loadRecovery(profile.id) ?? this.createGameForProfile(profile.id);
  }

  static loadManual(profileId?: string): SaveGame | undefined {
    const id = profileId ?? this.activeProfile()?.id;
    if (!id) return undefined;
    const raw = localStorage.getItem(this.snapshotKey(id, 'manual'));
    return raw ? this.deserializeSave(raw) : undefined;
  }

  static loadRecovery(profileId?: string): SaveGame | undefined {
    const id = profileId ?? this.activeProfile()?.id;
    if (!id) return undefined;
    const raw = localStorage.getItem(this.snapshotKey(id, 'recovery'));
    return raw ? this.deserializeSave(raw) : undefined;
  }

  static hasManualSave(profileId?: string): boolean {
    const id = profileId ?? this.activeProfile()?.id;
    return Boolean(id && localStorage.getItem(this.snapshotKey(id, 'manual')));
  }

  static hasRecoverySave(profileId?: string): boolean {
    const id = profileId ?? this.activeProfile()?.id;
    return Boolean(id && localStorage.getItem(this.snapshotKey(id, 'recovery')));
  }

  static hasNewerRecovery(profileId?: string): boolean {
    const profile = profileId ? this.profile(profileId) : this.activeProfile();
    if (!profile?.recoveryUpdatedAt) return false;
    if (!this.hasRecoverySave(profile.id)) return false;
    return !profile.updatedAt || profile.recoveryUpdatedAt > profile.updatedAt + 1000;
  }

  /** Runtime persistence. This is a recovery snapshot, not the player's manual save. */
  static save(state: SaveGame, profileId?: string): void {
    const profile = this.resolveProfile(profileId);
    if (!profile) return;
    EchoRegistryService.syncOwned(state);
    this.writeSnapshot(profile.id, 'recovery', state);
    this.updateProfile(profile.id, { recoveryUpdatedAt: Date.now() });
  }

  /** Pokemon-style manual save. CONTINUE always reads this snapshot. */
  static saveManual(state: SaveGame, profileId?: string): void {
    const profile = this.resolveProfile(profileId);
    if (!profile) return;
    EchoRegistryService.syncOwned(state);
    const now = Date.now();
    this.writeSnapshot(profile.id, 'manual', state);
    this.writeSnapshot(profile.id, 'recovery', state);
    this.updateProfile(profile.id, { updatedAt: now, recoveryUpdatedAt: now });
  }

  static discardRecovery(profileId?: string): void {
    const profile = this.resolveProfile(profileId);
    if (!profile) return;
    localStorage.removeItem(this.snapshotKey(profile.id, 'recovery'));
    this.updateProfile(profile.id, { recoveryUpdatedAt: undefined });
  }

  /** Clears the active profile's save data but keeps the profile itself. */
  static clear(profileId?: string): void {
    const profile = this.resolveProfile(profileId);
    if (!profile) return;
    localStorage.removeItem(this.snapshotKey(profile.id, 'manual'));
    localStorage.removeItem(this.snapshotKey(profile.id, 'recovery'));
    this.updateProfile(profile.id, { updatedAt: undefined, recoveryUpdatedAt: undefined });
  }

  private static createQaProgressionSave(playerName: string): SaveGame {
    const save = createNewGame(playerName);
    const echo = DataRegistry.echo('teemo');
    const mastery = 1;
    const champion: ChampionInstance = {
      instanceId: crypto.randomUUID(),
      championId: 'teemo',
      mastery,
      masteryExperience: 0,
      skillRanks: ProgressionService.defaultSkillRanks(mastery),
      unspentSkillPoints: ProgressionService.earnedManualSkillPoints(mastery),
      currentHp: Math.round(echo.baseStats.hp),
      runeTraits: [],
      equippedItems: []
    };

    save.party = [champion];
    save.echoRegistry.teemo = 'linked';
    save.inventory = { 'ruby-crystal': 1 };
    save.gold = 150;
    save.worldProgress.flags = ['story:intro-complete', 'qa:progression'];
    return save;
  }

  private static createQaCombatSave(playerName: string): SaveGame {
    const save = createNewGame(playerName);
    save.currentMapId = 'bandle-village';
    save.playerPosition = { x: 1280, y: 1500 };
    save.worldProgress.currentZoneId = 'bandle-village';
    if (!save.worldProgress.unlockedZones.includes('bandle-village')) save.worldProgress.unlockedZones.push('bandle-village');
    save.worldProgress.flags = ['story:intro-complete', 'qa:combat'];
    save.inventory = {
      'long-sword': 2,
      'ruby-crystal': 2,
      'amplifying-tome': 2,
      'sapphire-crystal': 2,
      'dagger': 2
    };
    save.gold = 5000;
    save.unlockedRecipes = ['recipe-lost-chapter', 'recipe-speed-core'];
    V15TestRosterService.apply(save);
    return save;
  }

  private static resolveProfile(profileId?: string): SaveProfile | undefined {
    return profileId ? this.profile(profileId) : this.activeProfile();
  }

  private static snapshotKey(profileId: string, type: 'manual' | 'recovery'): string {
    return `${PROFILE_PREFIX}.${profileId}.${type}`;
  }

  private static writeSnapshot(profileId: string, type: 'manual' | 'recovery', save: SaveGame): void {
    localStorage.setItem(this.snapshotKey(profileId, type), JSON.stringify(save));
  }

  private static updateProfile(profileId: string, changes: Partial<SaveProfile>): void {
    const profiles = this.readProfiles();
    const profile = profiles.find((entry) => entry.id === profileId);
    if (!profile) return;
    Object.assign(profile, changes);
    this.writeProfiles(profiles);
  }

  private static readProfiles(): SaveProfile[] {
    const raw = localStorage.getItem(PROFILE_INDEX_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as SaveProfile[];
      return Array.isArray(parsed) ? parsed.filter((profile) => profile && typeof profile.id === 'string') : [];
    } catch {
      return [];
    }
  }

  private static writeProfiles(profiles: SaveProfile[]): void {
    localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(profiles));
  }

  private static deserializeSave(raw: string): SaveGame | undefined {
    const defaults = createNewGame();
    try {
      const parsed = JSON.parse(raw) as Partial<SaveGame>;
      if (parsed.version !== 1) return undefined;

      const party = Array.isArray(parsed.party)
        ? parsed.party.map((champion) => this.migrateChampion(champion as LegacyChampion))
        : defaults.party;
      const storage = Array.isArray(parsed.storage)
        ? parsed.storage.map((champion) => this.migrateChampion(champion as LegacyChampion))
        : defaults.storage;

      const save: SaveGame = {
        ...defaults,
        ...parsed,
        player: {
          ...defaults.player,
          ...(parsed.player ?? {})
        },
        playerPosition: parsed.playerPosition ?? defaults.playerPosition,
        party,
        storage,
        echoRegistry: parsed.echoRegistry ?? defaults.echoRegistry,
        runes: {
          ...defaults.runes,
          ...(parsed.runes ?? {}),
          unlockedIds: parsed.runes?.unlockedIds ?? defaults.runes.unlockedIds
        },
        inventory: parsed.inventory ?? defaults.inventory,
        artifactLevels: parsed.artifactLevels ?? defaults.artifactLevels,
        quests: parsed.quests ?? defaults.quests,
        gold: parsed.gold ?? defaults.gold,
        unlockedRecipes: parsed.unlockedRecipes ?? defaults.unlockedRecipes,
        checkpoint: {
          ...defaults.checkpoint,
          ...(parsed.checkpoint ?? {})
        },
        worldProgress: {
          ...defaults.worldProgress,
          ...(parsed.worldProgress ?? {}),
          unlockedRegions: parsed.worldProgress?.unlockedRegions ?? defaults.worldProgress.unlockedRegions,
          unlockedZones: parsed.worldProgress?.unlockedZones ?? defaults.worldProgress.unlockedZones,
          flags: parsed.worldProgress?.flags ?? defaults.worldProgress.flags,
          spokenNpcIds: parsed.worldProgress?.spokenNpcIds ?? defaults.worldProgress.spokenNpcIds
        }
      };

      EchoRegistryService.syncOwned(save);
      return save;
    } catch {
      return undefined;
    }
  }

  private static migrateChampion(raw: LegacyChampion): ChampionInstance {
    const legacyLevel = Number(raw.level ?? 1);
    const savedMastery = Number(raw.mastery ?? 1);
    const mastery = Math.max(1, Math.min(ProgressionService.maxMastery(), Math.round(Math.max(savedMastery, legacyLevel))));
    const defaultRanks = ProgressionService.defaultSkillRanks(mastery);
    const ranks: SkillRanks = {
      q: raw.skillRanks?.q ?? defaultRanks.q,
      w: raw.skillRanks?.w ?? defaultRanks.w,
      e: raw.skillRanks?.e ?? defaultRanks.e,
      r: raw.skillRanks?.r ?? defaultRanks.r
    };

    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
    const manuallySpent = slots.reduce((total, slot) => total + Math.max(0, ranks[slot] - defaultRanks[slot]), 0);
    const inferredUnspent = Math.max(0, ProgressionService.earnedManualSkillPoints(mastery) - manuallySpent);

    const champion: ChampionInstance = {
      instanceId: raw.instanceId ?? crypto.randomUUID(),
      championId: raw.championId ?? 'garen',
      mastery,
      masteryExperience: Math.max(0, Math.round(Number(raw.masteryExperience ?? raw.experience ?? 0))),
      skillRanks: ranks,
      unspentSkillPoints: raw.unspentSkillPoints ?? inferredUnspent,
      currentHp: Math.max(0, Math.round(Number(raw.currentHp ?? 1))),
      runeTraits: raw.runeTraits ?? [],
      equippedItems: raw.equippedItems ?? []
    };

    return ProgressionService.normalizeChampion(champion);
  }
}
