import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sizer/sizer.dart';

import '../../core/app_export.dart';
import '../../theme/app_theme.dart';
import './widgets/navigation_controls_widget.dart';
import './widgets/onboarding_page_widget.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';

class OnboardingFlow extends StatefulWidget {
  const OnboardingFlow({super.key});

  @override
  State<OnboardingFlow> createState() => _OnboardingFlowState();
}

class _OnboardingFlowState extends State<OnboardingFlow> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  // Mock data for onboarding pages
  final List<Map<String, dynamic>> _onboardingData = [
    {
      "title": "Transform PDFs into Kindle eBooks",
      "description":
          "Convert any PDF document into professional Kindle-compatible eBooks with just a few taps. Perfect for authors, publishers, and content creators.",
      "imageUrl":
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8ZWJvb2t8ZW58MHx8MHx8fDA%3D",
    },
    {
      "title": "Create Coloring Books for Kids",
      "description":
          "Generate beautiful children's coloring books from your PDFs. Create both digital versions for tablets and printable formats for physical coloring.",
      "imageUrl":
          "https://images.pexels.com/photos/159579/coloring-book-six-hundred-and-ninety-one-159579.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    },
    {
      "title": "Publish Directly to Amazon KDP",
      "description":
          "Seamlessly publish your converted eBooks directly to Amazon Kindle Direct Publishing. Reach millions of readers worldwide with integrated publishing tools.",
      "imageUrl":
          "https://images.pixabay.com/photo/2015/11/19/21/10/glasses-1052010_1280.jpg",
    },
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _onboardingData.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      // Haptic feedback for iOS
      HapticFeedback.lightImpact();
    }
  }

  void _skipOnboarding() {
    Navigator.pushReplacementNamed(context, '/project-library');
  }

  void _getStarted() {
    Navigator.pushReplacementNamed(context, '/project-library');
  }

  void _signIn() {
    Navigator.pushReplacementNamed(context, '/project-library');
  }

  void _onPageChanged(int page) {
    setState(() {
      _currentPage = page;
    });
    // Haptic feedback for page changes
    HapticFeedback.selectionClick();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.lightTheme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // Skip button in top-right corner
            Container(
              width: 100.w,
              padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (_currentPage < _onboardingData.length - 1)
                    TextButton(
                      onPressed: _skipOnboarding,
                      style: TextButton.styleFrom(
                        foregroundColor:
                            AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                        padding: EdgeInsets.symmetric(
                            horizontal: 4.w, vertical: 1.h),
                      ),
                      child: Text(
                        'Skip',
                        style:
                            AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                          color:
                              AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Main content area with PageView
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: _onPageChanged,
                itemCount: _onboardingData.length,
                itemBuilder: (context, index) {
                  final pageData = _onboardingData[index];
                  final isLastPage = index == _onboardingData.length - 1;

                  return OnboardingPageWidget(
                    title: pageData["title"] as String,
                    description: pageData["description"] as String,
                    imageUrl: pageData["imageUrl"] as String,
                    isLastPage: isLastPage,
                    onGetStarted: isLastPage ? _getStarted : null,
                    onSignIn: isLastPage ? _signIn : null,
                  );
                },
              ),
            ),

            // Bottom navigation controls
            NavigationControlsWidget(
              currentPage: _currentPage,
              totalPages: _onboardingData.length,
              onNext: _nextPage,
              onSkip: _skipOnboarding,
              isLastPage: _currentPage == _onboardingData.length - 1,
            ),

            SizedBox(height: 2.h),
          ],
        ),
      ),
    );
  }
}
