import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kdp_creator_suite/screens/login_screen.dart';

void main() {
  group('Login Screen Widget Tests', () {
    testWidgets('Login button is disabled when fields are empty', (WidgetTester tester) async {
      // Build the LoginScreen widget
      await tester.pumpWidget(const MaterialApp(home: LoginScreen()));

      // Find the login button
      final loginButton = find.byKey(const ValueKey('loginButton'));

      // Check that the button is present
      expect(loginButton, findsOneWidget);

      // Check that the button is disabled (assuming a disabled button has a null onPressed callback)
      final buttonWidget = tester.widget<ElevatedButton>(loginButton);
      expect(buttonWidget.enabled, isFalse);
    });

    testWidgets('Login button is enabled when fields are valid', (WidgetTester tester) async {
      // Build the LoginScreen widget
      await tester.pumpWidget(const MaterialApp(home: LoginScreen()));

      // Find the email and password fields
      final emailField = find.byKey(const ValueKey('emailField'));
      final passwordField = find.byKey(const ValueKey('passwordField'));
      final loginButton = find.byKey(const ValueKey('loginButton'));

      // Enter valid text into the fields
      await tester.enterText(emailField, 'test@example.com');
      await tester.enterText(passwordField, 'password123');

      // Rebuild the widget after state change
      await tester.pump();

      // Check that the button is now enabled
      final buttonWidget = tester.widget<ElevatedButton>(loginButton);
      expect(buttonWidget.enabled, isTrue);
    });

    testWidgets('Shows error message for invalid email format', (WidgetTester tester) async {
      // Build the LoginScreen widget
      await tester.pumpWidget(const MaterialApp(home: LoginScreen()));

      final emailField = find.byKey(const ValueKey('emailField'));
      final passwordField = find.byKey(const ValueKey('passwordField'));

      // Enter invalid email
      await tester.enterText(emailField, 'invalid-email');
      await tester.enterText(passwordField, 'password123');
      await tester.pump();

      // Expect to find an error message for the email field
      expect(find.text('Enter a valid email'), findsOneWidget);
    });
  });
}

// --- Placeholder for the actual LoginScreen widget ---
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  String _email = '';
  String _password = '';
  String? _emailError;

  void _validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      _emailError = 'Email is required';
    } else if (!value.contains('@')) {
      _emailError = 'Enter a valid email';
    } else {
      _emailError = null;
    }
  }

  bool get _isFormValid {
    _validateEmail(_email);
    return _emailError == null && _password.isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          onChanged: () {
            setState(() {});
          },
          child: Column(
            children: <Widget>[
              TextFormField(
                key: const ValueKey('emailField'),
                decoration: InputDecoration(
                  labelText: 'Email',
                  errorText: _emailError,
                ),
                onChanged: (value) {
                  _email = value;
                  _validateEmail(value);
                },
              ),
              TextFormField(
                key: const ValueKey('passwordField'),
                decoration: const InputDecoration(labelText: 'Password'),
                obscureText: true,
                onChanged: (value) => _password = value,
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                key: const ValueKey('loginButton'),
                onPressed: _isFormValid ? () => print('Logging in...') : null,
                child: const Text('Login'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
