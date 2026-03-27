import LandingShell from './LandingShell';

interface LandingPageBProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export default function LandingPageB({ onLoginClick, onSignupClick }: LandingPageBProps) {
  return <LandingShell variant="b" onLoginClick={onLoginClick} onSignupClick={onSignupClick} />;
}
