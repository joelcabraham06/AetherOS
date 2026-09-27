/**
 * Built-in Live Applications for AetherOS Desktop Environment
 */

const AetherApps = {
    // 1. Terminal / Shell App
    openTerminal(wm, shell) {
        wm.createWindow({
            title: "AetherShell Terminal",
            icon: "💻",
            width: 650,
            height: 420,
            renderContent: (bodyEl) => {
                bodyEl.parentElement.classList.add('terminal-window');
                bodyEl.innerHTML = `
                    <div class="terminal-output" id="term_out">Welcome to AetherOS v2.5.0-LTS Terminal.\nType "help" for available commands.\n----------------------------------------\n</div>
                    <div class="terminal-input-row">
                        <span class="terminal-prompt">user@aether-node-1:~$</span>
                        <input type="text" class="terminal-input" id="term_in" autofocus />
                    </div>
                `;

                const outEl = bodyEl.querySelector('#term_out');
                const inEl = bodyEl.querySelector('#term_in');

                inEl.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        const val = inEl.value;
                        inEl.value = '';
                        outEl.innerHTML += `<div><span style="color:#00f0ff">user@aether-node-1:~$</span> ${val}</div>`;

                        const output = shell.execute(val);
                        if (output === '__CLEAR__') {
                            outEl.innerHTML = '';
                        } else {
                            outEl.innerHTML += `<div style="margin-bottom:8px; white-space:pre-wrap;">${output}</div>`;
                        }
                        outEl.scrollTop = outEl.scrollHeight;
                    }
                };
            }
        });
    },

    // 2. File Explorer App
    openExplorer(wm, kernel) {
        wm.createWindow({
            title: "File Explorer",
            icon: "📂",
            width: 620,
            height: 400,
            renderContent: (bodyEl) => {
                const renderDir = (pathStr = '/home/user') => {
                    const res = kernel.syscall('sys_readdir', pathStr);
                    if (!res.success) return;

                    let html = `<div style="margin-bottom:12px; font-weight:bold; color:#00f0ff;">📍 Location: ${res.path}</div>`;
                    html += `<div class="explorer-grid">`;

                    if (res.path !== '/') {
                        html += `<div class="explorer-item" onclick="window.renderExplorerDir('..')">
                            <span class="icon">📁</span><span>.. (Up)</span>
                        </div>`;
                    }

                    res.items.forEach(item => {
                        let icon = item.type === 'directory' ? '📁' : '📄';
                        let action = item.type === 'directory'
                            ? `window.renderExplorerDir('${res.path === '/' ? '' : res.path}/${item.name}')`
                            : `window.viewExplorerFile('${res.path === '/' ? '' : res.path}/${item.name}')`;

                        html += `<div class="explorer-item" onclick="${action}">
                            <span class="icon">${icon}</span>
                            <span style="font-size:11px; text-align:center;">${item.name}</span>
                        </div>`;
                    });

                    html += `</div>`;
                    bodyEl.innerHTML = html;
                };

                window.renderExplorerDir = (path) => renderDir(path);
                window.viewExplorerFile = (path) => {
                    const fRes = kernel.syscall('sys_read', path);
                    if (fRes.success) {
                        AetherApps.openTextEditor(wm, kernel, path, fRes.content);
                    }
                };

                renderDir('/home/user');
            }
        });
    },

    // 3. System & Process Resource Monitor
    openResourceMonitor(wm, kernel) {
        wm.createWindow({
            title: "Resource & Process Monitor",
            icon: "📊",
            width: 650,
            height: 450,
            renderContent: (bodyEl) => {
                const updateView = () => {
                    const info = kernel.syscall('sys_info');
                    const psRes = kernel.syscall('sys_ps');

                    let html = `
                        <div style="display:flex; gap:16px; margin-bottom:16px;">
                            <div class="stat-card" style="flex:1;">
                                <div>🧠 <b>Virtual Memory Usage</b></div>
                                <div style="font-size:18px; color:#00f0ff; margin-top:4px;">${info.memory.usedKB} KB / ${info.memory.totalRamKB} KB</div>
                                <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${info.memory.usagePercent}%;"></div></div>
                            </div>
                            <div class="stat-card" style="flex:1;">
                                <div>⚙️ <b>Active System Threads</b></div>
                                <div style="font-size:18px; color:#00ff88; margin-top:4px;">${info.processesCount} Processes</div>
                                <div style="font-size:11px; color:#8a99ad; margin-top:6px;">Uptime: ${info.uptimeSeconds} seconds</div>
                            </div>
                        </div>

                        <h3>⚡ Active Process Table (PCB)</h3>
                        <table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:12px;">
                            <thead>
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.1); text-align:left; color:#00f0ff;">
                                    <th style="padding:6px;">PID</th>
                                    <th>Process Name</th>
                                    <th>State</th>
                                    <th>Priority</th>
                                    <th>Burst</th>
                                    <th>Memory</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    psRes.processes.forEach(p => {
                        html += `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                                <td style="padding:6px;">${p.pid}</td>
                                <td><b>${p.name}</b></td>
                                <td style="color:${p.state === 'RUNNING' ? '#00ff88' : '#8a99ad'}">${p.state}</td>
                                <td>${p.priority}</td>
                                <td>${p.remainingTime}/${p.burstTime}</td>
                                <td>${p.memorySizeKB}KB</td>
                                <td><button style="padding:2px 6px; background:#ff5f56; border:none; border-radius:3px; color:#fff; cursor:pointer;" onclick="window.killMonProc(${p.pid})">Kill</button></td>
                            </tr>
                        `;
                    });

                    html += `</tbody></table>`;
                    bodyEl.innerHTML = html;
                };

                window.killMonProc = (pid) => {
                    kernel.syscall('sys_kill', pid);
                    updateView();
                };

                updateView();
                const timer = setInterval(() => {
                    if (document.getElementById(bodyEl.parentElement.id)) {
                        updateView();
                    } else {
                        clearInterval(timer);
                    }
                }, 2000);
            }
        });
    },

    // 4. CPU Scheduling & Gantt Simulator App
    openSchedulerSim(wm, kernel) {
        wm.createWindow({
            title: "CPU Scheduling & Gantt Simulator",
            icon: "⚡",
            width: 700,
            height: 480,
            renderContent: (bodyEl) => {
                bodyEl.innerHTML = `
                    <div style="margin-bottom:12px;">
                        <b>Select Scheduling Algorithm:</b>
                        <select id="sim_algo" style="background:#151d2a; color:#fff; padding:6px; border:1px solid #00f0ff; border-radius:4px; margin-left:8px;">
                            <option value="ROUND_ROBIN">Round-Robin (Quantum=2)</option>
                            <option value="SJF">Shortest Job First (SJF)</option>
                            <option value="PRIORITY">Priority Scheduling</option>
                            <option value="FCFS">First-Come First-Served (FCFS)</option>
                        </select>
                        <button id="sim_run_btn" style="padding:6px 14px; background:#00f0ff; color:#000; font-weight:bold; border:none; border-radius:4px; margin-left:12px; cursor:pointer;">Run Simulation</button>
                    </div>
                    <div id="sim_results"></div>
                `;

                const runSim = () => {
                    const algo = bodyEl.querySelector('#sim_algo').value;
                    const testProcs = [
                        { pid: 101, name: 'WebBrowser', burstTime: 6, priority: 1 },
                        { pid: 102, name: 'AudioServer', burstTime: 3, priority: 2 },
                        { pid: 103, name: 'Compiler', burstTime: 8, priority: 3 },
                        { pid: 104, name: 'Database', burstTime: 4, priority: 1 }
                    ];

                    const simRes = kernel.scheduler.runSimulation(testProcs, algo, 2);

                    let ganttHtml = `<div class="gantt-chart-container">`;
                    const colors = ['#00f0ff', '#00ff88', '#ff0055', '#ffbd2e', '#9b51e0'];
                    simRes.ganttChart.forEach((g, idx) => {
                        let color = g.pid === 'IDLE' ? '#333' : colors[g.pid % colors.length];
                        ganttHtml += `<div class="gantt-block" style="background:${color};" title="Tick ${g.tick}: ${g.name}">${g.name.substring(0,3)}</div>`;
                    });
                    ganttHtml += `</div>`;

                    let metricsHtml = `
                        <table style="width:100%; border-collapse:collapse; margin-top:14px; font-size:12px;">
                            <thead>
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:#00f0ff; text-align:left;">
                                    <th style="padding:6px;">PID</th><th>Process</th><th>Burst Time</th><th>Priority</th><th>Waiting Time</th><th>Turnaround Time</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    simRes.processMetrics.forEach(m => {
                        metricsHtml += `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                                <td style="padding:6px;">${m.pid}</td><td><b>${m.name}</b></td><td>${m.burstTime}ms</td><td>${m.priority}</td><td>${m.waitingTime}ms</td><td>${m.turnaroundTime}ms</td>
                            </tr>
                        `;
                    });
                    metricsHtml += `</tbody></table>`;

                    bodyEl.querySelector('#sim_results').innerHTML = `
                        <div class="stat-card">
                            <div>📊 <b>Algorithm: ${simRes.algorithm} Execution Results</b></div>
                            <div style="margin-top:6px;">Average Waiting Time: <b style="color:#00ff88">${simRes.avgWaitingTime} ms</b> | Average Turnaround Time: <b style="color:#00f0ff">${simRes.avgTurnaroundTime} ms</b></div>
                        </div>
                        <h4>📈 CPU Execution Gantt Chart Timeline</h4>
                        ${ganttHtml}
                        <h4 style="margin-top:12px;">📋 Detailed Metrics per Process</h4>
                        ${metricsHtml}
                    `;
                };

                bodyEl.querySelector('#sim_run_btn').onclick = runSim;
                runSim();
            }
        });
    },

    // 5. Text Editor App
    openTextEditor(wm, kernel, filePath = '/home/user/new_file.txt', initialContent = '') {
        wm.createWindow({
            title: `Text Editor - ${filePath}`,
            icon: "📝",
            width: 550,
            height: 380,
            renderContent: (bodyEl) => {
                bodyEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <input type="text" id="ed_path" value="${filePath}" style="flex:1; background:#070a10; color:#fff; border:1px solid rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px; font-family:var(--font-mono); font-size:12px; margin-right:8px;" />
                        <button id="ed_save_btn" style="padding:4px 12px; background:#00ff88; color:#000; font-weight:bold; border:none; border-radius:4px; cursor:pointer;">Save File</button>
                    </div>
                    <textarea id="ed_txt" style="width:100%; height:calc(100% - 40px); background:#05070a; color:#f0f4f8; border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:10px; font-family:var(--font-mono); font-size:13px; outline:none; resize:none;">${initialContent}</textarea>
                `;

                bodyEl.querySelector('#ed_save_btn').onclick = () => {
                    const path = bodyEl.querySelector('#ed_path').value;
                    const content = bodyEl.querySelector('#ed_txt').value;
                    const res = kernel.syscall('sys_write', path, content);
                    if (res.success) {
                        alert(`File '${path}' saved successfully!`);
                    } else {
                        alert(`Error saving file: ${res.error}`);
                    }
                };
            }
        });
    },

    // 6. System Settings App
    openSettings(wm, kernel) {
        wm.createWindow({
            title: "AetherOS System Settings",
            icon: "⚙️",
            width: 480,
            height: 350,
            renderContent: (bodyEl) => {
                bodyEl.innerHTML = `
                    <h3>⚙️ System Personalization & Info</h3>
                    <div class="stat-card" style="margin-top:12px;">
                        <div><b>OS Distribution:</b> AetherOS Real-Time Kernel</div>
                        <div><b>Kernel Version:</b> ${kernel.version} (Build ${kernel.buildId})</div>
                        <div><b>Architecture:</b> x86_64 Virtual Web Kernel</div>
                    </div>
                    <div class="stat-card">
                        <div><b>Desktop Theme:</b> Cyberpunk Glassmorphism</div>
                        <div style="margin-top:8px;">
                            <button style="padding:6px 12px; background:#00f0ff; color:#000; border:none; border-radius:4px; cursor:pointer;" onclick="alert('Theme active!')">Cyberpunk Neon</button>
                        </div>
                    </div>
                `;
            }
        });
    }
};
