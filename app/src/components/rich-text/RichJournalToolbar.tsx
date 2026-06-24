import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import type {EditorBridge} from '@10play/tentap-editor';
import {useBridgeState} from '@10play/tentap-editor';

import {theme} from './theme';

type RichJournalToolbarProps = {
  editor: EditorBridge;
};

type ColorChoice = {label: string; value: string | undefined; swatch: string};

// Default first so tapping it clears any colour back to ink. The rest stay in
// the same muted, earthy parchment palette.
const COLOR_CHOICES: ReadonlyArray<ColorChoice> = [
  {label: 'Default', value: undefined, swatch: theme.colors.ink},
  {label: 'Cedar', value: theme.colors.cedar, swatch: theme.colors.cedar},
  {label: 'Sage', value: theme.colors.sage, swatch: theme.colors.sage},
  {label: 'Gold', value: theme.colors.gold, swatch: theme.colors.gold},
  {label: 'Red', value: theme.colors.danger, swatch: theme.colors.danger},
  {label: 'Slate', value: '#5A7A8E', swatch: '#5A7A8E'},
  {label: 'Plum', value: '#8E5A7A', swatch: '#8E5A7A'},
  {label: 'Cocoa', value: '#6B4A35', swatch: '#6B4A35'},
];

export function RichJournalToolbar({editor}: RichJournalToolbarProps): React.JSX.Element {
  const state = useBridgeState(editor);
  const [aaOpen, setAaOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const headingLevel = state.headingLevel;
  const isBody = headingLevel === undefined;
  const currentColor = state.activeColor ?? theme.colors.ink;

  const setParagraphStyle = (target: 'title' | 'subheading' | 'body') => {
    if (target === 'title') {
      if (headingLevel !== 1) {
        editor.toggleHeading(1);
      }
    } else if (target === 'subheading') {
      if (headingLevel !== 2) {
        editor.toggleHeading(2);
      }
    } else if (headingLevel !== undefined) {
      // Toggling the active heading off returns the line to Body (paragraph).
      editor.toggleHeading(headingLevel as 1 | 2 | 3 | 4 | 5 | 6);
    }
  };

  const applyColor = (choice: ColorChoice) => {
    if (choice.value) {
      editor.setColor(choice.value);
    } else {
      editor.unsetColor();
    }
    setColorOpen(false);
  };

  const styleButtons = (
    <>
      <ToolbarTextButton active={headingLevel === 1} label="Title" onPress={() => setParagraphStyle('title')} />
      <ToolbarTextButton active={headingLevel === 2} label="Subheading" onPress={() => setParagraphStyle('subheading')} />
      <ToolbarTextButton active={isBody} label="Body" onPress={() => setParagraphStyle('body')} />
    </>
  );

  const markButtons = (
    <>
      <ToolbarTextButton active={state.isBoldActive} bold label="B" onPress={() => editor.toggleBold()} />
      <ToolbarTextButton active={state.isUnderlineActive} label="U" underline onPress={() => editor.toggleUnderline()} />
      <ToolbarTextButton active={state.isStrikeActive} label="S" strike onPress={() => editor.toggleStrike()} />
    </>
  );

  const listButtons = (
    <>
      <ToolbarTextButton active={state.isBulletListActive} label="•" onPress={() => editor.toggleBulletList()} />
      <ToolbarTextButton active={state.isOrderedListActive} label="1." onPress={() => editor.toggleOrderedList()} />
      <ToolbarTextButton label="⇤" onPress={() => editor.lift()} />
      <ToolbarTextButton label="⇥" onPress={() => editor.sink()} />
    </>
  );

  const colorButton = (
    <TouchableOpacity
      accessibilityLabel="Text colour"
      accessibilityRole="button"
      onPress={() => {
        setColorOpen(open => !open);
        setAaOpen(false);
      }}
      style={styles.button}>
      <View style={[styles.colorCircle, {backgroundColor: currentColor}]} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrap}>
      {aaOpen ? (
        <View style={styles.panel}>
          <View style={styles.panelRow}>{styleButtons}</View>
          <View style={styles.panelRow}>{markButtons}{colorButton}</View>
          <View style={styles.panelRow}>{listButtons}</View>
          <View style={styles.panelRow}>
            {COLOR_CHOICES.map(choice => (
              <TouchableOpacity
                accessibilityLabel={choice.label}
                accessibilityRole="button"
                key={choice.label}
                onPress={() => applyColor(choice)}
                style={styles.button}>
                <View
                  style={[
                    styles.colorCircle,
                    {backgroundColor: choice.swatch},
                    currentColor === choice.swatch && styles.colorCircleActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
      {colorOpen ? (
        <View style={styles.panel}>
          <View style={styles.panelRow}>
            {COLOR_CHOICES.map(choice => (
              <TouchableOpacity
                accessibilityLabel={choice.label}
                accessibilityRole="button"
                key={choice.label}
                onPress={() => applyColor(choice)}
                style={styles.button}>
                <View
                  style={[
                    styles.colorCircle,
                    {backgroundColor: choice.swatch},
                    currentColor === choice.swatch && styles.colorCircleActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        <ToolbarTextButton active={aaOpen} label="Aa" onPress={() => {
          setAaOpen(open => !open);
          setColorOpen(false);
        }} />
        <View style={styles.divider} />
        {styleButtons}
        <View style={styles.divider} />
        {markButtons}
        {colorButton}
        <View style={styles.divider} />
        {listButtons}
      </ScrollView>
    </View>
  );
}

type ToolbarTextButtonProps = {
  label: string;
  onPress: () => void;
  active?: boolean;
  bold?: boolean;
  underline?: boolean;
  strike?: boolean;
};

function ToolbarTextButton({label, onPress, active, bold, underline, strike}: ToolbarTextButtonProps): React.JSX.Element {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      onPress={onPress}
      style={[styles.button, active && styles.buttonActive]}>
      <Text
        style={[
          styles.buttonText,
          bold && styles.bold,
          underline && styles.underline,
          strike && styles.strike,
          active && styles.buttonTextActive,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(250, 247, 242, 0.98)',
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  button: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: 10,
  },
  buttonActive: {
    backgroundColor: theme.colors.cedarWash,
  },
  buttonText: {
    color: theme.colors.ink,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
  },
  buttonTextActive: {
    color: theme.colors.cedar,
  },
  bold: {
    fontWeight: '700',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  divider: {
    backgroundColor: theme.colors.border,
    height: 22,
    width: StyleSheet.hairlineWidth,
  },
  colorCircle: {
    borderColor: theme.colors.border,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    height: 22,
    width: 22,
  },
  colorCircleActive: {
    borderColor: theme.colors.cedar,
    borderWidth: 2,
  },
  panel: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  panelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
});
