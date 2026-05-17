import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import clientIo from "socket.io-client";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { API_BASE, postJSON } from "../../lib/api";

const SCAN_COOLDOWN_MS = 900;
const MIN_BARCODE_LENGTH = 6;

type ScanStatus =
  | "idle"
  | "starting"
  | "validating"
  | "ready"
  | "error"
  | "not-mobile"
  | "missing-session"
  | "auth-required";

type BarcodeResult = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeResult[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

type ScannerControls = {
  stop: () => void;
};

const getBarcodeDetector = (): BarcodeDetectorConstructor | null => {
  const candidate = (
    window as unknown as { BarcodeDetector?: unknown }
  )?.BarcodeDetector;
  return typeof candidate === "function"
    ? (candidate as BarcodeDetectorConstructor)
    : null;
};

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  const widthMatch = window.matchMedia("(max-width: 900px)").matches;
  const ua = navigator.userAgent.toLowerCase();
  const uaMatch = /iphone|ipad|android|mobile/.test(ua);
  return widthMatch || uaMatch;
};

const normalizeBarcodeValue = (value: string) =>
  value.replace(/\s+/g, "").trim();

const buildSocketUrl = () => {
  const api = (API_BASE || "").trim();
  const isLocalApi = /localhost|127\.0\.0\.1/i.test(api);
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const isLocalHost = /localhost|127\.0\.0\.1/i.test(hostname);

  if (!api || isLocalApi) {
    if (isLocalHost && window.location.port === "5173") {
      return `${protocol}//${hostname}:8080`;
    }
    return window.location.origin;
  }

  return api;
};

