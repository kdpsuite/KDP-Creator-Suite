import 'package:flutter/foundation.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

class RevenueCatService {
  // 🚨 API KEYS SHOULD BE PROVIDED IN ENV VARIABLES 🚨
  static const String _androidApiKey = 'REVENUECAT_ANDROID_API_KEY_PLACEHOLDER';
  static const String _iosApiKey = 'REVENUECAT_IOS_API_KEY_PLACEHOLDER';
  static const String _premiumEntitlementId = 'premium_entitlement_id';

  static Future<void> initialize() async {
    // Set debug logs for development
    await Purchases.setLogLevel(
        kDebugMode ? LogLevel.debug : LogLevel.info);

    // Configure RevenueCat with the appropriate API key
    if (defaultTargetPlatform == TargetPlatform.android) {
      await Purchases.configure(
          PurchasesConfiguration(_androidApiKey));
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      await Purchases.configure(
          PurchasesConfiguration(_iosApiKey));
    }

    debugPrint('RevenueCat initialized.');
  }

  // Check for premium access (e.g., Pro or Studio tier)
  static Future<bool> isPremium() async {
    try {
      final purchaserInfo = await Purchases.getCustomerInfo();
      return purchaserInfo.entitlements.all[_premiumEntitlementId]?.isActive ?? false;
    } catch (e) {
      debugPrint('Error checking premium status: $e');
      return false;
    }
  }

  // Fetch available offerings (subscription plans)
  static Future<Offerings?> fetchOfferings() async {
    try {
      return await Purchases.getOfferings();
    } catch (e) {
      debugPrint('Error fetching offerings: $e');
      return null;
    }
  }

  // Purchase a package (e.g., Monthly Pro)
  static Future<bool> purchasePackage(Package package) async {
    try {
      final purchaserInfo = await Purchases.purchasePackage(package);
      return purchaserInfo.entitlements.all[_premiumEntitlementId]?.isActive ?? false;
    } catch (e) {
      debugPrint('Purchase failed: $e');
      return false;
    }
  }

  // Restore previous purchases
  static Future<bool> restorePurchases() async {
    try {
      final purchaserInfo = await Purchases.restorePurchases();
      return purchaserInfo.entitlements.all[_premiumEntitlementId]?.isActive ?? false;
    } catch (e) {
      debugPrint('Restore failed: $e');
      return false;
    }
  }

  // Identify user for cross-platform sync (Dashboard & Mobile)
  static Future<void> logIn(String userId) async {
    try {
      await Purchases.logIn(userId);
    } catch (e) {
      debugPrint('RevenueCat Login failed: $e');
    }
  }

  static Future<void> logOut() async {
    try {
      await Purchases.logOut();
    } catch (e) {
      debugPrint('RevenueCat Logout failed: $e');
    }
  }
}
