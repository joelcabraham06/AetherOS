/**
 * AetherOS Live Web Operating System Initializer
 * Boots the Micro-Kernel, mounts the Window Manager, and launches default apps.
 */

window.addEventListener('DOMContentLoaded', () => {
    // 1. Boot Micro-Kernel
    window.kernel = new AetherKernel();
    window.shell = new AetherShell(window.kernel);
    window.wm = new WindowManager(window.kernel, window.shell);

    // 2. Launch Default Apps on Desktop Startup
    AetherApps.openTerminal(window.wm, window.shell);
    AetherApps.openResourceMonitor(window.wm, window.kernel);

    // 3. System Tray Clock & Resource Monitor Loop
    function updateSystemTray() {
        const clockEl = document.getElementById('tray-clock');
        const ramEl = document.getElementById('tray-ram');

        if (clockEl) {
            clockEl.textContent = new Date().toLocaleTimeString();
        }

        if (ramEl && window.kernel) {
            const stats = window.kernel.vmm.getMemoryStats();
            ramEl.textContent = `${stats.usagePercent}%`;
        }
    }

    setInterval(updateSystemTray, 1000);
    updateSystemTray();
});

// Start Menu Toggle Helper
function toggleStartMenu() {
    const menu = document.getElementById('start-menu');
    if (menu) {
        menu.classList.toggle('open');
    }
}

// Close Start Menu on Desktop Click
document.addEventListener('click', (e) => {
    const menu = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-btn');
    if (menu && menu.classList.contains('open') && !menu.contains(e.target) && !startBtn.contains(e.target)) {
        menu.classList.remove('open');
    }
});
