import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import './AssetCatalog.css';

interface CategoryInfo {
  id: string;
  label: string;
  packCount: number;
  totalSprites: number;
}

interface PackSummary {
  id: string;
  label: string;
  category: string;
  tags: string[];
  spriteCount: number;
  previewSprites: string[];
}

interface PackDetail {
  id: string;
  label: string;
  category: string;
  tags: string[];
  spriteCount: number;
  previewSprites: string[];
  sprites: Array<{ filename: string; url: string; size: number }>;
}

interface AssetCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (assetUrl: string, assetName: string) => void;
}

export default function AssetCatalog({ isOpen, onClose, onSelectAsset }: AssetCatalogProps) {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<PackDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ packId: string; packLabel: string; category: string; sprites: string[] }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSprites, setSelectedSprites] = useState<Set<string>>(new Set());

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get<{ ok: boolean; categories: CategoryInfo[] }>('/api/assets/categories');
      if (data.ok) setCategories(data.categories);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load categories';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPacks = useCallback(async (category?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const url = category ? `/api/assets/packs?category=${encodeURIComponent(category)}` : '/api/assets/packs';
      const data = await api.get<{ ok: boolean; packs: PackSummary[] }>(url);
      if (data.ok) setPacks(data.packs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load packs';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPackDetail = useCallback(async (packId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get<{ ok: boolean; pack: PackDetail }>(`/api/assets/packs/${packId}`);
      if (data.ok) setSelectedPack(data.pack);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load pack details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setIsLoading(true);
      const data = await api.get<{
        ok: boolean;
        results: Array<{ packId: string; packLabel: string; category: string; sprites: string[] }>;
      }>(`/api/assets/search?q=${encodeURIComponent(q)}`);
      if (data.ok) setSearchResults(data.results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadPacks();
    }
  }, [isOpen, loadCategories, loadPacks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        doSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  const handleCategoryClick = (catId: string) => {
    if (selectedCategory === catId) {
      setSelectedCategory(null);
      loadPacks();
    } else {
      setSelectedCategory(catId);
      loadPacks(catId);
    }
    setSelectedPack(null);
  };

  const handlePackClick = (packId: string) => {
    loadPackDetail(packId);
  };

  const handleBackToPacks = () => {
    setSelectedPack(null);
  };

  const toggleSpriteSelection = (url: string) => {
    setSelectedSprites((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleUseSelected = () => {
    selectedSprites.forEach((url) => {
      const name =
        url
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '') || 'sprite';
      onSelectAsset(url, name);
    });
    setSelectedSprites(new Set());
  };

  if (!isOpen) return null;

  const isSearching = searchQuery.trim().length >= 2;

  return (
    <div className="asset-catalog-overlay" role="dialog" aria-modal="true" aria-label="Asset Catalog">
      <div className="asset-catalog-modal">
        <div className="asset-catalog-header">
          <h2>2D Asset Catalog</h2>
          <div className="asset-catalog-search">
            <input
              type="text"
              placeholder="Search sprites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="asset-search-input"
            />
          </div>
          <button className="asset-catalog-close" onClick={onClose} aria-label="Close catalog">
            ✕
          </button>
        </div>

        {error && <div className="asset-catalog-error">{error}</div>}

        <div className="asset-catalog-body">
          {/* Category sidebar */}
          <div className="asset-catalog-sidebar">
            <button
              className={`asset-cat-btn ${!selectedCategory ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(null);
                loadPacks();
                setSelectedPack(null);
              }}
            >
              All Packs
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`asset-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.label}
                <span className="asset-cat-count">{cat.totalSprites}</span>
              </button>
            ))}
          </div>

          {/* Main content area */}
          <div className="asset-catalog-content">
            {isLoading && <div className="asset-catalog-loading">Loading...</div>}

            {/* Search results */}
            {isSearching && !isLoading && (
              <div className="asset-search-results">
                <h3>Search results for "{searchQuery}"</h3>
                {searchResults.length === 0 && (
                  <p className="asset-no-results">No sprites found. Try another search.</p>
                )}
                {searchResults.map((result) => (
                  <div key={result.packId} className="asset-search-group">
                    <h4>
                      {result.packLabel}
                      <button className="asset-view-pack-btn" onClick={() => handlePackClick(result.packId)}>
                        View All
                      </button>
                    </h4>
                    <div className="asset-sprite-grid">
                      {result.sprites.map((url) => (
                        <button
                          key={url}
                          className={`asset-sprite-thumb ${selectedSprites.has(url) ? 'selected' : ''}`}
                          onClick={() => toggleSpriteSelection(url)}
                          title={url.split('/').pop()}
                        >
                          <img src={url} alt={url.split('/').pop()} loading="lazy" />
                          {selectedSprites.has(url) && <span className="sprite-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pack detail view */}
            {!isSearching && selectedPack && !isLoading && (
              <div className="asset-pack-detail">
                <button className="asset-back-btn" onClick={handleBackToPacks}>
                  ← Back to packs
                </button>
                <h3>
                  {selectedPack.label} <span className="asset-pack-count">{selectedPack.spriteCount} sprites</span>
                </h3>
                <div className="asset-sprite-grid">
                  {selectedPack.sprites.map((sprite) => (
                    <button
                      key={sprite.url}
                      className={`asset-sprite-thumb ${selectedSprites.has(sprite.url) ? 'selected' : ''}`}
                      onClick={() => toggleSpriteSelection(sprite.url)}
                      title={sprite.filename}
                    >
                      <img src={sprite.url} alt={sprite.filename} loading="lazy" />
                      {selectedSprites.has(sprite.url) && <span className="sprite-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pack grid view */}
            {!isSearching && !selectedPack && !isLoading && (
              <div className="asset-pack-grid">
                {packs.map((pack) => (
                  <button key={pack.id} className="asset-pack-card" onClick={() => handlePackClick(pack.id)}>
                    <div className="asset-pack-previews">
                      {pack.previewSprites.slice(0, 4).map((url) => (
                        <img key={url} src={url} alt="" loading="lazy" className="asset-pack-preview-img" />
                      ))}
                    </div>
                    <div className="asset-pack-info">
                      <span className="asset-pack-name">{pack.label}</span>
                      <span className="asset-pack-sprite-count">{pack.spriteCount} sprites</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selection bar */}
        {selectedSprites.size > 0 && (
          <div className="asset-catalog-selection-bar">
            <span>
              {selectedSprites.size} sprite{selectedSprites.size === 1 ? '' : 's'} selected
            </span>
            <button className="asset-use-btn" onClick={handleUseSelected}>
              Use Selected
            </button>
            <button className="asset-clear-btn" onClick={() => setSelectedSprites(new Set())}>
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
