// Extracted from Prayer First / Lauds. Provides on-device photo capture/pick
// + Vision OCR + a temp-file writer used by the rich text editor's photo
// flow (insert / crop / re-extract). No network/cloud OCR included.
//
// Setup in your other project:
// 1. Add this file to your Xcode project (drag into the app target).
// 2. Add `#import <PhotosUI/PhotosUI.h>` support — PhotosUI.framework should
//    already be available; no extra linking needed on modern Xcode.
// 3. Add an NSCameraUsageDescription and NSPhotoLibraryUsageDescription (or
//    NSPhotoLibraryAddUsageDescription as needed) to Info.plist.
// 4. Module name exposed to JS is "JournalMediaBridge" (matches
//    journalMediaBridge.ts in this export).

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <Vision/Vision.h>
#import <PhotosUI/PhotosUI.h>
#import <MobileCoreServices/MobileCoreServices.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>

static NSArray<NSString *> *JournalMediaDiagnostics(NSString *message)
{
  return message.length > 0 ? @[message] : @[];
}

@interface JournalMediaBridge : NSObject <RCTBridgeModule, PHPickerViewControllerDelegate, UIImagePickerControllerDelegate, UINavigationControllerDelegate>

@property (nonatomic, copy, nullable) RCTPromiseResolveBlock journalMediaResolve;
@property (nonatomic, copy, nullable) RCTPromiseRejectBlock journalMediaReject;
@property (nonatomic, strong, nullable) PHPickerViewController *journalMediaPicker;
@property (nonatomic, strong, nullable) UIImagePickerController *journalCameraPicker;

@end

@implementation JournalMediaBridge

RCT_EXPORT_MODULE(JournalMediaBridge)

// Runs the phone's on-device Vision OCR on a base64-encoded image (e.g. a
// photo already placed in a note) and returns the recognized text.
RCT_EXPORT_METHOD(extractTextFromImageBase64:(NSString *)base64 resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  NSData *data = [[NSData alloc] initWithBase64EncodedString:base64 ?: @"" options:NSDataBase64DecodingIgnoreUnknownCharacters];
  UIImage *image = [UIImage imageWithData:data];
  if (image == nil) {
    reject(@"ERR_IMAGE_DECODE", @"Could not decode the image data.", nil);
    return;
  }
  [self extractTextFromImage:image completion:^(NSString *ocrText, NSString *ocrStatus, NSArray<NSString *> *ocrDiagnostics) {
    resolve(@{
      @"ocrText": ocrText ?: @"",
      @"ocrStatus": ocrStatus ?: @"unknown",
      @"diagnostics": ocrDiagnostics ?: @[],
    });
  }];
}

// Writes a base64-encoded image to an app-local temp file and returns its
// file URL, so an inline (data-URI) photo can be handed to a native image
// cropper such as react-native-image-crop-picker.
RCT_EXPORT_METHOD(writeTempImageFromBase64:(NSString *)base64 resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  NSData *data = [[NSData alloc] initWithBase64EncodedString:base64 ?: @"" options:NSDataBase64DecodingIgnoreUnknownCharacters];
  if (data.length == 0) {
    reject(@"ERR_IMAGE_DECODE", @"Could not decode the image data.", nil);
    return;
  }
  NSString *fileName = [NSString stringWithFormat:@"journal-crop-%@.jpg", [[NSUUID UUID] UUIDString]];
  NSString *path = [NSTemporaryDirectory() stringByAppendingPathComponent:fileName];
  NSError *writeError = nil;
  if (![data writeToFile:path options:NSDataWritingAtomic error:&writeError]) {
    reject(@"ERR_IMAGE_WRITE", writeError.localizedDescription ?: @"Could not write the image.", writeError);
    return;
  }
  resolve(@{ @"path": [[NSURL fileURLWithPath:path] absoluteString] });
}

