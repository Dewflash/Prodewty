import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { colors } from '../../src/theme/colors';
import { fonts, fontSize } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { SwipeNavWrapper } from '../../src/components/SwipeNavWrapper';
import { getRPGState, type RPGState } from '../../src/db/rpg';
import {
  getComputedStats, getFatigue, getPendingQuests, getAcceptedQuests, getSkippedQuests,
  getCompletedQuests, reinstateQuest, generateQuests,
  getDungeons, startDungeon, getActiveDungeonRun, submitDungeonClear, failDungeon, abandonDungeon,
  acceptQuest, completeQuest, skipQuest, deleteQuest,
  allocateStat, getQuestCompletedCount, getDeathCount, getAbandonedCount,
  getInventoryBySlot, getUnequippedBySlots, getDropRates,
  getEquippedItem, equipItem, unequipItem, useConsumable, getActiveBuffs,
  type GameStats, type Dungeon, type Quest, type DungeonClearResult, type InventoryItem, type ActiveBuff,
} from '../../src/db/game';
import { RARITY_COLOR, RARITY_BG, type Rarity } from '../../src/constants/rarity';
import { triggerDeathCheck } from '../../src/db/deathCheckSignal';
import { triggerCurrencyRefresh } from '../../src/db/currencySignal';

// Sub-components
import { SystemBar, StatRow, STAT_KEYS } from '../../src/components/game/StatsSection';
import { InventorySection, type InvTab } from '../../src/components/game/InventorySection';
import { fmtBuff, fmtTimer } from '../../src/utils/format';
import { PendingQuestCard, AcceptedQuestCard, HiddenQuestCard, CompletedQuestCard } from '../../src/components/game/QuestCards';
import { DungeonCard, RANK_COLOR } from '../../src/components/game/DungeonCard';
import { playSound, switchBGM } from '../../src/services/audio';

// ─── Types ────────────────────────────────────────────────────────────────────

type GameSection  = 'stats' | 'inventory' | 'quests' | 'dungeons';
type DungeonPhase = 'entry' | 'active' | 'result' | null;



// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GameScreen() {
  const [section,      setSection]      = useState<GameSection>('stats');
  const [rpg,          setRpg]          = useState<RPGState | null>(null);
  const [stats,        setStats]        = useState<GameStats | null>(null);
  const [fatigue,      setFatigue]      = useState(false);
  const [dungeons,     setDungeons]     = useState<Dungeon[]>([]);
  const [pending,      setPending]      = useState<Quest[]>([]);
  const [accepted,     setAccepted]     = useState<Quest[]>([]);
  const [skipped,      setSkipped]      = useState<Quest[]>([]);
  const [completed,    setCompleted]    = useState<Quest[]>([]);
  const [deaths,       setDeaths]       = useState(0);
  const [cleared,      setCleared]      = useState(0);
  const [abandoned,    setAbandoned]    = useState(0);
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const [activeBuffs,  setActiveBuffs]  = useState<ActiveBuff[]>([]);

  // Dungeon run state
  const [selectedDungeon, setSelectedDungeon] = useState<Dungeon | null>(null);
  const [dungeonPhase,    setDungeonPhase]    = useState<DungeonPhase>(null);
  const [activeRunId,     setActiveRunId]     = useState<number | null>(null);
  const [timerSeconds,    setTimerSeconds]    = useState(0);
  const [clearResult,     setClearResult]     = useState<DungeonClearResult | null>(null);
  const [useMp,           setUseMp]           = useState(0);
  const [mpInfoVisible,   setMpInfoVisible]   = useState(false);

  // Quest state
  const [completingQuest, setCompletingQuest] = useState<Quest | null>(null);
  const [questNotes,      setQuestNotes]      = useState('');
  const [questPreview,    setQuestPreview]    = useState(false);

  // Inventory & modal state
  const [equipRefreshKey, setEquipRefreshKey] = useState(0);
  const [invTab,          setInvTab]          = useState<InvTab>('equipment');
  const [itemBrowserSlot, setItemBrowserSlot] = useState<string | null>(null);
  const [itemBrowserTitle,setItemBrowserTitle]= useState('');
  const [browserItems,    setBrowserItems]    = useState<InventoryItem[]>([]);
  // Set when the browser is showing an aggregate (multi-slot) view, e.g. "unused catalysts" —
  // equip/unequip then refreshes via getUnequippedBySlots(...) instead of getInventoryBySlot(slot).
  const [browserSlots,    setBrowserSlots]    = useState<string[] | null>(null);
  const [rarityInfoRank,  setRarityInfoRank]  = useState<string | null>(null);
  const [gameInfoVisible, setGameInfoVisible] = useState(false);

  // ─── Data loading ───────────────────────────────────────────────────────────

  function reload() {
    const dList = getDungeons();
    setRpg(getRPGState());
    setStats(getComputedStats());
    setFatigue(getFatigue());
    setDungeons(dList);
    generateQuests();
    setPending(getPendingQuests());
    setAccepted(getAcceptedQuests());
    setDeaths(getDeathCount());
    setCleared(getQuestCompletedCount());
    setAbandoned(getAbandonedCount());
    setSkipped(getSkippedQuests());
    setCompleted(getCompletedQuests());
    setActiveBuffs(getActiveBuffs());

    const activeRun = getActiveDungeonRun();
    if (activeRun && activeRunId === null) {
      const dungeon = dList.find(d => d.id === activeRun.dungeon_id) ?? null;
      if (dungeon) {
        const elapsed   = (Date.now() - new Date(activeRun.started_at).getTime()) / 1000;
        const remaining = Math.max(0, dungeon.duration_mins * 60 - Math.floor(elapsed));
        setActiveRunId(activeRun.run_id);
        setSelectedDungeon(dungeon);
        if (remaining > 0) {
          setTimerSeconds(remaining);
          setDungeonPhase('active');
        } else {
          failDungeon(activeRun.run_id, dungeon);
          setClearResult(null);
          setDungeonPhase('result');
        }
      }
    }
  }

  useFocusEffect(useCallback(() => { void switchBGM('game'); }, []));
  useFocusEffect(useCallback(() => { reload(); }, []));

  // Countdown tick
  useEffect(() => {
    if (dungeonPhase !== 'active' || timerSeconds <= 0) return;
    const t = setTimeout(() => setTimerSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [dungeonPhase, timerSeconds]);

  // Auto-fail on timer expiry
  useEffect(() => {
    if (dungeonPhase !== 'active' || timerSeconds !== 0) return;
    if (activeRunId !== null && selectedDungeon) {
      failDungeon(activeRunId, selectedDungeon);
      playSound('faileddungeon');
      setClearResult(null);
      setDungeonPhase('result');
      reload();
    }
  }, [timerSeconds, dungeonPhase, activeRunId, selectedDungeon]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function closeDungeonFlow() {
    setSelectedDungeon(null);
    setDungeonPhase(null);
    setActiveRunId(null);
    setTimerSeconds(0);
    setClearResult(null);
    reload();
  }

  function handleAllocate(key: string) {
    const res = allocateStat(key);
    if (res === 'no_ap') { Alert.alert('No AP', 'Level up to earn more Ability Points.'); return; }
    playSound('statusgameystatsadd');
    reload();
  }

  function handleEnterGate(dungeon: Dungeon) {
    if (activeRunId !== null && selectedDungeon?.id === dungeon.id) { setDungeonPhase('active'); return; }
    setSelectedDungeon(dungeon);
    setUseMp(0);
    setDungeonPhase('entry');
  }

  function handleStartTimer() {
    if (!selectedDungeon) return;
    const runId = startDungeon(selectedDungeon.id, useMp);
    setActiveRunId(runId);
    setTimerSeconds(selectedDungeon.duration_mins * 60);
    setDungeonPhase('active');
  }

  function handleSubmitClear() {
    if (activeRunId === null || !selectedDungeon) return;
    Alert.alert('Gate Cleared?', 'Confirm you completed the objective.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit Clear', onPress: () => {
        const result = submitDungeonClear(activeRunId!, selectedDungeon!);
        playSound('collectcoin');
        setClearResult(result);
        setDungeonPhase('result');
        reload();
        triggerCurrencyRefresh();
      }},
    ]);
  }

  function handleFailDungeon() {
    if (activeRunId === null || !selectedDungeon) return;
    Alert.alert('Fail Dungeon?', 'HP will be deducted based on the gap between this gate\'s rank and your tier.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Fail', style: 'destructive', onPress: () => {
        failDungeon(activeRunId!, selectedDungeon!);
        playSound('faileddungeon');
        triggerDeathCheck();
        setClearResult(null);
        setDungeonPhase('result');
        reload();
      }},
    ]);
  }

  function handleAbandon() {
    if (activeRunId === null) return;
    Alert.alert('Abandon Dungeon?', 'No penalty, no reward. Timer stops.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Abandon', style: 'destructive', onPress: () => { abandonDungeon(activeRunId!); playSound('abandondungeon'); closeDungeonFlow(); }},
    ]);
  }

  function openItemBrowser(slotType: string, title: string, items: InventoryItem[]) {
    setItemBrowserSlot(slotType);
    setItemBrowserTitle(title);
    setBrowserItems(items);
    setBrowserSlots(null);
  }

  // Aggregate browser — shows unequipped items spanning several slot_types at once
  // (e.g. "unused catalysts" tile spans catalyst_str / catalyst_agi / ... ).
  function openAggregateBrowser(slots: string[], title: string) {
    setItemBrowserSlot(slots[0] ?? 'aggregate');
    setItemBrowserTitle(title);
    setBrowserItems(getUnequippedBySlots(slots));
    setBrowserSlots(slots);
  }

  function handleEquipItem(item: InventoryItem) {
    if (!item.slot_type) return;
    equipItem(item.id, item.slot_type);
    playSound('equipingameinventory');
    setBrowserItems(browserSlots ? getUnequippedBySlots(browserSlots) : getInventoryBySlot(item.slot_type));
    setEquipRefreshKey(k => k + 1);
    reload();
  }

  function handleUnequipItem(item: InventoryItem) {
    if (!item.slot_type) return;
    unequipItem(item.id);
    playSound('equipingameinventory');
    setBrowserItems(browserSlots ? getUnequippedBySlots(browserSlots) : getInventoryBySlot(item.slot_type));
    setEquipRefreshKey(k => k + 1);
    reload();
  }

  function handleUseConsumable(item: InventoryItem) {
    const result = useConsumable(item.id);
    if (result === 'ok') {
      playSound('consumableuse');
      setActiveBuffs(getActiveBuffs());
      if (itemBrowserSlot) setBrowserItems(getInventoryBySlot(itemBrowserSlot));
      reload();
    } else {
      Alert.alert('Cannot use', 'Item not found in inventory.');
    }
  }

  function handleCompleteQuest() {
    if (!completingQuest) return;
    completeQuest(completingQuest.id, questNotes);
    playSound('collectcoin');
    setCompletingQuest(null);
    setQuestNotes('');
    reload();
    triggerCurrencyRefresh();
  }

  // ─── Derived values ─────────────────────────────────────────────────────────

  const hp       = rpg?.hp    ?? 100;
  const hpMax    = rpg?.hp_max ?? 100;
  const ap       = rpg?.ap    ?? 0;
  const coins    = rpg?.coins ?? 0;
  const rankColor = selectedDungeon ? (RANK_COLOR[selectedDungeon.rank] ?? colors.textMuted) : colors.textMuted;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SwipeNavWrapper currentIndex={4}>
    <SafeAreaView style={s.safe}>

      {/* Ribbon */}
      <View style={s.ribbon}>
        <View style={s.ribbonGroupLeft}>
          <Pressable style={s.ribbonIcon} onPress={() => setQuestPreview(true)}>
            <Feather name="book-open" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable style={s.ribbonIcon} onPress={() => setGameInfoVisible(true)}>
            <Feather name="info" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
        <Text style={s.ribbonTitle}>SOLO LEVELING</Text>
        <View style={s.ribbonGroup}>
          <Pressable style={s.ribbonIcon} onPress={() => router.push('/store')}>
            <Feather name="shopping-bag" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable style={s.ribbonIcon} onPress={() => router.push('/game-log')}>
            <Feather name="terminal" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* Section tabs */}
      <View style={s.tabs}>
        {(['stats', 'inventory', 'quests', 'dungeons'] as GameSection[]).map(tab => (
          <Pressable key={tab} onPress={() => setSection(tab)} style={[s.tab, section === tab && s.tabActive]}>
            <Text style={[s.tabTxt, section === tab && s.tabTxtActive]}>{tab.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* ── STATS ── */}
        {section === 'stats' && (
          <View style={s.panel}>
            <View style={s.panelHeader}>
              <View style={s.levelBadge}>
                <Text style={s.levelTxt}>LVL {rpg?.current_level ?? 1}</Text>
              </View>
              <View style={s.titleCol}>
                <Text style={s.jobTxt}>JOB: {rpg?.job ?? '—'}</Text>
                <Text style={s.rankTitle}>{rpg?.title ?? 'Unranked'}</Text>
              </View>
              <View style={s.vitalsMini}>
                <Text style={s.vitalsRow}>AP: <Text style={s.vitalsVal}>{ap}</Text></Text>
                <Text style={s.vitalsRow}>Coins: <Text style={s.vitalsVal}>{coins}</Text></Text>
              </View>
            </View>

            <SystemBar label="HP" value={hp} max={hpMax} color="#EF4444" />
            <SystemBar label="MP" value={rpg?.mp ?? 0} max={100} color="#8B5CF6" />

            {fatigue && (
              <View style={s.fatigueBadge}>
                <Text style={s.fatigueTxt}>FATIGUE — Energy consistently low. STA penalised in dungeon combat.</Text>
              </View>
            )}

            <View style={s.divider} />
            <View style={s.statusWindowHeader}>
              <Text style={s.sectionLabel}>STATUS WINDOW</Text>
              <Pressable onPress={() => Alert.alert(
                'How stats grow',
                'Each stat = AP allocation + activity gain.\n\n' +
                '• AP: earned on level-up (10 AP per level gained). Spend 1 AP → permanently +1 to a stat of your choice using the + button.\n\n' +
                '• Activity gain: every activity log directly adds +1 to the stat tied to that category\'s chosen "Attribute (for Game)" — set when you create or customise an activity tag.',
              )} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Feather name="info" size={13} color={colors.textMuted} />
              </Pressable>
            </View>

            {stats && STAT_KEYS.map(stat => (
              <StatRow
                key={stat.key as string}
                stat={stat}
                value={stats[stat.key] as number}
                apPart={stats[`${stat.key}_ap` as keyof GameStats] as number}
                autoPart={stats[`${stat.key}_auto` as keyof GameStats] as number}
                ap={ap}
                onAllocate={handleAllocate}
                expanded={expandedStat === stat.abbr}
                onToggle={() => setExpandedStat(prev => prev === stat.abbr ? null : stat.abbr)}
              />
            ))}

            <View style={s.divider} />
            <Text style={s.sectionLabel}>WEAPON</Text>
            {(() => {
              const equippedWeapons = ['sword', 'dagger', 'shield', 'grimoire', 'scepter']
                .map(slot => getEquippedItem(slot)).filter(Boolean) as InventoryItem[];
              return equippedWeapons.length === 0
                ? <Text style={s.mutedVal}>— None equipped —</Text>
                : equippedWeapons.map(item => {
                    const buffStr = item.stat_buff ? fmtBuff(item.stat_buff) : null;
                    return (
                      <View key={item.id} style={s.weaponRow}>
                        <Text style={[s.mutedVal, { color: RARITY_COLOR[item.rarity as Rarity] ?? colors.textPrimary, flex: 1 }]}>
                          {item.item_name}
                        </Text>
                        {buffStr && <Text style={s.buffChip}>{buffStr}</Text>}
                      </View>
                    );
                  });
            })()}

            <View style={s.divider} />
            <Text style={s.sectionLabel}>BUFFS</Text>
            {activeBuffs.length === 0
              ? <Text style={s.mutedVal}>— No active buffs —</Text>
              : activeBuffs.map(b => (
                  <View key={b.id} style={s.buffRow}>
                    <Text style={[s.buffChip, { backgroundColor: 'rgba(56,189,248,0.1)', borderColor: colors.primary, color: colors.primary }]}>
                      +{b.stat_value} {b.stat_key.toUpperCase()}
                    </Text>
                    <Text style={s.buffSource}>{b.item_name}</Text>
                    <Text style={s.buffExpiry}>exp {b.expires_at.slice(11, 16)}</Text>
                  </View>
                ))
            }

            <View style={s.divider} />
            <View style={s.statsFooter}>
              <Text style={s.footerItem}>Deaths: <Text style={s.footerVal}>{deaths}</Text></Text>
              <Text style={s.footerItem}>Quests: <Text style={s.footerVal}>{cleared}</Text></Text>
              <Text style={s.footerItem}>Abandoned: <Text style={s.footerVal}>{abandoned}</Text></Text>
            </View>
          </View>
        )}

        {/* ── INVENTORY ── */}
        {section === 'inventory' && (
          <InventorySection
            invTab={invTab}
            setInvTab={setInvTab}
            onOpenBrowser={openItemBrowser}
            onOpenAggregateBrowser={openAggregateBrowser}
            onUseConsumable={handleUseConsumable}
            refreshKey={equipRefreshKey}
          />
        )}

        {/* ── QUESTS ── */}
        {section === 'quests' && (
          <>
            {accepted.length === 0 && pending.length === 0 && skipped.length === 0 && completed.length === 0 ? (
              <View style={s.empty}>
                <Feather name="inbox" size={32} color={colors.border} />
                <Text style={s.emptyTxt}>No quests available.{'\n'}Keep logging — the system is watching.</Text>
              </View>
            ) : (
              <>
                {accepted.length > 0 && (
                  <>
                    <Text style={s.sectionHeading}>ACTIVE</Text>
                    {accepted.map(q => (
                      <AcceptedQuestCard key={q.id} quest={q}
                        onComplete={() => { setCompletingQuest(q); setQuestNotes(''); }}
                        onHide={() => { skipQuest(q.id); reload(); }} />
                    ))}
                  </>
                )}
                {pending.length > 0 && (
                  <>
                    <Text style={s.sectionHeading}>AVAILABLE</Text>
                    {pending.map(q => (
                      <PendingQuestCard key={q.id} quest={q}
                        onAccept={() => { acceptQuest(q.id); reload(); }}
                        onHide={() => { skipQuest(q.id); reload(); }}
                        onDelete={() => { deleteQuest(q.id); playSound('deleteitem'); reload(); }} />
                    ))}
                  </>
                )}
                {skipped.length > 0 && (
                  <>
                    <Text style={[s.sectionHeading, { color: colors.textMuted }]}>HIDDEN TODAY</Text>
                    {skipped.map(q => (
                      <HiddenQuestCard key={q.id} quest={q}
                        onReinstate={() => { reinstateQuest(q.id); reload(); }}
                        onDelete={() => { deleteQuest(q.id); playSound('deleteitem'); reload(); }} />
                    ))}
                  </>
                )}
                {completed.length > 0 && (
                  <>
                    <Text style={[s.sectionHeading, { color: colors.textMuted, marginTop: spacing.sm }]}>COMPLETED</Text>
                    {completed.map(q => <CompletedQuestCard key={q.id} quest={q} />)}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── DUNGEONS ── */}
        {section === 'dungeons' && (
          <>
            {dungeons.length === 0 ? (
              <View style={s.empty}>
                <Feather name="shield" size={32} color={colors.border} />
                <Text style={s.emptyTxt}>No dungeon gates detected.</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionHeading}>E-RANK GATES</Text>
                {dungeons.map(d => (
                  <DungeonCard key={d.id} dungeon={d}
                    isActiveRun={activeRunId !== null && selectedDungeon?.id === d.id}
                    onTap={() => handleEnterGate(d)}
                    onRarityInfo={() => setRarityInfoRank(d.rank)} />
                ))}
              </>
            )}
          </>
        )}

      </ScrollView>

      {/* ── DUNGEON ENTRY OVERLAY ── */}
      {selectedDungeon && dungeonPhase === 'entry' && (
        <View style={ov.overlay}>
          <View style={ov.panel}>
            <View style={[ov.rankRow, { borderBottomColor: rankColor }]}>
              <Text style={[ov.rankLabel, { color: rankColor }]}>RANK {selectedDungeon.rank} GATE</Text>
              <Pressable onPress={() => { setSelectedDungeon(null); setDungeonPhase(null); }}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={ov.name}>{selectedDungeon.name}</Text>
            <Text style={ov.statLine}>
              {selectedDungeon.primary_stat.toUpperCase()} + {selectedDungeon.secondary_stat?.toUpperCase() ?? '—'} · {selectedDungeon.duration_mins} min
            </Text>
            <View style={ov.divider} />
            <Text style={ov.fieldLabel}>OBJECTIVE</Text>
            <Text style={ov.fieldVal}>{selectedDungeon.objective_text ?? selectedDungeon.flavor_text}</Text>
            <Text style={ov.fieldLabel}>CLEAR CONDITION</Text>
            <Text style={ov.fieldVal}>Submit clear before the timer runs out.</Text>
            <Text style={ov.fieldLabel}>FAILURE</Text>
            <Text style={[ov.fieldVal, { color: '#EF4444' }]}>HP −20</Text>
            {fatigue && (
              <View style={ov.fatigueWarn}>
                <Text style={ov.fatigueWarnTxt}>FATIGUE ACTIVE — STA and STR are penalised. Recovery recommended.</Text>
              </View>
            )}
            <Text style={ov.fieldLabel}>REWARD</Text>
            <Text style={[ov.fieldVal, { color: colors.success }]}>
              +45 XP · +{selectedDungeon.coin_reward} Coins · Item drop possible
            </Text>
            <View style={ov.divider} />
            <View style={ov.mpHeaderRow}>
              <Text style={ov.fieldLabel}>USE MP</Text>
              <Pressable onPress={() => setMpInfoVisible(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Feather name="info" size={14} color={colors.textMuted} />
              </Pressable>
              <Text style={[ov.mpValue, { marginLeft: 'auto' }]}>{useMp} MP</Text>
            </View>
            <View style={ov.mpSliderRow}>
              <Text style={ov.mpSliderEdge}>0</Text>
              <Slider
                style={{ flex: 1 }}
                minimumValue={0}
                maximumValue={Math.max(0, rpg?.mp ?? 0)}
                step={1}
                value={useMp}
                onValueChange={setUseMp}
                minimumTrackTintColor="#8B5CF6"
                maximumTrackTintColor={colors.border}
                thumbTintColor="#8B5CF6"
              />
              <Text style={ov.mpSliderEdge}>{rpg?.mp ?? 0}</Text>
            </View>
            <View style={ov.divider} />
            <Text style={ov.timerStatic}>{fmtTimer(selectedDungeon.duration_mins * 60)}</Text>
            <Text style={ov.timerHint}>Time limit</Text>
            <Pressable onPress={handleStartTimer} style={[ov.primaryBtn, { borderColor: colors.primary }]}>
              <Text style={[ov.primaryBtnTxt, { color: colors.primary }]}>START TIMER</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── DUNGEON ACTIVE TIMER OVERLAY ── */}
      {selectedDungeon && dungeonPhase === 'active' && (
        <View style={ov.overlay}>
          <View style={ov.panel}>
            <View style={[ov.rankRow, { borderBottomColor: rankColor }]}>
              <Text style={[ov.rankLabel, { color: rankColor }]}>RANK {selectedDungeon.rank} GATE</Text>
            </View>
            <Text style={ov.name}>{selectedDungeon.name}</Text>
            <View style={ov.divider} />
            <Text style={ov.timerLabel}>TIME REMAINING</Text>
            <Text style={[ov.timerBig, timerSeconds <= 60 && { color: '#EF4444' }]}>
              {fmtTimer(timerSeconds)}
            </Text>
            <Text style={ov.fieldLabel}>OBJECTIVE</Text>
            <Text style={ov.fieldVal}>{selectedDungeon.objective_text ?? selectedDungeon.flavor_text}</Text>
            <View style={ov.divider} />
            <Pressable onPress={handleSubmitClear} style={[ov.primaryBtn, { borderColor: colors.success }]}>
              <Text style={[ov.primaryBtnTxt, { color: colors.success }]}>SUBMIT CLEAR</Text>
            </Pressable>
            <View style={ov.secondaryRow}>
              <Pressable onPress={handleFailDungeon} style={[ov.secondaryBtn, { borderColor: '#EF4444' }]}>
                <Text style={[ov.secondaryBtnTxt, { color: '#EF4444' }]}>FAIL DUNGEON</Text>
              </Pressable>
              <Pressable onPress={handleAbandon} style={ov.secondaryBtn}>
                <Text style={ov.secondaryBtnTxt}>ABANDON</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* ── DUNGEON RESULT OVERLAY ── */}
      {selectedDungeon && dungeonPhase === 'result' && (
        <View style={ov.overlay}>
          <View style={ov.panel}>
            <Text style={[ov.resultLabel, { color: clearResult ? colors.success : '#EF4444' }]}>
              {clearResult ? 'GATE CLEARED' : 'GATE FAILED'}
            </Text>
            <Text style={ov.name}>{selectedDungeon.name}</Text>
            <View style={ov.divider} />
            {clearResult ? (
              <>
                <Text style={[ov.fieldVal, { color: colors.success }]}>+{clearResult.xpEarned} XP</Text>
                <Text style={[ov.fieldVal, { color: colors.success }]}>+{clearResult.coinsEarned} Coins</Text>
                <View style={ov.divider} />
                <Text style={ov.fieldLabel}>ITEM FOUND</Text>
                {clearResult.itemDropped ? (
                  <Text style={[ov.fieldVal, { color: RARITY_COLOR[(clearResult.itemRarity as Rarity) ?? 'E'] }]}>
                    {clearResult.itemDropped}{clearResult.itemRarity ? `  [${clearResult.itemRarity}]` : ''}
                  </Text>
                ) : (
                  <Text style={ov.fieldVal}>None</Text>
                )}
              </>
            ) : (
              <Text style={[ov.fieldVal, { color: '#EF4444' }]}>HP −20</Text>
            )}
            <Pressable onPress={closeDungeonFlow}
              style={[ov.primaryBtn, { borderColor: clearResult ? colors.success : '#EF4444', marginTop: spacing.lg }]}>
              <Text style={[ov.primaryBtnTxt, { color: clearResult ? colors.success : '#EF4444' }]}>CONTINUE</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── ITEM BROWSER ── */}
      <Modal visible={itemBrowserSlot !== null} transparent animationType="slide">
        <Pressable style={bm.overlay} onPress={() => { setItemBrowserSlot(null); setBrowserSlots(null); }}>
          <Pressable style={bm.sheet} onPress={() => {}}>
            <View style={bm.header}>
              <Text style={bm.title}>{itemBrowserTitle}</Text>
              <Pressable onPress={() => { setItemBrowserSlot(null); setBrowserSlots(null); }} style={bm.closeBtn}>
                <Feather name="x" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={bm.divider} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {browserItems.length === 0 ? (
                <View style={bm.empty}>
                  <Text style={bm.emptyTxt}>No items acquired yet for this slot.</Text>
                  <Text style={bm.emptyHint}>Clear dungeons to earn drops.</Text>
                </View>
              ) : (
                browserItems.map(item => {
                  const rarity      = (item.rarity as Rarity) ?? 'E';
                  const col         = RARITY_COLOR[rarity];
                  const isEquipped  = (item.is_equipped ?? 0) === 1;
                  const isConsumable = item.slot_type?.startsWith('consumable_');
                  const buffStr     = item.stat_buff ? fmtBuff(item.stat_buff) : null;
                  return (
                    <View key={item.id} style={[bm.itemCard, { borderColor: col, backgroundColor: RARITY_BG[rarity] }]}>
                      <View style={bm.itemRow}>
                        <View style={[bm.rarityBadge, { borderColor: col }]}>
                          <Text style={[bm.rarityTxt, { color: col }]}>{rarity}</Text>
                        </View>
                        <Text style={[bm.itemName, { color: col }]}>
                          {item.item_name}
                        </Text>
                        {buffStr && <Text style={[bm.qty, { color: col }]}>{buffStr}</Text>}
                        {(item.quantity ?? 1) > 1 && <Text style={bm.qty}>×{item.quantity}</Text>}
                      </View>
                      {item.description ? (
                        <Text style={bm.itemDesc}>{item.description}</Text>
                      ) : null}
                      <View style={bm.itemActions}>
                        {isConsumable && (
                          <Pressable onPress={() => handleUseConsumable(item)} style={[bm.actionBtn, { borderColor: colors.success }]}>
                            <Text style={[bm.actionBtnTxt, { color: colors.success }]}>USE</Text>
                          </Pressable>
                        )}
                        {!isConsumable && (
                          isEquipped ? (
                            <Pressable onPress={() => handleUnequipItem(item)} style={[bm.actionBtn, { borderColor: colors.primary, backgroundColor: 'rgba(56,189,248,0.12)' }]}>
                              <Text style={[bm.actionBtnTxt, { color: colors.primary }]}>EQUIPPED ✓ — tap to unequip</Text>
                            </Pressable>
                          ) : (
                            <Pressable onPress={() => handleEquipItem(item)} style={[bm.actionBtn, { borderColor: colors.textMuted }]}>
                              <Text style={[bm.actionBtnTxt, { color: colors.textMuted }]}>EQUIP</Text>
                            </Pressable>
                          )
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── RARITY DROP INFO ── */}
      <Modal visible={rarityInfoRank !== null} transparent animationType="fade">
        <Pressable style={bm.overlay} onPress={() => setRarityInfoRank(null)}>
          <Pressable style={bm.raritySheet} onPress={() => {}}>
            <Text style={bm.raritySheetTitle}>Drop Rates — {rarityInfoRank}-rank Dungeon</Text>
            <View style={bm.divider} />
            {rarityInfoRank && getDropRates(rarityInfoRank).map(({ rarity, chance }) => (
              <View key={rarity} style={bm.rateRow}>
                <View style={[bm.rateDot, { backgroundColor: RARITY_COLOR[rarity as Rarity] ?? colors.border }]} />
                <Text style={[bm.rateLabel, { color: RARITY_COLOR[rarity as Rarity] ?? colors.textMuted }]}>{rarity}</Text>
                <Text style={bm.rateVal}>{(chance * 100).toFixed(0)}%</Text>
              </View>
            ))}
            <Text style={bm.rateNote}>Remaining probability = no drop this run.</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── USE MP INFO ── */}
      <Modal visible={mpInfoVisible} transparent animationType="fade">
        <Pressable style={bm.overlay} onPress={() => setMpInfoVisible(false)}>
          <Pressable style={bm.raritySheet} onPress={() => {}}>
            <Text style={bm.raritySheetTitle}>Use MP — Drop Luck</Text>
            <View style={bm.divider} />
            <Text style={bm.rateNote}>
              Spend MP before embarking to improve your odds on this run's item drop. Each point of MP spent
              adds 0.1% to the gate's lowest-tier drop chance — which equally lowers the no-drop chance, since
              no-drop is whatever's left after all tiers. e.g. spending 100 MP shifts an E-rank gate's no-drop
              from 47% down to 37%, and its E-tier chance from 30% up to 40%.{'\n\n'}
              The MP you choose is deducted from your pool the moment you start the timer — win or lose.
              MP regenerates naturally at 50/day (modified by your active mood's MP Rate), capped at 100.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── GAME INFO / GUIDE ── */}
      <Modal visible={gameInfoVisible} transparent animationType="slide">
        <Pressable style={qm.sheetOverlay} onPress={() => setGameInfoVisible(false)}>
          <Pressable style={[qm.sheet, { maxHeight: '85%' }]} onPress={() => {}}>
            <View style={qm.handle} />
            <Text style={qm.sheetTitle}>Solo Leveling — Game Guide</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={qm.divider} />
              <Text style={gi.section}>HOW QUESTS WORK</Text>
              <Text style={gi.body}>Quests surface activity categories you logged ≥2× in the past 28 days but skipped in the last 7. Accept to commit — complete by logging that activity. Quests reward coins + XP.</Text>
              <View style={qm.divider} />
              <Text style={gi.section}>HOW DUNGEONS WORK</Text>
              <Text style={gi.body}>Each gate is a real-world timed challenge. Start the timer, complete the objective, and submit clear before time runs out. Failed gates cost HP based on the gap between the gate's rank and your tier — at or below your tier costs a flat 33 HP, each rank above costs 33 HP more.</Text>
              <View style={qm.divider} />
              <Text style={gi.section}>DUNGEON RANK PROGRESS</Text>
              <Text style={gi.body}>Higher-rank gates unlock naturally as you level up. Want a rank early? Head to the Store — every rank can be permanently unlocked ahead of schedule with Spendable XP.</Text>
              <View style={qm.divider} />
              <Text style={gi.section}>RARITY TIER LIST</Text>
              {(Object.entries(RARITY_COLOR) as [Rarity, string][]).map(([rarity, color], i, arr) => (
                <View key={rarity} style={gi.rarityRow}>
                  <View style={[gi.rarityDot, { backgroundColor: color }]} />
                  <Text style={[gi.rarityLabel, { color }]}>{rarity}</Text>
                  <Text style={gi.rarityNote}>
                    {i === 0 ? 'Most common' : i === arr.length - 1 ? 'Rarest' : `Tier ${i + 1} of ${arr.length}`}
                  </Text>
                </View>
              ))}
              <View style={qm.divider} />
              <Text style={gi.section}>E-RANK DROP RATES</Text>
              {getDropRates('E').map(({ rarity, chance }) => (
                <View key={rarity} style={gi.rarityRow}>
                  <View style={[gi.rarityDot, { backgroundColor: RARITY_COLOR[rarity as Rarity] ?? colors.border }]} />
                  <Text style={[gi.rarityLabel, { color: RARITY_COLOR[rarity as Rarity] ?? colors.textMuted }]}>{rarity}</Text>
                  <Text style={gi.rarityNote}>{(chance * 100).toFixed(0)}% chance</Text>
                </View>
              ))}
              <Text style={gi.hint}>Remaining probability = no drop this run.</Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── QUEST PREVIEW ── */}
      <Modal visible={questPreview} transparent animationType="slide">
        <Pressable style={qm.sheetOverlay} onPress={() => setQuestPreview(false)}>
          <Pressable style={qm.sheet} onPress={() => {}}>
            <View style={qm.handle} />
            <Text style={qm.sheetTitle}>Quest Overview</Text>
            <Text style={qm.sheetSub}>
              {accepted.length + pending.length === 0
                ? 'No active quests. Keep logging — the system is watching.'
                : `${accepted.length} active · ${pending.length} available · ${completed.length} completed`}
            </Text>
            <View style={qm.divider} />
            {accepted.map(q => (
              <View key={q.id} style={qpv.row}>
                <View style={[qpv.dot, { backgroundColor: colors.success }]} />
                <Text style={qpv.text}>{q.title}</Text>
                <Text style={qpv.badge}>ACTIVE</Text>
              </View>
            ))}
            {pending.slice(0, 4).map(q => (
              <View key={q.id} style={qpv.row}>
                <View style={[qpv.dot, { backgroundColor: colors.border }]} />
                <Text style={[qpv.text, { color: colors.textMuted }]}>{q.title}</Text>
              </View>
            ))}
            {skipped.length > 0 && (
              <Text style={[qpv.hint, { marginTop: 2 }]}>{skipped.length} hidden today</Text>
            )}
            <View style={qm.divider} />
            <Text style={qpv.hint}>Quests surface habits logged ≥2× in the past 28 days but absent in the last 7.</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── QUEST COMPLETE ── */}
      <Modal visible={completingQuest !== null} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setCompletingQuest(null)} />
          <View style={qm.sheet}>
            <View style={qm.handle} />
            <Text style={qm.sheetTitle}>Complete Quest</Text>
            <Text style={qm.sheetSub}>{completingQuest?.title}</Text>
            <View style={qm.divider} />
            <Text style={qm.inputLabel}>Notes (optional)</Text>
            <TextInput style={qm.input} placeholder="Any notes about this session..."
              placeholderTextColor={colors.textMuted} value={questNotes} onChangeText={setQuestNotes}
              multiline numberOfLines={3} />
            <Pressable onPress={handleCompleteQuest} style={qm.confirmBtn}>
              <Text style={qm.confirmTxt}>Confirm Completion</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
    </SwipeNavWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: colors.bg },

  ribbon:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  ribbonGroupLeft: { flexDirection: 'row', minWidth: 64, justifyContent: 'flex-start', alignItems: 'center', gap: 10 },
  ribbonGroup:     { flexDirection: 'row', minWidth: 64, justifyContent: 'flex-end', gap: 10 },
  ribbonIcon:      { padding: 6 },
  ribbonTitle:     { flex: 1, textAlign: 'center', fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.primary, letterSpacing: 3 },

  tabs:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab:          { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabTxt:       { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2 },
  tabTxtActive: { color: colors.primary },

  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  panel:       { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  levelBadge:  { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3, shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6 },
  levelTxt:    { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 1 },
  titleCol:    { flex: 1, gap: 2 },
  jobTxt:      { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  rankTitle:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  vitalsMini:  { alignItems: 'flex-end', gap: 2 },
  vitalsRow:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  vitalsVal:   { color: colors.textPrimary },

  fatigueBadge: { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', padding: spacing.sm },
  fatigueTxt:   { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: '#EF4444' },

  divider:      { height: 1, backgroundColor: colors.border },
  sectionLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2 },
  statusWindowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeading:{ fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 2 },

  weaponRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mutedVal:   { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted },
  buffChip:   { fontFamily: fonts.mono.bold, fontSize: 10, color: colors.success, borderWidth: 1, borderColor: colors.success, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  buffRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  buffSource: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  buffExpiry: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.border },

  statsFooter: { flexDirection: 'row', gap: spacing.lg },
  footerItem:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  footerVal:   { color: colors.textPrimary },

  empty:    { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2 },
  emptyTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});

const ov = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.95)', padding: spacing.lg, justifyContent: 'center', zIndex: 100 },
  panel:   { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },

  rankRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingBottom: spacing.sm },
  rankLabel:  { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, letterSpacing: 2 },
  name:       { fontFamily: fonts.ui.semibold, fontSize: fontSize.xl, color: colors.textPrimary },
  statLine:   { fontFamily: fonts.mono.regular, fontSize: fontSize.sm, color: colors.textMuted },
  divider:    { height: 1, backgroundColor: colors.border },
  fieldLabel: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  fieldVal:   { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },

  timerStatic: { fontFamily: fonts.mono.bold, fontSize: 48, color: colors.textPrimary, textAlign: 'center', letterSpacing: 4 },
  timerHint:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', letterSpacing: 1 },
  timerLabel:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 2, textAlign: 'center' },
  timerBig:    { fontFamily: fonts.mono.bold, fontSize: 64, color: colors.textPrimary, textAlign: 'center', letterSpacing: 6 },
  resultLabel: { fontFamily: fonts.mono.bold, fontSize: fontSize.md, letterSpacing: 2 },

  primaryBtn:    { borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  primaryBtnTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, letterSpacing: 2 },
  secondaryRow:  { flexDirection: 'row', gap: spacing.md },
  secondaryBtn:  { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  secondaryBtnTxt:{ fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  fatigueWarn:   { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: radius.sm, padding: spacing.sm },
  fatigueWarnTxt:{ fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: '#EF4444' },

  mpHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mpValue:     { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: '#8B5CF6' },
  mpSliderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mpSliderEdge:{ fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, minWidth: 28, textAlign: 'center' },
});

const qpv = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  text:  { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
  badge: { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.success, letterSpacing: 1 },
  hint:  { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 },
});

const qm = StyleSheet.create({
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  handle:       { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  sheetTitle:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.lg, color: colors.textPrimary },
  sheetSub:     { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  divider:      { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  inputLabel:   { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textMuted },
  input:        { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.ui.regular, fontSize: fontSize.base, color: colors.textPrimary, backgroundColor: colors.bg, minHeight: 80, textAlignVertical: 'top' },
  confirmBtn:   { backgroundColor: colors.success, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  confirmTxt:   { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.bg },
});

const gi = StyleSheet.create({
  section:    { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 2, marginTop: spacing.sm, marginBottom: 4 },
  body:       { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.sm },
  rarityRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  rarityDot:  { width: 8, height: 8, borderRadius: 4 },
  rarityLabel:{ fontFamily: fonts.mono.bold, fontSize: fontSize.sm, width: 72 },
  rarityNote: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  hint:       { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.border, marginTop: spacing.sm },
});

const bm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:       { height: '80%', backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  header:      { flexDirection: 'row', alignItems: 'center' },
  title:       { fontFamily: fonts.ui.semibold, fontSize: fontSize.lg, color: colors.textPrimary, flex: 1 },
  closeBtn:    { padding: 4 },
  divider:     { height: 1, backgroundColor: colors.border },
  empty:       { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  emptyTxt:    { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textMuted },
  emptyHint:   { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.border },
  itemCard:    { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 4, marginBottom: spacing.sm },
  itemRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rarityBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  rarityTxt:   { fontFamily: fonts.mono.bold, fontSize: 9, letterSpacing: 1 },
  itemName:    { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, flex: 1 },
  qty:         { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary },
  itemDesc:    { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },
  itemActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  actionBtn:   { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  actionBtnTxt:{ fontFamily: fonts.mono.bold, fontSize: 9, letterSpacing: 1 },
  raritySheet:      { backgroundColor: colors.card, borderRadius: radius.lg, margin: spacing.xl, padding: spacing.lg, gap: spacing.sm },
  raritySheetTitle: { fontFamily: fonts.ui.semibold, fontSize: fontSize.md, color: colors.textPrimary },
  rateRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  rateDot:  { width: 8, height: 8, borderRadius: 4 },
  rateLabel:{ fontFamily: fonts.mono.bold, fontSize: fontSize.sm, width: 60 },
  rateVal:  { fontFamily: fonts.mono.regular, fontSize: fontSize.sm, color: colors.textPrimary },
  rateNote: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
});
