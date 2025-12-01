import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

// Placeholder AdMob App ID (Android Test ID)
// The actual ID is configured in AndroidManifest.xml and Info.plist
const String kTestAdUnitId = 'ca-app-pub-3940256099942544/6300978111'; // Test Banner Ad Unit ID

class AdMobService {
  static Future<void> initialize() async {
    // Ensure the Google Mobile Ads SDK is initialized
    await MobileAds.instance.initialize();
    // Optional: Request a Configuration object to check initialization status
    // MobileAds.instance.updateRequestConfiguration(RequestConfiguration(testDeviceIds: ['YOUR_DEVICE_ID']));
  }

  // Placeholder for a Banner Ad Widget
  static Widget getBannerAdWidget() {
    final BannerAd bannerAd = BannerAd(
      adUnitId: kTestAdUnitId, // Use test ID for placeholder
      size: AdSize.banner,
      request: const AdRequest(),
      listener: const BannerAdListener(),
    );

    // Load the ad. This is a placeholder and will only show a test ad.
    bannerAd.load();

    return Container(
      alignment: Alignment.center,
      width: bannerAd.size.width.toDouble(),
      height: bannerAd.size.height.toDouble(),
      child: AdWidget(ad: bannerAd),
    );
  }
}
