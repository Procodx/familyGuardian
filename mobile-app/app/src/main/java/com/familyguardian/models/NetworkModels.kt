package com.familyguardian.models

data class RegisterRequest(
    val deviceId: String,
    val deviceName: String
)

data class RegisterResponse(
    val deviceToken: String
)
