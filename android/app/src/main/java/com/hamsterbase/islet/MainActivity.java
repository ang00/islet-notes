package com.hamsterbase.islet;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(ImageToolsPlugin.class);
    registerPlugin(AttachmentFileCachePlugin.class);
    registerPlugin(WebDavHttpPlugin.class);
    registerPlugin(VideoToolsPlugin.class);
    registerPlugin(SmbPlugin.class);
    super.onCreate(savedInstanceState);
    configureWebViewDebugging();
    configureEdgeToEdge();
    configureSafeAreaInsets();
  }

  @Override
  public void onStart() {
    super.onStart();
    // https://github.com/ionic-team/capacitor/issues/5384
    WebView webView = getBridge().getWebView();
    webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
  }

  private void configureWebViewDebugging() {
    WebView.setWebContentsDebuggingEnabled(true);
  }

  private void configureEdgeToEdge() {
    Window window = getWindow();
    WindowCompat.setDecorFitsSystemWindows(window, false);

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
      window.setStatusBarColor(Color.TRANSPARENT);
      window.setNavigationBarColor(Color.TRANSPARENT);
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.setNavigationBarContrastEnforced(false);
    }
  }

  private void configureSafeAreaInsets() {
    WebView webView = getBridge().getWebView();
    View webViewContainer = (View) webView.getParent();

    ViewCompat.setOnApplyWindowInsetsListener(webViewContainer, (view, insets) -> {
      Insets systemBars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
      );
      Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
      boolean keyboardVisible = insets.isVisible(WindowInsetsCompat.Type.ime());

      view.setPadding(0, 0, 0, keyboardVisible ? ime.bottom : 0);
      injectSafeAreaInsets(
        systemBars.top,
        systemBars.right,
        keyboardVisible ? 0 : systemBars.bottom,
        systemBars.left
      );

      return insets;
    });

    getBridge().addWebViewListener(
      new WebViewListener() {
        @Override
        public void onPageCommitVisible(WebView view, String url) {
          super.onPageCommitVisible(view, url);
          ViewCompat.requestApplyInsets(webViewContainer);
        }
      }
    );

    ViewCompat.requestApplyInsets(webViewContainer);
  }

  private void injectSafeAreaInsets(int top, int right, int bottom, int left) {
    float density = getResources().getDisplayMetrics().density;
    int topCssPx = Math.round(top / density);
    int rightCssPx = Math.round(right / density);
    int bottomCssPx = Math.round(bottom / density);
    int leftCssPx = Math.round(left / density);

    String script = String.format(
      Locale.US,
      "document.documentElement.style.setProperty('--safe-area-inset-top', '%dpx');" +
        "document.documentElement.style.setProperty('--safe-area-inset-right', '%dpx');" +
        "document.documentElement.style.setProperty('--safe-area-inset-bottom', '%dpx');" +
        "document.documentElement.style.setProperty('--safe-area-inset-left', '%dpx');",
      topCssPx,
      rightCssPx,
      bottomCssPx,
      leftCssPx
    );

    getBridge().getWebView().evaluateJavascript(script, null);
  }
}
