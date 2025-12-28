import { useMemo } from 'react';
import { useLeague } from '@/context/LeagueContext';
import FileUpload from '../FileUpload';
import { Calendar, TrendingUp, TrendingDown, Star, Zap, Trophy } from 'lucide-react';
import type { Player, QBPlayer, RBPlayer, WRPlayer, TEPlayer, OLPlayer, LBPlayer, DBPlayer, DLPlayer, LeagueData } from '@/types/player';
import PositionBadge from '../PositionBadge';
import { getTeamColors } from '@/utils/teamColors';

type SeasonTier = 'legendary' | 'great' | 'good' | 'average' | 'poor';

interface SeasonPerformance {
  player: Player;
  seasonStats: Partial<Player>;
  tier: SeasonTier;
  summary: string;
  keyStats: { label: string; value: number }[];
}

const getTierInfo = (tier: SeasonTier) => {
  switch (tier) {
    case 'legendary':
      return { label: 'LEGENDARY SEASON', color: 'hsl(var(--chart-4))', icon: Star, bg: 'bg-chart-4/20' };
    case 'great':
      return { label: 'GREAT SEASON', color: 'hsl(var(--metric-elite))', icon: TrendingUp, bg: 'bg-metric-elite/20' };
    case 'good':
      return { label: 'GOOD SEASON', color: 'hsl(var(--primary))', icon: TrendingUp, bg: 'bg-primary/20' };
    case 'average':
      return { label: 'AVERAGE SEASON', color: 'hsl(var(--muted-foreground))', icon: Zap, bg: 'bg-muted/20' };
    case 'poor':
      return { label: 'DOWN SEASON', color: 'hsl(var(--destructive))', icon: TrendingDown, bg: 'bg-destructive/20' };
  }
};

