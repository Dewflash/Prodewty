import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { RpgItemDefinition } from './RpgObjectCatalog';

type MechanicState = 'open_gate' | 'disabled_trap' | null;

type SanctuaryPlaceholderObjectArtProps = {
  item: RpgItemDefinition;
  width: number;
  height: number;
  mechanicState?: MechanicState;
};

export function isSanctuaryPlaceholderObject(item: RpgItemDefinition | null | undefined) {
  return item?.kind === 'object' && !!item.tags?.includes('placeholder');
}

export function SanctuaryPlaceholderObjectArt({
  item,
  width,
  height,
  mechanicState = null,
}: SanctuaryPlaceholderObjectArtProps) {
  const tags = item.tags ?? [];
  const itemKey = item.name.toLowerCase();
  const isEntrance = tags.includes('entrance');
  const isPondWall = tags.includes('pond_wall');
  const isBuildingWall = tags.includes('building_plot_wall');
  const isFence = tags.includes('garden_fence') || tags.includes('wall') || itemKey.includes('fence') || itemKey.includes('pike');
  const isStation = tags.includes('station');
  const isBed = itemKey.includes('bed');
  const isGateOpen = mechanicState === 'open_gate';
  const artWidth = Math.max(18, Math.min(width, 44));
  const artHeight = Math.max(18, Math.min(height, 46));

  if (isEntrance) {
    return (
      <View style={[styles.frame, { width, height }]}>
        <View style={[styles.shadow, { width: artWidth * 0.86 }]} />
        <View style={[styles.entrance, isGateOpen && styles.entranceOpen, { width: artWidth, height: artHeight }]}>
          <View style={[styles.entrancePost, styles.entrancePostLeft]} />
          <View style={[styles.entrancePost, styles.entrancePostRight]} />
          <View style={styles.entranceLintel} />
          <View style={styles.entranceHinge} />
          <View style={[styles.entranceDoor, isGateOpen && styles.entranceDoorOpen]} />
        </View>
      </View>
    );
  }

  if (isPondWall || isBuildingWall) {
    return (
      <View style={[styles.frame, { width, height }]}>
        <View style={[styles.shadow, { width: artWidth * 0.9 }]} />
        <View style={[
          styles.wall,
          isPondWall ? styles.wallStone : styles.wallBrick,
          { width: artWidth, height: artHeight * 0.7 },
        ]}>
          <View style={styles.wallLine} />
          <View style={[styles.wallLine, styles.wallLineShort]} />
          <View style={styles.wallLine} />
        </View>
      </View>
    );
  }

  if (isFence) {
    return (
      <View style={[styles.frame, { width, height }]}>
        <View style={[styles.shadow, { width: artWidth * 0.84 }]} />
        <View style={[styles.fence, { width: artWidth, height: artHeight * 0.7 }]}>
          <View style={[styles.fencePost, styles.fencePostLeft]} />
          <View style={[styles.fencePost, styles.fencePostRight]} />
          <View style={styles.fenceRailTop} />
          <View style={styles.fenceRailBottom} />
        </View>
      </View>
    );
  }

  if (isStation) {
    return (
      <View style={[styles.frame, { width, height }]}>
        <View style={[styles.shadow, { width: artWidth * 0.92 }]} />
        <View style={[styles.bench, { width: artWidth, height: artHeight * 0.62 }]}>
          <View style={styles.benchTop} />
          <View style={[styles.benchLeg, styles.benchLegLeft]} />
          <View style={[styles.benchLeg, styles.benchLegRight]} />
          <View style={styles.benchDot} />
        </View>
      </View>
    );
  }

  if (isBed) {
    return (
      <View style={[styles.frame, { width, height }]}>
        <View style={[styles.shadow, { width: artWidth * 0.94 }]} />
        <View style={[styles.bed, { width: artWidth, height: artHeight * 0.62 }]}>
          <View style={styles.bedPillow} />
          <View style={styles.bedBlanket} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.frame, { width, height }]}>
      <View style={[styles.shadow, { width: artWidth * 0.82 }]} />
      <View style={[styles.decor, { width: artWidth * 0.74, height: artHeight * 0.66 }]}>
        <View style={styles.decorCap} />
        <View style={styles.decorCore} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  shadow: {
    position: 'absolute',
    bottom: 1,
    height: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(18,13,8,0.34)',
    transform: [{ scaleY: 0.55 }],
  },
  entrance: {
    marginBottom: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(240,206,143,0.52)',
    backgroundColor: 'rgba(94,58,31,0.58)',
  },
  entranceOpen: {
    backgroundColor: 'rgba(42,67,53,0.5)',
    borderColor: 'rgba(142,232,137,0.64)',
  },
  entrancePost: {
    position: 'absolute',
    bottom: 3,
    top: 8,
    width: 5,
    borderRadius: 3,
    backgroundColor: '#8b5a32',
    borderWidth: 1,
    borderColor: 'rgba(43,28,18,0.58)',
  },
  entrancePostLeft: {
    left: 5,
  },
  entrancePostRight: {
    right: 5,
  },
  entranceLintel: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 5,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#a9763f',
    borderWidth: 1,
    borderColor: 'rgba(43,28,18,0.5)',
  },
  entranceHinge: {
    position: 'absolute',
    right: 11,
    top: 15,
    bottom: 8,
    width: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255,224,112,0.5)',
  },
  entranceDoor: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 14,
    bottom: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(43,28,18,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(240,206,143,0.24)',
  },
  entranceDoorOpen: {
    left: 16,
    right: 8,
    opacity: 0.46,
    transform: [{ skewY: '-8deg' }],
  },
  wall: {
    marginBottom: 4,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  wallStone: {
    backgroundColor: 'rgba(89,96,95,0.9)',
    borderColor: 'rgba(205,232,194,0.34)',
  },
  wallBrick: {
    backgroundColor: 'rgba(119,70,45,0.9)',
    borderColor: 'rgba(255,210,148,0.34)',
  },
  wallLine: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,242,187,0.28)',
  },
  wallLineShort: {
    width: '68%',
    alignSelf: 'flex-end',
  },
  fence: {
    marginBottom: 4,
  },
  fencePost: {
    position: 'absolute',
    bottom: 0,
    top: 2,
    width: 5,
    borderRadius: 3,
    backgroundColor: '#956333',
    borderWidth: 1,
    borderColor: 'rgba(43,28,18,0.54)',
  },
  fencePostLeft: {
    left: 4,
  },
  fencePostRight: {
    right: 4,
  },
  fenceRailTop: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 9,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#b7783c',
    borderWidth: 1,
    borderColor: 'rgba(43,28,18,0.44)',
  },
  fenceRailBottom: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 20,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#79471f',
  },
  bench: {
    marginBottom: 6,
  },
  benchTop: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 3,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#a9763f',
    borderWidth: 1,
    borderColor: 'rgba(43,28,18,0.54)',
  },
  benchLeg: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 15,
    borderRadius: 2,
    backgroundColor: '#694019',
  },
  benchLegLeft: {
    left: 8,
  },
  benchLegRight: {
    right: 8,
  },
  benchDot: {
    position: 'absolute',
    right: 9,
    top: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,224,112,0.72)',
  },
  bed: {
    marginBottom: 6,
    borderRadius: 7,
    backgroundColor: 'rgba(94,58,31,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(240,206,143,0.28)',
    overflow: 'hidden',
  },
  bedPillow: {
    position: 'absolute',
    left: 3,
    top: 3,
    width: 10,
    height: 9,
    borderRadius: 4,
    backgroundColor: 'rgba(255,242,187,0.76)',
  },
  bedBlanket: {
    position: 'absolute',
    left: 14,
    right: 3,
    top: 4,
    bottom: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(112,214,255,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(112,214,255,0.34)',
  },
  decor: {
    marginBottom: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(78,65,43,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(234,220,168,0.3)',
    overflow: 'hidden',
  },
  decorCap: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 4,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,224,112,0.46)',
  },
  decorCore: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 5,
    height: 11,
    borderRadius: 5,
    backgroundColor: 'rgba(126,217,87,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(126,217,87,0.28)',
  },
});