RCT_EXPORT_METHOD(attachPhotoAndExtractText:(NSString *)source resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.journalMediaResolve != nil || self.journalMediaReject != nil) {
      reject(@"ERR_PHOTO_PICKER_IN_PROGRESS", @"A journal photo picker is already open.", nil);
      return;
    }

    UIViewController *presentingViewController = RCTPresentedViewController();
    if (presentingViewController == nil) {
      reject(@"ERR_PHOTO_PICKER_UNAVAILABLE", @"Unable to find a view controller for presenting the iOS photo picker.", nil);
      return;
    }

    if ([source isEqualToString:@"camera"]) {
      if (![UIImagePickerController isSourceTypeAvailable:UIImagePickerControllerSourceTypeCamera]) {
        reject(@"ERR_CAMERA_UNAVAILABLE", @"Camera capture is not available on this iOS device or simulator.", nil);
        return;
      }

      UIImagePickerController *camera = [[UIImagePickerController alloc] init];
      camera.sourceType = UIImagePickerControllerSourceTypeCamera;
      camera.mediaTypes = @[UTTypeImage.identifier];
      camera.delegate = self;
      self.journalMediaResolve = resolve;
      self.journalMediaReject = reject;
      self.journalCameraPicker = camera;
      [presentingViewController presentViewController:camera animated:YES completion:nil];
      return;
    }

    PHPickerConfiguration *configuration = [[PHPickerConfiguration alloc] init];
    configuration.filter = [PHPickerFilter imagesFilter];
    configuration.selectionLimit = 1;
    configuration.preferredAssetRepresentationMode = PHPickerConfigurationAssetRepresentationModeCurrent;

    PHPickerViewController *picker = [[PHPickerViewController alloc] initWithConfiguration:configuration];
    picker.delegate = self;
    self.journalMediaResolve = resolve;
    self.journalMediaReject = reject;
    self.journalMediaPicker = picker;

    [presentingViewController presentViewController:picker animated:YES completion:nil];
  });
}

- (void)imagePickerController:(UIImagePickerController *)picker didFinishPickingMediaWithInfo:(NSDictionary<UIImagePickerControllerInfoKey, id> *)info
{
  [picker dismissViewControllerAnimated:YES completion:nil];

  UIImage *image = info[UIImagePickerControllerOriginalImage];
  if (![image isKindOfClass:[UIImage class]]) {
    [self rejectJournalMediaWithCode:@"ERR_CAMERA_CAPTURE_EMPTY" message:@"The iOS camera did not return an image." error:nil];
    return;
  }

  NSData *data = UIImageJPEGRepresentation(image, 0.92);
  if (data.length == 0) {
    [self rejectJournalMediaWithCode:@"ERR_CAMERA_CAPTURE_DATA" message:@"The captured camera image could not be encoded." error:nil];
    return;
  }

  NSError *writeError = nil;
  NSURL *photoURL = [self writeJournalPhotoData:data typeIdentifier:@"public.jpeg" error:&writeError];
  if (photoURL == nil) {
    [self rejectJournalMediaWithCode:@"ERR_CAMERA_CAPTURE_WRITE" message:writeError.localizedDescription ?: @"Unable to copy the captured journal photo into app-local storage." error:writeError];
    return;
  }

  [self extractTextFromImage:image completion:^(NSString *ocrText, NSString *ocrStatus, NSArray<NSString *> *ocrDiagnostics) {
    [self resolveJournalMedia:[self journalMediaResultWithPhotoURL:photoURL
                                                    photoDiagnostic:@"Journal photo captured with iOS camera and copied to an app-local temporary file."
                                                            ocrText:ocrText
                                                          ocrStatus:ocrStatus
                                                     ocrDiagnostics:ocrDiagnostics]];
  }];
}

- (void)imagePickerControllerDidCancel:(UIImagePickerController *)picker
{
  [picker dismissViewControllerAnimated:YES completion:nil];
  [self resolveJournalMedia:@{
    @"diagnostics": JournalMediaDiagnostics(@"Journal camera capture was cancelled."),
  }];
}

