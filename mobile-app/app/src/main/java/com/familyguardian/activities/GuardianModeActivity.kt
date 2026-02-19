package com.familyguardian.activities

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.familyguardian.models.RegisterRequest
import com.familyguardian.network.ApiService
import com.familyguardian.services.LocationService
import com.familyguardian.utils.DeviceManager
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

import android.widget.Button
import com.familyguardian.R

class GuardianModeActivity : AppCompatActivity() {
    private lateinit var deviceManager: DeviceManager
    
    companion object {
        private const val TAG = "RegistrationFlow"
        const val BASE_URL = "http://10.0.2.2:3000/" // Native address for bridge to host machine
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_guardian_mode)
        
        deviceManager = DeviceManager(this)

        findViewById<Button>(R.id.btnPanic)?.setOnClickListener {
            Log.e(TAG, "PANIC BUTTON PRESSED!")
            val intent = Intent(this, LocationService::class.java).apply {
                action = LocationService.ACTION_SEND_PANIC
            }
            startService(intent)
        }

        if (!deviceManager.isRegistered()) {
            registerDevice()
        } else {
            Log.d(TAG, "Device already registered. Starting services...")
            startMonitoringService()
        }
    }

    private fun registerDevice() {
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(ApiService::class.java)
        val request = RegisterRequest(
            deviceId = deviceManager.getDeviceId(),
            deviceName = deviceManager.getDeviceName()
        )

        lifecycleScope.launch {
            try {
                Log.d(TAG, "Registering device: $request")
                val response = apiService.registerDevice(request)
                if (response.isSuccessful && response.body() != null) {
                    val token = response.body()!!.deviceToken
                    deviceManager.saveDeviceToken(token)
                    Log.d(TAG, "Registration successful. Token saved.")
                    startMonitoringService()
                } else {
                    Log.e(TAG, "Registration failed: ${response.code()} ${response.errorBody()?.string()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Network error during registration: ${e.message}")
            }
        }
    }

    private fun startMonitoringService() {
        val intent = Intent(this, LocationService::class.java)
        startService(intent)
        Log.d(TAG, "LocationService start intent sent.")
    }
}
