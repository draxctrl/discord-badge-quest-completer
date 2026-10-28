// The stand-in window the fake game shows. It does nothing except stay open;
// Discord detects the process by its file name. Drawn by hand so it matches the
// app (dark, flame orange) and can show the game's icon.
//
// Arguments:  --title "Game name"   --icon "C:\path\icon.bmp"
//
// No C runtime is linked (the exe stays tiny), so only Win32 calls are used here.
#include <windows.h>
#include <shellapi.h>

#define WM_TRAY_MESSAGE   (WM_USER + 1)
#define ID_TRAY_EXIT      1003
#define ID_TRAY_TOGGLE    1004

typedef BOOL(WINAPI* P_Shell_NotifyIconW)(DWORD, PNOTIFYICONDATAW);
typedef HINSTANCE(WINAPI* P_ShellExecuteW)(HWND, LPCWSTR, LPCWSTR, LPCWSTR, LPCWSTR, INT);
typedef HRESULT(WINAPI* P_DwmSetWindowAttribute)(HWND, DWORD, LPCVOID, DWORD);

P_Shell_NotifyIconW f_Shell_NotifyIconW;
P_ShellExecuteW f_ShellExecuteW;

wchar_t g_szGameName[256] = L"Discord Badge and Quest Completer";
wchar_t g_szIconPath[520] = L"";
const wchar_t* GITHUB_URL = L"https://github.com/draxctrl/discord-badge-quest-completer";
NOTIFYICONDATAW nid = { 0 };

// Colors (same as the app).
#define C_INK     RGB(15, 12, 10)
#define C_PANEL   RGB(24, 19, 16)
#define C_RAISED  RGB(33, 26, 22)
#define C_LINE    RGB(51, 41, 31)
#define C_CREAM   RGB(240, 230, 221)
#define C_MUTED   RGB(163, 147, 133)
#define C_FAINT   RGB(110, 96, 85)
#define C_FLAME   RGB(255, 107, 24)
#define C_FLAMEHI RGB(255, 154, 77)
#define C_ONFLAME RGB(26, 12, 4)
#define C_OK      RGB(123, 216, 143)

// Layout in 96-dpi pixels; PX() scales it to the screen.
#define CLIENT_W 460
#define CLIENT_H 326
int g_dpi = 96;
#define PX(v) MulDiv((v), g_dpi, 96)

HFONT hFontTitle = NULL, hFontText = NULL, hFontSmall = NULL, hFontButton = NULL, hFontLetter = NULL;
HBITMAP g_hIcon = NULL;
int g_iconW = 0, g_iconH = 0;
HICON g_hSmallIcon = NULL, g_hBigIcon = NULL;   // title bar / taskbar / tray icons
bool g_hover = false, g_pressed = false, g_tracking = false;

wchar_t* FindStringW(const wchar_t* str, const wchar_t* substr) {
    while (*str) {
        const wchar_t* h = str, * n = substr;
        while (*h && *n && *h == *n) { h++; n++; }
        if (!*n) return (wchar_t*)str;
        str++;
    }
    return NULL;
}

// Reads the value after `flag` (quoted or not) from the command line.
bool ReadArg(const wchar_t* cmdLine, const wchar_t* flag, wchar_t* out, int cap) {
    wchar_t* pos = FindStringW(cmdLine, flag);
    if (!pos) return false;
    while (*pos && *pos != L' ') pos++;   // skip the flag itself
    while (*pos == L' ') pos++;
    int i = 0;
    if (*pos == L'"') {
        pos++;
        while (*pos != L'"' && *pos != L'\0' && i < cap - 1) out[i++] = *pos++;
    } else {
        while (*pos != L' ' && *pos != L'\0' && i < cap - 1) out[i++] = *pos++;
    }
    out[i] = L'\0';
    return i > 0;
}

RECT ButtonRect() {
    RECT r;
    r.left = PX((CLIENT_W - 190) / 2);
    r.top = PX(250);
    r.right = r.left + PX(190);
    r.bottom = r.top + PX(40);
    return r;
}

bool InButton(HWND hWnd, LPARAM lParam) {
    RECT r = ButtonRect();
    POINT p; p.x = (short)LOWORD(lParam); p.y = (short)HIWORD(lParam);
    return PtInRect(&r, p) != 0;
}

