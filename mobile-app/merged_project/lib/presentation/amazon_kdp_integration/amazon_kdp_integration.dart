import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

import '../../core/app_export.dart';
import './widgets/authentication_section_widget.dart';
import './widgets/cover_image_section_widget.dart';
import './widgets/preview_section_widget.dart';
import './widgets/publishing_actions_widget.dart';
import './widgets/publishing_form_widget.dart';
import './widgets/status_indicator_widget.dart';
import 'package:kdp_creator_suite/lib\theme\app_theme.dart';

class AmazonKdpIntegration extends StatefulWidget {
  const AmazonKdpIntegration({super.key});

  @override
  State<AmazonKdpIntegration> createState() => _AmazonKdpIntegrationState();
}

class _AmazonKdpIntegrationState extends State<AmazonKdpIntegration> {
  bool _isAuthenticated = false;
  bool _isSecureConnection = true;
  bool _isPublishing = false;
  String? _customCoverPath;

  final Map<String, dynamic> _userInfo = {
    'accountName': 'John Doe',
    'publishedTitles': 12,
    'totalEarnings': '2,847.50',
  };

  Map<String, dynamic> _bookData = {
    'title': 'My Amazing eBook',
    'author': 'John Doe',
    'description': '',
    'category': 'Fiction',
    'keywords': '',
    'price': '9.99',
    'territory': 'Worldwide',
    'royalty': '70%',
    'isPreOrder': false,
  };

