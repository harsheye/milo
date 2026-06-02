package com.example.milo.ui.main

import android.annotation.SuppressLint
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MainScreen(
  onItemClick: (Any) -> Unit = {},
  modifier: Modifier = Modifier,
) {
  AndroidView(
    factory = { context ->
        WebView(context).apply {
          settings.javaScriptEnabled = true
          settings.domStorageEnabled = true
          settings.allowFileAccess = true
          settings.allowContentAccess = true
          settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
          settings.cacheMode = WebSettings.LOAD_NO_CACHE
          clearCache(true)
          
          webViewClient = WebViewClient()
          loadUrl("file:///android_asset/index.html")
        }
    },
    modifier = Modifier.fillMaxSize()
  )
}
