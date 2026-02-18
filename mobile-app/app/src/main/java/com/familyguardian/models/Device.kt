package com.familyguardian.models

data class Device(
    val id: String,
    val name: String,
    val batteryLevel: Int,
    val lastKnownLocation: String?
)