  final List<Map<String, dynamic>> _mockCredentials = [
    {
      'email': 'author@example.com',
      'password': 'KindleAuthor123',
      'accountType': 'Author Account',
    },
    {
      'email': 'publisher@kdp.com',
      'password': 'PublishPro456',
      'accountType': 'Publisher Account',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.lightTheme.scaffoldBackgroundColor,
      appBar: _buildAppBar(),
      body: SafeArea(
        child: Column(
          children: [
            StatusIndicatorWidget(
              isConnected: _isAuthenticated,
              isSecure: _isSecureConnection,
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.all(4.w),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AuthenticationSectionWidget(
                      isAuthenticated: _isAuthenticated,
                      onConnectPressed: _handleConnectToKDP,
                      userInfo: _isAuthenticated ? _userInfo : null,
                    ),
                    if (_isAuthenticated) ...[
                      SizedBox(height: 3.h),
                      PublishingFormWidget(
                        onFormChanged: _handleFormChanged,
                        initialData: _bookData,
                      ),
                      SizedBox(height: 3.h),
                      CoverImageSectionWidget(
                        defaultCoverUrl:
                            'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
                        customCoverPath: _customCoverPath,
                        onUploadCustomCover: _handleUploadCustomCover,
                      ),
                      SizedBox(height: 3.h),
                      PreviewSectionWidget(
                        onPreviewKindle: _handlePreviewKindle,
                        bookData: _bookData,
                      ),
                      SizedBox(height: 3.h),
                      PublishingActionsWidget(
                        canPublish: _canPublish(),
                        isPublishing: _isPublishing,
                        onPublishNow: _handlePublishNow,
                        onSaveDraft: _handleSaveDraft,
                        onViewDashboard: _handleViewDashboard,
                      ),
                    ],
                    SizedBox(height: 4.h),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNavigation(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      title: Text(
        'Amazon KDP Integration',
        style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
          color: AppTheme.lightTheme.colorScheme.onSurface,
          fontWeight: FontWeight.w600,
        ),
      ),
      backgroundColor: AppTheme.lightTheme.colorScheme.surface,
      elevation: 0,
      leading: IconButton(
        onPressed: () => Navigator.pop(context),
        icon: CustomIconWidget(
          iconName: 'arrow_back',
          color: AppTheme.lightTheme.colorScheme.onSurface,
          size: 24,
        ),
      ),
      actions: [
        IconButton(
          onPressed: _handleHelp,
          icon: CustomIconWidget(
            iconName: 'help_outline',
            color: AppTheme.lightTheme.colorScheme.onSurface,
            size: 24,
          ),
        ),
      ],
    );
  }

  Widget _buildBottomNavigation() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.lightTheme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: AppTheme.lightTheme.colorScheme.shadow,
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: AppTheme.lightTheme.colorScheme.surface,
        selectedItemColor: AppTheme.lightTheme.colorScheme.primary,
        unselectedItemColor: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
        currentIndex: 4,
        onTap: _handleBottomNavTap,
        items: [
          BottomNavigationBarItem(
            icon: CustomIconWidget(
              iconName: 'school',
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 24,
            ),
            activeIcon: CustomIconWidget(
              iconName: 'school',
              color: AppTheme.lightTheme.colorScheme.primary,
              size: 24,
            ),
            label: 'Onboarding',
          ),
          BottomNavigationBarItem(
            icon: CustomIconWidget(
              iconName: 'library_books',
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 24,
            ),
            activeIcon: CustomIconWidget(
              iconName: 'library_books',
              color: AppTheme.lightTheme.colorScheme.primary,
              size: 24,
            ),
            label: 'Library',
          ),
          BottomNavigationBarItem(
            icon: CustomIconWidget(
              iconName: 'upload_file',
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 24,
            ),
            activeIcon: CustomIconWidget(
              iconName: 'upload_file',
              color: AppTheme.lightTheme.colorScheme.primary,
              size: 24,
            ),
            label: 'Import',
          ),
          BottomNavigationBarItem(
            icon: CustomIconWidget(
              iconName: 'format_list_bulleted',
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 24,
            ),
            activeIcon: CustomIconWidget(
              iconName: 'format_list_bulleted',
              color: AppTheme.lightTheme.colorScheme.primary,
              size: 24,
            ),
            label: 'Formats',
          ),
          BottomNavigationBarItem(
            icon: CustomIconWidget(
              iconName: 'publish',
              color: AppTheme.lightTheme.colorScheme.primary,
              size: 24,
            ),
            activeIcon: CustomIconWidget(
              iconName: 'publish',
              color: AppTheme.lightTheme.colorScheme.primary,
              size: 24,
            ),
            label: 'Publish',
          ),
          BottomNavigationBarItem(
            icon: CustomIconWidget(
              iconName: 'settings',
              color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
              size: 24,
            ),
            activeIcon: CustomIconWidget(
              iconName: 'settings',
              color: AppTheme.lightTheme.colorScheme.primary,
              size: 24,
            ),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  void _handleConnectToKDP() {
    _showAuthenticationDialog();
  }

  void _showAuthenticationDialog() {
    final TextEditingController emailController = TextEditingController();
    final TextEditingController passwordController = TextEditingController();
    bool isLoading = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Row(
                children: [
                  CustomIconWidget(
                    iconName: 'security',
                    color: AppTheme.lightTheme.colorScheme.primary,
                    size: 24,
                  ),
                  SizedBox(width: 2.w),
                  Text(
                    'Connect to Amazon KDP',
                    style: AppTheme.lightTheme.textTheme.titleLarge,
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: EdgeInsets.all(3.w),
                      decoration: BoxDecoration(
                        color:
                            AppTheme.lightTheme.colorScheme.secondaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Text(
                            'Demo Credentials:',
                            style: AppTheme.lightTheme.textTheme.labelLarge
                                ?.copyWith(
                              color: AppTheme
                                  .lightTheme.colorScheme.onSecondaryContainer,
                            ),
                          ),
                          SizedBox(height: 1.h),
                          ..._mockCredentials.map((cred) => Padding(
                                padding: EdgeInsets.symmetric(vertical: 0.5.h),
                                child: Column(
                                  children: [
                                    Text(
                                      '${cred['accountType']}:',
                                      style: AppTheme
                                          .lightTheme.textTheme.bodySmall
                                          ?.copyWith(
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.lightTheme.colorScheme
                                            .onSecondaryContainer,
                                      ),
                                    ),
                                    Text(
                                      '${cred['email']} / ${cred['password']}',
                                      style: AppTheme
                                          .lightTheme.textTheme.bodySmall
                                          ?.copyWith(
                                        color: AppTheme.lightTheme.colorScheme
                                            .onSecondaryContainer,
                                      ),
                                    ),
                                  ],
                                ),
                              )),
                        ],
                      ),
                    ),
                    SizedBox(height: 2.h),
                    TextField(
                      controller: emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        hintText: 'Enter your KDP email',
                      ),
                      keyboardType: TextInputType.emailAddress,
                    ),
                    SizedBox(height: 2.h),
                    TextField(
                      controller: passwordController,
                      decoration: const InputDecoration(
                        labelText: 'Password',
                        hintText: 'Enter your KDP password',
                      ),
                      obscureText: true,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isLoading ? null : () => Navigator.pop(context),
                  child: Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isLoading
                      ? null
                      : () async {
                          setDialogState(() {
                            isLoading = true;
                          });

                          await Future.delayed(const Duration(seconds: 2));

                          final email = emailController.text.trim();
                          final password = passwordController.text.trim();

                          bool isValidCredential = _mockCredentials.any(
                              (cred) =>
                                  cred['email'] == email &&
                                  cred['password'] == password);

                          if (isValidCredential) {
                            Navigator.pop(context);
                            setState(() {
                              _isAuthenticated = true;
                              _isSecureConnection = true;
                            });
                            _showSuccessMessage(
                                'Successfully connected to Amazon KDP!');
                          } else {
                            setDialogState(() {
                              isLoading = false;
                            });
                            _showErrorMessage(
                                'Invalid credentials. Please use the demo credentials provided above.');
                          }
                        },
                  child: isLoading
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              AppTheme.lightTheme.colorScheme.onPrimary,
                            ),
                          ),
                        )
                      : Text('Connect'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _handleFormChanged(Map<String, dynamic> formData) {
    setState(() {
      _bookData = formData;
    });
  }

  void _handleUploadCustomCover() {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return Container(
          padding: EdgeInsets.all(4.w),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Upload Custom Cover',
                style: AppTheme.lightTheme.textTheme.titleLarge,
              ),
              SizedBox(height: 2.h),
              ListTile(
                leading: CustomIconWidget(
                  iconName: 'photo_camera',
                  color: AppTheme.lightTheme.colorScheme.primary,
                  size: 24,
                ),
                title: Text('Take Photo'),
                onTap: () {
                  Navigator.pop(context);
                  _simulateImageUpload('camera');
                },
              ),
              ListTile(
                leading: CustomIconWidget(
                  iconName: 'photo_library',
                  color: AppTheme.lightTheme.colorScheme.primary,
                  size: 24,
                ),
                title: Text('Choose from Gallery'),
                onTap: () {
                  Navigator.pop(context);
                  _simulateImageUpload('gallery');
                },
              ),
              if (_customCoverPath != null)
                ListTile(
                  leading: CustomIconWidget(
                    iconName: 'delete',
                    color: AppTheme.lightTheme.colorScheme.error,
                    size: 24,
                  ),
                  title: Text('Remove Custom Cover'),
                  onTap: () {
                    Navigator.pop(context);
                    setState(() {
                      _customCoverPath = null;
                    });
                    _showSuccessMessage('Custom cover removed');
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  void _simulateImageUpload(String source) async {
    _showLoadingMessage('Uploading cover image...');
    await Future.delayed(const Duration(seconds: 2));
    setState(() {
      _customCoverPath = '/path/to/custom/cover.jpg';
    });
    _showSuccessMessage('Custom cover uploaded successfully!');
  }

  void _handlePreviewKindle() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Row(
            children: [
              CustomIconWidget(
                iconName: 'preview',
                color: AppTheme.lightTheme.colorScheme.primary,
                size: 24,
              ),
              SizedBox(width: 2.w),
              Text('Kindle Preview'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60.w,
                height: 30.h,
                decoration: BoxDecoration(
                  color:
                      AppTheme.lightTheme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppTheme.lightTheme.colorScheme.outline,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CustomIconWidget(
                      iconName: 'tablet',
                      color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                      size: 48,
                    ),
                    SizedBox(height: 1.h),
                    Text(
                      'Kindle Preview',
                      style: AppTheme.lightTheme.textTheme.titleMedium,
                    ),
                    Text(
                      _bookData['title'] ?? 'Book Title',
                      style: AppTheme.lightTheme.textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              SizedBox(height: 2.h),
              Text(
                'This is how your eBook will appear on Kindle devices. The actual preview will show formatted text, images, and layout.',
                style: AppTheme.lightTheme.textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Close'),
            ),
          ],
        );
      },
    );
  }

  void _handlePublishNow() async {
    if (!_canPublish()) {
      _showErrorMessage(
          'Please complete all required fields before publishing.');
      return;
    }

    setState(() {
      _isPublishing = true;
    });

    await Future.delayed(const Duration(seconds: 5));

    setState(() {
      _isPublishing = false;
    });

    _showPublishingSuccessDialog();
  }

  void _showPublishingSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          title: Row(
            children: [
              CustomIconWidget(
                iconName: 'check_circle',
                color: AppTheme.lightTheme.colorScheme.primary,
                size: 24,
              ),
              SizedBox(width: 2.w),
              Text('Publishing Successful!'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Your eBook has been successfully submitted to Amazon KDP.',
                style: AppTheme.lightTheme.textTheme.bodyMedium,
              ),
              SizedBox(height: 2.h),
              Container(
                padding: EdgeInsets.all(3.w),
                decoration: BoxDecoration(
                  color: AppTheme.lightTheme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tracking Number: KDP-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
                      style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    SizedBox(height: 1.h),
                    Text(
                      'Expected Review Time: 24-72 hours',
                      style: AppTheme.lightTheme.textTheme.bodySmall,
                    ),
                    Text(
                      'Expected Availability: 3-5 business days',
                      style: AppTheme.lightTheme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('View Dashboard'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Done'),
            ),
          ],
        );
      },
    );
  }

  void _handleSaveDraft() {
    _showSuccessMessage('Draft saved successfully!');
  }

  void _handleViewDashboard() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('KDP Dashboard'),
          content: Text(
            'This would open your Amazon KDP dashboard in a secure web view, showing your published books, sales reports, and account information.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Close'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Open Dashboard'),
            ),
          ],
        );
      },
    );
  }

  void _handleHelp() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Row(
            children: [
              CustomIconWidget(
                iconName: 'help',
                color: AppTheme.lightTheme.colorScheme.primary,
                size: 24,
              ),
              SizedBox(width: 2.w),
              Text('Help & Support'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Amazon KDP Integration Help',
                  style: AppTheme.lightTheme.textTheme.titleMedium,
                ),
                SizedBox(height: 1.h),
                Text(
                  '• Connect your Amazon KDP account securely\n'
                  '• Fill in all required book information\n'
                  '• Upload a custom cover or use PDF first page\n'
                  '• Preview how your book appears on Kindle\n'
                  '• Publish directly to Amazon KDP\n'
                  '• Track publishing status and reviews',
                  style: AppTheme.lightTheme.textTheme.bodyMedium,
                ),
                SizedBox(height: 2.h),
                Text(
                  'For technical support, contact our help desk or visit the KDP Help Center.',
                  style: AppTheme.lightTheme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Close'),
            ),
          ],
        );
      },
    );
  }

  void _handleBottomNavTap(int index) {
    final routes = [
      '/onboarding-flow',
      '/project-library',
      '/pdf-import',
      '/format-selection',
      '/amazon-kdp-integration',
      '/settings',
    ];

    if (index != 4) {
      Navigator.pushNamed(context, routes[index]);
    }
  }

  bool _canPublish() {
    return _isAuthenticated &&
        _bookData['title']?.isNotEmpty == true &&
        _bookData['author']?.isNotEmpty == true &&
        _bookData['description']?.isNotEmpty == true &&
        _bookData['category']?.isNotEmpty == true &&
        _isValidPrice(_bookData['price']);
  }

  bool _isValidPrice(String? price) {
    if (price == null || price.isEmpty) return false;
    final parsedPrice = double.tryParse(price);
    return parsedPrice != null && parsedPrice >= 0.99 && parsedPrice <= 200.0;
  }

  void _showSuccessMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            CustomIconWidget(
              iconName: 'check_circle',
              color: AppTheme.lightTheme.colorScheme.onPrimary,
              size: 20,
            ),
            SizedBox(width: 2.w),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: AppTheme.lightTheme.colorScheme.primary,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showErrorMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            CustomIconWidget(
              iconName: 'error',
              color: AppTheme.lightTheme.colorScheme.onError,
              size: 20,
            ),
            SizedBox(width: 2.w),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: AppTheme.lightTheme.colorScheme.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showLoadingMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  AppTheme.lightTheme.colorScheme.onSecondary,
                ),
              ),
            ),
            SizedBox(width: 2.w),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: AppTheme.lightTheme.colorScheme.secondary,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }
}
