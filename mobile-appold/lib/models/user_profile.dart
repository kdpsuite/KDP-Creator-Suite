class UserProfile {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? avatarUrl;
  final String subscriptionTier;
  final DateTime? subscriptionExpiresAt;
  final int storageUsedMb;
  final int storageLimitMb;
  final int projectsCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  UserProfile({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.avatarUrl,
    required this.subscriptionTier,
    this.subscriptionExpiresAt,
    required this.storageUsedMb,
    required this.storageLimitMb,
    required this.projectsCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: json['full_name'] as String,
      role: json['role'] as String,
      avatarUrl: json['avatar_url'] as String?,
      subscriptionTier: json['subscription_tier'] as String,
      subscriptionExpiresAt: json['subscription_expires_at'] != null
          ? DateTime.parse(json['subscription_expires_at'] as String)
          : null,
      storageUsedMb: json['storage_used_mb'] as int,
      storageLimitMb: json['storage_limit_mb'] as int,
      projectsCount: json['projects_count'] as int,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'role': role,
      'avatar_url': avatarUrl,
      'subscription_tier': subscriptionTier,
      'subscription_expires_at': subscriptionExpiresAt?.toIso8601String(),
      'storage_used_mb': storageUsedMb,
      'storage_limit_mb': storageLimitMb,
      'projects_count': projectsCount,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  UserProfile copyWith({
    String? id,
    String? email,
    String? fullName,
    String? role,
    String? avatarUrl,
    String? subscriptionTier,
    DateTime? subscriptionExpiresAt,
    int? storageUsedMb,
    int? storageLimitMb,
    int? projectsCount,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserProfile(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      role: role ?? this.role,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      subscriptionExpiresAt:
          subscriptionExpiresAt ?? this.subscriptionExpiresAt,
      storageUsedMb: storageUsedMb ?? this.storageUsedMb,
      storageLimitMb: storageLimitMb ?? this.storageLimitMb,
      projectsCount: projectsCount ?? this.projectsCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  bool get isPremium => subscriptionTier == 'premium' || role == 'premium';
  bool get isAdmin => role == 'admin';

  double get storageUsagePercentage =>
      storageLimitMb > 0 ? (storageUsedMb / storageLimitMb) * 100 : 0;

  int get remainingStorageMb => storageLimitMb - storageUsedMb;
}
