import 'dart:io' if (dart.library.io) 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'package:flutter_tesseract_ocr/flutter_tesseract_ocr.dart';
import 'package:crypto/crypto.dart';
import 'package:uuid/uuid.dart';
import '../utils/supabase_service.dart';
import 'package:kdp_creator_suite/lib\theme\app_theme.dart';

class PdfProcessingService {
  static final PdfProcessingService _instance =
      PdfProcessingService._internal();
  factory PdfProcessingService() => _instance;
  PdfProcessingService._internal();

  final SupabaseService _supabaseService = SupabaseService();
  final Uuid _uuid = const Uuid();

  // Enhanced PDF Processing Options
  static const Map<String, Map<String, dynamic>> processingProfiles = {
    'kindle': {
      'dpi': 150,
      'compression': 'medium',
      'font_embedding': true,
      'reflowable': true,
      'image_optimization': true,
      'layout_preservation': false,
    },
    'epub': {
      'dpi': 150,
      'compression': 'medium',
      'font_embedding': true,
      'reflowable': true,
      'image_optimization': true,
      'layout_preservation': false,
    },
    'mobi': {
      'dpi': 150,
      'compression': 'high',
      'font_embedding': false,
      'reflowable': true,
      'image_optimization': true,
      'layout_preservation': false,
    },
    'paperback': {
      'dpi': 300,
      'compression': 'low',
      'font_embedding': true,
      'reflowable': false,
      'image_optimization': false,
      'layout_preservation': true,
    },
    'hardcover': {
      'dpi': 300,
      'compression': 'none',
      'font_embedding': true,
      'reflowable': false,
      'image_optimization': false,
      'layout_preservation': true,
    },
    'coloring_book': {
      'dpi': 300,
      'compression': 'none',
      'font_embedding': false,
      'reflowable': false,
      'image_optimization': false,
      'layout_preservation': true,
      'line_enhancement': true,
    },
  };

  // Enhanced PDF Text Extraction with OCR Support
  Future<Map<String, dynamic>> extractTextWithOCR(
    Uint8List pdfBytes, {
    bool useOCR = false,
    String ocrLanguage = 'eng',
    Map<String, dynamic>? options,
  }) async {
    try {
      final stopwatch = Stopwatch()..start();

      // Load PDF document
      final PdfDocument document = PdfDocument(inputBytes: pdfBytes);
      final List<Map<String, dynamic>> pageData = [];
      final Set<String> detectedLanguages = {};
      bool containsScannedContent = false;

      for (int i = 0; i < document.pages.count; i++) {
        final page = document.pages[i];
        String extractedText = '';
        List<Map<String, dynamic>> images = [];

        // Extract text using Syncfusion
        extractedText = PdfTextExtractor(document)
            .extractText(startPageIndex: i, endPageIndex: i);

        // Check if page might be scanned (little to no text)
        bool isScannedPage = extractedText.trim().length < 50;

        if (useOCR && (isScannedPage || extractedText.isEmpty)) {
          containsScannedContent = true;

          // Render page as image for OCR
          final pageImage = await _renderPageAsImage(document, i);
          if (pageImage != null) {
            try {
              // Perform OCR on the page image
              final ocrText = await FlutterTesseractOcr.extractText(
                pageImage.path,
                language: ocrLanguage,
                args: {
                  "preserve_interword_spaces": "1",
                  "psm": "6",
                  "oem": "3",
                },
              );

              if (ocrText.isNotEmpty) {
                extractedText = ocrText;
                detectedLanguages.add(ocrLanguage);
              }
            } catch (ocrError) {
              print('OCR failed for page $i: $ocrError');
            }
          }
        }

        // Extract images from page
        final pageImages = _extractImagesFromPage(page);
        images.addAll(pageImages);

        pageData.add({
          'page_number': i + 1,
          'text': extractedText,
          'word_count': extractedText.split(RegExp(r'\s+')).length,
          'character_count': extractedText.length,
          'images': images,
          'is_scanned': isScannedPage,
          'has_images': images.isNotEmpty,
        });
      }

      document.dispose();
      stopwatch.stop();

      // Calculate overall statistics
      final totalText = pageData.map((p) => p['text'] as String).join(' ');
      final totalWords = totalText.split(RegExp(r'\s+')).length;
      final totalImages = pageData.fold<int>(
          0, (sum, page) => sum + (page['images'] as List).length);

      return {
        'success': true,
        'pages': pageData,
        'statistics': {
          'total_pages': document.pages.count,
          'total_words': totalWords,
          'total_characters': totalText.length,
          'total_images': totalImages,
          'processing_time_ms': stopwatch.elapsedMilliseconds,
          'contains_scanned_content': containsScannedContent,
          'detected_languages': detectedLanguages.toList(),
          'average_words_per_page': totalWords / document.pages.count,
        },
        'metadata': {
          'extraction_method': useOCR ? 'hybrid_with_ocr' : 'standard',
          'ocr_language': ocrLanguage,
          'quality_score': _calculateExtractionQuality(pageData),
        },
      };
    } catch (error) {
      return {
        'success': false,
        'error': 'Text extraction failed: $error',
        'pages': [],
        'statistics': {},
      };
    }
  }

