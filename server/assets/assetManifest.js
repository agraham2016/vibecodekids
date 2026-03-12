/**
 * Asset Manifest
 * Maps game genres to available Kenney sprite and 3D model assets.
 * The reference resolver injects the relevant subset into the AI prompt.
 */

import { SPRITE_ASSET_MAX_CHARS } from '../config/index.js';

export const ASSET_MANIFEST = {
  platformer: {
    sprites: [
      { key: 'player', path: '/assets/sprites/kenney-platformer/character_green_idle.png', w: 32, h: 32 },
      { key: 'playerJump', path: '/assets/sprites/kenney-platformer/character_green_jump.png', w: 32, h: 32 },
      { key: 'playerWalkA', path: '/assets/sprites/kenney-platformer/character_green_walk_a.png', w: 32, h: 32 },
      { key: 'playerWalkB', path: '/assets/sprites/kenney-platformer/character_green_walk_b.png', w: 32, h: 32 },
      { key: 'ground', path: '/assets/sprites/kenney-platformer/terrain_grass_block.png', w: 32, h: 32 },
      { key: 'platform', path: '/assets/sprites/kenney-platformer/block_plank.png', w: 32, h: 32 },
      { key: 'coin', path: '/assets/sprites/kenney-platformer/coin_gold.png', w: 32, h: 32 },
      { key: 'enemy', path: '/assets/sprites/kenney-platformer/slime_normal_rest.png', w: 32, h: 32 },
      { key: 'bgSky', path: '/assets/sprites/kenney-platformer/background_solid_sky.png', w: 128, h: 128 },
      { key: 'bgHills', path: '/assets/sprites/kenney-platformer/background_color_hills.png', w: 128, h: 128 },
    ],
    sounds: [],
  },
  'endless-runner': {
    sprites: [
      { key: 'player', path: '/assets/sprites/kenney-platformer/character_green_idle.png', w: 32, h: 32 },
      { key: 'playerJump', path: '/assets/sprites/kenney-platformer/character_green_jump.png', w: 32, h: 32 },
      { key: 'ground', path: '/assets/sprites/kenney-platformer/terrain_grass_block.png', w: 32, h: 32 },
      { key: 'obstacle', path: '/assets/sprites/kenney-platformer/slime_normal_rest.png', w: 32, h: 32 },
      { key: 'coin', path: '/assets/sprites/kenney-platformer/coin_gold.png', w: 32, h: 32 },
      { key: 'bgSky', path: '/assets/sprites/kenney-platformer/background_solid_sky.png', w: 128, h: 128 },
    ],
    sounds: [],
  },
  racing: {
    sprites: [
      {
        key: 'car-player',
        path: '/assets/sprites/kenney-racing/Cars/car_blue_1.png',
        w: 48,
        h: 80,
        note: 'top-down blue car',
      },
      {
        key: 'car-obstacle',
        path: '/assets/sprites/kenney-racing/Cars/car_red_1.png',
        w: 48,
        h: 80,
        note: 'top-down red car',
      },
      { key: 'car-green', path: '/assets/sprites/kenney-racing/Cars/car_green_1.png', w: 48, h: 80 },
      { key: 'car-yellow', path: '/assets/sprites/kenney-racing/Cars/car_yellow_1.png', w: 48, h: 80 },
      { key: 'oil', path: '/assets/sprites/kenney-racing/Objects/oil.png', w: 32, h: 32 },
      { key: 'cone', path: '/assets/sprites/kenney-racing/Objects/cone_straight.png', w: 16, h: 24 },
      { key: 'barrier', path: '/assets/sprites/kenney-racing/Objects/barrier_red.png', w: 48, h: 16 },
      { key: 'tires', path: '/assets/sprites/kenney-racing/Objects/tires_red.png', w: 32, h: 32 },
    ],
    sounds: [],
  },
  shooter: {
    sprites: [
      {
        key: 'ship',
        path: '/assets/sprites/kenney-space-shooter/playerShip1_blue.png',
        w: 64,
        h: 64,
        note: 'player spaceship',
      },
      { key: 'enemy1', path: '/assets/sprites/kenney-space-shooter/Enemies/enemyRed1.png', w: 48, h: 48 },
      { key: 'enemy2', path: '/assets/sprites/kenney-space-shooter/Enemies/enemyBlack2.png', w: 48, h: 48 },
      { key: 'enemy3', path: '/assets/sprites/kenney-space-shooter/Enemies/enemyGreen3.png', w: 48, h: 48 },
      { key: 'ufo', path: '/assets/sprites/kenney-space-shooter/ufoRed.png', w: 48, h: 48 },
      { key: 'laser', path: '/assets/sprites/kenney-space-shooter/Lasers/laserBlue01.png', w: 8, h: 32 },
      { key: 'laserEnemy', path: '/assets/sprites/kenney-space-shooter/Lasers/laserRed01.png', w: 8, h: 32 },
      { key: 'meteor', path: '/assets/sprites/kenney-space-shooter/Meteors/meteorBrown_big1.png', w: 64, h: 64 },
      { key: 'meteorSmall', path: '/assets/sprites/kenney-space-shooter/Meteors/meteorBrown_small1.png', w: 24, h: 24 },
      { key: 'powerup', path: '/assets/sprites/kenney-space-shooter/Power-ups/powerupBlue_shield.png', w: 24, h: 24 },
      { key: 'star', path: '/assets/sprites/kenney-space-shooter/Effects/star1.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  'top-down-shooter': {
    sprites: [
      { key: 'ship', path: '/assets/sprites/kenney-space-shooter/playerShip2_green.png', w: 64, h: 64 },
      { key: 'enemy', path: '/assets/sprites/kenney-space-shooter/Enemies/enemyRed3.png', w: 48, h: 48 },
      { key: 'bullet', path: '/assets/sprites/kenney-space-shooter/Lasers/laserGreen01.png', w: 8, h: 32 },
      { key: 'bulletEnemy', path: '/assets/sprites/kenney-space-shooter/Lasers/laserRed01.png', w: 8, h: 32 },
      { key: 'meteor', path: '/assets/sprites/kenney-space-shooter/Meteors/meteorGrey_big1.png', w: 64, h: 64 },
      { key: 'powerup', path: '/assets/sprites/kenney-space-shooter/Power-ups/powerupGreen_bolt.png', w: 24, h: 24 },
    ],
    sounds: [],
  },
  frogger: {
    sprites: [
      { key: 'frog', path: '/assets/sprites/kenney-animals/Round/frog.png', w: 64, h: 64, note: 'round cartoon frog' },
      { key: 'car0', path: '/assets/sprites/kenney-racing/Cars/car_red_small_1.png', w: 32, h: 48 },
      { key: 'car1', path: '/assets/sprites/kenney-racing/Cars/car_blue_small_3.png', w: 32, h: 48 },
      { key: 'car2', path: '/assets/sprites/kenney-racing/Cars/car_green_1.png', w: 32, h: 48 },
      { key: 'truck', path: '/assets/sprites/kenney-racing/Cars/car_yellow_1.png', w: 32, h: 48 },
      { key: 'log', path: '/assets/sprites/frogger/log.png', w: 96, h: 32 },
    ],
    sounds: [],
  },
  puzzle: {
    sprites: [
      {
        key: 'gem0',
        path: '/assets/sprites/kenney-puzzle/element_blue_diamond_glossy.png',
        w: 48,
        h: 48,
        note: 'blue gem',
      },
      {
        key: 'gem1',
        path: '/assets/sprites/kenney-puzzle/element_red_diamond_glossy.png',
        w: 48,
        h: 48,
        note: 'red gem',
      },
      {
        key: 'gem2',
        path: '/assets/sprites/kenney-puzzle/element_green_diamond_glossy.png',
        w: 48,
        h: 48,
        note: 'green gem',
      },
      {
        key: 'gem3',
        path: '/assets/sprites/kenney-puzzle/element_purple_diamond_glossy.png',
        w: 48,
        h: 48,
        note: 'purple gem',
      },
      {
        key: 'gem4',
        path: '/assets/sprites/kenney-puzzle/element_yellow_diamond_glossy.png',
        w: 48,
        h: 48,
        note: 'yellow gem',
      },
    ],
    sounds: [],
  },
  rpg: {
    sprites: [
      {
        key: 'hero',
        path: '/assets/sprites/kenney-tiny-dungeon/tile_0096.png',
        w: 16,
        h: 16,
        note: 'knight character',
      },
      { key: 'npc', path: '/assets/sprites/kenney-tiny-dungeon/tile_0097.png', w: 16, h: 16, note: 'townsperson' },
      {
        key: 'skeleton',
        path: '/assets/sprites/kenney-tiny-dungeon/tile_0110.png',
        w: 16,
        h: 16,
        note: 'skeleton enemy',
      },
      { key: 'slime', path: '/assets/sprites/kenney-tiny-dungeon/tile_0111.png', w: 16, h: 16, note: 'slime enemy' },
      {
        key: 'wallStone',
        path: '/assets/sprites/kenney-tiny-dungeon/tile_0001.png',
        w: 16,
        h: 16,
        note: 'stone wall tile',
      },
      {
        key: 'floorWood',
        path: '/assets/sprites/kenney-tiny-dungeon/tile_0000.png',
        w: 16,
        h: 16,
        note: 'wood floor tile',
      },
      { key: 'chest', path: '/assets/sprites/kenney-tiny-dungeon/tile_0089.png', w: 16, h: 16, note: 'treasure chest' },
      { key: 'heart', path: '/assets/sprites/common/heart.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  flappy: {
    sprites: [
      {
        key: 'bird',
        path: '/assets/sprites/kenney-animals/Round/parrot.png',
        w: 64,
        h: 64,
        note: 'round cartoon parrot',
      },
      { key: 'pipe', path: '/assets/sprites/flappy/pipe.png', w: 52, h: 320 },
    ],
    sounds: [],
  },
  snake: {
    sprites: [
      { key: 'snakeHead', path: '/assets/sprites/kenney-animals/Round/snake.png', w: 64, h: 64 },
      { key: 'apple', path: '/assets/sprites/kenney-food/tile_0000.png', w: 64, h: 64, note: 'food pickup' },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  'treasure-diver': {
    sprites: [
      { key: 'diver', path: '/assets/sprites/kenney-fish/fish_blue.png', w: 48, h: 32, note: 'player fish' },
      { key: 'fish1', path: '/assets/sprites/kenney-fish/fish_orange.png', w: 48, h: 32 },
      { key: 'fish2', path: '/assets/sprites/kenney-fish/fish_green.png', w: 48, h: 32 },
      { key: 'fish3', path: '/assets/sprites/kenney-fish/fish_red.png', w: 48, h: 32 },
      { key: 'seaweedA', path: '/assets/sprites/kenney-fish/seaweed_green_a.png', w: 32, h: 64 },
      { key: 'seaweedB', path: '/assets/sprites/kenney-fish/seaweed_pink_a.png', w: 32, h: 64 },
      { key: 'rockA', path: '/assets/sprites/kenney-fish/rock_a.png', w: 48, h: 48 },
      { key: 'bubble', path: '/assets/sprites/kenney-fish/bubble_a.png', w: 16, h: 16 },
      { key: 'terrain', path: '/assets/sprites/kenney-fish/background_terrain.png', w: 128, h: 32 },
    ],
    sounds: [],
  },
  fishing: {
    sprites: [
      { key: 'player', path: '/assets/sprites/kenney-fish/fish_blue.png', w: 48, h: 32 },
      { key: 'fish1', path: '/assets/sprites/kenney-fish/fish_orange.png', w: 48, h: 32 },
      { key: 'fish2', path: '/assets/sprites/kenney-fish/fish_green.png', w: 48, h: 32 },
      { key: 'fish3', path: '/assets/sprites/kenney-fish/fish_pink.png', w: 48, h: 32 },
      { key: 'seaweed', path: '/assets/sprites/kenney-fish/seaweed_green_b.png', w: 32, h: 64 },
      { key: 'rock', path: '/assets/sprites/kenney-fish/rock_b.png', w: 48, h: 48 },
      { key: 'bubble', path: '/assets/sprites/kenney-fish/bubble_b.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  'fruit-slice': {
    sprites: [
      { key: 'fruit0', path: '/assets/sprites/kenney-food/tile_0000.png', w: 64, h: 64, note: 'apple' },
      { key: 'fruit1', path: '/assets/sprites/kenney-food/tile_0001.png', w: 64, h: 64, note: 'pear' },
      { key: 'fruit2', path: '/assets/sprites/kenney-food/tile_0002.png', w: 64, h: 64, note: 'orange' },
      { key: 'fruit3', path: '/assets/sprites/kenney-food/tile_0003.png', w: 64, h: 64, note: 'lemon' },
      { key: 'fruit4', path: '/assets/sprites/kenney-food/tile_0004.png', w: 64, h: 64, note: 'banana' },
      { key: 'fruit5', path: '/assets/sprites/kenney-food/tile_0005.png', w: 64, h: 64, note: 'strawberry' },
      { key: 'bomb', path: '/assets/sprites/kenney-food/tile_0010.png', w: 64, h: 64, note: 'avoid item' },
    ],
    sounds: [],
  },
  'find-the-friend': {
    sprites: [
      { key: 'animal0', path: '/assets/sprites/kenney-animals/Round/bear.png', w: 64, h: 64, note: 'bear' },
      { key: 'animal1', path: '/assets/sprites/kenney-animals/Round/dog.png', w: 64, h: 64, note: 'dog' },
      { key: 'animal2', path: '/assets/sprites/kenney-animals/Round/elephant.png', w: 64, h: 64, note: 'elephant' },
      { key: 'animal3', path: '/assets/sprites/kenney-animals/Round/penguin.png', w: 64, h: 64, note: 'penguin' },
      { key: 'animal4', path: '/assets/sprites/kenney-animals/Round/panda.png', w: 64, h: 64, note: 'panda' },
      { key: 'animal5', path: '/assets/sprites/kenney-animals/Round/owl.png', w: 64, h: 64, note: 'owl' },
      { key: 'animal6', path: '/assets/sprites/kenney-animals/Round/monkey.png', w: 64, h: 64, note: 'monkey' },
      { key: 'animal7', path: '/assets/sprites/kenney-animals/Round/rabbit.png', w: 64, h: 64, note: 'rabbit' },
    ],
    sounds: [],
  },
  clicker: {
    sprites: [
      {
        key: 'gem',
        path: '/assets/sprites/kenney-puzzle/element_blue_diamond_glossy.png',
        w: 48,
        h: 48,
        note: 'clickable gem',
      },
      { key: 'sparkle', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
      { key: 'particle', path: '/assets/sprites/common/particle.png', w: 8, h: 8 },
    ],
    sounds: [],
  },
  'tower-defense': {
    sprites: [
      {
        key: 'towerBase',
        path: '/assets/sprites/kenney-tower-defense/towerDefense_tile180.png',
        w: 64,
        h: 64,
        note: 'tower base',
      },
      {
        key: 'towerGun',
        path: '/assets/sprites/kenney-tower-defense/towerDefense_tile249.png',
        w: 64,
        h: 64,
        note: 'tower weapon',
      },
      {
        key: 'enemy',
        path: '/assets/sprites/kenney-tower-defense/towerDefense_tile245.png',
        w: 64,
        h: 64,
        note: 'enemy creep',
      },
      {
        key: 'pathTile',
        path: '/assets/sprites/kenney-tower-defense/towerDefense_tile024.png',
        w: 64,
        h: 64,
        note: 'path dirt',
      },
      {
        key: 'grassTile',
        path: '/assets/sprites/kenney-tower-defense/towerDefense_tile001.png',
        w: 64,
        h: 64,
        note: 'grass tile',
      },
    ],
    sounds: [],
  },
  fighting: {
    sprites: [
      {
        key: 'fighter',
        path: '/assets/sprites/kenney-sports/Blue/characterBlue (1).png',
        w: 64,
        h: 64,
        note: 'blue fighter',
      },
      {
        key: 'enemy',
        path: '/assets/sprites/kenney-sports/Red/characterRed (1).png',
        w: 64,
        h: 64,
        note: 'red opponent',
      },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  sports: {
    sprites: [
      { key: 'player', path: '/assets/sprites/kenney-sports/Blue/characterBlue (1).png', w: 64, h: 64 },
      { key: 'opponent', path: '/assets/sprites/kenney-sports/Red/characterRed (1).png', w: 64, h: 64 },
      { key: 'ball', path: '/assets/sprites/kenney-sports/Elements/element (1).png', w: 32, h: 32 },
    ],
    sounds: [],
  },
  'brick-breaker': {
    sprites: [
      { key: 'paddle', path: '/assets/sprites/brick-breaker/paddle.png', w: 80, h: 16 },
      { key: 'ball', path: '/assets/sprites/kenney-puzzle/ballBlue.png', w: 16, h: 16 },
      { key: 'brickBlue', path: '/assets/sprites/kenney-puzzle/element_blue_rectangle_glossy.png', w: 48, h: 24 },
      { key: 'brickRed', path: '/assets/sprites/kenney-puzzle/element_red_rectangle_glossy.png', w: 48, h: 24 },
      { key: 'brickGreen', path: '/assets/sprites/kenney-puzzle/element_green_rectangle_glossy.png', w: 48, h: 24 },
      { key: 'brickPurple', path: '/assets/sprites/kenney-puzzle/element_purple_rectangle_glossy.png', w: 48, h: 24 },
      { key: 'brickYellow', path: '/assets/sprites/kenney-puzzle/element_yellow_rectangle_glossy.png', w: 48, h: 24 },
      { key: 'powerup', path: '/assets/sprites/brick-breaker/powerup.png', w: 24, h: 24 },
    ],
    sounds: [],
  },
  'bubble-shooter': {
    sprites: [
      { key: 'bubbleBlue', path: '/assets/sprites/kenney-puzzle/element_blue_square_glossy.png', w: 32, h: 32 },
      { key: 'bubbleRed', path: '/assets/sprites/kenney-puzzle/element_red_square_glossy.png', w: 32, h: 32 },
      { key: 'bubbleGreen', path: '/assets/sprites/kenney-puzzle/element_green_square_glossy.png', w: 32, h: 32 },
      { key: 'bubblePurple', path: '/assets/sprites/kenney-puzzle/element_purple_polygon_glossy.png', w: 32, h: 32 },
      { key: 'bubbleYellow', path: '/assets/sprites/kenney-puzzle/element_yellow_polygon_glossy.png', w: 32, h: 32 },
      { key: 'arrow', path: '/assets/sprites/bubble-shooter/arrow.png', w: 16, h: 64 },
    ],
    sounds: [],
  },
  'falling-blocks': {
    sprites: [
      { key: 'blockBlue', path: '/assets/sprites/kenney-puzzle/element_blue_square_glossy.png', w: 32, h: 32 },
      { key: 'blockRed', path: '/assets/sprites/kenney-puzzle/element_red_square_glossy.png', w: 32, h: 32 },
      { key: 'blockGreen', path: '/assets/sprites/kenney-puzzle/element_green_square_glossy.png', w: 32, h: 32 },
      { key: 'blockPurple', path: '/assets/sprites/kenney-puzzle/element_purple_cube_glossy.png', w: 32, h: 32 },
      { key: 'blockYellow', path: '/assets/sprites/kenney-puzzle/element_yellow_square_glossy.png', w: 32, h: 32 },
    ],
    sounds: [],
  },
  'pet-sim': {
    sprites: [
      { key: 'pet0', path: '/assets/sprites/kenney-animals/Round/dog.png', w: 64, h: 64, note: 'dog' },
      { key: 'pet1', path: '/assets/sprites/kenney-animals/Round/rabbit.png', w: 64, h: 64, note: 'rabbit' },
      { key: 'pet2', path: '/assets/sprites/kenney-animals/Round/chick.png', w: 64, h: 64, note: 'chick' },
      { key: 'pet3', path: '/assets/sprites/kenney-animals/Round/panda.png', w: 64, h: 64, note: 'panda' },
      { key: 'heart', path: '/assets/sprites/common/heart.png', w: 16, h: 16 },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  'trash-sorter': {
    sprites: [
      { key: 'item0', path: '/assets/sprites/kenney-food/tile_0020.png', w: 64, h: 64, note: 'trash item A' },
      { key: 'item1', path: '/assets/sprites/kenney-food/tile_0021.png', w: 64, h: 64, note: 'trash item B' },
      { key: 'item2', path: '/assets/sprites/kenney-food/tile_0022.png', w: 64, h: 64, note: 'trash item C' },
      { key: 'item3', path: '/assets/sprites/kenney-food/tile_0030.png', w: 64, h: 64, note: 'recycle item A' },
      { key: 'item4', path: '/assets/sprites/kenney-food/tile_0031.png', w: 64, h: 64, note: 'recycle item B' },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  'tower-stack': {
    sprites: [
      { key: 'blockBlue', path: '/assets/sprites/kenney-puzzle/element_blue_rectangle_glossy.png', w: 48, h: 24 },
      { key: 'blockRed', path: '/assets/sprites/kenney-puzzle/element_red_rectangle_glossy.png', w: 48, h: 24 },
      { key: 'blockGreen', path: '/assets/sprites/kenney-puzzle/element_green_rectangle_glossy.png', w: 48, h: 24 },
      { key: 'blockPurple', path: '/assets/sprites/kenney-puzzle/element_purple_rectangle_glossy.png', w: 48, h: 24 },
      { key: 'blockYellow', path: '/assets/sprites/kenney-puzzle/element_yellow_rectangle_glossy.png', w: 48, h: 24 },
    ],
    sounds: [],
  },
  catch: {
    sprites: [
      {
        key: 'basket',
        path: '/assets/sprites/catch/paddle.png',
        w: 80,
        h: 32,
        note: 'fallback — generate procedurally if needed',
      },
      { key: 'item0', path: '/assets/sprites/kenney-food/tile_0000.png', w: 64, h: 64 },
      { key: 'item1', path: '/assets/sprites/kenney-food/tile_0001.png', w: 64, h: 64 },
      { key: 'item2', path: '/assets/sprites/kenney-food/tile_0002.png', w: 64, h: 64 },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  memory: {
    sprites: [
      { key: 'card0', path: '/assets/sprites/kenney-animals/Round/bear.png', w: 64, h: 64 },
      { key: 'card1', path: '/assets/sprites/kenney-animals/Round/dog.png', w: 64, h: 64 },
      { key: 'card2', path: '/assets/sprites/kenney-animals/Round/elephant.png', w: 64, h: 64 },
      { key: 'card3', path: '/assets/sprites/kenney-animals/Round/penguin.png', w: 64, h: 64 },
      { key: 'card4', path: '/assets/sprites/kenney-animals/Round/panda.png', w: 64, h: 64 },
      { key: 'card5', path: '/assets/sprites/kenney-animals/Round/owl.png', w: 64, h: 64 },
    ],
    sounds: [],
  },
  pong: {
    sprites: [
      { key: 'ball', path: '/assets/sprites/kenney-puzzle/ballBlue.png', w: 16, h: 16, note: 'blue ball' },
      {
        key: 'paddleBlue',
        path: '/assets/sprites/kenney-puzzle/element_blue_rectangle_glossy.png',
        w: 48,
        h: 24,
        note: 'player paddle',
      },
      {
        key: 'paddleRed',
        path: '/assets/sprites/kenney-puzzle/element_red_rectangle_glossy.png',
        w: 48,
        h: 24,
        note: 'opponent paddle',
      },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  'whack-a-mole': {
    sprites: [
      { key: 'mole', path: '/assets/sprites/kenney-animals/Round/gorilla.png', w: 64, h: 64, note: 'mole target' },
      { key: 'mole2', path: '/assets/sprites/kenney-animals/Round/bear.png', w: 64, h: 64, note: 'alt target' },
      { key: 'mole3', path: '/assets/sprites/kenney-animals/Round/rabbit.png', w: 64, h: 64, note: 'bonus target' },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  maze: {
    sprites: [
      {
        key: 'player',
        path: '/assets/sprites/kenney-tiny-dungeon/tile_0096.png',
        w: 16,
        h: 16,
        note: 'knight character',
      },
      { key: 'wall', path: '/assets/sprites/kenney-tiny-dungeon/tile_0001.png', w: 16, h: 16, note: 'stone wall' },
      { key: 'floor', path: '/assets/sprites/kenney-tiny-dungeon/tile_0000.png', w: 16, h: 16, note: 'wood floor' },
      { key: 'dot', path: '/assets/sprites/kenney-platformer/coin_gold.png', w: 32, h: 32, note: 'collectible dot' },
      { key: 'enemy', path: '/assets/sprites/kenney-tiny-dungeon/tile_0111.png', w: 16, h: 16, note: 'slime enemy' },
    ],
    sounds: [],
  },
  'simon-says': {
    sprites: [
      {
        key: 'btnBlue',
        path: '/assets/sprites/kenney-puzzle/element_blue_square_glossy.png',
        w: 32,
        h: 32,
        note: 'blue button',
      },
      {
        key: 'btnRed',
        path: '/assets/sprites/kenney-puzzle/element_red_square_glossy.png',
        w: 32,
        h: 32,
        note: 'red button',
      },
      {
        key: 'btnGreen',
        path: '/assets/sprites/kenney-puzzle/element_green_square_glossy.png',
        w: 32,
        h: 32,
        note: 'green button',
      },
      {
        key: 'btnYellow',
        path: '/assets/sprites/kenney-puzzle/element_yellow_square_glossy.png',
        w: 32,
        h: 32,
        note: 'yellow button',
      },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  rhythm: {
    sprites: [
      {
        key: 'noteBlue',
        path: '/assets/sprites/kenney-puzzle/element_blue_diamond_glossy.png',
        w: 48,
        h: 48,
        note: 'blue note',
      },
      {
        key: 'noteRed',
        path: '/assets/sprites/kenney-puzzle/element_red_diamond_glossy.png',
        w: 48,
        h: 48,
        note: 'red note',
      },
      {
        key: 'noteGreen',
        path: '/assets/sprites/kenney-puzzle/element_green_diamond_glossy.png',
        w: 48,
        h: 48,
        note: 'green note',
      },
      {
        key: 'notePurple',
        path: '/assets/sprites/kenney-puzzle/element_purple_diamond_glossy.png',
        w: 48,
        h: 48,
        note: 'purple note',
      },
      { key: 'particle', path: '/assets/sprites/common/particle.png', w: 8, h: 8 },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
    ],
    sounds: [],
  },
  common: {
    sprites: [
      { key: 'heart', path: '/assets/sprites/common/heart.png', w: 16, h: 16 },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
      { key: 'particle', path: '/assets/sprites/common/particle.png', w: 8, h: 8 },
    ],
    sounds: [],
    soundPaths: {},
  },
};

/**
 * All available Kenney asset packs (for AI awareness of extra variety).
 * These are injected as additional context so the AI can reference more sprites
 * beyond the curated per-genre defaults above.
 */
export const EXTRA_PACKS = {
  'kenney-animals': {
    note: '30 round cartoon animals: bear, buffalo, chick, chicken, cow, crocodile, dog, duck, elephant, frog, giraffe, goat, gorilla, hippo, horse, monkey, moose, narwhal, owl, panda, parrot, penguin, pig, rabbit, rhino, sloth, snake, walrus, whale, zebra',
    basePath: '/assets/sprites/kenney-animals/Round/',
    example: "this.load.image('bear', '/assets/sprites/kenney-animals/Round/bear.png');",
  },
  'kenney-fish': {
    note: 'Underwater assets: fish_blue, fish_orange, fish_green, fish_red, fish_pink, fish_brown, fish_grey, seaweed, rocks, bubbles, terrain',
    basePath: '/assets/sprites/kenney-fish/',
    example: "this.load.image('fish', '/assets/sprites/kenney-fish/fish_blue.png');",
  },
  'kenney-food': {
    note: '112 food tiles (tile_0000 to tile_0111): fruits, vegetables, snacks, drinks — great for clicker, cooking, or catch games',
    basePath: '/assets/sprites/kenney-food/',
    example: "this.load.image('apple', '/assets/sprites/kenney-food/tile_0000.png');",
  },
  'kenney-racing': {
    note: 'Cars in 5 colors (black/blue/green/red/yellow) x 5 styles + small variants, motorcycles, road objects, road tiles',
    basePath: '/assets/sprites/kenney-racing/',
    example: "this.load.image('car', '/assets/sprites/kenney-racing/Cars/car_blue_1.png');",
  },
  'kenney-space-shooter': {
    note: 'Ships (3 styles x 4 colors), 20 enemies (5 styles x 4 colors), lasers, meteors, power-ups, fire effects, shields, stars',
    basePath: '/assets/sprites/kenney-space-shooter/',
    example: "this.load.image('ship', '/assets/sprites/kenney-space-shooter/playerShip1_blue.png');",
  },
  'kenney-puzzle': {
    note: 'Glossy gems in 6 colors (blue/green/grey/purple/red/yellow) x 4 shapes (diamond/polygon/rectangle/square), balls, buttons',
    basePath: '/assets/sprites/kenney-puzzle/',
    example: "this.load.image('gem', '/assets/sprites/kenney-puzzle/element_blue_diamond_glossy.png');",
  },
  'kenney-tiny-dungeon': {
    note: '132 16x16 RPG tiles (tile_0000-tile_0131): floors, walls, characters, monsters, items, treasure chests',
    basePath: '/assets/sprites/kenney-tiny-dungeon/',
    example: "this.load.image('hero', '/assets/sprites/kenney-tiny-dungeon/tile_0096.png');",
  },
  'kenney-tower-defense': {
    note: '300 tower defense tiles: towers, enemies, terrain, projectiles, UI elements',
    basePath: '/assets/sprites/kenney-tower-defense/',
    example: "this.load.image('tower', '/assets/sprites/kenney-tower-defense/towerDefense_tile180.png');",
  },
  'kenney-sports': {
    note: 'Animated sports characters (blue + red teams, 14 frames each), balls, field elements',
    basePath: '/assets/sprites/kenney-sports/',
    example: "this.load.image('player', '/assets/sprites/kenney-sports/Blue/characterBlue (1).png');",
  },
  'kenney-platformer': {
    note: 'Extended platformer pack: 8 character animations, 18 items, 48+ terrain tiles, backgrounds',
    basePath: '/assets/sprites/kenney-platformer/',
    example: "this.load.image('player', '/assets/sprites/kenney-platformer/character_green_idle.png');",
  },
};

/**
 * Format RAG search results into the same string shape as formatAssetsForPrompt.
 */
export function formatAssetsFromSearch(sprites, genre, maxChars = SPRITE_ASSET_MAX_CHARS) {
  if (!sprites || sprites.length === 0) return formatAssetsForPrompt(genre);

  const lines = ['═══════════════════════════════════════════════════════════════'];
  lines.push('⛔⛔⛔ SPRITE ASSETS — YOU MUST USE THESE (DO NOT use generateTexture instead!) ⛔⛔⛔');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('YOUR preload() MUST contain this.load.image() calls from these sprites.');
  lines.push('DO NOT use this.make.graphics() or generateTexture() for game objects.');
  lines.push('ALWAYS call .setDisplaySize(w, h) on sprites after creating them.');
  lines.push('ALWAYS include a this.load.on("loaderror") fallback handler in preload().');
  lines.push('');

  const roleOrder = ['player', 'enemy', 'collectible', 'background', 'other'];
  const byRole = {};
  for (const r of roleOrder) byRole[r] = [];
  for (const s of sprites) {
    const roles = s.roles || [];
    let placed = false;
    for (const r of ['player', 'enemy', 'collectible', 'background']) {
      if (roles.includes(r)) {
        byRole[r].push(s);
        placed = true;
        break;
      }
    }
    if (!placed) byRole.other.push(s);
  }

  for (const role of roleOrder) {
    const list = byRole[role];
    if (list.length === 0) continue;
    const label = role === 'other' ? 'Other sprites' : `${role} sprites`;
    lines.push(`${label}:`);
    list.forEach((s, i) => {
      const key = list.length === 1 ? role : `${role}${i + 1}`;
      let desc = `  this.load.image('${key}', '${s.path}');  // ${s.w}x${s.h}`;
      if (s.note) desc += ` — ${s.note}`;
      lines.push(desc);
    });
    lines.push('');
  }

  const result = lines.join('\n');
  return result.length > maxChars ? result.slice(0, maxChars) + '\n...(truncated)' : result;
}

/**
 * Format an asset list for injection into the AI prompt.
 */
export function formatAssetsForPrompt(genre) {
  const genreAssets = ASSET_MANIFEST[genre];
  const common = ASSET_MANIFEST.common;

  let lines = ['═══════════════════════════════════════════════════════════════'];
  lines.push('⛔⛔⛔ SPRITE ASSETS — YOU MUST USE THESE (DO NOT use generateTexture instead!) ⛔⛔⛔');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('YOUR preload() MUST contain this.load.image() calls from these sprites.');
  lines.push('DO NOT use this.make.graphics() or generateTexture() for game objects.');
  lines.push('ALWAYS call .setDisplaySize(w, h) on sprites after creating them.');
  lines.push('ALWAYS include a this.load.on("loaderror") fallback handler in preload().');
  lines.push('');

  if (genreAssets && genreAssets.sprites.length > 0) {
    lines.push(`⬇️⬇️⬇️ YOUR preload() MUST CONTAIN THESE EXACT LINES for ${genre}: ⬇️⬇️⬇️`);
    lines.push('```');
    lines.push('preload() {');
    for (const s of genreAssets.sprites) {
      let desc = `  this.load.image('${s.key}', '${s.path}');`;
      if (s.note) desc += `  // ${s.note}`;
      lines.push(desc);
    }
    lines.push('');
    lines.push('  // MANDATORY fallback handler');
    lines.push('  this.load.on("loaderror", (file) => {');
    lines.push('    const c = document.createElement("canvas"); c.width = 64; c.height = 64;');
    lines.push('    const ctx = c.getContext("2d");');
    lines.push('    ctx.fillStyle = "#d63384"; ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2); ctx.fill();');
    lines.push('    this.textures.addCanvas(file.key, c);');
    lines.push('  });');
    lines.push('}');
    lines.push('```');
    lines.push('');
    lines.push('Then in create(), use sprites like this:');
    const first = genreAssets.sprites[0];
    lines.push(`  this.physics.add.sprite(x, y, '${first.key}').setDisplaySize(${first.w}, ${first.h});`);
    lines.push('');
  }

  if (common && common.sprites.length > 0) {
    lines.push('Common sprites (available for all genres):');
    for (const s of common.sprites) {
      lines.push(`  this.load.image('${s.key}', '${s.path}');  // ${s.w}x${s.h}`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('GLOBAL SPRITE LIBRARY — CHECK HERE BEFORE USING CANVAS DRAWING!');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('If the kid asks for something NOT in the genre sprites above, CHECK these packs.');
  lines.push('These are REAL sprite files on the server. Using them is ALWAYS better than Canvas drawing.');
  lines.push('');

  lines.push('🐾 ANIMAL SPRITES — 30 round cartoon animals (64x64):');
  lines.push('   Path pattern: /assets/sprites/kenney-animals/Round/{name}.png');
  lines.push('   Available animals:');
  const animals = [
    'bear',
    'buffalo',
    'chick',
    'chicken',
    'cow',
    'crocodile',
    'dog',
    'duck',
    'elephant',
    'frog',
    'giraffe',
    'goat',
    'gorilla',
    'hippo',
    'horse',
    'monkey',
    'moose',
    'narwhal',
    'owl',
    'panda',
    'parrot',
    'penguin',
    'pig',
    'rabbit',
    'rhino',
    'sloth',
    'snake',
    'walrus',
    'whale',
    'zebra',
  ];
  for (const a of animals) {
    lines.push(`     this.load.image('${a}', '/assets/sprites/kenney-animals/Round/${a}.png');`);
  }
  lines.push('');

  for (const [pack, info] of Object.entries(EXTRA_PACKS)) {
    if (pack === 'kenney-animals') continue;
    lines.push(`  ${pack}: ${info.note}`);
    lines.push(`    basePath: ${info.basePath}`);
    lines.push(`    Example: ${info.example}`);
  }

  return lines.join('\n');
}

// ========== 3D MODEL MANIFEST ==========

export const MODEL_MANIFEST = {
  'racing-3d': {
    models: [
      { key: 'sedan', path: '/assets/models/kenney-carkit/sedan.glb', scale: 1, note: 'player car' },
      { key: 'taxi', path: '/assets/models/kenney-carkit/taxi.glb', scale: 1, note: 'yellow taxi' },
      { key: 'suv', path: '/assets/models/kenney-carkit/suv.glb', scale: 1, note: 'SUV obstacle' },
      { key: 'truck', path: '/assets/models/kenney-carkit/truck.glb', scale: 1, note: 'delivery truck' },
      { key: 'ambulance', path: '/assets/models/kenney-carkit/ambulance.glb', scale: 1, note: 'ambulance' },
      { key: 'police', path: '/assets/models/kenney-carkit/police.glb', scale: 1, note: 'police car' },
      { key: 'raceCar', path: '/assets/models/kenney-carkit/race.glb', scale: 1, note: 'race car' },
      { key: 'cone', path: '/assets/models/kenney-carkit/cone.glb', scale: 1, note: 'traffic cone' },
      { key: 'gateFinish', path: '/assets/models/kenney-carkit/gate-finish.glb', scale: 1, note: 'finish line gate' },
      { key: 'treePine', path: '/assets/models/kenney-carkit/tree-pine.glb', scale: 1, note: 'roadside tree' },
    ],
  },
  parking: {
    models: [
      { key: 'sedan', path: '/assets/models/kenney-carkit/sedan.glb', scale: 1, note: 'player car' },
      { key: 'delivery', path: '/assets/models/kenney-carkit/delivery.glb', scale: 1, note: 'parked truck' },
      { key: 'suv', path: '/assets/models/kenney-carkit/suv.glb', scale: 1, note: 'parked SUV' },
      { key: 'cone', path: '/assets/models/kenney-carkit/cone.glb', scale: 1, note: 'traffic cone' },
    ],
  },
  'space-3d': {
    models: [
      { key: 'speederA', path: '/assets/models/kenney-spacekit/craft_speederA.glb', scale: 2, note: 'player ship' },
      { key: 'speederB', path: '/assets/models/kenney-spacekit/craft_speederB.glb', scale: 2, note: 'enemy ship' },
      { key: 'rocketBase', path: '/assets/models/kenney-spacekit/rocket_baseA.glb', scale: 2, note: 'rocket' },
      { key: 'turret', path: '/assets/models/kenney-spacekit/turret_double.glb', scale: 2, note: 'turret' },
      {
        key: 'astronaut',
        path: '/assets/models/kenney-spacekit/astronautA.glb',
        scale: 2,
        note: 'astronaut character',
      },
      { key: 'satellite', path: '/assets/models/kenney-spacekit/satelliteDish.glb', scale: 2, note: 'satellite dish' },
      { key: 'meteor', path: '/assets/models/kenney-spacekit/meteor.glb', scale: 2, note: 'space rock' },
      { key: 'alien', path: '/assets/models/kenney-spacekit/alien.glb', scale: 2, note: 'alien character' },
      { key: 'rover', path: '/assets/models/kenney-spacekit/rover.glb', scale: 2, note: 'space rover' },
    ],
  },
  'rpg-3d': {
    models: [
      { key: 'towerSquare', path: '/assets/models/kenney-castlekit/tower-square.glb', scale: 1, note: 'castle tower' },
      { key: 'wall', path: '/assets/models/kenney-castlekit/wall.glb', scale: 1, note: 'castle wall' },
      { key: 'gate', path: '/assets/models/kenney-castlekit/gate.glb', scale: 1, note: 'castle gate' },
      { key: 'catapult', path: '/assets/models/kenney-castlekit/siege-catapult.glb', scale: 1, note: 'siege catapult' },
      { key: 'treeLarge', path: '/assets/models/kenney-castlekit/tree-large.glb', scale: 1, note: 'large tree' },
      { key: 'flag', path: '/assets/models/kenney-castlekit/flag.glb', scale: 1, note: 'flag' },
      { key: 'rocksLarge', path: '/assets/models/kenney-castlekit/rocks-large.glb', scale: 1, note: 'large rocks' },
    ],
  },
  'platformer-3d': {
    models: [
      {
        key: 'character',
        path: '/assets/models/kenney-platformerkit/character-oobi.glb',
        scale: 1,
        note: 'player character',
      },
      {
        key: 'blockGrass',
        path: '/assets/models/kenney-platformerkit/block-grass.glb',
        scale: 1,
        note: 'grass platform',
      },
      {
        key: 'blockGrassLarge',
        path: '/assets/models/kenney-platformerkit/block-grass-large.glb',
        scale: 1,
        note: 'large platform',
      },
      { key: 'coinGold', path: '/assets/models/kenney-platformerkit/coin-gold.glb', scale: 1, note: 'gold coin' },
      { key: 'flag', path: '/assets/models/kenney-platformerkit/flag.glb', scale: 1, note: 'finish flag' },
      { key: 'spring', path: '/assets/models/kenney-platformerkit/spring.glb', scale: 1, note: 'jump spring' },
      {
        key: 'spikeBlock',
        path: '/assets/models/kenney-platformerkit/spike-block.glb',
        scale: 1,
        note: 'spike hazard',
      },
      { key: 'tree', path: '/assets/models/kenney-platformerkit/tree.glb', scale: 1, note: 'decoration tree' },
      { key: 'treePine', path: '/assets/models/kenney-platformerkit/tree-pine.glb', scale: 1, note: 'pine tree' },
      { key: 'chest', path: '/assets/models/kenney-platformerkit/chest.glb', scale: 1, note: 'treasure chest' },
      { key: 'doorOpen', path: '/assets/models/kenney-platformerkit/door-open.glb', scale: 1, note: 'open doorway' },
      { key: 'crate', path: '/assets/models/kenney-platformerkit/crate.glb', scale: 1, note: 'pushable crate' },
      { key: 'crateItem', path: '/assets/models/kenney-platformerkit/crate-item.glb', scale: 1, note: 'item crate' },
      {
        key: 'blockMoving',
        path: '/assets/models/kenney-platformerkit/block-moving.glb',
        scale: 1,
        note: 'moving platform',
      },
      { key: 'key', path: '/assets/models/kenney-platformerkit/key.glb', scale: 1, note: 'key collectible' },
      { key: 'lock', path: '/assets/models/kenney-platformerkit/lock.glb', scale: 1, note: 'locked door/gate' },
      { key: 'sign', path: '/assets/models/kenney-platformerkit/sign.glb', scale: 1, note: 'sign post' },
      { key: 'plant', path: '/assets/models/kenney-platformerkit/plant.glb', scale: 1, note: 'decoration plant' },
      { key: 'saw', path: '/assets/models/kenney-platformerkit/saw.glb', scale: 1, note: 'saw blade hazard' },
      { key: 'coinBronze', path: '/assets/models/kenney-platformerkit/coin-bronze.glb', scale: 1, note: 'bronze coin' },
      { key: 'lever', path: '/assets/models/kenney-platformerkit/lever.glb', scale: 1, note: 'lever switch' },
      { key: 'platformRamp', path: '/assets/models/kenney-platformerkit/platform-ramp.glb', scale: 1, note: 'ramp' },
      { key: 'stones', path: '/assets/models/kenney-platformerkit/stones.glb', scale: 1, note: 'decoration rocks' },
      { key: 'pipe', path: '/assets/models/kenney-platformerkit/pipe.glb', scale: 1, note: 'pipe tunnel' },
      {
        key: 'characterOozi',
        path: '/assets/models/kenney-platformerkit/character-oozi.glb',
        scale: 1,
        note: 'alt player character',
      },
      {
        key: 'trapSpikes',
        path: '/assets/models/kenney-platformerkit/trap-spikes-large.glb',
        scale: 1,
        note: 'floor spike trap',
      },
      {
        key: 'conveyorBelt',
        path: '/assets/models/kenney-platformerkit/conveyor-belt.glb',
        scale: 1,
        note: 'conveyor belt',
      },
      { key: 'fence', path: '/assets/models/kenney-platformerkit/fence-straight.glb', scale: 1, note: 'fence' },
    ],
  },
  'pirate-3d': {
    models: [
      { key: 'shipLarge', path: '/assets/models/kenney-piratekit/ship-large.glb', scale: 1, note: 'large ship' },
      {
        key: 'shipPirate',
        path: '/assets/models/kenney-piratekit/ship-pirate-large.glb',
        scale: 1,
        note: 'pirate ship',
      },
      { key: 'cannon', path: '/assets/models/kenney-piratekit/cannon.glb', scale: 1, note: 'cannon' },
      {
        key: 'cannonBall',
        path: '/assets/models/kenney-piratekit/cannon-ball.glb',
        scale: 1,
        note: 'cannon ball projectile',
      },
      { key: 'chest', path: '/assets/models/kenney-piratekit/chest.glb', scale: 1, note: 'treasure chest' },
      { key: 'barrel', path: '/assets/models/kenney-piratekit/barrel.glb', scale: 1, note: 'barrel' },
      { key: 'palmBend', path: '/assets/models/kenney-piratekit/palm-bend.glb', scale: 1, note: 'palm tree' },
      { key: 'towerWatch', path: '/assets/models/kenney-piratekit/tower-watch.glb', scale: 1, note: 'watchtower' },
    ],
  },
  'common-3d': {
    models: [
      { key: 'treeOak', path: '/assets/models/kenney-naturekit/tree_oak.glb', scale: 1, note: 'oak tree' },
      { key: 'treePine', path: '/assets/models/kenney-naturekit/tree_pineDefaultA.glb', scale: 1, note: 'pine tree' },
      { key: 'treePalm', path: '/assets/models/kenney-naturekit/tree_palm.glb', scale: 1, note: 'palm tree' },
      { key: 'rockLarge', path: '/assets/models/kenney-naturekit/rock_largeA.glb', scale: 1, note: 'large rock' },
      { key: 'rockSmall', path: '/assets/models/kenney-naturekit/rock_smallA.glb', scale: 1, note: 'small rock' },
      { key: 'bush', path: '/assets/models/kenney-naturekit/plant_bushLarge.glb', scale: 1, note: 'bush' },
      { key: 'flowerRed', path: '/assets/models/kenney-naturekit/flower_redA.glb', scale: 1, note: 'red flower' },
      { key: 'mushroom', path: '/assets/models/kenney-naturekit/mushroom_red.glb', scale: 1, note: 'red mushroom' },
      { key: 'fence', path: '/assets/models/kenney-naturekit/fence_simple.glb', scale: 1, note: 'fence' },
    ],
  },
};

export const EXTRA_MODEL_PACKS = {
  'kenney-carkit': {
    note: 'Low-poly cars: sedan, taxi, SUV, truck, ambulance, police, race car, tractor, plus cones, barriers, road signs',
    basePath: '/assets/models/kenney-carkit/',
    example: "loader.load('/assets/models/kenney-carkit/sedan.glb', (gltf) => scene.add(gltf.scene));",
  },
  'kenney-spacekit': {
    note: 'Sci-fi models: spaceships, rockets, turrets, astronauts, satellites, space stations, meteorites, monorail',
    basePath: '/assets/models/kenney-spacekit/',
    example: "loader.load('/assets/models/kenney-spacekit/craft_speederA.glb', (gltf) => scene.add(gltf.scene));",
  },
  'kenney-castlekit': {
    note: 'Medieval models: castle towers, walls, gates, bridges, catapults, knight figures',
    basePath: '/assets/models/kenney-castlekit/',
    example: "loader.load('/assets/models/kenney-castlekit/towerSquare.glb', (gltf) => scene.add(gltf.scene));",
  },
  'kenney-naturekit': {
    note: 'Nature models: oak/pine trees, rocks, flowers, bushes, mushrooms, fences, logs — great for any outdoor scene',
    basePath: '/assets/models/kenney-naturekit/',
    example: "loader.load('/assets/models/kenney-naturekit/tree_oak.glb', (gltf) => scene.add(gltf.scene));",
  },
  'kenney-platformerkit': {
    note: '3D platformer models: characters, blocks, coins, flags, springs, spikes, moving platforms',
    basePath: '/assets/models/kenney-platformerkit/',
    example: "loader.load('/assets/models/kenney-platformerkit/character.glb', (gltf) => scene.add(gltf.scene));",
  },
  'kenney-piratekit': {
    note: 'Pirate models: ships, cannons, treasure chests, barrels, palm trees, docks, lighthouse',
    basePath: '/assets/models/kenney-piratekit/',
    example: "loader.load('/assets/models/kenney-piratekit/ship_large.glb', (gltf) => scene.add(gltf.scene));",
  },
};

/**
 * Format 3D model assets for injection into the AI prompt.
 */
export function formatModelsForPrompt(genre) {
  const genreModels = MODEL_MANIFEST[genre] || MODEL_MANIFEST[genre + '-3d'];
  const common = MODEL_MANIFEST['common-3d'];

  const lines = ['═══════════════════════════════════════════════════════════════'];
  lines.push('3D MODEL ASSETS — MANDATORY: load GLB models with GLTFLoader');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('GLTFLoader is pre-loaded. Use new THREE.GLTFLoader() to load models.');
  lines.push('ONLY use paths listed below — NEVER invent .glb paths. Wrong paths return 404.');
  lines.push('DO NOT build everything from BoxGeometry — use real 3D models!');
  lines.push('ALWAYS add lights (AmbientLight + DirectionalLight) so models are visible.');
  lines.push('');

  if (genreModels && genreModels.models.length > 0) {
    lines.push(`COPY THIS MODEL LOADING CODE for ${genre}:`);
    lines.push('```');
    lines.push('const loader = new THREE.GLTFLoader();');
    for (const m of genreModels.models) {
      lines.push(`loader.load('${m.path}', (gltf) => {`);
      lines.push(`  const ${m.key} = gltf.scene;`);
      lines.push(`  ${m.key}.scale.set(${m.scale}, ${m.scale}, ${m.scale});`);
      lines.push(`  scene.add(${m.key});  // ${m.note}`);
      lines.push(`});`);
    }
    lines.push('```');
    lines.push('');
  }

  if (common && common.models.length > 0) {
    lines.push('Common 3D models (nature props for any scene):');
    for (const m of common.models) {
      lines.push(`  loader.load('${m.path}', ...);  // ${m.note}`);
    }
    lines.push('');
  }

  lines.push('EXTRA 3D PACKS — more models available:');
  for (const [pack, info] of Object.entries(EXTRA_MODEL_PACKS)) {
    lines.push(`  ${pack}: ${info.note}`);
    lines.push(`    Example: ${info.example}`);
  }

  return lines.join('\n');
}
