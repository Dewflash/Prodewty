import {NativeModules, Platform, TurboModuleRegistry} from 'react-native';

// Thin TS wrapper around the native "JournalMediaBridge" module (see
// ios/JournalMediaBridge.m and android/JournalMediaModule.kt in this export).
// Wire up the matching native files in your other project, then this module
// resolves automatically — no further JS changes needed.

export type JournalMediaSource = 'camera' | 'library';

export type JournalMediaResult = {
  photoUri?: string;
  ocrText?: string;
  // Downscaled JPEG (base64, no "data:" prefix) for rendering the photo
  // inline in the rich note — WebViews block file:// images, so this is
  // embedded as a data URI instead (see insertImage in RichJournalEditor).
  inlineImageBase64?: string;
  diagnostics: ReadonlyArray<string>;
};

export type OcrResult = {
  ocrText: string;
  ocrStatus: string;
  diagnostics: ReadonlyArray<string>;
};

type JournalMediaModule = {
  // Opens the camera or photo library, copies the photo to app-local storage,
  // runs on-device OCR (Vision on iOS / ML Kit on Android), and returns it.
  attachPhotoAndExtractText(source?: JournalMediaSource): Promise<JournalMediaResult>;
  // Writes a base64 image to a temp file (so the native image cropper, which
  // wants a file path, can operate on an inline/data-URI photo).
  writeTempImageFromBase64(base64: string): Promise<{path: string}>;
  // Re-runs on-device OCR against a base64 image (e.g. a photo already
  // placed in a note, for the "Extract text" per-photo action).
  extractTextFromImageBase64(base64: string): Promise<OcrResult>;
};

function nativeModule(): Partial<JournalMediaModule> | undefined {
  const turboModule = (
    TurboModuleRegistry as unknown as {get<T extends object>(name: string): T | null}
  ).get<Partial<JournalMediaModule>>('JournalMediaBridge');
  return turboModule ?? (NativeModules.JournalMediaBridge as Partial<JournalMediaModule> | undefined);
}

export function getJournalMediaModule(): JournalMediaModule {
  const native = nativeModule();
  if (!native) {
    throw new Error(
      `JournalMediaBridge native module is not registered on ${Platform.OS}. Add ios/JournalMediaBridge.m (and link it) ` +
        'or android/JournalMediaModule.kt (and register its ReactPackage) from this export, then rebuild.',
    );
  }
  return native as JournalMediaModule;
}
