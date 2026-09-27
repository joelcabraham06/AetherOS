/**
 * AetherOS Desktop Window Manager (WM)
 * Orchestrates window lifecycle, z-index layering, drag/drop, resizing, taskbar integration, and app state.
 */

class WindowManager {
    constructor(kernel, shell) {
        this.kernel = kernel;
        this.shell = shell;
        this.windows = {}; // windowId -> WindowInstance
        this.activeWindowId = null;
        this.nextZIndex = 10;
        this.container = document.getElementById('windows-container');
        this.taskbarContainer = document.getElementById('taskbar-apps');
    }

    createWindow({ title, icon, width = 600, height = 400, renderContent }) {
        const id = 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

        const winEl = document.createElement('div');
        winEl.className = 'os-window';
        winEl.id = id;
        winEl.style.width = width + 'px';
        winEl.style.height = height + 'px';
        winEl.style.top = Math.max(40, 60 + Object.keys(this.windows).length * 25) + 'px';
        winEl.style.left = Math.max(40, 80 + Object.keys(this.windows).length * 30) + 'px';

        winEl.innerHTML = `
            <div class="window-header" id="${id}_header">
                <div class="window-title"><span>${icon}</span> ${title}</div>
                <div class="window-controls">
                    <button class="win-btn btn-min" onclick="window.wm.minimizeWindow('${id}')"></button>
                    <button class="win-btn btn-max" onclick="window.wm.toggleMaximizeWindow('${id}')"></button>
                    <button class="win-btn btn-close" onclick="window.wm.closeWindow('${id}')"></button>
                </div>
            </div>
            <div class="window-body" id="${id}_body"></div>
        `;

        this.container.appendChild(winEl);

        const winObj = {
            id,
            title,
            icon,
            element: winEl,
            isMaximized: false,
            prevStyle: {},
            renderContent
        };

        this.windows[id] = winObj;
        this._makeDraggable(winEl, document.getElementById(`${id}_header`));
        this.focusWindow(id);

        if (renderContent) {
            renderContent(document.getElementById(`${id}_body`), winObj);
        }

        this.updateTaskbar();
        return winObj;
    }

    focusWindow(id) {
        if (!this.windows[id]) return;
        this.nextZIndex++;
        this.windows[id].element.style.zIndex = this.nextZIndex;
        this.activeWindowId = id;
        this.updateTaskbar();
    }

    closeWindow(id) {
        if (!this.windows[id]) return;
        this.windows[id].element.remove();
        delete this.windows[id];
        if (this.activeWindowId === id) {
            const keys = Object.keys(this.windows);
            this.activeWindowId = keys.length ? keys[keys.length - 1] : null;
        }
        this.updateTaskbar();
    }

    minimizeWindow(id) {
        if (!this.windows[id]) return;
        this.windows[id].element.style.display = 'none';
        this.updateTaskbar();
    }

    toggleMaximizeWindow(id) {
        const win = this.windows[id];
        if (!win) return;

        if (win.isMaximized) {
            win.element.style.width = win.prevStyle.width;
            win.element.style.height = win.prevStyle.height;
            win.element.style.top = win.prevStyle.top;
            win.element.style.left = win.prevStyle.left;
            win.isMaximized = false;
        } else {
            win.prevStyle = {
                width: win.element.style.width,
                height: win.element.style.height,
                top: win.element.style.top,
                left: win.element.style.left
            };
            win.element.style.width = '100%';
            win.element.style.height = 'calc(100vh - 48px)';
            win.element.style.top = '0';
            win.element.style.left = '0';
            win.isMaximized = true;
        }
    }

    updateTaskbar() {
        if (!this.taskbarContainer) return;
        this.taskbarContainer.innerHTML = '';

        Object.values(this.windows).forEach(win => {
            const item = document.createElement('div');
            item.className = 'taskbar-item' + (win.id === this.activeWindowId ? ' active' : '');
            item.innerHTML = `<span>${win.icon}</span> ${win.title}`;
            item.onclick = () => {
                if (win.element.style.display === 'none') {
                    win.element.style.display = 'flex';
                    this.focusWindow(win.id);
                } else if (win.id === this.activeWindowId) {
                    this.minimizeWindow(win.id);
                } else {
                    this.focusWindow(win.id);
                }
            };
            this.taskbarContainer.appendChild(item);
        });
    }

    _makeDraggable(winEl, headerEl) {
        let posX = 0, posY = 0, mouseX = 0, mouseY = 0;
        headerEl.onmousedown = (e) => {
            e.preventDefault();
            this.focusWindow(winEl.id);
            mouseX = e.clientX;
            mouseY = e.clientY;
            document.onmousemove = (e2) => {
                e2.preventDefault();
                posX = mouseX - e2.clientX;
                posY = mouseY - e2.clientY;
                mouseX = e2.clientX;
                mouseY = e2.clientY;
                winEl.style.top = (winEl.offsetTop - posY) + 'px';
                winEl.style.left = (winEl.offsetLeft - posX) + 'px';
            };
            document.onmouseup = () => {
                document.onmousemove = null;
                document.onmouseup = null;
            };
        };
    }
}
