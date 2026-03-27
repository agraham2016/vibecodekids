import LandingShell from './LandingShell';

interface LandingPageProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export default function LandingPage({ onLoginClick, onSignupClick }: LandingPageProps) {
  return <LandingShell variant="a" onLoginClick={onLoginClick} onSignupClick={onSignupClick} />;
}
