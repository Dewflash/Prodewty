import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme/typography';

type Props = {
  colWidth: number;
  colHeight: number;
  label?: string;
};

export function SanctuaryFootprintPreview({ colWidth, colHeight, label = 'Footprint' }: Props) {
  const cols = Math.max(1, Math.floor(colWidth));
  const rows = Math.max(1, Math.floor(colHeight));
  const cells = Array.from({ length: rows * cols }, (_, index) => index);

  return (
    <View style={styles.row}>
      <View style={[styles.grid, { width: cols * 8 + 2, height: rows * 8 + 2 }]}>
        {cells.map(index => (
          <View key={index} style={styles.cell} />
        ))}
      </View>
      <Text numberOfLines={1} style={styles.text}>{label} {cols}x{rows}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 20,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    padding: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(11,20,12,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(205,232,194,0.34)',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: 6,
    height: 6,
    margin: 1,
    borderRadius: 2,
    backgroundColor: 'rgba(142,232,137,0.72)',
  },
  text: {
    marginLeft: 6,
    color: 'rgba(255,242,187,0.68)',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
});