const SeasonTab = () => {
  const { careerData, seasonData, previousData, currentSeason, loadSeasonData } = useLeague();

  const handleFileLoad = (content: string, filename: string) => {
    const seasonMatch = filename.match(/y(\d+)/i);
    const seasonName = seasonMatch ? `Y${seasonMatch[1]}` : 'New Season';
    loadSeasonData(content, seasonName);
  };

  const performances = useMemo((): SeasonPerformance[] => {
    if (!seasonData || !careerData) return [];

    const getPerformances = <T extends Player>(
      seasonPlayers: T[],
      careerPlayers: T[],
      getKeyStats: (p: T) => { label: string; value: number }[],
      getPrimaryStat: (p: T) => number,
      thresholds: { legendary: number; great: number; good: number; average: number },
    ): SeasonPerformance[] => {
      return seasonPlayers
        .filter((sp) => getPrimaryStat(sp) > 0) // Only players who played
        .map((sp) => {
          const careerPlayer = careerPlayers.find((c) => c.name === sp.name);
          const primaryStat = getPrimaryStat(sp);
          
          let tier: SeasonTier;
          if (primaryStat >= thresholds.legendary) tier = 'legendary';
          else if (primaryStat >= thresholds.great) tier = 'great';
          else if (primaryStat >= thresholds.good) tier = 'good';
          else if (primaryStat >= thresholds.average) tier = 'average';
          else tier = 'poor';

          const keyStats = getKeyStats(sp);
          const summary = generateSummary(sp, tier, keyStats);

          return {
            player: careerPlayer || sp,
            seasonStats: sp,
            tier,
            summary,
            keyStats,
          };
        })
        .sort((a, b) => {
          const tierOrder = { legendary: 0, great: 1, good: 2, average: 3, poor: 4 };
          return tierOrder[a.tier] - tierOrder[b.tier];
        });
    };

    const generateSummary = (p: Player, tier: SeasonTier, stats: { label: string; value: number }[]): string => {
      const mainStat = stats[0];
      if (!mainStat) return '';

      switch (tier) {
        case 'legendary':
          return `Absolutely dominant with ${mainStat.value.toLocaleString()} ${mainStat.label.toLowerCase()}.`;
        case 'great':
          return `Excellent production: ${mainStat.value.toLocaleString()} ${mainStat.label.toLowerCase()}.`;
        case 'good':
          return `Solid performance with ${mainStat.value.toLocaleString()} ${mainStat.label.toLowerCase()}.`;
        case 'average':
          return `Modest output of ${mainStat.value.toLocaleString()} ${mainStat.label.toLowerCase()}.`;
        case 'poor':
          return `Limited action: ${mainStat.value.toLocaleString()} ${mainStat.label.toLowerCase()}.`;
      }
    };

    const allPerformances: SeasonPerformance[] = [];

    // QB performances
    allPerformances.push(
      ...getPerformances(
        seasonData.quarterbacks as QBPlayer[],
        careerData.quarterbacks,
        (p) => [
          { label: 'Pass Yds', value: p.passYds },
          { label: 'Pass TDs', value: p.passTD },
          { label: 'Rush Yds', value: p.rushYds },
        ],
        (p) => p.passYds,
        { legendary: 4500, great: 3500, good: 2500, average: 1500 },
      ),
    );

    // RB performances
    allPerformances.push(
      ...getPerformances(
        seasonData.runningbacks as RBPlayer[],
        careerData.runningbacks,
        (p) => [
          { label: 'Rush Yds', value: p.rushYds },
          { label: 'Rush TDs', value: p.rushTD },
          { label: 'Rec Yds', value: p.recYds },
        ],
        (p) => p.rushYds,
        { legendary: 1500, great: 1000, good: 700, average: 400 },
      ),
    );

    // WR performances
    allPerformances.push(
      ...getPerformances(
        seasonData.widereceivers as WRPlayer[],
        careerData.widereceivers,
        (p) => [
          { label: 'Rec Yds', value: p.recYds },
          { label: 'Receptions', value: p.receptions },
          { label: 'TDs', value: p.recTD },
        ],
        (p) => p.recYds,
        { legendary: 1400, great: 1000, good: 700, average: 400 },
      ),
    );

    // TE performances
    allPerformances.push(
      ...getPerformances(
        seasonData.tightends as TEPlayer[],
        careerData.tightends,
        (p) => [
          { label: 'Rec Yds', value: p.recYds },
          { label: 'Receptions', value: p.receptions },
          { label: 'TDs', value: p.recTD },
        ],
        (p) => p.recYds,
        { legendary: 1000, great: 700, good: 500, average: 300 },
      ),
    );

    // DEF performances (LB, DB, DL combined)
    const defSeason = [
      ...seasonData.linebackers,
      ...seasonData.defensivebacks,
      ...seasonData.defensiveline,
    ] as (LBPlayer | DBPlayer | DLPlayer)[];
    const defCareer = [
      ...careerData.linebackers,
      ...careerData.defensivebacks,
      ...careerData.defensiveline,
    ] as (LBPlayer | DBPlayer | DLPlayer)[];

    allPerformances.push(
      ...getPerformances(
        defSeason,
        defCareer,
        (p) => [
          { label: 'Tackles', value: p.tackles },
          { label: 'INTs', value: p.interceptions },
          { label: 'Sacks', value: p.sacks },
        ],
        (p) => p.tackles,
        { legendary: 100, great: 70, good: 50, average: 30 },
      ),
    );

    return allPerformances;
  }, [seasonData, careerData]);

  if (!careerData) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 mb-6">
            <Calendar className="w-10 h-10 text-accent" />
          </div>
          <h2 className="font-display text-3xl font-bold mb-4 text-accent">Season Overview</h2>
          <p className="text-muted-foreground text-lg">
            First, upload your career data in the Career tab to establish a baseline.
          </p>
        </div>
      </div>
    );
  }

  const hasSeasonData = performances.length > 0;

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="glass-card-glow p-8 mb-8 text-center">
        <Calendar className="w-12 h-12 text-accent mx-auto mb-4" />
        <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">Current Season</p>
        <h2 className="font-display text-5xl font-bold text-accent mb-4">{currentSeason}</h2>
        {hasSeasonData ? (
          <p className="text-muted-foreground">
            {performances.filter((p) => p.tier === 'legendary').length} legendary seasons •{' '}
            {performances.filter((p) => p.tier === 'great').length} great seasons •{' '}
            {performances.length} total performances
          </p>
        ) : (
          <p className="text-muted-foreground">Upload a new season CSV to see performance breakdowns</p>
        )}
      </div>

      {!hasSeasonData && (
        <div className="max-w-xl mx-auto mb-8">
          <FileUpload onFileLoad={handleFileLoad} label="Upload Next Season CSV" />
        </div>
      )}

      {hasSeasonData && (
        <div className="space-y-6">
          {/* Legendary Seasons */}
          {performances.filter((p) => p.tier === 'legendary').length > 0 && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 border-b border-border/30 pb-3 mb-4">
                <Star className="w-5 h-5 text-chart-4" />
                <h3 className="font-display text-xl font-bold text-chart-4">LEGENDARY SEASONS</h3>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performances
                  .filter((p) => p.tier === 'legendary')
                  .map((perf) => (
                    <PerformanceCard key={perf.player.name} perf={perf} />
                  ))}
              </div>
            </div>
          )}

          {/* Great & Good Seasons */}
          {performances.filter((p) => p.tier === 'great' || p.tier === 'good').length > 0 && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 border-b border-border/30 pb-3 mb-4">
                <TrendingUp className="w-5 h-5 text-metric-elite" />
                <h3 className="font-display text-xl font-bold text-metric-elite">STANDOUT PERFORMERS</h3>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performances
                  .filter((p) => p.tier === 'great' || p.tier === 'good')
                  .map((perf) => (
                    <PerformanceCard key={perf.player.name} perf={perf} />
                  ))}
              </div>
            </div>
          )}

          {/* All Other Performances */}
          {performances.filter((p) => p.tier === 'average' || p.tier === 'poor').length > 0 && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 border-b border-border/30 pb-3 mb-4">
                <Zap className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-display text-xl font-bold text-muted-foreground">OTHER PERFORMANCES</h3>
              </div>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
                {performances
                  .filter((p) => p.tier === 'average' || p.tier === 'poor')
                  .map((perf) => (
                    <PerformanceCardMini key={perf.player.name} perf={perf} />
                  ))}
              </div>
            </div>
          )}

          {/* Upload Next Season */}
          <div className="max-w-md mx-auto mt-8">
            <FileUpload onFileLoad={handleFileLoad} label="Upload Next Season" />
          </div>
        </div>
      )}
    </div>
  );
};

