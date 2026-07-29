package com.afzshare.app

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "InstalledApps")
class InstalledAppsPlugin : Plugin() {

    @PluginMethod
    fun getApps(call: PluginCall) {
        val pm = context.packageManager
        val includeSystem = call.getBoolean("includeSystemApps", false)!!

        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { includeSystem || (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }
            .map {
                JSObject().apply {
                    put("name", pm.getApplicationLabel(it).toString())
                    put("packageName", it.packageName)
                }
            }

        val result = JSObject()
        result.put("apps", JSArray(apps))
        call.resolve(result)
    }
}