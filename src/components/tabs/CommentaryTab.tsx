import { useMemo } from 'react';
import { useLeague } from '@/context/LeagueContext';
import { Newspaper, Trophy, Star, TrendingUp, Crown, AlertCircle } from 'lucide-react';
import type { Player, QBPlayer, RBPlayer, WRPlayer, TEPlayer, LBPlayer, DBPlayer, DLPlayer } from '@/types/player';
import PositionBadge from '../PositionBadge';
import { getTeamColors } from '@/utils/teamColors';

const CommentaryTab = () => {
  const { careerData, seasonData, currentSeason } = useLeague();

  const commentary = useMemo(() => {
    if (!careerData) return null;

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

    const activePlayers = allPlayers.filter((p) => p.status === 'Active');
    const hofPlayers = allPlayers.filter((p) => p.careerLegacy >= 5000);
    const legendaryPlayers = allPlayers.filter((p) => p.careerLegacy >= 8000);

    // Top by various metrics
    const topByLegacy = [...allPlayers].sort((a, b) => b.careerLegacy - a.careerLegacy).slice(0, 5);
    const topByTPG = [...activePlayers].sort((a, b) => b.tpg - a.tpg).slice(0, 5);
    const topByRings = [...allPlayers].sort((a, b) => b.rings - a.rings).slice(0, 5);
    const topByMVP = [...allPlayers].filter((p) => p.mvp > 0).sort((a, b) => b.mvp - a.mvp).slice(0, 5);

    // Season stories (if season data exists)
    let seasonStories: { headline: string; body: string; player?: Player; tier: 'legendary' | 'breaking' | 'notable' }[] = [];

    if (seasonData) {
      const allSeasonPlayers: Player[] = [
        ...seasonData.quarterbacks,
        ...seasonData.runningbacks,
        ...seasonData.widereceivers,
        ...seasonData.tightends,
        ...seasonData.offensiveline,
        ...seasonData.linebackers,
        ...seasonData.defensivebacks,
        ...seasonData.defensiveline,
      ];

      // Find standout season performers
      const qbStandout = seasonData.quarterbacks.reduce((a, b) => (a.passYds > b.passYds ? a : b), seasonData.quarterbacks[0]);
      const rbStandout = seasonData.runningbacks.reduce((a, b) => (a.rushYds > b.rushYds ? a : b), seasonData.runningbacks[0]);
      const wrStandout = seasonData.widereceivers.reduce((a, b) => (a.recYds > b.recYds ? a : b), seasonData.widereceivers[0]);

      if (qbStandout && qbStandout.passYds > 0) {
        const isLegendary = qbStandout.passYds >= 4500;
        const careerQB = careerData.quarterbacks.find((q) => q.name === qbStandout.name);
        seasonStories.push({
          headline: isLegendary
            ? `${qbStandout.name.split(' ').pop()} Posts Historic Season`
            : `${qbStandout.name.split(' ').pop()} Leads League in Passing`,
          body: `${qbStandout.name} threw for ${qbStandout.passYds.toLocaleString()} yards and ${qbStandout.passTD} touchdowns this season${careerQB ? `, bringing their career total to ${careerQB.passYds.toLocaleString()} yards` : ''}.`,
          player: careerQB || qbStandout,
          tier: isLegendary ? 'legendary' : 'breaking',
        });
      }

      if (rbStandout && rbStandout.rushYds > 0) {
        const isLegendary = rbStandout.rushYds >= 1500;
        const careerRB = careerData.runningbacks.find((r) => r.name === rbStandout.name);
        seasonStories.push({
          headline: isLegendary
            ? `${rbStandout.name.split(' ').pop()} Dominates on the Ground`
            : `${rbStandout.name.split(' ').pop()} Paces Rushing Attack`,
          body: `${rbStandout.name} rushed for ${rbStandout.rushYds.toLocaleString()} yards with ${rbStandout.rushTD} touchdowns${careerRB ? `. Career rushing yards now sit at ${careerRB.rushYds.toLocaleString()}` : ''}.`,
          player: careerRB || rbStandout,
          tier: isLegendary ? 'legendary' : 'notable',
        });
      }

      if (wrStandout && wrStandout.recYds > 0) {
        const isLegendary = wrStandout.recYds >= 1400;
        const careerWR = careerData.widereceivers.find((w) => w.name === wrStandout.name);
        seasonStories.push({
          headline: isLegendary
            ? `${wrStandout.name.split(' ').pop()} Has Career Year`
            : `${wrStandout.name.split(' ').pop()} Leads Receivers`,
          body: `${wrStandout.name} hauled in ${wrStandout.receptions} catches for ${wrStandout.recYds.toLocaleString()} yards and ${wrStandout.recTD} scores${careerWR ? `. Now has ${careerWR.recYds.toLocaleString()} career receiving yards` : ''}.`,
          player: careerWR || wrStandout,
          tier: isLegendary ? 'legendary' : 'notable',
        });
      }

      // Championship winner story
      const newChamps = allSeasonPlayers.filter((p) => p.rings > 0);
      if (newChamps.length > 0) {
        seasonStories.unshift({
          headline: 'Championship Glory',
          body: `${newChamps.length} player${newChamps.length > 1 ? 's' : ''} added a ring to ${newChamps.length > 1 ? 'their collections' : 'their collection'} this season: ${newChamps.map((p) => p.name).join(', ')}.`,
          tier: 'legendary',
        });
      }

      // MVP winner
      const newMVPs = allSeasonPlayers.filter((p) => p.mvp > 0);
      if (newMVPs.length > 0) {
        const mvp = newMVPs[0];
        const careerMVP = allPlayers.find((p) => p.name === mvp.name);
        seasonStories.unshift({
          headline: `${mvp.name.split(' ').pop()} Wins MVP`,
          body: `${mvp.name} captured the league's highest individual honor${careerMVP && careerMVP.mvp > 1 ? `, their ${careerMVP.mvp}${careerMVP.mvp === 2 ? 'nd' : careerMVP.mvp === 3 ? 'rd' : 'th'} career MVP award` : ''}.`,
          player: careerMVP || mvp,
          tier: 'legendary',
        });
      }
    }

    return {
      totalPlayers: allPlayers.length,
      activePlayers: activePlayers.length,
      hofCount: hofPlayers.length,
      legendaryCount: legendaryPlayers.length,
      topByLegacy,
      topByTPG,
      topByRings,
      topByMVP,
      seasonStories,
    };
  }, [careerData, seasonData]);

  if (!careerData || !commentary) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-chart-4/10 mb-6">
            <Newspaper className="w-10 h-10 text-chart-4" />
          </div>
          <h2 className="font-display text-4xl font-bold mb-4 text-chart-4">LEAGUE REPORT</h2>
          <p className="text-muted-foreground text-lg">Upload your league data to see commentary and analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="glass-card-glow p-8">
        <div className="flex items-center gap-4 mb-6">
          <Newspaper className="w-10 h-10 text-chart-4" />
          <div>
            <h2 className="font-display text-4xl font-bold tracking-wide">LEAGUE REPORT</h2>
            <p className="text-muted-foreground">Season {currentSeason} • {commentary.totalPlayers} Players • {commentary.hofCount} Hall of Famers</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/30">
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-primary">{commentary.activePlayers}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Players</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-chart-4">{commentary.legendaryCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Legendary Status</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-accent">{commentary.topByRings[0]?.rings || 0}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Most Rings</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-metric-elite">{commentary.topByTPG[0]?.tpg.toFixed(2) || '0'}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Top TPG</p>
          </div>
        </div>
      </div>

      {/* Season Stories */}
      {commentary.seasonStories.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 border-b border-border/30 pb-3 mb-6">
            <AlertCircle className="w-5 h-5 text-chart-4" />
            <h3 className="font-display text-xl font-bold text-chart-4">SEASON {currentSeason} HEADLINES</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {commentary.seasonStories.map((story, i) => (
              <StoryCard key={i} story={story} />
            ))}
          </div>
        </div>
      )}

      {/* Career Analysis */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* All-Time Greats */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 border-b border-border/30 pb-3 mb-4">
            <Crown className="w-5 h-5 text-chart-4" />
            <h3 className="font-display text-xl font-bold text-chart-4">ALL-TIME LEGACY LEADERS</h3>
          </div>
          <div className="space-y-3">
            {commentary.topByLegacy.map((player, i) => (
              <PlayerRow key={player.name} player={player} rank={i + 1} stat={player.careerLegacy} statLabel="Legacy" />
            ))}
          </div>
        </div>

        {/* Most Efficient (TPG) */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 border-b border-border/30 pb-3 mb-4">
            <TrendingUp className="w-5 h-5 text-metric-elite" />
            <h3 className="font-display text-xl font-bold text-metric-elite">EFFICIENCY LEADERS (TPG)</h3>
          </div>
          <div className="space-y-3">
            {commentary.topByTPG.map((player, i) => (
              <PlayerRow key={player.name} player={player} rank={i + 1} stat={player.tpg} statLabel="TPG" decimals={2} />
            ))}
          </div>
        </div>

        {/* Championship Winners */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 border-b border-border/30 pb-3 mb-4">
            <Trophy className="w-5 h-5 text-accent" />
            <h3 className="font-display text-xl font-bold text-accent">MOST CHAMPIONSHIPS</h3>
          </div>
          <div className="space-y-3">
            {commentary.topByRings.map((player, i) => (
              <PlayerRow key={player.name} player={player} rank={i + 1} stat={player.rings} statLabel="Rings" />
            ))}
          </div>
        </div>

        {/* MVP Winners */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 border-b border-border/30 pb-3 mb-4">
            <Star className="w-5 h-5 text-primary" />
            <h3 className="font-display text-xl font-bold text-primary">MVP AWARD LEADERS</h3>
          </div>
          <div className="space-y-3">
            {commentary.topByMVP.length > 0 ? (
              commentary.topByMVP.map((player, i) => (
                <PlayerRow key={player.name} player={player} rank={i + 1} stat={player.mvp} statLabel="MVPs" />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No MVP winners yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* League Analysis */}
      <div className="glass-card p-8">
        <h3 className="font-display font-bold text-2xl mb-6 border-b border-border/30 pb-4">STATE OF THE LEAGUE</h3>
        <div className="grid md:grid-cols-2 gap-8 text-muted-foreground leading-relaxed">
          <div>
            <h4 className="font-bold text-primary mb-2">Dynasty in the Making?</h4>
            <p>
              <span className="text-foreground font-semibold">{commentary.topByRings[0]?.name}</span> leads the league with{' '}
              <span className="text-chart-4 font-semibold">{commentary.topByRings[0]?.rings} championships</span>, cementing their
              legacy as one of the greatest winners in league history.
              {commentary.topByRings[0]?.status === 'Active' && ' Still active and hunting for more.'}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-metric-elite mb-2">Peak Performance</h4>
            <p>
              With a <span className="text-metric-elite font-semibold">{commentary.topByTPG[0]?.tpg.toFixed(2)} TPG</span>,{' '}
              <span className="text-foreground font-semibold">{commentary.topByTPG[0]?.name}</span> ({commentary.topByTPG[0]?.position})
              is producing at an elite rate. Only <span className="text-chart-4 font-semibold">{commentary.legendaryCount}</span> players
              have achieved legendary status (Legacy ≥8000).
            </p>
          </div>
          <div>
            <h4 className="font-bold text-accent mb-2">Hall of Fame Watch</h4>
            <p>
              <span className="text-accent font-semibold">{commentary.hofCount} players</span> have crossed the Hall of Fame threshold
              (Legacy ≥5000). The all-time leader <span className="text-foreground font-semibold">{commentary.topByLegacy[0]?.name}</span> holds
              a commanding <span className="text-chart-4 font-semibold">{commentary.topByLegacy[0]?.careerLegacy.toFixed(0)}</span> Career Legacy.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-chart-4 mb-2">Looking Ahead</h4>
            <p>
              With <span className="text-primary font-semibold">{commentary.activePlayers} active players</span> still competing,
              the race for postseason awards and statistical milestones continues. The next generation is ready to make their mark.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StoryCard = ({ story }: { story: { headline: string; body: string; player?: Player; tier: string } }) => {
  const colors = {
    legendary: { border: 'border-chart-4', text: 'text-chart-4', bg: 'bg-chart-4/10' },
    breaking: { border: 'border-primary', text: 'text-primary', bg: 'bg-primary/10' },
    notable: { border: 'border-muted-foreground', text: 'text-muted-foreground', bg: 'bg-muted/10' },
  };
  const style = colors[story.tier as keyof typeof colors] || colors.notable;
  const teamColors = story.player ? getTeamColors(story.player.team) : null;

  return (
    <div
      className={`rounded-xl p-4 ${style.bg} border ${style.border}`}
      style={teamColors ? { borderLeftColor: `hsl(${teamColors.primary})`, borderLeftWidth: '3px' } : undefined}
    >
      <h4 className={`font-bold ${style.text} mb-2`}>{story.headline}</h4>
      <p className="text-sm text-muted-foreground">{story.body}</p>
      {story.player && (
        <div className="flex items-center gap-2 mt-3">
          <PositionBadge position={story.player.position} className="text-xs" />
          {story.player.team && (
            <span
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={teamColors ? { backgroundColor: `hsl(${teamColors.primary} / 0.2)`, color: `hsl(${teamColors.primary})` } : undefined}
            >
              {story.player.team}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const PlayerRow = ({ player, rank, stat, statLabel, decimals = 0 }: { player: Player; rank: number; stat: number; statLabel: string; decimals?: number }) => {
  const teamColors = getTeamColors(player.team);

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors"
      style={teamColors ? { borderLeft: `3px solid hsl(${teamColors.primary})` } : undefined}
    >
      <span className="font-display font-bold text-2xl text-muted-foreground/50 w-8">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{player.name}</p>
        <div className="flex items-center gap-2">
          <PositionBadge position={player.position} className="text-xs" />
          {player.team && <span className="text-xs text-muted-foreground">{player.team}</span>}
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono font-bold text-xl text-primary">{decimals > 0 ? stat.toFixed(decimals) : stat.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{statLabel}</p>
      </div>
    </div>
  );
};

export default CommentaryTab;
