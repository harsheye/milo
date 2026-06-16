package com.example.milo.ui.main

import android.annotation.SuppressLint
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MainScreen(
  onItemClick: (Any) -> Unit = {},
  modifier: Modifier = Modifier,
) {
  val context = LocalContext.current
  val assetLoader = remember {
    WebViewAssetLoader.Builder()
      .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
      .build()
  }

  AndroidView(
    factory = { webViewContext ->
        WebView(webViewContext).apply {
          setBackgroundColor(android.graphics.Color.parseColor("#E2E1CF"))
          settings.javaScriptEnabled = true
          settings.domStorageEnabled = true
          settings.allowFileAccess = true
          settings.allowContentAccess = true
          settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
          settings.cacheMode = WebSettings.LOAD_NO_CACHE
          clearCache(true)
          
          webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
              view: WebView?,
              request: WebResourceRequest
            ): WebResourceResponse? {
              return assetLoader.shouldInterceptRequest(request.url)
            }
          }

          webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
              android.util.Log.d("WebViewConsole", "${consoleMessage?.message()} -- From line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}")
              return true
            }
          }
          
          loadUrl("https://appassets.androidplatform.net/assets/index.html")
        }
    },
    modifier = Modifier.fillMaxSize()
  )
}

