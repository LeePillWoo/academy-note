package com.leepillwoo.academynote;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 직접 만든 플러그인은 super.onCreate 전에 등록합니다.
        registerPlugin(PrintPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
