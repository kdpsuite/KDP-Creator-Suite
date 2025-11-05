import '../utils/supabase_service.dart';
import '../models/project.dart';
import '../models/format_conversion.dart';
import 'package:kdp_creator_suite/lib\theme\app_theme.dart';

class ProjectService {
  static final ProjectService _instance = ProjectService._internal();
  factory ProjectService() => _instance;
  ProjectService._internal();

  final SupabaseService _supabaseService = SupabaseService();

  // Get all projects for current user
  Future<List<Project>> getUserProjects({
    String? status,
    String? searchQuery,
    int? limit,
    int? offset,
  }) async {
    try {
      final client = await _supabaseService.client;
      final userId = _supabaseService.currentUser?.id;

      if (userId == null) {
        throw Exception('User not authenticated');
      }

      var query = client.from('projects').select().eq('user_id', userId);

      if (status != null) {
        query = query.eq('status', status);
      }

      if (searchQuery != null && searchQuery.isNotEmpty) {
        query = query.ilike('name', '%$searchQuery%');
      }

      final response = await query
          .order('created_at', ascending: false)
          .limit(limit ?? 100)
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 100) - 1);

      return response.map<Project>((json) => Project.fromJson(json)).toList();
    } catch (error) {
      throw Exception('Failed to get user projects: $error');
    }
  }

  // Get project by ID
  Future<Project?> getProjectById(String projectId) async {
    try {
      final client = await _supabaseService.client;

      final response =
          await client.from('projects').select().eq('id', projectId).single();

      return Project.fromJson(response);
    } catch (error) {
      throw Exception('Failed to get project: $error');
    }
  }

  // Create new project
  Future<Project> createProject({
    required String name,
    String? description,
    String? originalPdfUrl,
    String? originalPdfName,
    String? thumbnailUrl,
    int totalPages = 0,
    double fileSizeMb = 0,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final client = await _supabaseService.client;
      final userId = _supabaseService.currentUser?.id;

      if (userId == null) {
        throw Exception('User not authenticated');
      }

      final projectData = {
        'user_id': userId,
        'name': name,
        'description': description,
        'original_pdf_url': originalPdfUrl,
        'original_pdf_name': originalPdfName,
        'thumbnail_url': thumbnailUrl,
        'status': 'draft',
        'total_pages': totalPages,
        'file_size_mb': fileSizeMb,
        'is_favorite': false,
        'metadata': metadata ?? {},
      };

      final response =
          await client.from('projects').insert(projectData).select().single();

      // Update user project count
      await _updateUserProjectCount(userId);

      return Project.fromJson(response);
    } catch (error) {
      throw Exception('Failed to create project: $error');
    }
  }

  // Update project
  Future<Project> updateProject({
    required String projectId,
    String? name,
    String? description,
    String? status,
    String? thumbnailUrl,
    bool? isFavorite,
    String? folderPath,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final client = await _supabaseService.client;

      final updateData = <String, dynamic>{};
      if (name != null) updateData['name'] = name;
      if (description != null) updateData['description'] = description;
      if (status != null) updateData['status'] = status;
      if (thumbnailUrl != null) updateData['thumbnail_url'] = thumbnailUrl;
      if (isFavorite != null) updateData['is_favorite'] = isFavorite;
      if (folderPath != null) updateData['folder_path'] = folderPath;
      if (metadata != null) updateData['metadata'] = metadata;

      if (updateData.isEmpty) {
        throw Exception('No data to update');
      }

      final response = await client
          .from('projects')
          .update(updateData)
          .eq('id', projectId)
          .select()
          .single();

      return Project.fromJson(response);
    } catch (error) {
      throw Exception('Failed to update project: $error');
    }
  }

  // Delete project
  Future<void> deleteProject(String projectId) async {
    try {
      final client = await _supabaseService.client;
      final userId = _supabaseService.currentUser?.id;

      if (userId == null) {
        throw Exception('User not authenticated');
      }

      await client.from('projects').delete().eq('id', projectId);

      // Update user project count
      await _updateUserProjectCount(userId);
    } catch (error) {
      throw Exception('Failed to delete project: $error');
    }
  }

  // Duplicate project
  Future<Project> duplicateProject(String projectId) async {
    try {
      final originalProject = await getProjectById(projectId);
      if (originalProject == null) {
        throw Exception('Project not found');
      }

      return await createProject(
        name: '${originalProject.name} (Copy)',
        description: originalProject.description,
        originalPdfUrl: originalProject.originalPdfUrl,
        originalPdfName: originalProject.originalPdfName,
        thumbnailUrl: originalProject.thumbnailUrl,
        totalPages: originalProject.totalPages,
        fileSizeMb: originalProject.fileSizeMb,
        metadata: Map<String, dynamic>.from(originalProject.metadata),
      );
    } catch (error) {
      throw Exception('Failed to duplicate project: $error');
    }
  }

  // Get project conversions
  Future<List<FormatConversion>> getProjectConversions(String projectId) async {
    try {
      final client = await _supabaseService.client;

      final response = await client
          .from('format_conversions')
          .select()
          .eq('project_id', projectId)
          .order('created_at', ascending: false);

      return response
          .map<FormatConversion>((json) => FormatConversion.fromJson(json))
          .toList();
    } catch (error) {
      throw Exception('Failed to get project conversions: $error');
    }
  }

  // Create format conversion
  Future<FormatConversion> createFormatConversion({
    required String projectId,
    required String formatType,
    Map<String, dynamic>? conversionSettings,
  }) async {
    try {
      final client = await _supabaseService.client;

      final conversionData = {
        'project_id': projectId,
        'format_type': formatType,
        'status': 'pending',
        'conversion_settings': conversionSettings ?? {},
      };

      final response = await client
          .from('format_conversions')
          .insert(conversionData)
          .select()
          .single();

      return FormatConversion.fromJson(response);
    } catch (error) {
      throw Exception('Failed to create format conversion: $error');
    }
  }

  // Update conversion status
  Future<FormatConversion> updateConversionStatus({
    required String conversionId,
    required String status,
    String? outputFileUrl,
    double? outputFileSizeMb,
    String? errorMessage,
  }) async {
    try {
      final client = await _supabaseService.client;

      final updateData = {
        'status': status,
        if (outputFileUrl != null) 'output_file_url': outputFileUrl,
        if (outputFileSizeMb != null) 'output_file_size_mb': outputFileSizeMb,
        if (errorMessage != null) 'error_message': errorMessage,
        if (status == 'in_progress')
          'conversion_started_at': DateTime.now().toIso8601String(),
        if (status == 'completed' || status == 'failed')
          'conversion_completed_at': DateTime.now().toIso8601String(),
      };

      final response = await client
          .from('format_conversions')
          .update(updateData)
          .eq('id', conversionId)
          .select()
          .single();

      return FormatConversion.fromJson(response);
    } catch (error) {
      throw Exception('Failed to update conversion status: $error');
    }
  }

  // Get project statistics
  Future<Map<String, dynamic>> getProjectStatistics() async {
    try {
      final client = await _supabaseService.client;
      final userId = _supabaseService.currentUser?.id;

      if (userId == null) {
        throw Exception('User not authenticated');
      }

      // Run multiple count queries in parallel
      final results = await Future.wait([
        // Total projects
        client.from('projects').select().eq('user_id', userId).count(),

        // Completed projects
        client
            .from('projects')
            .select()
            .eq('user_id', userId)
            .eq('status', 'completed')
            .count(),

        // Projects in progress
        client
            .from('projects')
            .select()
            .eq('user_id', userId)
            .eq('status', 'processing')
            .count(),

        // Total conversions
        client
            .from('format_conversions')
            .select('*, projects!inner(*)')
            .eq('projects.user_id', userId)
            .count(),
      ]);

      final totalProjects = results[0].count ?? 0;
      final completedProjects = results[1].count ?? 0;
      final projectsInProgress = results[2].count ?? 0;
      final totalConversions = results[3].count ?? 0;

      return {
        'total_projects': totalProjects,
        'completed_projects': completedProjects,
        'projects_in_progress': projectsInProgress,
        'total_conversions': totalConversions,
        'completion_rate':
            totalProjects > 0 ? (completedProjects / totalProjects * 100) : 0.0,
      };
    } catch (error) {
      throw Exception('Failed to get project statistics: $error');
    }
  }

  // Private helper to update user project count
  Future<void> _updateUserProjectCount(String userId) async {
    try {
      final client = await _supabaseService.client;

      final projectCount =
          await client.from('projects').select().eq('user_id', userId).count();

      await client
          .from('user_profiles')
          .update({'projects_count': projectCount.count ?? 0}).eq('id', userId);
    } catch (error) {
      // Don't throw error for count update failure
      print('Warning: Failed to update user project count: $error');
    }
  }

  // Subscribe to project changes
  Stream<List<Project>> subscribeToUserProjects() async* {
    final client = await _supabaseService.client;
    final userId = _supabaseService.currentUser?.id;

    if (userId == null) {
      yield [];
      return;
    }

    // Initial fetch
    final initialProjects = await getUserProjects();
    yield initialProjects;

    // Real-time updates
    yield* client
        .from('projects')
        .stream(primaryKey: ['id'])
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .map((data) =>
            data.map<Project>((json) => Project.fromJson(json)).toList());
  }
}
