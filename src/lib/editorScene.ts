import type {
  EditorCommand,
  EditorObject,
  EditorObjectType,
  EditorScene,
  GameplaySettings,
  StudioAsset,
} from '../types';

const DEFAULT_VIEWPORT_WIDTH = 1280;
const DEFAULT_VIEWPORT_HEIGHT = 720;

export const DEFAULT_EDITOR_LAYERS = [
  {
    id: 'background',
    name: 'Background',
    kind: 'background',
    visible: true,
    locked: false,
    opacity: 1,
    parallax: 0.6,
    zIndex: 0,
  },
  {
    id: 'gameplay',
    name: 'Gameplay',
    kind: 'gameplay',
    visible: true,
    locked: false,
    opacity: 1,
    parallax: 1,
    zIndex: 1,
  },
  {
    id: 'foreground',
    name: 'Foreground',
    kind: 'foreground',
    visible: true,
    locked: false,
    opacity: 1,
    parallax: 1.1,
    zIndex: 2,
  },
  { id: 'ui', name: 'UI', kind: 'ui', visible: true, locked: false, opacity: 1, parallax: 0, zIndex: 3 },
] as const;

export function createDefaultGameplaySettings(): GameplaySettings {
  return {
    playerSpeed: 220,
    jumpPower: 420,
    gravity: 900,
    enemyCount: 3,
    timerSeconds: 60,
    scoreGoal: 100,
    spawnRate: 1,
    difficulty: 'medium',
    notes: '',
  };
}

export function createDefaultEditorScene(): EditorScene {
  return {
    viewportWidth: DEFAULT_VIEWPORT_WIDTH,
    viewportHeight: DEFAULT_VIEWPORT_HEIGHT,
    gridSize: 32,
    gridEnabled: false,
    snapEnabled: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    layers: DEFAULT_EDITOR_LAYERS.map((layer) => ({ ...layer })),
    objects: [],
    gameplay: createDefaultGameplaySettings(),
    selection: {
      activeObjectId: null,
      objectIds: [],
      layerId: 'gameplay',
    },
  };
}

export function cloneEditorScene(scene: EditorScene | null | undefined): EditorScene {
  return JSON.parse(JSON.stringify(normalizeEditorScene(scene)));
}

export function normalizeEditorScene(scene: EditorScene | null | undefined): EditorScene {
  const base = createDefaultEditorScene();
  if (!scene) return base;

  const layers = Array.isArray(scene.layers) && scene.layers.length > 0 ? scene.layers : base.layers;
  const objects = Array.isArray(scene.objects)
    ? scene.objects.map((object, index) => ({
        ...object,
        id: object.id || `object_${index + 1}`,
        type: (object.type || 'sprite') as EditorObjectType,
        name: object.name || `Object ${index + 1}`,
        layerId: object.layerId || 'gameplay',
        x: Number.isFinite(object.x) ? object.x : 0,
        y: Number.isFinite(object.y) ? object.y : 0,
        width: Number.isFinite(object.width) ? object.width : 96,
        height: Number.isFinite(object.height) ? object.height : 96,
        rotation: Number.isFinite(object.rotation) ? object.rotation : 0,
        scaleX: Number.isFinite(object.scaleX) ? object.scaleX : 1,
        scaleY: Number.isFinite(object.scaleY) ? object.scaleY : 1,
        opacity: Number.isFinite(object.opacity) ? object.opacity : 1,
        zIndex: Number.isFinite(object.zIndex) ? object.zIndex : index,
        locked: Boolean(object.locked),
        hidden: Boolean(object.hidden),
      }))
    : [];

  return {
    viewportWidth: Number.isFinite(scene.viewportWidth) ? scene.viewportWidth : base.viewportWidth,
    viewportHeight: Number.isFinite(scene.viewportHeight) ? scene.viewportHeight : base.viewportHeight,
    gridSize: Number.isFinite(scene.gridSize) ? scene.gridSize : base.gridSize,
    gridEnabled: scene.gridEnabled ?? base.gridEnabled,
    snapEnabled: scene.snapEnabled ?? base.snapEnabled,
    zoom: Number.isFinite(scene.zoom) ? scene.zoom : base.zoom,
    panX: Number.isFinite(scene.panX) ? scene.panX : base.panX,
    panY: Number.isFinite(scene.panY) ? scene.panY : base.panY,
    layers: layers.map((layer, index) => ({
      ...base.layers[index % base.layers.length],
      ...layer,
      id: layer.id || base.layers[index % base.layers.length].id,
    })),
    objects,
    gameplay: {
      ...base.gameplay,
      ...(scene.gameplay || {}),
    },
    selection: {
      ...base.selection,
      ...(scene.selection || {}),
      objectIds: Array.isArray(scene.selection?.objectIds)
        ? scene.selection.objectIds.filter((value): value is string => typeof value === 'string')
        : [],
    },
  };
}

