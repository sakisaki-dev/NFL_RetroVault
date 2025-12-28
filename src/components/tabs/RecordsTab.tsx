import { useMemo } from 'react';
import { useLeague } from '@/context/LeagueContext';
import { Trophy, Crown } from 'lucide-react';
import type { Player, QBPlayer, RBPlayer, WRPlayer, TEPlayer, LBPlayer, DBPlayer, DLPlayer } from '@/types/player';
import PositionBadge from '../PositionBadge';
import { getTeamColors } from '@/utils/teamColors';

interface RecordEntry {
  stat: string;
  value: number;
  playerName: string;
  team?: string;
  position: string;
}

const RecordRow = ({ record, rank }: { record: RecordEntry; rank: number }) => {
  const teamColors = getTeamColors(record.team);
  
  return (
    <div 
      className="flex items-center gap-4 p-4 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors"
      style={teamColors ? { borderLeft: `3px solid hsl(${teamColors.primary})` } : undefined}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-display font-bold text-lg">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{record.playerName}</span>
          {record.team && (
            <span 
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={teamColors ? {
                backgroundColor: `hsl(${teamColors.primary} / 0.2)`,
                color: `hsl(${teamColors.primary})`,
              } : { color: 'hsl(var(--muted-foreground))' }}
            >
              {record.team}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{record.stat}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-xl font-bold text-primary">
          {record.value.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

const RecordsTab = () => {
  const { careerData } = useLeague();

  const records = useMemo(() => {
    if (!careerData) return null;

    // Helper to find max
    const findMax = <T extends Player>(
      players: T[],
      getValue: (p: T) => number,
      stat: string,
    ): RecordEntry | null => {
      if (players.length === 0) return null;
      const max = players.reduce((a, b) => (getValue(a) > getValue(b) ? a : b));
      return {
        stat,
        value: getValue(max),
        playerName: max.name,
        team: max.team,
        position: max.position,
      };
    };

    // QB Records
    const qbRecords: RecordEntry[] = [];
    if (careerData.quarterbacks.length > 0) {
      const qbs = careerData.quarterbacks;
      [
        findMax(qbs, (p) => p.passYds, 'Career Passing Yards'),
        findMax(qbs, (p) => p.passTD, 'Career Passing Touchdowns'),
        findMax(qbs, (p) => p.completions, 'Career Completions'),
        findMax(qbs, (p) => p.games, 'Games Started (QB)'),
        findMax(qbs, (p) => p.rushYds, 'QB Career Rush Yards'),
        findMax(qbs, (p) => p.rushTD, 'QB Career Rush TDs'),
      ].forEach((r) => r && qbRecords.push(r));
    }

    // RB Records
    const rbRecords: RecordEntry[] = [];
    if (careerData.runningbacks.length > 0) {
      const rbs = careerData.runningbacks;
      [
        findMax(rbs, (p) => p.rushYds, 'Career Rushing Yards'),
        findMax(rbs, (p) => p.rushTD, 'Career Rushing Touchdowns'),
        findMax(rbs, (p) => p.rushAtt, 'Career Rush Attempts'),
        findMax(rbs, (p) => p.recYds, 'RB Career Receiving Yards'),
        findMax(rbs, (p) => p.recTD, 'RB Career Receiving TDs'),
        findMax(rbs, (p) => p.games, 'Games Started (RB)'),
      ].forEach((r) => r && rbRecords.push(r));
    }

    // WR Records
    const wrRecords: RecordEntry[] = [];
    if (careerData.widereceivers.length > 0) {
      const wrs = careerData.widereceivers;
      [
        findMax(wrs, (p) => p.recYds, 'Career Receiving Yards'),
        findMax(wrs, (p) => p.receptions, 'Career Receptions'),
        findMax(wrs, (p) => p.recTD, 'Career Receiving TDs'),
        findMax(wrs, (p) => p.longest, 'Longest Reception'),
        findMax(wrs, (p) => p.games, 'Games Started (WR)'),
      ].forEach((r) => r && wrRecords.push(r));
    }

    // TE Records
    const teRecords: RecordEntry[] = [];
    if (careerData.tightends.length > 0) {
      const tes = careerData.tightends;
      [
        findMax(tes, (p) => p.recYds, 'TE Career Receiving Yards'),
        findMax(tes, (p) => p.receptions, 'TE Career Receptions'),
        findMax(tes, (p) => p.recTD, 'TE Career Receiving TDs'),
        findMax(tes, (p) => p.games, 'Games Started (TE)'),
      ].forEach((r) => r && teRecords.push(r));
    }

    // Defensive Records (combined)
    const allDef = [
      ...careerData.linebackers,
      ...careerData.defensivebacks,
      ...careerData.defensiveline,
    ] as (LBPlayer | DBPlayer | DLPlayer)[];

    const defRecords: RecordEntry[] = [];
    if (allDef.length > 0) {
      [
        findMax(allDef, (p) => p.tackles, 'Career Tackles'),
        findMax(allDef, (p) => p.interceptions, 'Career Interceptions (DEF)'),
        findMax(allDef, (p) => p.sacks, 'Career Sacks'),
        findMax(allDef, (p) => p.forcedFumbles, 'Career Forced Fumbles'),
        findMax(allDef, (p) => p.games, 'Games Started (DEF)'),
      ].forEach((r) => r && defRecords.push(r));
    }

    // Accolades & Metrics
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

    const accoladeRecords: RecordEntry[] = [];
    if (allPlayers.length > 0) {
      [
        findMax(allPlayers, (p) => p.rings, 'Career Championships'),
        findMax(allPlayers, (p) => p.mvp, 'Career MVP Awards'),
        findMax(allPlayers, (p) => p.sbmvp, 'Super Bowl MVP Awards'),
        findMax(allPlayers, (p) => p.games, 'All-Time Games Played'),
        findMax(allPlayers, (p) => p.careerLegacy, 'Highest Career Legacy'),
        findMax(allPlayers, (p) => p.trueTalent, 'Highest True Talent'),
        findMax(allPlayers, (p) => p.dominance, 'Highest Dominance'),
        findMax(allPlayers, (p) => p.tpg, 'Highest TPG (Talent Per Game)'),
      ].forEach((r) => r && accoladeRecords.push(r));
    }

    return { qbRecords, rbRecords, wrRecords, teRecords, defRecords, accoladeRecords };
  }, [careerData]);

  if (!careerData || !records) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-4xl font-bold mb-4 text-primary">ALL-TIME RECORDS</h2>
          <p className="text-muted-foreground text-lg">Upload your league data to view all-time records.</p>
        </div>
      </div>
    );
  }

  const Section = ({ title, records, color }: { title: string; records: RecordEntry[]; color: string }) => (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-border/30 pb-3">
        <Crown className="w-5 h-5" style={{ color }} />
        <h3 className="font-display text-xl font-bold tracking-wide" style={{ color }}>{title}</h3>
      </div>
      <div className="space-y-2">
        {records.map((r, i) => (
          <RecordRow key={r.stat} record={r} rank={i + 1} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="glass-card-glow p-8 mb-8 text-center">
        <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="font-display text-5xl font-bold tracking-wider text-primary mb-2">ALL-TIME RECORDS</h2>
        <p className="text-muted-foreground">League Leaders Across All Statistical Categories</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {records.qbRecords.length > 0 && (
          <Section title="QUARTERBACK RECORDS" records={records.qbRecords} color="hsl(var(--primary))" />
        )}
        {records.rbRecords.length > 0 && (
          <Section title="RUNNING BACK RECORDS" records={records.rbRecords} color="hsl(var(--accent))" />
        )}
        {records.wrRecords.length > 0 && (
          <Section title="WIDE RECEIVER RECORDS" records={records.wrRecords} color="hsl(var(--chart-4))" />
        )}
        {records.teRecords.length > 0 && (
          <Section title="TIGHT END RECORDS" records={records.teRecords} color="hsl(var(--chart-3))" />
        )}
        {records.defRecords.length > 0 && (
          <Section title="DEFENSIVE RECORDS" records={records.defRecords} color="hsl(var(--destructive))" />
        )}
        {records.accoladeRecords.length > 0 && (
          <Section title="ACCOLADES & METRICS" records={records.accoladeRecords} color="hsl(var(--metric-elite))" />
        )}
      </div>
    </div>
  );
};

export default RecordsTab;
