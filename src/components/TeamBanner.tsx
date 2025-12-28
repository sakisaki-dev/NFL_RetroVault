import { getTeamColors } from '@/utils/teamColors';

interface TeamBannerProps {
  team?: string;
  className?: string;
}

const TeamBanner = ({ team, className = '' }: TeamBannerProps) => {
  const colors = getTeamColors(team);
  
  if (!colors || !team) return null;
  
  return (
    <div 
      className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${className}`}
      style={{ 
        background: `linear-gradient(180deg, hsl(${colors.primary}) 0%, hsl(${colors.secondary}) 100%)`,
      }}
    />
  );
};

export default TeamBanner;
