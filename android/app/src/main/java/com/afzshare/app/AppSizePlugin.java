package com.afzshare.app;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "AppSize")
public class AppSizePlugin extends Plugin {

    @PluginMethod
    public void getAppSize(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) {
            call.reject("packageName is required");
            return;
        }

        try {
            PackageManager pm = getContext().getPackageManager();
            ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
            File apkFile = new File(info.sourceDir);
            long sizeBytes = apkFile.length();

            boolean isSystemApp = (info.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
            boolean hasLauncherIcon = pm.getLaunchIntentForPackage(packageName) != null;

            JSObject ret = new JSObject();
            ret.put("packageName", packageName);
            ret.put("sizeBytes", sizeBytes);
            ret.put("isSystemApp", isSystemApp);
            ret.put("hasLauncherIcon", hasLauncherIcon);
            call.resolve(ret);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Package not found: " + packageName, e);
        } catch (Exception e) {
            call.reject("Failed to get app size", e);
        }
    }
}