package com.example.milo.ui.main

import android.annotation.SuppressLint
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader
import kotlinx.coroutines.delay

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

  var isWebViewLoaded by remember { mutableStateOf(false) }
  var isMinDelayPassed by remember { mutableStateOf(false) }

  // Minimum duration of splash screen (1200ms) to ensure smooth animation
  LaunchedEffect(Unit) {
    delay(1200)
    isMinDelayPassed = true
  }

  // Logo animation on entry
  var startLogoAnimation by remember { mutableStateOf(false) }
  LaunchedEffect(Unit) {
    startLogoAnimation = true
  }

  val logoAlpha by animateFloatAsState(
    targetValue = if (startLogoAnimation) 1f else 0f,
    animationSpec = tween(durationMillis = 800),
    label = "LogoAlpha"
  )

  val logoScale by animateFloatAsState(
    targetValue = if (startLogoAnimation) 1f else 0.85f,
    animationSpec = tween(durationMillis = 800),
    label = "LogoScale"
  )

  val showSplash = !isWebViewLoaded || !isMinDelayPassed
  val splashAlpha by animateFloatAsState(
    targetValue = if (showSplash) 1f else 0f,
    animationSpec = tween(durationMillis = 400),
    label = "SplashAlpha"
  )

  Box(modifier = Modifier.fillMaxSize()) {
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

            override fun onPageFinished(view: WebView?, url: String?) {
              super.onPageFinished(view, url)
              isWebViewLoaded = true
            }
          }

          webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
              android.util.Log.d(
                "WebViewConsole",
                "${consoleMessage?.message()} -- From line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}"
              )
              return true
            }
          }

          loadUrl("https://appassets.androidplatform.net/assets/index.html")
        }
      },
      modifier = Modifier.fillMaxSize()
    )

    if (splashAlpha > 0f) {
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(Color(android.graphics.Color.parseColor("#E2E1CF")))
          .alpha(splashAlpha),
        contentAlignment = Alignment.Center
      ) {
        Column(
          horizontalAlignment = Alignment.CenterHorizontally,
          verticalArrangement = Arrangement.Center
        ) {
          Image(
            painter = painterResource(id = com.example.milo.R.drawable.logo),
            contentDescription = "FuelLog Logo",
            modifier = Modifier
              .width(180.dp)
              .wrapContentHeight()
              .graphicsLayer(
                scaleX = logoScale,
                scaleY = logoScale,
                alpha = logoAlpha
              ),
            contentScale = ContentScale.Fit
          )
        }
      }
    }
  }
}

