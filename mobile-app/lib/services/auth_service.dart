import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/supabase_service.dart';
import '../models/user_profile.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final SupabaseService _supabaseService = SupabaseService();

  // Auth state stream
  Stream<AuthState> get authStateChanges => _supabaseService.authStateChanges;

  // Current user
  User? get currentUser => _supabaseService.currentUser;

  // Auth status
  bool get isAuthenticated => _supabaseService.isAuthenticated;

  // Sign up with email and password
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    try {
      final client = await _supabaseService.client;
      final response = await client.auth.signUp(
        email: email,
        password: password,
        data: {
          'full_name': fullName,
          'role': 'free',
        },
      );
      return response;
    } catch (error) {
      throw Exception('Sign-up failed: $error');
    }
  }

  // Sign in with email and password
  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final client = await _supabaseService.client;
      final response = await client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      return response;
    } catch (error) {
      throw Exception('Sign-in failed: $error');
    }
  }

  // Sign out
  Future<void> signOut() async {
    try {
      final client = await _supabaseService.client;
      await client.auth.signOut();
    } catch (error) {
      throw Exception('Sign-out failed: $error');
    }
  }

  // Get current user profile
  Future<UserProfile?> getCurrentUserProfile() async {
    try {
      if (!isAuthenticated) return null;

      final client = await _supabaseService.client;
      final userId = currentUser!.id;

      final response =
          await client.from('user_profiles').select().eq('id', userId).single();

      return UserProfile.fromJson(response);
    } catch (error) {
      throw Exception('Failed to get user profile: $error');
    }
  }

  // Update user profile
  Future<UserProfile> updateUserProfile({
    required String userId,
    String? fullName,
    String? avatarUrl,
  }) async {
    try {
      final client = await _supabaseService.client;

      final updateData = <String, dynamic>{};
      if (fullName != null) updateData['full_name'] = fullName;
      if (avatarUrl != null) updateData['avatar_url'] = avatarUrl;

      if (updateData.isEmpty) {
        throw Exception('No data to update');
      }

      final response = await client
          .from('user_profiles')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single();

      return UserProfile.fromJson(response);
    } catch (error) {
      throw Exception('Failed to update user profile: $error');
    }
  }

  // Reset password
  Future<void> resetPassword({required String email}) async {
    try {
      final client = await _supabaseService.client;
      await client.auth.resetPasswordForEmail(email);
    } catch (error) {
      throw Exception('Password reset failed: $error');
    }
  }

  // Update password
  Future<UserResponse> updatePassword({required String newPassword}) async {
    try {
      final client = await _supabaseService.client;
      final response = await client.auth.updateUser(
        UserAttributes(password: newPassword),
      );
      return response;
    } catch (error) {
      throw Exception('Password update failed: $error');
    }
  }

  // OAuth sign-in (Google, Apple, etc.)
  Future<bool> signInWithOAuth(OAuthProvider provider) async {
    try {
      final client = await _supabaseService.client;
      return await client.auth.signInWithOAuth(provider);
    } catch (error) {
      throw Exception('OAuth sign-in failed: $error');
    }
  }

  // Delete account
  Future<void> deleteAccount() async {
    try {
      if (!isAuthenticated) {
        throw Exception('User not authenticated');
      }

      final client = await _supabaseService.client;
      final userId = currentUser!.id;

      // Delete user profile (cascade will handle related data)
      await client.from('user_profiles').delete().eq('id', userId);

      // Sign out after deletion
      await signOut();
    } catch (error) {
      throw Exception('Account deletion failed: $error');
    }
  }
}
