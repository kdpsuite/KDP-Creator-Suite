import 'package:flutter/material.dart';
import '../presentation/onboarding_flow/onboarding_flow.dart';
import '../presentation/pdf_import/pdf_import.dart';
import '../presentation/settings/settings.dart';
import '../presentation/format_selection/format_selection.dart';
import '../presentation/project_library/project_library.dart';
import '../presentation/amazon_kdp_integration/amazon_kdp_integration.dart';
import '../presentation/cloud_export/cloud_export_screen.dart';

class AppRoutes {
  // TODO: Add your routes here
  static const String initial = '/';
  static const String onboardingFlow = '/onboarding-flow';
  static const String pdfImport = '/pdf-import';
  static const String settings = '/settings';
  static const String formatSelection = '/format-selection';
  static const String projectLibrary = '/project-library';
  static const String amazonKdpIntegration = '/amazon-kdp-integration';
  static const String cloudExport = '/cloud-export';

  static Map<String, WidgetBuilder> routes = {
    initial: (context) => const OnboardingFlow(),
    onboardingFlow: (context) => const OnboardingFlow(),
    pdfImport: (context) => const PdfImport(),
    settings: (context) => const Settings(),
    formatSelection: (context) => const FormatSelection(),
    projectLibrary: (context) => const ProjectLibrary(),
    amazonKdpIntegration: (context) => const AmazonKdpIntegration(),
    cloudExport: (context) => const CloudExportScreen(),
    // TODO: Add your other routes here
  };
}
