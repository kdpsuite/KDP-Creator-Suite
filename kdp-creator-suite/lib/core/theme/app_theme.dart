import 'package:flutter/material.dart';

/// Centralized theme for the KDP Creator Suite platform
class AppTheme {
  AppTheme._(); // Private constructor to prevent instantiation

  /// Light theme
  static final lightTheme = ThemeData(
    brightness: Brightness.light,
    primaryColor: const Color(0xFF1E88E5), // Platform primary color
    scaffoldBackgroundColor: Colors.white,
    colorScheme: ColorScheme.light(
      primary: const Color(0xFF1E88E5),        // Primary color
      secondary: const Color(0xFF43A047),      // Secondary / accent color
      background: Colors.white,                // Background color
      surface: Colors.white,                   // Card / surface color
      outline: const Color(0xFFBDBDBD),        // Outline / border color
      onPrimary: Colors.white,                 // Text on primary
      onSecondary: Colors.white,               // Text on secondary
      onBackground: Colors.black,              // Text on background
      onSurface: Colors.black,                 // Text on surface
      onError: Colors.white,                   // Text on error
      error: Colors.redAccent,                 // Error color
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF1E88E5),
      foregroundColor: Colors.white,
      elevation: 2,
    ),
    buttonTheme: const ButtonThemeData(
      buttonColor: Color(0xFF43A047),
      textTheme: ButtonTextTheme.primary,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF43A047),
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderSide: BorderSide(color: const Color(0xFFBDBDBD)),
        borderRadius: BorderRadius.circular(8),
      ),
    ),
  );

  /// Dark theme (optional, can add later)
  static final darkTheme = ThemeData(
    brightness: Brightness.dark,
    primaryColor: const Color(0xFF1E88E5),
    scaffoldBackgroundColor: const Color(0xFF121212),
    colorScheme: ColorScheme.dark(
      primary: const Color(0xFF1E88E5),
      secondary: const Color(0xFF43A047),
      background: const Color(0xFF121212),
      surface: const Color(0xFF1E1E1E),
      outline: const Color(0xFF616161),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onBackground: Colors.white,
      onSurface: Colors.white,
      onError: Colors.white,
      error: Colors.redAccent,
    ),
  );
}
