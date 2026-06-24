import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {CoreBridge, RichText, TenTapStartKit, useEditorBridge, useEditorContent} from '@10play/tentap-editor';

import {theme} from './theme';
import {RichJournalToolbar} from './RichJournalToolbar';


export type RichJournalEditorHandle = {
  // Latest content for saving. Awaits the editor for the freshest value.
  getContent: () => Promise<{text: string; html: string}>;
  focus: () => void;
  blur: () => void;
  undo: () => void;
  redo: () => void;
  // Appends plain text (e.g. accepted OCR text) to the end of the note as body
  // paragraphs.
  appendPlainText: (text: string) => void;
  // Replaces the whole note with the given plain text (e.g. a Tidy result).
  setPlainText: (text: string) => void;
  // Inserts an image (downscaled data URI for display) into the note. originalUri
  // is the full-resolution source file, stashed in the img's title attribute so
  // it survives save/reopen and Crop can re-crop from the sharp original.
  insertImage: (uri: string, originalUri?: string) => void;
  // The src (data URI) of the inline image at the given index, or undefined.
  getImageSrcAtIndex: (index: number) => Promise<string | undefined>;
  // The original full-res file path stashed for the inline image at the index.
  getImageOriginalAtIndex: (index: number) => Promise<string | undefined>;
  // Replaces the inline image at the given index's src (keeps its original link).
  replaceImageAtIndex: (index: number, uri: string) => void;
};

