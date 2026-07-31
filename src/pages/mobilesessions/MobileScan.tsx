import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import clientIo from "socket.io-client";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { API_BASE, postJSON } from "../../lib/api";
import { API_ROUTES } from "../../lib/apiRoutes";
import { APP_ROUTES } from "../../lib/routes";

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

type ProductDraft = {
  barcode: string;
  inventoryCode: string;
  name: string;
  category: string;
  sku: string;
  price: string;
  stock: string;
  source: "inventory" | "global" | "manual" | "";
};

const EMPTY_DRAFT: ProductDraft = {
  barcode: "",
  inventoryCode: "",
  name: "",
  category: "",
  sku: "",
  price: "",
  stock: "0",
  source: "",
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
  const { user, isLoaded: isUserLoaded } = useUser();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = params.get("session") ?? "";
  const shopId = params.get("shopId") ?? params.get("shop") ?? "";
  const sessionType = params.get("type") === "checkout" ? "checkout" : "barcode";
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
  const [manualValue, setManualValue] = useState("");
  const [productDraft, setProductDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [scanHistory, setScanHistory] = useState<
    Array<{ barcode: string; source: string; at: number }>
  >([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<ReturnType<typeof clientIo> | null>(null);
  const lastScanRef = useRef<{ value: string; ts: number } | null>(null);
  const pendingScansRef = useRef<Array<{ value: string; ts: number }>>([]);
  const detectorLoopRef = useRef<number | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const zxingControlsRef = useRef<ScannerControls | null>(null);
  const hasBarcodeDetectorRef = useRef(false);

  const canScan = Boolean(sessionId && shopId);
  const isCheckoutSession = sessionType === "checkout";
  const signInRedirect = `${APP_ROUTES.login}?redirect=${encodeURIComponent(
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

    if (!isUserLoaded || !userEmail) {
      setScanStatus("idle");
      setStatusMessage("Loading your account...");
      return;
    }

    setScanStatus("validating");
    setStatusMessage("Validating session...");
  }, [canScan, isSignedIn, isUserLoaded, userEmail]);

  useEffect(() => {
    if (scanStatus !== "validating") return;
    let cancelled = false;

    const validateSession = async () => {
      try {
        setSessionValidated(false);
        await postJSON(API_ROUTES.mobile.sessionsValidate, {
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
    if (!canScan || !sessionValidated) return;

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

    const emitScan = (scan: { value: string; ts: number }) => {
      socket.emit("mobile:barcode", {
        value: scan.value,
        source: "mobile",
        ts: scan.ts,
        sessionId,
        shopId,
        sessionType,
      });
    };

    const flushPendingScans = () => {
      const pending = pendingScansRef.current.splice(0);
      pending.forEach(emitScan);
    };

    const handleConnect = () => {
      setIsSocketConnected(true);
      flushPendingScans();
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
    socket.on("connect_error", (err: Error) => {
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
  }, [authToken, canScan, sessionId, sessionType, shopId, sessionValidated]);

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
    setSaveStatus("idle");

    if (!isCheckoutSession) {
      setProductDraft((prev) => ({
        ...EMPTY_DRAFT,
        ...prev,
        barcode: cleaned,
        source: prev.barcode === cleaned ? prev.source : "",
      }));
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit("mobile:barcode", {
        value: cleaned,
        source: "mobile",
        ts: now,
        sessionId,
        shopId,
        sessionType,
      }, (response: unknown) => {
        if (isCheckoutSession) return;
        const result = response as {
          ok?: boolean;
          lookup?: {
            found?: boolean;
            source?: string | null;
            product?: Record<string, unknown> | null;
          };
        };
        const lookup = result?.lookup;
        const product = lookup?.product;
        if (!result?.ok || !product) {
          setScanHistory((prev) => [
            { barcode: cleaned, source: "new", at: now },
            ...prev.slice(0, 5),
          ]);
          return;
        }
        setProductDraft({
          barcode: cleaned,
          inventoryCode: String(product.inventory_code || ""),
          name: String(product.name || ""),
          category: String(product.category || ""),
          sku: String(product.sku || ""),
          price:
            product.price === null || product.price === undefined
              ? ""
              : String(product.price),
          stock:
            product.stock === null || product.stock === undefined
              ? "0"
              : String(product.stock),
          source:
            lookup.source === "inventory" || lookup.source === "global"
              ? lookup.source
              : "manual",
        });
        setScanHistory((prev) => [
          { barcode: cleaned, source: String(lookup.source || "match"), at: now },
          ...prev.slice(0, 5),
        ]);
      });
    } else {
      pendingScansRef.current = [
        ...pendingScansRef.current.slice(-9),
        { value: cleaned, ts: now },
      ];
      setStatusMessage("Scanner is reconnecting. Scan queued.");
    }

    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  };

  const saveImportedProduct = async () => {
    if (!productDraft.barcode || !productDraft.name.trim() || saveStatus === "saving") {
      return;
    }
    setSaveStatus("saving");
    setStatusMessage("Saving product...");
    try {
      const result = await postJSON<{ row?: Record<string, unknown> }>(
        API_ROUTES.mobile.importProduct,
        {
          sessionId,
          token: authToken,
          shopId,
          sessionType,
          userEmail,
          userId,
          barcode: productDraft.barcode,
          product: {
            inventory_code: productDraft.inventoryCode || undefined,
            name: productDraft.name.trim(),
            category: productDraft.category.trim() || "Uncategorized",
            sku: productDraft.sku.trim() || undefined,
            price: productDraft.price === "" ? 0 : Number(productDraft.price),
            stock: productDraft.stock === "" ? 0 : Number(productDraft.stock),
            barcode_id: productDraft.barcode,
          },
        },
      );
      setSaveStatus("saved");
      setStatusMessage("Product saved to this shop.");
      if (result?.row) {
        setProductDraft((prev) => ({
          ...prev,
          inventoryCode: String(result.row?.inventory_code || prev.inventoryCode),
          source: "inventory",
        }));
      }
      if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
    } catch (err) {
      setSaveStatus("error");
      setStatusMessage(err instanceof Error ? err.message : "Failed to save product.");
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
        } catch {
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

    let controlsStarted = false;
    reader
      .decodeFromVideoDevice(undefined, video, (result) => {
        if (result) {
          publishBarcode(result.getText());
        }
      })
      .then((controls) => {
        controlsStarted = true;
        zxingControlsRef.current = controls as ScannerControls;
      })
      .catch((err) => {
        console.warn("ZXing decode failed", err);
      });

    // If ZXing didn't start within a short window, surface a helpful message.
    setTimeout(() => {
      if (!controlsStarted) {
        console.warn("ZXing fallback did not start");
        setScanStatus("error");
        setStatusMessage("Scanner unavailable: no supported decoding available on this device.");
      }
    }, 2000);
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

  const pageTitle = isCheckoutSession ? "Mobile Checkout" : "Product Import";
  const pageSubtitle = isCheckoutSession
    ? "Scan products to add them to the desktop cart."
    : "Scan barcodes to create or edit inventory items.";
  const lastScanLabel = isCheckoutSession ? "Last cart scan" : "Last product scan";

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">CeyPOS Mobile</p>
          <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
          <p className="text-xs text-gray-500 mt-1">{pageSubtitle}</p>
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
                <p className="text-gray-500 text-xs">{lastScanLabel}</p>
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
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setScanStatus("starting");
                    setStatusMessage("Restarting camera...");
                  }}
                  className="w-full py-3 rounded-full bg-[#ecff76] text-gray-900 font-semibold"
                >
                  {permissionState === "denied" ? "Enable Camera" : "Retry Camera"}
                </button>
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    publishBarcode(manualValue);
                    setManualValue("");
                  }}
                >
                  <input
                    value={manualValue}
                    onChange={(event) => setManualValue(event.target.value)}
                    inputMode="numeric"
                    className="min-w-0 flex-1 rounded-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#ecff76]"
                    placeholder="Enter barcode manually"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

            {!isCheckoutSession && scanStatus !== "error" && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-gray-400">
                      Import Product
                    </p>
                    <h2 className="text-base font-semibold text-gray-900">
                      {productDraft.barcode || "Scan a barcode"}
                    </h2>
                  </div>
                  {productDraft.source && (
                    <span className="rounded-full bg-[#ecff76]/70 px-3 py-1 text-xs font-semibold text-gray-900">
                      {productDraft.source === "global" ? "Global match" : "Shop match"}
                    </span>
                  )}
                </div>

                <div className="grid gap-3">
                  <input
                    value={productDraft.name}
                    onChange={(event) =>
                      setProductDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#ecff76]"
                    placeholder="Product name"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={productDraft.category}
                      onChange={(event) =>
                        setProductDraft((prev) => ({ ...prev, category: event.target.value }))
                      }
                      className="h-11 min-w-0 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#ecff76]"
                      placeholder="Category"
                    />
                    <input
                      value={productDraft.sku}
                      onChange={(event) =>
                        setProductDraft((prev) => ({ ...prev, sku: event.target.value }))
                      }
                      className="h-11 min-w-0 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#ecff76]"
                      placeholder="SKU"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={productDraft.price}
                      onChange={(event) =>
                        setProductDraft((prev) => ({ ...prev, price: event.target.value }))
                      }
                      inputMode="decimal"
                      className="h-11 min-w-0 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#ecff76]"
                      placeholder="Price"
                    />
                    <input
                      value={productDraft.stock}
                      onChange={(event) =>
                        setProductDraft((prev) => ({ ...prev, stock: event.target.value }))
                      }
                      inputMode="numeric"
                      className="h-11 min-w-0 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#ecff76]"
                      placeholder="Stock"
                    />
                  </div>
                  <button
                    onClick={saveImportedProduct}
                    disabled={!productDraft.barcode || !productDraft.name.trim() || saveStatus === "saving"}
                    className="h-12 rounded-xl bg-gray-900 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {saveStatus === "saving"
                      ? "Saving..."
                      : saveStatus === "saved"
                        ? "Saved"
                        : "Save to Inventory"}
                  </button>
                </div>

                {scanHistory.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="mb-2 text-xs font-medium text-gray-500">
                      Previous scans
                    </p>
                    <div className="space-y-1">
                      {scanHistory.map((scan) => (
                        <button
                          key={`${scan.barcode}-${scan.at}`}
                          onClick={() => publishBarcode(scan.barcode)}
                          className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left text-xs text-gray-600"
                        >
                          <span className="truncate font-mono">{scan.barcode}</span>
                          <span className="ml-2 flex-shrink-0 capitalize">{scan.source}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