  // Advanced Image Optimization
  Future<Uint8List> optimizeImages(
    Uint8List pdfBytes,
    String targetFormat, {
    int? targetDpi,
    int? qualityLevel,
    bool reduceColorDepth = false,
  }) async {
    try {
      final document = PdfDocument(inputBytes: pdfBytes);
      final profile =
          processingProfiles[targetFormat] ?? processingProfiles['kindle']!;

      final dpi = targetDpi ?? profile['dpi'] as int;
      final compression = profile['compression'] as String;
      final shouldOptimize = profile['image_optimization'] as bool;

      if (!shouldOptimize) {
        document.dispose();
        return pdfBytes;
      }

      // Create new PDF with optimized images
      final optimizedDocument = PdfDocument();

      for (int i = 0; i < document.pages.count; i++) {
        final sourcePage = document.pages[i];
        final newPage = optimizedDocument.pages.add();

        // Copy page content and optimize images
        await _copyPageWithOptimizedImages(
          sourcePage,
          newPage,
          dpi: dpi,
          compression: compression,
          qualityLevel: qualityLevel,
          reduceColorDepth: reduceColorDepth,
        );
      }

      final optimizedBytes = Uint8List.fromList(await optimizedDocument.save());
      document.dispose();
      optimizedDocument.dispose();

      return optimizedBytes;
    } catch (error) {
      throw Exception('Image optimization failed: $error');
    }
  }

  // Enhanced Format Conversion
  Future<Map<String, dynamic>> convertToFormat(
    Uint8List pdfBytes,
    String targetFormat, {
    Map<String, dynamic>? customSettings,
    void Function(double)? onProgress,
  }) async {
    try {
      onProgress?.call(0.1);

      final profile = {
        ...processingProfiles[targetFormat] ?? processingProfiles['kindle']!,
        ...customSettings ?? {},
      };

      onProgress?.call(0.2);

      // Extract text and structure
      final extractionResult = await extractTextWithOCR(
        pdfBytes,
        useOCR: profile['use_ocr'] ?? false,
      );

      onProgress?.call(0.4);

      late Uint8List convertedBytes;
      late String fileExtension;

      switch (targetFormat) {
        case 'kindle':
        case 'epub':
          convertedBytes =
              await _convertToEPUB(pdfBytes, extractionResult, profile);
          fileExtension = targetFormat == 'kindle' ? 'azw3' : 'epub';
          break;
        case 'mobi':
          convertedBytes =
              await _convertToMOBI(pdfBytes, extractionResult, profile);
          fileExtension = 'mobi';
          break;
        case 'coloring_book':
          convertedBytes = await _convertToColoringBook(pdfBytes, profile);
          fileExtension = 'pdf';
          break;
        case 'paperback':
        case 'hardcover':
          convertedBytes =
              await _convertToPrintFormat(pdfBytes, targetFormat, profile);
          fileExtension = 'pdf';
          break;
        default:
          throw Exception('Unsupported format: $targetFormat');
      }

      onProgress?.call(0.8);

      // Generate file hash for integrity checking
      final hash = sha256.convert(convertedBytes).toString();
      final fileId = _uuid.v4();

      onProgress?.call(1.0);

      return {
        'success': true,
        'file_id': fileId,
        'bytes': convertedBytes,
        'file_extension': fileExtension,
        'file_size_mb': convertedBytes.length / (1024 * 1024),
        'hash': hash,
        'conversion_metadata': {
          'target_format': targetFormat,
          'profile_used': profile,
          'source_pages': extractionResult['statistics']['total_pages'],
          'processing_time': DateTime.now().millisecondsSinceEpoch,
        },
      };
    } catch (error) {
      return {
        'success': false,
        'error': 'Format conversion failed: $error',
      };
    }
  }

