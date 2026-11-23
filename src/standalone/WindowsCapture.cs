using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

namespace DeltaObservation
{
    public sealed class Bounds
    {
        public int x, y, width, height;
    }

    public sealed class Display
    {
        public string id, name;
        public int? systemNumber;
        public bool primary;
        public Bounds bounds;
        public double? scaleFactor;
        public int? rotation;
    }

    internal static class Monitors
    {
        [StructLayout(LayoutKind.Sequential)]
        private struct Rect { public int left, top, right, bottom; }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct MonitorInfo
        {
            public int size;
            public Rect screen, work;
            public int flags;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string device;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct MonitorDevice
        {
            public int size;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string name;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string description;
            public int flags;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string interfaceId;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string key;
        }

        [StructLayout(LayoutKind.Explicit, Size = 220)]
        private struct DisplayMode
        {
            [FieldOffset(68)] public ushort size;
            [FieldOffset(72)] public int fields;
            [FieldOffset(84)] public int orientation;
        }

        private delegate bool MonitorCallback(IntPtr monitor, IntPtr dc, IntPtr rect, IntPtr data);
        [DllImport("user32.dll")] private static extern bool EnumDisplayMonitors(IntPtr dc, IntPtr clip, MonitorCallback callback, IntPtr data);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern bool GetMonitorInfoW(IntPtr monitor, ref MonitorInfo info);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern bool EnumDisplayDevicesW(string device, uint index, ref MonitorDevice info, uint flags);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern bool EnumDisplaySettingsW(string device, int index, ref DisplayMode mode);
        [DllImport("shcore.dll")] private static extern int GetScaleFactorForMonitor(IntPtr monitor, out int scale);
        [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);

        public static void UsePhysicalCoordinates()
        {
            if (SetThreadDpiAwarenessContext(new IntPtr(-4)) == IntPtr.Zero) throw new Win32Exception();
        }

        public static Display[] List()
        {
            List<Display> displays = new List<Display>();
            bool complete = EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, delegate(IntPtr monitor, IntPtr dc, IntPtr rect, IntPtr data)
            {
                MonitorInfo info = new MonitorInfo { size = Marshal.SizeOf(typeof(MonitorInfo)) };
                if (!GetMonitorInfoW(monitor, ref info)) return false;
                MonitorDevice device = new MonitorDevice { size = Marshal.SizeOf(typeof(MonitorDevice)) };
                if (!EnumDisplayDevicesW(info.device, 0, ref device, 1) || String.IsNullOrEmpty(device.interfaceId)) return false;
                int scale;
                Match number = Regex.Match(info.device, @"DISPLAY(\d+)$", RegexOptions.IgnoreCase);
                DisplayMode mode = new DisplayMode { size = (ushort)Marshal.SizeOf(typeof(DisplayMode)) };
                bool hasRotation = EnumDisplaySettingsW(info.device, -1, ref mode) && (mode.fields & 0x80) != 0;
                displays.Add(new Display {
                    id = "win32:" + device.interfaceId.ToLowerInvariant(),
                    name = String.IsNullOrEmpty(device.description) ? info.device : device.description,
                    systemNumber = number.Success ? (int?)Int32.Parse(number.Groups[1].Value) : null,
                    primary = (info.flags & 1) != 0,
                    bounds = new Bounds { x = info.screen.left, y = info.screen.top, width = info.screen.right - info.screen.left, height = info.screen.bottom - info.screen.top },
                    scaleFactor = GetScaleFactorForMonitor(monitor, out scale) == 0 ? (double?)(scale / 100.0) : null,
                    rotation = hasRotation ? (int?)(mode.orientation * 90) : null
                });
                return true;
            }, IntPtr.Zero);
            if (!complete || displays.Count == 0) throw new InvalidOperationException("displayUnavailable");
            return displays.ToArray();
        }
    }

    public sealed class Region
    {
        public double x, y, width, height;
        public Rectangle Pixels(int sourceWidth, int sourceHeight)
        {
            if (!(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 1 && y + height <= 1))
                throw new ArgumentException("Invalid capture region");
            return Rectangle.FromLTRB((int)Math.Floor(x * sourceWidth), (int)Math.Floor(y * sourceHeight),
                (int)Math.Ceiling((x + width) * sourceWidth), (int)Math.Ceiling((y + height) * sourceHeight));
        }
    }

    public sealed class Request
    {
        public string op, displayId;
        public Region roi;
        public Region[] rois;
    }

    public static class CaptureService
    {
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
        private static readonly Encoding Utf8 = new UTF8Encoding(false);
        private static readonly byte[] Empty = new byte[0];
        private static readonly ImageCodecInfo JpegCodec = ImageCodecInfo.GetImageEncoders().First(c => c.MimeType == "image/jpeg");

        private static byte[] RawRegion(Bitmap bitmap, Rectangle rect)
        {
            BitmapData data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppRgb);
            try
            {
                int rowBytes = rect.Width * 4;
                byte[] pixels = new byte[checked(rowBytes * rect.Height)];
                if (data.Stride == rowBytes) Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
                else for (int y = 0; y < rect.Height; y++)
                    Marshal.Copy(IntPtr.Add(data.Scan0, y * data.Stride), pixels, y * rowBytes, rowBytes);
                return pixels;
            }
            finally { bitmap.UnlockBits(data); }
        }

