using System;
using System.Runtime.InteropServices;

// Ctrl+Shift+F8 with MOD_NOREPEAT, the chord CalibrationHotkey registers.
public static class HotkeyChordProbe
{
    private const uint ControlShiftNoRepeat = 0x0002 | 0x0004 | 0x4000;
    private const uint F8 = 0x77;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RegisterHotKey(IntPtr hwnd, int id, uint modifiers, uint key);

    [DllImport("user32.dll")]
    private static extern bool UnregisterHotKey(IntPtr hwnd, int id);

    public static void Run()
    {
        if (!RegisterHotKey(IntPtr.Zero, 1, ControlShiftNoRepeat, F8))
        {
            Console.WriteLine(Marshal.GetLastWin32Error() == 1409 ? "occupied" : "unavailable");
            return;
        }
        UnregisterHotKey(IntPtr.Zero, 1);
        Console.WriteLine("free");
    }
}
