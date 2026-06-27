import { getBiomeDef } from './BiomeCatalog';

export type Room = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  doors: { direction: 'north' | 'south' | 'east' | 'west', connectedRoomId: string }[];
  entities: { type: 'enemy' | 'chest' | 'hazard', id: string, x: number, y: number }[];
};

export type BiomeLayout = {
  rooms: Room[];
  startRoomId: string;
  bossRoomId?: string;
  exitRoomId: string;
};

// Simplified Procedural Generation based on BSP (Binary Space Partitioning)
export function generateBiome(biomeType: string, seed: number, floorNumber: number): BiomeLayout {
  const def = getBiomeDef(biomeType);
  if (!def) {
    throw new Error(`Unknown biome type: ${biomeType}`);
  }

  // A real BSP implementation would go here.
  // For the backend implementation, we will generate a linear "corridor" of rooms
  // as a starting point, which can be expanded later.
  
  // Random number generator with seed
  let currentSeed = seed + floorNumber * 1000;
  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  const numRooms = def.roomsPerFloor + Math.floor(random() * 3);
  const rooms: Room[] = [];
  
  for (let i = 0; i < numRooms; i++) {
    const isStart = i === 0;
    const isExit = i === numRooms - 1;
    const isBoss = def.bossFloor === floorNumber && isExit;

    const room: Room = {
      id: `room_${i}`,
      x: i * 20, // 20 units apart
      y: 0,
      width: 10 + Math.floor(random() * 5),
      height: 10 + Math.floor(random() * 5),
      doors: [],
      entities: []
    };

    // Connect to previous room
    if (i > 0) {
      room.doors.push({ direction: 'west', connectedRoomId: `room_${i - 1}` });
      rooms[i - 1].doors.push({ direction: 'east', connectedRoomId: room.id });
    }

    // Spawn entities (skip start room)
    if (!isStart) {
      if (isBoss) {
        // Spawn boss
        const bossDefs = def.enemyTable.filter(e => e.minFloor >= def.bossFloor);
        if (bossDefs.length > 0) {
          const bossDef = bossDefs[Math.floor(random() * bossDefs.length)];
          room.entities.push({ type: 'enemy', id: bossDef.defId, x: room.width / 2, y: room.height / 2 });
        }
      } else {
        // Random enemies based on difficulty
        const numEnemies = Math.floor(random() * def.baseDifficulty) + 1;
        for (let e = 0; e < numEnemies; e++) {
          const validEnemies = def.enemyTable.filter(en => en.minFloor <= floorNumber);
          if (validEnemies.length > 0) {
            const enemyDef = validEnemies[Math.floor(random() * validEnemies.length)];
            room.entities.push({ 
              type: 'enemy', 
              id: enemyDef.defId, 
              x: 1 + Math.floor(random() * (room.width - 2)), 
              y: 1 + Math.floor(random() * (room.height - 2)) 
            });
          }
        }

        // Random hazards
        if (random() > 0.5 && def.hazards.length > 0) {
          const hazard = def.hazards[Math.floor(random() * def.hazards.length)];
          room.entities.push({ 
            type: 'hazard', 
            id: hazard.type, 
            x: 1 + Math.floor(random() * (room.width - 2)), 
            y: 1 + Math.floor(random() * (room.height - 2)) 
          });
        }
        
        // Random chests
        if (random() > 0.8) {
          room.entities.push({ 
            type: 'chest', 
            id: 'dungeon_chest', 
            x: 1 + Math.floor(random() * (room.width - 2)), 
            y: 1 + Math.floor(random() * (room.height - 2)) 
          });
        }
      }
    }

    rooms.push(room);
  }

  return {
    rooms,
    startRoomId: rooms[0].id,
    exitRoomId: rooms[rooms.length - 1].id,
    bossRoomId: def.bossFloor === floorNumber ? rooms[rooms.length - 1].id : undefined
  };
}
