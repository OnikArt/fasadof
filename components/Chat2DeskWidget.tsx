"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    chat24_token?: string;
    chat24_url?: string;
    chat24_socket_url?: string;
    chat24_static_files_domain?: string;
    lang?: string;
  }
}

const supportScriptId = "chat2desk-ie-support-script";
const widgetScriptId = "chat2desk-widget-script";

export function Chat2DeskWidget() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;

    const token = process.env.NEXT_PUBLIC_CHAT2DESK_WIDGET_TOKEN;
    if (!token) return;

    window.chat24_token = token;
    window.chat24_url = process.env.NEXT_PUBLIC_CHAT2DESK_URL || "https://livechatv2.chat2desk.com";
    window.chat24_socket_url = process.env.NEXT_PUBLIC_CHAT2DESK_SOCKET_URL || "wss://livechatv2.chat2desk.com/widget_ws_new";
    window.chat24_static_files_domain = process.env.NEXT_PUBLIC_CHAT2DESK_STATIC_DOMAIN || "https://storage.chat2desk.com/";
    window.lang = "ru";

    if (!document.getElementById(supportScriptId)) {
      const supportScript = document.createElement("script");
      supportScript.id = supportScriptId;
      supportScript.charset = "utf-8";
      supportScript.async = true;
      supportScript.src = `${window.chat24_url}/packs/ie-11-support.js`;
      document.body.appendChild(supportScript);
    }

    if (document.getElementById(widgetScriptId)) return;

    void fetch(`${window.chat24_url}/packs/manifest.json?nocache=${Date.now()}`)
      .then((response) => response.json() as Promise<Record<string, string>>)
      .then((manifest) => {
        if (document.getElementById(widgetScriptId) || !manifest["application.js"]) return;
        const widgetScript = document.createElement("script");
        widgetScript.id = widgetScriptId;
        widgetScript.type = "text/javascript";
        widgetScript.charset = "utf-8";
        widgetScript.async = true;
        widgetScript.src = `${window.chat24_url}${manifest["application.js"]}`;
        document.body.appendChild(widgetScript);
      })
      .catch(() => undefined);
  }, []);

  return null;
}
