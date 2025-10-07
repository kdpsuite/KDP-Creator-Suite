import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sizer/sizer.dart';

import '../../core/app_export.dart';
import './widgets/account_section_widget.dart';
import './widgets/settings_section_widget.dart';
import './widgets/storage_management_widget.dart';
import './widgets/theme_selector_widget.dart';

class Settings extends StatefulWidget {
  const Settings({super.key});

  @override
  State<Settings> createState() => _SettingsState();
}

class _SettingsState extends State<Settings> with TickerProviderStateMixin {
  late TabController _tabController;

  // Mock user data
  final Map<String, dynamic> userData = {
    "name": "Sarah Johnson",
    "email": "sarah.johnson@email.com",
    "subscription": "Premium",
    "joinDate": "January 2024"
  };

  // Settings state
  String selectedTheme = 'System';
  String selectedQuality = 'High';
  bool autoBackup = true;
  bool conversionAlerts = true;
  bool sharingConfirmations = false;
  bool promotionalUpdates = true;
  bool analyticsOptOut = false;
  bool crashReporting = true;
  bool largerText = false;
  bool reducedMotion = false;
  String selectedLanguage = 'English';
  double usedStorage = 2.4;
  double totalStorage = 16.0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 1, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showSignOutDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(
            'Sign Out',
            style: AppTheme.lightTheme.textTheme.titleLarge,
          ),
          content: Text(
            'Are you sure you want to sign out? You will need to sign in again to access your projects.',
            style: AppTheme.lightTheme.textTheme.bodyMedium,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(
                'Cancel',
                style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                _performSignOut();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.lightTheme.colorScheme.error,
              ),
              child: Text(
                'Sign Out',
                style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  color: AppTheme.lightTheme.colorScheme.onError,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  void _performSignOut() {
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Successfully signed out'),
        backgroundColor: AppTheme.lightTheme.colorScheme.secondary,
      ),
    );
    Navigator.pushNamedAndRemoveUntil(
        context, '/onboarding-flow', (route) => false);
  }