- (void)picker:(PHPickerViewController *)picker didFinishPicking:(NSArray<PHPickerResult *> *)results
{
  [picker dismissViewControllerAnimated:YES completion:nil];

  PHPickerResult *result = results.firstObject;
  if (result == nil) {
    [self resolveJournalMedia:@{
      @"diagnostics": JournalMediaDiagnostics(@"Journal photo selection was cancelled."),
    }];
    return;
  }

  NSItemProvider *itemProvider = result.itemProvider;
  NSString *typeIdentifier = [self imageTypeIdentifierFromItemProvider:itemProvider];
  if (typeIdentifier.length == 0) {
    [self rejectJournalMediaWithCode:@"ERR_PHOTO_PICKER_CONTENT" message:@"The selected PhotosUI item did not provide image data." error:nil];
    return;
  }

  __weak typeof(self) weakSelf = self;
  [itemProvider loadDataRepresentationForTypeIdentifier:typeIdentifier completionHandler:^(NSData *data, NSError *error) {
    __strong typeof(weakSelf) self = weakSelf;
    if (self == nil) {
      return;
    }

    if (error != nil) {
      dispatch_async(dispatch_get_main_queue(), ^{
        [self rejectJournalMediaWithCode:@"ERR_PHOTO_PICKER_LOAD" message:error.localizedDescription error:error];
      });
      return;
    }

    if (data.length == 0) {
      dispatch_async(dispatch_get_main_queue(), ^{
        [self rejectJournalMediaWithCode:@"ERR_PHOTO_PICKER_LOAD" message:@"The selected PhotosUI item returned no image data." error:nil];
      });
      return;
    }

    NSError *writeError = nil;
    NSURL *photoURL = [self writeJournalPhotoData:data typeIdentifier:typeIdentifier error:&writeError];
    if (photoURL == nil) {
      dispatch_async(dispatch_get_main_queue(), ^{
        [self rejectJournalMediaWithCode:@"ERR_PHOTO_PICKER_WRITE" message:writeError.localizedDescription ?: @"Unable to copy the selected journal photo into app-local storage." error:writeError];
      });
      return;
    }

    UIImage *image = [UIImage imageWithData:data];
    if (image == nil) {
      dispatch_async(dispatch_get_main_queue(), ^{
        [self resolveJournalMedia:[self journalMediaResultWithPhotoURL:photoURL
                                                       photoDiagnostic:@"Journal photo selected with iOS PhotosUI and copied to an app-local temporary file."
                                                               ocrText:@""
                                                             ocrStatus:@"unavailable"
                                                        ocrDiagnostics:JournalMediaDiagnostics(@"Vision OCR unavailable because the selected image data could not be decoded by UIKit.")]];
      });
      return;
    }

    [self extractTextFromImage:image completion:^(NSString *ocrText, NSString *ocrStatus, NSArray<NSString *> *ocrDiagnostics) {
      [self resolveJournalMedia:[self journalMediaResultWithPhotoURL:photoURL
                                                      photoDiagnostic:@"Journal photo selected with iOS PhotosUI and copied to an app-local temporary file."
                                                              ocrText:ocrText
                                                            ocrStatus:ocrStatus
                                                       ocrDiagnostics:ocrDiagnostics]];
    }];
  }];
}