function escapeHtmlText(line: string): string {
  return line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type RichJournalEditorChange = {text: string; html: string};

type RichJournalEditorProps = {
  // HTML string the editor opens with.
  initialContent: string;
  placeholder: string;
  // Hide the format toolbar (e.g. when the keyboard is down and a Save button
  // takes the bottom slot instead).
  toolbarHidden?: boolean;
  // Fires (debounced) with the current plain text + HTML, for autosave.
  onChange: (change: RichJournalEditorChange) => void;
  // Actions for the per-photo buttons that appear when an inline image is
  // tapped. The index identifies which inline image was tapped.
  onCropImage?: (imageIndex: number) => void;
  onExtractImage?: (imageIndex: number) => void;
};

// Themes the editor content to match the rest of the app (parchment background,
// ink serif text, tight Apple-Notes-style line spacing, comfortable side
// padding) at init so there is no flash of default white/web styling.
const EDITOR_CSS = `
  .ProseMirror {
    background-color: ${theme.colors.parchment};
    color: ${theme.colors.ink};
    font-family: Georgia, serif;
    font-size: 17px;
    line-height: 29px;
    padding: 8px 24px 160px 24px;
    caret-color: ${theme.colors.cedar};
    -webkit-tap-highlight-color: transparent;
  }
  .ProseMirror p { margin: 0; }
  .ProseMirror h1 { font-size: 27px; line-height: 33px; font-weight: 600; margin: 8px 0 2px; }
  .ProseMirror h2 { font-size: 21px; line-height: 28px; font-weight: 600; margin: 6px 0 2px; }
  /* The first line of every note is the Title by default; pressing Return makes
     the next line a normal Body paragraph (it is no longer the first child). */
  .ProseMirror > :first-child { font-size: 27px; line-height: 33px; font-weight: 600; margin: 0 0 2px; }
  .ProseMirror img { display: block; width: 100%; height: auto; border-radius: 10px; margin: 10px 0; }
  /* Guarantee a tappable line after a trailing image so the cursor can be placed
     below it to keep typing. */
  .ProseMirror > p:last-child { min-height: 1.4em; }
  /* Gapcursor is bundled but unstyled in this editor build, so it was invisible.
     Make it a clearly visible, blinking cedar cursor so there is always an
     obvious place to type next to / after an image. */
  .ProseMirror-gapcursor { display: none; pointer-events: none; position: absolute; }
  .ProseMirror-gapcursor:after {
    content: "";
    display: block;
    position: absolute;
    top: -2px;
    width: 28px;
    border-top: 2px solid ${theme.colors.cedar};
    animation: lauds-gapcursor-blink 1.1s steps(2, start) infinite;
  }
  @keyframes lauds-gapcursor-blink { to { visibility: hidden; } }
  .ProseMirror-focused .ProseMirror-gapcursor { display: block; }
  /* Show a clear outline when the photo itself is the current selection. */
  .ProseMirror-selectednode { outline: 2px solid ${theme.colors.cedar}; outline-offset: 2px; }
  .ProseMirror p.is-editor-empty:first-child::before {
    color: ${theme.colors.ink2};
    font-style: italic;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`;

// Phase 1.5: the TenTap editor themed to match the app, with content reported
// for saving. Still uses TenTap's built-in toolbar; the custom 12-button
// toolbar lands in a later phase.
export const RichJournalEditor = forwardRef<RichJournalEditorHandle, RichJournalEditorProps>(
  function RichJournalEditor({initialContent, placeholder, toolbarHidden, onChange, onCropImage, onExtractImage}, ref) {
    // Position + index of the inline image the user tapped, so the per-photo
    // action buttons can be shown next to it and act on the right image.
    const [tappedImageTop, setTappedImageTop] = useState<number | null>(null);
    const tappedImageIndexRef = useRef(0);
    const editor = useEditorBridge({
      autofocus: false,
      avoidIosKeyboard: true,
      initialContent,
      // configureCSS bakes the styling into the editor at init so it renders
      // correctly from the first frame (injecting it post-mount caused a brief
      // unstyled flash with text at the left edge).
      bridgeExtensions: [
        ...TenTapStartKit,
        CoreBridge.configureCSS(EDITOR_CSS),
      ],
    });
    const text = useEditorContent(editor, {type: 'text'});
    const html = useEditorContent(editor, {type: 'html'});

    useEffect(() => {
      editor.setPlaceholder(placeholder);
      // When the keyboard is closed, tapping anywhere in the note (empty space
      // or a word) focuses the editor and brings the keyboard back. Dismissing
      // is handled outside the editor (the header/date area and Done), so taps
      // inside the note never dismiss.
      editor.injectJS(`
        (function(){
          if (window.__laudsKbd) { return; }
          window.__laudsKbd = true;
          function pm(){ return document.querySelector('.ProseMirror'); }
          function focused(p){ return p && (document.activeElement === p || p.contains(document.activeElement)); }
          document.addEventListener('click', function(e){
            var p = pm();
            if (p && !focused(p)) { p.focus(); }
            // Tapping an inline image reports its position so RN can show the
            // per-photo action buttons; tapping elsewhere clears them.
            if (window.ReactNativeWebView) {
              var target = e.target;
              if (target && target.tagName === 'IMG') {
                var rect = target.getBoundingClientRect();
                var imgs = (pm() || document).querySelectorAll('img');
                var index = Array.prototype.indexOf.call(imgs, target);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'laudsImageTap', payload: { top: rect.top, index: index } }));
              } else {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'laudsImageTapClear' }));
              }
            }
          }, true);
        })();
      `);
    }, [editor, placeholder]);

    useEffect(() => {
      if (text !== undefined && html !== undefined) {
        onChange({text, html});
      }
    }, [text, html, onChange]);

    // Never let the note end on an image. ProseMirror can't reliably place a
    // text cursor after a trailing block image (this build's gapcursor is
    // flaky), so if the document ends with an image — e.g. the user deleted the
    // paragraph after it — restore a trailing paragraph and drop the cursor in
    // it so typing always continues after the photo.
    const trailingFixRef = useRef(false);
    useEffect(() => {
      if (html === undefined) {
        return;
      }
      if (/<img[^>]*>\s*$/i.test(html)) {
        if (trailingFixRef.current) {
          return;
        }
        trailingFixRef.current = true;
        editor.setContent(`${html}<p></p>`);
        setTimeout(() => {
          editor.focus('end');
          trailingFixRef.current = false;
        }, 60);
      } else {
        trailingFixRef.current = false;
      }
    }, [html, editor]);

    useImperativeHandle(ref, () => ({
      getContent: async () => {
        const [currentText, currentHtml] = await Promise.all([editor.getText(), editor.getHTML()]);
        return {text: currentText, html: currentHtml};
      },
      focus: () => editor.focus(),
      blur: () => editor.blur(),
      undo: () => editor.undo(),
      redo: () => editor.redo(),
      appendPlainText: async (appended: string) => {
        const trimmed = appended.trim();
        if (!trimmed) {
          return;
        }
        const paragraphs = trimmed
          .split('\n')
          .map(line => `<p>${escapeHtmlText(line) || '<br>'}</p>`)
          .join('');
        const current = await editor.getHTML();
        editor.setContent(`${current}${paragraphs}`);
      },
      setPlainText: (next: string) => {
        const paragraphs = next
          .split('\n')
          .map(line => `<p>${escapeHtmlText(line) || '<br>'}</p>`)
          .join('') || '<p></p>';
        editor.setContent(paragraphs);
      },
      insertImage: async (uri: string, originalUri?: string) => {
        const src = uri.startsWith('/') ? `file://${uri}` : uri;
        // title carries the original full-res file path (preserved by TipTap's
        // image node, unlike a custom data-* attr). Append the image then an
        // empty paragraph so the cursor always has a line below it.
        const titleAttr = originalUri ? ` title="${originalUri}"` : '';
        const current = await editor.getHTML();
        editor.setContent(`${current}<img src="${src}"${titleAttr}><p></p>`);
        setTimeout(() => editor.focus('end'), 50);
      },
      getImageSrcAtIndex: async (index: number) => {
        const current = await editor.getHTML();
        const tags = current.match(/<img[^>]*>/gi) ?? [];
        const srcMatch = tags[index]?.match(/src="([^"]*)"/i);
        return srcMatch?.[1];
      },
      getImageOriginalAtIndex: async (index: number) => {
        const current = await editor.getHTML();
        const tags = current.match(/<img[^>]*>/gi) ?? [];
        const titleMatch = tags[index]?.match(/title="([^"]*)"/i);
        return titleMatch?.[1];
      },
      replaceImageAtIndex: async (index: number, uri: string) => {
        const current = await editor.getHTML();
        let i = -1;
        const next = current.replace(/<img[^>]*>/gi, match => {
          i += 1;
          if (i !== index) {
            return match;
          }
          // Update only src; keep title (the original-file link) and other attrs.
          return /src="[^"]*"/i.test(match)
            ? match.replace(/src="[^"]*"/i, `src="${uri}"`)
            : match.replace(/<img/i, `<img src="${uri}"`);
        });
        editor.setContent(next);
      },
    }), [editor]);

    // Pin the toolbar flush on top of the keyboard with no hardcoded insets.
    // We measure where this container's bottom edge actually is on screen, and
    // where the keyboard's top edge actually is (endCoordinates.screenY), and
    // place the toolbar at the difference. On Android the window already
    // resizes above the keyboard (adjustResize), so it stays at bottom: 0.
    const containerRef = useRef<View>(null);
    const containerBottomRef = useRef(0);
    const [toolbarBottom, setToolbarBottom] = useState(0);

    const recomputeToolbarBottom = (keyboardTopY: number) => {
      if (Platform.OS !== 'ios') {
        setToolbarBottom(0);
        return;
      }
      if (keyboardTopY <= 0) {
        setToolbarBottom(0);
        return;
      }
      setToolbarBottom(Math.max(0, containerBottomRef.current - keyboardTopY));
    };

    useEffect(() => {
      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
      const showSub = Keyboard.addListener(showEvent, event => {
        const keyboardTopY = event.endCoordinates?.screenY ?? 0;
        containerRef.current?.measureInWindow((_x, y, _w, height) => {
          containerBottomRef.current = y + height;
          recomputeToolbarBottom(keyboardTopY);
        });
        recomputeToolbarBottom(keyboardTopY);
      });
      const hideSub = Keyboard.addListener(hideEvent, () => setToolbarBottom(0));
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    return (
      <View
        ref={containerRef}
        style={styles.container}
        onLayout={() => {
          containerRef.current?.measureInWindow((_x, y, _w, height) => {
            containerBottomRef.current = y + height;
          });
        }}>
        <RichText
          editor={editor}
          style={styles.webview}
          exclusivelyUseCustomOnMessage={false}
          onMessage={event => {
            try {
              const message = JSON.parse(event.nativeEvent.data);
              if (message?.type === 'laudsImageTap') {
                tappedImageIndexRef.current = typeof message.payload?.index === 'number' && message.payload.index >= 0 ? message.payload.index : 0;
                setTappedImageTop(typeof message.payload?.top === 'number' ? message.payload.top : 0);
              } else if (message?.type === 'laudsImageTapClear') {
                setTappedImageTop(null);
              }
            } catch {
              // Non-JSON or TenTap-internal messages: ignore.
            }
          }}
        />
        {tappedImageTop !== null ? (
          <View style={[styles.imageActions, {top: Math.max(8, tappedImageTop + 8)}]}>
            <TouchableOpacity
              accessibilityLabel="Crop photo"
              accessibilityRole="button"
              onPress={() => {
                const index = tappedImageIndexRef.current;
                setTappedImageTop(null);
                onCropImage?.(index);
              }}
              style={styles.imageActionButton}>
              <Text style={styles.imageActionText}>Crop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Extract text from photo"
              accessibilityRole="button"
              onPress={() => {
                const index = tappedImageIndexRef.current;
                setTappedImageTop(null);
                onExtractImage?.(index);
              }}
              style={styles.imageActionButton}>
              <Text style={styles.imageActionText}>Extract</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {toolbarHidden ? null : (
          <View style={[styles.toolbarShell, {bottom: toolbarBottom}]}>
            <RichJournalToolbar editor={editor} />
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.parchment,
    flex: 1,
  },
  webview: {
    backgroundColor: theme.colors.parchment,
    flex: 1,
  },
  toolbarShell: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  imageActions: {
    alignItems: 'flex-end',
    gap: 6,
    position: 'absolute',
    right: 10,
  },
  imageActionButton: {
    backgroundColor: theme.colors.shield,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  imageActionText: {
    color: theme.colors.parchment,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
  },
});
