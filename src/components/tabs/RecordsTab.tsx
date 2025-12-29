import { useMemo } from 'react';
import { useLeague } from '@/context/LeagueContext';
import { Trophy, Crown, Calendar, Zap, Star, Flame, TrendingUp, Target, Award, Activity, Gauge, BarChart3, Timer, ArrowUp } from 'lucide-react';
import type { Player, QBPlayer, RBPlayer, WRPlayer, TEPlayer, LBPlayer, DBPlayer, DLPlayer } from '@/types/player';
import PositionBadge from '../PositionBadge';
import { getTeamColors } from '@/utils/teamColors';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { loadSeasonHistory, type SeasonSnapshot } from '@/utils/seasonHistory';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RecordEntry {
  stat: string;
  value: number;
  playerName: string;
  team?: string;
  position: string;
  season?: string;
}

interface TopNRecord {
  stat: string;
  description: string;
  entries: RecordEntry[];
}

interface GreatSeason {
  playerName: string;
  position: string;
  team?: string;
  season: string;
  score: number;
  stats: { label: string; value: number }[];
  awards: { mvp: number; opoy: number; sbmvp: number; roty: number; rings: number };
}

interface AdvancedMetric {
  name: string;
  value: number;
  playerName: string;
  team?: string;
  position: string;
  description: string;
  icon: typeof Gauge;
  color: string;
}

interface PaceToRecord {
  playerName: string;
  position: string;
  team?: string;
  recordName: string;
  currentValue: number;
  recordValue: number;
  recordHolder: string;
  seasonsToBreak: number;
  pacePerSeason: number;
  percentToRecord: number;
}

// Season score formula
const calculateSeasonScore = (snapshot: SeasonSnapshot, position: string): number => {
  const awardBonus = 
    (snapshot.mvp || 0) * 100 + 
    (snapshot.opoy || 0) * 75 + 
    (snapshot.sbmvp || 0) * 80 + 
    (snapshot.roty || 0) * 50 +
    (snapshot.rings || 0) * 60;

  if (position === 'QB') {
    return (
      ((snapshot.passYds || 0) / 50) +
      ((snapshot.passTD || 0) * 10) +
      ((snapshot.rushYds || 0) / 20) +
      ((snapshot.rushTD || 0) * 15) -
      ((snapshot.interceptions || 0) * 5) +
      awardBonus
    );
  } else if (position === 'RB') {
    return (
      ((snapshot.rushYds || 0) / 20) +
      ((snapshot.rushTD || 0) * 15) +
      ((snapshot.recYds || 0) / 30) +
      ((snapshot.recTD || 0) * 10) +
      awardBonus
    );
  } else if (position === 'WR' || position === 'TE') {
    return (
      ((snapshot.recYds || 0) / 20) +
      ((snapshot.receptions || 0) * 2) +
      ((snapshot.recTD || 0) * 15) +
      awardBonus
    );
  } else {
    return (
      ((snapshot.tackles || 0) * 2) +
      ((snapshot.sacks || 0) * 15) +
      ((snapshot.interceptions || 0) * 20) +
      ((snapshot.forcedFumbles || 0) * 10) +
      awardBonus
    );
  }
};

