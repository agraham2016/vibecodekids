import type { MembershipUsage } from '../types';
import { ENABLE_ASSET_CATALOG } from '../config/featureFlags';

interface AssetCatalogGateProps {
  membership: MembershipUsage | null;
  onUpgradeClick: () => void;
  onOpenCatalog: () => void;
}

export default function AssetCatalogGate({ membership, onUpgradeClick, onOpenCatalog }: AssetCatalogGateProps) {
  if (!ENABLE_ASSET_CATALOG) return null;

  const canAccess = membership?.canAccessPremiumAssets === true;

  if (canAccess) {
    return (
      <button className="asset-catalog-trigger" onClick={onOpenCatalog} type="button">
        <span className="asset-catalog-trigger-icon">🎨</span>
        <span className="asset-catalog-trigger-text">Asset Catalog</span>
      </button>
    );
  }

  return (
    <button className="asset-catalog-trigger locked" onClick={onUpgradeClick} type="button" title="Upgrade to unlock">
      <span className="asset-catalog-trigger-icon">🔒</span>
      <span className="asset-catalog-trigger-text">Asset Catalog</span>
      <span className="asset-catalog-upgrade-badge">PRO</span>
    </button>
  );
}
