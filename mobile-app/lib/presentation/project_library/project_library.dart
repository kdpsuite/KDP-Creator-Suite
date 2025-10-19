import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';
import 'package:flutter/services.dart';
import 'package:sizer/sizer.dart';

import '../../core/app_export.dart';
import '../../models/project.dart';
import '../../services/analytics_service.dart';
import '../../services/auth_service.dart';
import '../../services/project_service.dart';
import './widgets/empty_state_widget.dart';
import './widgets/filter_bottom_sheet_widget.dart';
import './widgets/project_card_widget.dart';
import './widgets/search_bar_widget.dart';
import './widgets/sync_indicator_widget.dart';

class ProjectLibrary extends StatefulWidget {
  const ProjectLibrary({super.key});

  @override
  State<ProjectLibrary> createState() => _ProjectLibraryState();
}

class _ProjectLibraryState extends State<ProjectLibrary>
    with TickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';
  Map<String, dynamic> _activeFilters = {};
  bool _isOnline = true;
  bool _isSyncing = false;
  bool _isLoading = true;
  DateTime? _lastSyncTime;

  // Services
  final AuthService _authService = AuthService();
  final ProjectService _projectService = ProjectService();
  final AnalyticsService _analyticsService = AnalyticsService();

  // Real data from Supabase
  List<Project> _allProjects = [];
  List<Project> _filteredProjects = [];
  Map<String, dynamic> _projectStats = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _lastSyncTime = DateTime.now().subtract(const Duration(minutes: 5));
    _initializeData();
    _simulateNetworkStatus();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _initializeData() async {
    try {
      if (_authService.isAuthenticated) {
        await _loadProjects();
        await _loadProjectStats();
      }
    } catch (error) {
      print('Error initializing data: $error');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadProjects() async {
    try {
      final projects = await _projectService.getUserProjects(
        searchQuery: _searchQuery.isNotEmpty ? _searchQuery : null,
      );

      if (mounted) {
        setState(() {
          _allProjects = projects;
          _applyFilters();
        });
      }
    } catch (error) {
      print('Error loading projects: $error');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load projects: $error'),
            backgroundColor: AppTheme.lightTheme.colorScheme.error,
          ),
        );
      }
    }
  }

  Future<void> _loadProjectStats() async {
    try {
      final stats = await _projectService.getProjectStatistics();
      if (mounted) {
        setState(() {
          _projectStats = stats;
        });
      }
    } catch (error) {
      print('Error loading project stats: $error');
    }
  }

  void _simulateNetworkStatus() {
    // Simulate network connectivity changes
    Future.delayed(const Duration(seconds: 10), () {
      if (mounted) {
        setState(() {
          _isOnline = !_isOnline;
        });
        _simulateNetworkStatus();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.lightTheme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildTabBar(),
            if (!_isOnline || _isSyncing)
              SyncIndicatorWidget(
                isOnline: _isOnline,
                isSyncing: _isSyncing,
                lastSyncTime: _lastSyncTime,
              ),
            _buildSearchBar(),
            Expanded(
              child: _buildTabBarView(),
            ),
          ],
        ),
      ),
      floatingActionButton: _buildFloatingActionButton(),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 2.h),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'KindleForge',
                style: AppTheme.lightTheme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppTheme.lightTheme.colorScheme.primary,
                ),
              ),
              Text(
                _authService.isAuthenticated
                    ? 'Welcome back! ${_projectStats['total_projects'] ?? 0} projects'
                    : 'Transform PDFs into eBooks',
                style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, '/settings'),
            child: Container(
              padding: EdgeInsets.all(2.w),
              decoration: BoxDecoration(
                color: AppTheme.lightTheme.colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.lightTheme.colorScheme.outline
                      .withValues(alpha: 0.2),
                ),
              ),
              child: CustomIconWidget(
                iconName: 'settings',
                color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                size: 6.w,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 4.w),
      decoration: BoxDecoration(
        color: AppTheme.lightTheme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.lightTheme.colorScheme.outline.withValues(alpha: 0.2),
        ),
      ),
      child: TabBar(
        controller: _tabController,
        tabs: [
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CustomIconWidget(
                  iconName: 'library_books',
                  color: _tabController.index == 0
                      ? AppTheme.lightTheme.colorScheme.primary
                      : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  size: 4.w,
                ),
                SizedBox(width: 1.w),
                Text('Library'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CustomIconWidget(
                  iconName: 'transform',
                  color: _tabController.index == 1
                      ? AppTheme.lightTheme.colorScheme.primary
                      : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  size: 4.w,
                ),
                SizedBox(width: 1.w),
                Text('Convert'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CustomIconWidget(
                  iconName: 'share',
                  color: _tabController.index == 2
                      ? AppTheme.lightTheme.colorScheme.primary
                      : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  size: 4.w,
                ),
                SizedBox(width: 1.w),
                Text('Share'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CustomIconWidget(
                  iconName: 'settings',
                  color: _tabController.index == 3
                      ? AppTheme.lightTheme.colorScheme.primary
                      : AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  size: 4.w,
                ),
                SizedBox(width: 1.w),
                Text('Settings'),
              ],
            ),
          ),
        ],
        indicator: BoxDecoration(
          color: AppTheme.lightTheme.colorScheme.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        labelColor: AppTheme.lightTheme.colorScheme.primary,
        unselectedLabelColor: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
        labelStyle: AppTheme.lightTheme.textTheme.labelMedium?.copyWith(
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: AppTheme.lightTheme.textTheme.labelMedium,
        dividerColor: Colors.transparent,
        onTap: (index) {
          setState(() {});
          if (index == 1) {
            Navigator.pushNamed(context, '/pdf-import');
          } else if (index == 2) {
            Navigator.pushNamed(context, '/format-selection');
          } else if (index == 3) {
            Navigator.pushNamed(context, '/settings');
          }
        },
      ),
    );
  }

  Widget _buildSearchBar() {
    return SearchBarWidget(
      onSearchChanged: (query) {
        setState(() {
          _searchQuery = query;
          _applyFilters();
        });

        // Reload projects with search query
        if (_authService.isAuthenticated) {
          _loadProjects();
        }
      },
      onFilterTap: () {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (context) => FilterBottomSheetWidget(
            currentFilters: _activeFilters,
            onFiltersChanged: (filters) {
              setState(() {
                _activeFilters = filters;
                _applyFilters();
              });
            },
          ),
        );
      },
    );
  }

  Widget _buildTabBarView() {
    return TabBarView(
      controller: _tabController,
      children: [
        _buildLibraryTab(),
        _buildConvertTab(),
        _buildShareTab(),
        _buildSettingsTab(),
      ],
    );
  }

  Widget _buildLibraryTab() {
    if (!_authService.isAuthenticated) {
      return _buildAuthPrompt();
    }

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_filteredProjects.isEmpty &&
        _searchQuery.isEmpty &&
        _activeFilters.isEmpty) {
      return EmptyStateWidget(
        onImportTap: () {
          Navigator.pushNamed(context, '/pdf-import');
        },
      );
    }

    if (_filteredProjects.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CustomIconWidget(
              iconName: 'search_off',
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 15.w,
            ),
            SizedBox(height: 2.h),
            Text(
              'No projects found',
              style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
                color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              ),
            ),
            SizedBox(height: 1.h),
            Text(
              'Try adjusting your search or filters',
              style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _handleRefresh,
      color: AppTheme.lightTheme.colorScheme.secondary,
      child: ListView.builder(
        padding: EdgeInsets.only(bottom: 10.h),
        itemCount: _filteredProjects.length,
        itemBuilder: (context, index) {
          final project = _filteredProjects[index];
          return ProjectCardWidget(
            project: _convertToLegacyFormat(project),
            onTap: () => _navigateToProjectDetail(project),
            onDuplicate: () => _duplicateProject(project),
            onShare: () => _shareProject(project),
            onArchive: () => _archiveProject(project),
            onDelete: () => _deleteProject(project),
            onRename: () => _renameProject(project),
            onMoveToFolder: () => _moveToFolder(project),
            onExportAll: () => _exportAllFormats(project),
          );
        },
      ),
    );
  }

  Widget _buildAuthPrompt() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CustomIconWidget(
            iconName: 'account_circle',
            color: AppTheme.lightTheme.colorScheme.secondary,
            size: 20.w,
          ),
          SizedBox(height: 3.h),
          Text(
            'Sign in to view your projects',
            style: AppTheme.lightTheme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 2.h),
          Text(
            'Create an account to save and sync your projects',
            style: AppTheme.lightTheme.textTheme.bodyLarge?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 4.h),
          ElevatedButton(
            onPressed: () => _showAuthDialog(),
            child: Text('Sign In / Sign Up'),
          ),
        ],
      ),
    );
  }

  Widget _buildConvertTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CustomIconWidget(
            iconName: 'transform',
            color: AppTheme.lightTheme.colorScheme.secondary,
            size: 20.w,
          ),
          SizedBox(height: 3.h),
          Text(
            'Convert PDF to eBook',
            style: AppTheme.lightTheme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 2.h),
          Text(
            'Transform your PDF files into multiple formats',
            style: AppTheme.lightTheme.textTheme.bodyLarge?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 4.h),
          ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, '/pdf-import'),
            child: Text('Start Converting'),
          ),
        ],
      ),
    );
  }

  Widget _buildShareTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CustomIconWidget(
            iconName: 'share',
            color: AppTheme.lightTheme.colorScheme.secondary,
            size: 20.w,
          ),
          SizedBox(height: 3.h),
          Text(
            'Share Your eBooks',
            style: AppTheme.lightTheme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 2.h),
          Text(
            'Share your converted eBooks with the world',
            style: AppTheme.lightTheme.textTheme.bodyLarge?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 4.h),
          ElevatedButton(
            onPressed: () =>
                Navigator.pushNamed(context, '/amazon-kdp-integration'),
            child: Text('Publish to KDP'),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CustomIconWidget(
            iconName: 'settings',
            color: AppTheme.lightTheme.colorScheme.secondary,
            size: 20.w,
          ),
          SizedBox(height: 3.h),
          Text(
            'App Settings',
            style: AppTheme.lightTheme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 2.h),
          Text(
            'Customize your KindleForge experience',
            style: AppTheme.lightTheme.textTheme.bodyLarge?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 4.h),
          ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, '/settings'),
            child: Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingActionButton() {
    return FloatingActionButton.extended(
      onPressed: () {
        HapticFeedback.lightImpact();
        Navigator.pushNamed(context, '/pdf-import');
      },
      icon: CustomIconWidget(
        iconName: 'add',
        color: Colors.white,
        size: 6.w,
      ),
      label: Text(
        'New Project',
        style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
      backgroundColor: AppTheme.lightTheme.colorScheme.secondary,
    );
  }

  void _applyFilters() {
    _filteredProjects = _allProjects.where((project) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final name = project.name.toLowerCase();
        final query = _searchQuery.toLowerCase();
        if (!name.contains(query)) {
          return false;
        }
      }

      // Status filter
      if (_activeFilters['status'] != null) {
        final status = _activeFilters['status'] as String;
        if (status == 'Completed' && !project.isCompleted) {
          return false;
        } else if (status != 'Completed' &&
            project.statusDisplayName != status) {
          return false;
        }
      }

      // Date range filter
      if (_activeFilters['startDate'] != null ||
          _activeFilters['endDate'] != null) {
        final projectDate = project.createdAt;
        if (_activeFilters['startDate'] != null) {
          final startDate = _activeFilters['startDate'] as DateTime;
          if (projectDate.isBefore(startDate)) {
            return false;
          }
        }
        if (_activeFilters['endDate'] != null) {
          final endDate = _activeFilters['endDate'] as DateTime;
          if (projectDate.isAfter(endDate.add(const Duration(days: 1)))) {
            return false;
          }
        }
      }

      return true;
    }).toList();
  }

  Future<void> _handleRefresh() async {
    setState(() {
      _isSyncing = true;
    });

    try {
      if (_authService.isAuthenticated) {
        await _loadProjects();
        await _loadProjectStats();
      }
    } catch (error) {
      print('Error during refresh: $error');
    }

    setState(() {
      _isSyncing = false;
      _lastSyncTime = DateTime.now();
    });
  }

  void _navigateToProjectDetail(Project project) {
    Navigator.pushNamed(context, '/format-selection', arguments: project.id);
  }

  Future<void> _duplicateProject(Project project) async {
    try {
      await _projectService.duplicateProject(project.id);
      await _loadProjects();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Project duplicated successfully'),
            backgroundColor: Color(0xFF27AE60),
          ),
        );
      }

      await _analyticsService.trackAction(
        actionType: 'project_duplicate',
        projectId: project.id,
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to duplicate project: $error'),
            backgroundColor: AppTheme.lightTheme.colorScheme.error,
          ),
        );
      }
    }
  }

  void _shareProject(Project project) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: EdgeInsets.all(4.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Share "${project.name}"',
              style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(height: 3.h),
            ListTile(
              leading: CustomIconWidget(
                iconName: 'cloud',
                color: AppTheme.lightTheme.colorScheme.secondary,
                size: 6.w,
              ),
              title: Text('Google Drive'),
              onTap: () {
                Navigator.pop(context);
                _shareToGoogleDrive(project);
              },
            ),
            ListTile(
              leading: CustomIconWidget(
                iconName: 'email',
                color: AppTheme.lightTheme.colorScheme.secondary,
                size: 6.w,
              ),
              title: Text('Email'),
              onTap: () {
                Navigator.pop(context);
                _shareViaEmail(project);
              },
            ),
            ListTile(
              leading: CustomIconWidget(
                iconName: 'share',
                color: AppTheme.lightTheme.colorScheme.secondary,
                size: 6.w,
              ),
              title: Text('More Options'),
              onTap: () {
                Navigator.pop(context);
                _shareViaSystem(project);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _archiveProject(Project project) async {
    try {
      await _projectService.updateProject(
        projectId: project.id,
        status: 'archived',
      );
      await _loadProjects();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Project archived'),
            action: SnackBarAction(
              label: 'Undo',
              onPressed: () async {
                await _projectService.updateProject(
                  projectId: project.id,
                  status: project.status,
                );
                await _loadProjects();
              },
            ),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to archive project: $error'),
            backgroundColor: AppTheme.lightTheme.colorScheme.error,
          ),
        );
      }
    }
  }

  Future<void> _deleteProject(Project project) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Project'),
        content: Text(
            'Are you sure you want to delete "${project.name}"? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.lightTheme.colorScheme.error,
            ),
            child: Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _projectService.deleteProject(project.id);
        await _loadProjects();
        await _loadProjectStats();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Project deleted'),
              backgroundColor: AppTheme.lightTheme.colorScheme.error,
            ),
          );
        }
      } catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete project: $error'),
              backgroundColor: AppTheme.lightTheme.colorScheme.error,
            ),
          );
        }
      }
    }
  }

  Future<void> _renameProject(Project project) async {
    final TextEditingController controller = TextEditingController(
      text: project.name,
    );

    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Rename Project'),
        content: TextField(
          controller: controller,
          decoration: InputDecoration(
            labelText: 'Project Name',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                Navigator.pop(context, controller.text.trim());
              }
            },
            child: Text('Rename'),
          ),
        ],
      ),
    );

    if (newName != null && newName != project.name) {
      try {
        await _projectService.updateProject(
          projectId: project.id,
          name: newName,
        );
        await _loadProjects();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Project renamed successfully')),
          );
        }
      } catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to rename project: $error'),
              backgroundColor: AppTheme.lightTheme.colorScheme.error,
            ),
          );
        }
      }
    }
  }

  void _moveToFolder(Project project) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Move to Folder'),
        content: Text('Folder management feature coming soon!'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
        ],
      ),
    );
  }

  void _exportAllFormats(Project project) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Export All Formats'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Export "${project.name}" in all available formats?'),
            SizedBox(height: 2.h),
            Text(
              'Available formats: eBook, PDF, EPUB, MOBI',
              style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _startExportProcess(project);
            },
            child: Text('Export All'),
          ),
        ],
      ),
    );
  }

  Future<void> _shareToGoogleDrive(Project project) async {
    await _analyticsService.trackShare(
      projectId: project.id,
      shareType: 'google_drive',
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Sharing to Google Drive...')),
      );
    }
  }

  Future<void> _shareViaEmail(Project project) async {
    await _analyticsService.trackShare(
      projectId: project.id,
      shareType: 'email',
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Opening email client...')),
      );
    }
  }

  Future<void> _shareViaSystem(Project project) async {
    await _analyticsService.trackShare(
      projectId: project.id,
      shareType: 'system',
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Opening system share sheet...')),
      );
    }
  }

  void _startExportProcess(Project project) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Exporting all formats...'),
        duration: Duration(seconds: 3),
      ),
    );
  }

  void _showAuthDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Authentication'),
        content: Text('Authentication screens will be implemented next.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
        ],
      ),
    );
  }

  Map<String, dynamic> _convertToLegacyFormat(Project project) {
    return {
      "id": project.id,
      "name": project.name,
      "thumbnail": project.thumbnailUrl ??
          "https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400",
      "createdDate": project.createdAt,
      "status": project.statusDisplayName,
      "formatType": project.metadata['format_type'] ?? "eBook",
      "description": project.description ?? "",
      "fileSize": project.fileSizeDisplay,
      "pageCount": project.totalPages,
    };
  }
}