        private static byte[] Preview(Bitmap bitmap, out int width, out int height)
        {
            double scale = Math.Min(1, Math.Min(1280.0 / bitmap.Width, 800.0 / bitmap.Height));
            width = Math.Max(1, (int)Math.Round(bitmap.Width * scale, MidpointRounding.AwayFromZero));
            height = Math.Max(1, (int)Math.Round(bitmap.Height * scale, MidpointRounding.AwayFromZero));
            using (Bitmap preview = new Bitmap(width, height, PixelFormat.Format24bppRgb))
            using (MemoryStream stream = new MemoryStream())
            using (EncoderParameters quality = new EncoderParameters(1))
            {
                using (Graphics graphics = Graphics.FromImage(preview))
                {
                    graphics.InterpolationMode = InterpolationMode.HighQualityBilinear;
                    graphics.DrawImage(bitmap, new Rectangle(0, 0, width, height), 0, 0, bitmap.Width, bitmap.Height, GraphicsUnit.Pixel);
                }
                quality.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 75L);
                preview.Save(stream, JpegCodec, quality);
                return stream.ToArray();
            }
        }

        private static void Reply(BinaryWriter output, object header, byte[] jpeg, byte[] bgra)
        {
            byte[] meta = Utf8.GetBytes(Json.Serialize(header));
            output.Write(meta.Length);
            output.Write(meta);
            output.Write(jpeg);
            output.Write(bgra);
            output.Flush();
        }

        private static void Handle(Request request, BinaryWriter output)
        {
            Display[] displays = Monitors.List();
            if (request.op == "list")
            {
                Reply(output, new { displays, jpegLength = 0, bgraLength = 0 }, Empty, Empty);
                return;
            }
            if (request.op != "frame" && request.op != "region" && request.op != "evidence" && request.op != "regions")
                throw new ArgumentException("Unknown capture operation");
            Display display = displays.FirstOrDefault(d => d.id == request.displayId);
            if (display == null) throw new InvalidOperationException("displayUnavailable");
            Bounds bounds = display.bounds;
            if (request.op == "regions")
            {
                if (request.rois == null || request.rois.Length < 2 || request.rois.Length > 8) throw new ArgumentException("Invalid capture region");
                Rectangle[] rects = new Rectangle[request.rois.Length];
                byte[][] pixels = new byte[rects.Length][];
                int total = 0;
                string capturedAt = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);
                for (int i = 0; i < rects.Length; i++)
                {
                    rects[i] = request.rois[i].Pixels(bounds.width, bounds.height);
                    if (rects[i].Width < 1 || rects[i].Height < 1) throw new ArgumentException("Invalid capture region");
                    using (Bitmap bitmap = new Bitmap(rects[i].Width, rects[i].Height, PixelFormat.Format32bppRgb))
                    {
                        using (Graphics graphics = Graphics.FromImage(bitmap))
                            graphics.CopyFromScreen(bounds.x + rects[i].X, bounds.y + rects[i].Y, 0, 0, rects[i].Size, CopyPixelOperation.SourceCopy);
                        pixels[i] = RawRegion(bitmap, new Rectangle(0, 0, rects[i].Width, rects[i].Height));
                    }
                    total = checked(total + pixels[i].Length);
                }
                if (Json.Serialize(displays) != Json.Serialize(Monitors.List())) throw new InvalidOperationException("displayChanged");
                byte[] bgra = new byte[total];
                object[] described = new object[rects.Length];
                int offset = 0;
                for (int i = 0; i < rects.Length; i++)
                {
                    Buffer.BlockCopy(pixels[i], 0, bgra, offset, pixels[i].Length);
                    described[i] = new { width = rects[i].Width, height = rects[i].Height, length = pixels[i].Length };
                    offset += pixels[i].Length;
                }
                Reply(output, new { displays, capturedAt, width = 0, height = 0, roiWidth = 0, roiHeight = 0,
                    jpegLength = 0, bgraLength = bgra.Length, regions = described }, Empty, bgra);
                return;
            }
            Rectangle full = new Rectangle(0, 0, bounds.width, bounds.height);
            Rectangle region = request.op == "frame" ? Rectangle.Empty : request.roi.Pixels(bounds.width, bounds.height);
            Rectangle source = request.op == "region" ? region : full;
            using (Bitmap bitmap = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppRgb))
            {
                string capturedAt = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);
                using (Graphics graphics = Graphics.FromImage(bitmap))
                    graphics.CopyFromScreen(bounds.x + source.X, bounds.y + source.Y, 0, 0, source.Size, CopyPixelOperation.SourceCopy);
                if (Json.Serialize(displays) != Json.Serialize(Monitors.List())) throw new InvalidOperationException("displayChanged");
                int width = 0, height = 0;
                byte[] jpeg = request.op == "region" ? Empty : Preview(bitmap, out width, out height);
                byte[] bgra = request.op == "frame" ? Empty : RawRegion(bitmap, new Rectangle(region.X - source.X, region.Y - source.Y, region.Width, region.Height));
                Reply(output, new { displays, capturedAt, width, height, roiWidth = region.Width, roiHeight = region.Height,
                    jpegLength = jpeg.Length, bgraLength = bgra.Length }, jpeg, bgra);
            }
        }

        public static void Run()
        {
            Monitors.UsePhysicalCoordinates();
            using (StreamReader input = new StreamReader(Console.OpenStandardInput(), Utf8))
            using (BinaryWriter output = new BinaryWriter(Console.OpenStandardOutput()))
            {
                string line;
                while ((line = input.ReadLine()) != null)
                {
                    try { Handle(Json.Deserialize<Request>(line), output); }
                    catch (IOException) { return; }
                    catch (Exception err) { Reply(output, new { error = err.Message }, Empty, Empty); }
                }
            }
        }
    }
}