- (NSDictionary *)journalMediaResultWithPhotoURL:(NSURL *)photoURL
                                  photoDiagnostic:(NSString *)photoDiagnostic
                                          ocrText:(NSString *)ocrText
                                        ocrStatus:(NSString *)ocrStatus
                                   ocrDiagnostics:(NSArray<NSString *> *)ocrDiagnostics
{
  NSMutableDictionary *result = [@{
    @"photoUri": photoURL.absoluteString,
    @"ocrStatus": ocrStatus ?: @"unknown",
  } mutableCopy];
  NSString *trimmedOCRText = [ocrText stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
  if (trimmedOCRText.length > 0) {
    result[@"ocrText"] = ocrText;
  }

  NSMutableArray<NSString *> *diagnostics = [NSMutableArray arrayWithObject:photoDiagnostic ?: @"Journal photo copied to app-local storage."];
  for (NSString *diagnostic in ocrDiagnostics ?: @[]) {
    if ([diagnostic isKindOfClass:[NSString class]] && diagnostic.length > 0) {
      [diagnostics addObject:diagnostic];
    }
  }

  // Downscaled JPEG for inline rendering inside the rich note. WKWebView
  // blocks file:// images, so this is embedded as a base64 data URI instead.
  UIImage *inlineImage = [UIImage imageWithContentsOfFile:photoURL.path];
  if (inlineImage != nil) {
    UIImage *downscaled = [self downscaledImage:inlineImage maxDimension:2400.0];
    NSData *inlineData = UIImageJPEGRepresentation(downscaled, 0.85);
    if (inlineData.length > 0) {
      result[@"inlineImageBase64"] = [inlineData base64EncodedStringWithOptions:0];
    }
  }
  result[@"diagnostics"] = [diagnostics copy];
  return [result copy];
}

- (UIImage *)downscaledImage:(UIImage *)image maxDimension:(CGFloat)maxDimension
{
  CGFloat longestSide = MAX(image.size.width, image.size.height);
  if (longestSide <= maxDimension || longestSide <= 0) {
    return image;
  }
  CGFloat scale = maxDimension / longestSide;
  CGSize targetSize = CGSizeMake(image.size.width * scale, image.size.height * scale);
  UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat defaultFormat];
  format.scale = 1.0;
  UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:targetSize format:format];
  return [renderer imageWithActions:^(UIGraphicsImageRendererContext * _Nonnull context) {
    [image drawInRect:CGRectMake(0, 0, targetSize.width, targetSize.height)];
  }];
}

- (void)extractTextFromImage:(UIImage *)image completion:(void (^)(NSString *ocrText, NSString *ocrStatus, NSArray<NSString *> *diagnostics))completion
{
  if (@available(iOS 13.0, *)) {
    CGImageRef cgImage = image.CGImage;
    if (cgImage == nil) {
      dispatch_async(dispatch_get_main_queue(), ^{
        completion(@"", @"unavailable", JournalMediaDiagnostics(@"Vision OCR unavailable because the journal image has no CGImage backing."));
      });
      return;
    }

    CGImagePropertyOrientation orientation = [self cgImagePropertyOrientationForUIImageOrientation:image.imageOrientation];
    CGImageRetain(cgImage);
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
      VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] init];
      request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
      request.usesLanguageCorrection = YES;
      request.recognitionLanguages = @[@"en-US"];

      VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cgImage orientation:orientation options:@{}];
      NSError *error = nil;
      BOOL performed = [handler performRequests:@[request] error:&error];
      CGImageRelease(cgImage);
      NSMutableArray<NSString *> *lines = [NSMutableArray array];
      if (performed) {
        for (VNRecognizedTextObservation *observation in request.results ?: @[]) {
          VNRecognizedText *candidate = [[observation topCandidates:1] firstObject];
          if (candidate.string.length > 0) {
            [lines addObject:candidate.string];
          }
        }
      }

      NSString *text = [lines componentsJoinedByString:@"\n"];
      NSString *status = @"empty";
      NSString *diagnostic = @"Vision OCR completed; no text was recognized.";
      if (!performed) {
        status = @"failed";
        diagnostic = [NSString stringWithFormat:@"Vision OCR failed: %@.", error.localizedDescription ?: @"unknown error"];
      } else if (text.length > 0) {
        status = @"recognized";
        diagnostic = [NSString stringWithFormat:@"Vision OCR recognized %lu text line(s).", (unsigned long)lines.count];
      }

      dispatch_async(dispatch_get_main_queue(), ^{
        completion(text, status, JournalMediaDiagnostics(diagnostic));
      });
    });
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    completion(@"", @"unavailable", JournalMediaDiagnostics(@"Vision OCR unavailable because text recognition requires iOS 13 or newer."));
  });
}

