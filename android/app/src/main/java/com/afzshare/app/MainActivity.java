package com.afzshare.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppSizePlugin.class);
        super.onCreate(savedInstanceState);
    }
}