  // Batch Processing with Progress Tracking
  Future<Map<String, dynamic>> processBatch(
    List<Uint8List> pdfFiles,
    List<String> targetFormats, {
    Map<String, dynamic>? globalSettings,
    void Function(double, String)? onProgress,
  }) async {
    try {
      final results = <String, dynamic>{};
      final totalOperations = pdfFiles.length * targetFormats.length;
      int completedOperations = 0;

      for (int fileIndex = 0; fileIndex < pdfFiles.length; fileIndex++) {
        final pdfBytes = pdfFiles[fileIndex];
        final fileResults = <String, dynamic>{};

        for (final format in targetFormats) {
          onProgress?.call(
            completedOperations / totalOperations,
            'Processing file ${fileIndex + 1}/${pdfFiles.length} - Format: $format',
          );

          final conversionResult = await convertToFormat(
            pdfBytes,
            format,
            customSettings: globalSettings,
          );

          fileResults[format] = conversionResult;
          completedOperations++;
        }

        results['file_$fileIndex'] = fileResults;
      }

      // Create ZIP archive if multiple files
      if (pdfFiles.length > 1) {
        final archiveBytes = await _createBatchArchive(results);
        results['batch_archive'] = {
          'bytes': archiveBytes,
          'filename':
              'batch_conversion_${DateTime.now().millisecondsSinceEpoch}.zip',
        };
      }

      onProgress?.call(1.0, 'Batch processing completed');

      return {
        'success': true,
        'results': results,
        'summary': {
          'files_processed': pdfFiles.length,
          'formats_generated': targetFormats.length,
          'total_conversions': totalOperations,
          'completed_at': DateTime.now().toIso8601String(),
        },
      };
    } catch (error) {
      return {
        'success': false,
        'error': 'Batch processing failed: $error',
      };
    }
  }

  // Quality Control and Validation
  Future<Map<String, dynamic>> validateConversion(
    Uint8List originalBytes,
    Uint8List convertedBytes,
    String targetFormat,
  ) async {
    try {
      final originalDoc = PdfDocument(inputBytes: originalBytes);
      final issues = <String>[];
      final warnings = <String>[];
      double qualityScore = 100.0;

      // Basic validation
      if (convertedBytes.isEmpty) {
        issues.add('Converted file is empty');
        qualityScore -= 50;
      }

      // Page count validation for PDF formats
      if (targetFormat.contains('pdf') ||
          targetFormat == 'paperback' ||
          targetFormat == 'hardcover') {
        try {
          final convertedDoc = PdfDocument(inputBytes: convertedBytes);
          if (convertedDoc.pages.count != originalDoc.pages.count) {
            warnings.add(
                'Page count mismatch: ${originalDoc.pages.count} → ${convertedDoc.pages.count}');
            qualityScore -= 10;
          }
          convertedDoc.dispose();
        } catch (e) {
          issues.add('Cannot read converted PDF');
          qualityScore -= 30;
        }
      }

      // File size validation
      final originalSizeMB = originalBytes.length / (1024 * 1024);
      final convertedSizeMB = convertedBytes.length / (1024 * 1024);
      final sizeRatio = convertedSizeMB / originalSizeMB;

      if (sizeRatio > 3.0) {
        warnings.add('Converted file is significantly larger than original');
        qualityScore -= 5;
      } else if (sizeRatio < 0.1) {
        warnings.add('Converted file might have lost significant content');
        qualityScore -= 15;
      }

      originalDoc.dispose();

      return {
        'success': true,
        'quality_score': qualityScore,
        'issues': issues,
        'warnings': warnings,
        'file_sizes': {
          'original_mb': originalSizeMB,
          'converted_mb': convertedSizeMB,
          'size_ratio': sizeRatio,
        },
        'is_valid': issues.isEmpty,
        'recommendations':
            _generateQualityRecommendations(qualityScore, issues, warnings),
      };
    } catch (error) {
      return {
        'success': false,
        'error': 'Validation failed: $error',
        'is_valid': false,
      };
    }
  }

  // Private helper methods
  Future<File?> _renderPageAsImage(PdfDocument document, int pageIndex) async {
    try {
      if (kIsWeb) return null; // OCR not supported on web

      // This would need platform-specific implementation
      // For now, return null to skip OCR on unsupported platforms
      return null;
    } catch (error) {
      return null;
    }
  }

  List<Map<String, dynamic>> _extractImagesFromPage(PdfPage page) {
    // Extract images from PDF page
    final images = <Map<String, dynamic>>[];

    try {
      // This would require more complex PDF parsing
      // For now, return empty list
      return images;
    } catch (error) {
      return images;
    }
  }

