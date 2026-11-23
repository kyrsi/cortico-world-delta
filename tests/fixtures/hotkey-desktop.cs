using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Threading;

public static class HotkeyTestDesktop
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateDesktopW(string name, IntPtr device, IntPtr mode, uint flags, uint access, IntPtr attributes);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool SetThreadDesktop(IntPtr desktop);
    [DllImport("user32.dll")] private static extern bool CloseDesktop(IntPtr desktop);
    [DllImport("kernel32.dll")] private static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] private static extern bool PeekMessageW(IntPtr message, IntPtr window, uint min, uint max, uint flags);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool PostThreadMessageW(uint tid, uint msg, UIntPtr wp, IntPtr lp);

    public static void Run(string name, Type service)
    {
        IntPtr desktop = CreateDesktopW(name, IntPtr.Zero, IntPtr.Zero, 0, 0x83, IntPtr.Zero);
        if (desktop == IntPtr.Zero) throw new Win32Exception();
        Exception failure = null;
        Thread thread = new Thread(delegate() {
            try
            {
                if (!SetThreadDesktop(desktop)) throw new Win32Exception();
                // A private thread message exercises the dispatch loop without generating keyboard input.
                IntPtr buffer = Marshal.AllocHGlobal(64);
                try { PeekMessageW(buffer, IntPtr.Zero, 0, 0, 0); }
                finally { Marshal.FreeHGlobal(buffer); }
                if (!PostThreadMessageW(GetCurrentThreadId(), 0x0312, new UIntPtr(1), new IntPtr(0x770006))) throw new Win32Exception();
                service.GetMethod("Run").Invoke(null, null);
            }
            catch (Exception e) { failure = e; }
        });
        try { thread.Start(); thread.Join(); }
        finally { CloseDesktop(desktop); }
        if (failure != null) throw failure;
    }
}
