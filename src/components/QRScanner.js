import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, CameraOff } from "lucide-react";

const QRScanner = forwardRef(({ onScan }, ref) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef(null);
  const qrCodeRegionId = "qr-reader";

  const startScanner = async () => {
    try {
      setError("");
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        (errorMessage) => {
          // Handle scan errors silently
        }
      );
      setIsScanning(true);
    } catch (err) {
      setError("Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.");
      console.error(err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    stopScanner,
  }));

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return React.createElement(Card, { className: "p-6 bg-card/95 backdrop-blur" },
    React.createElement("div", { className: "space-y-4" },
      React.createElement("div", {
        id: qrCodeRegionId,
        className: "w-full min-h-[300px] rounded-lg overflow-hidden bg-muted/30"
      }),
      error && React.createElement("p", { className: "text-sm text-destructive text-center" }, error),
      React.createElement(Button, {
        onClick: isScanning ? stopScanner : startScanner,
        className: "w-full",
        variant: isScanning ? "destructive" : "default"
      },
        isScanning 
          ? [
              React.createElement(CameraOff, { key: "icon", className: "mr-2 h-4 w-4" }),
              "Scanner stoppen"
            ]
          : [
              React.createElement(Camera, { key: "icon", className: "mr-2 h-4 w-4" }),
              "Scanner starten"
            ]
      )
    )
  );
});

QRScanner.displayName = "QRScanner";

export default QRScanner;
