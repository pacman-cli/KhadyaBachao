package com.khadyabachao

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    loadReactNative(this)
  }

  /**
   * FCM notification-message pushes posted while the app is backgrounded land
   * on the channel named by the manifest meta-data
   * (default_notification_channel_id). Without a HIGH-importance channel they
   * fall back to a silent "Miscellaneous" channel.
   */
  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        "khadya_alerts",
        "Khadya Bachao Alerts",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Claim, chat, schedule and verification alerts"
        enableVibration(true)
      }
      getSystemService(NotificationManager::class.java)
        .createNotificationChannel(channel)
    }
  }
}
