package com.familyguardian.network

import com.familyguardian.models.RegisterRequest
import com.familyguardian.models.RegisterResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("device/register")
    suspend fun registerDevice(@Body request: RegisterRequest): Response<RegisterResponse>
}