export default function MobileScan() {
  const navigate = useNavigate();
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = params.get("session") ?? "";
  const shopId = params.get("shopId") ?? params.get("shop") ?? "";
  const sessionType = params.get("type") ?? "barcode";
  const authToken = params.get("token") ?? "";
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");
  const [sessionValidated, setSessionValidated] = useState(false);
  const [lastValue, setLastValue] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<ReturnType<typeof clientIo> | null>(null);
  const lastScanRef = useRef<{ value: string; ts: number } | null>(null);
  const detectorLoopRef = useRef<number | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const zxingControlsRef = useRef<ScannerControls | null>(null);
  const hasBarcodeDetectorRef = useRef(false);

  const canScan = Boolean(sessionId && shopId);
  const signInRedirect = `/login?redirect=${encodeURIComponent(
    `${window.location.pathname}${window.location.search}`
  )}`;

  useEffect(() => {
    if (!isMobileDevice()) {
      setScanStatus("not-mobile");
      setStatusMessage("Open this page on a mobile device to scan.");
      return;
    }

    if (!canScan) {
      setScanStatus("missing-session");
      setStatusMessage("Missing session details. Scan the QR from desktop.");
      return;
    }

    if (!isSignedIn) {
      setScanStatus("auth-required");
      setStatusMessage(
        "Sign in with the same account used on desktop to continue.",
      );
      return;
    }

    setScanStatus("validating");
    setStatusMessage("Validating session...");
  }, [canScan, isSignedIn]);

  useEffect(() => {
    if (scanStatus !== "validating") return;
    let cancelled = false;

    const validateSession = async () => {
      try {
        setSessionValidated(false);
        await postJSON("/api/mobile/sessions/validate", {
          sessionId,
          token: authToken,
          shopId,
          sessionType,
          userEmail,
          userId,
          deviceMeta: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        if (cancelled) return;
        setSessionValidated(true);
        setScanStatus("starting");
        setStatusMessage("Starting camera...");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Session validation failed";
        setSessionValidated(false);
        setScanStatus("error");
        setStatusMessage(message);
      }
    };

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [authToken, scanStatus, sessionId, sessionType, shopId, userEmail, userId]);

  useEffect(() => {
    if (!canScan || scanStatus === "not-mobile" || !sessionValidated) return;

    const socketUrl = buildSocketUrl();
    const socket = clientIo(socketUrl, {
      query: {
        shopId,
        sessionId,
        token: authToken,
        sessionType,
      },
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setIsSocketConnected(true);
      socket.emit("mobile:log", {
        level: "info",
        message: "mobile socket connected",
        shopId,
        sessionId,
        sessionType,
        ts: Date.now(),
      });
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", (err) => {
      setIsSocketConnected(false);
      const message = String(err?.message || err);
      setStatusMessage(`Socket error: ${message}`);
      socket.emit("mobile:log", {
        level: "error",
        message: "socket connect_error",
        detail: message,
        shopId,
        sessionId,
        sessionType,
        ts: Date.now(),
      });
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authToken, canScan, sessionId, sessionType, shopId, scanStatus, sessionValidated]);

  const publishBarcode = (value: string) => {
    const cleaned = normalizeBarcodeValue(value);
    if (!cleaned || cleaned.length < MIN_BARCODE_LENGTH) return;

    const now = Date.now();
    const lastScan = lastScanRef.current;
    if (lastScan && lastScan.value === cleaned && now - lastScan.ts < SCAN_COOLDOWN_MS) {
      return;
    }

    lastScanRef.current = { value: cleaned, ts: now };
    setLastValue(cleaned);
    setLastSentAt(now);

    socketRef.current?.emit("mobile:barcode", {
      value: cleaned,
      source: "mobile",
      ts: now,
      sessionId,
      shopId,
      sessionType,
    });

    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  };

  const stopStreams = () => {
    if (detectorLoopRef.current) {
      cancelAnimationFrame(detectorLoopRef.current);
      detectorLoopRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        zxingControlsRef.current?.stop();
      } catch (err) {
        console.warn("Failed to reset ZXing reader", err);
      }
      zxingReaderRef.current = null;
      zxingControlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startBarcodeDetectorLoop = () => {
    const video = videoRef.current;
    const detectorCtor = getBarcodeDetector();
    if (!video || !detectorCtor) return false;

    const formats = [
      "code_128",
      "code_39",
      "code_93",
      "codabar",
      "ean_13",
      "ean_8",
      "upc_a",
      "upc_e",
      "itf",
      "qr_code",
      "data_matrix",
    ];

    let detector: BarcodeDetectorInstance | null = null;
    try {
      detector = new detectorCtor({ formats });
    } catch (err) {
      console.warn("BarcodeDetector not available", err);
      return false;
    }

    const scanFrame = async () => {
      if (!detector) return;
      if (video.readyState >= 2) {
        try {
          const results = await detector.detect(video);
          if (results.length > 0) {
            publishBarcode(results[0].rawValue);
          }
        } catch (err) {
          // Ignore detection errors to keep loop running
        }
      }
      detectorLoopRef.current = requestAnimationFrame(scanFrame);
    };

    detectorLoopRef.current = requestAnimationFrame(scanFrame);
    return true;
  };

  const startZxingFallback = () => {
    const video = videoRef.current;
    if (!video) return;

    const reader = new BrowserMultiFormatReader();
    zxingReaderRef.current = reader;

    reader.decodeFromVideoDevice(undefined, video, (result) => {
      if (result) {
        publishBarcode(result.getText());
      }
    }).then((controls) => {
      zxingControlsRef.current = controls as ScannerControls;
    }).catch((err) => {
      console.warn("ZXing decode failed", err);
    });
  };

  const startCamera = async () => {
    try {
      stopStreams();
      setStatusMessage("Requesting camera access...");
      if (!navigator.mediaDevices?.getUserMedia) {
        setScanStatus("error");
        setStatusMessage("Camera is not supported on this device.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setPermissionState("granted");
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      hasBarcodeDetectorRef.current = Boolean(getBarcodeDetector());

      if (hasBarcodeDetectorRef.current) {
        const started = startBarcodeDetectorLoop();
        if (!started) {
          startZxingFallback();
        }
      } else {
        startZxingFallback();
      }

      setScanStatus("ready");
      setStatusMessage(null);
    } catch (err) {
      const errorName = err instanceof Error ? err.name : "UnknownError";
      setPermissionState("denied");
      console.error("Camera start failed", err);
      setScanStatus("error");
      setStatusMessage(
        errorName === "NotAllowedError"
          ? "Camera access denied. Allow camera permissions and retry."
          : "Camera access failed. Please allow camera permissions.",
      );
      socketRef.current?.emit("mobile:log", {
        level: "error",
        message: "camera start failed",
        detail: String((err as Error)?.message || err),
        shopId,
        sessionId,
        sessionType,
        ts: Date.now(),
      });
    }
  };

  useEffect(() => {
    if (!canScan || scanStatus !== "starting") return;
    startCamera();

    return () => {
      stopStreams();
    };
  }, [canScan, scanStatus]);

  const statusBadge = () => {
    if (!isSocketConnected) return "Offline";
    if (scanStatus === "ready") return "Scanning";
    if (scanStatus === "starting") return "Starting";
    return "Idle";
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">CeyPOS Mobile</p>
          <h1 className="text-xl font-semibold text-gray-900">Scan & Sync</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Session</p>
          <p className="text-sm font-medium text-gray-900">{sessionType}</p>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 flex flex-col gap-4">
        {scanStatus === "not-mobile" ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="max-w-sm">
              <h2 className="text-lg font-semibold mb-2">Mobile Only</h2>
              <p className="text-sm text-gray-500">
                This scanner works best on a phone. Open the QR link on mobile.
              </p>
            </div>
          </div>
        ) : scanStatus === "missing-session" ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="max-w-sm">
              <h2 className="text-lg font-semibold mb-2">Missing Session</h2>
              <p className="text-sm text-gray-500">{statusMessage}</p>
            </div>
          </div>
        ) : scanStatus === "auth-required" ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="max-w-sm space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Sign In Required</h2>
                <p className="text-sm text-gray-500">{statusMessage}</p>
              </div>
              <button
                onClick={() => navigate(signInRedirect)}
                className="w-full py-3 rounded-full bg-[#ecff76] text-gray-900 font-semibold"
              >
                Continue to Sign In
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-3xl border border-[#ecff76]/60 bg-gray-900">
              <video
                ref={videoRef}
                className="w-full h-[60vh] object-cover"
                muted
                playsInline
              />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-6 border border-white/20 rounded-2xl"></div>
                <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-24 border-2 border-[#ecff76]/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"></div>
                <div className="absolute top-6 left-6 px-3 py-1 rounded-full text-xs bg-white/90 border border-gray-200 text-gray-700">
                  {statusBadge()}
                </div>
              </div>
            </div>

            {statusMessage && (
              <div className="text-sm text-gray-500">{statusMessage}</div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-[#f8ffe1] rounded-2xl p-3 border border-[#ecff76]">
                <p className="text-gray-500 text-xs">Last scan</p>
                <p className="font-semibold truncate">{lastValue || "--"}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                <p className="text-gray-500 text-xs">Sent</p>
                <p className="font-semibold">
                  {lastSentAt ? new Date(lastSentAt).toLocaleTimeString() : "--"}
                </p>
              </div>
            </div>

            {scanStatus === "error" && (
              <button
                onClick={() => {
                  setScanStatus("starting");
                  setStatusMessage("Restarting camera...");
                }}
                className="w-full py-3 rounded-full bg-[#ecff76] text-gray-900 font-semibold"
              >
                {permissionState === "denied" ? "Enable Camera" : "Retry Camera"}
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="px-6 py-4 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
        <span>{shopId || "No shop"}</span>
        <span>{isSocketConnected ? "Connected" : "Offline"}</span>
      </footer>
    </div>
  );
}
