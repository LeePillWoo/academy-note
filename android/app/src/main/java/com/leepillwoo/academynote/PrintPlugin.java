package com.leepillwoo.academynote;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 인쇄 플러그인. 웹뷰에서는 window.print()가 동작하지 않아서,
 * 안드로이드 인쇄 서비스(네트워크 프린터, PDF로 저장)를 직접 엽니다. 웹 쪽: src/native/print.ts
 * 인쇄 모양은 웹의 @media print CSS를 그대로 따릅니다.
 */
@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        String name = call.getString("name", "학원노트");
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager manager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter adapter = getBridge().getWebView().createPrintDocumentAdapter(name);
                PrintAttributes attributes = new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                        .build();
                manager.print(name, adapter, attributes);
                call.resolve();
            } catch (Exception e) {
                call.reject("인쇄 창을 열지 못했습니다: " + e.getMessage());
            }
        });
    }
}