  void _showQualitySelector() {
    showModalBottomSheet(
      context: context,
      builder: (BuildContext context) {
        return Container(
          padding: EdgeInsets.all(4.w),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Default Output Quality',
                style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: 3.h),
              ...['High', 'Medium', 'Standard'].map((quality) {
                return ListTile(
                  title: Text(quality),
                  trailing: selectedQuality == quality
                      ? CustomIconWidget(
                          iconName: 'check_circle',
                          color: AppTheme.lightTheme.colorScheme.secondary,
                          size: 20,
                        )
                      : null,
                  onTap: () {
                    setState(() => selectedQuality = quality);
                    Navigator.pop(context);
                    HapticFeedback.selectionClick();
                  },
                );
              }).toList(),
              SizedBox(height: 2.h),
            ],
          ),
        );
      },
    );
  }

  void _showLanguageSelector() {
    showModalBottomSheet(
      context: context,
      builder: (BuildContext context) {
        return Container(
          padding: EdgeInsets.all(4.w),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Language',
                style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: 3.h),
              ...['English', 'Spanish', 'French', 'German'].map((language) {
                return ListTile(
                  title: Text(language),
                  trailing: selectedLanguage == language
                      ? CustomIconWidget(
                          iconName: 'check_circle',
                          color: AppTheme.lightTheme.colorScheme.secondary,
                          size: 20,
                        )
                      : null,
                  onTap: () {
                    setState(() => selectedLanguage = language);
                    Navigator.pop(context);
                    HapticFeedback.selectionClick();
                  },
                );
              }).toList(),
              SizedBox(height: 2.h),
            ],
          ),
        );
      },
    );
  }

  void _showClearCacheDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(
            'Clear Cache',
            style: AppTheme.lightTheme.textTheme.titleLarge,
          ),
          content: Text(
            'This will clear temporary files and cached data. Your projects will not be affected.',
            style: AppTheme.lightTheme.textTheme.bodyMedium,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                _performClearCache();
              },
              child: Text('Clear Cache'),
            ),
          ],
        );
      },
    );
  }

  void _performClearCache() {
    HapticFeedback.lightImpact();
    setState(() {
      usedStorage = (usedStorage - 0.8).clamp(0.0, totalStorage);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Cache cleared successfully'),
        backgroundColor: AppTheme.lightTheme.colorScheme.secondary,
      ),
    );
  }

  void _showDeleteAllDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(
            'Delete All Projects',
            style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
              color: AppTheme.lightTheme.colorScheme.error,
            ),
          ),
          content: Text(
            'This will permanently delete all your projects and cannot be undone. Are you sure?',
            style: AppTheme.lightTheme.textTheme.bodyMedium,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                _performDeleteAll();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.lightTheme.colorScheme.error,
              ),
              child: Text(
                'Delete All',
                style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  color: AppTheme.lightTheme.colorScheme.onError,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  void _performDeleteAll() {
    HapticFeedback.heavyImpact();
    setState(() {
      usedStorage = 0.2;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('All projects deleted'),
        backgroundColor: AppTheme.lightTheme.colorScheme.error,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.lightTheme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'Settings',
          style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        elevation: 0,
        backgroundColor: AppTheme.lightTheme.scaffoldBackgroundColor,
        foregroundColor: AppTheme.lightTheme.colorScheme.onSurface,
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              child: Text(
                'Settings',
                style: AppTheme.lightTheme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
          indicatorColor: AppTheme.lightTheme.colorScheme.secondary,
          labelColor: AppTheme.lightTheme.colorScheme.secondary,
          unselectedLabelColor:
              AppTheme.lightTheme.colorScheme.onSurfaceVariant,
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          SingleChildScrollView(
            padding: EdgeInsets.symmetric(vertical: 2.h),
            child: Column(
              children: [
                // Account Section
                AccountSectionWidget(
                  userName: userData["name"] as String,
                  userEmail: userData["email"] as String,
                  subscriptionStatus: userData["subscription"] as String,
                  onSignOut: _showSignOutDialog,
                ),

                // Conversion Preferences
                SettingsSectionWidget(
                  title: 'Conversion Preferences',
                  items: [
                    SettingsItem(
                      title: 'Default Output Quality',
                      subtitle: selectedQuality,
                      iconName: 'high_quality',
                      onTap: _showQualitySelector,
                    ),
                    SettingsItem(
                      title: 'Preferred Formats',
                      subtitle: 'eBook, Coloring Book',
                      iconName: 'format_list_bulleted',
                      onTap: () =>
                          Navigator.pushNamed(context, '/format-selection'),
                    ),
                    SettingsItem(
                      title: 'Auto Cloud Backup',
                      iconName: 'cloud_upload',
                      trailing: Switch(
                        value: autoBackup,
                        onChanged: (value) {
                          setState(() => autoBackup = value);
                          HapticFeedback.selectionClick();
                        },
                      ),
                      hasArrow: false,
                    ),
                  ],
                ),

                // Amazon KDP Integration
                SettingsSectionWidget(
                  title: 'Amazon KDP Integration',
                  items: [
                    SettingsItem(
                      title: 'Connection Status',
                      subtitle: 'Connected',
                      iconName: 'link',
                      iconColor: Color(0xFF27AE60),
                      onTap: () => Navigator.pushNamed(
                          context, '/amazon-kdp-integration'),
                    ),
                    SettingsItem(
                      title: 'Publishing Preferences',
                      subtitle: 'Manage default settings',
                      iconName: 'publish',
                      onTap: () => Navigator.pushNamed(
                          context, '/amazon-kdp-integration'),
                    ),
                  ],
                ),

                // Notifications
                SettingsSectionWidget(
                  title: 'Notifications',
                  items: [
                    SettingsItem(
                      title: 'Conversion Completion',
                      iconName: 'notifications',
                      trailing: Switch(
                        value: conversionAlerts,
                        onChanged: (value) {
                          setState(() => conversionAlerts = value);
                          HapticFeedback.selectionClick();
                        },
                      ),
                      hasArrow: false,
                    ),
                    SettingsItem(
                      title: 'Sharing Confirmations',
                      iconName: 'share',
                      trailing: Switch(
                        value: sharingConfirmations,
                        onChanged: (value) {
                          setState(() => sharingConfirmations = value);
                          HapticFeedback.selectionClick();
                        },
                      ),
                      hasArrow: false,
                    ),
                    SettingsItem(
                      title: 'Promotional Updates',
                      iconName: 'campaign',
                      trailing: Switch(
                        value: promotionalUpdates,
                        onChanged: (value) {
                          setState(() => promotionalUpdates = value);
                          HapticFeedback.selectionClick();
                        },
                      ),
                      hasArrow: false,
                    ),
                  ],
                ),

                // Theme Selection
                ThemeSelectorWidget(
                  selectedTheme: selectedTheme,
                  onThemeChanged: (theme) {
                    setState(() => selectedTheme = theme);
                    HapticFeedback.selectionClick();
                  },
                ),

                // App Preferences
                SettingsSectionWidget(
                  title: 'App Preferences',
                  items: [
                    SettingsItem(
                      title: 'Language',
                      subtitle: selectedLanguage,
                      iconName: 'language',
                      onTap: _showLanguageSelector,
                    ),
                    SettingsItem(
                      title: 'Larger Text',
                      iconName: 'text_fields',
                      trailing: Switch(
                        value: largerText,
                        onChanged: (value) {
                          setState(() => largerText = value);
                          HapticFeedback.selectionClick();
                        },
                      ),
                      hasArrow: false,
                    ),
                    SettingsItem(
                      title: 'Reduced Motion',
                      iconName: 'accessibility',
                      trailing: Switch(
                        value: reducedMotion,
                        onChanged: (value) {
                          setState(() => reducedMotion = value);
                          HapticFeedback.selectionClick();
                        },
                      ),
                      hasArrow: false,
                    ),
                  ],
                ),

                // Storage Management
                StorageManagementWidget(
                  usedSpace: usedStorage,
                  totalSpace: totalStorage,
                  onClearCache: _showClearCacheDialog,
                  onDeleteAllProjects: _showDeleteAllDialog,
                ),

                // Privacy Settings
                SettingsSectionWidget(
                  title: 'Privacy',
                  items: [
                    SettingsItem(
                      title: 'Analytics Opt-out',
                      iconName: 'analytics',
                      trailing: Switch(
                        value: analyticsOptOut,
                        onChanged: (value) {
                          setState(() => analyticsOptOut = value);
                          HapticFeedback.selectionClick();
                        },
                      ),
                      hasArrow: false,
                    ),
                    SettingsItem(
                      title: 'Crash Reporting',
                      iconName: 'bug_report',
                      trailing: Switch(
                        value: crashReporting,
                        onChanged: (value) {
                          setState(() => crashReporting = value);
                          HapticFeedback.selectionClick();
                        },
                      ),
                      hasArrow: false,
                    ),
                    SettingsItem(
                      title: 'Export Data',
                      subtitle: 'Download your data',
                      iconName: 'download',
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Data export will be available soon'),
                            backgroundColor:
                                AppTheme.lightTheme.colorScheme.secondary,
                          ),
                        );
                      },
                    ),
                  ],
                ),

                // Help & Support
                SettingsSectionWidget(
                  title: 'Help & Support',
                  items: [
                    SettingsItem(
                      title: 'Tutorial Replay',
                      subtitle: 'Watch the app tutorial again',
                      iconName: 'play_circle',
                      onTap: () =>
                          Navigator.pushNamed(context, '/onboarding-flow'),
                    ),
                    SettingsItem(
                      title: 'FAQ',
                      subtitle: 'Frequently asked questions',
                      iconName: 'help',
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('FAQ section coming soon'),
                            backgroundColor:
                                AppTheme.lightTheme.colorScheme.secondary,
                          ),
                        );
                      },
                    ),
                    SettingsItem(
                      title: 'Contact Support',
                      subtitle: 'Get help from our team',
                      iconName: 'support_agent',
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content:
                                Text('Support contact options coming soon'),
                            backgroundColor:
                                AppTheme.lightTheme.colorScheme.secondary,
                          ),
                        );
                      },
                    ),
                    SettingsItem(
                      title: 'App Version',
                      subtitle: 'v1.0.0 (Build 1)',
                      iconName: 'info',
                      hasArrow: false,
                    ),
                  ],
                ),

                SizedBox(height: 4.h),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