function nextObjectId(scene: EditorScene) {
  return `editor_${Date.now().toString(36)}_${scene.objects.length + 1}`;
}

function clampDimension(value: number) {
  return Math.max(8, Number.isFinite(value) ? value : 8);
}

function snapValue(value: number, gridSize: number, snapEnabled: boolean) {
  if (!snapEnabled || !gridSize) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function createObjectFromAsset(asset: StudioAsset, layerId = 'gameplay'): EditorObject {
  const size = clampDimension(asset.width || asset.height || 96);
  return {
    id: `asset_${asset.id.replace(/[^a-z0-9]+/gi, '_')}_${Date.now().toString(36)}`,
    type: 'sprite',
    name: asset.label,
    layerId,
    assetId: asset.id,
    assetPath: asset.path,
    x: 160,
    y: 160,
    width: asset.width || size,
    height: asset.height || size,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    zIndex: Date.now(),
    locked: false,
    hidden: false,
  };
}

export function applyEditorCommand(sceneInput: EditorScene, command: EditorCommand): EditorScene {
  const scene = cloneEditorScene(sceneInput);
  const activeId = command.targetId || scene.selection.activeObjectId || scene.selection.objectIds[0] || null;
  const objectIndex = activeId ? scene.objects.findIndex((object) => object.id === activeId) : -1;
  const object = objectIndex >= 0 ? scene.objects[objectIndex] : null;

  switch (command.type) {
    case 'select-object':
      scene.selection = {
        ...scene.selection,
        activeObjectId: command.targetId || null,
        objectIds: command.targetIds || (command.targetId ? [command.targetId] : []),
      };
      return scene;
    case 'add-object': {
      if (!command.object) return scene;
      const layerId = command.object.layerId || scene.selection.layerId || 'gameplay';
      const createdObject: EditorObject = {
        id: nextObjectId(scene),
        type: command.object.type,
        name: command.object.name,
        layerId,
        assetId: command.object.assetId || null,
        assetPath: command.object.assetPath || null,
        text: command.object.text,
        fontSize: command.object.fontSize,
        color: command.object.color,
        x: snapValue(command.object.x ?? 96, scene.gridSize, scene.snapEnabled),
        y: snapValue(command.object.y ?? 96, scene.gridSize, scene.snapEnabled),
        width: clampDimension(command.object.width ?? 96),
        height: clampDimension(command.object.height ?? 96),
        rotation: command.object.rotation ?? 0,
        scaleX: command.object.scaleX ?? 1,
        scaleY: command.object.scaleY ?? 1,
        opacity: command.object.opacity ?? 1,
        zIndex: command.object.zIndex ?? scene.objects.length,
        locked: Boolean(command.object.locked),
        hidden: Boolean(command.object.hidden),
        behavior: command.object.behavior,
      };
      scene.objects.push(createdObject);
      scene.selection = {
        ...scene.selection,
        activeObjectId: createdObject.id,
        objectIds: [createdObject.id],
        layerId,
      };
      return scene;
    }
    case 'update-object':
      if (!object || !command.patch) return scene;
      scene.objects[objectIndex] = { ...object, ...command.patch };
      return scene;
    case 'move-object':
      if (!object) return scene;
      scene.objects[objectIndex] = {
        ...object,
        x: snapValue(object.x + (command.delta?.x || 0), scene.gridSize, scene.snapEnabled),
        y: snapValue(object.y + (command.delta?.y || 0), scene.gridSize, scene.snapEnabled),
      };
      return scene;
    case 'rotate-object':
      if (!object) return scene;
      scene.objects[objectIndex] = {
        ...object,
        rotation: command.rotation ?? object.rotation,
      };
      return scene;
    case 'resize-object':
      if (!object) return scene;
      scene.objects[objectIndex] = {
        ...object,
        width: clampDimension(command.size?.width ?? object.width),
        height: clampDimension(command.size?.height ?? object.height),
        scaleX: command.size?.scaleX ?? object.scaleX,
        scaleY: command.size?.scaleY ?? object.scaleY,
      };
      return scene;
    case 'duplicate-object': {
      if (!object) return scene;
      const duplicate = {
        ...object,
        id: nextObjectId(scene),
        name: `${object.name} Copy`,
        x: object.x + scene.gridSize,
        y: object.y + scene.gridSize,
        zIndex: object.zIndex + 1,
      };
      scene.objects.push(duplicate);
      scene.selection = {
        ...scene.selection,
        activeObjectId: duplicate.id,
        objectIds: [duplicate.id],
      };
      return scene;
    }
    case 'delete-object':
      if (!activeId) return scene;
      scene.objects = scene.objects.filter((entry) => entry.id !== activeId);
      scene.selection = {
        ...scene.selection,
        activeObjectId: null,
        objectIds: [],
      };
      return scene;
    case 'reorder-object':
      if (!object || !command.direction) return scene;
      scene.objects[objectIndex] = {
        ...object,
        zIndex:
          command.direction === 'front'
            ? scene.objects.length + 10
            : command.direction === 'back'
              ? -10
              : object.zIndex + (command.direction === 'forward' ? 1 : -1),
      };
      return scene;
    case 'toggle-lock-object':
      if (!object) return scene;
      scene.objects[objectIndex] = { ...object, locked: !object.locked };
      return scene;
    case 'toggle-hide-object':
      if (!object) return scene;
      scene.objects[objectIndex] = { ...object, hidden: !object.hidden };
      return scene;
    case 'set-text-object':
      if (!object) return scene;
      scene.objects[objectIndex] = { ...object, text: command.text ?? object.text };
      return scene;
    case 'set-gameplay-setting':
      scene.gameplay = {
        ...scene.gameplay,
        ...(command.gameplayPatch || {}),
      };
      return scene;
    default:
      return scene;
  }
}

function normalizeAssetMatchValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(a|an|the|to|into|this|that|it)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatchingAsset(request: string, availableAssets: StudioAsset[]) {
  const normalizedRequest = normalizeAssetMatchValue(request);
  if (!normalizedRequest) return null;

  return (
    availableAssets.find((asset) => normalizeAssetMatchValue(asset.label) === normalizedRequest) ||
    availableAssets.find((asset) => normalizeAssetMatchValue(asset.label).includes(normalizedRequest)) ||
    availableAssets.find((asset) => normalizedRequest.includes(normalizeAssetMatchValue(asset.label))) ||
    null
  );
}

export function parseEditorAssistantCommand(
  request: string,
  scene: EditorScene,
  availableAssets: StudioAsset[] = [],
): EditorCommand | null {
  const text = String(request || '')
    .trim()
    .toLowerCase();
  const activeId = scene.selection.activeObjectId || scene.selection.objectIds[0] || null;
  if (!activeId) return null;
  const activeObject = scene.objects.find((entry) => entry.id === activeId) || null;
  if (!activeObject) return null;

  const rotationMatch = text.match(/rotate(?:\s+it|\s+this|\s+that|\s+the [a-z0-9 -]+)?\s+(-?\d+)(?:\s*degrees?)?/i);
  if (rotationMatch) {
    return { type: 'rotate-object', targetId: activeId, rotation: Number(rotationMatch[1]) };
  }

  if (/\b(turn|rotate)(?:\s+it|\s+this|\s+that)?\s+left\b/i.test(text)) {
    return { type: 'rotate-object', targetId: activeId, rotation: activeObject.rotation - 90 };
  }

  if (/\b(turn|rotate)(?:\s+it|\s+this|\s+that)?\s+right\b/i.test(text)) {
    return { type: 'rotate-object', targetId: activeId, rotation: activeObject.rotation + 90 };
  }

  if (/\b(turn|spin)(?:\s+it|\s+this|\s+that)?\b.*\b(around|backwards?)\b/i.test(text)) {
    return { type: 'rotate-object', targetId: activeId, rotation: activeObject.rotation + 180 };
  }

  const moveMatch = text.match(/\bmove\b.*?\b(left|right|up|down)\b(?:\s+by)?(?:\s+(\d+))?/i);
  if (moveMatch) {
    const amount = Number(moveMatch[2] || 40);
    const deltas = {
      left: { x: -amount, y: 0 },
      right: { x: amount, y: 0 },
      up: { x: 0, y: -amount },
      down: { x: 0, y: amount },
    } as const;
    return {
      type: 'move-object',
      targetId: activeId,
      delta: deltas[moveMatch[1].toLowerCase() as keyof typeof deltas],
    };
  }

  const resizePercentMatch = text.match(/\b(make|scale|resize)\b.*?\b(\d+)%\b/i);
  if (resizePercentMatch) {
    const multiplier = Number(resizePercentMatch[2]) / 100;
    const object = scene.objects.find((entry) => entry.id === activeId);
    if (!object) return null;
    return {
      type: 'resize-object',
      targetId: activeId,
      size: {
        width: object.width * multiplier,
        height: object.height * multiplier,
      },
    };
  }

  if (/\b(make|grow|scale)\b.*\b(bigger|larger|big)\b/i.test(text)) {
    return {
      type: 'resize-object',
      targetId: activeId,
      size: {
        width: activeObject.width * 1.25,
        height: activeObject.height * 1.25,
      },
    };
  }

  if (/\b(make|scale)\b.*\b(smaller|tiny|small)\b/i.test(text)) {
    return {
      type: 'resize-object',
      targetId: activeId,
      size: {
        width: activeObject.width * 0.8,
        height: activeObject.height * 0.8,
      },
    };
  }

  if (/\bduplicate\b|\bcopy\b/i.test(text)) {
    return { type: 'duplicate-object', targetId: activeId };
  }

  if (/\bdelete\b|\bremove\b/i.test(text)) {
    return { type: 'delete-object', targetId: activeId };
  }

  if (/\bhide\b/i.test(text)) {
    const object = scene.objects.find((entry) => entry.id === activeId);
    if (!object?.hidden) return { type: 'toggle-hide-object', targetId: activeId };
  }

  if (/\bshow\b/i.test(text)) {
    const object = scene.objects.find((entry) => entry.id === activeId);
    if (object?.hidden) return { type: 'toggle-hide-object', targetId: activeId };
  }

  if (/\block\b/i.test(text)) {
    const object = scene.objects.find((entry) => entry.id === activeId);
    if (!object?.locked) return { type: 'toggle-lock-object', targetId: activeId };
  }

  if (/\bunlock\b/i.test(text)) {
    const object = scene.objects.find((entry) => entry.id === activeId);
    if (object?.locked) return { type: 'toggle-lock-object', targetId: activeId };
  }

  if (/\bfront\b|\btop\b/i.test(text)) {
    return { type: 'reorder-object', targetId: activeId, direction: 'front' };
  }

  if (/\bback\b|\bbehind\b|\bbottom\b/i.test(text)) {
    return { type: 'reorder-object', targetId: activeId, direction: 'back' };
  }

  const swapMatch = text.match(/\b(?:swap|change|make)\b.*?\bto\b\s+(.+)$/i);
  if (swapMatch && activeObject.type === 'sprite' && availableAssets.length > 0) {
    const nextAsset = findMatchingAsset(swapMatch[1], availableAssets);
    if (nextAsset) {
      return {
        type: 'update-object',
        targetId: activeId,
        patch: {
          assetId: nextAsset.id,
          assetPath: nextAsset.path,
          name: nextAsset.label,
          width: nextAsset.width || activeObject.width,
          height: nextAsset.height || activeObject.height,
        },
      };
    }
  }

  const renameMatch = text.match(/\brename\b.*?\bto\b\s+["']?([^"']+)["']?$/i);
  if (renameMatch) {
    return { type: 'update-object', targetId: activeId, patch: { name: renameMatch[1].trim() } };
  }

  const textMatch = text.match(/\bchange text\b.*?\bto\b\s+["']?([^"']+)["']?$/i);
  if (textMatch) {
    return { type: 'set-text-object', targetId: activeId, text: textMatch[1].trim() };
  }

  return null;
}
