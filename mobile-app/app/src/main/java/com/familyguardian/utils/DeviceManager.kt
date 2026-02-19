package com.familyguardian.utils

import android.content.Context
import android.provider.Settings
import java.util.UUID

class DeviceManager(private val context: Context) {
    private val prefs = context.getSharedPreferences("family_guardian_prefs", Context.MODE_PRIVATE)

    fun getDeviceId(): String {
        var deviceId = prefs.getString("device_id", null)
        if (deviceId == null) {
            // Use Android ID or fallback to random UUID
            deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
                ?: UUID.randomUUID().toString()
            prefs.edit().putString("device_id", deviceId).apply()
        }
        return deviceId
    }

    fun getDeviceName(): String {
        return android.os.Build.MODEL ?: "Android Device"
    }

    fun saveDeviceToken(token: String) {
        prefs.edit().putString("device_token", token).apply()
    }

    fun getDeviceToken(): String? {
        return prefs.getString("device_token", null)
    }

    fun isRegistered(): Boolean {
        return getDeviceToken() != null
    }
}