  double _calculateExtractionQuality(List<Map<String, dynamic>> pageData) {
    if (pageData.isEmpty) return 0.0;

    double totalScore = 0.0;
    for (final page in pageData) {
      final text = page['text'] as String;
      final wordCount = page['word_count'] as int;

      // Basic quality metrics
      double pageScore = 100.0;

      if (text.isEmpty) {
        pageScore = 0.0;
      } else if (wordCount < 10) {
        pageScore = 30.0;
      } else if (wordCount < 50) {
        pageScore = 60.0;
      }

      totalScore += pageScore;
    }

    return totalScore / pageData.length;
  }

  Future<void> _copyPageWithOptimizedImages(
    PdfPage sourcePage,
    PdfPage targetPage, {
    required int dpi,
    required String compression,
    int? qualityLevel,
    bool reduceColorDepth = false,
  }) async {
    // Implementation would involve complex PDF content copying
    // For now, this is a placeholder
  }

  Future<Uint8List> _convertToEPUB(
    Uint8List pdfBytes,
    Map<String, dynamic> extractionResult,
    Map<String, dynamic> profile,
  ) async {
    // EPUB conversion implementation
    // This would require a comprehensive EPUB library or custom implementation
    throw UnimplementedError(
        'EPUB conversion will be implemented in future versions');
  }

  Future<Uint8List> _convertToMOBI(
    Uint8List pdfBytes,
    Map<String, dynamic> extractionResult,
    Map<String, dynamic> profile,
  ) async {
    // MOBI conversion implementation
    throw UnimplementedError(
        'MOBI conversion will be implemented in future versions');
  }

  Future<Uint8List> _convertToColoringBook(
    Uint8List pdfBytes,
    Map<String, dynamic> profile,
  ) async {
    try {
      final document = PdfDocument(inputBytes: pdfBytes);
      final coloringDocument = PdfDocument();

      for (int i = 0; i < document.pages.count; i++) {
        final sourcePage = document.pages[i];
        final coloringPage = coloringDocument.pages.add();

        // Apply coloring book processing (edge detection, line enhancement)
        // This would require image processing algorithms
      }

      final bytes = Uint8List.fromList(await coloringDocument.save());
      document.dispose();
      coloringDocument.dispose();

      return bytes;
    } catch (error) {
      throw Exception('Coloring book conversion failed: $error');
    }
  }

  Future<Uint8List> _convertToPrintFormat(
    Uint8List pdfBytes,
    String format,
    Map<String, dynamic> profile,
  ) async {
    try {
      final document = PdfDocument(inputBytes: pdfBytes);

      // Apply print-specific formatting
      // - Adjust margins for binding
      // - Set appropriate DPI
      // - Ensure color profiles are correct

      final bytes = Uint8List.fromList(await document.save());
      document.dispose();

      return bytes;
    } catch (error) {
      throw Exception('Print format conversion failed: $error');
    }
  }

  Future<Uint8List> _createBatchArchive(Map<String, dynamic> results) async {
    try {
      final files = <String, Uint8List>{};

      results.forEach((fileKey, fileResults) {
        if (fileKey.startsWith('file_')) {
          final fileIndex = fileKey.split('_')[1];
          (fileResults as Map<String, dynamic>).forEach((format, result) {
            if (result['success'] == true) {
              final bytes = result['bytes'] as Uint8List;
              final extension = result['file_extension'] as String;
              files['${fileIndex}_$format.$extension'] = bytes;
            }
          });
        }
      });

      // Create ZIP archive
      if (kIsWeb) {
        // Web implementation would use different approach
        throw UnimplementedError('Batch archive creation not supported on web');
      } else {
        // Mobile implementation using flutter_archive
        throw UnimplementedError('Archive creation will be implemented');
      }
    } catch (error) {
      throw Exception('Archive creation failed: $error');
    }
  }

  List<String> _generateQualityRecommendations(
    double qualityScore,
    List<String> issues,
    List<String> warnings,
  ) {
    final recommendations = <String>[];

    if (qualityScore < 50) {
      recommendations.add('Consider using OCR for better text extraction');
      recommendations
          .add('Check if source PDF is corrupted or password-protected');
    } else if (qualityScore < 80) {
      recommendations
          .add('Review conversion settings for better output quality');
      recommendations.add('Consider manual review of converted content');
    }

    if (issues.any((issue) => issue.contains('empty'))) {
      recommendations.add('Verify source PDF contains readable content');
    }

    if (warnings.any((warning) => warning.contains('size'))) {
      recommendations.add('Adjust compression settings to optimize file size');
    }

    return recommendations;
  }
}