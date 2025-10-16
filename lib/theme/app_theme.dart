import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';

class AppTheme {
  static final ThemeData lightTheme = ThemeData.light().copyWith(
    colorScheme: const ColorScheme.light(),
  );

  static final ThemeData darkTheme = ThemeData.dark().copyWith(
    colorScheme: const ColorScheme.dark(),
  );
}
