package com.familyguardian.network

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URISyntaxException

class SocketManager(private val serverUrl: String, private val deviceToken: String) {
    private var socket: Socket? = null

    companion object {
        private const val TAG = "SocketManager"
    }

    fun connect() {
        if (socket != null && socket!!.connected()) return

        try {
            val opts = IO.Options()
            opts.query = "deviceToken=$deviceToken"
            
            socket = IO.socket(serverUrl, opts)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Socket connected successfully")
            }

            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.d(TAG, "Socket disconnected")
            }

            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e(TAG, "Connection error: ${args.getOrNull(0)}")
            }

            socket?.connect()
        } catch (e: URISyntaxException) {
            Log.e(TAG, "URL Error: ${e.message}")
        }
    }

    fun disconnect() {
        socket?.disconnect()
    }

    fun sendLocation(latitude: Double, longitude: Double, accuracy: Double, batteryLevel: Int) {
        val data = JSONObject()
        data.put("latitude", latitude)
        data.put("longitude", longitude)
        data.put("accuracy", accuracy)
        data.put("batteryLevel", batteryLevel)
        data.put("timestamp", System.currentTimeMillis())

        Log.d(TAG, "Sending location_update: $data")
        socket?.emit("location_update", data)
    }

    fun sendPanicAlert(deviceId: String, latitude: Double, longitude: Double, batteryLevel: Int) {
        val data = JSONObject()
        data.put("deviceId", deviceId)
        data.put("latitude", latitude)
        data.put("longitude", longitude)
        data.put("batteryLevel", batteryLevel)
        data.put("timestamp", System.currentTimeMillis())

        Log.e(TAG, "EMITTING PANIC ALERT: $data")
        socket?.emit("panic_alert", data)
    }

    fun isConnected(): Boolean = socket?.connected() ?: false
}