const PerformanceCard = ({ perf }: { perf: SeasonPerformance }) => {
  const tierInfo = getTierInfo(perf.tier);
  const Icon = tierInfo.icon;
  const teamColors = getTeamColors(perf.player.team);

  return (
    <div
      className={`rounded-xl p-4 ${tierInfo.bg} border border-border/30`}
      style={teamColors ? { borderLeft: `3px solid hsl(${teamColors.primary})` } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4" style={{ color: tierInfo.color }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: tierInfo.color }}>
              {tierInfo.label}
            </span>
          </div>
          <h4 className="font-semibold text-foreground">{perf.player.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <PositionBadge position={perf.player.position} className="text-xs" />
            {perf.player.team && (
              <span className="text-xs text-muted-foreground">{perf.player.team}</span>
            )}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{perf.summary}</p>
      <div className="grid grid-cols-3 gap-2">
        {perf.keyStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-mono font-bold text-foreground">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const PerformanceCardMini = ({ perf }: { perf: SeasonPerformance }) => {
  const tierInfo = getTierInfo(perf.tier);
  const teamColors = getTeamColors(perf.player.team);

  return (
    <div
      className="rounded-lg p-3 bg-secondary/20 border border-border/20"
      style={teamColors ? { borderLeft: `2px solid hsl(${teamColors.primary})` } : undefined}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm text-foreground truncate">{perf.player.name}</span>
        <PositionBadge position={perf.player.position} className="text-xs" />
      </div>
      <p className="text-xs text-muted-foreground">{perf.keyStats[0]?.value.toLocaleString()} {perf.keyStats[0]?.label}</p>
    </div>
  );
};

export default SeasonTab;
