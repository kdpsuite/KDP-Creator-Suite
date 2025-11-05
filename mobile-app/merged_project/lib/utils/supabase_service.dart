import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:kdp_creator_suite/lib\theme\app_theme.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();
  late final SupabaseClient _client;
  bool _isInitialized = false;
  final Future<void> _initFuture;

  // Singleton pattern
  factory SupabaseService() {
    return _instance;
  }

  SupabaseService._internal() : _initFuture = _initializeSupabase();

  static const String supabaseUrl =
      String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static const String supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  // Internal initialization logic
  static Future<void> _initializeSupabase() async {
    if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
      throw Exception(
          'SUPABASE_URL and SUPABASE_ANON_KEY must be defined using --dart-define.');
    }

    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );

    _instance._client = Supabase.instance.client;
    _instance._isInitialized = true;
  }

  // Client getter (async)
  Future<SupabaseClient> get client async {
    if (!_isInitialized) {
      await _initFuture;
    }
    return _client;
  }

  // Synchronous client getter (use only after initialization)
  SupabaseClient get syncClient {
    if (!_isInitialized) {
      throw Exception(
          'SupabaseService not initialized. Call client getter first.');
    }
    return _client;
  }

  // Auth state stream
  Stream<AuthState> get authStateChanges {
    return _client.auth.onAuthStateChange;
  }

  // Current user getter
  User? get currentUser => _client.auth.currentUser;

  // Auth status
  bool get isAuthenticated => _client.auth.currentUser != null;
}
