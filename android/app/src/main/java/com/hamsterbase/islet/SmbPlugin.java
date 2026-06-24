package com.hamsterbase.islet;

import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import jcifs.CIFSContext;
import jcifs.CloseableIterator;
import jcifs.context.BaseContext;
import jcifs.context.SingletonContext;
import jcifs.smb.NtlmPasswordAuthenticator;
import jcifs.smb.SmbFile;
import jcifs.smb.SmbFileInputStream;
import jcifs.smb.SmbFileOutputStream;

@CapacitorPlugin(name = "Smb")
public class SmbPlugin extends Plugin {

    @PluginMethod
    public void putObject(PluginCall call) {
        String host = call.getString("host");
        String share = call.getString("share");
        String username = call.getString("username");
        String password = call.getString("password");
        String domain = call.getString("domain");
        String key = call.getString("key");
        String bodyBase64 = call.getString("body");
        if (host == null || share == null || key == null || bodyBase64 == null) {
            call.reject("host, share, key and body are required");
            return;
        }

        getBridge().execute(() -> {
            try {
                String url = buildSmbUrl(host, share, key);
                CIFSContext ctx = createContext(domain, username, password);
                SmbFile file = new SmbFile(url, ctx);
                SmbFile parent = new SmbFile(file.getParent(), ctx);
                if (!parent.exists()) {
                    parent.mkdirs();
                }
                byte[] bytes = Base64.decode(bodyBase64, Base64.DEFAULT);
                try (OutputStream os = new SmbFileOutputStream(file)) {
                    os.write(bytes);
                }
                JSObject result = new JSObject();
                result.put("ok", true);
                call.resolve(result);
            } catch (Exception e) {
                call.reject(e.getMessage(), (String) null, e);
            }
        });
    }

    @PluginMethod
    public void getObject(PluginCall call) {
        String host = call.getString("host");
        String share = call.getString("share");
        String username = call.getString("username");
        String password = call.getString("password");
        String domain = call.getString("domain");
        String key = call.getString("key");
        if (host == null || share == null || key == null) {
            call.reject("host, share and key are required");
            return;
        }

        getBridge().execute(() -> {
            try {
                String url = buildSmbUrl(host, share, key);
                CIFSContext ctx = createContext(domain, username, password);
                SmbFile file = new SmbFile(url, ctx);
                if (!file.exists()) {
                    JSObject result = new JSObject();
                    result.put("status", 404);
                    result.put("body", "");
                    call.resolve(result);
                    return;
                }
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                try (InputStream is = new SmbFileInputStream(file)) {
                    byte[] buf = new byte[8192];
                    int len;
                    while ((len = is.read(buf)) != -1) {
                        baos.write(buf, 0, len);
                    }
                }
                JSObject result = new JSObject();
                result.put("status", 200);
                result.put("body", Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP));
                call.resolve(result);
            } catch (Exception e) {
                call.reject(e.getMessage(), (String) null, e);
            }
        });
    }

    @PluginMethod
    public void headObject(PluginCall call) {
        String host = call.getString("host");
        String share = call.getString("share");
        String username = call.getString("username");
        String password = call.getString("password");
        String domain = call.getString("domain");
        String key = call.getString("key");
        if (host == null || share == null || key == null) {
            call.reject("host, share and key are required");
            return;
        }

        getBridge().execute(() -> {
            try {
                String url = buildSmbUrl(host, share, key);
                CIFSContext ctx = createContext(domain, username, password);
                SmbFile file = new SmbFile(url, ctx);
                if (!file.exists()) {
                    JSObject result = new JSObject();
                    result.put("status", 404);
                    call.resolve(result);
                    return;
                }
                JSObject result = new JSObject();
                result.put("status", 200);
                result.put("contentLength", file.length());
                result.put("lastModified", file.getLastModified());
                call.resolve(result);
            } catch (Exception e) {
                call.reject(e.getMessage(), (String) null, e);
            }
        });
    }

    @PluginMethod
    public void testConnection(PluginCall call) {
        String host = call.getString("host");
        String share = call.getString("share");
        String username = call.getString("username");
        String password = call.getString("password");
        String domain = call.getString("domain");
        if (host == null || share == null) {
            call.reject("host and share are required");
            return;
        }

        getBridge().execute(() -> {
            try {
                String url = buildSmbUrl(host, share, "");
                CIFSContext ctx = createContext(domain, username, password);
                SmbFile dir = new SmbFile(url, ctx);
                boolean ok = dir.exists();
                JSObject result = new JSObject();
                result.put("ok", ok);
                if (ok) {
                    result.put("message", "Connected successfully");
                } else {
                    result.put("message", "Share not found");
                }
                call.resolve(result);
            } catch (Exception e) {
                JSObject result = new JSObject();
                result.put("ok", false);
                result.put("message", e.getMessage());
                call.resolve(result);
            }
        });
    }

    private static String buildSmbUrl(String host, String share, String key) {
        String base = host.trim().replaceAll("^smb://|^//|^\\\\\\\\", "");
        base = "smb://" + base;
        String shareName = share.trim();
        String path = key.replace("\\", "/").replaceAll("^/+", "");
        return base + "/" + shareName + "/" + path;
    }

    private static CIFSContext createContext(String domain, String username, String password) {
        String user = username != null ? username.trim() : "";
        String pass = password != null ? password : "";
        String dom = (domain != null && !domain.trim().isEmpty()) ? domain.trim() : null;
        NtlmPasswordAuthenticator auth = dom != null
            ? new NtlmPasswordAuthenticator(dom, user, pass)
            : new NtlmPasswordAuthenticator(user, pass);
        return SingletonContext.getInstance().withCredentials(auth);
    }
}
