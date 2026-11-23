using System;
using System.Runtime.InteropServices;
using System.Threading;

namespace DeltaObservation
{
    public static class CalibrationHotkey
    {
        private const int Id = 1;
        private const uint HotkeyMessage = 0x0312, QuitMessage = 0x0012;
        private const uint ControlShiftNoRepeat = 0x0002 | 0x0004 | 0x4000;
        private const uint F8 = 0x77;

        [StructLayout(LayoutKind.Sequential)]
        private struct Message
        {
            public IntPtr hwnd;
            public uint message;
            public UIntPtr wParam;
            public IntPtr lParam;
            public uint time;
            public int x, y;
            public uint reserved;
        }

        [DllImport("user32.dll", SetLastError = true)] private static extern bool RegisterHotKey(IntPtr hwnd, int id, uint modifiers, uint key);
        [DllImport("user32.dll")] private static extern bool UnregisterHotKey(IntPtr hwnd, int id);
        [DllImport("user32.dll")] private static extern int GetMessageW(out Message message, IntPtr hwnd, uint min, uint max);
        [DllImport("user32.dll")] private static extern bool PeekMessageW(out Message message, IntPtr hwnd, uint min, uint max, uint flags);
        [DllImport("user32.dll")] private static extern bool PostThreadMessageW(uint threadId, uint message, UIntPtr wParam, IntPtr lParam);
        [DllImport("kernel32.dll")] private static extern uint GetCurrentThreadId();

        private static void Notify(string text)
        {
            Console.WriteLine(text);
            Console.Out.Flush();
        }

        public static void Run()
        {
            if (!RegisterHotKey(IntPtr.Zero, Id, ControlShiftNoRepeat, F8))
            {
                Notify(Marshal.GetLastWin32Error() == 1409 ? "occupied" : "unavailable");
                return;
            }
            try
            {
                uint owner = GetCurrentThreadId();
                Message message;
                PeekMessageW(out message, IntPtr.Zero, 0, 0, 0);
                // An inherited pipe closes even when the owning Core exits without disposing its Worlds.
                ThreadPool.QueueUserWorkItem(delegate {
                    try { Console.OpenStandardInput().ReadByte(); }
                    finally { PostThreadMessageW(owner, QuitMessage, UIntPtr.Zero, IntPtr.Zero); }
                });
                Notify("registered");
                while (GetMessageW(out message, IntPtr.Zero, 0, 0) > 0)
                {
                    if (message.message == HotkeyMessage && message.wParam.ToUInt32() == Id) Notify("pressed");
                }
            }
            finally { UnregisterHotKey(IntPtr.Zero, Id); }
        }
    }
}
