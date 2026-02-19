package com.familyguardian.services

import android.app.Service
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import com.familyguardian.network.SocketManager
import com.familyguardian.utils.DeviceManager
import kotlinx.coroutines.*

class LocationService : Service() {
    private lateinit var deviceManager: DeviceManager
    private var socketManager: SocketManager? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isTracking = false
    private var currentBattery = 100 // Start at 100%

    companion object {
        private const val TAG = "LocationService"
        private const val UPDATE_INTERVAL = 5000L // 5 seconds
        const val SERVER_URL = "http://10.0.2.2:3000" // Emulator localhost address
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        deviceManager = DeviceManager(this)
        Log.d(TAG, "LocationService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val token = deviceManager.getDeviceToken()
        if (token == null) {
            Log.e(TAG, "Cannot start tracking: No device token found")
            stopSelf()
            return START_NOT_STICKY
        }

        if (!isTracking) {
            startTracking(token)
        }

        return START_STICKY
    }

    private fun startTracking(token: String) {
        isTracking = true
        socketManager = SocketManager(SERVER_URL, token)
        socketManager?.connect()

        serviceScope.launch {
            while (isActive && isTracking) {
                sendMockLocation()
                delay(UPDATE_INTERVAL)
            }
        }
    }

    private fun sendMockLocation() {
        // Simple random movement around a base point (e.g., Berlin)
        val baseLat = 52.5200
        val baseLng = 13.4050
        val latOffset = (Math.random() - 0.5) * 0.01
        val lngOffset = (Math.random() - 0.5) * 0.01

        // Realistic battery drain: Decrement occasionally
        if (Math.random() > 0.9 && currentBattery > 5) {
            currentBattery -= 1
        }
        
        socketManager?.sendLocation(
            latitude = baseLat + latOffset,
            longitude = baseLng + lngOffset,
            accuracy = 5.0 + (Math.random() * 10), // Accuracy between 5m and 15m
            batteryLevel = currentBattery
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        isTracking = false
        serviceScope.cancel()
        socketManager?.disconnect()
        Log.d(TAG, "LocationService destroyed")
    }
}
