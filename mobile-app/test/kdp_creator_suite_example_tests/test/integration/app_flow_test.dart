import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:kdp_creator_suite/main.dart' as app;

// NOTE: This test requires a running application instance and a mocked or real backend.
// It is designed to be run with `flutter test integration_test/app_flow_test.dart`

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('End-to-End App Flow Test', () {
    testWidgets('User login and access to PDF Conversion feature', (WidgetTester tester) async {
      // Start the application
      app.main();
      await tester.pumpAndSettle();

      // 1. Verify we are on the Login Screen
      expect(find.text('Login'), findsOneWidget);

      // 2. Enter credentials (assuming a known test user)
      final emailField = find.byKey(const ValueKey('emailField'));
      final passwordField = find.byKey(const ValueKey('passwordField'));
      final loginButton = find.byKey(const ValueKey('loginButton'));

      await tester.enterText(emailField, 'testuser@kdpsuite.com');
      await tester.enterText(passwordField, 'securepassword');
      await tester.tap(loginButton);
      await tester.pumpAndSettle(); // Wait for navigation and data fetching

      // 3. Verify successful navigation to the Dashboard
      expect(find.text('Welcome, Test User'), findsOneWidget);
      expect(find.text('Dashboard'), findsOneWidget);

      // 4. Navigate to the PDF Conversion Feature
      final conversionTab = find.byIcon(Icons.picture_as_pdf);
      await tester.tap(conversionTab);
      await tester.pumpAndSettle();

      // 5. Verify the PDF Conversion screen is accessible
      expect(find.text('PDF Conversion Suite'), findsOneWidget);
      expect(find.byKey(const ValueKey('uploadPdfButton')), findsOneWidget);

      // 6. Check for a subscription-gated feature (e.g., Batch Processing)
      // This assumes a Pro/Studio user is logged in.
      expect(find.text('Batch Processing'), findsOneWidget);
      
      // If we were testing a Free user, we would check for a "Upgrade to Pro" button
      // expect(find.text('Upgrade to Pro for Batch Processing'), findsOneWidget);
    });
  });
}
