import 'package:kdp_creator_suite/lib\theme\app_theme.dart';import 'package:sizer/sizer.dart';import '../../../core/app_export.dart';

class PreviewSectionWidget extends StatefulWidget {
  final VoidCallback onPreviewKindle;
  final Map<String, dynamic> bookData;

  const PreviewSectionWidget({
    super.key,
    required this.onPreviewKindle,
    required this.bookData,
  });

  @override
  State<PreviewSectionWidget> createState() => _PreviewSectionWidgetState();
}

class _PreviewSectionWidgetState extends State<PreviewSectionWidget> {
  String _selectedDevice = 'Kindle Paperwhite';

  final List<Map<String, dynamic>> _devices = [
    {
      'name': 'Kindle Paperwhite',
      'icon': 'tablet',
      'description': '6.8" E Ink display',
    },
    {
      'name': 'Kindle Oasis',
      'icon': 'tablet_android',
      'description': '7" E Ink display',
    },
    {
      'name': 'Kindle Fire',
      'icon': 'tablet',
      'description': '10.1" HD display',
    },
    {
      'name': 'Kindle App',
      'icon': 'phone_android',
      'description': 'Mobile app',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Preview & Validation',
          style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSurface,
          ),
        ),
        SizedBox(height: 2.h),
        Container(
          width: double.infinity,
          padding: EdgeInsets.all(4.w),
          decoration: BoxDecoration(
            color: AppTheme.lightTheme.colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppTheme.lightTheme.colorScheme.outline,
              width: 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildDeviceSelector(),
              SizedBox(height: 3.h),
              _buildPreviewButton(),
              SizedBox(height: 3.h),
              _buildValidationStatus(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDeviceSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Preview Device',
          style: AppTheme.lightTheme.textTheme.labelLarge?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSurface,
          ),
        ),
        SizedBox(height: 1.h),
        Container(
          width: double.infinity,
          padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
          decoration: BoxDecoration(
            border: Border.all(
              color: AppTheme.lightTheme.colorScheme.outline,
              width: 1,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedDevice,
              isExpanded: true,
              items: _devices.map((device) {
                return DropdownMenuItem<String>(
                  value: device['name'],
                  child: Row(
                    children: [
                      CustomIconWidget(
                        iconName: device['icon'],
                        color: AppTheme.lightTheme.colorScheme.onSurface,
                        size: 20,
                      ),
                      SizedBox(width: 3.w),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              device['name'],
                              style: AppTheme.lightTheme.textTheme.bodyMedium
                                  ?.copyWith(
                                color:
                                    AppTheme.lightTheme.colorScheme.onSurface,
                              ),
                            ),
                            Text(
                              device['description'],
                              style: AppTheme.lightTheme.textTheme.bodySmall
                                  ?.copyWith(
                                color: AppTheme
                                    .lightTheme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedDevice = value!;
                });
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPreviewButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: widget.onPreviewKindle,
        icon: CustomIconWidget(
          iconName: 'preview',
          color: AppTheme.lightTheme.colorScheme.onPrimary,
          size: 20,
        ),
        label: Text('Preview on $_selectedDevice'),
        style: ElevatedButton.styleFrom(
          padding: EdgeInsets.symmetric(vertical: 2.h),
          backgroundColor: AppTheme.lightTheme.colorScheme.secondary,
        ),
      ),
    );
  }

  Widget _buildValidationStatus() {
    final List<Map<String, dynamic>> validationItems = [
      {
        'title': 'Book Title',
        'status': widget.bookData['title']?.isNotEmpty == true,
        'message':
            widget.bookData['title']?.isNotEmpty == true ? 'Valid' : 'Required',
      },
      {
        'title': 'Author Name',
        'status': widget.bookData['author']?.isNotEmpty == true,
        'message': widget.bookData['author']?.isNotEmpty == true
            ? 'Valid'
            : 'Required',
      },
      {
        'title': 'Description',
        'status': widget.bookData['description']?.isNotEmpty == true,
        'message': widget.bookData['description']?.isNotEmpty == true
            ? 'Valid'
            : 'Required',
      },
      {
        'title': 'Category',
        'status': widget.bookData['category']?.isNotEmpty == true,
        'message': widget.bookData['category']?.isNotEmpty == true
            ? 'Valid'
            : 'Required',
      },
      {
        'title': 'Price',
        'status': _isValidPrice(widget.bookData['price']),
        'message': _isValidPrice(widget.bookData['price'])
            ? 'Valid'
            : 'Must be between \$0.99 - \$200',
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Validation Status',
          style: AppTheme.lightTheme.textTheme.labelLarge?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSurface,
          ),
        ),
        SizedBox(height: 1.h),
        ...validationItems.map((item) => _buildValidationItem(
              item['title'],
              item['status'],
              item['message'],
            )),
      ],
    );
  }

  Widget _buildValidationItem(String title, bool isValid, String message) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 0.5.h),
      child: Row(
        children: [
          CustomIconWidget(
            iconName: isValid ? 'check_circle' : 'error',
            color: isValid
                ? AppTheme.lightTheme.colorScheme.primary
                : AppTheme.lightTheme.colorScheme.error,
            size: 16,
          ),
          SizedBox(width: 2.w),
          Expanded(
            child: Text(
              title,
              style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                color: AppTheme.lightTheme.colorScheme.onSurface,
              ),
            ),
          ),
          Text(
            message,
            style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
              color: isValid
                  ? AppTheme.lightTheme.colorScheme.primary
                  : AppTheme.lightTheme.colorScheme.error,
            ),
          ),
        ],
      ),
    );
  }

  bool _isValidPrice(String? price) {
    if (price == null || price.isEmpty) return false;
    final parsedPrice = double.tryParse(price);
    return parsedPrice != null && parsedPrice >= 0.99 && parsedPrice <= 200.0;
  }
}