const getSeasonTier = (score: number) => {
  if (score >= 800) return { label: 'LEGENDARY', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40' };
  if (score >= 600) return { label: 'ELITE', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/40' };
  if (score >= 400) return { label: 'GREAT', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/40' };
  if (score >= 250) return { label: 'NOTABLE', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40' };
  return { label: 'SOLID', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/40' };
};

const RecordLeaderRow = ({ record, rank }: { record: RecordEntry; rank: number }) => {
  const teamColors = getTeamColors(record.team);
  
  return (
    <div 
      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-background/40 transition-all"
      style={teamColors ? { borderLeftWidth: '2px', borderLeftColor: `hsl(${teamColors.primary})` } : undefined}
    >
      <span className="text-xs font-bold text-muted-foreground w-5">{rank}</span>
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="font-medium text-sm text-foreground truncate">{record.playerName}</span>
        <PositionBadge position={record.position as any} className="text-[10px] scale-90" />
      </div>
      <span className="font-mono text-sm font-bold text-primary">
        {typeof record.value === 'number' && record.value % 1 !== 0 
          ? record.value.toFixed(2) 
          : record.value.toLocaleString()}
      </span>
    </div>
  );
};

const RecordsTab = () => {
  const { careerData, dataVersion } = useLeague();

  // All-time career records with advanced metrics
  const { allTimeRecords, advancedMetrics, paceToRecords } = useMemo(() => {
    if (!careerData) return { allTimeRecords: null, advancedMetrics: [], paceToRecords: [] };

    const findTopN = <T extends Player>(
      players: T[],
      getValue: (p: T) => number,
      stat: string,
      description: string,
      n: number = 5,
    ): TopNRecord | null => {
      if (players.length === 0) return null;
      const sorted = [...players]
        .filter((p) => getValue(p) > 0)
        .sort((a, b) => getValue(b) - getValue(a))
        .slice(0, n);
      if (sorted.length === 0) return null;
      
      return {
        stat,
        description,
        entries: sorted.map((p) => ({
          stat,
          value: getValue(p),
          playerName: p.name,
          team: p.team,
          position: p.position,
        })),
      };
    };

    const qbs = careerData.quarterbacks;
    const rbs = careerData.runningbacks;
    const wrs = careerData.widereceivers;
    const tes = careerData.tightends;
    const allDef = [
      ...careerData.linebackers,
      ...careerData.defensivebacks,
      ...careerData.defensiveline,
    ] as (LBPlayer | DBPlayer | DLPlayer)[];
    const allPlayers: Player[] = [
      ...careerData.quarterbacks,
      ...careerData.runningbacks,
      ...careerData.widereceivers,
      ...careerData.tightends,
      ...careerData.offensiveline,
      ...careerData.linebackers,
      ...careerData.defensivebacks,
      ...careerData.defensiveline,
    ];

    // Build comprehensive records
    const records = {
      // QB
      qbPassYds: findTopN(qbs, (p) => p.passYds, 'Career Passing Yards', 'Total passing yards', 5),
      qbPassTD: findTopN(qbs, (p) => p.passTD, 'Career Passing TDs', 'Total TD passes', 5),
      qbYPA: findTopN(qbs, (p) => p.attempts > 0 ? p.passYds / p.attempts : 0, 'Yards Per Attempt', 'Pass efficiency', 5),
      qbTDINT: findTopN(qbs, (p) => p.interceptions > 0 ? p.passTD / p.interceptions : p.passTD, 'TD/INT Ratio', 'Decision making', 5),
      qbTotalTD: findTopN(qbs, (p) => p.passTD + p.rushTD, 'Total TDs', 'Combined TDs', 5),
      qbTotalYds: findTopN(qbs, (p) => p.passYds + p.rushYds, 'Total Yards', 'Pass + Rush', 5),
      // RB
      rbRushYds: findTopN(rbs, (p) => p.rushYds, 'Career Rushing Yards', 'Total rushing yards', 5),
      rbRushTD: findTopN(rbs, (p) => p.rushTD, 'Career Rushing TDs', 'Total rushing TDs', 5),
      rbYPC: findTopN(rbs, (p) => p.rushAtt > 0 ? p.rushYds / p.rushAtt : 0, 'Yards Per Carry', 'Rushing efficiency', 5),
      rbScrimmage: findTopN(rbs, (p) => p.rushYds + p.recYds, 'Scrimmage Yards', 'Rush + Receiving', 5),
      rbYPG: findTopN(rbs, (p) => p.games > 0 ? (p.rushYds + p.recYds) / p.games : 0, 'Yds/Game', 'Avg per game', 5),
      // WR
      wrRecYds: findTopN(wrs, (p) => p.recYds, 'Career Receiving Yards', 'Total receiving yards', 5),
      wrRecTD: findTopN(wrs, (p) => p.recTD, 'Career Receiving TDs', 'Total receiving TDs', 5),
      wrYPR: findTopN(wrs, (p) => p.receptions > 0 ? p.recYds / p.receptions : 0, 'Yards Per Rec', 'Catch efficiency', 5),
      wrTDPG: findTopN(wrs, (p) => p.games > 0 ? (p.recTD / p.games) * 16 : 0, 'TDs/16 Games', 'TD rate', 5),
      // TE
      teRecYds: findTopN(tes, (p) => p.recYds, 'TE Receiving Yards', 'Total receiving yards', 5),
      teRecTD: findTopN(tes, (p) => p.recTD, 'TE Receiving TDs', 'Total receiving TDs', 5),
      // DEF
      defTackles: findTopN(allDef, (p) => p.tackles, 'Career Tackles', 'Total tackles', 5),
      defSacks: findTopN(allDef, (p) => p.sacks, 'Career Sacks', 'Total sacks', 5),
      defINT: findTopN(allDef, (p) => p.interceptions, 'Career INTs', 'Total interceptions', 5),
      defTurnovers: findTopN(allDef, (p) => p.interceptions + p.forcedFumbles, 'Turnovers Created', 'INTs + FF', 5),
      defTPG: findTopN(allDef, (p) => p.games > 0 ? p.tackles / p.games : 0, 'Tackles/Game', 'Avg tackles', 5),
      // Accolades
      rings: findTopN(allPlayers, (p) => p.rings, 'Championships', 'Rings won', 5),
      mvp: findTopN(allPlayers, (p) => p.mvp, 'MVP Awards', 'League MVPs', 5),
      legacy: findTopN(allPlayers, (p) => p.careerLegacy, 'Career Legacy', 'Overall impact', 5),
      dominance: findTopN(allPlayers, (p) => p.dominance, 'Peak Dominance', 'Best at peak', 5),
    };

    // Advanced metrics dashboard data
    const metrics: AdvancedMetric[] = [];
    
    // QB Advanced
    const topQBEff = qbs.filter(p => p.attempts > 200).sort((a, b) => 
      (b.passYds / b.attempts) - (a.passYds / a.attempts)
    )[0];
    if (topQBEff) {
      metrics.push({
        name: 'Best Yards/Attempt',
        value: topQBEff.passYds / topQBEff.attempts,
        playerName: topQBEff.name,
        team: topQBEff.team,
        position: 'QB',
        description: 'Highest career yards per pass attempt (min 200 attempts)',
        icon: Target,
        color: '#3b82f6',
      });
    }

    const topTDINT = qbs.filter(p => p.interceptions > 0).sort((a, b) => 
      (b.passTD / b.interceptions) - (a.passTD / a.interceptions)
    )[0];
    if (topTDINT) {
      metrics.push({
        name: 'Best TD/INT Ratio',
        value: topTDINT.passTD / topTDINT.interceptions,
        playerName: topTDINT.name,
        team: topTDINT.team,
        position: 'QB',
        description: 'Most touchdowns per interception thrown',
        icon: Gauge,
        color: '#10b981',
      });
    }

    const topCompPct = qbs.filter(p => p.attempts > 200).sort((a, b) => 
      (b.completions / b.attempts) - (a.completions / a.attempts)
    )[0];
    if (topCompPct) {
      metrics.push({
        name: 'Completion %',
        value: (topCompPct.completions / topCompPct.attempts) * 100,
        playerName: topCompPct.name,
        team: topCompPct.team,
        position: 'QB',
        description: 'Highest career completion percentage',
        icon: Target,
        color: '#8b5cf6',
      });
    }

    // RB Advanced
    const topYPC = rbs.filter(p => p.rushAtt > 100).sort((a, b) => 
      (b.rushYds / b.rushAtt) - (a.rushYds / a.rushAtt)
    )[0];
    if (topYPC) {
      metrics.push({
        name: 'Best Yards/Carry',
        value: topYPC.rushYds / topYPC.rushAtt,
        playerName: topYPC.name,
        team: topYPC.team,
        position: 'RB',
        description: 'Highest career yards per rush attempt',
        icon: Zap,
        color: '#f59e0b',
      });
    }

    const topScrimmageYPG = rbs.filter(p => p.games > 16).sort((a, b) => 
      ((b.rushYds + b.recYds) / b.games) - ((a.rushYds + a.recYds) / a.games)
    )[0];
    if (topScrimmageYPG) {
      metrics.push({
        name: 'Scrimmage Yds/Game',
        value: (topScrimmageYPG.rushYds + topScrimmageYPG.recYds) / topScrimmageYPG.games,
        playerName: topScrimmageYPG.name,
        team: topScrimmageYPG.team,
        position: 'RB',
        description: 'Combined rushing + receiving yards per game',
        icon: BarChart3,
        color: '#ef4444',
      });
    }

    // WR Advanced
    const topYPR = wrs.filter(p => p.receptions > 50).sort((a, b) => 
      (b.recYds / b.receptions) - (a.recYds / a.receptions)
    )[0];
    if (topYPR) {
      metrics.push({
        name: 'Best Yards/Catch',
        value: topYPR.recYds / topYPR.receptions,
        playerName: topYPR.name,
        team: topYPR.team,
        position: 'WR',
        description: 'Highest yards per reception (min 50 catches)',
        icon: Star,
        color: '#a855f7',
      });
    }

    const topRecYPG = wrs.filter(p => p.games > 16).sort((a, b) => 
      (b.recYds / b.games) - (a.recYds / a.games)
    )[0];
    if (topRecYPG) {
      metrics.push({
        name: 'Receiving Yds/Game',
        value: topRecYPG.recYds / topRecYPG.games,
        playerName: topRecYPG.name,
        team: topRecYPG.team,
        position: 'WR',
        description: 'Highest receiving yards per game played',
        icon: TrendingUp,
        color: '#06b6d4',
      });
    }

    // DEF Advanced
    const topSackRate = allDef.filter(p => p.games > 32).sort((a, b) => 
      (b.sacks / b.games) - (a.sacks / a.games)
    )[0];
    if (topSackRate) {
      metrics.push({
        name: 'Sacks/Game',
        value: topSackRate.sacks / topSackRate.games,
        playerName: topSackRate.name,
        team: topSackRate.team,
        position: topSackRate.position,
        description: 'Highest sacks per game (min 32 games)',
        icon: Activity,
        color: '#dc2626',
      });
    }

    const topBallHawk = allDef.filter(p => p.games > 32).sort((a, b) => 
      ((b.interceptions + b.forcedFumbles) / b.games) - ((a.interceptions + a.forcedFumbles) / a.games)
    )[0];
    if (topBallHawk) {
      metrics.push({
        name: 'Turnovers/Game',
        value: (topBallHawk.interceptions + topBallHawk.forcedFumbles) / topBallHawk.games,
        playerName: topBallHawk.name,
        team: topBallHawk.team,
        position: topBallHawk.position,
        description: 'Interceptions + forced fumbles per game',
        icon: Award,
        color: '#f97316',
      });
    }

    // Pace to break records
    const paceRecords: PaceToRecord[] = [];
    const activePlayers = allPlayers.filter(p => p.status === 'Active');

    // Get record values
    const passYdsRecord = qbs.length > 0 ? Math.max(...qbs.map(q => q.passYds)) : 0;
    const passYdsHolder = qbs.find(q => q.passYds === passYdsRecord);
    const rushYdsRecord = rbs.length > 0 ? Math.max(...rbs.map(r => r.rushYds)) : 0;
    const rushYdsHolder = rbs.find(r => r.rushYds === rushYdsRecord);
    const recYdsRecord = wrs.length > 0 ? Math.max(...wrs.map(w => w.recYds)) : 0;
    const recYdsHolder = wrs.find(w => w.recYds === recYdsRecord);

    // Calculate pace for active QBs
    const activeQBs = qbs.filter(q => q.status === 'Active' && q.games >= 16);
    activeQBs.forEach(qb => {
      const ydsPerSeason = qb.games > 0 ? (qb.passYds / qb.games) * 16 : 0;
      if (ydsPerSeason > 0 && qb.passYds < passYdsRecord && passYdsHolder) {
        const remaining = passYdsRecord - qb.passYds;
        const seasonsToBreak = Math.ceil(remaining / ydsPerSeason);
        if (seasonsToBreak <= 5) {
          paceRecords.push({
            playerName: qb.name,
            position: 'QB',
            team: qb.team,
            recordName: 'Career Passing Yards',
            currentValue: qb.passYds,
            recordValue: passYdsRecord,
            recordHolder: passYdsHolder.name,
            seasonsToBreak,
            pacePerSeason: ydsPerSeason,
            percentToRecord: (qb.passYds / passYdsRecord) * 100,
          });
        }
      }
    });

    // Calculate pace for active RBs
    const activeRBs = rbs.filter(r => r.status === 'Active' && r.games >= 16);
    activeRBs.forEach(rb => {
      const ydsPerSeason = rb.games > 0 ? (rb.rushYds / rb.games) * 16 : 0;
      if (ydsPerSeason > 0 && rb.rushYds < rushYdsRecord && rushYdsHolder) {
        const remaining = rushYdsRecord - rb.rushYds;
        const seasonsToBreak = Math.ceil(remaining / ydsPerSeason);
        if (seasonsToBreak <= 5) {
          paceRecords.push({
            playerName: rb.name,
            position: 'RB',
            team: rb.team,
            recordName: 'Career Rushing Yards',
            currentValue: rb.rushYds,
            recordValue: rushYdsRecord,
            recordHolder: rushYdsHolder.name,
            seasonsToBreak,
            pacePerSeason: ydsPerSeason,
            percentToRecord: (rb.rushYds / rushYdsRecord) * 100,
          });
        }
      }
    });

    // Calculate pace for active WRs
    const activeWRs = wrs.filter(w => w.status === 'Active' && w.games >= 16);
    activeWRs.forEach(wr => {
      const ydsPerSeason = wr.games > 0 ? (wr.recYds / wr.games) * 16 : 0;
      if (ydsPerSeason > 0 && wr.recYds < recYdsRecord && recYdsHolder) {
        const remaining = recYdsRecord - wr.recYds;
        const seasonsToBreak = Math.ceil(remaining / ydsPerSeason);
        if (seasonsToBreak <= 5) {
          paceRecords.push({
            playerName: wr.name,
            position: 'WR',
            team: wr.team,
            recordName: 'Career Receiving Yards',
            currentValue: wr.recYds,
            recordValue: recYdsRecord,
            recordHolder: recYdsHolder.name,
            seasonsToBreak,
            pacePerSeason: ydsPerSeason,
            percentToRecord: (wr.recYds / recYdsRecord) * 100,
          });
        }
      }
    });

    paceRecords.sort((a, b) => a.seasonsToBreak - b.seasonsToBreak);

    return { allTimeRecords: records, advancedMetrics: metrics, paceToRecords: paceRecords };
  }, [careerData, dataVersion]);

  // Single-season records
  const singleSeasonRecords = useMemo(() => {
    const history = loadSeasonHistory();
    const allSnapshots: { playerKey: string; snapshot: SeasonSnapshot }[] = [];
    
    Object.entries(history).forEach(([playerKey, snapshots]) => {
      if (snapshots.length <= 1) return;
      snapshots.forEach((snapshot) => {
        allSnapshots.push({ playerKey, snapshot });
      });
    });

    if (allSnapshots.length === 0) return null;

    const findTopNSeason = (
      filter: (key: string) => boolean,
      getValue: (s: SeasonSnapshot) => number,
      stat: string,
      description: string,
      n: number = 5
    ): TopNRecord | null => {
      const filtered = allSnapshots.filter(({ playerKey }) => filter(playerKey));
      if (filtered.length === 0) return null;
      
      const sorted = [...filtered]
        .filter(({ snapshot }) => getValue(snapshot) > 0)
        .sort((a, b) => getValue(b.snapshot) - getValue(a.snapshot))
        .slice(0, n);
      
      if (sorted.length === 0) return null;

      return {
        stat,
        description,
        entries: sorted.map(({ playerKey, snapshot }) => {
          const [position, ...nameParts] = playerKey.split(':');
          return {
            stat,
            value: getValue(snapshot),
            playerName: nameParts.join(':'),
            position,
            season: snapshot.season,
          };
        }),
      };
    };

    return {
      qbPassYds: findTopNSeason((k) => k.startsWith('QB:'), (s) => s.passYds || 0, 'Passing Yards', 'Single season'),
      qbPassTD: findTopNSeason((k) => k.startsWith('QB:'), (s) => s.passTD || 0, 'Passing TDs', 'Single season'),
      qbTotalTD: findTopNSeason((k) => k.startsWith('QB:'), (s) => (s.passTD || 0) + (s.rushTD || 0), 'Total TDs', 'Pass + Rush'),
      rbRushYds: findTopNSeason((k) => k.startsWith('RB:'), (s) => s.rushYds || 0, 'Rushing Yards', 'Single season'),
      rbRushTD: findTopNSeason((k) => k.startsWith('RB:'), (s) => s.rushTD || 0, 'Rushing TDs', 'Single season'),
      rbScrimmage: findTopNSeason((k) => k.startsWith('RB:'), (s) => (s.rushYds || 0) + (s.recYds || 0), 'Scrimmage Yds', 'Rush + Rec'),
      wrRecYds: findTopNSeason((k) => k.startsWith('WR:'), (s) => s.recYds || 0, 'Receiving Yards', 'Single season'),
      wrRecTD: findTopNSeason((k) => k.startsWith('WR:'), (s) => s.recTD || 0, 'Receiving TDs', 'Single season'),
      teRecYds: findTopNSeason((k) => k.startsWith('TE:'), (s) => s.recYds || 0, 'TE Rec Yards', 'Single season'),
      defTackles: findTopNSeason((k) => ['LB:', 'DB:', 'DL:'].some(p => k.startsWith(p)), (s) => s.tackles || 0, 'Tackles', 'Single season'),
      defSacks: findTopNSeason((k) => ['LB:', 'DB:', 'DL:'].some(p => k.startsWith(p)), (s) => s.sacks || 0, 'Sacks', 'Single season'),
      defINT: findTopNSeason((k) => ['LB:', 'DB:', 'DL:'].some(p => k.startsWith(p)), (s) => s.interceptions || 0, 'INTs', 'Single season'),
    };
  }, [dataVersion]);

  // Greatest seasons
  const greatestSeasons = useMemo((): GreatSeason[] => {
    const history = loadSeasonHistory();
    const seasons: GreatSeason[] = [];

    Object.entries(history).forEach(([playerKey, snapshots]) => {
      if (snapshots.length <= 1) return;
      
      const [position, ...nameParts] = playerKey.split(':');
      const playerName = nameParts.join(':');

      snapshots.forEach((snapshot) => {
        const score = calculateSeasonScore(snapshot, position);
        
        const stats: { label: string; value: number }[] = [];
        if (position === 'QB') {
          if (snapshot.passYds) stats.push({ label: 'Pass Yds', value: snapshot.passYds });
          if (snapshot.passTD) stats.push({ label: 'Pass TD', value: snapshot.passTD });
          if (snapshot.rushYds) stats.push({ label: 'Rush Yds', value: snapshot.rushYds });
        } else if (position === 'RB') {
          if (snapshot.rushYds) stats.push({ label: 'Rush Yds', value: snapshot.rushYds });
          if (snapshot.rushTD) stats.push({ label: 'Rush TD', value: snapshot.rushTD });
          if (snapshot.recYds) stats.push({ label: 'Rec Yds', value: snapshot.recYds });
        } else if (position === 'WR' || position === 'TE') {
          if (snapshot.recYds) stats.push({ label: 'Rec Yds', value: snapshot.recYds });
          if (snapshot.receptions) stats.push({ label: 'Rec', value: snapshot.receptions });
          if (snapshot.recTD) stats.push({ label: 'Rec TD', value: snapshot.recTD });
        } else {
          if (snapshot.tackles) stats.push({ label: 'Tackles', value: snapshot.tackles });
          if (snapshot.sacks) stats.push({ label: 'Sacks', value: snapshot.sacks });
          if (snapshot.interceptions) stats.push({ label: 'INTs', value: snapshot.interceptions });
        }

        seasons.push({
          playerName,
          position,
          season: snapshot.season,
          score,
          stats,
          awards: {
            mvp: snapshot.mvp || 0,
            opoy: snapshot.opoy || 0,
            sbmvp: snapshot.sbmvp || 0,
            roty: snapshot.roty || 0,
            rings: snapshot.rings || 0,
          },
        });
      });
    });

    return seasons.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [dataVersion]);

  if (!careerData || !allTimeRecords) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-4xl font-bold mb-4 text-primary">LEAGUE RECORDS</h2>
          <p className="text-muted-foreground text-lg">Upload your league data to view all-time records.</p>
        </div>
      </div>
    );
  }

  // Compact record block
  const RecordBlock = ({ title, record, color }: { title: string; record: TopNRecord | null; color: string }) => {
    if (!record) return null;
    return (
      <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}>
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{title}</h4>
          <span className="text-[10px] text-muted-foreground">{record.description}</span>
        </div>
        <div className="space-y-0.5">
          {record.entries.slice(0, 3).map((entry, i) => (
            <RecordLeaderRow key={`${entry.playerName}-${i}`} record={entry} rank={i + 1} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="container mx-auto px-4 py-4 space-y-6">
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/20 via-orange-500/10 to-amber-500/20 p-6 border border-rose-500/30">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InN0YXJzIiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxjaXJjbGUgY3g9IjI1IiBjeT0iMjUiIHI9IjEiIGZpbGw9IiNmZmYiIG9wYWNpdHk9IjAuMSIvPjxjaXJjbGUgY3g9IjUiIGN5PSI1IiByPSIwLjUiIGZpbGw9IiNmZmYiIG9wYWNpdHk9IjAuMDgiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjc3RhcnMpIi8+PC9zdmc+')] opacity-60" />
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-400/50 mb-3 shadow-lg shadow-rose-500/20">
                <Trophy className="w-7 h-7 text-rose-400" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400 bg-clip-text text-transparent mb-1">
                LEAGUE RECORDS & ANALYTICS
              </h1>
              <p className="text-muted-foreground text-sm">Career Records • Single Season • Advanced Metrics • Pace Tracking</p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-secondary/50 border border-border/30 mx-auto flex w-fit flex-wrap">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-1.5 text-sm">
                <BarChart3 className="w-3.5 h-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="career" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 gap-1.5 text-sm">
                <Crown className="w-3.5 h-3.5" />
                Career
              </TabsTrigger>
              <TabsTrigger value="season" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 gap-1.5 text-sm">
                <Zap className="w-3.5 h-3.5" />
                Season
              </TabsTrigger>
              <TabsTrigger value="greatest" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 gap-1.5 text-sm">
                <Flame className="w-3.5 h-3.5" />
                Greatest
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB - Advanced Metrics Dashboard */}
            <TabsContent value="overview" className="space-y-6">
              {/* Advanced Efficiency Metrics Grid */}
              <div className="space-y-3">
                <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-primary" />
                  Advanced Efficiency Metrics
                </h2>
                <p className="text-xs text-muted-foreground -mt-2">
                  League leaders in key efficiency categories. These metrics measure quality over quantity.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {advancedMetrics.map((metric) => {
                    const teamColors = getTeamColors(metric.team);
                    return (
                      <Tooltip key={metric.name}>
                        <TooltipTrigger asChild>
                          <div 
                            className="relative overflow-hidden rounded-xl border p-4 hover:scale-[1.02] transition-transform cursor-pointer"
                            style={{ 
                              borderColor: `${metric.color}50`,
                              background: `linear-gradient(135deg, ${metric.color}10 0%, transparent 60%)`
                            }}
                          >
                            <div 
                              className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${metric.color}20` }}
                            >
                              <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{metric.name}</p>
                              <p className="font-mono text-2xl font-bold" style={{ color: metric.color }}>
                                {metric.value.toFixed(2)}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span 
                                  className="font-medium text-sm"
                                  style={teamColors ? { color: `hsl(${teamColors.primary})` } : undefined}
                                >
                                  {metric.playerName}
                                </span>
                                <PositionBadge position={metric.position as any} className="text-[10px] scale-90" />
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{metric.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              {/* Pace to Break Records */}
              {paceToRecords.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                    <Timer className="w-5 h-5 text-amber-400" />
                    Record Watch - Pace Tracking
                  </h2>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Active players on pace to break career records within 5 seasons at their current production rate.
                  </p>
                  
                  <div className="grid gap-3">
                    {paceToRecords.slice(0, 6).map((pace) => {
                      const teamColors = getTeamColors(pace.team);
                      return (
                        <div 
                          key={`${pace.playerName}-${pace.recordName}`}
                          className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="font-semibold"
                                  style={teamColors ? { color: `hsl(${teamColors.primary})` } : undefined}
                                >
                                  {pace.playerName}
                                </span>
                                <PositionBadge position={pace.position as any} className="text-xs" />
                                <span className="text-xs text-muted-foreground">→</span>
                                <span className="text-xs font-medium text-amber-400">{pace.recordName}</span>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm">
                                <div className="space-y-0.5">
                                  <p className="text-xs text-muted-foreground">Current</p>
                                  <p className="font-mono font-bold text-foreground">{pace.currentValue.toLocaleString()}</p>
                                </div>
                                <ArrowUp className="w-4 h-4 text-amber-400" />
                                <div className="space-y-0.5">
                                  <p className="text-xs text-muted-foreground">Record ({pace.recordHolder})</p>
                                  <p className="font-mono font-bold text-amber-400">{pace.recordValue.toLocaleString()}</p>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="relative h-2 bg-background/50 rounded-full overflow-hidden">
                                <div 
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(pace.percentToRecord, 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="text-right space-y-1">
                              <div className="flex items-center gap-1 justify-end">
                                <span className="text-2xl font-bold text-amber-400">{pace.seasonsToBreak}</span>
                                <span className="text-xs text-muted-foreground">seasons</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                ~{Math.round(pace.pacePerSeason).toLocaleString()}/yr
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Stats Summary */}
              <div className="space-y-3">
                <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-rose-400" />
                  Record Holders at a Glance
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <RecordBlock title="Passing Yards" record={allTimeRecords.qbPassYds} color="#3b82f6" />
                  <RecordBlock title="Passing TDs" record={allTimeRecords.qbPassTD} color="#8b5cf6" />
                  <RecordBlock title="TD/INT Ratio" record={allTimeRecords.qbTDINT} color="#10b981" />
                  <RecordBlock title="Rushing Yards" record={allTimeRecords.rbRushYds} color="#f59e0b" />
                  <RecordBlock title="Yards/Carry" record={allTimeRecords.rbYPC} color="#ef4444" />
                  <RecordBlock title="Receiving Yards" record={allTimeRecords.wrRecYds} color="#a855f7" />
                  <RecordBlock title="Career Sacks" record={allTimeRecords.defSacks} color="#dc2626" />
                  <RecordBlock title="Championships" record={allTimeRecords.rings} color="#f59e0b" />
                  <RecordBlock title="Career Legacy" record={allTimeRecords.legacy} color="#6366f1" />
                </div>
              </div>
            </TabsContent>

            {/* CAREER RECORDS TAB */}
            <TabsContent value="career" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* QB Section */}
                <div className="space-y-3 p-4 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
                  <h3 className="font-display text-lg font-bold text-blue-400 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Quarterbacks
                  </h3>
                  <div className="grid gap-2">
                    <RecordBlock title="Pass Yards" record={allTimeRecords.qbPassYds} color="#3b82f6" />
                    <RecordBlock title="Pass TDs" record={allTimeRecords.qbPassTD} color="#3b82f6" />
                    <RecordBlock title="Yards/Attempt" record={allTimeRecords.qbYPA} color="#3b82f6" />
                    <RecordBlock title="TD/INT" record={allTimeRecords.qbTDINT} color="#3b82f6" />
                    <RecordBlock title="Total TDs" record={allTimeRecords.qbTotalTD} color="#3b82f6" />
                  </div>
                </div>

                {/* RB Section */}
                <div className="space-y-3 p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
                  <h3 className="font-display text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Running Backs
                  </h3>
                  <div className="grid gap-2">
                    <RecordBlock title="Rush Yards" record={allTimeRecords.rbRushYds} color="#10b981" />
                    <RecordBlock title="Rush TDs" record={allTimeRecords.rbRushTD} color="#10b981" />
                    <RecordBlock title="Yards/Carry" record={allTimeRecords.rbYPC} color="#10b981" />
                    <RecordBlock title="Scrimmage Yds" record={allTimeRecords.rbScrimmage} color="#10b981" />
                    <RecordBlock title="Yds/Game" record={allTimeRecords.rbYPG} color="#10b981" />
                  </div>
                </div>

                {/* WR Section */}
                <div className="space-y-3 p-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
                  <h3 className="font-display text-lg font-bold text-purple-400 flex items-center gap-2">
                    <Star className="w-4 h-4" /> Wide Receivers
                  </h3>
                  <div className="grid gap-2">
                    <RecordBlock title="Rec Yards" record={allTimeRecords.wrRecYds} color="#a855f7" />
                    <RecordBlock title="Rec TDs" record={allTimeRecords.wrRecTD} color="#a855f7" />
                    <RecordBlock title="Yards/Rec" record={allTimeRecords.wrYPR} color="#a855f7" />
                    <RecordBlock title="TDs/16 Games" record={allTimeRecords.wrTDPG} color="#a855f7" />
                  </div>
                </div>

                {/* TE Section */}
                <div className="space-y-3 p-4 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent">
                  <h3 className="font-display text-lg font-bold text-cyan-400 flex items-center gap-2">
                    <Award className="w-4 h-4" /> Tight Ends
                  </h3>
                  <div className="grid gap-2">
                    <RecordBlock title="Rec Yards" record={allTimeRecords.teRecYds} color="#06b6d4" />
                    <RecordBlock title="Rec TDs" record={allTimeRecords.teRecTD} color="#06b6d4" />
                  </div>
                </div>

                {/* Defense Section */}
                <div className="space-y-3 p-4 rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent">
                  <h3 className="font-display text-lg font-bold text-red-400 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Defense
                  </h3>
                  <div className="grid gap-2">
                    <RecordBlock title="Tackles" record={allTimeRecords.defTackles} color="#ef4444" />
                    <RecordBlock title="Sacks" record={allTimeRecords.defSacks} color="#ef4444" />
                    <RecordBlock title="INTs" record={allTimeRecords.defINT} color="#ef4444" />
                    <RecordBlock title="Turnovers" record={allTimeRecords.defTurnovers} color="#ef4444" />
                    <RecordBlock title="Tackles/Game" record={allTimeRecords.defTPG} color="#ef4444" />
                  </div>
                </div>

                {/* Accolades Section */}
                <div className="space-y-3 p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
                  <h3 className="font-display text-lg font-bold text-amber-400 flex items-center gap-2">
                    <Crown className="w-4 h-4" /> Accolades
                  </h3>
                  <div className="grid gap-2">
                    <RecordBlock title="Championships" record={allTimeRecords.rings} color="#f59e0b" />
                    <RecordBlock title="MVP Awards" record={allTimeRecords.mvp} color="#f59e0b" />
                    <RecordBlock title="Legacy Score" record={allTimeRecords.legacy} color="#f59e0b" />
                    <RecordBlock title="Peak Dominance" record={allTimeRecords.dominance} color="#f59e0b" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* SINGLE SEASON TAB */}
            <TabsContent value="season">
              {singleSeasonRecords ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-display text-sm font-bold text-blue-400 uppercase tracking-wide">Quarterback</h3>
                    <RecordBlock title="Pass Yards" record={singleSeasonRecords.qbPassYds} color="#3b82f6" />
                    <RecordBlock title="Pass TDs" record={singleSeasonRecords.qbPassTD} color="#3b82f6" />
                    <RecordBlock title="Total TDs" record={singleSeasonRecords.qbTotalTD} color="#3b82f6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-sm font-bold text-emerald-400 uppercase tracking-wide">Running Back</h3>
                    <RecordBlock title="Rush Yards" record={singleSeasonRecords.rbRushYds} color="#10b981" />
                    <RecordBlock title="Rush TDs" record={singleSeasonRecords.rbRushTD} color="#10b981" />
                    <RecordBlock title="Scrimmage" record={singleSeasonRecords.rbScrimmage} color="#10b981" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-sm font-bold text-purple-400 uppercase tracking-wide">Receivers</h3>
                    <RecordBlock title="WR Rec Yards" record={singleSeasonRecords.wrRecYds} color="#a855f7" />
                    <RecordBlock title="WR Rec TDs" record={singleSeasonRecords.wrRecTD} color="#a855f7" />
                    <RecordBlock title="TE Rec Yards" record={singleSeasonRecords.teRecYds} color="#06b6d4" />
                  </div>
                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <h3 className="font-display text-sm font-bold text-red-400 uppercase tracking-wide">Defense</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <RecordBlock title="Tackles" record={singleSeasonRecords.defTackles} color="#ef4444" />
                      <RecordBlock title="Sacks" record={singleSeasonRecords.defSacks} color="#ef4444" />
                      <RecordBlock title="INTs" record={singleSeasonRecords.defINT} color="#ef4444" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-12 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-2xl font-bold text-muted-foreground mb-2">No Season History</h3>
                  <p className="text-muted-foreground">Upload season CSVs to track single-season records.</p>
                </div>
              )}
            </TabsContent>

            {/* GREATEST SEASONS TAB */}
            <TabsContent value="greatest">
              {greatestSeasons.length > 0 ? (
                <div className="space-y-4">
                  {/* Formula explanation */}
                  <div className="rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <h3 className="font-display text-sm font-bold text-purple-400">Season Score Formula</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">QB</span>
                        <span className="text-muted-foreground">(Yds÷50) + (TD×10) - (INT×5)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">RB</span>
                        <span className="text-muted-foreground">(RushYds÷20) + (TD×15)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">WR</span>
                        <span className="text-muted-foreground">(RecYds÷20) + (TD×15)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">DEF</span>
                        <span className="text-muted-foreground">(Tackles×2) + (Sacks×15)</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">+ Award bonuses: MVP (100), OPOY (75), SBMVP (80), Ring (60), ROTY (50)</p>
                  </div>

                  {/* Tier legend */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold">LEGENDARY 800+</span>
                    <span className="px-2 py-1 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-400 text-xs font-bold">ELITE 600+</span>
                    <span className="px-2 py-1 rounded-full bg-blue-500/15 border border-blue-500/40 text-blue-400 text-xs font-bold">GREAT 400+</span>
                    <span className="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold">NOTABLE 250+</span>
                  </div>

                  {/* Season cards */}
                  <div className="grid gap-2">
                    {greatestSeasons.map((season, idx) => {
                      const tier = getSeasonTier(season.score);
                      const teamColors = getTeamColors(season.team as string);
                      
                      return (
                        <div 
                          key={`${season.playerName}-${season.season}`}
                          className={`flex items-center gap-4 p-3 rounded-xl border ${tier.border} ${tier.bg} transition-all hover:scale-[1.01]`}
                          style={teamColors ? { borderLeftWidth: '4px', borderLeftColor: `hsl(${teamColors.primary})` } : undefined}
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/50 text-sm font-bold text-muted-foreground">
                            {idx + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">{season.playerName}</span>
                              <PositionBadge position={season.position as any} className="text-xs" />
                              <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent text-xs font-medium">{season.season}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tier.color} ${tier.bg}`}>{tier.label}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                              {season.stats.map((stat) => (
                                <span key={stat.label} className="text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{stat.value.toLocaleString()}</span> {stat.label}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={`font-mono text-xl font-bold ${tier.color}`}>{Math.round(season.score)}</p>
                            <p className="text-[10px] text-muted-foreground">score</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="glass-card p-12 text-center">
                  <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-2xl font-bold text-muted-foreground mb-2">No Season History</h3>
                  <p className="text-muted-foreground">Upload multiple season CSVs to see greatest seasons.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
};

export default RecordsTab;