// Builds a window icon of `size` pixels from the game's icon (rounded corners), or a
// flame tile with the game's first letter when there is no icon.
HICON BuildIcon(int size) {
    HDC screen = GetDC(NULL);
    HDC mem = CreateCompatibleDC(screen);
    HBITMAP color = CreateCompatibleBitmap(screen, size, size);
    HGDIOBJ oldColor = SelectObject(mem, color);
    if (g_hIcon) {
        HDC src = CreateCompatibleDC(screen);
        HGDIOBJ oldSrc = SelectObject(src, g_hIcon);
        SetStretchBltMode(mem, HALFTONE);
        SetBrushOrgEx(mem, 0, 0, NULL);
        StretchBlt(mem, 0, 0, size, size, src, 0, 0, g_iconW, g_iconH, SRCCOPY);
        SelectObject(src, oldSrc);
        DeleteDC(src);
    } else {
        RECT box; box.left = 0; box.top = 0; box.right = size; box.bottom = size;
        HBRUSH br = CreateSolidBrush(C_FLAME);
        FillRect(mem, &box, br);
        DeleteObject(br);
        HFONT font = CreateFontW(-(size * 6 / 10), 0, 0, 0, FW_BOLD, 0, 0, 0, DEFAULT_CHARSET, 0, 0, CLEARTYPE_QUALITY, 0, L"Segoe UI");
        HGDIOBJ oldFont = SelectObject(mem, font);
        SetBkMode(mem, TRANSPARENT);
        SetTextColor(mem, C_ONFLAME);
        DrawTextW(mem, g_szGameName, 1, &box, DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
        SelectObject(mem, oldFont);
        DeleteObject(font);
    }
    SelectObject(mem, oldColor);

    // Mask: white = see-through, black = visible. Visible area is a rounded square.
    HBITMAP mask = CreateBitmap(size, size, 1, 1, NULL);
    HGDIOBJ oldMask = SelectObject(mem, mask);
    PatBlt(mem, 0, 0, size, size, WHITENESS);
    HGDIOBJ ob = SelectObject(mem, GetStockObject(BLACK_BRUSH));
    HGDIOBJ op = SelectObject(mem, GetStockObject(BLACK_PEN));
    int radius = size / 5;
    RoundRect(mem, 0, 0, size + 1, size + 1, radius * 2, radius * 2);
    SelectObject(mem, ob);
    SelectObject(mem, op);
    SelectObject(mem, oldMask);

    ICONINFO info;
    info.fIcon = TRUE;
    info.xHotspot = 0;
    info.yHotspot = 0;
    info.hbmMask = mask;
    info.hbmColor = color;
    HICON icon = CreateIconIndirect(&info);

    DeleteObject(mask);
    DeleteObject(color);
    DeleteDC(mem);
    ReleaseDC(NULL, screen);
    return icon;
}

void OpenGithub() {
    f_ShellExecuteW(NULL, L"open", GITHUB_URL, NULL, NULL, SW_SHOWNORMAL);
}

void ToggleWindow(HWND hWnd) {
    if (IsWindowVisible(hWnd)) {
        ShowWindow(hWnd, SW_HIDE);
    }
    else {
        ShowWindow(hWnd, SW_SHOW);
        ShowWindow(hWnd, SW_RESTORE);
        SetForegroundWindow(hWnd);
    }
}

HFONT MakeFont(int px, int weight) {
    return CreateFontW(-PX(px), 0, 0, 0, weight, 0, 0, 0, DEFAULT_CHARSET, 0, 0, CLEARTYPE_QUALITY, 0, L"Segoe UI");
}

void Text(HDC dc, const wchar_t* s, int len, int l, int t, int r, int b, HFONT f, COLORREF c, UINT flags) {
    RECT rc; rc.left = PX(l); rc.top = PX(t); rc.right = PX(r); rc.bottom = PX(b);
    SelectObject(dc, f);
    SetTextColor(dc, c);
    DrawTextW(dc, s, len, &rc, flags | DT_NOPREFIX);
}

void Panel(HDC dc, RECT rc, int radius, COLORREF fill, COLORREF border) {
    HBRUSH br = CreateSolidBrush(fill);
    HPEN pen = CreatePen(PS_SOLID, 1, border);
    HGDIOBJ ob = SelectObject(dc, br);
    HGDIOBJ op = SelectObject(dc, pen);
    RoundRect(dc, rc.left, rc.top, rc.right, rc.bottom, PX(radius) * 2, PX(radius) * 2);
    SelectObject(dc, ob);
    SelectObject(dc, op);
    DeleteObject(br);
    DeleteObject(pen);
}

void Paint(HDC dc) {
    SetBkMode(dc, TRANSPARENT);

    // window background and the main card
    RECT all; all.left = 0; all.top = 0; all.right = PX(CLIENT_W); all.bottom = PX(CLIENT_H);
    HBRUSH ink = CreateSolidBrush(C_INK);
    FillRect(dc, &all, ink);
    DeleteObject(ink);
    RECT card; card.left = PX(14); card.top = PX(14); card.right = PX(CLIENT_W - 14); card.bottom = PX(CLIENT_H - 14);
    Panel(dc, card, 16, C_PANEL, C_LINE);

    // game icon (rounded square), or the game's first letter when there is no icon
    int ix = PX(40), iy = PX(40), is = PX(84), ir = PX(18);
    HRGN clip = CreateRoundRectRgn(ix, iy, ix + is + 1, iy + is + 1, ir * 2, ir * 2);
    SelectClipRgn(dc, clip);
    if (g_hIcon) {
        HDC src = CreateCompatibleDC(dc);
        HGDIOBJ old = SelectObject(src, g_hIcon);
        SetStretchBltMode(dc, HALFTONE);
        SetBrushOrgEx(dc, 0, 0, NULL);
        StretchBlt(dc, ix, iy, is, is, src, 0, 0, g_iconW, g_iconH, SRCCOPY);
        SelectObject(src, old);
        DeleteDC(src);
    } else {
        RECT box; box.left = ix; box.top = iy; box.right = ix + is; box.bottom = iy + is;
        HBRUSH raised = CreateSolidBrush(C_RAISED);
        FillRect(dc, &box, raised);
        DeleteObject(raised);
        SelectObject(dc, hFontLetter);
        SetTextColor(dc, C_MUTED);
        DrawTextW(dc, g_szGameName, 1, &box, DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    }
    SelectClipRgn(dc, NULL);
    DeleteObject(clip);
    {
        HBRUSH none = (HBRUSH)GetStockObject(NULL_BRUSH);
        HPEN pen = CreatePen(PS_SOLID, 1, C_LINE);
        HGDIOBJ ob = SelectObject(dc, none);
        HGDIOBJ op = SelectObject(dc, pen);
        RoundRect(dc, ix, iy, ix + is + 1, iy + is + 1, ir * 2, ir * 2);
        SelectObject(dc, ob);
        SelectObject(dc, op);
        DeleteObject(pen);
    }

    // text beside the icon
    Text(dc, L"Discord Badge and Quest Completer", -1, 144, 44, CLIENT_W - 36, 62, hFontSmall, C_MUTED, DT_SINGLELINE | DT_END_ELLIPSIS);
    Text(dc, g_szGameName, -1, 144, 64, CLIENT_W - 36, 102, hFontTitle, C_CREAM, DT_SINGLELINE | DT_END_ELLIPSIS | DT_VCENTER);

    // "Running" with a small green dot
    {
        HBRUSH dot = CreateSolidBrush(C_OK);
        HPEN none = (HPEN)GetStockObject(NULL_PEN);
        HGDIOBJ ob = SelectObject(dc, dot);
        HGDIOBJ op = SelectObject(dc, none);
        Ellipse(dc, PX(146), PX(113), PX(154), PX(121));
        SelectObject(dc, ob);
        SelectObject(dc, op);
        DeleteObject(dot);
    }
    Text(dc, L"Running", -1, 162, 108, CLIENT_W - 36, 128, hFontText, C_MUTED, DT_SINGLELINE | DT_VCENTER);

    // divider
    {
        HPEN pen = CreatePen(PS_SOLID, 1, C_LINE);
        HGDIOBJ op = SelectObject(dc, pen);
        MoveToEx(dc, PX(40), PX(150), NULL);
        LineTo(dc, PX(CLIENT_W - 40), PX(150));
        SelectObject(dc, op);
        DeleteObject(pen);
    }

    Text(dc, L"This program is part of Discord Badge and Quest Completer. It stays open so Discord shows you as playing, and does nothing else.",
        -1, 40, 164, CLIENT_W - 40, 238, hFontText, C_MUTED, DT_WORDBREAK);

    // button
    RECT b = ButtonRect();
    if (g_pressed && g_hover) { b.top += PX(1); b.bottom += PX(1); }
    Panel(dc, b, 10, g_hover ? C_FLAMEHI : C_FLAME, g_hover ? C_FLAMEHI : C_FLAME);
    SelectObject(dc, hFontButton);
    SetTextColor(dc, C_ONFLAME);
    DrawTextW(dc, L"View on GitHub", -1, &b, DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
}

LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
    switch (message) {
    case WM_CREATE: {
        hFontTitle = MakeFont(26, FW_SEMIBOLD);
        hFontText = MakeFont(15, FW_NORMAL);
        hFontSmall = MakeFont(14, FW_NORMAL);
        hFontButton = MakeFont(15, FW_SEMIBOLD);
        hFontLetter = MakeFont(44, FW_BOLD);

        if (g_szIconPath[0]) {
            g_hIcon = (HBITMAP)LoadImageW(NULL, g_szIconPath, IMAGE_BITMAP, 0, 0, LR_LOADFROMFILE | LR_CREATEDIBSECTION);
            if (g_hIcon) {
                BITMAP bm = { 0 };
                GetObjectW(g_hIcon, sizeof(BITMAP), &bm);
                g_iconW = bm.bmWidth;
                g_iconH = bm.bmHeight;
                if (g_iconW <= 0 || g_iconH <= 0) { DeleteObject(g_hIcon); g_hIcon = NULL; }
            }
        }

        nid.cbSize = sizeof(NOTIFYICONDATAW);
        nid.hWnd = hWnd;
        nid.uID = 1;
        nid.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
        nid.uCallbackMessage = WM_TRAY_MESSAGE;
        g_hSmallIcon = BuildIcon(GetSystemMetrics(SM_CXSMICON));
        g_hBigIcon = BuildIcon(128);
        if (g_hSmallIcon) SendMessageW(hWnd, WM_SETICON, ICON_SMALL, (LPARAM)g_hSmallIcon);
        if (g_hBigIcon) SendMessageW(hWnd, WM_SETICON, ICON_BIG, (LPARAM)g_hBigIcon);
        nid.hIcon = g_hSmallIcon ? g_hSmallIcon : LoadIcon(NULL, IDI_APPLICATION);
        lstrcpynW(nid.szTip, g_szGameName, 128);
        f_Shell_NotifyIconW(NIM_ADD, &nid);
    } break;

    case WM_ERASEBKGND:
        return 1;

    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC dc = BeginPaint(hWnd, &ps);
        RECT rc; GetClientRect(hWnd, &rc);
        // Draw off-screen first so nothing flickers.
        HDC mem = CreateCompatibleDC(dc);
        HBITMAP bmp = CreateCompatibleBitmap(dc, rc.right, rc.bottom);
        HGDIOBJ old = SelectObject(mem, bmp);
        Paint(mem);
        BitBlt(dc, 0, 0, rc.right, rc.bottom, mem, 0, 0, SRCCOPY);
        SelectObject(mem, old);
        DeleteObject(bmp);
        DeleteDC(mem);
        EndPaint(hWnd, &ps);
    } break;

    case WM_MOUSEMOVE: {
        bool over = InButton(hWnd, lParam);
        if (!g_tracking) {
            TRACKMOUSEEVENT t = { 0 };
            t.cbSize = sizeof(t);
            t.dwFlags = TME_LEAVE;
            t.hwndTrack = hWnd;
            TrackMouseEvent(&t);
            g_tracking = true;
        }
        if (over != g_hover) {
            g_hover = over;
            RECT r = ButtonRect();
            InvalidateRect(hWnd, &r, FALSE);
        }
    } break;

    case WM_MOUSELEAVE: {
        g_tracking = false;
        if (g_hover) {
            g_hover = false;
            RECT r = ButtonRect();
            InvalidateRect(hWnd, &r, FALSE);
        }
    } break;

    case WM_SETCURSOR:
        if (LOWORD(lParam) == HTCLIENT && g_hover) {
            SetCursor(LoadCursor(NULL, IDC_HAND));
            return TRUE;
        }
        return DefWindowProcW(hWnd, message, wParam, lParam);

    case WM_LBUTTONDOWN:
        if (InButton(hWnd, lParam)) {
            g_pressed = true;
            SetCapture(hWnd);
            RECT r = ButtonRect();
            InvalidateRect(hWnd, &r, FALSE);
        }
        break;

    case WM_LBUTTONUP:
        if (g_pressed) {
            g_pressed = false;
            ReleaseCapture();
            RECT r = ButtonRect();
            InvalidateRect(hWnd, &r, FALSE);
            if (InButton(hWnd, lParam)) OpenGithub();
        }
        break;

    case WM_KEYDOWN:
        if (wParam == VK_RETURN || wParam == VK_SPACE) OpenGithub();
        break;

    case WM_TRAY_MESSAGE:
        if (lParam == WM_RBUTTONUP) {
            POINT cur; GetCursorPos(&cur);
            HMENU hMenu = CreatePopupMenu();
            InsertMenuW(hMenu, 0, MF_BYPOSITION | MF_STRING, ID_TRAY_TOGGLE, IsWindowVisible(hWnd) ? L"Hide" : L"Show");
            InsertMenuW(hMenu, 2, MF_SEPARATOR, 0, NULL);
            InsertMenuW(hMenu, 3, MF_BYPOSITION | MF_STRING, ID_TRAY_EXIT, L"Exit");
            SetForegroundWindow(hWnd);
            TrackPopupMenu(hMenu, TPM_BOTTOMALIGN | TPM_LEFTALIGN, cur.x, cur.y, 0, hWnd, NULL);
            DestroyMenu(hMenu);
        }
        else if (lParam == WM_LBUTTONDBLCLK) ToggleWindow(hWnd);
        break;

    case WM_COMMAND:
        if (LOWORD(wParam) == ID_TRAY_EXIT) DestroyWindow(hWnd);
        if (LOWORD(wParam) == ID_TRAY_TOGGLE) ToggleWindow(hWnd);
        break;

    case WM_DESTROY:
        f_Shell_NotifyIconW(NIM_DELETE, &nid);
        if (hFontTitle) DeleteObject(hFontTitle);
        if (hFontText) DeleteObject(hFontText);
        if (hFontSmall) DeleteObject(hFontSmall);
        if (hFontButton) DeleteObject(hFontButton);
        if (hFontLetter) DeleteObject(hFontLetter);
        if (g_hIcon) DeleteObject(g_hIcon);
        if (g_hSmallIcon) DestroyIcon(g_hSmallIcon);
        if (g_hBigIcon) DestroyIcon(g_hBigIcon);
        PostQuitMessage(0);
        break;

    default: return DefWindowProcW(hWnd, message, wParam, lParam);
    }
    return 0;
}

extern "C" {
    #pragma function(memset)
    void* memset(void* dest, int c, size_t count) {
        char* bytes = (char*)dest;
        while (count--) {
            *bytes++ = (char)c;
        }
        return dest;
    }
}

extern "C" void mainEntryPoint() {
    HINSTANCE hInst = GetModuleHandleW(NULL);

    // Crisp text on scaled screens: take the real DPI instead of being stretched.
    SetProcessDPIAware();
    HDC screen = GetDC(NULL);
    g_dpi = GetDeviceCaps(screen, LOGPIXELSX);
    ReleaseDC(NULL, screen);
    if (g_dpi < 96) g_dpi = 96;

    HMODULE hShell32 = LoadLibraryW(L"shell32.dll");
    f_Shell_NotifyIconW = (P_Shell_NotifyIconW)GetProcAddress(hShell32, "Shell_NotifyIconW");
    f_ShellExecuteW = (P_ShellExecuteW)GetProcAddress(hShell32, "ShellExecuteW");

    LPWSTR lpCmdLine = GetCommandLineW();
    ReadArg(lpCmdLine, L"--title", g_szGameName, 256);
    ReadArg(lpCmdLine, L"--icon", g_szIconPath, 520);

    WNDCLASSW wc = { 0 };
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInst;
    wc.lpszClassName = L"DQCTray";
    wc.hbrBackground = NULL;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    RegisterClassW(&wc);

    DWORD style = WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX;
    RECT win; win.left = 0; win.top = 0; win.right = PX(CLIENT_W); win.bottom = PX(CLIENT_H);
    AdjustWindowRectEx(&win, style, FALSE, 0);

    HWND hWnd = CreateWindowExW(0, wc.lpszClassName, g_szGameName, style, CW_USEDEFAULT, CW_USEDEFAULT,
        win.right - win.left, win.bottom - win.top, NULL, NULL, hInst, NULL);

    // Dark title bar that matches the window (Windows 10 1903+ / 11). Ignored where unsupported.
    HMODULE hDwm = LoadLibraryW(L"dwmapi.dll");
    if (hDwm) {
        P_DwmSetWindowAttribute dwmSet = (P_DwmSetWindowAttribute)GetProcAddress(hDwm, "DwmSetWindowAttribute");
        if (dwmSet) {
            BOOL dark = TRUE;
            COLORREF caption = C_INK, text = C_CREAM, border = C_LINE;
            dwmSet(hWnd, 20, &dark, sizeof(dark));        // dark mode title bar
            dwmSet(hWnd, 35, &caption, sizeof(caption));  // caption color (Windows 11)
            dwmSet(hWnd, 36, &text, sizeof(text));        // caption text color
            dwmSet(hWnd, 34, &border, sizeof(border));    // border color
        }
    }

    ShowWindow(hWnd, SW_SHOWNORMAL);

    MSG msg;
    while (GetMessageW(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }
    ExitProcess(0);
}
