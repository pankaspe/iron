// src/components/ExifViewer.tsx
import { Show } from "solid-js";
import {
  FiCamera,
  FiMapPin,
  FiCalendar,
  FiAperture,
  FiSun,
  FiUser,
  FiInfo,
} from "solid-icons/fi";

export type ExifData = {
  // Camera Info
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;

  // Capture Settings
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  exposureBias?: string;
  flash?: string;

  // Date & Time
  dateTaken?: string;
  dateDigitized?: string;
  dateModified?: string;

  // Image Properties
  width?: number;
  height?: number;
  orientation?: number;
  colorSpace?: string;

  // GPS Location
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;

  // Copyright & Author
  artist?: string;
  copyright?: string;
  software?: string;
  description?: string;

  // Additional
  whiteBalance?: string;
  meteringMode?: string;
  sceneType?: string;
};

type ExifViewerProps = {
  exifData: ExifData | null;
  hasExif: boolean;
};

export function ExifViewer(props: ExifViewerProps) {
  const hasCameraInfo = () =>
    props.exifData?.cameraMake ||
    props.exifData?.cameraModel ||
    props.exifData?.lensModel;

  const hasCaptureSettings = () =>
    props.exifData?.iso ||
    props.exifData?.aperture ||
    props.exifData?.shutterSpeed ||
    props.exifData?.focalLength;

  const hasLocation = () =>
    props.exifData?.gpsLatitude !== undefined &&
    props.exifData?.gpsLongitude !== undefined;

  const hasCopyright = () =>
    props.exifData?.artist || props.exifData?.copyright;

  const formatGPS = (lat?: number, lon?: number) => {
    if (lat === undefined || lon === undefined) return null;

    const latDir = lat >= 0 ? "N" : "S";
    const lonDir = lon >= 0 ? "E" : "W";

    return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lon).toFixed(6)}° ${lonDir}`;
  };

  const getGoogleMapsLink = (lat?: number, lon?: number) => {
    if (lat === undefined || lon === undefined) return null;
    return `https://www.google.com/maps?q=${lat},${lon}`;
  };

  return (
    <Show
      when={props.hasExif && props.exifData}
      fallback={
        <div class="bg-base-200/50 rounded-xl p-4 text-center text-base-content/40">
          <FiInfo class="inline-block mb-2" size={24} />
          <p class="text-sm">No EXIF metadata available</p>
        </div>
      }
    >
      <div class="space-y-3">
        {/* Camera Info Section */}
        <Show when={hasCameraInfo()}>
          <div class="bg-base-200/50 rounded-xl p-4 border border-base-300">
            <div class="flex items-center gap-2 mb-3">
              <FiCamera class="text-primary" size={18} />
              <h4 class="font-bold text-sm uppercase tracking-wider">Camera</h4>
            </div>
            <div class="space-y-2 text-sm">
              <Show
                when={props.exifData!.cameraMake || props.exifData!.cameraModel}
              >
                <div class="flex justify-between">
                  <span class="text-base-content/60">Model:</span>
                  <span class="font-semibold">
                    {props.exifData!.cameraMake} {props.exifData!.cameraModel}
                  </span>
                </div>
              </Show>
              <Show when={props.exifData!.lensModel}>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Lens:</span>
                  <span class="font-semibold">{props.exifData!.lensModel}</span>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Capture Settings Section */}
        <Show when={hasCaptureSettings()}>
          <div class="bg-base-200/50 rounded-xl p-4 border border-base-300">
            <div class="flex items-center gap-2 mb-3">
              <FiAperture class="text-secondary" size={18} />
              <h4 class="font-bold text-sm uppercase tracking-wider">
                Capture Settings
              </h4>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <Show when={props.exifData!.aperture}>
                <div>
                  <div class="text-base-content/60 text-xs mb-1">Aperture</div>
                  <div class="font-mono font-bold text-secondary">
                    {props.exifData!.aperture}
                  </div>
                </div>
              </Show>
              <Show when={props.exifData!.shutterSpeed}>
                <div>
                  <div class="text-base-content/60 text-xs mb-1">Shutter</div>
                  <div class="font-mono font-bold text-secondary">
                    {props.exifData!.shutterSpeed}
                  </div>
                </div>
              </Show>
              <Show when={props.exifData!.iso}>
                <div>
                  <div class="text-base-content/60 text-xs mb-1">ISO</div>
                  <div class="font-mono font-bold text-secondary">
                    ISO {props.exifData!.iso}
                  </div>
                </div>
              </Show>
              <Show when={props.exifData!.focalLength}>
                <div>
                  <div class="text-base-content/60 text-xs mb-1">
                    Focal Length
                  </div>
                  <div class="font-mono font-bold text-secondary">
                    {props.exifData!.focalLength}
                  </div>
                </div>
              </Show>
              <Show when={props.exifData!.exposureBias}>
                <div>
                  <div class="text-base-content/60 text-xs mb-1">Exp. Bias</div>
                  <div class="font-mono font-bold">
                    {props.exifData!.exposureBias}
                  </div>
                </div>
              </Show>
              <Show when={props.exifData!.flash}>
                <div>
                  <div class="text-base-content/60 text-xs mb-1">Flash</div>
                  <div class="font-mono font-bold">{props.exifData!.flash}</div>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Date & Time Section */}
        <Show when={props.exifData!.dateTaken}>
          <div class="bg-base-200/50 rounded-xl p-4 border border-base-300">
            <div class="flex items-center gap-2 mb-3">
              <FiCalendar class="text-accent" size={18} />
              <h4 class="font-bold text-sm uppercase tracking-wider">
                Date & Time
              </h4>
            </div>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-base-content/60">Taken:</span>
                <span class="font-mono">{props.exifData!.dateTaken}</span>
              </div>
            </div>
          </div>
        </Show>

        {/* GPS Location Section */}
        <Show when={hasLocation()}>
          <div class="bg-warning/10 rounded-xl p-4 border border-warning/30">
            <div class="flex items-center gap-2 mb-3">
              <FiMapPin class="text-warning" size={18} />
              <h4 class="font-bold text-sm uppercase tracking-wider">
                Location
              </h4>
              <span class="badge badge-warning badge-xs">
                Privacy Sensitive
              </span>
            </div>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-base-content/60">Coordinates:</span>
                <span class="font-mono text-xs">
                  {formatGPS(
                    props.exifData!.gpsLatitude,
                    props.exifData!.gpsLongitude,
                  )}
                </span>
              </div>
              <Show when={props.exifData!.gpsAltitude}>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Altitude:</span>
                  <span class="font-mono">
                    {props.exifData!.gpsAltitude?.toFixed(1)}m
                  </span>
                </div>
              </Show>
              <Show
                when={getGoogleMapsLink(
                  props.exifData!.gpsLatitude,
                  props.exifData!.gpsLongitude,
                )}
              >
                <a
                  href={
                    getGoogleMapsLink(
                      props.exifData!.gpsLatitude,
                      props.exifData!.gpsLongitude,
                    )!
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-warning btn-xs btn-block mt-2"
                >
                  <FiMapPin size={14} />
                  View on Map
                </a>
              </Show>
            </div>
          </div>
        </Show>

        {/* Copyright & Author Section */}
        <Show when={hasCopyright()}>
          <div class="bg-base-200/50 rounded-xl p-4 border border-base-300">
            <div class="flex items-center gap-2 mb-3">
              <FiUser class="text-info" size={18} />
              <h4 class="font-bold text-sm uppercase tracking-wider">
                Copyright
              </h4>
            </div>
            <div class="space-y-2 text-sm">
              <Show when={props.exifData!.artist}>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Artist:</span>
                  <span class="font-semibold">{props.exifData!.artist}</span>
                </div>
              </Show>
              <Show when={props.exifData!.copyright}>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Copyright:</span>
                  <span class="font-semibold text-xs">
                    {props.exifData!.copyright}
                  </span>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Additional Info Section */}
        <Show
          when={props.exifData!.whiteBalance || props.exifData!.meteringMode}
        >
          <div class="bg-base-200/50 rounded-xl p-4 border border-base-300">
            <div class="flex items-center gap-2 mb-3">
              <FiSun class="text-warning" size={18} />
              <h4 class="font-bold text-sm uppercase tracking-wider">
                Additional
              </h4>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <Show when={props.exifData!.whiteBalance}>
                <div>
                  <div class="text-base-content/60 text-xs mb-1">
                    White Balance
                  </div>
                  <div class="font-semibold">
                    {props.exifData!.whiteBalance}
                  </div>
                </div>
              </Show>
              <Show when={props.exifData!.meteringMode}>
                <div>
                  <div class="text-base-content/60 text-xs mb-1">Metering</div>
                  <div class="font-semibold">
                    {props.exifData!.meteringMode}
                  </div>
                </div>
              </Show>
              <Show when={props.exifData!.colorSpace}>
                <div>
                  <div class="text-base-content/60 text-xs mb-1">
                    Color Space
                  </div>
                  <div class="font-semibold">{props.exifData!.colorSpace}</div>
                </div>
              </Show>
              <Show when={props.exifData!.software}>
                <div>
                  <div class="text-base-content/60 text-xs mb-1">Software</div>
                  <div class="font-semibold text-xs">
                    {props.exifData!.software}
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}
