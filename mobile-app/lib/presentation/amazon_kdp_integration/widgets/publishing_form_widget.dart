import 'package:flutter/material.dart';
import 'package:kdp_creator_suite/theme/app_theme.dart';import 'package:sizer/sizer.dart';import '../../../core/app_export.dart';

class PublishingFormWidget extends StatefulWidget {
  final Function(Map<String, dynamic>) onFormChanged;
  final Map<String, dynamic> initialData;

  const PublishingFormWidget({
    super.key,
    required this.onFormChanged,
    this.initialData = const {},
  });

  @override
  State<PublishingFormWidget> createState() => _PublishingFormWidgetState();
}

class _PublishingFormWidgetState extends State<PublishingFormWidget> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _authorController;
  late TextEditingController _descriptionController;
  late TextEditingController _keywordsController;
  late TextEditingController _priceController;

  String _selectedCategory = 'Fiction';
  String _selectedTerritory = 'Worldwide';
  String _selectedRoyalty = '70%';
  bool _isPreOrder = false;

  final List<String> _categories = [
    'Fiction',
    'Non-Fiction',
    'Children\'s Books',
    'Romance',
    'Mystery & Thriller',
    'Science Fiction & Fantasy',
    'Self-Help',
    'Business & Economics',
  ];

  final List<String> _territories = [
    'Worldwide',
    'United States',
    'United Kingdom',
    'Europe',
    'Canada',
    'Australia',
  ];

  final List<String> _royaltyOptions = [
    '35%',
    '70%',
  ];

  @override
  void initState() {
    super.initState();
    _titleController =
        TextEditingController(text: widget.initialData['title'] ?? '');
    _authorController =
        TextEditingController(text: widget.initialData['author'] ?? '');
    _descriptionController =
        TextEditingController(text: widget.initialData['description'] ?? '');
    _keywordsController =
        TextEditingController(text: widget.initialData['keywords'] ?? '');
    _priceController =
        TextEditingController(text: widget.initialData['price'] ?? '9.99');

    _selectedCategory = widget.initialData['category'] ?? 'Fiction';
    _selectedTerritory = widget.initialData['territory'] ?? 'Worldwide';
    _selectedRoyalty = widget.initialData['royalty'] ?? '70%';
    _isPreOrder = widget.initialData['isPreOrder'] ?? false;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _authorController.dispose();
    _descriptionController.dispose();
    _keywordsController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  void _updateFormData() {
    final formData = {
      'title': _titleController.text,
      'author': _authorController.text,
      'description': _descriptionController.text,
      'keywords': _keywordsController.text,
      'price': _priceController.text,
      'category': _selectedCategory,
      'territory': _selectedTerritory,
      'royalty': _selectedRoyalty,
      'isPreOrder': _isPreOrder,
    };
    widget.onFormChanged(formData);
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Book Details',
            style: AppTheme.lightTheme.textTheme.headlineSmall?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSurface,
            ),
          ),
          SizedBox(height: 2.h),
          _buildTextField(
            controller: _titleController,
            label: 'Book Title',
            hint: 'Enter your book title',
            required: true,
          ),
          SizedBox(height: 2.h),
          _buildTextField(
            controller: _authorController,
            label: 'Author Name',
            hint: 'Enter author name',
            required: true,
          ),
          SizedBox(height: 2.h),
          _buildTextField(
            controller: _descriptionController,
            label: 'Description',
            hint: 'Enter book description',
            maxLines: 4,
            required: true,
          ),
          SizedBox(height: 2.h),
          _buildDropdownField(
            label: 'Category',
            value: _selectedCategory,
            items: _categories,
            onChanged: (value) {
              setState(() {
                _selectedCategory = value!;
                _updateFormData();
              });
            },
          ),
          SizedBox(height: 2.h),
          _buildTextField(
            controller: _keywordsController,
            label: 'Keywords',
            hint: 'Enter keywords separated by commas',
          ),
          SizedBox(height: 3.h),
          Text(
            'Pricing & Distribution',
            style: AppTheme.lightTheme.textTheme.titleLarge?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSurface,
            ),
          ),
          SizedBox(height: 2.h),
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  controller: _priceController,
                  label: 'Price (USD)',
                  hint: '9.99',
                  keyboardType: TextInputType.numberWithOptions(decimal: true),
                  prefix: '\$',
                ),
              ),
              SizedBox(width: 3.w),
              Expanded(
                child: _buildDropdownField(
                  label: 'Royalty',
                  value: _selectedRoyalty,
                  items: _royaltyOptions,
                  onChanged: (value) {
                    setState(() {
                      _selectedRoyalty = value!;
                      _updateFormData();
                    });
                  },
                ),
              ),
            ],
          ),
          SizedBox(height: 2.h),
          _buildDropdownField(
            label: 'Territory',
            value: _selectedTerritory,
            items: _territories,
            onChanged: (value) {
              setState(() {
                _selectedTerritory = value!;
                _updateFormData();
              });
            },
          ),
          SizedBox(height: 2.h),
          _buildSwitchTile(
            title: 'Pre-order Setup',
            subtitle: 'Allow customers to pre-order your book',
            value: _isPreOrder,
            onChanged: (value) {
              setState(() {
                _isPreOrder = value;
                _updateFormData();
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    bool required = false,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? prefix,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RichText(
          text: TextSpan(
            text: label,
            style: AppTheme.lightTheme.textTheme.labelLarge?.copyWith(
              color: AppTheme.lightTheme.colorScheme.onSurface,
            ),
            children: required
                ? [
                    TextSpan(
                      text: ' *',
                      style: TextStyle(
                        color: AppTheme.lightTheme.colorScheme.error,
                      ),
                    ),
                  ]
                : null,
          ),
        ),
        SizedBox(height: 1.h),
        TextFormField(
          controller: controller,
          decoration: InputDecoration(
            hintText: hint,
            prefixText: prefix,
          ),
          maxLines: maxLines,
          keyboardType: keyboardType,
          validator: required
              ? (value) {
                  return value == null || value.isEmpty
                      ? 'This field is required'
                      : null;
                }
              : null,
          onChanged: (_) => _updateFormData(),
        ),
      ],
    );
  }

  Widget _buildDropdownField({
    required String label,
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTheme.lightTheme.textTheme.labelLarge?.copyWith(
            color: AppTheme.lightTheme.colorScheme.onSurface,
          ),
        ),
        SizedBox(height: 1.h),
        DropdownButtonFormField<String>(
          initialValue: value,
          decoration: InputDecoration(
            contentPadding:
                EdgeInsets.symmetric(horizontal: 4.w, vertical: 2.h),
          ),
          items: items.map((String item) {
            return DropdownMenuItem<String>(
              value: item,
              child: Text(item),
            );
          }).toList(),
          onChanged: onChanged,
        ),
      ],
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: EdgeInsets.all(3.w),
      decoration: BoxDecoration(
        color: AppTheme.lightTheme.colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppTheme.lightTheme.colorScheme.outline,
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTheme.lightTheme.textTheme.titleMedium?.copyWith(
                    color: AppTheme.lightTheme.colorScheme.onSurface,
                  ),
                ),
                Text(
                  subtitle,
                  style: AppTheme.lightTheme.textTheme.bodySmall?.copyWith(
                    color: AppTheme.lightTheme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
