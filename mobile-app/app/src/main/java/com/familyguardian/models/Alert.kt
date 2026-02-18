package com.familyguardian.models

data class Alert(
    val id: String,
    val type: String, // e.g., "PANIC", "LOW_BATTERY"
    val timestamp: Long,
    val deviceId: String
)