- (CGImagePropertyOrientation)cgImagePropertyOrientationForUIImageOrientation:(UIImageOrientation)orientation
{
  switch (orientation) {
    case UIImageOrientationDown:
      return kCGImagePropertyOrientationDown;
    case UIImageOrientationLeft:
      return kCGImagePropertyOrientationLeft;
    case UIImageOrientationRight:
      return kCGImagePropertyOrientationRight;
    case UIImageOrientationUpMirrored:
      return kCGImagePropertyOrientationUpMirrored;
    case UIImageOrientationDownMirrored:
      return kCGImagePropertyOrientationDownMirrored;
    case UIImageOrientationLeftMirrored:
      return kCGImagePropertyOrientationLeftMirrored;
    case UIImageOrientationRightMirrored:
      return kCGImagePropertyOrientationRightMirrored;
    case UIImageOrientationUp:
    default:
      return kCGImagePropertyOrientationUp;
  }
}

- (NSString *)imageTypeIdentifierFromItemProvider:(NSItemProvider *)itemProvider
{
  NSArray<NSString *> *preferredTypeIdentifiers = @[
    @"public.jpeg",
    @"public.png",
    @"public.heic",
    @"public.heif",
    @"public.tiff",
  ];

  for (NSString *typeIdentifier in preferredTypeIdentifiers) {
    if ([itemProvider.registeredTypeIdentifiers containsObject:typeIdentifier]) {
      return typeIdentifier;
    }
  }

  for (NSString *typeIdentifier in itemProvider.registeredTypeIdentifiers) {
    UTType *type = [UTType typeWithIdentifier:typeIdentifier];
    if ([type conformsToType:UTTypeImage]) {
      return typeIdentifier;
    }
  }

  return nil;
}

- (NSURL *)writeJournalPhotoData:(NSData *)data typeIdentifier:(NSString *)typeIdentifier error:(NSError **)error
{
  NSFileManager *fileManager = [NSFileManager defaultManager];
  NSURL *supportURL = [fileManager URLForDirectory:NSApplicationSupportDirectory
                                          inDomain:NSUserDomainMask
                                 appropriateForURL:nil
                                            create:YES
                                             error:error];
  if (supportURL == nil) {
    return nil;
  }

  NSURL *directoryURL = [supportURL URLByAppendingPathComponent:@"JournalMedia" isDirectory:YES];
  if (![fileManager createDirectoryAtURL:directoryURL withIntermediateDirectories:YES attributes:nil error:error]) {
    return nil;
  }

  NSString *fileExtension = [self fileExtensionForTypeIdentifier:typeIdentifier];
  NSString *fileName = [NSString stringWithFormat:@"journal-photo-%@.%@", [[NSUUID UUID] UUIDString], fileExtension];
  NSURL *fileURL = [directoryURL URLByAppendingPathComponent:fileName isDirectory:NO];
  if (![data writeToURL:fileURL options:NSDataWritingAtomic error:error]) {
    return nil;
  }

  return fileURL;
}

- (NSString *)fileExtensionForTypeIdentifier:(NSString *)typeIdentifier
{
  UTType *type = [UTType typeWithIdentifier:typeIdentifier];
  NSString *preferredExtension = type.preferredFilenameExtension;
  if (preferredExtension.length > 0) {
    return preferredExtension;
  }

  return @"jpg";
}

- (void)resolveJournalMedia:(NSDictionary *)result
{
  RCTPromiseResolveBlock resolve = self.journalMediaResolve;
  [self clearJournalMediaPromiseState];
  if (resolve != nil) {
    resolve(result);
  }
}

- (void)rejectJournalMediaWithCode:(NSString *)code message:(NSString *)message error:(NSError *)error
{
  RCTPromiseRejectBlock reject = self.journalMediaReject;
  [self clearJournalMediaPromiseState];
  if (reject != nil) {
    reject(code, message, error);
  }
}

- (void)clearJournalMediaPromiseState
{
  self.journalMediaResolve = nil;
  self.journalMediaReject = nil;
  self.journalMediaPicker = nil;
  self.journalCameraPicker = nil;
}

@end
