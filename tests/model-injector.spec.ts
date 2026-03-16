import { expect, test } from '@playwright/test';
import { injectModels } from '../server/services/modelInjector.js';
import { resolveEngineProfile } from '../server/services/engineRegistry.js';

test.describe('3D model injector', () => {
  test('repairs non-canonical platformer model paths for obby games', async () => {
    const engineProfile = resolveEngineProfile({
      prompt: 'make a 3d obby with jumps and checkpoints',
      genre: 'obby',
      gameConfig: { dimension: '3d' },
      currentCode: null,
    });

    const code = `
      const loader = new THREE.GLTFLoader();
      loader.load('/assets/models/kenney-platformerkit/character.glb', (gltf) => {
        player = gltf.scene;
        scene.add(player);
      });
      loader.load('/assets/models/kenney-platformerkit/flag.glb', (gltf) => {
        finishFlag = gltf.scene;
        scene.add(finishFlag);
      });
    `;

    const repaired = await injectModels(code, engineProfile);

    expect(repaired).toContain('/assets/models/kenney-platformerkit/character-oobi.glb');
    expect(repaired).toContain('/assets/models/kenney-platformerkit/flag.glb');
  });

  test('repairs castle-model naming for exploration starters', async () => {
    const engineProfile = resolveEngineProfile({
      prompt: 'make a 3d relic hunt in old castle ruins',
      genre: 'open-map-explorer',
      gameConfig: { dimension: '3d' },
      currentCode: null,
    });

    const code = `
      const loader = new THREE.GLTFLoader();
      loader.load('/assets/models/kenney-castlekit/towerSquare.glb', (gltf) => {
        const tower = gltf.scene;
        scene.add(tower);
      });
    `;

    const repaired = await injectModels(code, engineProfile);

    expect(repaired).toContain('/assets/models/kenney-castlekit/tower-square.glb');
    expect(repaired).not.toContain('/assets/models/kenney-castlekit/towerSquare.glb');
  });

  test('leaves valid 3d model paths unchanged', async () => {
    const engineProfile = resolveEngineProfile({
      prompt: 'make a stunt racer 3d game with ramps',
      genre: 'parking',
      gameConfig: { dimension: '3d' },
      currentCode: null,
    });

    const code = `
      const loader = new THREE.GLTFLoader();
      loader.load('/assets/models/kenney-carkit/sedan.glb', (gltf) => {
        playerCar = gltf.scene;
        scene.add(playerCar);
      });
    `;

    const repaired = await injectModels(code, engineProfile);

    expect(repaired).toBe(code);
  });
});
